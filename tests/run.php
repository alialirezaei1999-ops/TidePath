<?php
// اجرای تست‌های موتور PHP روی هاست: php tests/run.php
// همان موارد tests/cases.json که tests/run.js اجرا می‌کند؛ خروجی دو موتور باید یکسان باشد.
require __DIR__ . '/../includes/Glp1Engine.php';

$root = dirname(__DIR__);
$T = json_decode(file_get_contents(__DIR__ . '/cases.json'), true);
$fail = 0;
// هر مورد با داده فارسی و انگلیسی اجرا می‌شود؛ مسیر، نمره و پرچم‌ها نباید به زبان بستگی داشته باشد
foreach (['fa' => '/data', 'en' => '/data/en'] as $lang => $dir) {
echo "--- $lang ---\n";
foreach ($T['cases'] as $c) {
    $input = !empty($c['replace']) ? $c['in'] : array_merge($T['base'], $c['in']);
    $engine = Glp1Engine::fromFiles($root . $dir, $c['config'] ?? []);
    $r = $engine->evaluate($input);
    $errs = $engine->validate($input);
    $x = $c['expect'];
    $bad = [];
    $flagIds = array_column($r['flags'], 'id');
    if (isset($x['route']) && $r['route'] !== $x['route']) $bad[] = "route {$r['route']}";
    if (isset($x['status']) && $r['status'] !== $x['status']) $bad[] = "status {$r['status']}";
    if (isset($x['level']) && $r['indication']['level'] !== $x['level']) $bad[] = "level {$r['indication']['level']}";
    if (isset($x['score']) && ($r['ampoule_score'] < $x['score'][0] || $r['ampoule_score'] > $x['score'][1])) $bad[] = "score {$r['ampoule_score']}";
    if (isset($x['hasFlag']) && !in_array($x['hasFlag'], $flagIds, true)) $bad[] = 'flags ' . implode(',', $flagIds);
    if (array_key_exists('paywall', $x) && $r['paywall'] !== $x['paywall']) $bad[] = 'paywall';
    if (array_key_exists('errors', $x) && count($errs) !== $x['errors']) $bad[] = 'errors ' . json_encode($errs, JSON_UNESCAPED_UNICODE);
    if (isset($x['errorsAtLeast']) && count($errs) < $x['errorsAtLeast']) $bad[] = 'errors ' . count($errs);
    if (isset($x['lessonFirst']) && (($r['lessons'][0]['id'] ?? '') !== $x['lessonFirst'])) $bad[] = 'lessons';
    if (isset($x['checklist']) && count($r['doctor_checklist']) < $x['checklist']) $bad[] = 'checklist';
    if (array_key_exists('eoss', $x) && $r['eoss_stage'] !== $x['eoss']) $bad[] = "eoss {$r['eoss_stage']}";
    if (!$r['lessons']) $bad[] = 'no lessons';
    printf("%s %s → %s/%s %d %s درس:%d%s\n", $bad ? 'FAIL' : 'ok  ', $c['name'], $r['route'], $r['status'],
        $r['ampoule_score'], $r['indication']['level'] ?? '-', count($r['lessons']), $bad ? '  ✗ ' . implode(' | ', $bad) : '');
    if ($bad) $fail++;
}
}
echo $fail ? "$fail مورد ناموفق\n" : "همه موارد موفق\n";
exit($fail ? 1 : 0);
