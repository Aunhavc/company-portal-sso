-- =============================================================================
-- แก้บั๊ก: ตั้ง role ให้ผู้ใช้จาก SQL Editor ไม่ติด
--
-- อาการ:
--   สั่ง update public.profiles set role = 'admin' ... แล้ว select ได้ค่าเดิม
--   ไม่มี error ไม่มีคำเตือน เหมือนคำสั่งไม่ทำงาน
--
-- สาเหตุ:
--   trigger profiles_guard ทำงานกับทุก UPDATE รวมถึงคำสั่งที่รันจาก SQL Editor
--   ซึ่งไม่มี JWT แนบมา ทำให้ is_admin() คืน false แล้ว trigger ย้อนค่า role
--   กลับเป็นค่าเดิมเงียบ ๆ
--
-- วิธีแก้:
--   ถ้าไม่มี JWT ถือว่าเป็นบริบทที่เชื่อถือได้ (SQL Editor / migration / service role)
--   ให้ปล่อยผ่าน การป้องกันยังคงมีผลเต็มที่กับคำขอที่มาจากเบราว์เซอร์ผู้ใช้
--
-- รันไฟล์นี้กับฐานข้อมูลที่ติดตั้ง 0001 เวอร์ชันก่อนหน้าไว้แล้ว
-- (0001_init.sql ฉบับล่าสุดรวมการแก้นี้ไว้แล้ว ติดตั้งใหม่ไม่ต้องรันไฟล์นี้)
-- =============================================================================

create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.auth0_sub() is null then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  new.role      := old.role;
  new.is_active := old.is_active;
  new.id        := old.id;

  if new.email is distinct from old.email
     and lower(new.email) is distinct from lower(coalesce(auth.jwt() ->> 'email', '')) then
    new.email := old.email;
  end if;

  return new;
end;
$$;

-- ตรวจผล: ต้องเห็น role ตามที่ตั้งไว้จริง
-- update public.profiles set role = 'admin' where lower(email) = lower('you@company.com');
-- select email, role from public.profiles;
