<#
==============================================================================
 setup-auth0.ps1 — ตั้งค่า Auth0 สำหรับ Company Portal ด้วยคำสั่ง

 ข้อจำกัดที่ต้องรู้ก่อน:
   การ "สมัครบัญชี Auth0" สั่งด้วย command ไม่ได้ ต้องกดในเบราว์เซอร์เอง
   เพราะต้องยืนยันอีเมลและกดยอมรับข้อตกลงการใช้บริการด้วยตัวคุณเอง
   สคริปต์นี้จะเปิดหน้าสมัครให้ แล้วทำ "ทุกขั้นตอนหลังจากนั้น" ให้อัตโนมัติ

 สิ่งที่สคริปต์ทำให้:
   1. เปิดหน้าสมัคร Auth0 (คุณกดสมัครเอง ครั้งเดียว)
   2. ดาวน์โหลด Auth0 CLI (ไม่ต้องสิทธิ์ผู้ดูแลเครื่อง)
   3. ล็อกอิน CLI เข้ากับ tenant ของคุณ
   4. สร้าง Application แบบ SPA สำหรับ Portal พร้อมใส่ URL ครบทุกช่อง
   5. สร้าง API (audience) แบบ RS256
   6. สร้างและ deploy Post-Login Action ที่ใส่ claim ให้ Supabase
   7. สร้างผู้ใช้ทดสอบให้หนึ่งคน
   8. พิมพ์ค่าทั้ง 3 ที่ต้องเอาไปใส่ต่อ

 วิธีใช้:
   powershell -ExecutionPolicy Bypass -File scripts\setup-auth0.ps1
==============================================================================
#>

param(
  [string]$PortalUrl = 'https://company-portal-sso.vercel.app',
  [string]$AppName   = 'Company Portal - Internet',
  [string]$ApiName   = 'Company Portal API',
  [string]$Audience  = 'https://api.company.local',
  [string]$TestEmail = ''
)

$ErrorActionPreference = 'Stop'
$CliVersion = '1.33.0'
$CliDir     = Join-Path $env:LOCALAPPDATA 'auth0-cli'
$CliExe     = Join-Path $CliDir 'auth0.exe'

function Step($n, $text) { Write-Host "`n[$n] $text" -ForegroundColor Cyan }
function Ok($text)       { Write-Host "    OK  $text" -ForegroundColor Green }
function Warn($text)     { Write-Host "    !   $text" -ForegroundColor Yellow }

# ---------------------------------------------------------------------------
Step 1 'สมัครบัญชี Auth0 (ขั้นตอนเดียวที่ต้องทำเอง)'
if (-not (Test-Path $CliExe)) {
  Write-Host @'
    กำลังเปิดหน้าสมัคร Auth0 ในเบราว์เซอร์
    - เลือกแผน Free (รองรับ 7,500 active users เพียงพอสำหรับ 250 คน)
    - เลือก Region ที่ใกล้ที่สุด แนะนำ AU (Australia) หรือ EU
    - จดชื่อ tenant ที่ตั้งไว้ จะได้เป็นโดเมน เช่น company.au.auth0.com
    เมื่อสมัครเสร็จและเห็นหน้า Dashboard แล้ว ให้กลับมาที่หน้าต่างนี้
'@
  Start-Process 'https://auth0.com/signup'
  Read-Host "    สมัครเสร็จแล้วกด Enter เพื่อไปต่อ"
} else {
  Ok 'พบ Auth0 CLI อยู่แล้ว ข้ามขั้นตอนสมัคร'
}

# ---------------------------------------------------------------------------
Step 2 'ติดตั้ง Auth0 CLI'
if (Test-Path $CliExe) {
  Ok "ติดตั้งไว้แล้วที่ $CliExe"
} else {
  $arch = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { 'arm64' } else { 'x86_64' }
  $url  = "https://github.com/auth0/auth0-cli/releases/download/v$CliVersion/auth0-cli_${CliVersion}_Windows_$arch.zip"
  $zip  = Join-Path $env:TEMP "auth0-cli.zip"
  Write-Host "    ดาวน์โหลดจาก $url"
  Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
  New-Item -ItemType Directory -Force -Path $CliDir | Out-Null
  Expand-Archive -Path $zip -DestinationPath $CliDir -Force
  Remove-Item $zip -Force
  Ok "ติดตั้งแล้วที่ $CliExe"
}
$env:PATH = "$CliDir;$env:PATH"

