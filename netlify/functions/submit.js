console.log("ENV:", {
  DB_HOST: process.env.DB_HOST,
  DB_USER: process.env.DB_USER,
  DB_NAME: process.env.DB_NAME
});


// netlify/functions/api/ReservationRequests.js
const sql = require("mssql");

// 1) MSSQL bağlantı ayarları (Netlify ortam değişkenlerinden)
const config = {
  user:     process.env.DB_USER,
  password: process.env.DB_PASS,
  server:   process.env.DB_HOST,            // 127.0.0.1
  port:     parseInt(process.env.DB_PORT, 10),  // 1433
  database: process.env.DB_NAME,
  options: {
    encrypt: true,
    trustServerCertificate: true
  }
};

exports.handler = async function(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    // 2) İstemciden gelen JSON'u ayıkla
    const {
      fullName,
      phoneNumber,
      email,
      socialMedia,
      requestedDate,  // "YYYY-MM-DD" formatında
      personCount,    // integer
      guests          // [{ fullName, email, phoneNumber, socialMedia }, ...]
    } = JSON.parse(event.body);

    // 3) DB'ye bağlan
    const pool = await sql.connect(config);

    // 4) Table-Valued Parameter (TVP) için geçici tablo oluştur
    const tvp = new sql.Table("dbo.RequestGuestType");
    tvp.columns.add("FullName",    sql.NVarChar(100), { nullable: true });
    tvp.columns.add("Email",       sql.NVarChar(100), { nullable: true });
    tvp.columns.add("PhoneNumber", sql.NVarChar(20),  { nullable: true });
    tvp.columns.add("SocialMedia", sql.NVarChar(200), { nullable: true });
    //  misafir verilerini ekle
    guests.forEach(g => {
      tvp.rows.add(
        g.fullName,
        g.email,
        g.phoneNumber,
        g.socialMedia ?? null
      );
    });

    // 5) Stored Procedure’u hazırla
    const request = pool.request();
    request.input ( "FullName",       sql.NVarChar(100), fullName );
    request.input ( "PhoneNumber",    sql.NVarChar(20),  phoneNumber );
    request.input ( "Email",          sql.NVarChar(100), email );
    request.input ( "SocialMedia",    sql.NVarChar(200), socialMedia );
    request.input ( "PersonCount",    sql.Int,           personCount );
    request.input ( "RequestedDate",  sql.Date,          requestedDate );
    request.input ( "Guests",         tvp );           // TVP parametresi
    request.output( "OutRequestID",   sql.Int );

    // 6) Çalıştır
    const result = await request.execute("sp_CreateReservationRequestWithGuests");
    const newId = result.output.OutRequestID;

    // 7) İstemciye JSON olarak dön
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: newId })
    };

  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: err.message
    };
  }
};
