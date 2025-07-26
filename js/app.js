// js/app.js

document.addEventListener('DOMContentLoaded', () => {
  // ————————————————
  // Ortak seçenekler fonksiyonu
  // ————————————————
  function commonOptions() {
    return {
      initialCountry: 'auto',
      preferredCountries: ['tr', 'us'],
      separateDialCode: true,
      autoHideDialCode: false,
      geoIpLookup: cb =>
        fetch('https://ipapi.co/json')
          .then(r => r.json())
          .then(d => cb(d.country_code))
          .catch(() => cb('tr')),
      // Aynı versiyondan utils.js
      utilsScript:
        'https://cdn.jsdelivr.net/npm/intl-tel-input@17.0.19/build/js/utils.js',
      // Overflow sorunlarını önlemek için body’ye ekle
      dropdownContainer: document.body
    };
  }

  // ————————————————
  // Ana Telefon
  // ————————————————
  const phoneInput = document.getElementById('phoneNumber');
  const mainIti = window.intlTelInput(phoneInput, commonOptions());
  console.log('main iti object:', mainIti);

  // ————————————————
  // Form elemanları
  // ————————————————
  const form = document.getElementById('reservationForm');
  const msgEl = document.getElementById('message');
  const submitBtn = form.querySelector('button[type="submit"]');
  const personCountInput = document.getElementById('personCount');
  const guestContainer = document.getElementById('guestContainer');

  // ————————————————
  // Sosyal medya prefix güncelleme (değişmedi)
  // ————————————————
  const platformSelect = document.getElementById('socialPlatform');
  const socialInput = document.getElementById('socialMedia');
  const prefixes = {
    instagram: 'https://instagram.com/',
    linkedin: 'https://linkedin.com/in/',
    facebook: 'https://facebook.com/'
  };
  function updateSocialPrefix() {
    const url = socialInput.value || '';
    const lastSlash = url.lastIndexOf('/');
    const user = lastSlash >= 0 ? url.slice(lastSlash + 1) : '';
    socialInput.value = prefixes[platformSelect.value] + user;
    setTimeout(() => {
      socialInput.selectionStart = socialInput.selectionEnd = socialInput.value.length;
    });
  }
  platformSelect.addEventListener('change', updateSocialPrefix);
  socialInput.addEventListener('focus', updateSocialPrefix);
  updateSocialPrefix();

  // ————————————————
  // Misafir telefonlarını saklayacağımız dizi
  // ————————————————
  const guestItis = [];

  // ————————————————
  // Misafir alanlarını render eden fonksiyon
  // ————————————————
  function renderGuests() {
    guestItis.length = 0;       // önceki init’leri temizle
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

      // Ad Soyad, E-posta, Telefon
      [['Ad Soyad', 'text', 'fullName'],
       ['E-posta','email','email'],
       ['Telefon','tel','phoneNumber']
      ].forEach(([labelText, type, name]) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'mb-2';

        const lbl = document.createElement('label');
        lbl.className = 'form-label small';
        lbl.textContent = labelText;

        const inp = document.createElement('input');
        inp.type = type;
        inp.className = 'form-control form-control-sm rounded-pill';
        inp.name = `guests[${i-1}].${name}`;
        if (name === 'phoneNumber') {
          // misafir telefonu
          inp.id = `guestPhone_${i}`;
          inp.classList.add('guest-phone');
          inp.required = true;
        } else {
          inp.placeholder = name === 'email' ? 'ornek@domain.com' : '';
          inp.required = true;
        }

        wrapper.append(lbl, inp);
        fs.appendChild(wrapper);

        // misafir telefonuysa hemen init et
        if (name === 'phoneNumber') {
          const itiGuest = window.intlTelInput(inp, commonOptions());
          guestItis.push(itiGuest);
        }
      });

      // Sosyal Medya Platformu dropdown
      const platformWrapper = document.createElement('div');
      platformWrapper.className = 'mb-2';
      platformWrapper.innerHTML = `
        <label class="form-label small">Sosyal Medya Platformu</label>
        <select class="form-select form-select-sm rounded-pill guest-socialPlatform"
                name="guests[${i-1}].socialPlatform">
          <option value="instagram">Instagram</option>
          <option value="linkedin">LinkedIn</option>
          <option value="facebook">Facebook</option>
        </select>`;
      fs.appendChild(platformWrapper);

      // Sosyal Medya URL
      const mediaWrapper = document.createElement('div');
      mediaWrapper.className = 'mb-2';
      mediaWrapper.innerHTML = `
        <label class="form-label small">Profil URL</label>
        <input type="url"
               class="form-control form-control-sm rounded-pill guest-socialMedia"
               name="guests[${i-1}].socialMedia"
               placeholder="${prefixes.instagram}" />`;
      fs.appendChild(mediaWrapper);

      // prefix dinleyicileri
      const selGuest = platformWrapper.querySelector('.guest-socialPlatform');
      const inpGuest = mediaWrapper.querySelector('.guest-socialMedia');
      inpGuest.placeholder = prefixes[selGuest.value];
      selGuest.addEventListener('change', () => {
        const url = inpGuest.value || '';
        const lastSlash = url.lastIndexOf('/');
        const user = lastSlash >= 0 ? url.slice(lastSlash + 1) : '';
        inpGuest.value = prefixes[selGuest.value] + user;
        setTimeout(() => {
          inpGuest.selectionStart = inpGuest.selectionEnd = inpGuest.value.length;
        });
      });
      inpGuest.addEventListener('focus', () => selGuest.dispatchEvent(new Event('change')));

      col.appendChild(fs);
      guestContainer.appendChild(col);
    }
  }

  personCountInput.addEventListener('change', renderGuests);

  // ————————————————
  // Form submit – ana ve misafir telefonlarını validate & gönder
  // ————————————————
  form.addEventListener('submit', async e => {
    e.preventDefault();
    submitBtn.disabled = true;

    // Ana telefon doğrulama
    if (!mainIti.isValidNumber()) {
      msgEl.innerHTML = '<div class="alert alert-warning">Geçerli bir telefon numarası girin.</div>';
      submitBtn.disabled = false;
      return;
    }

    // Misafir telefon doğrulama
    for (let idx = 0; idx < guestItis.length; idx++) {
      if (!guestItis[idx].isValidNumber()) {
        msgEl.innerHTML = `<div class="alert alert-warning">${idx + 2}. misafir için geçerli bir telefon numarası girin.</div>`;
        submitBtn.disabled = false;
        return;
      }
    }

    // Diğer form verileri
    const fd = new FormData(form);
    const fullName = fd.get('fullName')?.trim();
    const email    = fd.get('email')?.trim();
    const requestedDate = fd.get('requestedDate');
    const personCount   = parseInt(fd.get('personCount'), 10);

    if (!fullName || !email || !requestedDate || !personCount) {
      msgEl.innerHTML = '<div class="alert alert-warning">Lütfen tüm zorunlu alanları doldurun.</div>';
      submitBtn.disabled = false;
      return;
    }

    // DTO oluştur – ana telefon numarası
    const dto = {
      fullName,
      phoneNumber: mainIti.getNumber(),
      email,
      socialMedia: fd.get('socialMedia')?.trim() || null,
      requestedDate,
      personCount,
      guests: []
    };

    // Misafir verilerini ekle
    for (let i = 0; i < guestItis.length; i++) {
      const guestData = {
        fullName: fd.get(`guests[${i}].fullName`)?.trim(),
        email:    fd.get(`guests[${i}].email`)?.trim(),
        phoneNumber: guestItis[i].getNumber(),
        socialMedia: fd.get(`guests[${i}].socialMedia`)?.trim() || null
      };
      dto.guests.push(guestData);
    }

    console.log('Gönderilen DTO:', dto);

    // Netlify fonksiyonuna gönder
    try {
      const resp = await fetch('/.netlify/functions/submit', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(dto)
      });
      if (!resp.ok) throw new Error(await resp.text() || resp.statusText);
      const result = await resp.json();
      msgEl.innerHTML = `<div class="alert alert-success">Rezervasyon talebiniz alındı! ID: ${result.requestId}</div>`;
      form.reset();
      guestContainer.innerHTML = '';
    } catch (err) {
      msgEl.innerHTML = `<div class="alert alert-danger">Hata: ${err.message}</div>`;
    } finally {
      submitBtn.disabled = false;
    }
  });
});
