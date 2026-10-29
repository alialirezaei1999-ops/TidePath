<?php
/**
 * اتصال نسخه ۲ به سایت فعلی — تنها فایلی که باید با کد موجود سایت هماهنگ شود.
 * پیش‌فرض‌ها با PDO و جدول glp1_leads_v2 (sql/migration.sql) کار می‌کنند.
 * اگر سایت جدول یا تابع اتصال خودش را دارد، فقط بدنه همین توابع را عوض کنید.
 */

/** تنظیمات موتور؛ ethnic_adjust فقط با تصمیم پزشک تیم روشن شود. */
function glp1_config(): array
{
    return ['ethnic_adjust' => false, 'ethnic_offset' => 2.5, 'readiness_cut' => 60];
}

/** اتصال پایگاه داده. اگر سایت از قبل PDO دارد، همان را برگردانید. */
function glp1_db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        // TODO: با تنظیمات واقعی سایت جایگزین شود (مثلاً از config.php موجود)
        $pdo = new PDO('mysql:host=localhost;dbname=YOUR_DB_NAME;charset=utf8mb4', 'DB_USER', 'DB_PASS', [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    }
    return $pdo;
}

/** بررسی CSRF؛ فرض شده سایت توکن را در $_SESSION['csrf_token'] نگه می‌دارد (مثل نسخه ۱). */
function glp1_check_csrf(): bool
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_start();
    }
    $sent = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    $real = $_SESSION['csrf_token'] ?? '';
    return $real !== '' && is_string($sent) && hash_equals($real, $sent);
}

/** ذخیره پرونده؛ خروجی: شناسه و توکن تصادفی برای نشانی نتیجه. */
function glp1_save_lead(array $answers, array $result): array
{
    $token = bin2hex(random_bytes(16));
    $stmt = glp1_db()->prepare(
        'INSERT INTO glp1_leads_v2 (result_token, full_name, mobile, route, status, score, answers_json, result_json, is_paid, created_at)
         VALUES (:t, :n, :m, :r, :s, :sc, :a, :res, :paid, NOW())'
    );
    $stmt->execute([
        ':t' => $token,
        ':n' => mb_substr($answers['full_name'] ?? '', 0, 120),
        ':m' => $answers['mobile'] ?? '',
        ':r' => $result['route'],
        ':s' => $result['status'],
        ':sc' => $result['ampoule_score'],
        ':a' => json_encode($answers, JSON_UNESCAPED_UNICODE),
        ':res' => json_encode($result, JSON_UNESCAPED_UNICODE),
        ':paid' => $result['paywall'] ? 0 : 1,
    ]);
    $id = (int) glp1_db()->lastInsertId();
    if (session_status() === PHP_SESSION_ACTIVE) {
        $_SESSION['glp1_owned'][] = $token;
    }
    return ['lead_id' => $id, 'token' => $token];
}

/** خواندن پرونده فقط با توکن (نه شماره ترتیبی). */
function glp1_load_lead(string $token): ?array
{
    if (!preg_match('/^[a-f0-9]{32}$/', $token)) {
        return null;
    }
    $stmt = glp1_db()->prepare('SELECT * FROM glp1_leads_v2 WHERE result_token = :t LIMIT 1');
    $stmt->execute([':t' => $token]);
    $row = $stmt->fetch();
    return $row ?: null;
}

/** نشانی پرداخت. درگاه فعلی سایت باید پس از پرداخت موفق is_paid را ۱ کند و به نشانی نتیجه برگردد. */
function glp1_checkout_url(array $saved): string
{
    return '/checkout?lead_id=' . $saved['lead_id'] . '&t=' . $saved['token'];
}

function glp1_result_url(string $token): string
{
    return '/quiz?view_result=1&t=' . $token;
}