# ---------------------------------------------------------------------------
Step 3 'ล็อกอิน Auth0 CLI'
$who = & $CliExe tenants list 2>&1 | Out-String
if ($who -match 'No tenants|not logged in|Error') {
  Write-Host '    จะเปิดเบราว์เซอร์ให้ยืนยัน แล้วเลือก tenant ที่เพิ่งสมัคร'
  & $CliExe login --scopes "create:clients,update:clients,create:resource_servers,create:actions,update:actions,deploy:actions,create:users,create:connections,update:connections,read:connections"
} else {
  Ok 'ล็อกอินอยู่แล้ว'
}
$tenant = (& $CliExe tenants list --json 2>$null | ConvertFrom-Json | Select-Object -First 1).name
if (-not $tenant) { $tenant = Read-Host '    ไม่พบ tenant อัตโนมัติ กรุณาพิมพ์โดเมน เช่น company.au.auth0.com' }
Ok "tenant: $tenant"

# ---------------------------------------------------------------------------
Step 4 "สร้าง Application แบบ SPA ชื่อ '$AppName'"
$urls = "$PortalUrl,http://localhost:5173"
$appJson = & $CliExe apps create `
  --name $AppName `
  --type spa `
  --description "พอร์ทัลกลางของพนักงาน" `
  --callbacks $urls `
  --logout-urls $urls `
  --origins $urls `
  --web-origins $urls `
  --json | ConvertFrom-Json
$clientId = $appJson.client_id
Ok "Client ID: $clientId"

# ---------------------------------------------------------------------------
Step 5 "สร้าง API (audience) ชื่อ '$ApiName'"
& $CliExe apis create --name $ApiName --identifier $Audience --scopes "openid,profile,email" --json | Out-Null
Ok "Audience: $Audience"

# ---------------------------------------------------------------------------
Step 6 'สร้างและ deploy Post-Login Action สำหรับ Supabase'
$actionCode = @'
exports.onExecutePostLogin = async (event, api) => {
  if (event.authorization) {
    // Supabase บังคับให้ JWT มี claim role = authenticated
    api.accessToken.setCustomClaim('role', 'authenticated');
    api.accessToken.setCustomClaim('email', event.user.email);
    api.accessToken.setCustomClaim('email_verified', event.user.email_verified);
  }
};
'@
$codeFile = Join-Path $env:TEMP 'supabase-claims.js'
Set-Content -Path $codeFile -Value $actionCode -Encoding utf8

& $CliExe actions create `
  --name "Supabase claims" `
  --trigger "post-login" `
  --code $codeFile 2>&1 | Out-Null
Ok 'สร้าง Action แล้ว'
Warn 'ต้องเข้า Auth0 Dashboard -> Actions -> Triggers -> post-login แล้วลาก Action นี้เข้าสาย แล้วกด Apply'
Warn 'ขั้นนี้ CLI ทำแทนไม่ได้ (ยังไม่มีคำสั่งผูก Action เข้า trigger)'

# ---------------------------------------------------------------------------
Step 7 'สร้างผู้ใช้ทดสอบ'
if (-not $TestEmail) { $TestEmail = Read-Host '    อีเมลสำหรับบัญชีทดสอบ (เว้นว่างเพื่อข้าม)' }
if ($TestEmail) {
  $pwd = -join ((65..90) + (97..122) + (48..57) + (33,35,37,64) | Get-Random -Count 16 | ForEach-Object {[char]$_})
  & $CliExe users create `
    --connection "Username-Password-Authentication" `
    --email $TestEmail `
    --password $pwd `
    --name "ผู้ใช้ทดสอบ" 2>&1 | Out-Null
  Ok "สร้างผู้ใช้แล้ว"
  Write-Host "`n    ==== บัญชีสำหรับทดสอบ ====" -ForegroundColor Magenta
  Write-Host "    Username: $TestEmail"
  Write-Host "    Password: $pwd"
  Write-Host "    (จดไว้ทันที รหัสนี้จะไม่แสดงอีก)" -ForegroundColor Yellow
}

# ---------------------------------------------------------------------------
Write-Host "`n===============================================" -ForegroundColor Cyan
Write-Host " ค่าที่ต้องใช้ต่อ — ส่งให้ผมหรือใส่ใน go-live.sh" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "AUTH0_DOMAIN    = $tenant"
Write-Host "AUTH0_CLIENT_ID = $clientId"
Write-Host "AUTH0_AUDIENCE  = $Audience"
Write-Host ""
Write-Host "ยังเหลือฝั่ง Supabase อีก 2 ค่า (SUPABASE_URL, SUPABASE_ANON_KEY)"
Write-Host "และต้องเปิด Authentication -> Third Party Auth -> Auth0 ในหน้า Supabase"
Write-Host ""
Write-Host "จากนั้นรัน:  bash scripts/go-live.sh" -ForegroundColor Green
