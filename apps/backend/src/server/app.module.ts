import { type DynamicModule, Module } from '@nestjs/common'

import { SQLITE_DATABASE } from '../infrastructure/database/database.tokens'
import type { SqliteDatabase } from '../infrastructure/database/sqlite-database'
import { HealthController } from '../modules/health/health.controller'
import { GiveawayController } from '../modules/giveaway/giveaway.controller'
import { GiveawayRepository } from '../modules/giveaway/giveaway.repository'
import { GiveawayService } from '../modules/giveaway/giveaway.service'
import { DatabaseStatusController } from '../modules/system/controllers/database-status.controller'
import { WorkspaceController } from '../modules/todo/controllers/workspace.controller'
import { SqliteWorkspaceRepository } from '../modules/todo/repositories/sqlite-workspace.repository'
import { WORKSPACE_REPOSITORY } from '../modules/todo/repositories/workspace.repository'
import { CreateWorkspaceService } from '../modules/todo/services/create-workspace.service'
import { ListWorkspacesService } from '../modules/todo/services/list-workspaces.service'
import { ManageTodoService } from '../modules/todo/services/manage-todo.service'

@Module({})
export class AppModule {
  public static register(database: SqliteDatabase): DynamicModule {
    return {
      controllers: [
        DatabaseStatusController,
        GiveawayController,
        HealthController,
        WorkspaceController,
      ],
      module: AppModule,
      providers: [
        { provide: SQLITE_DATABASE, useValue: database },
        { provide: WORKSPACE_REPOSITORY, useClass: SqliteWorkspaceRepository },
        CreateWorkspaceService,
        ListWorkspacesService,
        ManageTodoService,
        GiveawayRepository,
        GiveawayService,
      ],
    }
  }
}
