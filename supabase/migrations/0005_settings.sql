-- =============================================================================
-- ตารางตั้งค่าองค์กร — แก้ได้จากหน้า Admin โดยไม่ต้อง deploy ใหม่
--
-- ค่าเหล่านี้ไม่ใช่ความลับ (ชื่อบริษัทฝังอยู่ในไฟล์ JavaScript ที่เปิดดูได้อยู่แล้ว)
-- จึงเปิดให้อ่านได้โดยไม่ต้องล็อกอิน เพื่อให้หน้าล็อกอินแสดงชื่อบริษัทได้ด้วย
-- ส่วนการแก้ไขจำกัดเฉพาะผู้ดูแลระบบเท่านั้น
-- =============================================================================

create table if not exists public.settings (
  key        text primary key,
  value      text not null default '',
  updated_at timestamptz not null default now()
);

drop trigger if exists settings_touch on public.settings;
create trigger settings_touch
  before update on public.settings
  for each row execute function public.touch_updated_at();

-- ค่าเริ่มต้น
insert into public.settings (key, value) values
  ('company_name',   'บจก. สมใจบิสกรุ๊ป'),
  ('logo_url',       ''),
  ('portal_tagline', 'ศูนย์รวมระบบงานพนักงาน'),
  ('helpdesk_phone', '1234'),
  ('helpdesk_email', 'helpdesk@company.com')
on conflict (key) do nothing;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.settings enable row level security;

drop policy if exists settings_read_all  on public.settings;
drop policy if exists settings_admin_write on public.settings;

-- อ่านได้ทุกคน รวมถึงผู้ที่ยังไม่ล็อกอิน (หน้าล็อกอินต้องใช้ชื่อบริษัท)
create policy settings_read_all on public.settings
  for select to anon, authenticated
  using (true);

-- แก้ไขได้เฉพาะผู้ดูแลระบบ
create policy settings_admin_write on public.settings
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.settings to anon, authenticated;
grant insert, update, delete on public.settings to authenticated;
