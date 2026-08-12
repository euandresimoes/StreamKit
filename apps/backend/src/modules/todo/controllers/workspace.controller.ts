import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post } from '@nestjs/common'
import {
  CreateCardRequestSchema,
  CreateColumnRequestSchema,
  CreateWorkspaceRequestSchema,
  DeleteColumnRequestSchema,
  EntityIdSchema,
  MoveCardRequestSchema,
  SelectWorkspaceRequestSchema,
  type TodoBoard,
  type TodoCard,
  type TodoColumn,
  UpdateCardRequestSchema,
  UpdateColumnRequestSchema,
  UpdateWorkspaceRequestSchema,
  type Workspace,
  type WorkspaceListResponse,
} from '@streamkit/contracts'
import { CreateWorkspaceService } from '../services/create-workspace.service'
import { ListWorkspacesService } from '../services/list-workspaces.service'
import { ManageTodoService } from '../services/manage-todo.service'

@Controller('api/v1/todo')
export class WorkspaceController {
  public constructor(
    @Inject(CreateWorkspaceService) private readonly createService: CreateWorkspaceService,
    @Inject(ListWorkspacesService) private readonly listService: ListWorkspacesService,
    @Inject(ManageTodoService) private readonly manage: ManageTodoService,
  ) {}
  @Get('workspaces') public list(): Promise<WorkspaceListResponse> {
    return this.listService.execute()
  }
  @Post('workspaces') @HttpCode(201) public create(@Body() body: unknown): Promise<Workspace> {
    return this.createService.execute(CreateWorkspaceRequestSchema.parse(body))
  }
  @Get('workspaces/:id') public board(@Param('id') id: unknown): Promise<TodoBoard> {
    return this.manage.board(EntityIdSchema.parse(id))
  }
  @Patch('workspaces/:id') public updateWorkspace(
    @Param('id') id: unknown,
    @Body() body: unknown,
  ): Promise<Workspace> {
    return this.manage.updateWorkspace(
      EntityIdSchema.parse(id),
      UpdateWorkspaceRequestSchema.parse(body),
    )
  }
  @Delete('workspaces/:id') @HttpCode(204) public deleteWorkspace(
    @Param('id') id: unknown,
  ): Promise<void> {
    return this.manage.deleteWorkspace(EntityIdSchema.parse(id))
  }
  @Post('workspaces/select') @HttpCode(204) public select(@Body() body: unknown): Promise<void> {
    return this.manage.selectWorkspace(SelectWorkspaceRequestSchema.parse(body).workspaceId)
  }
  @Post('workspaces/:id/columns') @HttpCode(201) public createColumn(
    @Param('id') id: unknown,
    @Body() body: unknown,
  ): Promise<TodoColumn> {
    return this.manage.createColumn(EntityIdSchema.parse(id), CreateColumnRequestSchema.parse(body))
  }
  @Patch('columns/:id') public updateColumn(
    @Param('id') id: unknown,
    @Body() body: unknown,
  ): Promise<TodoColumn> {
    return this.manage.updateColumn(EntityIdSchema.parse(id), UpdateColumnRequestSchema.parse(body))
  }
  @Post('columns/:id/delete') @HttpCode(204) public deleteColumn(
    @Param('id') id: unknown,
    @Body() body: unknown,
  ): Promise<void> {
    return this.manage.deleteColumn(EntityIdSchema.parse(id), DeleteColumnRequestSchema.parse(body))
  }
  @Post('columns/:id/cards') @HttpCode(201) public createCard(
    @Param('id') id: unknown,
    @Body() body: unknown,
  ): Promise<TodoCard> {
    return this.manage.createCard(EntityIdSchema.parse(id), CreateCardRequestSchema.parse(body))
  }
  @Patch('cards/:id') public updateCard(
    @Param('id') id: unknown,
    @Body() body: unknown,
  ): Promise<TodoCard> {
    return this.manage.updateCard(EntityIdSchema.parse(id), UpdateCardRequestSchema.parse(body))
  }
  @Delete('cards/:id') @HttpCode(204) public deleteCard(@Param('id') id: unknown): Promise<void> {
    return this.manage.deleteCard(EntityIdSchema.parse(id))
  }
  @Post('cards/:id/move') public moveCard(
    @Param('id') id: unknown,
    @Body() body: unknown,
  ): Promise<TodoCard> {
    return this.manage.moveCard(EntityIdSchema.parse(id), MoveCardRequestSchema.parse(body))
  }
}
