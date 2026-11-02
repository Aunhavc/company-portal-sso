<#
.SYNOPSIS
  เปิด SSO ให้ SAP on Web โดยไม่แตะไฟล์ของผู้พัฒนาเลย

.DESCRIPTION
  ปัญหาเดิม: SAPWeb ถูกเปลี่ยนเป็น Anonymous ทั้งแอปเมื่อ 22 ต.ค. 2569
  (web.config ของผู้พัฒนา + ไฟล์สำรองชื่อ web.config.bak-20261022-anon)
  ทำให้ SSO ดับ ผู้ใช้เจอฟอร์มล็อกอินของแอปเอง

  ทำไมไม่ใช้ virtual directory เหมือน Sale System:
  ลองแล้ว 2 พ.ย. 2569 ได้ HTTP 500 body 0 ไบต์ เพราะโฟลเดอร์ SAPWeb มี web.config
  ที่ประกาศ <authentication> อยู่แล้ว ชนกับค่าที่ตั้งใน applicationHost.config
  (ตรงกับที่ผู้พัฒนาเขียนเตือนไว้ในไฟล์ของเขาเอง)

  วิธีที่ใช้แทน: สร้างโฟลเดอร์ใหม่ที่เป็นของเรา ข้างในมี web.config ของเราเอง
  เปิด Windows Auth แล้ววางไฟล์เล็ก ๆ ที่ require bootstrap ของแอป (inc/config.php)
  ซึ่งจะเรียก auth_require() -> auth_bootstrap() อ่าน AUTH_USER แล้วตั้ง session ให้
  จากนั้นเด้งกลับไปหน้างานปกติ

  ใช้ได้เพราะ inc/auth.php ตั้ง session cookie เป็น path '/' (ตรวจแล้ว)
  session จึงข้ามโฟลเดอร์ได้ · โฟลเดอร์แอปยังเป็น Anonymous ตามเดิม
  เครื่อง PDA และมือถือไม่กระทบ

  รันซ้ำได้

.NOTES
  ห้ามใช้ 2>&1 กับ appcmd — PowerShell 5.1 จะห่อ stderr เป็น ErrorRecord
  แล้วทำให้ถือว่าคำสั่งล้มเหลวทั้งที่ exit code เป็น 0 (เจอจริง 2 พ.ย. 2569
  สคริปต์รุ่นแรกหยุดกลางทางเพราะเรื่องนี้)

  เอกสาร: docs/HANDOVER-INTRANET-SSO.md หัวข้อ 3
#>
[CmdletBinding()]
param(
  [string]$Server         = 'SV000ITD24.SOMJAIAD01.LOCAL',
  [string]$SsoFolder      = 'C:\inetpub\wwwroot\Sale\sapweb-sso',
  [string]$CredentialFile = "$env:USERPROFILE\ad-admin.cred.xml",
  [string]$StaleVdir      = 'Default Web Site/Sale/SAPWeb/sso'
)

if (Test-Path $CredentialFile) { $cred = Import-Clixml $CredentialFile }
else { $cred = Get-Credential -Message 'บัญชีผู้ดูแลโดเมน' }

