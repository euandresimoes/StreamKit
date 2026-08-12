import { Body, Controller, Get, HttpCode, Inject, Post } from '@nestjs/common'
import {
  CreateWorkspaceRequestSchema,
  type Workspace,
  type WorkspaceListResponse,
} from '@streamkit/contracts'

import { CreateWorkspaceService } from '../services/create-workspace.service'
import { ListWorkspacesService } from '../services/list-workspaces.service'

@Controller('api/v1/todo/workspaces')
export class WorkspaceController {
  public constructor(
    @Inject(CreateWorkspaceService) private readonly createWorkspaceService: CreateWorkspaceService,
    @Inject(ListWorkspacesService) private readonly listWorkspacesService: ListWorkspacesService,
  ) {}

  @Get()
  public async list(): Promise<WorkspaceListResponse> {
    return this.listWorkspacesService.execute()
  }

  @Post()
  @HttpCode(201)
  public async create(@Body() input: unknown): Promise<Workspace> {
    return this.createWorkspaceService.execute(CreateWorkspaceRequestSchema.parse(input))
  }
}
