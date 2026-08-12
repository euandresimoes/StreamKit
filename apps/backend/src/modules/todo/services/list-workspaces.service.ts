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
    return { items: await this.workspaceRepository.list() }
  }
}
