/**
 * رابط کاربری آزمون GLP-1 — نسخه ۲ (فارسی و انگلیسی)
 * گام‌ها از data/quiz-v2.json (یا data/en/quiz-v2.json) ساخته می‌شوند؛ شاخه‌بندی، خروج زودهنگام ایمنی و اعتبارسنجی با Glp1Engine.
 * شکل پاسخ هر گام از نوع و ui آن می‌آید: عدد با نوار لغزان و دکمه‌های + و −، گزینه‌های مرتب روی یک مقیاس،
 * چندگزینه‌ای به شکل برچسب با دکمه جدای «هیچ‌کدام»، پرسش‌های بله/خیر یکی‌یکی، و آزمایش‌ها فقط اگر کاربر بخواهد.
 * نیازمند: assets/js/glp1-engine.js و assets/css/quiz-v2.css
 *
 * استفاده:
 *   const quiz = Glp1QuizV2.mount(document.getElementById('quiz-v2'), {
 *     lang: 'fa',                                  // یا 'en'
 *     quizUrl: '/data/quiz-v2.json', lessonsUrl: '/data/lessons.json',   // نسخه انگلیسی: همان مسیر با en/ پیش از نام فایل
 *     endpoint: '/api/evaluate.php', resultEndpoint: '/api/result.php',
 *     csrfToken: '<?= $_SESSION["csrf_token"] ?>',
 *     onReferences: function () { ... }            // اختیاری: دکمه «منابع علمی» در گزارش
 *   });
 *   quiz.setLang('en');                            // تعویض زبان بدون از دست رفتن پاسخ‌ها
 */
