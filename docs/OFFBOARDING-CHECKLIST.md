# เช็กลิสต์ปิดบัญชีพนักงานลาออก — ทุกระบบ

จัดทำ 10 กันยายน 2569 · ใช้ทุกครั้งที่มีพนักงานลาออก ย้ายหน่วยงาน หรือถูกเลิกจ้าง

> **เหตุผลที่ต้องมีเอกสารนี้:** ระบบงานของบริษัทมีทั้งที่ผูกกับ Active Directory และที่มีบัญชีของตัวเอง
> **การปิดบัญชี AD อย่างเดียวไม่ได้ตัดสิทธิ์ทั้งหมด** — แอปบนคลาวด์ 4 ตัวมีบัญชีแยกจาก AD สิ้นเชิง
> ถ้าลืมแม้ระบบเดียว ข้อมูลบริษัทยังเปิดให้คนที่ออกไปแล้วเข้าถึงได้

---

## สรุปก่อนลงมือ

| ระบบ | ปิด AD แล้วตัดสิทธิ์อัตโนมัติไหม | ต้องทำมือ |
|---|---|---|
| ไฟล์แชร์ / เครื่องคอมพิวเตอร์ / SSL VPN | ✅ ตัดทันที | — |
| Company Portal (ช่องทาง AD) | ✅ ตัดทันที | — |
| Company Portal (ช่องทาง Google) | ❌ **ไม่ตัด** | ต้องปิดในหน้าจัดการผู้ใช้ |
| SAP on Web | ⚠️ ตัดเฉพาะทาง Windows · **ทาง PIN ยังเข้าได้** | ต้องปิดบัญชีในแอป |
| osTicket | ⚠️ ตัดเฉพาะทาง SSO · **รหัสผ่านของ osTicket ยังใช้ได้** | ต้องปิดบัญชีในแอป |
| AntBase / issue-hub / cashflow / asset-registry | ❌ **ไม่ตัดเลย** บัญชีแยกจาก AD | ต้องลบออกจากแต่ละแอป |

---

## ขั้นตอน — ทำตามลำดับ ห้ามข้าม

### 1. Active Directory  ⏱️ 2 นาที

- ปิดใช้งานบัญชี (Disable) **ไม่ต้องลบ** เพื่อให้ประวัติและสิทธิ์ไฟล์ยังตรวจสอบได้
- เอาออกจากกลุ่ม `SSO-Portal-Users`
- รีเซ็ตรหัสผ่านเป็นค่าที่ไม่มีใครรู้ (กันกรณีมีเซสชันค้าง)

```powershell
$u = 'ชื่อผู้ใช้'   # เช่น somchai.jai
$ca = Get-Credential SOMJAIAD01\administrator
Invoke-Command -ComputerName SV000ITD01.SOMJAIAD01.LOCAL -Credential $ca -ArgumentList $u -ScriptBlock {
  param($u)
  Import-Module ActiveDirectory
  Disable-ADAccount -Identity $u
  Remove-ADGroupMember -Identity 'SSO-Portal-Users' -Members $u -Confirm:$false -ErrorAction SilentlyContinue
  Get-ADUser $u -Properties Enabled,MemberOf | Select-Object Name,Enabled
}
```

**ผลที่ตัดทันที:** เข้าเครื่องคอมพิวเตอร์ · ไฟล์แชร์ · SSL VPN · Company Portal ทาง AD · SAP on Web และ osTicket ทาง SSO

---

### 2. SSL VPN — ตัดเซสชันที่ยังค้างอยู่  ⏱️ 1 นาที

การปิด AD ไม่ได้เตะคนที่ต่อ VPN ค้างอยู่ออก ต้องตัดเอง

- Zyxel `192.168.0.254` → **MONITOR → VPN Monitor → SSL**
- หาแถวชื่อผู้ใช้นั้น → **Disconnect**

---

### 3. Company Portal  ⏱️ 1 นาที

**สำคัญเป็นพิเศษถ้าคนนั้นเข้าด้วยบัญชี Google** เพราะการปิด AD ไม่มีผลกับช่องทาง Google เลย

- https://company-portal-sso.vercel.app → เมนู **จัดการผู้ใช้**
- หาชื่อ → ปิดสวิตช์ **เปิดใช้งาน** (is_active)

ระบบบังคับที่ระดับฐานข้อมูลด้วย (RLS) ไม่ใช่แค่ซ่อนหน้าจอ — ปิดแล้วเข้าไม่ได้จริง

---

### 4. SAP on Web  ⏱️ 2 นาที

⚠️ **ปิด AD อย่างเดียวไม่พอ** — เครื่อง PDA ในคลังใช้ PIN ซึ่งตรวจกับทะเบียนในแอป ไม่ได้ตรวจกับ AD

- `http://sv000itd24/Sale/SAPWeb/users_auth.php`
- หาชื่อผู้ใช้ → **ปิดใช้งานบัญชี** และ **ล้าง PIN**

---

### 5. osTicket  ⏱️ 3 นาที

