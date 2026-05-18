# Momo Rezervasyon Talep Formu

Bu proje, **Momo için rezervasyon talebi toplamak** amacıyla hazırlanmış bir web uygulamasıdır.  
Kullanıcılar form üzerinden rezervasyon bilgilerini girer, veriler Netlify Function aracılığıyla alınır ve MSSQL üzerinde ilgili stored procedure’e aktarılır.

## Projenin Amacı

- Rezervasyon taleplerini standart bir form üzerinden toplamak
- Ana kişi ve ek misafir bilgilerini birlikte işlemek
- Telefon numaralarını uluslararası formatta doğrulamak
- Verileri güvenli şekilde sunucu tarafına iletip veritabanına kaydetmek

## Nasıl Çalışır?

1. Kullanıcı `index.html` üzerindeki rezervasyon formunu doldurur.
2. `js/app.js`:
   - Telefon girişlerini `intl-tel-input` ile doğrular
   - Kişi sayısına göre dinamik misafir alanları üretir
   - Form verisini DTO formatına dönüştürür
   - `/.netlify/functions/submit` endpoint’ine `POST` eder
3. `netlify/functions/submit.js`:
   - Gelen veriyi parse eder
   - MSSQL bağlantısı açar
   - Misafir verilerini TVP (table-valued parameter) olarak hazırlar
   - `sp_CreateReservationRequestWithGuests` stored procedure’ünü çalıştırır
4. Başarılı durumda istemciye `requestId` döndürülür.

## Sistem Gereksinimleri

- **Node.js** (LTS önerilir, 18+)
- **npm**
- **Netlify CLI** (lokal function test etmek için önerilir)
- Erişilebilir bir **Microsoft SQL Server** instance’ı

## Ortam Değişkenleri

`submit` fonksiyonunun çalışması için aşağıdaki environment variable’lar gereklidir:

- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASS`
- `DB_NAME`

## Kurulum

```bash
npm install
```

## Lokal Çalıştırma

Statik dosyayı basit bir sunucu ile çalıştırabilirsiniz (örnek):

```bash
npx serve .
```

Netlify Functions ile birlikte lokal geliştirme için:

```bash
npx netlify dev
```

## Proje Yapısı

```text
.
├── index.html                 # Rezervasyon formu (UI)
├── css/styles.css             # Stil dosyaları
├── js/app.js                  # Form davranışı ve API çağrısı
├── netlify/functions/submit.js# Sunucu tarafı rezervasyon işleme
└── netlify.toml               # Netlify yapılandırması ve yönlendirmeler
```

## Notlar

- Bu repoda varsayılan `npm test` script’i tanımlı değildir.
- Veritabanı tarafında ilgili stored procedure ve TVP tipinin hazır olması gerekir:
  - `sp_CreateReservationRequestWithGuests`
  - `dbo.RequestGuestType`
