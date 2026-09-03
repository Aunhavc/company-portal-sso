-- =============================================================================
-- ด่านอนุมัติผู้ใช้ — ปิดช่องโหว่ "ใครมีบัญชี Google ก็เข้าพอร์ทัลได้"
--
-- เดิม sync_profile() สร้างโปรไฟล์ให้ทุกคนที่ล็อกอินสำเร็จ และ RLS ตรวจแค่ว่า
-- "ล็อกอินแล้ว" ผลคือบัญชี Gmail ใด ๆ บนโลกก็เห็นรายชื่อระบบงานภายในและประกาศได้
--
-- หลังไฟล์นี้
--   • มาจาก connection ที่เชื่อถือได้ (AD)  → เปิดใช้งานทันที
--   • มาจากช่องทางอื่น (Google ฯลฯ)          → is_active = false รอผู้ดูแลอนุมัติ
--   • คนที่ยังไม่อนุมัติ                        → RLS ไม่ให้เห็นแอปและประกาศเลย
--
-- ⚠️ ห้ามใช้วิธี raise exception ตอนยังไม่อนุมัติ เพราะ error จะ rollback ทั้งธุรกรรม
--    แถวโปรไฟล์ที่เพิ่งสร้างจะหายไปด้วย ผู้ดูแลจะไม่มีวันเห็นรายชื่อคนที่รออนุมัติ
--    ด่านจริงจึงต้องอยู่ที่ RLS ไม่ใช่ที่การโยน error
--
-- รันซ้ำได้ (idempotent) · ไม่แตะบัญชีที่มีอยู่แล้ว
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) รายชื่อ connection ที่เชื่อถือได้ — เก็บใน settings เพื่อแก้ได้โดยไม่ต้อง migrate ใหม่
--    คั่นหลายค่าด้วยจุลภาค เช่น 'ad|somjai-ad|,ad|another-ad|'
-- -----------------------------------------------------------------------------
insert into public.settings (key, value)
values ('sso_auto_approve_prefixes', 'ad|somjai-ad|')
on conflict (key) do nothing;

-- -----------------------------------------------------------------------------
-- 2) is_active_user() — ผู้ใช้ปัจจุบันผ่านการอนุมัติแล้วหรือยัง
--
--    ต้องมีแยกจาก current_role_name() เพราะฟังก์ชันนั้นคืน 'user' เป็นค่าตั้งต้น
--    แม้โปรไฟล์จะยังไม่อนุมัติ ถ้าใช้มันตัดสินสิทธิ์ คนที่รออนุมัติจะเห็นแอปได้
-- -----------------------------------------------------------------------------
create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = public.auth0_sub()
      and p.is_active
  );
$$;

comment on function public.is_active_user() is
  'true = ผู้ใช้ปัจจุบันได้รับอนุมัติให้ใช้งานแล้ว';

grant execute on function public.is_active_user() to authenticated;

-- -----------------------------------------------------------------------------
-- 3) sync_profile() — ตั้งสถานะอนุมัติตอนสร้างโปรไฟล์ใหม่
-- -----------------------------------------------------------------------------
create or replace function public.sync_profile(
  p_full_name  text default null,
  p_avatar_url text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub      text := public.auth0_sub();
  v_email    text := coalesce(auth.jwt() ->> 'email', auth.jwt() -> 'user_metadata' ->> 'email');
  v_owner    text;
  v_auto     boolean;
  v_result   public.profiles;
begin
  if v_sub is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if v_email is null then
    raise exception 'JWT ไม่มี claim email — ตรวจสอบ Auth0 Post-Login Action' using errcode = '22023';
  end if;

  -- อีเมลเดียวถูกใช้กับอีกช่องทางแล้ว (เช่น เคยเข้าด้วย Google แล้วมาเข้าด้วย AD)
  -- อีเมลใน AD ขององค์กรนี้เป็น Gmail ส่วนตัว กรณีนี้จึงเกิดขึ้นได้จริง
  select id into v_owner
    from public.profiles
   where lower(email) = lower(v_email)
     and id <> v_sub
   limit 1;

  if v_owner is not null then
    raise exception
      'อีเมล % ถูกใช้กับช่องทางเข้าสู่ระบบอื่นแล้ว กรุณาเข้าด้วยช่องทางเดิม หรือติดต่อ IT Helpdesk',
      v_email
      using errcode = '23505';
  end if;

  -- มาจาก connection ที่เชื่อถือได้หรือไม่
  -- ใช้ left() เทียบตรง ๆ แทน like เพื่อไม่ให้อักขระ % หรือ _ ในชื่อ connection
  -- กลายเป็นไวลด์การ์ดโดยไม่ตั้งใจ
  select exists (
    select 1
      from unnest(
             string_to_array(
               coalesce((select value from public.settings
                          where key = 'sso_auto_approve_prefixes'), ''),
               ','
             )
           ) as t(prefix)
     where btrim(t.prefix) <> ''
       and left(v_sub, length(btrim(t.prefix))) = btrim(t.prefix)
  ) into v_auto;

  -- is_active ถูกกำหนดเฉพาะตอน insert เท่านั้น
  -- การล็อกอินซ้ำของบัญชีเดิมจะไม่ไปรีเซ็ตสถานะที่ผู้ดูแลตั้งไว้
  insert into public.profiles as p (id, email, full_name, avatar_url, last_login_at, is_active)
  values (v_sub, lower(v_email), p_full_name, p_avatar_url, now(), v_auto)
  on conflict (id) do update
    set email         = excluded.email,
        full_name     = coalesce(excluded.full_name, p.full_name),
        avatar_url    = coalesce(excluded.avatar_url, p.avatar_url),
        last_login_at = now()
  returning * into v_result;

  -- คืนแถวเสมอ แม้ยังไม่อนุมัติ เพื่อให้หน้าเว็บแสดงสถานะ "รออนุมัติ" ได้
  -- และเพื่อให้ผู้ดูแลเห็นรายชื่อในหน้าจัดการผู้ใช้
  return v_result;
end;
$$;

revoke all on function public.sync_profile(text, text) from public;
grant execute on function public.sync_profile(text, text) to authenticated;

-- -----------------------------------------------------------------------------
-- 4) RLS — ด่านจริง คนที่ยังไม่อนุมัติต้องไม่เห็นอะไรเลย
--    ต่อให้ยิง API ตรง ๆ ข้ามหน้าเว็บไปก็ตาม
-- -----------------------------------------------------------------------------
drop policy if exists apps_select_visible on public.apps;
create policy apps_select_visible on public.apps
  for select to authenticated
  using (
    is_active
    and public.is_active_user()
    and public.current_role_name() = any (allowed_roles)
  );

drop policy if exists announcements_select_published on public.announcements;
create policy announcements_select_published on public.announcements
  for select to authenticated
  using (published and public.is_active_user());
