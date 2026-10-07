/* Desbloqueo de imágenes bajo NDA.
   Las imágenes públicas (images/*.jpg) ya están desenfocadas en el archivo.
   Las versiones nítidas viven cifradas (AES-GCM) en images/*.enc y solo se
   pueden abrir con la contraseña. Sin contraseña el sitio se ve igual que siempre.
   Formato de cada .enc: salt (16 bytes) + iv (12 bytes) + datos cifrados. */
(function () {
  var ITERATIONS = 600000;
  var STORE = 'ndaKey';
  var CONTACT = 'vreche.ux@gmail.com';

  var imgs = Array.prototype.slice.call(document.querySelectorAll('img[data-nda]'));
  if (!imgs.length || !window.crypto || !crypto.subtle) return;

  var T = {
    es: {
      open: '🔒 Tengo contraseña · Ver imágenes',
      close: '🔓 Imágenes visibles · Volver a ocultar',
      title: 'Ver imágenes sin desenfoque',
      body: 'Estos proyectos están bajo NDA. Si te compartí una contraseña, ingresala para ver las pantallas reales.',
      label: 'Contraseña',
      show: 'Mostrar contraseña',
      hide: 'Ocultar contraseña',
      submit: 'Ver imágenes',
      cancel: 'Cancelar',
      checking: 'Verificando…',
      wrong: 'Esa contraseña no es correcta. Revisá mayúsculas y espacios.',
      unavailable: 'No pude cargar las imágenes. Probá de nuevo en un momento.',
      ask: '¿No tenés contraseña? Pedímela a '
    },
    en: {
      open: '🔒 I have a password · View images',
      close: '🔓 Images visible · Hide again',
      title: 'View images without blur',
      body: 'These projects are under NDA. If I shared a password with you, enter it to see the real screens.',
      label: 'Password',
      show: 'Show password',
      hide: 'Hide password',
      submit: 'View images',
      cancel: 'Cancel',
      checking: 'Checking…',
      wrong: 'That password is not correct. Check capitals and spaces.',
      unavailable: 'I could not load the images. Please try again in a moment.',
      ask: 'No password? Ask me at '
    }
  };
  function t(k) { return T[document.documentElement.lang === 'en' ? 'en' : 'es'][k]; }

  var css = document.createElement('style');
  css.textContent =
    '.nda-open img{filter:none!important;transform:none!important}' +
    '.nda-open .case-cover-lock,.nda-open .case-img-lock{display:none}' +
    '.nda-toggle{font:inherit;font-size:.8rem;font-weight:600;display:inline-flex;align-items:center;gap:.5rem;background:var(--cream,#F4EFE4);color:var(--ink,#141310);border:1.5px solid var(--ink,#141310);border-radius:999px;padding:.55rem 1.1rem;cursor:pointer;margin-top:1rem;position:relative;z-index:3}' +
    '.nda-toggle:hover{background:var(--ink,#141310);color:var(--cream,#F4EFE4)}' +
    '.nda-toggle:focus-visible,.nda-dialog input:focus-visible,.nda-dialog button:focus-visible{outline:3px solid var(--pink,#F03C8C);outline-offset:2px}' +
    '.nda-dialog{margin:auto;border:0;border-radius:20px;padding:2rem;max-width:min(26rem,calc(100vw - 2rem));background:var(--cream,#F4EFE4);color:var(--ink,#141310);font-family:"Instrument Sans",sans-serif}' +
    '.nda-dialog::backdrop{background:rgba(20,19,16,.6)}' +
    '.nda-dialog h2{font-family:"Bricolage Grotesque",sans-serif;font-size:1.5rem;line-height:1.15;margin:0 0 .75rem}' +
    '.nda-dialog p{font-size:.92rem;color:var(--ink-soft,#5C594E);margin:0 0 1rem}' +
    '.nda-dialog label{display:block;font-size:.8rem;font-weight:600;margin-bottom:.4rem}' +
    '.nda-dialog input{width:100%;box-sizing:border-box;font:inherit;font-size:1rem;padding:.75rem 1rem;border:1.5px solid var(--ink,#141310);border-radius:12px;background:#fff;color:var(--ink,#141310)}' +
    '.nda-dialog .nda-field{position:relative}' +
    '.nda-dialog .nda-field input{padding-right:3.2rem}' +
    '.nda-dialog .nda-eye{position:absolute;right:.35rem;top:50%;transform:translateY(-50%);display:flex;align-items:center;justify-content:center;width:2.5rem;height:2.5rem;padding:0;border:0;border-radius:10px;background:transparent;color:var(--ink-soft,#5C594E)}' +
    '.nda-dialog .nda-eye:hover{color:var(--ink,#141310);background:var(--cream-2,#EDE6D6)}' +
    '.nda-dialog .nda-eye svg{width:1.35rem;height:1.35rem;pointer-events:none}' +
    '.nda-dialog .nda-error{color:var(--pink-text,#A81463);font-weight:600;min-height:1.3em;margin:.6rem 0 0}' +
    '.nda-dialog .nda-actions{display:flex;gap:.6rem;justify-content:flex-end;margin-top:1rem;flex-wrap:wrap}' +
    '.nda-dialog button{font:inherit;font-size:.9rem;font-weight:600;border-radius:999px;padding:.7rem 1.3rem;cursor:pointer;border:1.5px solid var(--ink,#141310);background:transparent;color:var(--ink,#141310)}' +
    '.nda-dialog button[type=submit]{background:var(--ink,#141310);color:var(--cream,#F4EFE4)}' +
    '.nda-dialog button[disabled]{opacity:.6;cursor:wait}' +
    '.nda-dialog .nda-ask{font-size:.8rem;margin:1.2rem 0 0}' +
    '.nda-dialog a{color:var(--pink-text,#A81463);text-decoration:underline}';
  document.head.appendChild(css);

  /* ---------- crypto ---------- */
  function b64(buf) { return btoa(String.fromCharCode.apply(null, new Uint8Array(buf))); }
  function unb64(s) { return Uint8Array.from(atob(s), function (c) { return c.charCodeAt(0); }); }

  var files = {};
  function load(url) {
    if (!files[url]) {
      files[url] = fetch(url).then(function (r) {
        if (!r.ok) throw new Error('missing');
        return r.arrayBuffer();
      }).then(function (b) { return new Uint8Array(b); });
      files[url].catch(function () { delete files[url]; });
    }
    return files[url];
  }
  function deriveRaw(password, salt) {
    return crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
      .then(function (base) {
        return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt, iterations: ITERATIONS }, base, 256);
      });
  }
  function mime(b) {
    if (b[0] === 0x89 && b[1] === 0x50) return 'image/png';
    if (b[0] === 0x52 && b[1] === 0x49) return 'image/webp';
    if (b[0] === 0x47 && b[1] === 0x49) return 'image/gif';
    return 'image/jpeg';
  }
  function decrypt(raw, data) {
    return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']).then(function (key) {
      return crypto.subtle.decrypt({ name: 'AES-GCM', iv: data.slice(16, 28) }, key, data.slice(28));
    }).then(function (plain) {
      var bytes = new Uint8Array(plain);
      return URL.createObjectURL(new Blob([bytes], { type: mime(bytes) }));
    });
  }

  /* ---------- show / hide ---------- */
  function reveal(img, raw) {
    return load(img.dataset.nda).then(function (data) { return decrypt(raw, data); }).then(function (url) {
      if (!img.dataset.ndaBlur) img.dataset.ndaBlur = img.getAttribute('src');
      img.src = url;
      var box = img.parentElement;
      box.classList.add('nda-open');
      var label = box.getAttribute('aria-label');
      if (label && !box.dataset.ndaLabel) {
        box.dataset.ndaLabel = label;
        box.setAttribute('aria-label', label.replace(/ desenfocada/i, '').replace(/,? bajo NDA/i, ''));
      }
    }).catch(function () { /* esa imagen queda desenfocada */ });
  }
  function revealAll(raw) {
    return Promise.all(imgs.map(function (img) { return reveal(img, raw); })).then(function () {
      setState(document.querySelector('.nda-open') !== null);
    });
  }
  function hideAll() {
    try { localStorage.removeItem(STORE); } catch (e) {}
    imgs.forEach(function (img) {
      if (img.dataset.ndaBlur) { URL.revokeObjectURL(img.src); img.src = img.dataset.ndaBlur; }
      var box = img.parentElement;
      box.classList.remove('nda-open');
      if (box.dataset.ndaLabel) box.setAttribute('aria-label', box.dataset.ndaLabel);
    });
    setState(false);
  }

  /* Devuelve 'ok', 'wrong' o 'unavailable'. */
  function tryPassword(password) {
    var i = 0;
    function firstFile() {
      if (i >= imgs.length) return Promise.reject(new Error('unavailable'));
      return load(imgs[i++].dataset.nda).catch(firstFile);
    }
    return firstFile().then(function (data) {
      var salt = data.slice(0, 16);
      return deriveRaw(password, salt).then(function (raw) {
        return decrypt(raw, data).then(function (url) {
          URL.revokeObjectURL(url);
          try { localStorage.setItem(STORE, JSON.stringify({ salt: b64(salt), key: b64(raw) })); } catch (e) {}
          return revealAll(raw).then(function () { return 'ok'; });
        }, function () { return 'wrong'; });
      });
    }, function () { return 'unavailable'; });
  }

  /* ---------- UI ---------- */
  var unlocked = false;
  var toggles = Array.prototype.slice.call(document.querySelectorAll('[data-nda-toggle]'));
  function setState(on) {
    unlocked = on;
    toggles.forEach(function (b) {
      b.textContent = t(on ? 'close' : 'open');
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  var dialog = document.createElement('dialog');
  dialog.className = 'nda-dialog';
  dialog.setAttribute('aria-labelledby', 'nda-title');
  dialog.innerHTML =
    '<form method="dialog" novalidate>' +
    '<h2 id="nda-title"></h2><p class="nda-body"></p>' +
    '<label for="nda-input"></label>' +
    '<div class="nda-field"><input id="nda-input" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" aria-describedby="nda-error">' +
    '<button type="button" class="nda-eye" aria-pressed="false"></button></div>' +
    '<p class="nda-error" id="nda-error" role="alert"></p>' +
    '<div class="nda-actions"><button type="button" class="nda-cancel"></button><button type="submit"></button></div>' +
    '<p class="nda-ask"></p></form>';
  document.body.appendChild(dialog);
  var form = dialog.querySelector('form');
  var input = dialog.querySelector('input');
  var error = dialog.querySelector('.nda-error');
  var submit = dialog.querySelector('button[type=submit]');
  var eye = dialog.querySelector('.nda-eye');
  var EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  var EYE_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.6 5.1A10.6 10.6 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1M6.5 6.6C3.6 8.5 2 12 2 12s3.6 7 10 7a10.3 10.3 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><path d="M3 3l18 18"/></svg>';
  function showPassword(on) {
    input.type = on ? 'text' : 'password';
    eye.innerHTML = on ? EYE_OFF : EYE;
    eye.setAttribute('aria-pressed', on ? 'true' : 'false');
    eye.setAttribute('aria-label', t(on ? 'hide' : 'show'));
    eye.title = t(on ? 'hide' : 'show');
  }
  eye.addEventListener('click', function () { showPassword(input.type === 'password'); input.focus(); });

  function paint() {
    dialog.querySelector('h2').textContent = t('title');
    dialog.querySelector('.nda-body').textContent = t('body');
    dialog.querySelector('label').textContent = t('label');
    dialog.querySelector('.nda-cancel').textContent = t('cancel');
    submit.textContent = t('submit');
    showPassword(input.type === 'text');
    dialog.querySelector('.nda-ask').innerHTML = t('ask') + '<a href="mailto:' + CONTACT + '">' + CONTACT + '</a>';
    setState(unlocked);
  }
  paint();
  new MutationObserver(paint).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  dialog.querySelector('.nda-cancel').addEventListener('click', function () { dialog.close(); });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!input.value) { input.focus(); return; }
    error.textContent = '';
    submit.disabled = true;
    submit.textContent = t('checking');
    tryPassword(input.value).then(function (result) {
      submit.disabled = false;
      submit.textContent = t('submit');
      if (result === 'ok') { input.value = ''; showPassword(false); dialog.close(); }
      else { error.textContent = t(result); input.select(); }
    });
  });
  toggles.forEach(function (b) {
    b.hidden = false;
    b.addEventListener('click', function () {
      if (unlocked) { hideAll(); return; }
      error.textContent = '';
      input.value = '';
      showPassword(false);
      dialog.showModal();
      input.focus();
    });
  });

  /* ---------- al cargar ---------- */
  // Link directo: sitio/#nda=contraseña desbloquea sin escribir nada.
  var m = location.hash.match(/^#nda=(.+)$/);
  if (m) {
    history.replaceState(null, '', location.pathname + location.search);
    tryPassword(decodeURIComponent(m[1]));
    return;
  }
  // Ya la ingresó antes en este navegador.
  try {
    var saved = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (saved) {
      load(imgs[0].dataset.nda).then(function (data) {
        if (b64(data.slice(0, 16)) !== saved.salt) { localStorage.removeItem(STORE); return; }
        return revealAll(unb64(saved.key));
      }).catch(function () {});
    }
  } catch (e) {}
})();
