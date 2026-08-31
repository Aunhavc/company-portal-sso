-- =============================================================================
-- ตั้ง admin คนแรก
-- ลำดับการทำ:
--   1. ล็อกอินเข้า Portal ด้วยบัญชีที่จะเป็น admin หนึ่งครั้ง (เพื่อให้แถวใน profiles ถูกสร้าง)
--   2. แก้อีเมลด้านล่างให้ตรง แล้วรันไฟล์นี้ใน SQL Editor
-- =============================================================================

update public.profiles
set role = 'admin'
where lower(email) = lower('admin@example.com');   -- ★ แก้ตรงนี้

-- ตรวจสอบผล
select id, email, full_name, role, is_active, last_login_at
from public.profiles
order by created_at;
