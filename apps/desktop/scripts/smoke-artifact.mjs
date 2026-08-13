import { access, readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createHash } from 'node:crypto'

const directory = join(import.meta.dirname, '..', 'release')
const files = await readdir(directory)
const installer = files.find((file) => file.endsWith('.exe'))
const metadata = files.find((file) => file === 'latest.yml' || file === 'beta.yml')
if (!installer || !metadata) throw new Error('Installer or updater metadata missing')
await access(join(directory, installer))
const digest = createHash('sha256')
  .update(await readFile(join(directory, installer)))
  .digest('hex')
await readFile(join(directory, metadata), 'utf8').then((value) => {
  if (!value.includes('sha512:')) throw new Error('Updater checksum missing')
})
globalThis.console.log(`artifact=${installer} sha256=${digest}`)
