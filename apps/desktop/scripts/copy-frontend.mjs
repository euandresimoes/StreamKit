import { cp, mkdir, rm } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const desktopDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = resolve(desktopDirectory, '../frontend/dist')
const destination = resolve(desktopDirectory, 'out/renderer')

if (!destination.startsWith(resolve(desktopDirectory, 'out'))) {
  throw new Error(`Invalid renderer destination: ${destination}`)
}

await rm(destination, { force: true, recursive: true })
await mkdir(destination, { recursive: true })
await cp(source, destination, { recursive: true })

globalThis.process.stdout.write(`electron_renderer=${destination}\n`)
