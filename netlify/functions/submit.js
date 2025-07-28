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
    } = JSON.parse(event.body).guests;

// 1) DB'ye bağlan
const pool    = await sql.connect(config);

// 2) Stored Proc için request nesnesini oluştur
const request = pool.request();

// 3) TVP’yi önce oluştur ve doldur
const tvp = new sql.Table("dbo.RequestGuestType");
tvp.columns.add("RowNum",      sql.Int);
tvp.columns.add("FullName",    sql.NVarChar(100), { nullable: true });
tvp.columns.add("Email",       sql.NVarChar(100), { nullable: true });
tvp.columns.add("PhoneNumber", sql.NVarChar(20),  { nullable: true });
tvp.columns.add("SocialMedia", sql.NVarChar(200), { nullable: true });

guests.forEach((g, idx) => {
  tvp.rows.add(
    idx + 1,  // RowNum
    g.fullName,
    g.email,
    g.phoneNumber,
    g.socialMedia ?? null
  );
});

console.log("TVP satır sayısı:", tvp.rows.length);

// 4) TVP’yi ve diğer tüm parametreleri ekle
request
  .input("Guests",        tvp)
  .input("FullName",      sql.NVarChar(100), fullName)
  .input("PhoneNumber",   sql.NVarChar(20),  phoneNumber)
  .input("Email",         sql.NVarChar(100), email)
  .input("SocialMedia",   sql.NVarChar(200), socialMedia)
  .input("PersonCount",   sql.Int,           personCount)
  .input("RequestedDate", sql.Date,          requestedDate)
  .output("OutRequestID", sql.Int);

// 5) Prosedürü çalıştır
const result = await request.execute("sp_CreateReservationRequestWithGuests");
const newId  = result.output.OutRequestID;    // 7) İstemciye JSON olarak dön
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: newId, guests })
    };

  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: err.message
    };
  }
};
