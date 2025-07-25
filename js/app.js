// js/app.js

document.addEventListener('DOMContentLoaded', () => {
  // ===== Telefon alanını intl-tel-input ile zenginleştir =====
const phoneInput = document.getElementById('phoneNumber');
const iti = window.intlTelInput(phoneInput, {
  initialCountry: "auto",
  geoIpLookup: callback => {
    fetch('https://ipapi.co/json')
      .then(r => r.json())
      .then(data => callback(data.country_code))
      .catch(() => callback('tr'));
  },
  utilsScript:
    "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.19/js/utils.js"
});
// ==========================================================
  const form             = document.getElementById('reservationForm');
  const msgEl            = document.getElementById('message');
  const submitBtn        = form.querySelector('button[type="submit"]');
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
       ['Telefon','tel','phoneNumber']
    ]
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
        // 2) Sosyal Medya Platformu dropdown
      const platformWrapper = document.createElement('div');
      platformWrapper.className = 'mb-2';
      platformWrapper.innerHTML = `
        <label class="form-label small">Sosyal Medya Platformu</label>
        <select class="form-select form-select-sm rounded-pill guest-socialPlatform"
                name="guests[${i-1}].socialPlatform">
          <option value="instagram">Instagram</option>
          <option value="linkedin">LinkedIn</option>
          <option value="facebook">Facebook</option>
        </select>
      `;
      fs.appendChild(platformWrapper);

      // 3) Sosyal Medya URL girişi
      const mediaWrapper = document.createElement('div');
      mediaWrapper.className = 'mb-2';
      mediaWrapper.innerHTML = `
        <label class="form-label small">Profil URL</label>
        <input type="url"
               class="form-control form-control-sm rounded-pill guest-socialMedia"
               name="guests[${i-1}].socialMedia"
               placeholder="${prefixes.instagram}" />
      `;
      fs.appendChild(mediaWrapper);

      // 4) Prefix otomatik güncelleme
      const sel = platformWrapper.querySelector('.guest-socialPlatform');
      const inp = mediaWrapper.querySelector('.guest-socialMedia');
      // Başlangıç placeholder
      inp.placeholder = prefixes[ sel.value ];
      // Değişim ve odaklanma dinleyicileri
      sel.addEventListener('change', () => {
        const url       = inp.value || '';
        const lastSlash = url.lastIndexOf('/');
        const user      = lastSlash >= 0 ? url.slice(lastSlash + 1) : '';
        inp.value       = prefixes[ sel.value ] + user;
        // imleci sona taşı
        setTimeout(() => {
          inp.selectionStart = inp.selectionEnd = inp.value.length;
        });
      });
      inp.addEventListener('focus', () => {
        sel.dispatchEvent(new Event('change'));
      });

      col.appendChild(fs);
      guestContainer.appendChild(col);
    }
  }

  personCountInput.addEventListener('change', renderGuests);

  form.addEventListener('submit', async e => {
    e.preventDefault();
     
    // ➍ Butonu devre dışı bırak ve telefon doğrulaması yap
    submitBtn.disabled = true;
    if (!iti.isValidNumber()) {
      msgEl.innerHTML = '<div class="alert alert-warning">Geçerli bir telefon numarası girin.</div>';
      submitBtn.disabled = false;
      return;
    }

    // ➎ Tam formatlı numarayı al
    const fullPhone = iti.getNumber();  // örn "+905321234567"
    // Butonu kilitle: tekrar tıklamayı engelle
    submitBtn.disabled = true;
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
      phoneNumber: fullPhone,
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
finally {
    // İşlem tamamlandığında butonu tekrar aktif et
    submitBtn.disabled = false;
  }  });
});
