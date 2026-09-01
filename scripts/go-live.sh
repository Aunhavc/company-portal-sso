#!/usr/bin/env bash
# =============================================================================
#  go-live.sh — สลับ Portal จากโหมดสาธิตไปเป็นโหมดจริง (Auth0 + Supabase)
#
#  ใช้เมื่อมีค่าจาก Auth0 และ Supabase ครบแล้ว (ดู docs/AUTH0-SETUP.md)
#  สคริปต์นี้จะ: ใส่ env บน Vercel → build → deploy production → ตรวจผล
#
#  วิธีใช้ (จากรากของโปรเจกต์):
#      bash scripts/go-live.sh
#
#  หรือกำหนดค่าล่วงหน้าแล้วรันรวดเดียว:
#      AUTH0_DOMAIN=... AUTH0_CLIENT_ID=... AUTH0_AUDIENCE=... \
#      SUPABASE_URL=... SUPABASE_ANON_KEY=... bash scripts/go-live.sh
# =============================================================================
set -euo pipefail

cd "$(dirname "$0")/.."
WEB="$PWD/web"

echo "==============================================="
echo " Company Portal — สลับไปโหมดจริง"
echo "==============================================="

ask() {                                   # ask ชื่อตัวแปร คำอธิบาย ตัวอย่าง
  local var=$1 label=$2 example=$3 current
  current="${!var:-}"
  if [ -z "$current" ]; then
    printf '\n%s\n  ตัวอย่าง: %s\n  ค่า: ' "$label" "$example"
    read -r current
  fi
  if [ -z "$current" ]; then
    echo "  ✗ ต้องกรอกค่านี้" >&2
    exit 1
  fi
  printf -v "$var" '%s' "$current"
  export "${var?}"
}

ask AUTH0_DOMAIN     "Auth0 Domain"                    "company.au.auth0.com"
ask AUTH0_CLIENT_ID  "Auth0 Client ID (แอป SPA)"       "aBcDeF123456..."
ask AUTH0_AUDIENCE   "Auth0 API Identifier (audience)" "https://api.company.local"
ask SUPABASE_URL     "Supabase Project URL"            "https://xxxx.supabase.co"
ask SUPABASE_ANON_KEY "Supabase anon public key"       "eyJhbGciOi..."

COMPANY_NAME="${COMPANY_NAME:-บริษัท ตัวอย่าง จำกัด}"

cd "$WEB"

echo
echo "--- 1/4 ใส่ environment variables บน Vercel (production) ---"
set_env() {                               # set_env ชื่อคีย์ ค่า
  local key=$1 value=$2
  npx vercel env rm "$key" production --yes >/dev/null 2>&1 || true
  printf '%s' "$value" | npx vercel env add "$key" production >/dev/null
  echo "  ✓ $key"
}
set_env VITE_AUTH0_DOMAIN      "$AUTH0_DOMAIN"
set_env VITE_AUTH0_CLIENT_ID   "$AUTH0_CLIENT_ID"
set_env VITE_AUTH0_AUDIENCE    "$AUTH0_AUDIENCE"
set_env VITE_SUPABASE_URL      "$SUPABASE_URL"
set_env VITE_SUPABASE_ANON_KEY "$SUPABASE_ANON_KEY"
set_env VITE_COMPANY_NAME      "$COMPANY_NAME"

echo
echo "--- 2/4 build ---"
npx vercel pull --yes --environment=production >/dev/null
npx vercel build --prod --yes >/dev/null
echo "  ✓ build สำเร็จ"

echo
echo "--- 3/4 deploy production ---"
DEPLOY_URL=$(npx vercel deploy --prebuilt --prod --yes 2>&1 | grep -oE 'https://[a-z0-9-]+\.vercel\.app' | tail -1)
echo "  ✓ $DEPLOY_URL"

echo
echo "--- 4/4 ตรวจผล ---"
PROD="https://company-portal-sso.vercel.app"
for i in $(seq 1 24); do
  BUNDLE=$(curl -s "$PROD/" | grep -oE '/assets/index-[^"]+\.js' | head -1) || true
  if [ -n "${BUNDLE:-}" ] && ! curl -s "$PROD$BUNDLE" | grep -q 'โหมดสาธิต — ข้อมูลเก็บ'; then
    echo "  ✓ production สลับเป็นโหมดจริงแล้ว: $PROD"
    break
  fi
  [ "$i" -eq 24 ] && echo "  ! ยังเห็น bundle เดิม ลองรีเฟรชอีกครั้งในอีกสักครู่"
  sleep 5
done

cat <<'DONE'

===============================================
 เหลืออีก 2 อย่างที่ต้องทำในหน้าเว็บของผู้ให้บริการ
===============================================
 1) Auth0 → Applications → แอป SPA → ใส่ URL ให้ครบ 4 ช่อง
      Allowed Callback URLs
      Allowed Logout URLs
      Allowed Web Origins
      Allowed Origins (CORS)
    ค่าที่ใส่: https://company-portal-sso.vercel.app

 2) ล็อกอินเข้า Portal หนึ่งครั้ง แล้วรัน supabase/migrations/0003_make_admin.sql
    (แก้อีเมลในไฟล์ให้เป็นของคุณก่อน) เพื่อให้บัญชีตัวเองเป็นผู้ดูแลระบบ

 รายละเอียดทั้งหมดอยู่ใน docs/AUTH0-SETUP.md
DONE
