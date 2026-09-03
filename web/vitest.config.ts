import { defineConfig } from 'vitest/config'

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // ค่าจำลองให้ครบเหมือนของจริง เพื่อให้เทสต์เดินผ่านเส้นทาง "โหมด live"
    // ไม่ใช่เส้นทางโหมดสาธิต ซึ่งจะไม่ได้ทดสอบโค้ดที่ใช้งานจริงเลย
    env: {
      VITE_AUTH0_DOMAIN: 'test-tenant.us.auth0.com',
      VITE_AUTH0_CLIENT_ID: 'test-client-id',
      VITE_AUTH0_AUDIENCE: 'https://api.test.local',
      VITE_AUTH0_AD_CONNECTION: 'test-ad',
      VITE_SUPABASE_URL: 'https://test-project.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'sb_publishable_test_key',
    },
  },
})
