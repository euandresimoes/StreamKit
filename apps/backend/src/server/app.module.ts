import { type DynamicModule, Module } from '@nestjs/common'

import { SQLITE_DATABASE } from '../infrastructure/database/database.tokens'
import type { SqliteDatabase } from '../infrastructure/database/sqlite-database'
import { HealthController } from '../modules/health/health.controller'
import { GiveawayController } from '../modules/giveaway/giveaway.controller'
import { GiveawayRepository } from '../modules/giveaway/giveaway.repository'
import { GiveawayService } from '../modules/giveaway/giveaway.service'
import { DatabaseStatusController } from '../modules/system/controllers/database-status.controller'
import { DiagnosticsController } from '../modules/system/controllers/diagnostics.controller'
import {
  SilentStreamKitLogger,
  STREAMKIT_LOGGER,
  type StreamKitLogger,
} from '../infrastructure/logging/streamkit-logger'
import { WorkspaceController } from '../modules/todo/controllers/workspace.controller'
import { SqliteWorkspaceRepository } from '../modules/todo/repositories/sqlite-workspace.repository'
import { WORKSPACE_REPOSITORY } from '../modules/todo/repositories/workspace.repository'
import { CreateWorkspaceService } from '../modules/todo/services/create-workspace.service'
import { ListWorkspacesService } from '../modules/todo/services/list-workspaces.service'
import { ManageTodoService } from '../modules/todo/services/manage-todo.service'
import { TournamentController } from '../modules/tournament/tournament.controller'
import { TournamentRepository } from '../modules/tournament/tournament.repository'
import { TournamentService } from '../modules/tournament/tournament.service'
import { SettingsController } from '../modules/settings/settings.controller'
import {
  SECURE_CREDENTIAL_REPOSITORY,
  type SecureCredentialRepository,
  UnavailableSecureCredentialRepository,
} from '../modules/settings/secure-credential.repository'
import { SettingsRepository } from '../modules/settings/settings.repository'
import { SettingsService } from '../modules/settings/settings.service'
import { IntegrationController } from '../modules/integrations/integration.controller'
import { ChatProviderRegistry } from '../modules/integrations/chat-provider.registry'
import { IntegrationConnectionManager } from '../modules/integrations/integration-connection.manager'
import { IntegrationEventBus } from '../modules/integrations/integration-event.bus'
import { IntegrationRepository } from '../modules/integrations/integration.repository'
import { IntegrationService } from '../modules/integrations/integration.service'

@Module({})
export class AppModule {
  public static register(
    database: SqliteDatabase,
    secureCredentials: SecureCredentialRepository = new UnavailableSecureCredentialRepository(),
    logger: StreamKitLogger = new SilentStreamKitLogger(),
  ): DynamicModule {
    return {
      controllers: [
        DatabaseStatusController,
        DiagnosticsController,
        GiveawayController,
        HealthController,
        IntegrationController,
        WorkspaceController,
        TournamentController,
        SettingsController,
      ],
      module: AppModule,
      providers: [
        { provide: SQLITE_DATABASE, useValue: database },
        { provide: STREAMKIT_LOGGER, useValue: logger },
        { provide: WORKSPACE_REPOSITORY, useClass: SqliteWorkspaceRepository },
        CreateWorkspaceService,
        ListWorkspacesService,
        ManageTodoService,
        GiveawayRepository,
        GiveawayService,
        ChatProviderRegistry,
        IntegrationConnectionManager,
        IntegrationEventBus,
        IntegrationRepository,
        IntegrationService,
        TournamentRepository,
        TournamentService,
        { provide: SECURE_CREDENTIAL_REPOSITORY, useValue: secureCredentials },
        SettingsRepository,
        SettingsService,
      ],
    }
  }
}