⚠️ **ปิด AD อย่างเดียวไม่พอ** — บัญชีใน osTicket มีรหัสผ่านของตัวเองแยกต่างหาก

**ถ้าเป็นผู้ใช้ทั่วไป (แจ้งปัญหา)**
- `http://192.168.0.250/osticket/scp/users.php` → ค้นชื่อ → **Manage Account**
- ติ๊ก **Administratively Locked** → Save
- **ห้ามลบบัญชี** เพราะตั๋วเดิมจะเสียประวัติไปด้วย

**ถ้าเป็นเจ้าหน้าที่ (agent)**
- แท็บ **Agents** → เลือกคน → ตั้งสถานะเป็น **Locked / Disabled**
- ย้ายตั๋วที่ยังเปิดอยู่ให้คนอื่นก่อน

---

### 6. แอปบนคลาวด์ 4 ตัว  ⏱️ 5 นาที

**บัญชีเหล่านี้ไม่เกี่ยวกับ AD เลย ต้องลบด้วยมือทุกตัว**

| แอป | URL | ทำอะไร |
|---|---|---|
| AntBase | https://app.antbase.co | เอาผู้ใช้ออกจาก workspace |
| Issue Hub | https://somjai-issue-hub.lovable.app | ปิด/ลบบัญชีผู้ใช้ |
| Cashflow | https://somjai-cashflow-live.pattanansap.chatgpt.site | ปิด/ลบบัญชีผู้ใช้ |
| Asset Registry | https://asset-registry-hub.vercel.app | ปิด/ลบบัญชีผู้ใช้ |

> แอปเหล่านี้ล็อกอินด้วยบัญชี Google หรืออีเมล+รหัสผ่านของตัวเอง
> **การปิดบัญชี AD ไม่มีผลใด ๆ กับมัน** — นี่คือช่องโหว่ที่ใหญ่ที่สุดของกระบวนการนี้
> จนกว่าจะทำ SSO ให้แอปกลุ่มนี้ได้ ขั้นตอนนี้ต้องทำมือทุกครั้งและห้ามลืม

---

### 7. อื่น ๆ ตามกรณี  ⏱️ ตามจริง

- คืนเครื่องคอมพิวเตอร์ / โน้ตบุ๊ก / โทรศัพท์ / เครื่อง PDA
- คืนกุญแจ คีย์การ์ด
- โอนสิทธิ์เจ้าของเอกสารและงานที่ค้าง
- ถ้ามีสิทธิ์ในระบบภายนอก (GitHub, Vercel, Supabase, DynDNS, ผู้ให้บริการอื่น) ให้ถอดออกด้วย
- ถ้าคนนั้นเป็นผู้ดูแลระบบ ให้เปลี่ยนรหัสผ่านของบัญชีที่ใช้ร่วมกันทุกตัว

---

## ตรวจสอบหลังทำเสร็จ

```powershell
# 1) บัญชี AD ต้องเป็น Enabled = False
$ca = Get-Credential SOMJAIAD01\administrator
Invoke-Command -ComputerName SV000ITD01.SOMJAIAD01.LOCAL -Credential $ca -ScriptBlock {
  Import-Module ActiveDirectory
  Get-ADUser 'ชื่อผู้ใช้' -Properties Enabled,MemberOf |
    Select-Object Name, Enabled, @{n='กลุ่ม';e={($_.MemberOf | Measure-Object).Count}}
}
```

- [ ] AD `Enabled = False` และไม่อยู่ในกลุ่ม `SSO-Portal-Users`
- [ ] ไม่มีเซสชัน SSL VPN ค้างอยู่
- [ ] Company Portal ขึ้นสถานะปิดใช้งาน
- [ ] SAP on Web ปิดบัญชีและล้าง PIN แล้ว
- [ ] osTicket ล็อกบัญชีแล้ว และย้ายตั๋วที่ค้างแล้ว
- [ ] ลบออกจากแอปคลาวด์ครบทั้ง 4 ตัว
- [ ] คืนอุปกรณ์ครบ

---

## บันทึกการดำเนินการ

เก็บไว้เป็นหลักฐานว่าทำครบทุกข้อ ใครทำ เมื่อไร

| วันที่ | ชื่อพนักงาน | ผู้ดำเนินการ | ครบทุกข้อ | หมายเหตุ |
|---|---|---|---|---|
| | | | ☐ | |
| | | | ☐ | |

---

## สิ่งที่จะทำให้เอกสารนี้สั้นลงในอนาคต

ถ้าทำ SSO ให้แอปคลาวด์ทั้ง 4 ตัวสำเร็จ (ผูกกับ Auth0 ซึ่งต่อกับ AD)
**ข้อ 6 จะหายไปทั้งข้อ** — ปิดบัญชี AD ครั้งเดียวตัดสิทธิ์ทุกระบบพร้อมกัน

ปัจจุบันติดที่สิทธิ์เข้าถึงโปรเจกต์ Supabase ของผู้พัฒนา ดูรายละเอียดใน `HANDOVER-INTRANET-SSO.md`
