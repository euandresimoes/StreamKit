import { Inject, Injectable } from '@nestjs/common'
import type { WorkspaceListResponse } from '@streamkit/contracts'

import {
  WORKSPACE_REPOSITORY,
  type WorkspaceRepository,
} from '../repositories/workspace.repository'

@Injectable()
export class ListWorkspacesService {
  public constructor(
    @Inject(WORKSPACE_REPOSITORY) private readonly workspaceRepository: WorkspaceRepository,
  ) {}

  public async execute(): Promise<WorkspaceListResponse> {
    const items = await this.workspaceRepository.list()
    const persistedSelectedId = await this.workspaceRepository.selectedId()
    const selectedId = items.some((workspace) => workspace.id === persistedSelectedId)
      ? persistedSelectedId
      : (items[0]?.id ?? null)
    if (selectedId !== persistedSelectedId) await this.workspaceRepository.select(selectedId)
    return {
      items,
      selectedId,
    }
  }
}
