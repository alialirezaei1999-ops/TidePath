<?php
/**
 * موتور ارزیابی GLP-1 — نسخه ۲ (مرجع اصلی نتیجه؛ آینه assets/js/glp1-engine.js)
 * سازگار با PHP 7.4 به بالا. ورودی: آرایه پاسخ‌ها (همان JSON ارسالی فرانت).
 * هر تغییری در این فایل باید در نسخه JS هم اعمال شود (tests/cases.json هر دو را می‌سنجد).
 */
final class Glp1Engine
{
    const DEFAULT_CONFIG = ['ethnic_adjust' => false, 'ethnic_offset' => 2.5, 'readiness_cut' => 60];
    const LEVEL_PTS = ['I0' => 0, 'I1' => 10, 'I2' => 30, 'I3' => 70, 'I4' => 80, 'I5' => 100];
    const FALLBACK_PTS = ['lifestyle' => 5, 'readiness' => 12, 'access' => 7, 'goal' => 5, 'protein' => 6, 'resistance' => 3, 'prior_glp1' => 10];
    const NUM_KEYS = ['age', 'height', 'weight', 'waist', 'hba1c', 'fbs', 'egfr', 'tg'];
    const STR_KEYS = ['sex', 'pregnancy', 'mtc', 'allergy', 'ethnicity', 'weight_history', 'function', 'prior_glp1',
        'protein', 'resistance', 'lifestyle', 'readiness', 'access', 'goal', 'full_name', 'mobile'];
    const ARR_KEYS = ['comorbid', 'osa_screen', 'caution', 'meds', 'mental'];
    const LEGACY_KEYS = ['age', 'bmi', 'pregnancy', 'mtc', 'comorbid', 'caution', 'meds', 'lifestyle', 'readiness', 'goal'];
    const SCOFF = ['scoff1', 'scoff2', 'scoff3', 'scoff4', 'scoff5'];

    /** @var array */ private $quiz;
    /** @var array */ private $lessons;
    /** @var array */ private $cfg;

    public function __construct(array $quiz, array $lessons, array $config = [])
    {
        $this->quiz = $quiz;
        $this->lessons = $lessons;
        $this->cfg = array_merge(self::DEFAULT_CONFIG, $config);
    }

    public static function fromFiles(string $dataDir, array $config = []): self
    {
        $q = json_decode((string) file_get_contents($dataDir . '/quiz-v2.json'), true);
        $l = json_decode((string) file_get_contents($dataDir . '/lessons.json'), true);
        if (!is_array($q) || !is_array($l)) {
            throw new RuntimeException('quiz-v2.json یا lessons.json خوانده نشد.');
        }
        return new self($q, $l, $config);
    }

    // ---------- ابزارها ----------
    public static function toEn($s): string
    {
        return str_replace(
            ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹', '٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'],
            ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
            (string) $s
        );
    }

