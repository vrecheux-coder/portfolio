/* Desbloqueo de imágenes bajo NDA.
   Las imágenes públicas (images/*.jpg) ya están desenfocadas en el archivo.
   Las versiones nítidas viven cifradas (AES-GCM) en images/*.enc y solo se
   pueden abrir con la contraseña. Sin contraseña el sitio se ve igual que siempre.
   Formato de cada .enc: salt (16 bytes) + iv (12 bytes) + datos cifrados. */
(function () {
  var ITERATIONS = 600000;
  var STORE = 'ndaKey';
  var CONTACT = 'vreche.ux@gmail.com';
  // Formulario para pedir la contraseña sin salir del sitio. Pegar acá la URL del
  // formulario (por ejemplo https://formspree.io/f/xxxxxxxx). Vacío = solo botón de mail.
  var REQUEST_ENDPOINT = 'https://formspree.io/f/mwlvlona';

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
      ask: '¿No tenés contraseña?',
      request: 'Pedirla por mail',
      formHint: 'Dejame tu mail y te la envío.',
      emailLabel: 'Tu mail',
      emailPh: 'nombre@empresa.com',
      send: 'Pedir contraseña',
      sending: 'Enviando…',
      sent: '¡Listo! Recibí tu pedido y te envío la contraseña por mail.',
      badEmail: 'Revisá el mail: parece incompleto.',
      sendError: 'No se pudo enviar. Probá con el botón de mail de abajo.',
      orMail: 'o escribime directo',
      copy: 'Copiar mi mail',
      copied: 'Mail copiado ✓',
      subject: 'Contraseña para ver tu portfolio',
      mail: 'Hola Vanesa,\n\nVi tu portfolio y me gustaría ver las imágenes completas de los proyectos bajo NDA. ¿Me compartís la contraseña?\n\nNombre:\nEmpresa y rol:\n\n¡Gracias!'
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
      ask: 'No password?',
      request: 'Request it by email',
      formHint: 'Leave your email and I’ll send it to you.',
      emailLabel: 'Your email',
      emailPh: 'name@company.com',
      send: 'Request password',
      sending: 'Sending…',
      sent: 'Done! I got your request and will email you the password.',
      badEmail: 'Check the email: it looks incomplete.',
      sendError: 'It could not be sent. Try the email button below.',
      orMail: 'or email me directly',
      copy: 'Copy my email',
      copied: 'Email copied ✓',
      subject: 'Password to view your portfolio',
      mail: 'Hi Vanesa,\n\nI saw your portfolio and would like to see the full images of the projects under NDA. Could you share the password?\n\nName:\nCompany and role:\n\nThanks!'
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
    '.nda-dialog .nda-ask{margin:1.4rem 0 0;padding-top:1.1rem;border-top:1px solid var(--line,#DEDACB)}' +
    '.nda-dialog .nda-ask p{font-size:.85rem;font-weight:600;color:var(--ink,#141310);margin:0 0 .7rem}' +
    '.nda-dialog .nda-ask-actions{display:flex;gap:.6rem;flex-wrap:wrap}' +
    '.nda-dialog .nda-request{display:inline-flex;align-items:center;font-size:.85rem;font-weight:600;text-decoration:none;border-radius:999px;padding:.6rem 1.1rem;border:1.5px solid var(--pink-text,#A81463);background:var(--pink-text,#A81463);color:#fff}' +
    '.nda-dialog .nda-request:focus-visible{outline:3px solid var(--pink,#F03C8C);outline-offset:2px}' +
    '.nda-dialog .nda-copy{font-size:.85rem;padding:.6rem 1.1rem}' +
    '.nda-dialog .nda-ask p.nda-req-hint{font-size:.85rem;font-weight:400;color:var(--ink-soft,#5C594E);margin:-.4rem 0 .8rem}' +
    '.nda-dialog .nda-req-row{display:flex;gap:.5rem;flex-wrap:wrap}' +
    '.nda-dialog .nda-req-row input{flex:1 1 11rem;width:auto;min-width:0;font-size:.95rem;padding:.65rem .9rem}' +
    '.nda-dialog .nda-req-send{background:var(--pink-text,#A81463);border-color:var(--pink-text,#A81463);color:#fff;font-size:.85rem;padding:.65rem 1.1rem}' +
    '.nda-dialog .nda-ask p.nda-req-msg{font-size:.85rem;font-weight:600;margin:.6rem 0 0;min-height:1.2em;color:var(--pink-text,#A81463)}' +
    '.nda-dialog .nda-ask p.nda-req-msg.ok{color:#1F6B3A}' +
    '.nda-dialog .nda-ask p.nda-req-alt{font-size:.8rem;margin:.5rem 0 0;color:var(--ink-soft,#5C594E);font-weight:400}' +
    '.nda-dialog .nda-hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}' +
    '.nda-dialog .nda-ask[data-mode=form] .nda-ask-actions{display:none}' +
    '.nda-dialog .nda-ask[data-mode=mail] .nda-req{display:none}' +
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
    '<div class="nda-ask" data-mode="' + (REQUEST_ENDPOINT ? 'form' : 'mail') + '"><p></p>' +
    '<div class="nda-req"><p class="nda-req-hint"></p><div class="nda-req-row"><label for="nda-req-email" class="nda-hp"></label>' +
    '<input id="nda-req-email" type="email" autocomplete="email" inputmode="email" aria-describedby="nda-req-msg">' +
    '<input class="nda-hp" type="text" name="_gotcha" tabindex="-1" autocomplete="off" aria-hidden="true">' +
    '<button type="button" class="nda-req-send"></button></div>' +
    '<p class="nda-req-msg" id="nda-req-msg" role="status"></p><p class="nda-req-alt"><a class="nda-req-mailto"></a></p></div>' +
    '<div class="nda-ask-actions"><a class="nda-request"></a><button type="button" class="nda-copy"></button></div></div></form>';
  document.body.appendChild(dialog);
  var form = dialog.querySelector('form');
  var input = dialog.querySelector('input');
  var error = dialog.querySelector('.nda-error');
  var submit = dialog.querySelector('button[type=submit]');
  var eye = dialog.querySelector('.nda-eye');
  var request = dialog.querySelector('.nda-request');
  var copy = dialog.querySelector('.nda-copy');
  var ask = dialog.querySelector('.nda-ask');
  var reqEmail = dialog.querySelector('#nda-req-email');
  var reqSend = dialog.querySelector('.nda-req-send');
  var reqMsg = dialog.querySelector('.nda-req-msg');
  var reqAlt = dialog.querySelector('.nda-req-mailto');
  function reqSay(key, ok) { reqMsg.textContent = key ? t(key) : ''; reqMsg.classList.toggle('ok', !!ok); }
  function sendRequest() {
    if (reqSend.disabled) return;
    var email = reqEmail.value.trim();
    if (!email || !reqEmail.checkValidity()) { reqSay('badEmail'); reqEmail.focus(); return; }
    if (dialog.querySelector('input[name=_gotcha]').value) { reqSay('sent', true); return; }
    reqSay('');
    reqSend.disabled = true;
    reqSend.textContent = t('sending');
    fetch(REQUEST_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        email: email,
        _subject: 'Pedido de contraseña — portfolio',
        message: 'Pide la contraseña para ver los proyectos bajo NDA.',
        pagina: location.href.split('#')[0],
        idioma: document.documentElement.lang
      })
    }).then(function (r) { if (!r.ok) throw new Error('send'); }).then(function () {
      reqSay('sent', true);
      reqEmail.value = '';
      reqSend.textContent = t('send');   // queda deshabilitado: ya se envió
    }).catch(function () {
      reqSend.disabled = false;
      reqSend.textContent = t('send');
      reqSay('sendError');
      ask.setAttribute('data-mode', 'both');
    });
  }
  reqSend.addEventListener('click', sendRequest);
  reqEmail.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); sendRequest(); } });
  copy.addEventListener('click', function () {
    function done() { copy.textContent = t('copied'); setTimeout(function () { copy.textContent = t('copy'); }, 2500); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(CONTACT).then(done, function () { copy.textContent = CONTACT; });
    else copy.textContent = CONTACT;
  });
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
    dialog.querySelector('.nda-ask p').textContent = t('ask');
    request.textContent = t('request') + ' →';
    request.href = 'mailto:' + CONTACT + '?subject=' + encodeURIComponent(t('subject')) + '&body=' + encodeURIComponent(t('mail'));
    copy.textContent = t('copy');
    dialog.querySelector('.nda-req-hint').textContent = t('formHint');
    dialog.querySelector('label[for=nda-req-email]').textContent = t('emailLabel');
    reqEmail.placeholder = t('emailPh');
    reqEmail.setAttribute('aria-label', t('emailLabel'));
    if (!reqSend.disabled) reqSend.textContent = t('send');
    reqAlt.textContent = t('orMail');
    reqAlt.href = request.href;
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
