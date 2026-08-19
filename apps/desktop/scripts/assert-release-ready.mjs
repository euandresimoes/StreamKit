import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { URL, fileURLToPath } from 'node:url'

const status = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim()
if (status) throw new Error('Release requires a clean Git worktree')
const tag = globalThis.process.env.GITHUB_REF_NAME ?? ''
if (tag && !/^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(tag))
  throw new Error(`Release tag is not SemVer: ${tag}`)
if (tag) {
  const packageJson = JSON.parse(
    await readFile(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8'),
  )
  if (packageJson.version !== tag.slice(1))
    throw new Error(
      `Desktop package version ${packageJson.version} does not match release tag ${tag}`,
    )
}
if (
  globalThis.process.env.GITHUB_ACTIONS === 'true' &&
  globalThis.process.env.STREAMLET_PIPELINE_GREEN !== 'true'
)
  throw new Error('Release requires the validated CI job')
