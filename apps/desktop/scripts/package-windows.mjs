import { spawnSync } from 'node:child_process'
import { URL } from 'node:url'

function run(command, arguments_) {
  return spawnSync(command, arguments_, {
    cwd: new URL('..', import.meta.url),
    shell: true,
    stdio: 'inherit',
  })
}

const build = run('pnpm', ['build'])
if (build.status !== 0) globalThis.process.exit(build.status ?? 1)
const packaged = run('electron-builder', [
  '--win',
  'nsis',
  '--publish',
  'never',
  ...globalThis.process.argv.slice(2),
])
const restored = run('pnpm', ['native:node'])
if (restored.status !== 0) globalThis.process.exit(restored.status ?? 1)
globalThis.process.exit(packaged.status ?? 1)