$lines = Invoke-Command -ComputerName $Server -Credential $cred -ArgumentList $SsoFolder,$StaleVdir -ScriptBlock {
  param($ssoDir, $staleVdir)
  $ErrorActionPreference = 'Continue'
  $appcmd = "$env:windir\system32\inetsrv\appcmd.exe"
  $out = New-Object System.Collections.ArrayList
  function say($t) { [void]$out.Add($t) }

  # ============ 1. เขียนไฟล์ของเราก่อน ไม่พึ่ง appcmd ============
  try {
    if (-not (Test-Path $ssoDir)) { New-Item -ItemType Directory -Path $ssoDir -Force | Out-Null }
    say "[1] โฟลเดอร์ $ssoDir พร้อม"
  } catch { say "[1] สร้างโฟลเดอร์ไม่ได้: $($_.Exception.Message)" }

  $webConfig = @'
<?xml version="1.0" encoding="UTF-8"?>
<!--
  โฟลเดอร์นี้เป็นทางเข้า SSO ของ SAP on Web และเป็นของทีมภายใน
  ผู้พัฒนาภายนอกไม่ได้แก้ไฟล์ในโฟลเดอร์นี้ จึงไม่ถูกทับเวลาเขา deploy ใหม่
  โฟลเดอร์ของแอปจริง (..\SAPWeb) ยังเป็น Anonymous ตามที่เขาตั้งไว้ ไม่ถูกแตะ
-->
<configuration>
  <system.webServer>
    <security>
      <authentication>
        <windowsAuthentication enabled="true" />
        <anonymousAuthentication enabled="false" />
      </authentication>
    </security>
    <directoryBrowse enabled="false" />
    <defaultDocument>
      <files>
        <clear />
        <add value="index.php" />
      </files>
    </defaultDocument>
  </system.webServer>
</configuration>
'@

  $indexPhp = @'
<?php
/**
 * ทางเข้า SSO ของ SAP on Web — ไฟล์นี้เป็นของทีมภายใน ไม่ใช่ของผู้พัฒนาแอป
 *
 * IIS บังคับ Windows Authentication ที่โฟลเดอร์นี้ (ดู web.config ข้าง ๆ)
 * จึงมี $_SERVER['AUTH_USER'] ส่งมาถึง PHP
 * การ require inc/config.php ของแอปจะไปเรียก auth_require() -> auth_bootstrap()
 * ซึ่งอ่าน AUTH_USER แล้วตั้ง session ให้เอง โดยไม่ต้องแก้โค้ดของแอปเลย
 *
 * ถ้าบัญชีนั้นไม่มีในตาราง WEB_ADUser แอปจะเด้งไป login.php
 * ซึ่งมีไฟล์ตัวส่งต่ออยู่ในโฟลเดอร์นี้แล้ว กันหน้า 404
 */
$app = realpath(__DIR__ . '/../SAPWeb');
if ($app === false) { http_response_code(500); exit('ไม่พบโฟลเดอร์ของแอป'); }

chdir($app);
require $app . '/inc/config.php';

$next = isset($_GET['next']) ? (string)$_GET['next'] : '';
$safe = '/Sale/SAPWeb/';
if ($next !== '' && strpos($next, '//') === false && strpos($next, '/Sale/SAPWeb/') === 0) {
    $safe = $next;   /* รับเฉพาะ path ภายในแอปเท่านั้น กันเด้งออกนอกเว็บ */
}
header('Location: ' . $safe, true, 302);
'@

  $loginPhp = @'
<?php
/* แอปเด้งมา login.php แบบ path สัมพัทธ์เมื่อบัญชีไม่มีสิทธิ์
   ส่งต่อไปหน้าล็อกอินจริงของแอป กันผู้ใช้เจอ 404 */
header('Location: /Sale/SAPWeb/login.php', true, 302);
'@

  # PHP ต้องไม่มี BOM ไม่งั้น byte นำหน้าจะหลุดออกก่อน header() แล้ว redirect ไม่ทำงาน
  $utf8NoBom = New-Object System.Text.UTF8Encoding $false
  foreach ($f in @(@{n='web.config';c=$webConfig}, @{n='index.php';c=$indexPhp}, @{n='login.php';c=$loginPhp})) {
    try {
      [IO.File]::WriteAllText((Join-Path $ssoDir $f.n), $f.c, $utf8NoBom)
      say ("[2] เขียน {0} แล้ว {1} bytes" -f $f.n, (Get-Item (Join-Path $ssoDir $f.n)).Length)
    } catch { say "[2] เขียน $($f.n) ไม่ได้: $($_.Exception.Message)" }
  }

  # ============ 2. ถอน vdir ที่ลองไว้แล้วได้ 500 ============
  # ไม่ใช้ 2>&1 เด็ดขาด · อ่านผลจาก LASTEXITCODE แทน
  $vdirs = & $appcmd list vdir
  if ($vdirs -match [regex]::Escape($staleVdir)) {
    & $appcmd delete vdir "$staleVdir" | Out-Null
    say ("[3] delete vdir exit={0}" -f $LASTEXITCODE)
    foreach ($sec in 'windowsAuthentication','anonymousAuthentication') {
      & $appcmd clear config "$staleVdir" /section:$sec /commit:apphost | Out-Null
      say ("[3] clear {0} exit={1}" -f $sec, $LASTEXITCODE)
    }
  } else {
    say '[3] ไม่มี vdir เดิมค้างอยู่'
  }
  $after = & $appcmd list vdir
  say ("[3] ยังเหลือ vdir SAPWeb/sso: {0}" -f [bool]($after -match [regex]::Escape($staleVdir)))

  # ============ 3. ตรวจผลจากในเครื่องเอง ============
  foreach ($u in @('http://localhost/Sale/sapweb-sso/','http://localhost/Sale/SAPWeb/','http://localhost/Sale/SAPWeb/pda_scan/api_ping.php')) {
    try {
      $r = Invoke-WebRequest $u -UseBasicParsing -TimeoutSec 15 -MaximumRedirection 0 -ErrorAction Stop
      say ("[4] {0,-50} HTTP {1}" -f $u, $r.StatusCode)
    } catch {
      $resp = $_.Exception.Response
      if ($resp) {
        $wa = $resp.Headers['WWW-Authenticate']
        say ("[4] {0,-50} HTTP {1}{2}" -f $u, [int]$resp.StatusCode, $(if ($wa) { "  WWW-Authenticate: $wa" } else { '' }))
      } else { say ("[4] {0,-50} {1}" -f $u, $_.Exception.Message) }
    }
  }
  $out
}

$lines | ForEach-Object { Write-Host "  $_" }
Write-Host ''
Write-Host 'ผลที่ต้องการ' -ForegroundColor Cyan
Write-Host '  /Sale/sapweb-sso/   = 401 พร้อม WWW-Authenticate (บังคับตัวตน)'
Write-Host '  /Sale/SAPWeb/       = 302 ไป login.php เหมือนเดิม (ของผู้พัฒนาไม่ถูกแตะ)'
Write-Host '  pda_scan/api_ping   = 200 เหมือนเดิม (เครื่อง PDA ใช้ได้ต่อ)'
