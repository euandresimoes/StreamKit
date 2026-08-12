import { resolve } from 'node:path'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    alias: {
      '@streamkit/contracts': resolve(__dirname, '../../packages/contracts/src/index.ts'),
    },
  },
  build: {
    emptyOutDir: true,
    outDir: 'dist',
  },
  plugins: [vue()],
})
