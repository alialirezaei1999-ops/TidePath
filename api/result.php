<?php
/**
 * GET /api/result.php?t=TOKEN — داده نتیجه برای صفحه quiz?view_result=1&t=TOKEN
 * فقط با توکن تصادفی. گزارش‌ها رایگان‌اند و هنگام ذخیره is_paid = 1 می‌گیرند.
 * پرونده‌های قدیمی که نام و موبایل دارند: موبایل ماسک می‌شود.
 */
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

require __DIR__ . '/../includes/glp1_adapter.php';

$token = (string) ($_GET['t'] ?? '');
$row = glp1_load_lead($token);
if (!$row) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'گزارش پیدا نشد.'], JSON_UNESCAPED_UNICODE);
    exit;
}
if ((int) $row['is_paid'] !== 1) {
    http_response_code(402);
    echo json_encode(['success' => false, 'message' => 'پرداخت این گزارش تکمیل نشده است.',
        'checkout_url' => glp1_checkout_url(['lead_id' => $row['id'], 'token' => $row['result_token']])], JSON_UNESCAPED_UNICODE);
    exit;
}
$mobile = (string) $row['mobile'];
echo json_encode(['success' => true, 'data' => [
    'lead_id' => (int) $row['id'],
    'created_at' => $row['created_at'],
    'user' => ['full_name' => $row['full_name'], 'mobile' => $mobile ? substr($mobile, 0, 4) . '***' . substr($mobile, -2) : ''],
    'result' => json_decode($row['result_json'], true),
]], JSON_UNESCAPED_UNICODE);
