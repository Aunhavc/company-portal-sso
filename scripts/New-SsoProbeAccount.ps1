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
  [string]$CredentialFile = "$env:USERPROFILE\ad-admin.cred.xml",
  # นโยบายโดเมนกำหนดขั้นต่ำไว้ 8 (ตรวจเมื่อ 2 พ.ย. 2569 ด้วย Get-ADDefaultDomainPasswordPolicy)
  [int]$MinPasswordLength = 8,
  # ให้สคริปต์สุ่มรหัสผ่านที่ผ่านนโยบายแน่นอน แล้วแสดงครั้งเดียวเพื่อก๊อปไปใส่ GitHub Secrets
  [switch]$GeneratePassword
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

# ---- ฟังก์ชันถามรหัสผ่านสองครั้งแล้วเทียบ ----
# ตรวจเฉพาะสิ่งที่ตรวจได้ฝั่งนี้ (ความยาว / สองครั้งตรงกัน / ไม่มีชื่อบัญชีอยู่ในรหัส)
# ส่วนความซับซ้อนที่เหลือ DC เป็นคนตัดสิน ถ้าไม่ผ่านจะวนมาถามใหม่
function Read-ProbePassword {
  param([string]$Sam, [int]$MinLen)
  while ($true) {
    $p1 = Read-Host -AsSecureString "ตั้งรหัสผ่านของ $Sam (อย่างน้อย $MinLen ตัว)"
    $p2 = Read-Host -AsSecureString 'พิมพ์รหัสผ่านอีกครั้งเพื่อยืนยัน'
    $b1 = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($p1)
    $b2 = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($p2)
    try {
      $s1 = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b1)
      $s2 = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b2)
      $len   = $s1.Length
      $same  = $s1 -ceq $s2
      # นโยบายความซับซ้อนของวินโดวส์ห้ามมีส่วนของชื่อบัญชีอยู่ในรหัสผ่าน
      $parts = @($Sam) + ($Sam -split '[._-]') | Where-Object { $_.Length -ge 3 }
      $hasName = $false
      foreach ($w in $parts) { if ($s1 -match [regex]::Escape($w)) { $hasName = $true; break } }
      # นับกลุ่มอักขระ ต้องได้อย่างน้อย 3 จาก 4 กลุ่ม
      $groups = 0
      if ($s1 -cmatch '[a-z]')            { $groups++ }
      if ($s1 -cmatch '[A-Z]')            { $groups++ }
      if ($s1 -match '[0-9]')             { $groups++ }
      if ($s1 -match '[^a-zA-Z0-9]')      { $groups++ }
    } finally {
      [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b1)
      [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b2)
      $s1 = $null; $s2 = $null
    }
    if (-not $same)       { Write-Host 'สองครั้งไม่ตรงกัน ลองใหม่' -ForegroundColor Yellow; continue }
    if ($len -lt $MinLen) { Write-Host "สั้นเกินไป ($len ตัว) ต้องอย่างน้อย $MinLen" -ForegroundColor Yellow; continue }
    if ($hasName)         { Write-Host "ห้ามมีส่วนของชื่อบัญชี ($Sam) อยู่ในรหัสผ่าน" -ForegroundColor Yellow; continue }
    if ($groups -lt 3)    { Write-Host "ต้องมีอักขระจากอย่างน้อย 3 ใน 4 กลุ่ม (ตอนนี้ได้ $groups) คือ พิมพ์เล็ก พิมพ์ใหญ่ ตัวเลข สัญลักษณ์" -ForegroundColor Yellow; continue }
    Write-Host "รับรหัสผ่านแล้ว ความยาว $len ตัว · ครบ $groups กลุ่มอักขระ (ไม่แสดงค่า)"
    return $p1
  }
}

