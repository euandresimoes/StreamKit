import { access } from 'node:fs/promises'

import { Injectable } from '@nestjs/common'
import { CLOUDFLARED_VERSION, install, Tunnel, use } from 'cloudflared'

export type ExternalTunnelHandle = {
  onFailure?: (callback: (error: Error) => void) => void
  publicUrl: string
  stop: () => Promise<void>
}

export interface ExternalTunnelAdapter {
  start(localUrl: string): Promise<ExternalTunnelHandle>
}

@Injectable()
export class CloudflareQuickTunnelAdapter implements ExternalTunnelAdapter {
  public constructor(private readonly binaryPath?: string) {}

  public async start(localUrl: string): Promise<ExternalTunnelHandle> {
    if (this.binaryPath) {
      try {
        await access(this.binaryPath)
      } catch {
        await install(this.binaryPath, CLOUDFLARED_VERSION)
      }
      use(this.binaryPath)
    }
    const tunnel = Tunnel.quick(localUrl)
    let ready = false
    let failureCallback: ((error: Error) => void) | undefined
    const publicUrl = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        tunnel.stop()
        reject(new Error('EXTERNAL_TUNNEL_START_TIMEOUT'))
      }, 30_000)
      tunnel.once('url', (url) => {
        clearTimeout(timeout)
        ready = true
        resolve(url)
      })
      tunnel.once('error', (error) => {
        clearTimeout(timeout)
        if (ready) failureCallback?.(error)
        else reject(error)
      })
      tunnel.once('exit', () => {
        clearTimeout(timeout)
        const error = new Error('EXTERNAL_TUNNEL_EXITED_BEFORE_READY')
        if (ready) failureCallback?.(error)
        else reject(error)
      })
    })
    return {
      onFailure: (callback) => {
        failureCallback = callback
      },
      publicUrl,
      stop: async () => {
        tunnel.stop()
      },
    }
  }
}
