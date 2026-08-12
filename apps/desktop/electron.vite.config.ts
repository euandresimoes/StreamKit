import { resolve } from 'node:path'

import vue from '@vitejs/plugin-vue'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

const bundledWorkspaceDependencies = [
  '@renderizer/core',
  '@renderizer/vue',
  '@streamkit/backend',
  '@streamkit/config',
  '@streamkit/contracts',
]

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'src/main/index.ts'),
      },
    },
    plugins: [externalizeDepsPlugin({ exclude: bundledWorkspaceDependencies })],
    resolve: {
      alias: {
        '@streamkit/backend': resolve(__dirname, '../backend/src/main.ts'),
        '@streamkit/config': resolve(__dirname, '../../packages/config/src/index.ts'),
        '@streamkit/contracts': resolve(__dirname, '../../packages/contracts/src/index.ts'),
      },
    },
  },
  preload: {
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'src/preload/index.ts'),
      },
    },
    plugins: [externalizeDepsPlugin({ exclude: ['@renderizer/core', '@renderizer/vue'] })],
    resolve: {
      alias: {
        '@streamkit/contracts': resolve(__dirname, '../../packages/contracts/src/index.ts'),
      },
    },
  },
  renderer: {
    build: {
      outDir: resolve(__dirname, 'out/renderer'),
      rollupOptions: {
        input: resolve(__dirname, '../frontend/index.html'),
      },
    },
    plugins: [vue({})],
    resolve: {
      alias: {
        '@streamkit/contracts': resolve(__dirname, '../../packages/contracts/src/index.ts'),
      },
    },
    root: resolve(__dirname, '../frontend'),
  },
})
