/* Zoom de imágenes en los casos: clic (o Enter) abre la imagen a pantalla completa;
   un segundo clic alterna entre "ajustada a la pantalla" y "tamaño real".
   Las imágenes bajo NDA sin desbloquear no se amplían: abren el cuadro de contraseña. */
(function () {
  var imgs = Array.prototype.slice.call(document.querySelectorAll('.case-cover img, .case-img img, .phone-mock img'));
  if (!imgs.length || !window.HTMLDialogElement) return;

  var T = {
    es: { open: 'Ampliar imagen', close: 'Cerrar', real: 'Ver a tamaño real', fit: 'Ajustar a la pantalla' },
    en: { open: 'Enlarge image', close: 'Close', real: 'View at actual size', fit: 'Fit to screen' }
  };
  function t(k) { return T[document.documentElement.lang === 'en' ? 'en' : 'es'][k]; }

  var css = document.createElement('style');
  css.textContent =
    '.zoomable img{cursor:zoom-in}' +
    '.zoomable img:focus-visible{outline:3px solid var(--pink,#F03C8C);outline-offset:-3px}' +
    '.zoom-btn{position:absolute;left:14px;top:14px;z-index:2;width:38px;height:38px;display:flex;align-items:center;justify-content:center;padding:0;border:1.5px solid var(--ink,#141310);border-radius:50%;background:var(--cream,#F4EFE4);color:var(--ink,#141310);cursor:zoom-in;box-shadow:0 2px 8px rgba(20,19,16,.25)}' +
    '.zoom-btn:hover{background:var(--ink,#141310);color:var(--cream,#F4EFE4);border-color:var(--cream,#F4EFE4)}' +
    '.zoom-btn:focus-visible{outline:3px solid var(--pink,#F03C8C);outline-offset:2px}' +
    '.zoom-btn svg{width:18px;height:18px;pointer-events:none}' +
    '.phone-mock .zoom-btn{left:8px;top:8px;width:30px;height:30px}.phone-mock .zoom-btn svg{width:14px;height:14px}' +
    '.zoom-locked>.zoom-btn{display:none}.zoom-locked img{cursor:pointer}' +
    '.zoom-dialog{width:100vw;height:100vh;height:100dvh;max-width:none;max-height:none;margin:0;padding:0;border:0;background:rgba(20,19,16,.94);overflow:hidden}' +
    '.zoom-dialog::backdrop{background:rgba(20,19,16,.94)}' +
    '.zoom-stage{width:100%;height:100%;overflow:auto;display:flex;padding:64px 2vw 2vw;box-sizing:border-box;overscroll-behavior:contain}' +
    '.zoom-stage img{margin:auto;display:block;max-width:100%;max-height:100%;border-radius:10px;cursor:zoom-in;background:#fff}' +
    '.zoom-stage.tall img{max-height:none;max-width:min(100%,1100px)}' +
    '.zoom-stage.real img{max-width:none;max-height:none;cursor:zoom-out}' +
    '.zoom-stage.fixed img{cursor:default}' +
    '.zoom-bar{position:absolute;top:12px;right:14px;z-index:2;display:flex;gap:.5rem}' +
    '.zoom-bar button{font:600 .8rem "Instrument Sans",sans-serif;border:1.5px solid var(--cream,#F4EFE4);background:var(--ink,#141310);color:var(--cream,#F4EFE4);border-radius:999px;padding:.55rem 1rem;cursor:pointer}' +
    '.zoom-bar button:hover{background:var(--cream,#F4EFE4);color:var(--ink,#141310)}' +
    '.zoom-bar button:focus-visible{outline:3px solid var(--pink,#F03C8C);outline-offset:2px}';
  document.head.appendChild(css);

  var ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>';

  var dialog = document.createElement('dialog');
  dialog.className = 'zoom-dialog';
  dialog.innerHTML = '<div class="zoom-bar"><button type="button" class="zoom-size"></button><button type="button" class="zoom-close"></button></div><div class="zoom-stage"><img alt=""></div>';
  document.body.appendChild(dialog);
  var stage = dialog.querySelector('.zoom-stage');
  var big = stage.querySelector('img');
  var sizeBtn = dialog.querySelector('.zoom-size');
  var closeBtn = dialog.querySelector('.zoom-close');
  var opener = null;

  function isLocked(img) { return img.hasAttribute('data-nda') && !img.parentElement.classList.contains('nda-open'); }

  function setReal(on) {
    stage.classList.toggle('real', on);
    sizeBtn.textContent = t(on ? 'fit' : 'real');
    if (on) { stage.scrollTop = 0; stage.scrollLeft = Math.max(0, (stage.scrollWidth - stage.clientWidth) / 2); }
  }
  function open(img, from) {
    if (isLocked(img)) {
      var unlock = document.querySelector('[data-nda-toggle]');
      if (unlock) unlock.click();
      return;
    }
    opener = from || img;
    big.src = img.currentSrc || img.src;
    big.alt = img.alt || (img.parentElement.getAttribute('aria-label') || '');
    big.style.imageRendering = img.style.imageRendering || '';
    stage.classList.toggle('tall', img.naturalHeight > img.naturalWidth * 1.3);
    closeBtn.textContent = t('close') + ' ✕';
    setReal(false);
    dialog.showModal();
    check();
  }
  // Solo ofrecer "tamaño real" si la imagen es más grande que como se muestra.
  function check() {
    if (!dialog.open || !big.naturalWidth || stage.classList.contains('real')) return;
    var bigger = big.naturalWidth > big.clientWidth + 8;
    sizeBtn.hidden = !bigger;
    stage.classList.toggle('fixed', !bigger);
  }
  big.addEventListener('load', function () { stage.scrollTop = 0; check(); });
  window.addEventListener('resize', check);
  function close() { dialog.close(); }

  dialog.addEventListener('close', function () { big.removeAttribute('src'); if (opener) opener.focus(); opener = null; });
  closeBtn.addEventListener('click', close);
  sizeBtn.addEventListener('click', function () { setReal(!stage.classList.contains('real')); });
  big.addEventListener('click', function () { if (!sizeBtn.hidden) setReal(!stage.classList.contains('real')); });
  stage.addEventListener('click', function (e) { if (e.target === stage) close(); });

  function refreshLocks() {
    imgs.forEach(function (img) {
      var locked = isLocked(img);
      img.parentElement.classList.toggle('zoom-locked', locked);
      var wrap = img.closest('.case-scroll');
      if (wrap) wrap.classList.toggle('zoom-locked', locked);
    });
  }

  imgs.forEach(function (img) {
    var box = img.parentElement;
    box.classList.add('zoomable');
    if (getComputedStyle(box).position === 'static') box.style.position = 'relative';
    img.addEventListener('click', function () { open(img); });

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'zoom-btn';
    btn.innerHTML = ICON;
    btn.addEventListener('click', function (e) { e.stopPropagation(); open(img, btn); });
    // En el contenedor con scroll, el botón va fuera del área que se desplaza.
    (img.closest('.case-scroll') || box).appendChild(btn);
  });

  function labels() {
    Array.prototype.forEach.call(document.querySelectorAll('.zoom-btn'), function (b) {
      b.setAttribute('aria-label', t('open'));
      b.title = t('open');
    });
  }
  labels();
  refreshLocks();
  new MutationObserver(labels).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  // El estado bloqueado/desbloqueado lo cambia nda.js agregando o quitando .nda-open.
  var mo = new MutationObserver(refreshLocks);
  imgs.forEach(function (img) { mo.observe(img.parentElement, { attributes: true, attributeFilter: ['class'] }); });
})();
