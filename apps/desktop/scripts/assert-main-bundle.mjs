import { readFile } from 'node:fs/promises'
import { URL } from 'node:url'

const bundle = await readFile(new URL('../out/main/index.js', import.meta.url), 'utf8')
const failures = [...bundle.matchAll(/Could not resolve "([^"]+)" imported by "([^"]+)"/g)].map(
  (match) => `${match[1]} imported by ${match[2]}`,
)

if (failures.length > 0) {
  throw new Error(`Electron main bundle contains unresolved modules:\n${failures.join('\n')}`)
}

globalThis.process.stdout.write('electron_main_bundle=resolved\n')
