-- =============================================================================
-- Seed data
--
-- นโยบาย: เปิดใช้งาน (is_active) เฉพาะแอปที่มี URL จริงและตรวจแล้วว่าเข้าถึงได้
-- แอปที่ยังไม่รู้ URL จะใส่ไว้เป็นร่างและปิดไว้ก่อน เพื่อไม่ให้พนักงานคลิกแล้วเจอหน้าเปล่า
-- เมื่อกรอก URL จริงแล้วให้เปิดสวิตช์ที่หน้า /admin/apps
-- =============================================================================

insert into public.apps
  (slug, name, description, category, network, url, sso_url, health_url,
   icon, accent, open_in_new_tab, allowed_roles, sort_order, is_active)
values
  -- ✅ URL จริง ตรวจแล้วเข้าถึงได้
  ('neopos-web',
   'NeoPOS — หน้าจอขาย',
   'ระบบขายหน้าร้านบนคลาวด์ ใช้งานได้จากทุกสาขาและทุกอุปกรณ์',
   'ระบบงานหลัก', 'internet',
   'https://neopos-web.vercel.app', null, null,
   '🛒', 'blue', true, array['user','admin'], 10, true),

  -- ⬇ ร่าง: แก้ URL แล้วเปิดใช้งานที่หน้าจัดการแอป
  ('sap-b1',
   'SAP Business One',
   'ระบบ ERP หลักขององค์กร ต้องเชื่อมต่อ VPN ก่อนใช้งาน — ยังไม่ได้กำหนด URL จริง',
   'ระบบงานหลัก', 'intranet',
   'https://sap.company.local/', null, 'https://sap.company.local/ping.php',
   '🏭', 'emerald', false, array['user','admin'], 20, false),

  ('wms',
   'WMS — คลังสินค้า',
   'รับ-จ่ายสต๊อก ตรวจนับ และจัดการตำแหน่งเก็บ — ยังไม่ได้กำหนด URL จริง',
   'ระบบงานหลัก', 'intranet',
   'https://wms.company.local/',
   'https://wms.company.local/auth-callback.php',
   'https://wms.company.local/ping.php',
   '📦', 'amber', false, array['user','admin'], 30, false),

  ('doctracking',
   'DocTracking — ติดตามเอกสาร',
   'ติดตามสถานะเอกสารและการอนุมัติภายในองค์กร — ยังไม่ได้กำหนด URL จริง',
   'งานเอกสาร', 'intranet',
   'https://doc.company.local/', null, 'https://doc.company.local/ping.php',
   '🧾', 'cyan', false, array['user','admin'], 40, false),

  ('salestarget',
   'SalesTarget — เป้าการขาย',
   'กำหนดและติดตามเป้า Sales/GP รายกลุ่ม สาขา และเดือน — ยังไม่ได้กำหนด URL จริง',
   'ขายและการตลาด', 'intranet',
   'https://salestarget.company.local/', null, 'https://salestarget.company.local/ping.php',
   '📊', 'violet', false, array['admin'], 50, false)
on conflict (slug) do nothing;

-- -----------------------------------------------------------------------------
-- วิธีเปิดใช้งานแอปหลังกรอก URL จริง (ทำผ่านหน้า /admin/apps ได้เช่นกัน)
-- -----------------------------------------------------------------------------
-- update public.apps
-- set url        = 'https://wms.company.com/',
--     sso_url    = 'https://wms.company.com/auth-callback.php',
--     health_url = 'https://wms.company.com/ping.php',
--     description = 'รับ-จ่ายสต๊อก ตรวจนับ และจัดการตำแหน่งเก็บ',
--     is_active  = true
-- where slug = 'wms';

-- -----------------------------------------------------------------------------
-- ประกาศตัวอย่าง
-- -----------------------------------------------------------------------------
insert into public.announcements (title, content, category, is_pinned)
select * from (values
  ('แจ้งปรับปรุงระบบ VPN ประจำเดือน',
   E'ฝ่าย IT จะทำการอัปเดตเซิร์ฟเวอร์ VPN ในวันศุกร์นี้ เวลา 22:00 - 24:00 น.\n\nระหว่างช่วงเวลาดังกล่าว พนักงานจะไม่สามารถเข้าใช้งานระบบ Intranet ได้ชั่วคราว ส่วนระบบบนคลาวด์ยังใช้งานได้ตามปกติ\n\nหากมีข้อสงสัยกรุณาติดต่อ IT Helpdesk ต่อ 1234',
   'IT Alert', true),

  ('สิทธิประโยชน์ประกันสุขภาพประจำปี 2026',
   E'พนักงานสามารถดาวน์โหลดเอกสารคู่มือการเบิกจ่ายค่ารักษาพยาบาลฉบับใหม่ได้ที่ระบบ HR\n\nวงเงินความคุ้มครองปรับเพิ่มขึ้นจากปีก่อน กรุณาตรวจสอบรายละเอียดและยืนยันข้อมูลผู้รับผลประโยชน์ภายในวันที่ 30 กันยายน 2569',
   'HR', false),

  ('เปิดใช้งานระบบล็อกอินกลาง (SSO) แล้ววันนี้',
   E'ตั้งแต่วันนี้เป็นต้นไป พนักงานสามารถใช้อีเมลบริษัทเพียงชุดเดียวในการเข้าถึงทุกระบบ ทั้งระบบบนคลาวด์และระบบภายในองค์กร\n\nไม่ต้องจำรหัสผ่านหลายชุดอีกต่อไป และเมื่อเข้าสู่ระบบครั้งแรกแล้ว การเปิดระบบอื่นจะไม่ถามรหัสผ่านซ้ำ',
   'Announcement', false)
) as v(title, content, category, is_pinned)
where not exists (select 1 from public.announcements);
