/**
 * موتور ارزیابی GLP-1 — نسخه ۲ (آینه دقیق includes/Glp1Engine.php)
 * در مرورگر: نتیجه ایمنی فوری و اعتبارسنجی؛ در Node: اجرای تست‌ها.
 * هر تغییری در این فایل باید در نسخه PHP هم اعمال شود (tests/cases.json هر دو را می‌سنجد).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Glp1Engine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DEFAULT_CONFIG = { ethnic_adjust: false, ethnic_offset: 2.5, readiness_cut: 60 };
  const LEVEL_PTS = { I0: 0, I1: 10, I2: 30, I3: 70, I4: 80, I5: 100 };
  const FALLBACK_PTS = { lifestyle: 5, readiness: 12, access: 7, goal: 5, protein: 6, resistance: 3, prior_glp1: 10 };
  const NUM_KEYS = ['age', 'height', 'weight', 'waist', 'hba1c', 'fbs', 'egfr', 'tg'];
  const STR_KEYS = ['sex', 'pregnancy', 'mtc', 'allergy', 'ethnicity', 'weight_history', 'function', 'prior_glp1',
    'protein', 'resistance', 'lifestyle', 'readiness', 'access', 'goal', 'full_name', 'mobile'];
  const ARR_KEYS = ['comorbid', 'osa_screen', 'caution', 'meds', 'mental'];
  const LEGACY_KEYS = ['age', 'bmi', 'pregnancy', 'mtc', 'comorbid', 'caution', 'meds', 'lifestyle', 'readiness', 'goal'];
  const SCOFF = ['scoff1', 'scoff2', 'scoff3', 'scoff4', 'scoff5'];

  function toEn(s) {
    return String(s).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  }
  function fa(n) { return String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]).replace('.', '٫'); }
  /** عدد به رقم‌های زبان داده (strings.digits: fa یا latin) */
  function fmt(n, quiz) { return quiz && quiz.strings && quiz.strings.digits === 'latin' ? String(n) : fa(n); }
  /** جای {نام} را با مقدار پر می‌کند */
  function tpl(t, vars) { return String(t).replace(/\{(\w+)\}/g, (m, k) => (vars[k] === undefined ? '' : vars[k])); }
  function num(v) {
    if (v === null || v === undefined || v === '') return null;
    const n = parseFloat(toEn(v).replace(/[٫,]/g, '.'));
    return isFinite(n) ? n : null;
  }
  function str(v) { return v === null || v === undefined ? '' : String(v).trim(); }
  function arr(v) {
    if (v === null || v === undefined || v === '') return [];
    const a = (Array.isArray(v) ? v : [v]).map(String);
    return a.length > 1 ? a.filter(x => x !== 'none') : a;
  }
  function round(n, d) { const p = Math.pow(10, d); return Math.round(n * p) / p; }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  function normalizeMobile(m) {
    let s = toEn(m || '').replace(/[\s\-()]/g, '');
    if (s.startsWith('+98')) s = '0' + s.slice(3);
    else if (s.startsWith('0098')) s = '0' + s.slice(4);
    else if (s.startsWith('98') && s.length === 12) s = '0' + s.slice(2);
    else if (s.startsWith('9') && s.length === 10) s = '0' + s;
    return s;
  }

  function normalize(raw) {
    raw = raw || {};
    const a = {};
    NUM_KEYS.forEach(k => { a[k] = num(raw[k]); });
    STR_KEYS.forEach(k => { a[k] = str(raw[k]); });
    ARR_KEYS.forEach(k => { a[k] = arr(raw[k]); });
    a.mobile = normalizeMobile(a.mobile);
    a.mental_screen = {};
    const ms = raw.mental_screen;
    if (Array.isArray(ms)) ms.forEach(k => { a.mental_screen[String(k)] = 'yes'; });
    else if (ms && typeof ms === 'object') Object.keys(ms).forEach(k => {
      const v = ms[k];
      a.mental_screen[k] = (v === true || v === 1 || v === '1' || v === 'yes') ? 'yes' : 'no';
    });
    a.consent = raw.consent === true || raw.consent === 1 || raw.consent === '1' || raw.consent === 'on' || raw.consent === 'yes';
    a.bmi = (a.height && a.weight) ? round(a.weight / Math.pow(a.height / 100, 2), 1) : null;
    a.version = num(raw.version) === 2 ? 2 : 1;
    return a;
  }

  // ---------- شرط نمایش ----------
  function getVal(a, field, cfg) { return field.charAt(0) === '$' ? cfg[field.slice(1)] : a[field]; }
  function eq(x, v) { return x === v || (x !== null && x !== undefined && String(x) === String(v)); }
  function test(cond, a, cfg) {
    const x = getVal(a, cond[0], cfg), op = cond[1], v = cond[2];
    switch (op) {
      case '=': return eq(x, v);
      case '!=': return !eq(x, v);
      case '>': return x !== null && x !== '' && Number(x) > v;
      case '>=': return x !== null && x !== '' && Number(x) >= v;
      case '<': return x !== null && x !== '' && Number(x) < v;
      case '<=': return x !== null && x !== '' && Number(x) <= v;
      case 'in': return Array.isArray(v) && v.some(y => eq(x, y));
      case 'has': return Array.isArray(x) && x.indexOf(v) !== -1;
      case '!has': return !(Array.isArray(x) && x.indexOf(v) !== -1);
      default: return false;
    }
  }
  function visible(item, a, cfg) {
    return !item.showIf || item.showIf.every(c => test(c, a, cfg));
  }
  function stepOf(quiz, key) { return quiz.steps.find(s => s.key === key) || null; }
  function optionOf(quiz, key, value) {
    const s = stepOf(quiz, key);
    return s && s.options ? (s.options.find(o => o.v === value) || null) : null;
  }

  // ---------- پرچم‌ها ----------
  function collectFlags(a, quiz) {
    const flags = [], lessonIds = [], seen = {};
    const add = f => { if (f && !seen[f.id]) { seen[f.id] = 1; flags.push(f); } };
    quiz.steps.forEach(step => {
      if (!step.options) return;
      const vals = step.type === 'checkbox' ? a[step.key] || [] : (a[step.key] ? [a[step.key]] : []);
      vals.forEach(v => {
        const o = step.options.find(x => x.v === v);
        if (!o) return;
        if (o.flag) add(o.flag);
        (o.lessons || []).forEach(l => lessonIds.push(l));
      });
    });

    const F = quiz.strings.flags;
    if (a.age !== null && a.age < 12) add(F.under12);
    else if (a.age !== null && a.age < 18) add(F.teen);
    else if (a.age !== null && a.age >= 75) add(F.elderly);

    const yes = k => a.mental_screen[k] === 'yes';
    const scoff = SCOFF.filter(yes).length;
    const ed = scoff >= 2 || a.mental.indexOf('eating') !== -1;
    const dep = yes('phq1') || yes('phq2') || a.mental.indexOf('depression') !== -1;
    if (yes('harm')) add(F['self-harm']);
    if (ed && a.bmi !== null && a.bmi < 25) add(F['ed-normal-bmi']);
    else if (ed) add(F['eating-disorder']);
    if (dep) add(F.depression);

    const t2d = a.comorbid.indexOf('t2d') !== -1;
    const labDiabetes = (a.hba1c !== null && a.hba1c >= 6.5) || (a.fbs !== null && a.fbs >= 126);
    if (labDiabetes && !t2d) add(F['possible-diabetes']);
    if (a.egfr !== null && a.egfr < 30 && !seen.kidney && !seen.ckd) add(F['egfr-low']);

    const osaCount = a.osa_screen.filter(x => x !== 'none').length;
    if (osaCount >= 2) add(F['osa-suspect']);

    return { flags, lessonIds, ed, dep, osaSuspect: osaCount >= 2, labDiabetes };
  }

  // ---------- اندیکاسیون، مرحله، آمادگی ----------
  function bmiCategory(b, quiz) {
    const c = quiz.strings.bmiCategories;
    return c[b < 18.5 ? 0 : b < 25 ? 1 : b < 30 ? 2 : b < 35 ? 3 : b < 40 ? 4 : 5];
  }

  function indication(a, ctx, quiz, cfg) {
    const out = { level: null, pts: 0, bmi: a.bmi, bmiAdj: null, adjusted: false, signs: [], whtr: null, central: false };
    if (a.bmi === null) return out;
    const eth = optionOf(quiz, 'ethnicity', a.ethnicity);
    const offset = cfg.ethnic_adjust && eth && eth.adjust ? cfg.ethnic_offset : 0;
    out.adjusted = offset > 0;
    out.bmiAdj = round(a.bmi + offset, 1);

    const com = stepOf(quiz, 'comorbid');
    a.comorbid.forEach(v => {
      const o = com.options.find(x => x.v === v);
      if (o && o.sign) out.signs.push(o.s || o.t);
    });
    const SG = quiz.strings.signs;
    if (ctx.osaSuspect) out.signs.push(SG.osa);
    if ((num(a.function) || 0) >= 2) out.signs.push(SG.function);
    const hasPre = a.comorbid.indexOf('prediabetes') !== -1 || a.comorbid.indexOf('t2d') !== -1;
    const labPre = (a.hba1c !== null && a.hba1c >= 5.7) || (a.fbs !== null && a.fbs >= 100);
    if (labPre && !hasPre) out.signs.push(ctx.labDiabetes ? SG.labDiabetes : SG.labPrediabetes);
    if (a.tg !== null && a.tg >= 150 && a.comorbid.indexOf('dyslip') === -1) out.signs.push(SG.tg);

    const b = out.bmiAdj, n = out.signs.length;
    if (b < 25) out.level = 'I0';
    else if (b < 27) out.level = 'I1';
    else if (b < 30) out.level = n ? 'I3' : 'I2';
    else if (b >= 40 || (b >= 35 && n)) out.level = 'I5';
    else out.level = 'I4';
    out.pts = LEVEL_PTS[out.level];

    if (a.waist && a.height) {
      out.whtr = round(a.waist / a.height, 2);
      out.central = out.whtr >= 0.6 || (a.sex === 'male' && a.waist >= 102) || (a.sex === 'female' && a.waist >= 88);
    }
    return out;
  }

  function eossStage(a, ctx, quiz) {
    let s = 0;
    const com = stepOf(quiz, 'comorbid');
    a.comorbid.forEach(v => {
      const o = com.options.find(x => x.v === v);
      if (o && o.eoss) s = Math.max(s, o.eoss);
    });
    if (ctx.osaSuspect) s = Math.max(s, 1);
    if ((a.hba1c !== null && a.hba1c >= 5.7) || (a.fbs !== null && a.fbs >= 100)) s = Math.max(s, ctx.labDiabetes ? 2 : 1);
    if (ctx.ed || ctx.dep) s = Math.max(s, 1);
    const func = num(a.function) || 0;
    s = Math.max(s, func);
    if (s >= 3 && func === 3) s = 4;
    return s;
  }

  function readinessScore(a, quiz) {
    let total = 0;
    Object.keys(FALLBACK_PTS).forEach(k => {
      const o = optionOf(quiz, k, a[k]);
      total += o && typeof o.pts === 'number' ? o.pts : FALLBACK_PTS[k];
    });
    return clamp(total, 0, 100);
  }

  // ---------- درسنامه‌ها ----------
  function pickLessons(route, flags, optionLessons, lessonsDb) {
    const all = (lessonsDb && lessonsDb.lessons) || [];
    const max = (lessonsDb && lessonsDb.maxPerResult) || 7;
    const order = [];
    const push = id => { if (order.indexOf(id) === -1 && all.some(l => l.id === id)) order.push(id); };
    ['red', 'orange', 'info'].forEach(lv => flags.filter(f => f.level === lv).forEach(f => (f.lessons || []).forEach(push)));
    // در خطر آسیب به خود، فقط درس حمایتی نشان داده می‌شود
    if (!flags.some(f => f.id === 'self-harm')) {
      optionLessons.forEach(push);
      all.filter(l => l.routes.indexOf(route) !== -1)
        .sort((x, y) => x.priority - y.priority)
        .forEach(l => push(l.id));
    }
    return order.slice(0, max).map(id => {
      const l = all.find(x => x.id === id);
      return { id: l.id, title: l.title, summary: l.summary, minutes: l.minutes };
    });
  }

  // ---------- ارزیابی ----------
  function evaluate(raw, quiz, lessonsDb, config) {
    const cfg = Object.assign({}, DEFAULT_CONFIG, config || {});
    const a = raw && raw.__normalized ? raw : normalize(raw);
    const ctx = collectFlags(a, quiz);
    const flags = ctx.flags;
    const ind = indication(a, ctx, quiz, cfg);
    const stage = eossStage(a, ctx, quiz);
    const readiness = readinessScore(a, quiz);

    if (ind.level === 'I2' && ind.central) {
      flags.push(quiz.strings.flags.borderline);
    }
    const reds = flags.filter(f => f.level === 'red');
    const oranges = flags.filter(f => f.level === 'orange');
    const infos = flags.filter(f => f.level === 'info');

    let route, chosenNonDrug = false;
    if (reds.length) route = 'R';
    else if (!ind.level || ['I0', 'I1', 'I2'].indexOf(ind.level) !== -1) route = 'C';
    else if (a.readiness === 'no') { route = 'C'; chosenNonDrug = true; }
    else route = readiness >= cfg.readiness_cut ? 'E' : 'D';
    const doctor = route !== 'R' && oranges.length > 0;

    let score;
    if (route === 'R') score = 5;
    else {
      score = Math.round(0.5 * ind.pts + 0.2 * stage * 25 + 0.3 * readiness) - Math.min(15, 5 * oranges.length);
      score = route === 'C' ? clamp(score, 5, 45) : clamp(score, 55, 98);
    }

    const R = quiz.routes[route];
    const status = route === 'R' ? 'red' : (doctor ? quiz.doctorOverlay.status : R.status);
    const S = quiz.strings, SM = S.summary, PO = S.positives;
    const bmiTxt = ind.bmi !== null ? fmt(ind.bmi, quiz) : '';
    const cat = ind.bmi !== null ? bmiCategory(ind.bmi, quiz) : '';
    let summary;
    if (route === 'R') summary = reds.map(f => f.text).join(' ');
    else if (chosenNonDrug) summary = SM.nonDrug;
    else if (route === 'C' && ind.level === 'I2') summary = tpl(SM.borderline, { bmi: bmiTxt });
    else if (route === 'C') summary = ind.bmi !== null ? tpl(SM.notIndicated, { bmi: bmiTxt, cat: cat }) : R.subtitle;
    else {
      const signs = ind.signs.length ? tpl(SM.signs, { list: ind.signs.join(S.listSep) }) : '';
      summary = tpl(SM.indicated, { bmi: bmiTxt, signs: signs, readiness: fmt(readiness, quiz), tail: route === 'D' ? SM.tailPrepare : SM.tailReady });
    }

    const positives = [];
    if (ind.bmi !== null) positives.push(tpl(PO.bmi, { bmi: bmiTxt, cat: cat, adj: ind.adjusted ? tpl(PO.adjusted, { bmi: fmt(ind.bmiAdj, quiz) }) : '' }));
    if (ind.whtr !== null) positives.push(tpl(PO.whtr, { whtr: fmt(ind.whtr, quiz), good: ind.whtr < 0.5 ? PO.whtrGood : '' }));
    if (a.lifestyle === 'failed') positives.push(PO.lifestyle);
    if (a.protein === '3') positives.push(PO.protein);
    if (a.resistance === '2') positives.push(PO.resistance);
    if (a.access === 'yes') positives.push(PO.access);
    if (!reds.length && !oranges.length) positives.push(PO.clear);

    const steps = (doctor ? [quiz.doctorOverlay.step] : []).concat(R.steps)
      .map((s, i) => ({ step: i + 1, badge: s.badge, title: s.title, desc: s.desc }));
    const checklist = [];
    oranges.forEach(f => { if (f.doctor && checklist.indexOf(f.doctor) === -1) checklist.push(f.doctor); });

    return {
      version: 2,
      route: route,
      doctor_review: doctor,
      status: status,
      title: route !== 'R' && doctor ? R.title + quiz.doctorOverlay.suffix : R.title,
      subtitle: R.subtitle,
      summary: summary,
      ampoule_score: score,
      ampoule_label: R.label + (doctor ? quiz.doctorOverlay.suffix : ''),
      ampoule_tone: status,
      hard_stops: reds.map(f => f.text),
      warnings: oranges.map(f => f.text),
      info: infos.map(f => f.text),
      positives: positives,
      doctor_checklist: checklist,
      next_steps: steps,
      flags: flags.map(f => ({ id: f.id, level: f.level })),
      indication: { level: ind.level, bmi: ind.bmi, bmi_adj: ind.bmiAdj, adjusted: ind.adjusted, signs: ind.signs, whtr: ind.whtr, central: ind.central },
      eoss_stage: stage,
      readiness: readiness,
      components: { indication: ind.pts, clinical: stage * 25, readiness: readiness },
      lessons: pickLessons(route, flags, ctx.lessonIds, lessonsDb),
      paywall: false, // گزارش در همه مسیرها رایگان است
      medical_disclaimer: quiz.disclaimer
    };
  }

  // ---------- اعتبارسنجی ----------
  function validate(raw, quiz, config) {
    const cfg = Object.assign({}, DEFAULT_CONFIG, config || {});
    const a = raw && raw.__normalized ? raw : normalize(raw);
    const errors = {}, ER = quiz.strings.errors;
    const red = collectFlags(a, quiz).flags.some(f => f.level === 'red');
    const legacy = a.version !== 2;

    quiz.steps.forEach(step => {
      if (step.key === 'contact') return;
      if (legacy && LEGACY_KEYS.indexOf(step.key) === -1) return;
      if (!legacy && !visible(step, a, cfg)) return;
      const required = step.key === 'age' || (!red && !step.optionalStep);
      if (step.type === 'number') {
        step.fields.forEach(f => {
          const v = a[f.name];
          if (v === null) { if (required && !f.optional) errors[f.name] = tpl(ER.required, { label: f.label }); }
          else if (v < f.min || v > f.max) errors[f.name] = tpl(ER.range, { label: f.label, min: fmt(f.min, quiz), max: fmt(f.max, quiz) });
        });
      } else if (step.type === 'radio') {
        const v = a[step.key];
        if (!v) { if (required) errors[step.key] = ER.pickOne; }
        else if (!step.options.some(o => o.v === v) && !(step.key === 'pregnancy' && v === 'na')) errors[step.key] = ER.invalid;
      } else if (step.type === 'checkbox') {
        const v = a[step.key];
        if (!v.length) { if (required) errors[step.key] = ER.pickSome; }
        else if (v.some(x => !step.options.some(o => o.v === x))) errors[step.key] = ER.invalid;
      } else if (step.type === 'yesno') {
        const missing = step.items.some(it => !a.mental_screen[it.v]);
        if (missing && required && !(legacy && a.mental.length)) errors[step.key] = ER.answerAll;
      }
    });
    if (legacy && !a.mental.length && !Object.keys(a.mental_screen).length && !red) errors.mental = ER.pickOne;
    // ابزار رایگان و بی‌نام است: نام، موبایل و تأیید ذخیره دیگر لازم نیست
    return errors;
  }

  return {
    DEFAULT_CONFIG, normalize, normalizeMobile, toEn, fa, fmt, tpl, visible, test, collectFlags,
    indication, eossStage, readinessScore, bmiCategory, pickLessons, evaluate, validate
  };
});
