import { randomUUID } from 'node:crypto'

import { Inject, Injectable } from '@nestjs/common'
import {
  type CreateWorkspaceRequest,
  CreateWorkspaceRequestSchema,
  type Workspace,
} from '@streamkit/contracts'

import {
  WORKSPACE_REPOSITORY,
  type WorkspaceRepository,
} from '../repositories/workspace.repository'
import { WorkspaceEntity } from '../entities/workspace.entity'

@Injectable()
export class CreateWorkspaceService {
  public constructor(
    @Inject(WORKSPACE_REPOSITORY) private readonly workspaceRepository: WorkspaceRepository,
  ) {}

  public async execute(input: CreateWorkspaceRequest): Promise<Workspace> {
    const parsed = CreateWorkspaceRequestSchema.parse(input)
    const now = new Date().toISOString()
    const workspace = new WorkspaceEntity(
      randomUUID(),
      parsed.name,
      parsed.description ?? null,
      await this.workspaceRepository.nextPosition(),
      now,
      now,
    )

    return this.workspaceRepository.create(workspace)
  }
}