(function (global) {
  'use strict';
  const E = global.Glp1Engine;
  const RM = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);


  // ---------- متن‌های رابط ----------
  const UI = {
    fa: {
      step: 'گام {n} از {t}', progress: 'پیشرفت آزمون', next: 'بعدی', back: 'قبلی', report: 'دیدن گزارش',
      optional: 'اختیاری', clear: 'پاک کردن', less: 'کم کردن', more: 'زیاد کردن', unset: 'نوار را بکشید یا عدد را بنویسید',
      chipsHint: 'هر چند مورد که درباره شما درست است را انتخاب کنید.', none: 'هیچ‌کدام از این‌ها',
      statement: 'پرسش {n} از {t}', yes: 'بله', no: 'خیر', goTo: 'رفتن به پرسش {n}',
      labsHave: 'آزمایش اخیر دارم', labsHaveSub: 'اعداد را وارد می‌کنم', labsSkip: 'ندارم', labsSkipSub: 'این گام را رد کن',
      bmi: 'شاخص توده بدنی تخمینی',
      analyzing: 'در حال تحلیل پاسخ‌ها',
      analysis: ['بررسی موارد منع مصرف', 'محاسبه BMI و مرحله بالینی', 'سنجش آمادگی و انتخاب مسیر', 'انتخاب درسنامه‌های مناسب شما'],
      reportTitle: 'گزارش ارزیابی شما', mock: 'پیش‌نمایش محلی؛ چیزی ذخیره نشده است.',
      outOf: 'از ۱۰۰', scoreAria: 'نمره {s} از ۱۰۰', axis0: '۰: مسیر بدون دارو', axis100: '۱۰۰: کاندید دارو',
      status: { red: 'منع مصرف', orange: 'نیاز به نظر پزشک', yellow: 'مسیر غیردارویی', blue: 'آماده‌سازی', green: 'کاندید دارو' },
      pillStatus: 'وضعیت: {s}', pillBmi: 'BMI: {b}', pillEoss: 'مرحله بالینی (EOSS): {e} از ۴', pillReady: 'آمادگی: {r} از ۱۰۰',
      scoreHint: 'مسیر نتیجه را قاعده‌های بالینی تعیین می‌کنند و این عدد فقط خلاصه‌ای از آن است؛ جایگزین تشخیص پزشک نیست.',
      hardStops: 'موانع قطعی', warnings: 'موارد احتیاط', doctor: 'چه چیزهایی را به پزشک بگویم یا بررسی کنم', info: 'نکته‌های دیگر',
      positives: 'شاخص‌ها و نقاط قوت', steps: 'گام‌های بعدی ({n} گام)', lessons: 'درسنامه‌های شما', minutes: '{n} دقیقه',
      medical: 'توجه پزشکی', restart: 'ارزیابی جدید', refs: 'منابع علمی',
      printMsg: 'چاپ و ذخیره این محتوا مجاز نیست.',
      loadError: 'بارگذاری آزمون ممکن نشد؛ صفحه را دوباره باز کنید.', serverError: 'خطایی رخ داد؛ دوباره تلاش کنید.',
      netError: 'ارتباط با سرور برقرار نشد؛ دوباره «دیدن گزارش» را بزنید.', checkAnswers: 'لطفاً پاسخ‌ها را بررسی کنید.', notFound: 'گزارش پیدا نشد.',
      footAdvice: 'این ارزیابی جایگزین مشاوره پزشکی نیست؛ حتماً برای مشاوره به پزشک یا متخصص تغذیه مراجعه کنید.',
      dTitle: 'هشدار پزشکی',
      dLead: 'این ارزیابی و نتیجه آن فقط برای آگاهی و غربالگری اولیه است و <b>جایگزین معاینه، تشخیص یا نظر پزشک و متخصص تغذیه بالینی نیست.</b>',
      dList: ['شروع، تغییر دوز یا قطع هر داروی کاهش وزن، از جمله داروهای GLP-1 مثل سماگلوتاید و تیرزپاتاید، فقط با تجویز و زیر نظر پزشک است.',
        'برنامه غذایی و مقدار پروتئین شما را متخصص تغذیه بالینی، بر اساس شرایط خودتان، تعیین می‌کند.',
        'اگر درد شدید شکم، استفراغ طولانی، تورم صورت یا تنگی نفس دارید، منتظر نمانید و با اورژانس ۱۱۵ تماس بگیرید.'],
      dCheck: 'خواندم و می‌دانم این ارزیابی جایگزین نظر پزشک و متخصص تغذیه بالینی نیست.', dAccept: 'متوجه شدم، ادامه'
    },
    en: {
      step: 'Step {n} of {t}', progress: 'Assessment progress', next: 'Next', back: 'Back', report: 'See my report',
      optional: 'Optional', clear: 'Clear', less: 'Decrease', more: 'Increase', unset: 'Drag the slider or type a number',
      chipsHint: 'Choose every item that applies to you.', none: 'None of these',
      statement: 'Question {n} of {t}', yes: 'Yes', no: 'No', goTo: 'Go to question {n}',
      labsHave: 'I have recent results', labsHaveSub: 'I will enter the numbers', labsSkip: 'I don’t have any', labsSkipSub: 'Skip this step',
      bmi: 'Estimated body mass index',
      analyzing: 'Analysing your answers',
      analysis: ['Checking for contraindications', 'Calculating BMI and clinical stage', 'Scoring readiness and choosing a route', 'Choosing lessons for you'],
      reportTitle: 'Your assessment report', mock: 'Local preview; nothing has been saved.',
      outOf: 'out of 100', scoreAria: 'Score {s} out of 100', axis0: '0: non-drug route', axis100: '100: medicine candidate',
      status: { red: 'Contraindicated', orange: 'Needs a doctor’s review', yellow: 'Non-drug route', blue: 'Preparation', green: 'Medicine candidate' },
      pillStatus: 'Status: {s}', pillBmi: 'BMI: {b}', pillEoss: 'Clinical stage (EOSS): {e} of 4', pillReady: 'Readiness: {r} of 100',
      scoreHint: 'Clinical rules decide the route; this number only summarises it and does not replace a doctor’s diagnosis.',
      hardStops: 'Contraindications', warnings: 'Cautions', doctor: 'What to tell or ask my doctor', info: 'Other notes',
      positives: 'Measures and strengths', steps: 'Next steps ({n} steps)', lessons: 'Your lessons', minutes: '{n} min',
      medical: 'Medical note', restart: 'Start again', refs: 'Scientific references',
      printMsg: 'Printing or saving this content is not allowed.',
      loadError: 'The assessment could not load; please reopen the page.', serverError: 'Something went wrong; please try again.',
      netError: 'Could not reach the server; press “See my report” again.', checkAnswers: 'Please check your answers.', notFound: 'Report not found.',
      footAdvice: 'This assessment is not a substitute for medical advice; always consult a physician or dietitian.',
      dTitle: 'Medical notice',
      dLead: 'This assessment and its result are for awareness and initial screening only, and <b>do not replace an examination, a diagnosis, or the opinion of a physician or clinical nutrition specialist.</b>',
      dList: ['Starting, changing the dose of, or stopping any weight-loss medicine, including GLP-1 medicines such as semaglutide and tirzepatide, must only happen on a doctor’s prescription and under their care.',
        'Your eating plan and protein needs are set by a clinical nutrition specialist, based on your own situation.',
        'If you have severe abdominal pain, prolonged vomiting, facial swelling or trouble breathing, do not wait: call your local emergency number.'],
      dCheck: 'I have read this and understand that this assessment does not replace a physician or clinical nutrition specialist.', dAccept: 'I understand, continue'
    }
  };
  const TONE_ICON = {
    red: '<path d="M7 7l10 10M17 7L7 17"/>',
    orange: '<path d="M12 6v7"/><path d="M12 17.5v.5"/>',
    yellow: '<path d="M6 18c0-7 5-12 12-12 0 7-5 12-12 12z"/><path d="M6 18l6-6"/>',
    blue: '<circle cx="12" cy="12" r="7"/><path d="M12 8.5V12l2.5 1.6"/>',
    green: '<path d="M6 12.5l4 4 8-9"/>'
  };
  const ICONS = {
    female: '<circle cx="12" cy="9" r="5"/><path d="M12 14v7M9 18h6"/>',
    male: '<circle cx="10" cy="14" r="5"/><path d="M13.5 10.5L20 4M15 4h5v5"/>'
  };
  // صفحه‌های اجتماعی در پانویس
  const SOCIAL = [
    { name: 'Instagram', fa: 'اینستاگرام', url: 'https://www.instagram.com/ali.alirezaie',
      icon: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.3" cy="6.7" r=".9" fill="currentColor" stroke="none"/>' },
    { name: 'LinkedIn', fa: 'لینکدین', url: 'https://www.linkedin.com/in/alialirezaei',
      icon: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10.5V16.5M8 7.6v.2M11.5 16.5v-6M11.5 13c0-1.6 1-2.6 2.4-2.6s2.1.9 2.1 2.6v3.5"/>' }
  ];
  /** پانویس: توصیه به مراجعه به پزشک و دکمه‌های صفحه‌های اجتماعی */
  function footerHtml(lang) {
    const T = UI[lang === 'en' ? 'en' : 'fa'];
    return `<p class="q2-foot-text"><span>${T.footAdvice}</span></p>
      <div class="q2-social">${SOCIAL.map(s => `<a href="${s.url}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true">${s.icon}</svg><span>${lang === 'en' ? s.name : s.fa}</span></a>`).join('')}</div>`;
  }
  const CHECK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7"/></svg>';
  const ARROW_NEXT = '<svg class="q2-arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M13 8H3M7 4L3 8l4 4"/></svg>';
  const ARROW_BACK = '<svg class="q2-arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4"/></svg>';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function getJSON(url) { return fetch(url, { credentials: 'same-origin' }).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }); }
  function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
  function bmiTone(b) { return b < 18.5 ? 'blue' : b < 25 ? 'green' : b < 30 ? 'yellow' : b < 35 ? 'orange' : 'red'; }
  function enUrl(url) { return url.replace(/([^\/]+)$/, 'en/$1'); }
  /** عدد نوشته‌شده (با رقم فارسی یا لاتین) یا null */
  function parseNum(v) {
    const t = E.toEn(String(v == null ? '' : v)).replace(/[٫,]/g, '.').trim();
    const x = parseFloat(t);
    return t === '' || !isFinite(x) ? null : x;
  }
  function decimals(step) { const s = String(step); return s.indexOf('.') === -1 ? 0 : s.length - s.indexOf('.') - 1; }

  // ---------- محافظت از محتوا ----------
  // متن قابل انتخاب و کپی نیست، منوی کلیک راست و کشیدن متن بسته است، چاپ و ذخیره صفحه پنهان می‌شود و
  // با رفتن از صفحه یا برنامه، محتوا محو می‌شود. جلوگیری کامل از اسکرین‌شات در مرورگر ممکن نیست.
  function isField(t) { return !!(t && t.closest && t.closest('input, textarea, select, [contenteditable="true"]')); }
  function block(e) { if (!isField(e.target)) e.preventDefault(); }
  let guardOn = false;
  function guardKeys() {
    if (guardOn) return;
    guardOn = true;
    global.document.addEventListener('keydown', e => {
      const k = (e.key || '').toLowerCase();
      if ((e.ctrlKey || e.metaKey) && ['c', 'x', 'p', 's', 'u'].indexOf(k) !== -1 && !isField(e.target)) e.preventDefault();
    });
    global.document.addEventListener('visibilitychange', () => {
      global.document.documentElement.classList.toggle('q2-veiled', global.document.hidden);
    });
  }
  /** opts.lang: زبان پیام جایگزین هنگام چاپ ('fa' یا 'en') */
  function protect(el, opts) {
    opts = opts || {};
    const T = UI[opts.lang === 'en' ? 'en' : 'fa'];
    if (!el._q2guard) {
      el._q2guard = true;
      el.classList.add('q2-protect');
      ['copy', 'cut', 'contextmenu', 'dragstart', 'selectstart'].forEach(ev => el.addEventListener(ev, block));
      guardKeys();
    }
    el.setAttribute('data-print-msg', T.printMsg);
  }

  // ---------- هشدار پزشکی (پاپ‌آپ) ----------
  // پیش از شروع آزمون نشان داده می‌شود و تا تأیید نشود بسته نمی‌شود؛ در هر نشست یک بار.
  const DISCLAIMER_KEY = 'glp1_disclaimer_ok';
  let disclaimerOk = false, disclaimerOpen = null;
  try { disclaimerOk = global.sessionStorage.getItem(DISCLAIMER_KEY) === '1'; } catch (e) { /* ذخیره‌سازی در دسترس نیست */ }

  /** opts: lang، dark، force، onLang (اگر باشد، دکمه تعویض زبان در خود پنجره نشان داده می‌شود) */
  function disclaimer(opts) {
    opts = opts || {};
    if (disclaimerOk && !opts.force) return Promise.resolve();
    if (disclaimerOpen) return disclaimerOpen;
    let lang = opts.lang === 'en' ? 'en' : 'fa';
    disclaimerOpen = new Promise(resolve => {
      const prevFocus = global.document.activeElement;
      const wrap = global.document.createElement('div');
      wrap.className = 'q2-modal-wrap';
      let checked = false;
      const render = () => {
        const T = UI[lang];
        wrap.innerHTML = `
        <div class="q2 q2-modal${opts.dark ? ' q2-dark' : ''}" dir="${lang === 'en' ? 'ltr' : 'rtl'}" lang="${lang}" role="alertdialog" aria-modal="true" aria-labelledby="q2-dis-h" aria-describedby="q2-dis-b">
          <div class="q2-modal-top"><div class="q2-modal-badge" aria-hidden="true">!</div>
            ${typeof opts.onLang === 'function' ? `<button type="button" class="q2-modal-lang" data-act="lang" lang="${lang === 'en' ? 'fa' : 'en'}">${lang === 'en' ? 'فارسی' : 'English'}</button>` : ''}</div>
          <h2 class="q2-title" id="q2-dis-h">${T.dTitle}</h2>
          <div id="q2-dis-b">
            <p class="q2-modal-lead">${T.dLead}</p>
            <ul class="q2-list">${T.dList.map(t => `<li>${t}</li>`).join('')}</ul>
          </div>
          <label class="q2-opt${checked ? ' is-on' : ''}" for="q2-dis-ok"><input type="checkbox" id="q2-dis-ok"${checked ? ' checked' : ''}><span class="q2-mark is-box" aria-hidden="true">${CHECK}</span><span>${T.dCheck}</span></label>
          <div class="q2-modal-actions"><button type="button" class="q2-btn" data-act="accept"${checked ? '' : ' disabled'}>${T.dAccept}</button></div>
        </div>`;
        protect(wrap.querySelector('.q2-modal'), { lang: lang });
      };
      render();
      global.document.body.appendChild(wrap);
      wrap.addEventListener('change', e => {
        if (e.target.id !== 'q2-dis-ok') return;
        checked = e.target.checked;
        wrap.querySelector('[data-act=accept]').disabled = !checked;
        e.target.closest('label').classList.toggle('is-on', checked);
      });
      wrap.addEventListener('click', e => {
        const b = e.target.closest('[data-act]');
        if (!b) return;
        if (b.dataset.act === 'lang') {
          lang = lang === 'en' ? 'fa' : 'en';
          render();
          opts.onLang(lang);
          wrap.querySelector('[data-act=lang]').focus({ preventScroll: true });
          return;
        }
        if (b.dataset.act !== 'accept' || b.disabled) return;
        disclaimerOk = true;
        try { global.sessionStorage.setItem(DISCLAIMER_KEY, '1'); } catch (err) { /* ذخیره‌سازی در دسترس نیست */ }
        wrap.classList.add('is-closing');
        setTimeout(() => wrap.remove(), 260);
        disclaimerOpen = null;
        if (prevFocus && prevFocus.focus) try { prevFocus.focus({ preventScroll: true }); } catch (err) { /* عنصر قبلی دیگر نیست */ }
        resolve();
      });
      // فوکوس داخل پنجره می‌ماند
      wrap.addEventListener('keydown', e => {
        if (e.key !== 'Tab') return;
        const items = Array.from(wrap.querySelectorAll('button, input')).filter(x => !x.disabled);
        const i = items.indexOf(global.document.activeElement);
        e.preventDefault();
        items[(i + (e.shiftKey ? items.length - 1 : 1) + items.length) % items.length].focus();
      });
      global.requestAnimationFrame(() => { wrap.classList.add('is-open'); wrap.querySelector('#q2-dis-ok').focus({ preventScroll: true }); });
    });
    return disclaimerOpen;
  }

  function Quiz(root, opts) {
    this.root = root;
    this.opts = Object.assign({ config: {}, mock: false, lang: 'fa' }, opts);
    this.lang = this.opts.lang === 'en' ? 'en' : 'fa';
    this.data = {};
    this.answers = { version: 2 };
    this.history = [];
    this.busy = false;
    this.lastPct = 0;
    this.view = 'loading';
    this.ynIdx = 0;
    this.labsOpen = false;
    root.classList.add('q2');
    if (this.opts.dark) root.classList.add('q2-dark');
    this.applyLang();
  }

  Quiz.prototype.t = function (key, vars) {
    const s = UI[this.lang][key];
    return vars ? E.tpl(s, vars) : s;
  };
  /** عدد با رقم‌های زبان فعلی */
  Quiz.prototype.n = function (x) { return this.lang === 'fa' ? E.fa(x) : String(x); };
  Quiz.prototype.applyLang = function () {
    this.root.setAttribute('dir', this.lang === 'en' ? 'ltr' : 'rtl');
    this.root.setAttribute('lang', this.lang);
    if (this.opts.protect !== false) protect(this.root, { lang: this.lang });
  };
  Quiz.prototype.load = function (lang) {
    if (this.data[lang]) return Promise.resolve(this.data[lang]);
    const o = this.opts;
    const qu = lang === 'en' ? (o.quizUrlEn || enUrl(o.quizUrl)) : o.quizUrl;
    const lu = lang === 'en' ? (o.lessonsUrlEn || enUrl(o.lessonsUrl)) : o.lessonsUrl;
    return Promise.all([getJSON(qu), getJSON(lu)]).then(([quiz, lessons]) => (this.data[lang] = { quiz, lessons }));
  };
  Quiz.prototype.use = function (lang) { this.quiz = this.data[lang].quiz; this.lessons = this.data[lang].lessons; };

  Quiz.prototype.start = function () {
    const q = new URLSearchParams(global.location.search);
    return Promise.all([this.load(this.lang), disclaimer({ dark: this.opts.dark, lang: this.lang })]).then(() => {
      this.use(this.lang);
      if (q.get('view_result') && q.get('t') && this.opts.resultEndpoint) return this.loadResult(q.get('t'));
      this.history = [0];
      this.renderStep('fwd');
    }).catch(() => { this.root.innerHTML = `<div class="q2-card">${this.t('loadError')}</div>`; });
  };

  /** تعویض زبان: پاسخ‌ها و جای کاربر حفظ می‌شود؛ گزارش با داده زبان تازه دوباره ساخته می‌شود. */
  Quiz.prototype.setLang = function (lang) {
    lang = lang === 'en' ? 'en' : 'fa';
    if (lang === this.lang) return Promise.resolve();
    return this.load(lang).then(() => {
      this.lang = lang;
      this.use(lang);
      this.applyLang();
      if (this.view === 'result' && this.lastData) {
        const body = this.lastBody || this.lastData.answers;
        if (body) this.lastData = Object.assign({}, this.lastData, { result: E.evaluate(body, this.quiz, this.lessons, this.cfg()) });
        this.renderResult(this.lastData, true);
      } else if (this.view === 'step') this.renderStep('none');
    });
  };

  // ---------- وضعیت ----------
  Quiz.prototype.norm = function () { const n = E.normalize(this.answers); n.__normalized = true; return n; };
  Quiz.prototype.cfg = function () { return Object.assign({}, E.DEFAULT_CONFIG, this.opts.config); };
  Quiz.prototype.isVisible = function (i) { return E.visible(this.quiz.steps[i], this.norm(), this.cfg()); };
  Quiz.prototype.current = function () { return this.quiz.steps[this.history[this.history.length - 1]]; };
  Quiz.prototype.visibleCount = function () { return this.quiz.steps.filter((s, i) => this.isVisible(i)).length; };
  Quiz.prototype.nextIndex = function () {
    let i = this.history[this.history.length - 1] + 1;
    while (i < this.quiz.steps.length && !this.isVisible(i)) i++;
    return i;
  };
  Quiz.prototype.isLast = function () { return this.nextIndex() >= this.quiz.steps.length; };

  /** فقط پاسخ گام‌های قابل‌مشاهده ارسال می‌شود تا پاسخ کهنه (مثلاً بارداری پس از تغییر جنسیت) نماند. */
  Quiz.prototype.payload = function () {
    const out = { version: 2, lang: this.lang };
    this.quiz.steps.forEach((s, i) => {
      if (!this.isVisible(i)) return;
      const keys = s.fields ? s.fields.map(f => f.name) : [s.key];
      keys.forEach(k => { if (this.answers[k] !== undefined) out[k] = this.answers[k]; });
    });
    return out;
  };

  /** پانویس ثابت زیر آزمون (توصیه به مراجعه به پزشک و صفحه‌های اجتماعی). opts.footer = false آن را پنهان می‌کند. */
  Quiz.prototype.foot = function () {
    if (this.opts.footer === false) return;
    let el = this.root.querySelector(':scope > .q2-foot');
    if (!el) { el = global.document.createElement('div'); el.className = 'q2-foot'; }
    el.innerHTML = footerHtml(this.lang);
    this.root.appendChild(el);
  };

  Quiz.prototype.scrollTop = function () {
    if (this.root.getBoundingClientRect().top < 0) this.root.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' });
  };

  // ---------- ساخت گام ----------
  Quiz.prototype.renderStep = function (dir) {
    this.view = 'step';
    const step = this.current();
    const idx = this.history.length, total = this.visibleCount();
    const pct = Math.min(100, Math.round(idx / total * 100));
    if (step.type === 'yesno' && dir !== 'none') {
      const ms = this.answers.mental_screen || {};
      const open = step.items.findIndex(it => !ms[it.v]);
      this.ynIdx = open === -1 ? (dir === 'back' ? step.items.length - 1 : 0) : open;
    }
    let body = '';
    if (step.type === 'number') body = step.ui === 'reveal' && !this.labsOpen && !this.hasAny(step) ? this.revealHtml() : this.fieldsHtml(step);
    else if (step.type === 'radio') body = step.ui === 'scale' ? this.scaleHtml(step) : this.optionsHtml(step);
    else if (step.type === 'checkbox') body = this.chipsHtml(step);
    else if (step.type === 'yesno') body = `<div class="q2-stack">${this.stackHtml(step, 'none')}</div>`;

    this.root.innerHTML =
      `<div class="q2-shell">
        <div class="q2-head">
          <span class="q2-chip">${this.t('step', { n: this.n(idx), t: this.n(total) })}</span>
          ${step.section ? `<span class="q2-section">${esc(step.section)}</span>` : ''}
        </div>
        <div class="q2-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="${this.t('progress')}"><i style="width:${this.lastPct}%"></i></div>
        <div class="q2-step q2-in-${dir || 'none'}">
          <h2 class="q2-title" tabindex="-1">${esc(step.title)}</h2>
          ${step.subtitle ? `<p class="q2-sub">${esc(step.subtitle)}</p>` : ''}
          <form class="q2-form" novalidate>${body}<div class="q2-err" data-err="${esc(step.key)}" role="alert"></div></form>
        </div>
        <div class="q2-nav">
          <button type="button" class="q2-btn ghost" data-act="prev" ${this.history.length < 2 ? 'disabled' : ''}>${ARROW_BACK}<span>${this.t('back')}</span></button>
          <button type="button" class="q2-btn" data-act="next"><span>${this.isLast() ? this.t('report') : this.t('next')}</span>${ARROW_NEXT}</button>
        </div>
      </div>`;
    const bar = this.root.querySelector('.q2-progress > i');
    global.requestAnimationFrame(() => global.requestAnimationFrame(() => { bar.style.width = pct + '%'; }));
    this.lastPct = pct;
    this.foot();
    this.bindStep(step);
  };

  Quiz.prototype.hasAny = function (step) {
    return step.fields.some(f => this.answers[f.name] !== undefined && this.answers[f.name] !== '');
  };

  /** گام اختیاری (آزمایش‌ها): اول می‌پرسد آزمایش دارید یا نه */
  Quiz.prototype.revealHtml = function () {
    return `<div class="q2-options is-tiles q2-reveal">
      <button type="button" class="q2-opt" data-reveal="open" style="--i:0"><span><b>${this.t('labsHave')}</b><small>${this.t('labsHaveSub')}</small></span></button>
      <button type="button" class="q2-opt" data-reveal="skip" style="--i:1"><span><b>${this.t('labsSkip')}</b><small>${this.t('labsSkipSub')}</small></span></button>
    </div>`;
  };

  Quiz.prototype.fieldsHtml = function (step) {
    const html = step.fields.map((f, i) => {
      const v = this.answers[f.name];
      const has = v !== undefined && v !== '';
      const tag = f.optional ? `<span class="q2-tag">${this.t('optional')}</span>` : '';
      if (!f.slider) {
        return `<div class="q2-field" style="--i:${i}">
          <label for="q2-${f.name}">${esc(f.label)} ${tag}</label>
          <div class="q2-input"><input id="q2-${f.name}" name="${f.name}" type="text" inputmode="decimal" autocomplete="off"
            placeholder="${esc(f.placeholder || '')}" value="${esc(has ? v : '')}">${f.unit ? `<span>${esc(f.unit)}</span>` : ''}</div>
          ${f.hint ? `<div class="q2-hint">${esc(f.hint)}</div>` : ''}
          <div class="q2-err" data-err="${f.name}"></div></div>`;
      }
      const [lo, hi, start] = f.slider;
      const num = has ? parseNum(v) : null;
      const pos = num === null ? start : Math.max(lo, Math.min(hi, num));
      return `<div class="q2-dial${has ? '' : ' is-unset'}" data-name="${f.name}" style="--i:${i}">
        <div class="q2-dial-head"><label for="q2-${f.name}">${esc(f.label)} ${tag}</label>
          ${f.optional ? `<button type="button" class="q2-link" data-clear="${f.name}"${has ? '' : ' hidden'}>${this.t('clear')}</button>` : ''}</div>
        <div class="q2-dial-row">
          <button type="button" class="q2-stepper" data-d="-1" aria-label="${this.t('less')}"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10"/></svg></button>
          <div class="q2-dial-val"><input id="q2-${f.name}" name="${f.name}" type="text" inputmode="decimal" autocomplete="off" placeholder="—" value="${esc(has ? v : '')}"><span>${esc(f.unit || '')}</span></div>
          <button type="button" class="q2-stepper" data-d="1" aria-label="${this.t('more')}"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M8 3v10"/></svg></button>
        </div>
        <input type="range" class="q2-range" min="${lo}" max="${hi}" step="${f.step || 1}" value="${pos}" aria-label="${esc(f.label)}" tabindex="-1" style="--p:${((pos - lo) / (hi - lo) * 100).toFixed(1)}%">
        <div class="q2-range-ends"><span>${this.n(lo)}</span><span class="q2-unset-hint">${this.t('unset')}</span><span>${this.n(hi)}</span></div>
        ${f.hint ? `<div class="q2-hint">${esc(f.hint)}</div>` : ''}
        <div class="q2-err" data-err="${f.name}"></div></div>`;
    }).join('');
    const ticks = [18.5, 25, 30, 35, 40].map(t => `<span style="inset-inline-start:${((t - 15) / 30 * 100).toFixed(1)}%">${this.n(t)}</span>`).join('');
    const bmi = step.liveBmi ? `<div class="q2-bmi" aria-live="polite">
        <div class="q2-bmi-top"><span>${this.t('bmi')}</span> <b class="q2-bmi-val"></b> <em class="q2-bmi-cat"></em></div>
        <div class="q2-bmi-scale"><i class="q2-bmi-pin"></i></div>
        <div class="q2-bmi-ticks">${ticks}</div></div>` : '';
    return `<div class="q2-fields${step.fields.some(f => f.slider) ? ' is-dials' : ''}">${html}</div>${bmi}`;
  };

  Quiz.prototype.optionsHtml = function (step) {
    const n = this.norm(), cfg = this.cfg();
    const cur = this.answers[step.key];
    const list = step.options.filter(o => E.visible(o, n, cfg));
    const tiles = list.length <= 4 && list.every(o => !o.d && o.t.length <= 14);
    const opts = list.map((o, i) => {
      const on = cur === o.v;
      const icon = o.icon && ICONS[o.icon] ? `<svg class="q2-icon" viewBox="0 0 24 24" aria-hidden="true">${ICONS[o.icon]}</svg>` : '';
      return `<label class="q2-opt${on ? ' is-on' : ''}${icon ? ' has-icon' : ''}" style="--i:${i}"><input type="radio" name="${step.key}" value="${esc(o.v)}" ${on ? 'checked' : ''}>
        ${icon || '<span class="q2-mark" aria-hidden="true"></span>'}
        <span><b>${esc(o.t)}</b>${o.d ? `<small>${esc(o.d)}</small>` : ''}</span></label>`;
    }).join('');
    return `<div class="q2-options${tiles ? ' is-tiles' : ''}" role="radiogroup" aria-label="${esc(step.title)}">${opts}</div>`;
  };

  /** گزینه‌های مرتب روی یک مقیاس: انتخاب، خط را تا همان نقطه پر می‌کند */
  Quiz.prototype.scaleHtml = function (step) {
    const cur = this.answers[step.key];
    const sel = step.options.findIndex(o => o.v === cur);
    const stops = step.options.map((o, i) => `<label class="q2-stop${i === sel ? ' is-on' : ''}${sel !== -1 && i < sel ? ' is-past' : ''}">
        <input type="radio" name="${step.key}" value="${esc(o.v)}" ${i === sel ? 'checked' : ''}><span class="q2-dot" aria-hidden="true"></span><b>${esc(o.t)}</b></label>`).join('');
    const desc = sel !== -1 && step.options[sel].d ? esc(step.options[sel].d) : '';
    return `<div class="q2-scale" role="radiogroup" aria-label="${esc(step.title)}" style="--n:${step.options.length};--sel:${Math.max(0, sel)}" data-sel="${sel}">
        <div class="q2-scale-track" aria-hidden="true"><i></i></div>${stops}</div>
      <p class="q2-scale-desc" aria-live="polite">${desc}</p>`;
  };

  /** چندگزینه‌ای: برچسب‌های قابل لمس و دکمه جدای «هیچ‌کدام» */
  Quiz.prototype.chipsHtml = function (step) {
    const n = this.norm(), cfg = this.cfg();
    const cur = this.answers[step.key] || [];
    const ex = step.exclusive;
    const list = step.options.filter(o => E.visible(o, n, cfg));
    const chips = list.filter(o => o.v !== ex).map((o, i) => {
      const on = cur.indexOf(o.v) !== -1;
      return `<label class="q2-chipopt${on ? ' is-on' : ''}" style="--i:${i}"><input type="checkbox" name="${step.key}" value="${esc(o.v)}" ${on ? 'checked' : ''}>
        <span class="q2-mark is-box" aria-hidden="true">${CHECK}</span><span><b>${esc(o.t)}</b>${o.d ? `<small>${esc(o.d)}</small>` : ''}</span></label>`;
    }).join('');
    const none = list.find(o => o.v === ex);
    const noneOn = none && cur.indexOf(ex) !== -1;
    return `<p class="q2-chips-hint">${this.t('chipsHint')}</p>
      <div class="q2-chips" role="group" aria-label="${esc(step.title)}">${chips}</div>
      ${none ? `<label class="q2-none${noneOn ? ' is-on' : ''}"><input type="checkbox" name="${step.key}" value="${esc(ex)}" ${noneOn ? 'checked' : ''}>
        <span class="q2-mark is-box" aria-hidden="true">${CHECK}</span><b>${this.t('none')}</b></label>` : ''}`;
  };

  /** پرسش‌های بله/خیر یکی‌یکی، با نقطه‌هایی که پرسش‌های پاسخ‌داده را نشان می‌دهند */
  Quiz.prototype.stackHtml = function (step, dir) {
    const ms = this.answers.mental_screen || {};
    const i = this.ynIdx, it = step.items[i], v = ms[it.v];
    const dots = step.items.map((x, j) => `<button type="button" class="q2-dotbtn${ms[x.v] ? ' is-done' : ''}${j === i ? ' is-cur' : ''}" data-go="${j}"
        aria-label="${this.t('goTo', { n: this.n(j + 1) })}"${!ms[x.v] && j > i && step.items.slice(0, j).some(y => !ms[y.v]) ? ' disabled' : ''}></button>`).join('');
    return `<div class="q2-stack-meta"><span>${this.t('statement', { n: this.n(i + 1), t: this.n(step.items.length) })}</span><div class="q2-dots">${dots}</div></div>
      <div class="q2-stack-card q2-in-${dir}" aria-live="polite">
        <p class="q2-stack-q" id="q2-yn-q">${esc(it.t)}</p>
        <div class="q2-yn-big" role="radiogroup" aria-labelledby="q2-yn-q">
          <button type="button" role="radio" aria-checked="${v === 'yes'}" class="${v === 'yes' ? 'is-on' : ''}" data-yn="yes">${this.t('yes')}</button>
          <button type="button" role="radio" aria-checked="${v === 'no'}" class="${v === 'no' ? 'is-on' : ''}" data-yn="no">${this.t('no')}</button>
        </div>
      </div>`;
  };

  // ---------- رویدادها ----------
  Quiz.prototype.bindStep = function (step) {
    const root = this.root;
    root.querySelector('[data-act=next]').addEventListener('click', () => this.next());
    root.querySelector('[data-act=prev]').addEventListener('click', () => this.prev());
    root.querySelector('form').addEventListener('submit', e => { e.preventDefault(); this.next(); });

    root.querySelectorAll('[data-reveal]').forEach(b => b.addEventListener('click', () => {
      if (b.dataset.reveal === 'skip') { this.next(); return; }
      this.labsOpen = true; this.renderStep('none');
      const first = this.root.querySelector('.q2-input input');
      if (first) first.focus({ preventScroll: true });
    }));

    root.querySelectorAll('.q2-dial').forEach(d => this.bindDial(d, step));

    root.querySelectorAll('.q2-form input:not(.q2-range)').forEach(inp => {
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); this.next(); } });
      inp.addEventListener('input', () => {
        if (inp.type !== 'text') return;
        this.read(step); this.clearErrors();
        const dial = inp.closest('.q2-dial');
        if (dial) this.syncDial(dial, false);
        if (step.liveBmi) this.updateBmi();
      });
      inp.addEventListener('change', () => {
        if (inp.type === 'text') return;
        if (step.type === 'checkbox' && inp.checked) {
          const ex = step.exclusive;
          root.querySelectorAll(`input[name="${step.key}"]`).forEach(o => {
            if (o !== inp && (inp.value === ex ? true : o.value === ex)) o.checked = false;
          });
        }
        this.read(step);
        root.querySelectorAll('label').forEach(l => { const i = l.querySelector('input'); if (i) l.classList.toggle('is-on', i.checked); });
        this.clearErrors();
        if (step.ui === 'scale') this.updateScale(step);
        if (step.type === 'checkbox' && inp.checked && inp.value === step.exclusive) setTimeout(() => this.next(), RM ? 0 : 320);
        if (step.autoAdvance && inp.type === 'radio') setTimeout(() => this.next(), RM ? 0 : (step.ui === 'scale' ? 520 : 300));
      });
    });

    if (step.type === 'yesno') this.bindStack(step);
    if (step.liveBmi) this.updateBmi();
  };

  /** نوار لغزان، دکمه‌های + و − و نوشتن مستقیم عدد، همه یک مقدار را عوض می‌کنند */
  Quiz.prototype.bindDial = function (dial, step) {
    const f = step.fields.find(x => x.name === dial.dataset.name);
    const input = dial.querySelector('.q2-dial-val input'), range = dial.querySelector('.q2-range');
    const dp = decimals(f.step || 1);
    const set = v => {
      v = Math.max(f.min, Math.min(f.max, Math.round(v / (f.step || 1)) * (f.step || 1)));
      input.value = this.n(Number(v.toFixed(dp)));
      this.read(step); this.clearErrors(); this.syncDial(dial, true);
      if (step.liveBmi) this.updateBmi();
    };
    range.addEventListener('input', () => set(Number(range.value)));
    dial.querySelectorAll('.q2-stepper').forEach(b => b.addEventListener('click', () => {
      const cur = parseNum(input.value);
      set(cur === null ? Number(range.value) : cur + Number(b.dataset.d) * (f.step || 1));
    }));
    const clear = dial.querySelector('[data-clear]');
    if (clear) clear.addEventListener('click', () => {
      input.value = ''; this.read(step); this.syncDial(dial, false);
      if (step.liveBmi) this.updateBmi();
    });
  };
  Quiz.prototype.syncDial = function (dial, fromControl) {
    const input = dial.querySelector('.q2-dial-val input'), range = dial.querySelector('.q2-range');
    const v = parseNum(input.value);
    const has = input.value.trim() !== '';
    dial.classList.toggle('is-unset', !has);
    const clear = dial.querySelector('[data-clear]');
    if (clear) clear.hidden = !has;
    if (has && v !== null) range.value = Math.max(Number(range.min), Math.min(Number(range.max), v));
    range.style.setProperty('--p', ((range.value - range.min) / (range.max - range.min) * 100).toFixed(1) + '%');
    if (fromControl) { dial.classList.remove('is-bump'); void dial.offsetWidth; dial.classList.add('is-bump'); }
  };

  Quiz.prototype.updateScale = function (step) {
    const sc = this.root.querySelector('.q2-scale');
    const sel = step.options.findIndex(o => o.v === this.answers[step.key]);
    sc.style.setProperty('--sel', Math.max(0, sel));
    sc.dataset.sel = sel;
    sc.querySelectorAll('.q2-stop').forEach((s, i) => s.classList.toggle('is-past', sel !== -1 && i < sel));
    this.root.querySelector('.q2-scale-desc').textContent = sel !== -1 && step.options[sel].d ? step.options[sel].d : '';
  };

  Quiz.prototype.bindStack = function (step) {
    const stack = this.root.querySelector('.q2-stack');
    stack.addEventListener('click', e => {
      const b = e.target.closest('[data-yn]'), d = e.target.closest('[data-go]');
      if (d && !d.disabled) { this.ynIdx = Number(d.dataset.go); this.redrawStack(step, 'none'); return; }
      if (!b) return;
      const ms = Object.assign({}, this.answers.mental_screen || {});
      ms[step.items[this.ynIdx].v] = b.dataset.yn;
      this.answers.mental_screen = ms;
      this.clearErrors();
      stack.querySelectorAll('[data-yn]').forEach(x => { x.classList.toggle('is-on', x === b); x.setAttribute('aria-checked', String(x === b)); });
      const open = step.items.findIndex(it => !ms[it.v]);
      setTimeout(() => {
        if (open === -1) { this.next(); return; }
        this.ynIdx = open > this.ynIdx ? open : Math.min(step.items.length - 1, this.ynIdx + 1);
        this.redrawStack(step, 'fwd');
      }, RM ? 0 : 260);
    });
  };
  Quiz.prototype.redrawStack = function (step, dir) {
    const stack = this.root.querySelector('.q2-stack');
    if (!stack) return;
    stack.innerHTML = this.stackHtml(step, dir);
    const first = stack.querySelector('[data-yn]');
    if (first) first.focus({ preventScroll: true });
  };

  Quiz.prototype.read = function (step) {
    const root = this.root;
    if (step.type === 'number') {
      step.fields.forEach(f => {
        const el = root.querySelector(`[name="${f.name}"]`);
        if (el) this.answers[f.name] = f.type === 'checkbox' ? el.checked : el.value.trim();
      });
    } else if (step.type === 'radio') {
      const el = root.querySelector(`input[name="${step.key}"]:checked`);
      this.answers[step.key] = el ? el.value : '';
    } else if (step.type === 'checkbox') {
      this.answers[step.key] = Array.from(root.querySelectorAll(`input[name="${step.key}"]:checked`)).map(i => i.value);
    }
    // بله/خیر هنگام کلیک مستقیم در answers نوشته می‌شود
  };

  Quiz.prototype.updateBmi = function () {
    const box = this.root.querySelector('.q2-bmi'), n = this.norm();
    if (!box) return;
    const show = n.bmi !== null && n.bmi >= 10 && n.bmi <= 90;
    box.classList.toggle('is-on', show);
    if (!show) return;
    const tone = bmiTone(n.bmi), cat = box.querySelector('.q2-bmi-cat');
    box.querySelector('.q2-bmi-val').textContent = this.n(n.bmi);
    cat.textContent = E.bmiCategory(n.bmi, this.quiz);
    cat.dataset.tone = tone;
    box.querySelector('.q2-bmi-pin').style.insetInlineStart = Math.max(0, Math.min(100, (n.bmi - 15) / 30 * 100)).toFixed(1) + '%';
  };

  Quiz.prototype.stepErrorKeys = function (step) {
    return step.fields ? step.fields.map(f => f.name) : [step.key];
  };
  Quiz.prototype.clearErrors = function () { this.root.querySelectorAll('.q2-err').forEach(e => { e.textContent = ''; }); };
  Quiz.prototype.showErrors = function (errs) {
    Object.keys(errs).forEach(k => {
      const el = this.root.querySelector(`[data-err="${k}"]`) || this.root.querySelector('.q2-form > .q2-err');
      if (el) el.textContent = errs[k];
    });
    const form = this.root.querySelector('.q2-form');
    if (form) { form.classList.remove('q2-shake'); void form.offsetWidth; form.classList.add('q2-shake'); }
  };

  Quiz.prototype.next = function () {
    if (this.busy || this.view !== 'step') return;
    const step = this.current();
    this.read(step);
    const all = E.validate(this.payload(), this.quiz, this.cfg());
    const errs = {};
    this.stepErrorKeys(step).forEach(k => { if (all[k]) errs[k] = all[k]; });
    if (Object.keys(errs).length) {
      // در گام اختیاری که هنوز باز نشده، خطای فیلد پنهان یعنی کاربر باید فیلدها را ببیند
      if (step.ui === 'reveal' && !this.root.querySelector('.q2-input')) { this.labsOpen = true; this.renderStep('none'); }
      this.showErrors(errs); return;
    }

    // منع مصرف قطعی: ادامه پرسش‌ها لازم نیست و گزارش همان‌جا ساخته می‌شود
    const reds = E.collectFlags(this.norm(), this.quiz).flags.filter(f => f.level === 'red');
    if (reds.length || this.isLast()) { this.submit(); return; }
    this.history.push(this.nextIndex());
    this.renderStep('fwd');
    this.scrollTop();
  };

  Quiz.prototype.prev = function () {
    if (this.history.length < 2 || this.busy) return;
    this.history.pop();
    this.renderStep('back');
  };

  // ---------- ارسال ----------
  /** صفحه «در حال تحلیل»: چهار مرحله یکی‌یکی تیک می‌خورند. */
  Quiz.prototype.showAnalyzing = function () {
    this.view = 'analyzing';
    this.root.innerHTML = `<div class="q2-shell q2-analyze" role="status" aria-live="polite">
        <div class="q2-orbit" aria-hidden="true"><i></i><i></i><i></i><b></b></div>
        <h2 class="q2-title">${this.t('analyzing')}</h2>
        <ul class="q2-checks">${this.t('analysis').map((t, i) => `<li style="--i:${i}"><span class="q2-mark is-box" aria-hidden="true">${CHECK}</span>${esc(t)}</li>`).join('')}</ul>
      </div>`;
    this.foot();
    this.scrollTop();
    if (RM) return Promise.resolve();
    const items = this.root.querySelectorAll('.q2-checks li');
    items.forEach((li, i) => setTimeout(() => li.classList.add('is-done'), 300 + i * 300));
    return wait(300 + items.length * 300 + 250);
  };

  Quiz.prototype.submit = function () {
    const body = this.payload();
    this.lastBody = body;
    const back = msg => { this.busy = false; this.renderStep('none'); this.showErrors({ [this.current().key]: msg }); };
    this.busy = true;
    const analysis = this.showAnalyzing();

    if (this.opts.mock) {
      const result = E.evaluate(body, this.quiz, this.lessons, this.cfg());
      analysis.then(() => { this.busy = false; this.renderResult({ result, created_at: new Date().toISOString(), mock: true }); });
      return;
    }
    const req = fetch(this.opts.endpoint, {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': this.opts.csrfToken || '' },
      body: JSON.stringify(body)
    }).then(r => r.json().then(j => ({ status: r.status, body: j })));
    Promise.all([req, analysis]).then(([res]) => {
      const d = res.body && res.body.data;
      if (res.status === 200 && res.body.success && d && d.result) {
        this.busy = false;
        if (d.result_url && global.history.replaceState) global.history.replaceState(null, '', d.result_url);
        this.renderResult(d);
        return;
      }
      if (res.body && res.body.errors) { this.busy = false; this.jumpToErrors(res.body.errors); return; }
      back((res.body && res.body.message) || this.t('serverError'));
    }).catch(() => back(this.t('netError')));
  };

  Quiz.prototype.jumpToErrors = function (errors) {
    const keys = Object.keys(errors);
    const idx = this.quiz.steps.findIndex(s => this.stepErrorKeys(s).some(k => keys.indexOf(k) !== -1));
    if (idx !== -1) this.history.push(idx);
    this.renderStep('back');
    this.showErrors(idx !== -1 ? errors : { [this.current().key]: this.t('checkAnswers') });
  };

  Quiz.prototype.loadResult = function (token) {
    return getJSON(this.opts.resultEndpoint + '?t=' + encodeURIComponent(token)).then(res => {
      if (res.success) this.renderResult(res.data);
      else this.root.innerHTML = `<div class="q2-card">${esc(res.message || this.t('notFound'))}</div>`;
    });
  };

  // ---------- نتیجه ----------
  Quiz.prototype.renderResult = function (data, quiet) {
    this.view = 'result';
    this.lastData = data;
    const r = data.result, tone = r.status, fmt = x => this.n(x);
    let n = 0;
    const list = items => items && items.length ? `<ul class="q2-list">${items.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : '';
    const card = (title, inner, cls) => inner ? `<section class="q2-card ${cls || ''}" style="--i:${n++}"><h3 class="q2-h">${title}</h3>${inner}</section>` : '';
    const score = Math.max(0, Math.min(100, r.ampoule_score));
    const C = 2 * Math.PI * 52;
    const lessonDb = {};
    (this.lessons.lessons || []).forEach(l => { lessonDb[l.id] = l; });
    const date = (() => {
      try { return new Intl.DateTimeFormat(this.lang === 'fa' ? 'fa-IR' : 'en-GB', { year: 'numeric', month: 'short', day: 'numeric' }).format(data.created_at ? new Date(data.created_at) : new Date()); }
      catch (e) { return ''; }
    })();

    this.root.innerHTML = `<div class="q2-result${quiet ? ' is-quiet' : ''}">
      <section class="q2-card" style="--i:${n++}">
        <div class="q2-meta"><b>${this.t('reportTitle')}</b><span>${esc(date)}</span></div>
        ${data.mock ? `<div class="q2-hint">${this.t('mock')}</div>` : ''}
      </section>
      <section class="q2-card q2-verdict q2-tone-${esc(tone)}" style="--i:${n++}">
        <span class="q2-badge" aria-hidden="true"><svg viewBox="0 0 24 24">${TONE_ICON[tone] || TONE_ICON.green}</svg></span>
        <div><h2>${esc(r.title)}</h2><p>${esc(r.summary)}</p></div>
      </section>
      <section class="q2-card q2-tone-${esc(tone)} q2-plain" style="--i:${n++}">
        <div class="q2-scorecard">
          <div class="q2-ring" role="img" aria-label="${this.t('scoreAria', { s: fmt(r.ampoule_score) })}">
            <svg viewBox="0 0 120 120" aria-hidden="true"><circle class="q2-ring-track" cx="60" cy="60" r="52"/>
              <circle class="q2-ring-val" cx="60" cy="60" r="52" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${C.toFixed(1)}"/></svg>
            <div class="q2-ring-num"><strong>${fmt(RM || quiet ? score : 0)}</strong><span>${this.t('outOf')}</span></div>
          </div>
          <div class="q2-score-body">
            <h3>${esc(r.ampoule_label)}</h3>
            <div class="q2-axis-labels"><span>${this.t('axis0')}</span><span>${this.t('axis100')}</span></div>
            <div class="q2-pills">
              <span class="q2-pill">${this.t('pillStatus', { s: this.t('status')[tone] || '' })}</span>
              ${r.indication && r.indication.bmi !== null ? `<span class="q2-pill">${this.t('pillBmi', { b: fmt(r.indication.bmi) })}</span>` : ''}
              <span class="q2-pill">${this.t('pillEoss', { e: fmt(r.eoss_stage) })}</span>
              ${r.route !== 'R' ? `<span class="q2-pill">${this.t('pillReady', { r: fmt(r.readiness) })}</span>` : ''}
            </div>
          </div>
        </div>
        <p class="q2-hint">${this.t('scoreHint')}</p>
      </section>
      ${card(this.t('hardStops'), list(r.hard_stops), 'q2-tone-red')}
      ${card(this.t('warnings'), list(r.warnings), 'q2-tone-orange')}
      ${card(this.t('doctor'), list(r.doctor_checklist))}
      ${card(this.t('info'), list(r.info))}
      ${card(this.t('positives'), list(r.positives))}
      ${card(this.t('steps', { n: fmt(r.next_steps.length) }), `<ol class="q2-steps">${r.next_steps.map(s =>
        `<li><div><b>${esc(s.title)}</b> <em>${esc(s.badge)}</em></div><div class="q2-hint">${esc(s.desc)}</div></li>`).join('')}</ol>`)}
      ${card(this.t('lessons'), r.lessons.map(l => this.lessonHtml(lessonDb[l.id] || l)).join(''))}
      <section class="q2-card q2-tone-orange" style="--i:${n++}"><b>${this.t('medical')}</b><p>${esc(r.medical_disclaimer)}</p></section>
      <div class="q2-actions" style="--i:${n++}">
        ${typeof this.opts.onReferences === 'function' ? `<button class="q2-btn ghost" data-act="refs">${this.t('refs')}</button>` : ''}
        <button class="q2-btn ghost" data-act="restart">${this.t('restart')}</button>
      </div></div>`;

    const refs = this.root.querySelector('[data-act=refs]');
    if (refs) refs.addEventListener('click', () => this.opts.onReferences());
    this.root.querySelector('[data-act=restart]').addEventListener('click', () => {
      this.answers = { version: 2 }; this.history = [0]; this.lastPct = 0; this.labsOpen = false; this.lastData = null; this.lastBody = null;
      if (global.history.replaceState) global.history.replaceState(null, '', global.location.pathname + global.location.hash);
      this.renderStep('fwd');
      this.scrollTop();
    });
    this.foot();
    this.animateScore(score, C, quiet);
    if (!quiet) this.scrollTop();
  };

  /** حلقه نمره پر می‌شود و عدد وسط آن از صفر بالا می‌رود. */
  Quiz.prototype.animateScore = function (score, C, quiet) {
    const ring = this.root.querySelector('.q2-ring-val'), num = this.root.querySelector('.q2-ring-num strong');
    const target = C * (1 - score / 100);
    if (RM || quiet) { ring.style.transition = 'none'; ring.style.strokeDashoffset = target; return; }
    global.requestAnimationFrame(() => global.requestAnimationFrame(() => { ring.style.strokeDashoffset = target; }));
    const t0 = global.performance.now() + 250, dur = 1300;
    const tick = now => {
      const p = Math.max(0, Math.min(1, (now - t0) / dur)), e = 1 - Math.pow(1 - p, 3);
      num.textContent = this.n(Math.round(score * e));
      if (p < 1 && num.isConnected) global.requestAnimationFrame(tick);
    };
    global.requestAnimationFrame(tick);
  };

  Quiz.prototype.lessonHtml = function (l) {
    const body = (l.sections || []).map(s => `<h4>${esc(s.h)}</h4><ul class="q2-list">${s.points.map(p => `<li>${esc(p)}</li>`).join('')}</ul>`).join('');
    return `<details class="q2-lesson"><summary>${esc(l.title)} <small>${this.t('minutes', { n: this.n(l.minutes || 1) })} · ${esc(l.summary)}</small></summary>
      <div class="q2-lesson-body">${body}</div></details>`;
  };

  global.Glp1QuizV2 = {
    mount: function (el, opts) { const q = new Quiz(el, opts); q.start(); return q; },
    /** نمایش هشدار پزشکی؛ با force: true حتی پس از تأیید قبلی هم باز می‌شود. lang: 'fa' یا 'en' */
    disclaimer: disclaimer,
    /** محافظت از هر بخش دیگر صفحه در برابر کپی و چاپ */
    protect: protect,
    /** HTML پانویس برای استفاده در بخش‌های دیگر صفحه */
    footerHtml: footerHtml,
    /** آیا هشدار پزشکی در این نشست تأیید شده است */
    accepted: function () { return disclaimerOk; }
  };
})(typeof window !== 'undefined' ? window : this);
