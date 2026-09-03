-- =============================================================================
-- หมวดหมู่ประกาศแบบจัดการเองได้ + กำหนดวันเริ่ม/สิ้นสุดประกาศ
--
-- เดิมหมวดหมู่ถูกล็อกไว้ 4 ค่าตายตัวด้วย check constraint บนคอลัมน์
-- announcements.category ไฟล์นี้ย้ายมาเป็นตาราง announcement_categories
-- ที่ผู้ดูแลเพิ่ม/แก้ไข/ลบเองได้ พร้อม FK คุมไม่ให้ค่าที่ไม่มีอยู่จริงหลุดเข้ามา
--
-- และเพิ่ม starts_at/ends_at ให้ตั้งเวลาเริ่ม-สิ้นสุดของแต่ละประกาศได้
-- เมื่อพ้นกำหนด ประกาศจะ "หายไปเอง" จากหน้าหลักทันทีที่มีการอ่านข้อมูลรอบถัดไป
-- เพราะ RLS เทียบกับ now() ทุกครั้ง ไม่ต้องมี cron job แยกมาลบทิ้ง
--
-- รันไฟล์นี้ทั้งไฟล์ใน SQL Editor ได้เลย (idempotent — รันซ้ำได้)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) ตารางหมวดหมู่ประกาศ
-- -----------------------------------------------------------------------------
create table if not exists public.announcement_categories (
  key        text primary key,              -- รหัสอ้างอิง ใช้ผูกกับ announcements.category
  label      text not null,                 -- ชื่อที่แสดงผลบนเว็บ
  color      text not null default 'slate'
               check (color in ('slate','blue','emerald','amber','rose','violet','cyan','orange')),
  sort_order int not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists announcement_categories_touch on public.announcement_categories;
create trigger announcement_categories_touch
  before update on public.announcement_categories
  for each row execute function public.touch_updated_at();

-- ค่าเริ่มต้น — ตรงกับ 4 หมวดหมู่เดิมที่เคยล็อกไว้ในโค้ด เพื่อไม่ต้องย้ายข้อมูลเดิม
insert into public.announcement_categories (key, label, color, sort_order) values
  ('Announcement', 'ประกาศ',        'blue',   10),
  ('IT Alert',     'แจ้งเตือน IT',  'rose',   20),
  ('HR',           'ฝ่ายบุคคล',     'violet', 30),
  ('General',      'ทั่วไป',        'slate',  40)
on conflict (key) do nothing;

-- -----------------------------------------------------------------------------
-- 2) ผูก announcements.category เข้ากับตารางหมวดหมู่แทน check constraint เดิม
--    on update cascade  — เปลี่ยนรหัสหมวดหมู่แล้วประกาศเดิมตามไปเองอัตโนมัติ
--    on delete restrict — ลบหมวดหมู่ที่ยังมีประกาศใช้อยู่ไม่ได้ กันข้อมูลกำพร้า
-- -----------------------------------------------------------------------------
alter table public.announcements drop constraint if exists announcements_category_check;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'announcements_category_fkey'
  ) then
    alter table public.announcements
      add constraint announcements_category_fkey
      foreign key (category) references public.announcement_categories (key)
      on update cascade on delete restrict;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 3) วันเริ่มต้น/สิ้นสุดของประกาศ — ทั้งคู่ปล่อยว่างได้ (null = ไม่จำกัด)
-- -----------------------------------------------------------------------------
alter table public.announcements
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at   timestamptz;

alter table public.announcements drop constraint if exists announcements_schedule_check;
alter table public.announcements
  add constraint announcements_schedule_check
  check (starts_at is null or ends_at is null or ends_at > starts_at);

-- -----------------------------------------------------------------------------
-- 4) RLS ของตารางหมวดหมู่ — อ่านได้ทุกคนที่ล็อกอินแล้ว แก้ไขได้เฉพาะผู้ดูแล
-- -----------------------------------------------------------------------------
alter table public.announcement_categories enable row level security;

drop policy if exists announcement_categories_read_all    on public.announcement_categories;
drop policy if exists announcement_categories_admin_write on public.announcement_categories;

create policy announcement_categories_read_all on public.announcement_categories
  for select to authenticated
  using (true);

create policy announcement_categories_admin_write on public.announcement_categories
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.announcement_categories to authenticated;
grant insert, update, delete on public.announcement_categories to authenticated;

-- -----------------------------------------------------------------------------
-- 5) อัปเดต RLS ของ announcements ให้กรองตามกำหนดเวลาด้วย
--    ผลคือประกาศที่ยังไม่ถึงวันเริ่ม หรือพ้นวันสิ้นสุดแล้ว จะไม่ถูกส่งกลับให้
--    หน้าหลักเห็นเลย — ไม่ต้องมีงานเบื้องหลังมาลบทิ้ง
-- -----------------------------------------------------------------------------
drop policy if exists announcements_select_published on public.announcements;
create policy announcements_select_published on public.announcements
  for select to authenticated
  using (
    published
    and public.is_active_user()
    and (starts_at is null or starts_at <= now())
    and (ends_at   is null or ends_at   >  now())
  );
