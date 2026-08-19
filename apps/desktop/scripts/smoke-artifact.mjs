import { access, readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { createHash } from 'node:crypto'

const directory = join(import.meta.dirname, '..', 'release')
const packageJson = JSON.parse(
  await readFile(join(import.meta.dirname, '..', 'package.json'), 'utf8'),
)
const files = await readdir(directory)
const installer = `Streamlet-${packageJson.version}-x64-setup.exe`
const metadata = files.find(
  (file) =>
    (packageJson.version.includes('-') ? file === 'beta.yml' : file === 'latest.yml') &&
    files.includes(file),
)
if (!files.includes(installer) || !metadata)
  throw new Error('Installer or updater metadata missing')
await access(join(directory, installer))
const digest = createHash('sha256')
  .update(await readFile(join(directory, installer)))
  .digest('hex')
await readFile(join(directory, metadata), 'utf8').then((value) => {
  if (!value.includes(`version: ${packageJson.version}`) || !value.includes('sha512:'))
    throw new Error('Updater metadata is stale or missing its checksum')
})
globalThis.console.log(`artifact=${installer} sha256=${digest}`)
