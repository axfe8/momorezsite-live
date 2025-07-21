// js/app.js

document.addEventListener('DOMContentLoaded', () => {
  const form             = document.getElementById('reservationForm');
  const msgEl            = document.getElementById('message');
  const personCountInput = document.getElementById('personCount');
  const guestContainer   = document.getElementById('guestContainer');
  // --- SOSYAL MEDYA PREFIX GÜNCELLEME ---
const platformSelect = document.getElementById('socialPlatform');
const socialInput    = document.getElementById('socialMedia');

const prefixes = {
  instagram: 'https://instagram.com/',
  linkedin : 'https://linkedin.com/in/',
  facebook : 'https://facebook.com/'
};

function updateSocialPrefix() {
  // Mevcut URL’den kullanıcı adını ayıkla
  const url       = socialInput.value || '';
  const lastSlash = url.lastIndexOf('/');
  const username  = lastSlash >= 0 ? url.slice(lastSlash + 1) : '';

  // Yeni prefix + kullanıcı adı
  socialInput.value = prefixes[ platformSelect.value ] + username;

  // İmleci metnin sonuna taşı
  setTimeout(() => {
    socialInput.selectionStart = socialInput.selectionEnd = socialInput.value.length;
  });
}

// Platform değişince ve input’a odaklanınca prefix’i güncelle
platformSelect.addEventListener('change', updateSocialPrefix);
socialInput.addEventListener('focus', updateSocialPrefix);

// Sayfa yüklendiğinde ilk değer ataması
updateSocialPrefix();

  // Misafir alanlarını yeniden oluştur
  function renderGuests() {
    guestContainer.innerHTML = '';
    const count = parseInt(personCountInput.value, 10);
    if (isNaN(count) || count < 2) return;

    for (let i = 2; i <= count; i++) {
      const col = document.createElement('div');
      col.className = 'col-md-6';

      const fs = document.createElement('fieldset');
      fs.className = 'border rounded p-3 h-100';

      const legend = document.createElement('legend');
      legend.className = 'float-none w-auto px-2 bg-light text-primary rounded';
      legend.textContent = `${i}. Misafir`;
      fs.appendChild(legend);

      [['Ad Soyad','text','fullName'],
       ['E-posta','email','email'],
       ['Telefon','tel','phoneNumber'],
       ['Sosyal Medya','url','socialMedia']]
        .forEach(([labelText,type,name]) => {
          const wrapper = document.createElement('div');
          wrapper.className = 'mb-2';

          const lbl = document.createElement('label');
          lbl.className = 'form-label small';
          lbl.textContent = labelText;

          const inp = document.createElement('input');
          inp.type = type;
          inp.className = 'form-control form-control-sm rounded-pill';
          inp.name = `guests[${i-1}].${name}`;
          if (name !== 'socialMedia') inp.required = true;

          wrapper.append(lbl, inp);
          fs.appendChild(wrapper);
        });

      col.appendChild(fs);
      guestContainer.appendChild(col);
    }
  }

  personCountInput.addEventListener('change', renderGuests);

  form.addEventListener('submit', async e => {
    e.preventDefault();

    const fd          = new FormData(form);
    const fullName    = fd.get('fullName')?.trim();
    const phoneNumber = fd.get('phoneNumber')?.trim();
    const email       = fd.get('email')?.trim();
    const socialMedia = fd.get('socialMedia')?.trim() || null;
    const requestedDate = fd.get('requestedDate');       // Talep Tarihi
    const personCount = parseInt(fd.get('personCount'), 10);
    // 2) Konsolda tüm değerleri gör
console.group('📝 FormData Values');
for (let pair of fd.entries()) {
  console.log(pair[0], '→', pair[1]);
}
console.groupEnd();

    if (!fullName || !phoneNumber || !email || !requestedDate || !personCount) {
      msgEl.innerHTML = '<div class="alert alert-warning">Lütfen tüm zorunlu alanları doldurun.</div>';
      return;
    }

    // Misafir dizisini oluştur
    const guests = [{ fullName, email, phoneNumber, socialMedia }];
    for (let i = 1; i < personCount; i++) {
      const fn = fd.get(`guests[${i}].fullName`)?.trim();
      const em = fd.get(`guests[${i}].email`)?.trim();
      const ph = fd.get(`guests[${i}].phoneNumber`)?.trim();
      const sm = fd.get(`guests[${i}].socialMedia`)?.trim() || null;
      if (!fn || !em || !ph) {
        msgEl.innerHTML = '<div class="alert alert-warning">Lütfen tüm misafir bilgilerini doldurun.</div>';
        return;
      }
      guests.push({ fullName: fn, email: em, phoneNumber: ph, socialMedia: sm });
    }

    // Doğrudan DTO olarak gövdeye yazıyoruz
    const dto = {
      fullName,
      phoneNumber,
      email,
      socialMedia,
      requestedDate,
      personCount,
      guests
    };

    console.log('Gönderilen DTO:', dto);

    try {
      const apiUrl = '/.netlify/functions/submit';
      const resp = await fetch(apiUrl, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(dto)
      });
      if (!resp.ok) {
        const err = await resp.text();
        throw new Error(err || resp.statusText);
      }
      const result = await resp.json();
      msgEl.innerHTML = `<div class="alert alert-success">Rezervasyon talebiniz alındı! ID: ${result.requestId}</div>`;
      form.reset();
      guestContainer.innerHTML = '';
    } catch (err) {
      msgEl.innerHTML = `<div class="alert alert-danger">Hata: ${err.message}</div>`;
    }
  });
});
