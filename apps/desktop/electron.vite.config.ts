import { resolve } from 'node:path'

import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

const optionalNestModule = resolve(__dirname, 'src/main/optional-nest-module.ts')

const bundledWorkspaceDependencies = [
  '@renderizer/core',
  '@renderizer/vue',
  '@streamlet/backend',
  '@streamlet/config',
  '@streamlet/contracts',
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
        '@streamlet/backend': resolve(__dirname, '../backend/src/main.ts'),
        '@streamlet/config': resolve(__dirname, '../../packages/config/src/index.ts'),
        '@streamlet/contracts': resolve(__dirname, '../../packages/contracts/src/index.ts'),
        'class-transformer/storage': resolve(
          __dirname,
          '../backend/node_modules/class-transformer/cjs/storage.js',
        ),
        '@nestjs/microservices/microservices-module': optionalNestModule,
        '@nestjs/microservices': optionalNestModule,
        '@nestjs/platform-express': optionalNestModule,
        '@nestjs/websockets/socket-module': optionalNestModule,
        '@fastify/static': optionalNestModule,
        '@fastify/view': optionalNestModule,
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
        '@streamlet/contracts': resolve(__dirname, '../../packages/contracts/src/index.ts'),
      },
    },
  },
})
