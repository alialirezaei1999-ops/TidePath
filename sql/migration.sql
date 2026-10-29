-- جدول پرونده‌های نسخه ۲ (MySQL / MariaDB). جدول leads فعلی دست نمی‌خورد.
CREATE TABLE IF NOT EXISTS glp1_leads_v2 (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  result_token  CHAR(32)     NOT NULL,
  full_name     VARCHAR(120) NOT NULL DEFAULT '',
  mobile        VARCHAR(11)  NOT NULL DEFAULT '',
  route         CHAR(1)      NOT NULL,
  status        VARCHAR(10)  NOT NULL,
  score         TINYINT UNSIGNED NOT NULL,
  answers_json  MEDIUMTEXT   NOT NULL,
  result_json   MEDIUMTEXT   NOT NULL,
  is_paid       TINYINT(1)   NOT NULL DEFAULT 0,
  paid_at       DATETIME     NULL,
  created_at    DATETIME     NOT NULL,
  UNIQUE KEY uq_token (result_token),
  KEY idx_mobile (mobile),
  KEY idx_route (route, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- پس از پرداخت موفق، درگاه فعلی سایت این را اجرا کند:
-- UPDATE glp1_leads_v2 SET is_paid = 1, paid_at = NOW() WHERE id = ? AND result_token = ?;
