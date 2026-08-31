-- =============================================================================
-- เพิ่มคอลัมน์เชื่อมบัญชีกลาง Auth0 เข้ากับตารางพนักงานเดิม
-- แก้ชื่อตาราง employees ให้ตรงกับของจริงก่อนรัน
-- =============================================================================

-- ---- MySQL / MariaDB --------------------------------------------------------
ALTER TABLE employees
  ADD COLUMN auth0_id VARCHAR(255) NULL AFTER id;

CREATE UNIQUE INDEX ux_employees_auth0_id ON employees (auth0_id);

-- อีเมลต้องไม่ซ้ำ ไม่งั้นการจับคู่บัญชีด้วยอีเมลจะกำกวม
CREATE UNIQUE INDEX ux_employees_email ON employees (email);


-- ---- SQL Server -------------------------------------------------------------
-- ALTER TABLE dbo.employees ADD auth0_id NVARCHAR(255) NULL;
-- GO
-- CREATE UNIQUE INDEX ux_employees_auth0_id
--   ON dbo.employees (auth0_id) WHERE auth0_id IS NOT NULL;
-- GO


-- ---- ตรวจสอบข้อมูลก่อนเปิดใช้งานจริง ---------------------------------------
-- อีเมลซ้ำจะทำให้จับคู่บัญชีผิดคน ต้องเคลียร์ให้หมดก่อน
-- SELECT LOWER(email) AS e, COUNT(*) AS n
-- FROM employees GROUP BY LOWER(email) HAVING COUNT(*) > 1;

-- พนักงานที่ไม่มีอีเมล จะเข้าผ่าน SSO ไม่ได้
-- SELECT id, name FROM employees WHERE email IS NULL OR email = '';
