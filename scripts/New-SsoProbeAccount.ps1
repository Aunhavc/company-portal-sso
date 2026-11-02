<#
.SYNOPSIS
  สร้าง (หรือตั้งค่าซ้ำ) บัญชี AD สำหรับตัวตรวจสุขภาพ SSO — svc.ssoprobe

.DESCRIPTION
  รันซ้ำได้ ไม่พังถ้าบัญชีมีอยู่แล้ว · ไม่พิมพ์รหัสผ่านออกหน้าจอหรือลง log
  รหัสผ่านที่กรอกจะถูกใช้สร้างบัญชี และต้องเอาไปใส่ใน GitHub Secrets
  ชื่อ AUTH0_PROBE_PASSWORD ด้วยมืออีกครั้ง (สคริปต์ไม่ส่งไปไหนให้)

  ค่าที่ตั้งและเหตุผล
    PasswordNeverExpires  นโยบายโดเมนบังคับเปลี่ยนรหัสทุก 90 วัน
                          ถ้าไม่ตั้ง ตัวตรวจจะพังเองทุก 90 วันทั้งที่ระบบปกติ
    กลุ่ม SSO-Portal-Users  Auth0 Action ปฏิเสธคนนอกกลุ่มก่อนออกโทเคน
    mail                  พอร์ทัลใช้อีเมลเป็นกุญแจในตาราง profiles

.NOTES
  ต้องรันจากเครื่องผู้ดูแลที่คุยกับ DC ได้ · ใช้สิทธิ์โดเมนจากไฟล์ที่เก็บไว้
  เอกสารประกอบ: docs/SSO-PROBE-SETUP.md
#>
[CmdletBinding()]
param(
  [string]$SamAccountName = 'svc.ssoprobe',
  [string]$DisplayName    = 'SSO Probe (ระบบตรวจสุขภาพ SSO)',
  [string]$Mail           = 'svc.ssoprobe@somjai.co.th',
  [string]$Group          = 'SSO-Portal-Users',
  [string]$Server         = 'SV000ITD01.SOMJAIAD01.LOCAL',
  [string]$CredentialFile = "$env:USERPROFILE\ad-admin.cred.xml"
)

$ErrorActionPreference = 'Stop'

# ---- สิทธิ์โดเมน ----
if (Test-Path $CredentialFile) {
  $cred = Import-Clixml $CredentialFile
  Write-Host "ใช้สิทธิ์โดเมนจาก $CredentialFile ($($cred.UserName))"
} else {
  Write-Host "ไม่พบ $CredentialFile — ขอให้กรอกบัญชีผู้ดูแลโดเมน"
  $cred = Get-Credential -Message 'บัญชีผู้ดูแลโดเมน เช่น SOMJAIAD01\administrator'
}

# ---- รหัสผ่านของบัญชี probe: กรอกสองครั้งแล้วเทียบ ----
# นโยบายโดเมน: ยาวอย่างน้อย 8 และต้องมีความซับซ้อน — ที่นี่บังคับ 16 เพราะเป็นบัญชีระบบ
$minLen = 16
while ($true) {
  $p1 = Read-Host -AsSecureString "ตั้งรหัสผ่านของ $SamAccountName (อย่างน้อย $minLen ตัว)"
  $p2 = Read-Host -AsSecureString "พิมพ์รหัสผ่านอีกครั้งเพื่อยืนยัน"
  $b1 = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($p1)
  $b2 = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($p2)
  try {
    $s1 = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b1)
    $s2 = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b2)
    $len = $s1.Length
    $same = $s1 -ceq $s2
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b1)
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b2)
    $s1 = $null; $s2 = $null
  }
  if (-not $same)        { Write-Host 'สองครั้งไม่ตรงกัน ลองใหม่' -ForegroundColor Yellow; continue }
  if ($len -lt $minLen)  { Write-Host "สั้นเกินไป ($len ตัว) ต้องอย่างน้อย $minLen" -ForegroundColor Yellow; continue }
  Write-Host "รับรหัสผ่านแล้ว ความยาว $len ตัว (ไม่แสดงค่า)"
  break
}

# ---- ลงมือที่ DC ----
$result = Invoke-Command -ComputerName $Server -Credential $cred -ArgumentList $SamAccountName,$DisplayName,$Mail,$Group,$p1 -ScriptBlock {
  param($sam, $display, $mail, $group, $pw)
  Import-Module ActiveDirectory -ErrorAction Stop

  $upn = "$sam@somjaiad01.local"
  $existing = Get-ADUser -Filter "SamAccountName -eq '$sam'" -Properties mail, PasswordNeverExpires -ErrorAction SilentlyContinue

  if ($existing) {
    $action = 'ตั้งค่าซ้ำบัญชีเดิม'
    Set-ADAccountPassword -Identity $sam -Reset -NewPassword $pw
    Set-ADUser -Identity $sam -PasswordNeverExpires $true -Enabled $true -EmailAddress $mail -Description 'บัญชีสำหรับตัวตรวจสุขภาพ SSO — ห้ามใช้ล็อกอินจริง'
  } else {
    $action = 'สร้างบัญชีใหม่'
    New-ADUser -Name $display -SamAccountName $sam -UserPrincipalName $upn `
      -AccountPassword $pw -Enabled $true -PasswordNeverExpires $true `
      -EmailAddress $mail `
      -Description 'บัญชีสำหรับตัวตรวจสุขภาพ SSO — ห้ามใช้ล็อกอินจริง'
  }

  # เข้ากลุ่ม — สั่งซ้ำได้ ไม่ error ถ้าเป็นสมาชิกอยู่แล้ว
  try { Add-ADGroupMember -Identity $group -Members $sam -ErrorAction Stop } catch { }

  $u = Get-ADUser -Identity $sam -Properties mail, PasswordNeverExpires, Enabled, LockedOut, MemberOf
  [pscustomobject]@{
    action               = $action
    SamAccountName       = $u.SamAccountName
    Enabled              = $u.Enabled
    LockedOut            = $u.LockedOut
    PasswordNeverExpires = $u.PasswordNeverExpires
    Mail                 = $u.mail
    InGroup              = [bool]($u.MemberOf | Where-Object { $_ -match "CN=$group," })
  }
}

Write-Host ''
Write-Host '================ ผลลัพธ์ ================'
$result | Format-List action, SamAccountName, Enabled, LockedOut, PasswordNeverExpires, Mail, InGroup

$ok = $result.Enabled -and $result.PasswordNeverExpires -and $result.InGroup -and -not $result.LockedOut
if ($ok) {
  Write-Host 'พร้อมใช้งาน' -ForegroundColor Green
  Write-Host ''
  Write-Host 'ต่อไปใส่ค่าสองตัวนี้ใน GitHub Secrets'
  Write-Host ("  AUTH0_PROBE_USERNAME = {0}    (ชื่อเปล่า ๆ ห้ามใส่ somjaiad01\ นำหน้า)" -f $result.SamAccountName)
  Write-Host '  AUTH0_PROBE_PASSWORD = รหัสผ่านที่เพิ่งตั้ง'
  Write-Host 'หน้าใส่ค่า: https://github.com/Aunhavc/company-portal-sso/settings/secrets/actions'
} else {
  Write-Host 'ยังไม่พร้อม — ดูค่าข้างบนว่าข้อไหนไม่เป็นไปตามที่ต้องการ' -ForegroundColor Red
  exit 1
}