# ---- สุ่มรหัสผ่านที่ผ่านนโยบายแน่นอน ----
# ไม่ใช้อักขระที่สับสนเวลาอ่าน (0 O o 1 l I) และเลี่ยงสัญลักษณ์ที่ทำให้ชีวิตยากใน shell
function New-CompliantPassword {
  param([int]$Length = 20)
  $lower  = 'abcdefghijkmnpqrstuvwxyz'
  $upper  = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  $digit  = '23456789'
  $symbol = '!#%+=?@'
  $all = $lower + $upper + $digit + $symbol
  $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
  $pick = {
    param($set)
    $b = [byte[]]::new(4)
    $rng.GetBytes($b)
    $set[[int]([BitConverter]::ToUInt32($b, 0) % $set.Length)]
  }
  while ($true) {
    $chars = @((& $pick $lower), (& $pick $upper), (& $pick $digit), (& $pick $symbol))
    while ($chars.Count -lt $Length) { $chars += (& $pick $all) }
    # สลับลำดับให้ตำแหน่งของแต่ละกลุ่มไม่คงที่
    $s = -join ($chars | Sort-Object { Get-Random })
    if ($s -notmatch 'sso|probe|svc') { return $s }
  }
}

# ---- ลงมือที่ DC · ถ้า DC ปฏิเสธรหัสผ่าน ให้ถามใหม่ไม่ต้องรันสคริปต์ซ้ำ ----
$result = $null
$plainGenerated = $null
for ($attempt = 1; $attempt -le 3; $attempt++) {
  if ($GeneratePassword) {
    $plainGenerated = New-CompliantPassword -Length 20
    $pwd = ConvertTo-SecureString $plainGenerated -AsPlainText -Force
    Write-Host 'สุ่มรหัสผ่านให้แล้ว ยาว 20 ตัว ครบทุกกลุ่มอักขระ'
  } else {
    $pwd = Read-ProbePassword -Sam $SamAccountName -MinLen $MinPasswordLength
  }
  try {
    $result = Invoke-Command -ComputerName $Server -Credential $cred -ArgumentList $SamAccountName,$DisplayName,$Mail,$Group,$pwd -ScriptBlock {
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
    break
  } catch {
    $msg = $_.Exception.Message
    if ($msg -match 'length, complexity, or history' -or $_.FullyQualifiedErrorId -match 'PasswordComplexity|1325') {
      Write-Host ''
      Write-Host "DC ปฏิเสธรหัสผ่านนี้ (ครั้งที่ $attempt จาก 3)" -ForegroundColor Yellow
      Write-Host 'นโยบายโดเมนบังคับว่า' -ForegroundColor Yellow
      Write-Host '  - ยาวอย่างน้อย 8 ตัว'
      Write-Host '  - มีอักขระจากอย่างน้อย 3 ใน 4 กลุ่ม: พิมพ์เล็ก พิมพ์ใหญ่ ตัวเลข สัญลักษณ์'
      Write-Host "  - ห้ามมีส่วนของชื่อบัญชี ($SamAccountName) หรือชื่อที่แสดงอยู่ในรหัสผ่าน"
      Write-Host '  - ห้ามซ้ำกับรหัสเก่าที่เคยใช้ (history)'
      Write-Host ''
      if ($attempt -lt 3) { continue }
      Write-Host 'ครบ 3 ครั้งแล้ว หยุดไว้ก่อนเพื่อไม่ให้ลองไปเรื่อย ๆ' -ForegroundColor Red
      exit 1
    }
    throw
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
  if ($plainGenerated) {
    Write-Host '  AUTH0_PROBE_PASSWORD = ' -NoNewline
    Write-Host $plainGenerated -ForegroundColor Cyan
    Write-Host ''
    Write-Host 'รหัสผ่านข้างบนแสดงครั้งเดียว ก๊อปไปใส่ GitHub Secrets ทันที' -ForegroundColor Yellow
    Write-Host 'อย่าวางลงในแชทหรือที่อื่นใด และปิดหน้าต่างนี้เมื่อใส่เสร็จ' -ForegroundColor Yellow
  } else {
    Write-Host '  AUTH0_PROBE_PASSWORD = รหัสผ่านที่เพิ่งตั้ง'
  }
  Write-Host 'หน้าใส่ค่า: https://github.com/Aunhavc/company-portal-sso/settings/secrets/actions'
} else {
  Write-Host 'ยังไม่พร้อม — ดูค่าข้างบนว่าข้อไหนไม่เป็นไปตามที่ต้องการ' -ForegroundColor Red
  exit 1
}