    public static function fa($n): string
    {
        $s = (string) $n;
        $s = preg_replace('/\./', '٫', $s, 1);
        return str_replace(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'], ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'], $s);
    }

    /** عدد به رقم‌های زبان داده (strings.digits: fa یا latin) */
    private function fmt($n): string
    {
        $t = is_float($n) ? self::numStr($n) : (string) $n;
        return ($this->quiz['strings']['digits'] ?? 'fa') === 'latin' ? $t : self::fa($t);
    }

    /** جای {نام} را با مقدار پر می‌کند */
    private static function tpl(string $t, array $vars): string
    {
        return preg_replace_callback('/\{(\w+)\}/u', function ($m) use ($vars) {
            return isset($vars[$m[1]]) ? (string) $vars[$m[1]] : '';
        }, $t);
    }

    private function S(string $key)
    {
        return $this->quiz['strings'][$key];
    }

    private static function num($v): ?float
    {
        if ($v === null || $v === '' || is_array($v)) {
            return null;
        }
        $s = str_replace(['٫', ','], '.', self::toEn($v));
        return is_numeric(trim($s)) ? (float) trim($s) : null;
    }

    private static function str($v): string
    {
        return ($v === null || is_array($v)) ? '' : trim((string) $v);
    }

    private static function arr($v): array
    {
        if ($v === null || $v === '') {
            return [];
        }
        $a = array_map('strval', is_array($v) ? array_values($v) : [$v]);
        return count($a) > 1 ? array_values(array_filter($a, function ($x) { return $x !== 'none'; })) : $a;
    }

    /** گرد کردن مثل Math.round در JS (نیمه‌ها به سمت بالا) */
    private static function jsRound(float $n, int $d = 0): float
    {
        $p = pow(10, $d);
        return floor($n * $p + 0.5) / $p;
    }

    /** عدد را مثل JS به متن تبدیل می‌کند (۲۹٫۰ ← «29»، ۲۹٫۴ ← «29.4») */
    private static function numStr(float $n): string
    {
        return $n == floor($n) ? (string) (int) $n : rtrim(rtrim(sprintf('%.2f', $n), '0'), '.');
    }

    private static function clamp($n, $lo, $hi)
    {
        return max($lo, min($hi, $n));
    }

    public static function normalizeMobile($m): string
    {
        $s = preg_replace('/[\s\-()]/u', '', self::toEn((string) $m));
        if (strpos($s, '+98') === 0) {
            $s = '0' . substr($s, 3);
        } elseif (strpos($s, '0098') === 0) {
            $s = '0' . substr($s, 4);
        } elseif (strpos($s, '98') === 0 && strlen($s) === 12) {
            $s = '0' . substr($s, 2);
        } elseif (strpos($s, '9') === 0 && strlen($s) === 10) {
            $s = '0' . $s;
        }
        return $s;
    }

    public static function normalize(array $raw): array
    {
        $a = [];
        foreach (self::NUM_KEYS as $k) {
            $a[$k] = self::num($raw[$k] ?? null);
        }
        foreach (self::STR_KEYS as $k) {
            $a[$k] = self::str($raw[$k] ?? null);
        }
        foreach (self::ARR_KEYS as $k) {
            $a[$k] = self::arr($raw[$k] ?? null);
        }
        $a['mobile'] = self::normalizeMobile($a['mobile']);
        $a['mental_screen'] = [];
        $ms = $raw['mental_screen'] ?? null;
        if (is_array($ms) && array_keys($ms) === range(0, count($ms) - 1)) {
            foreach ($ms as $k) {
                $a['mental_screen'][(string) $k] = 'yes';
            }
        } elseif (is_array($ms)) {
            foreach ($ms as $k => $v) {
                $a['mental_screen'][(string) $k] = ($v === true || $v === 1 || $v === '1' || $v === 'yes') ? 'yes' : 'no';
            }
        }
        $c = $raw['consent'] ?? null;
        $a['consent'] = $c === true || $c === 1 || $c === '1' || $c === 'on' || $c === 'yes';
        $a['bmi'] = ($a['height'] && $a['weight']) ? self::jsRound($a['weight'] / pow($a['height'] / 100, 2), 1) : null;
        $a['version'] = self::num($raw['version'] ?? null) == 2 ? 2 : 1;
        return $a;
    }

    // ---------- شرط نمایش ----------
    private static function eq($x, $v): bool
    {
        if ($x === $v) {
            return true;
        }
        if ($x === null || is_array($x) || is_array($v)) {
            return false;
        }
        $sx = is_bool($x) ? ($x ? 'true' : 'false') : (string) $x;
        $sv = is_bool($v) ? ($v ? 'true' : 'false') : (string) $v;
        return $sx === $sv;
    }

    public function test(array $cond, array $a): bool
    {
        [$field, $op, $v] = $cond;
        $x = $field[0] === '$' ? ($this->cfg[substr($field, 1)] ?? null) : ($a[$field] ?? null);
        $isNum = $x !== null && $x !== '' && !is_array($x);
        switch ($op) {
            case '=': return self::eq($x, $v);
            case '!=': return !self::eq($x, $v);
            case '>': return $isNum && (float) $x > $v;
            case '>=': return $isNum && (float) $x >= $v;
            case '<': return $isNum && (float) $x < $v;
            case '<=': return $isNum && (float) $x <= $v;
            case 'in':
                if (!is_array($v)) {
                    return false;
                }
                foreach ($v as $y) {
                    if (self::eq($x, $y)) {
                        return true;
                    }
                }
                return false;
            case 'has': return is_array($x) && in_array($v, $x, true);
            case '!has': return !(is_array($x) && in_array($v, $x, true));
        }
        return false;
    }

    public function visible(array $item, array $a): bool
    {
        if (empty($item['showIf'])) {
            return true;
        }
        foreach ($item['showIf'] as $c) {
            if (!$this->test($c, $a)) {
                return false;
            }
        }
        return true;
    }

    private function stepOf(string $key): ?array
    {
        foreach ($this->quiz['steps'] as $s) {
            if ($s['key'] === $key) {
                return $s;
            }
        }
        return null;
    }

    private function optionOf(string $key, $value): ?array
    {
        $s = $this->stepOf($key);
        if (!$s || empty($s['options'])) {
            return null;
        }
        foreach ($s['options'] as $o) {
            if ($o['v'] === $value) {
                return $o;
            }
        }
        return null;
    }

    // ---------- پرچم‌ها ----------
    public function collectFlags(array $a): array
    {
        $flags = [];
        $lessonIds = [];
        $seen = [];
        $add = function ($f) use (&$flags, &$seen) {
            if ($f && empty($seen[$f['id']])) {
                $seen[$f['id']] = 1;
                $flags[] = $f;
            }
        };
        foreach ($this->quiz['steps'] as $step) {
            if (empty($step['options'])) {
                continue;
            }
            if ($step['type'] === 'checkbox') {
                $vals = $a[$step['key']] ?? [];
            } else {
                $vals = (isset($a[$step['key']]) && $a[$step['key']] !== '') ? [$a[$step['key']]] : [];
            }
            foreach ($vals as $v) {
                foreach ($step['options'] as $o) {
                    if ($o['v'] !== $v) {
                        continue;
                    }
                    if (!empty($o['flag'])) {
                        $add($o['flag']);
                    }
                    foreach ($o['lessons'] ?? [] as $l) {
                        $lessonIds[] = $l;
                    }
                }
            }
        }

        $F = $this->S('flags');
        $age = $a['age'];
        if ($age !== null && $age < 12) {
            $add($F['under12']);
        } elseif ($age !== null && $age < 18) {
            $add($F['teen']);
        } elseif ($age !== null && $age >= 75) {
            $add($F['elderly']);
        }

        $ms = $a['mental_screen'];
        $yes = function ($k) use ($ms) { return ($ms[$k] ?? '') === 'yes'; };
        $scoff = count(array_filter(self::SCOFF, $yes));
        $ed = $scoff >= 2 || in_array('eating', $a['mental'], true);
        $dep = $yes('phq1') || $yes('phq2') || in_array('depression', $a['mental'], true);
        if ($yes('harm')) {
            $add($F['self-harm']);
        }
        if ($ed && $a['bmi'] !== null && $a['bmi'] < 25) {
            $add($F['ed-normal-bmi']);
        } elseif ($ed) {
            $add($F['eating-disorder']);
        }
        if ($dep) {
            $add($F['depression']);
        }

        $t2d = in_array('t2d', $a['comorbid'], true);
        $labDiabetes = ($a['hba1c'] !== null && $a['hba1c'] >= 6.5) || ($a['fbs'] !== null && $a['fbs'] >= 126);
        if ($labDiabetes && !$t2d) {
            $add($F['possible-diabetes']);
        }
        if ($a['egfr'] !== null && $a['egfr'] < 30 && empty($seen['kidney']) && empty($seen['ckd'])) {
            $add($F['egfr-low']);
        }

        $osaCount = count(array_filter($a['osa_screen'], function ($x) { return $x !== 'none'; }));
        if ($osaCount >= 2) {
            $add($F['osa-suspect']);
        }

        return ['flags' => $flags, 'lessonIds' => $lessonIds, 'ed' => $ed, 'dep' => $dep,
            'osaSuspect' => $osaCount >= 2, 'labDiabetes' => $labDiabetes];
    }

    // ---------- اندیکاسیون، مرحله، آمادگی ----------
    public function bmiCategory(float $b): string
    {
        $c = $this->S('bmiCategories');
        return $c[$b < 18.5 ? 0 : ($b < 25 ? 1 : ($b < 30 ? 2 : ($b < 35 ? 3 : ($b < 40 ? 4 : 5))))];
    }

    public function indication(array $a, array $ctx): array
    {
        $out = ['level' => null, 'pts' => 0, 'bmi' => $a['bmi'], 'bmiAdj' => null, 'adjusted' => false,
            'signs' => [], 'whtr' => null, 'central' => false];
        if ($a['bmi'] === null) {
            return $out;
        }
        $eth = $this->optionOf('ethnicity', $a['ethnicity']);
        $offset = ($this->cfg['ethnic_adjust'] && $eth && !empty($eth['adjust'])) ? (float) $this->cfg['ethnic_offset'] : 0.0;
        $out['adjusted'] = $offset > 0;
        $out['bmiAdj'] = self::jsRound($a['bmi'] + $offset, 1);

        $com = $this->stepOf('comorbid');
        foreach ($a['comorbid'] as $v) {
            foreach ($com['options'] as $o) {
                if ($o['v'] === $v && !empty($o['sign'])) {
                    $out['signs'][] = $o['s'] ?? $o['t'];
                }
            }
        }
        $SG = $this->S('signs');
        if ($ctx['osaSuspect']) {
            $out['signs'][] = $SG['osa'];
        }
        if ((self::num($a['function']) ?? 0) >= 2) {
            $out['signs'][] = $SG['function'];
        }
        $hasPre = in_array('prediabetes', $a['comorbid'], true) || in_array('t2d', $a['comorbid'], true);
        $labPre = ($a['hba1c'] !== null && $a['hba1c'] >= 5.7) || ($a['fbs'] !== null && $a['fbs'] >= 100);
        if ($labPre && !$hasPre) {
            $out['signs'][] = $ctx['labDiabetes'] ? $SG['labDiabetes'] : $SG['labPrediabetes'];
        }
        if ($a['tg'] !== null && $a['tg'] >= 150 && !in_array('dyslip', $a['comorbid'], true)) {
            $out['signs'][] = $SG['tg'];
        }

        $b = $out['bmiAdj'];
        $n = count($out['signs']);
        if ($b < 25) {
            $out['level'] = 'I0';
        } elseif ($b < 27) {
            $out['level'] = 'I1';
        } elseif ($b < 30) {
            $out['level'] = $n ? 'I3' : 'I2';
        } elseif ($b >= 40 || ($b >= 35 && $n)) {
            $out['level'] = 'I5';
        } else {
            $out['level'] = 'I4';
        }
        $out['pts'] = self::LEVEL_PTS[$out['level']];

        if ($a['waist'] && $a['height']) {
            $out['whtr'] = self::jsRound($a['waist'] / $a['height'], 2);
            $out['central'] = $out['whtr'] >= 0.6
                || ($a['sex'] === 'male' && $a['waist'] >= 102)
                || ($a['sex'] === 'female' && $a['waist'] >= 88);
        }
        return $out;
    }

    public function eossStage(array $a, array $ctx): int
    {
        $s = 0;
        $com = $this->stepOf('comorbid');
        foreach ($a['comorbid'] as $v) {
            foreach ($com['options'] as $o) {
                if ($o['v'] === $v && !empty($o['eoss'])) {
                    $s = max($s, (int) $o['eoss']);
                }
            }
        }
        if ($ctx['osaSuspect']) {
            $s = max($s, 1);
        }
        if (($a['hba1c'] !== null && $a['hba1c'] >= 5.7) || ($a['fbs'] !== null && $a['fbs'] >= 100)) {
            $s = max($s, $ctx['labDiabetes'] ? 2 : 1);
        }
        if ($ctx['ed'] || $ctx['dep']) {
            $s = max($s, 1);
        }
        $func = (int) (self::num($a['function']) ?? 0);
        $s = max($s, $func);
        if ($s >= 3 && $func === 3) {
            $s = 4;
        }
        return $s;
    }

    public function readinessScore(array $a): int
    {
        $total = 0;
        foreach (self::FALLBACK_PTS as $k => $fallback) {
            $o = $this->optionOf($k, $a[$k]);
            $total += ($o && isset($o['pts'])) ? (int) $o['pts'] : $fallback;
        }
        return (int) self::clamp($total, 0, 100);
    }

    // ---------- درسنامه‌ها ----------
    public function pickLessons(string $route, array $flags, array $optionLessons): array
    {
        $all = $this->lessons['lessons'] ?? [];
        $max = $this->lessons['maxPerResult'] ?? 7;
        $byId = [];
        foreach ($all as $l) {
            $byId[$l['id']] = $l;
        }
        $order = [];
        $push = function ($id) use (&$order, $byId) {
            if (isset($byId[$id]) && !in_array($id, $order, true)) {
                $order[] = $id;
            }
        };
        $selfHarm = false;
        foreach (['red', 'orange', 'info'] as $lv) {
            foreach ($flags as $f) {
                if ($f['level'] !== $lv) {
                    continue;
                }
                if ($f['id'] === 'self-harm') {
                    $selfHarm = true;
                }
                foreach ($f['lessons'] ?? [] as $id) {
                    $push($id);
                }
            }
        }
        if (!$selfHarm) {
            foreach ($optionLessons as $id) {
                $push($id);
            }
            $routeLessons = array_values(array_filter($all, function ($l) use ($route) {
                return in_array($route, $l['routes'], true);
            }));
            usort($routeLessons, function ($x, $y) { return $x['priority'] <=> $y['priority']; });
            foreach ($routeLessons as $l) {
                $push($l['id']);
            }
        }
        $out = [];
        foreach (array_slice($order, 0, $max) as $id) {
            $l = $byId[$id];
            $out[] = ['id' => $l['id'], 'title' => $l['title'], 'summary' => $l['summary'], 'minutes' => $l['minutes']];
        }
        return $out;
    }

    // ---------- ارزیابی ----------
    public function evaluate(array $raw): array
    {
        $a = self::normalize($raw);
        $q = $this->quiz;
        $ctx = $this->collectFlags($a);
        $flags = $ctx['flags'];
        $ind = $this->indication($a, $ctx);
        $stage = $this->eossStage($a, $ctx);
        $readiness = $this->readinessScore($a);

        if ($ind['level'] === 'I2' && $ind['central']) {
            $flags[] = $this->S('flags')['borderline'];
        }
        $byLevel = function ($lv) use ($flags) {
            return array_values(array_filter($flags, function ($f) use ($lv) { return $f['level'] === $lv; }));
        };
        $reds = $byLevel('red');
        $oranges = $byLevel('orange');
        $infos = $byLevel('info');
        $texts = function ($list) { return array_map(function ($f) { return $f['text']; }, $list); };

        $chosenNonDrug = false;
        if ($reds) {
            $route = 'R';
        } elseif (!$ind['level'] || in_array($ind['level'], ['I0', 'I1', 'I2'], true)) {
            $route = 'C';
        } elseif ($a['readiness'] === 'no') {
            $route = 'C';
            $chosenNonDrug = true;
        } else {
            $route = $readiness >= $this->cfg['readiness_cut'] ? 'E' : 'D';
        }
        $doctor = $route !== 'R' && count($oranges) > 0;

        if ($route === 'R') {
            $score = 5;
        } else {
            $score = (int) self::jsRound(0.5 * $ind['pts'] + 0.2 * $stage * 25 + 0.3 * $readiness) - min(15, 5 * count($oranges));
            $score = $route === 'C' ? self::clamp($score, 5, 45) : self::clamp($score, 55, 98);
        }

        $R = $q['routes'][$route];
        $status = $route === 'R' ? 'red' : ($doctor ? $q['doctorOverlay']['status'] : $R['status']);
        $SM = $this->S('summary');
        $PO = $this->S('positives');
        $bmiTxt = $ind['bmi'] !== null ? $this->fmt($ind['bmi']) : '';
        $cat = $ind['bmi'] !== null ? $this->bmiCategory($ind['bmi']) : '';
        if ($route === 'R') {
            $summary = implode(' ', $texts($reds));
        } elseif ($chosenNonDrug) {
            $summary = $SM['nonDrug'];
        } elseif ($route === 'C' && $ind['level'] === 'I2') {
            $summary = self::tpl($SM['borderline'], ['bmi' => $bmiTxt]);
        } elseif ($route === 'C') {
            $summary = $ind['bmi'] !== null ? self::tpl($SM['notIndicated'], ['bmi' => $bmiTxt, 'cat' => $cat]) : $R['subtitle'];
        } else {
            $signs = $ind['signs'] ? self::tpl($SM['signs'], ['list' => implode($this->S('listSep'), $ind['signs'])]) : '';
            $summary = self::tpl($SM['indicated'], ['bmi' => $bmiTxt, 'signs' => $signs, 'readiness' => $this->fmt($readiness),
                'tail' => $route === 'D' ? $SM['tailPrepare'] : $SM['tailReady']]);
        }

        $positives = [];
        if ($ind['bmi'] !== null) {
            $positives[] = self::tpl($PO['bmi'], ['bmi' => $bmiTxt, 'cat' => $cat,
                'adj' => $ind['adjusted'] ? self::tpl($PO['adjusted'], ['bmi' => $this->fmt($ind['bmiAdj'])]) : '']);
        }
        if ($ind['whtr'] !== null) {
            $positives[] = self::tpl($PO['whtr'], ['whtr' => $this->fmt($ind['whtr']), 'good' => $ind['whtr'] < 0.5 ? $PO['whtrGood'] : '']);
        }
        if ($a['lifestyle'] === 'failed') $positives[] = $PO['lifestyle'];
        if ($a['protein'] === '3') $positives[] = $PO['protein'];
        if ($a['resistance'] === '2') $positives[] = $PO['resistance'];
        if ($a['access'] === 'yes') $positives[] = $PO['access'];
        if (!$reds && !$oranges) $positives[] = $PO['clear'];

        $rawSteps = array_merge($doctor ? [$q['doctorOverlay']['step']] : [], $R['steps']);
        $steps = [];
        foreach ($rawSteps as $i => $s) {
            $steps[] = ['step' => $i + 1, 'badge' => $s['badge'], 'title' => $s['title'], 'desc' => $s['desc']];
        }
        $checklist = [];
        foreach ($oranges as $f) {
            if (!empty($f['doctor']) && !in_array($f['doctor'], $checklist, true)) {
                $checklist[] = $f['doctor'];
            }
        }

        return [
            'version' => 2,
            'route' => $route,
            'doctor_review' => $doctor,
            'status' => $status,
            'title' => ($route !== 'R' && $doctor) ? $R['title'] . $q['doctorOverlay']['suffix'] : $R['title'],
            'subtitle' => $R['subtitle'],
            'summary' => $summary,
            'ampoule_score' => (int) $score,
            'ampoule_label' => $R['label'] . ($doctor ? $q['doctorOverlay']['suffix'] : ''),
            'ampoule_tone' => $status,
            'hard_stops' => $texts($reds),
            'warnings' => $texts($oranges),
            'info' => $texts($infos),
            'positives' => $positives,
            'doctor_checklist' => $checklist,
            'next_steps' => $steps,
            'flags' => array_map(function ($f) { return ['id' => $f['id'], 'level' => $f['level']]; }, $flags),
            'indication' => ['level' => $ind['level'], 'bmi' => $ind['bmi'], 'bmi_adj' => $ind['bmiAdj'], 'adjusted' => $ind['adjusted'],
                'signs' => $ind['signs'], 'whtr' => $ind['whtr'], 'central' => $ind['central']],
            'eoss_stage' => $stage,
            'readiness' => $readiness,
            'components' => ['indication' => $ind['pts'], 'clinical' => $stage * 25, 'readiness' => $readiness],
            'lessons' => $this->pickLessons($route, $flags, $ctx['lessonIds']),
            'paywall' => false, // گزارش در همه مسیرها رایگان است
            'medical_disclaimer' => $q['disclaimer'],
        ];
    }

    // ---------- اعتبارسنجی ----------
    public function validate(array $raw): array
    {
        $a = self::normalize($raw);
        $errors = [];
        $ER = $this->S('errors');
        $red = false;
        foreach ($this->collectFlags($a)['flags'] as $f) {
            if ($f['level'] === 'red') {
                $red = true;
            }
        }
        $legacy = $a['version'] !== 2;

        foreach ($this->quiz['steps'] as $step) {
            $key = $step['key'];
            if ($key === 'contact') {
                continue;
            }
            if ($legacy && !in_array($key, self::LEGACY_KEYS, true)) {
                continue;
            }
            if (!$legacy && !$this->visible($step, $a)) {
                continue;
            }
            $required = $key === 'age' || (!$red && empty($step['optionalStep']));
            switch ($step['type']) {
                case 'number':
                    foreach ($step['fields'] as $f) {
                        $v = $a[$f['name']];
                        if ($v === null) {
                            if ($required && empty($f['optional'])) {
                                $errors[$f['name']] = self::tpl($ER['required'], ['label' => $f['label']]);
                            }
                        } elseif ($v < $f['min'] || $v > $f['max']) {
                            $errors[$f['name']] = self::tpl($ER['range'], ['label' => $f['label'], 'min' => $this->fmt($f['min']), 'max' => $this->fmt($f['max'])]);
                        }
                    }
                    break;
                case 'radio':
                    $v = $a[$key];
                    if ($v === '') {
                        if ($required) {
                            $errors[$key] = $ER['pickOne'];
                        }
                    } elseif (!$this->optionOf($key, $v) && !($key === 'pregnancy' && $v === 'na')) {
                        $errors[$key] = $ER['invalid'];
                    }
                    break;
                case 'checkbox':
                    $v = $a[$key];
                    if (!$v) {
                        if ($required) {
                            $errors[$key] = $ER['pickSome'];
                        }
                    } else {
                        foreach ($v as $x) {
                            if (!$this->optionOf($key, $x)) {
                                $errors[$key] = $ER['invalid'];
                                break;
                            }
                        }
                    }
                    break;
                case 'yesno':
                    $missing = false;
                    foreach ($step['items'] as $it) {
                        if (empty($a['mental_screen'][$it['v']])) {
                            $missing = true;
                        }
                    }
                    if ($missing && $required && !($legacy && $a['mental'])) {
                        $errors[$key] = $ER['answerAll'];
                    }
                    break;
            }
        }
        if ($legacy && !$a['mental'] && !$a['mental_screen'] && !$red) {
            $errors['mental'] = $ER['pickOne'];
        }
        // ابزار رایگان و بی‌نام است: نام، موبایل و تأیید ذخیره دیگر لازم نیست
        return $errors;
    }
}
