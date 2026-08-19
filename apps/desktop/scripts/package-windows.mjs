import { spawnSync } from 'node:child_process'
import { rm } from 'node:fs/promises'
import { URL } from 'node:url'

await rm(new URL('../release', import.meta.url), { recursive: true, force: true })

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
  ...(globalThis.process.env.STREAMLET_RELEASE_CHANNEL
    ? [`--config.publish.channel=${globalThis.process.env.STREAMLET_RELEASE_CHANNEL}`]
    : []),
  ...globalThis.process.argv.slice(2),
])
globalThis.process.exit(packaged.status ?? 1)
