import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    exclude: ['**/node_modules/**', '**/.claude/worktrees/**', 'supabase/functions/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/routeTree.gen.ts',
        'src/components/ui/**',
        'src/**/*.d.ts',
        'src/setupTests.ts',
        'src/i18n/**',
        'src/test/**',
        'src/lib/fiscalization/xmlSigner.ts',
      ],
    },
  },
})
