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
      serviceType,
      reservationTime,
      extraNote,
      guests          // [{ fullName, email, phoneNumber, socialMedia }, ...]
    } = JSON.parse(event.body);

// 1) DB'ye bağlan
const pool    = await sql.connect(config);

// 3) TVP’yi önce oluştur ve doldur
const tvp = new sql.Table("dbo.RequestGuestType");
tvp.columns.add("RowNum",      sql.Int);
tvp.columns.add("FullName",    sql.NVarChar(100), { nullable: true });
tvp.columns.add("Email",       sql.NVarChar(100), { nullable: true });
tvp.columns.add("PhoneNumber", sql.NVarChar(20),  { nullable: true });
tvp.columns.add("SocialMedia", sql.NVarChar(200), { nullable: true });
// ★ önce sahip satırını ekle (RowNum = 1)
tvp.rows.add(
  1,
  fullName,
  email,
  phoneNumber,
  socialMedia
);

guests.forEach((g, idx) => {
  tvp.rows.add(
    idx + 2,  // RowNum
    g.fullName,
    g.email,
    g.phoneNumber,
    g.socialMedia ?? null
  );
});

// 2) Stored Proc için request nesnesini oluştur
const request = pool.request();


// 4) TVP’yi ve diğer tüm parametreleri ekle
request
  .input("Guests",        tvp)
  .input("FullName",      sql.NVarChar(100), fullName)
  .input("PhoneNumber",   sql.NVarChar(20),  phoneNumber)
  .input("Email",         sql.NVarChar(100), email)
  .input("SocialMedia",   sql.NVarChar(200), socialMedia)
  .input("PersonCount",   sql.Int,           personCount)
  .input("RequestedDate", sql.Date,          requestedDate)
  .input("ServiceType",    sql.NVarChar(50),  serviceType)
  .input("RequestedTime", sql.Time, reservationTime ? `${reservationTime}:00` : null)
  .input("ExtraNote",      sql.NVarChar(sql.MAX), extraNote || null)
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
