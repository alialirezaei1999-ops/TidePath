// اجرای تست‌های موتور JS: node tests/run.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const E = require(path.join(root, 'assets/js/glp1-engine.js'));
const T = JSON.parse(fs.readFileSync(path.join(__dirname, 'cases.json'), 'utf8'));
const load = (lang, f) => JSON.parse(fs.readFileSync(path.join(root, 'data', lang === 'en' ? 'en' : '', f), 'utf8'));

// هر مورد با داده فارسی و انگلیسی اجرا می‌شود؛ مسیر، نمره و پرچم‌ها نباید به زبان بستگی داشته باشد
let fail = 0;
for (const lang of ['fa', 'en']) {
const quiz = load(lang, 'quiz-v2.json'), lessons = load(lang, 'lessons.json');
console.log(`--- ${lang} ---`);
for (const c of T.cases) {
  const input = c.replace ? c.in : Object.assign({}, T.base, c.in);
  const r = E.evaluate(input, quiz, lessons, c.config);
  const errs = E.validate(input, quiz, c.config);
  const x = c.expect, bad = [];
  if (x.route && r.route !== x.route) bad.push(`route ${r.route}`);
  if (x.status && r.status !== x.status) bad.push(`status ${r.status}`);
  if (x.level && r.indication.level !== x.level) bad.push(`level ${r.indication.level}`);
  if (x.score && (r.ampoule_score < x.score[0] || r.ampoule_score > x.score[1])) bad.push(`score ${r.ampoule_score}`);
  if (x.hasFlag && !r.flags.some(f => f.id === x.hasFlag)) bad.push(`flags ${r.flags.map(f => f.id)}`);
  if ('paywall' in x && r.paywall !== x.paywall) bad.push(`paywall ${r.paywall}`);
  if ('errors' in x && Object.keys(errs).length !== x.errors) bad.push(`errors ${JSON.stringify(errs)}`);
  if (x.errorsAtLeast && Object.keys(errs).length < x.errorsAtLeast) bad.push(`errors ${Object.keys(errs).length}`);
  if (x.lessonFirst && (!r.lessons[0] || r.lessons[0].id !== x.lessonFirst)) bad.push(`lessons ${r.lessons.map(l => l.id)}`);
  if (x.checklist && r.doctor_checklist.length < x.checklist) bad.push('checklist');
  if ('eoss' in x && r.eoss_stage !== x.eoss) bad.push(`eoss ${r.eoss_stage}`);
  if (!r.lessons.length) bad.push('no lessons');
  console.log(`${bad.length ? 'FAIL' : 'ok  '} ${c.name} → ${r.route}/${r.status} ${r.ampoule_score} ${r.indication.level || '-'} درس:${r.lessons.length}` + (bad.length ? '  ✗ ' + bad.join(' | ') : ''));
  if (bad.length) fail++;
}
}
console.log(fail ? `${fail} مورد ناموفق` : 'همه موارد موفق');
process.exit(fail ? 1 : 0);
