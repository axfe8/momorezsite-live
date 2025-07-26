// js/app.js

document.addEventListener('DOMContentLoaded', () => {
  // — ortak intl‑tel‑input seçenekleri —
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
      utilsScript:
        'https://cdn.jsdelivr.net/npm/intl-tel-input@17.0.19/build/js/utils.js',
      dropdownContainer: document.body
    };
  }

  // — ana telefon —
  const phoneInput = document.getElementById('phoneNumber');
  const mainIti = window.intlTelInput(phoneInput, commonOptions());
  console.log('main iti object:', mainIti);

  // — form elemanları —
  const form = document.getElementById('reservationForm');
  const msgEl = document.getElementById('message');
  const submitBtn = form.querySelector('button[type="submit"]');
  const personCountInput = document.getElementById('personCount');
  const guestContainer = document.getElementById('guestContainer');

  // — sosyal medya prefix güncelleme (sabit) —
  const platformSelect = document.getElementById('socialPlatform');
  const socialInput = document.getElementById('socialMedia');
  const prefixes = {
    instagram: 'https://instagram.com/',
    linkedin:  'https://linkedin.com/in/',
    facebook:  'https://facebook.com/'
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

  // — misafir intl‑tel‑input örneklerini saklayacağımız dizi —
  const guestItis = [];

  // — misafir alanlarını üreten ve init eden fonksiyon —
  function renderGuests() {
    guestItis.length = 0;
    guestContainer.innerHTML = '';
    const count = parseInt(personCountInput.value, 10);
    if (isNaN(count) || count < 2) return;

    for (let i = 2; i <= count; i++) {
      const guestIndex = i - 2;             // 0‑tabanlı indeks

      const col = document.createElement('div');
      col.className = 'col-md-6';

      const fs = document.createElement('fieldset');
      fs.className = 'border rounded p-3 h-100';

      const legend = document.createElement('legend');
      legend.className = 'float-none w-auto px-2 bg-light text-primary rounded';
      legend.textContent = `${i}. Misafir`;
      fs.appendChild(legend);

      // Ad Soyad, E‑posta, Telefon
      [
        ['Ad Soyad', 'text', 'fullName'],
        ['E-posta',   'email','email'],
        ['Telefon',   'tel',  'phoneNumber']
      ].forEach(([labelText, type, name]) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'mb-2';

        const lbl = document.createElement('label');
        lbl.className = 'form-label small';
        lbl.textContent = labelText;

        const inp = document.createElement('input');
        inp.type = type;
        inp.className = 'form-control form-control-sm rounded-pill';
        //  👉 buradaki i‑2 ile doğru index’e yazıyoruz
        inp.name = `guests[${guestIndex}].${name}`;
        inp.required = true;

        wrapper.append(lbl, inp);
        fs.appendChild(wrapper);

        // Telefon alanını gördüğümüzde hemen init et
        if (name === 'phoneNumber') {
          const itiGuest = window.intlTelInput(inp, commonOptions());
          guestItis.push(itiGuest);
        }
      });

      // Sosyal Medya Platformu
      const platformWrapper = document.createElement('div');
      platformWrapper.className = 'mb-2';
      platformWrapper.innerHTML = `
        <label class="form-label small">Sosyal Medya Platformu</label>
        <select class="form-select form-select-sm rounded-pill"
                name="guests[${guestIndex}].socialPlatform">
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
               class="form-control form-control-sm rounded-pill"
               name="guests[${guestIndex}].socialMedia"
               placeholder="${prefixes.instagram}" />`;
      fs.appendChild(mediaWrapper);

      // prefix dinleyicileri
      const selGuest = platformWrapper.querySelector('select');
      const inpGuest = mediaWrapper.querySelector('input');
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

  // — form submit —
  form.addEventListener('submit', async e => {
    e.preventDefault();
    submitBtn.disabled = true;

    // ana telefon doğrulama
    if (!mainIti.isValidNumber()) {
      msgEl.innerHTML = '<div class="alert alert-warning">Geçerli bir telefon numarası girin.</div>';
      submitBtn.disabled = false;
      return;
    }
    // misafir telefon doğrulama
    for (let idx = 0; idx < guestItis.length; idx++) {
      if (!guestItis[idx].isValidNumber()) {
        msgEl.innerHTML = `<div class="alert alert-warning">${idx + 2}. misafir için geçerli telefon girin.</div>`;
        submitBtn.disabled = false;
        return;
      }
    }

    // FormData al
    const fd = new FormData(form);
    const fullName     = fd.get('fullName')?.trim();
    const email        = fd.get('email')?.trim();
    const requestedDate= fd.get('requestedDate');
    const personCount  = parseInt(fd.get('personCount'), 10);

    if (!fullName || !email || !requestedDate || !personCount) {
      msgEl.innerHTML = '<div class="alert alert-warning">Lütfen tüm zorunlu alanları doldurun.</div>';
      submitBtn.disabled = false;
      return;
    }

    // DTO oluştur
    const dto = {
      fullName,
      phoneNumber: mainIti.getNumber(),
      email,
      socialMedia: fd.get('socialMedia')?.trim() || null,
      requestedDate,
      personCount,
      guests: []
    };

    // misafir verilerini ekle
    for (let i = 0; i < guestItis.length; i++) {
      dto.guests.push({
        fullName:      fd.get(`guests[${i}].fullName`)?.trim(),
        email:         fd.get(`guests[${i}].email`)?.trim(),
        phoneNumber:   guestItis[i].getNumber(),
        socialMedia:   fd.get(`guests[${i}].socialMedia`)?.trim() || null
      });
    }

    console.log('Gönderilen DTO:', dto);

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
