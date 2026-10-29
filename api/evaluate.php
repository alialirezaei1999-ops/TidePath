<?php
/**
 * POST /api/evaluate.php — ارزیابی نسخه ۲ (با پاسخ‌های نسخه ۱ هم کار می‌کند)
 * ورودی: JSON پاسخ‌ها + هدر X-CSRF-Token
 * خروجی موفق: نتیجه کامل و رایگان در data.result (ابزار بی‌نام است؛ نام و موبایل دریافت نمی‌شود).
 * شاخه checkout_url فقط برای سازگاری با نسخه پولی قبلی مانده و با paywall = false اجرا نمی‌شود.
 */
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

require __DIR__ . '/../includes/Glp1Engine.php';
require __DIR__ . '/../includes/glp1_adapter.php';

function glp1_respond(int $code, array $body): void
{
    http_response_code($code);
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    glp1_respond(405, ['success' => false, 'message' => 'روش درخواست مجاز نیست.']);
}
if (!glp1_check_csrf()) {
    glp1_respond(403, ['success' => false, 'message' => 'نشست شما منقضی شده است؛ صفحه را دوباره باز کنید.']);
}

$rawBody = file_get_contents('php://input');
if (strlen((string) $rawBody) > 20000) {
    glp1_respond(413, ['success' => false, 'message' => 'حجم داده بیش از حد است.']);
}
$input = json_decode((string) $rawBody, true);
if (!is_array($input)) {
    glp1_respond(400, ['success' => false, 'message' => 'داده ارسالی معتبر نیست.']);
}

try {
    // زبان گزارش: lang = en داده انگلیسی را می‌خواند (data/en)، در غیر این صورت فارسی
    $lang = (($input['lang'] ?? '') === 'en') ? 'en' : 'fa';
    $engine = Glp1Engine::fromFiles(__DIR__ . '/../data' . ($lang === 'en' ? '/en' : ''), glp1_config());
    $errors = $engine->validate($input);
    if ($errors) {
        glp1_respond(422, ['success' => false, 'errors' => $errors, 'message' => 'لطفاً موارد مشخص‌شده را اصلاح کنید.']);
    }

    $answers = Glp1Engine::normalize($input);
    $result = $engine->evaluate($input);
    $saved = glp1_save_lead($answers, $result);

    if (!$result['paywall']) {
        glp1_respond(200, ['success' => true, 'data' => [
            'lead_id' => $saved['lead_id'],
            'token' => $saved['token'],
            'result_url' => glp1_result_url($saved['token']),
            'result' => $result,
            'created_at' => date('c'),
        ]]);
    }
    glp1_respond(200, ['success' => true, 'data' => [
        'lead_id' => $saved['lead_id'],
        'checkout_url' => glp1_checkout_url($saved),
        'route' => $result['route'],
    ]]);
} catch (Throwable $e) {
    error_log('[glp1 evaluate] ' . $e->getMessage());
    glp1_respond(500, ['success' => false, 'message' => 'خطای سرور؛ لطفاً دوباره تلاش کنید.']);
}
