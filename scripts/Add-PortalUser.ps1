<#
.SYNOPSIS
  เพิ่มพนักงานให้เข้าใช้งาน Company Portal (SSO) ได้ — คำสั่งเดียวจบ

.DESCRIPTION
  ทำสองอย่างที่จำเป็นให้ครบในคำสั่งเดียว: (1) ตั้งอีเมลให้บัญชี AD — พอร์ทัลต้องใช้
  อีเมลยืนยันตัวตน ไม่มีอีเมลจะล็อกอินไม่ได้ (2) เพิ่มเข้ากลุ่ม SSO-Portal-Users —
  ไม่อยู่ในกลุ่มนี้จะถูก Auth0 บล็อกตั้งแต่ก่อนออกโทเคน (ดู Action "Supabase claims")

  รันซ้ำได้อย่างปลอดภัย (idempotent) — ถ้าตั้งอีเมลไว้แล้วหรืออยู่ในกลุ่มแล้ว
  จะข้ามขั้นตอนนั้นไปโดยไม่มี error

.PARAMETER Username
  sAMAccountName ของพนักงาน เช่น 'somchai.jai' (นี่คือชื่อที่ใช้ล็อกอินพอร์ทัล
  ต้องพิมพ์เปล่า ๆ ไม่มีชื่อโดเมนนำหน้า เช่น ห้ามใส่ 'SOMJAIAD01\somchai.jai')

.PARAMETER Email
  อีเมลพนักงาน — บังคับเสมอ ไม่ว่าจะสร้างบัญชีใหม่หรือเปิดสิทธิ์บัญชีเดิม

.PARAMETER FullName
  ชื่อเต็มสำหรับแสดงใน AD เช่น 'Somchai Jaidee' — ใช้เฉพาะตอนสร้างบัญชีใหม่ (-New)

.PARAMETER New
  ระบุ flag นี้เมื่อพนักงานยังไม่มีบัญชี AD เลย จะสร้างบัญชีใหม่ให้ก่อน
  ถ้าพนักงานมีบัญชี AD อยู่แล้ว ไม่ต้องใส่ flag นี้

.PARAMETER Domain
  โดเมนสำหรับ UPN เมื่อสร้างบัญชีใหม่ ค่าเริ่มต้นคือ SOMJAIAD01.LOCAL

.EXAMPLE
  # พนักงานใหม่ ยังไม่เคยมีบัญชี AD มาก่อน
  .\Add-PortalUser.ps1 -New -Username somchai.jai -FullName 'Somchai Jaidee' -Email somchai.jai@somjai.co.th

.EXAMPLE
  # พนักงานมีบัญชี AD อยู่แล้ว แค่ยังเข้าพอร์ทัลไม่ได้ (เช่น ไม่มีอีเมล หรือยังไม่อยู่ในกลุ่ม)
  .\Add-PortalUser.ps1 -Username somchai.jai -Email somchai.jai@somjai.co.th
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)] [string]$Username,
    [Parameter(Mandatory)] [string]$Email,
    [string]$FullName,
    [string]$Domain = 'SOMJAIAD01.LOCAL',
    [switch]$New
)

$ErrorActionPreference = 'Stop'
$GroupName = 'SSO-Portal-Users'

Import-Module ActiveDirectory

if ($New) {
    if (-not $FullName) {
        throw 'ต้องระบุ -FullName ด้วยเมื่อสร้างบัญชีใหม่ (-New)'
    }
    $existing = Get-ADUser -Filter "SamAccountName -eq '$Username'" -ErrorAction SilentlyContinue
    if ($existing) {
        throw "มีบัญชี '$Username' อยู่แล้วใน AD — ถ้าต้องการแค่เปิดสิทธิ์เข้าพอร์ทัล ให้รันคำสั่งนี้ใหม่โดยไม่ใส่ -New"
    }

    $securePwd = Read-Host "ตั้งรหัสผ่านชั่วคราวสำหรับ '$Username'" -AsSecureString
    New-ADUser -Name $FullName -SamAccountName $Username `
        -UserPrincipalName "$Username@$Domain" -EmailAddress $Email `
        -AccountPassword $securePwd -Enabled $true -ChangePasswordAtLogon $true
    Write-Host "สร้างบัญชี AD ใหม่แล้ว: $Username ($FullName)" -ForegroundColor Green
}
else {
    $user = Get-ADUser -Filter "SamAccountName -eq '$Username'" -Properties mail -ErrorAction SilentlyContinue
    if (-not $user) {
        throw "ไม่พบบัญชี '$Username' ใน AD — ถ้าเป็นพนักงานใหม่ที่ยังไม่มีบัญชี ให้เพิ่ม flag -New"
    }
    if ($user.mail -eq $Email) {
        Write-Host "'$Username' มีอีเมลนี้ตั้งไว้อยู่แล้ว ข้ามขั้นตอนนี้" -ForegroundColor Yellow
    }
    else {
        Set-ADUser -Identity $Username -EmailAddress $Email
        Write-Host "ตั้งอีเมลให้ '$Username' เป็น $Email แล้ว" -ForegroundColor Green
    }
}

$members = Get-ADGroupMember -Identity $GroupName | Select-Object -ExpandProperty SamAccountName
if ($Username -in $members) {
    Write-Host "'$Username' อยู่ในกลุ่ม $GroupName อยู่แล้ว ข้ามขั้นตอนนี้" -ForegroundColor Yellow
}
else {
    Add-ADGroupMember -Identity $GroupName -Members $Username
    Write-Host "เพิ่ม '$Username' เข้ากลุ่ม $GroupName แล้ว" -ForegroundColor Green
}

Write-Host ''
Write-Host "เสร็จแล้ว — '$Username' เข้าใช้งาน Company Portal ได้ทันที" -ForegroundColor Cyan
Write-Host "ล็อกอินด้วยชื่อผู้ใช้ '$Username' เปล่า ๆ ไม่ต้องมีชื่อโดเมนนำหน้า" -ForegroundColor Cyan
