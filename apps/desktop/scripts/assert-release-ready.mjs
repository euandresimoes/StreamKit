import { execFileSync } from 'node:child_process'

const status = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim()
if (status) throw new Error('Release requires a clean Git worktree')
const tag = globalThis.process.env.GITHUB_REF_NAME ?? ''
if (tag && !/^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(tag))
  throw new Error(`Release tag is not SemVer: ${tag}`)
if (
  globalThis.process.env.GITHUB_ACTIONS === 'true' &&
  globalThis.process.env.STREAMKIT_PIPELINE_GREEN !== 'true'
)
  throw new Error('Release requires the validated CI job')
