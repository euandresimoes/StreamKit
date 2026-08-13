import { type DynamicModule, Module } from '@nestjs/common'

import { SQLITE_DATABASE } from '../infrastructure/database/database.tokens'
import type { SqliteDatabase } from '../infrastructure/database/sqlite-database'
import { HealthController } from '../modules/health/health.controller'
import { GiveawayController } from '../modules/giveaway/giveaway.controller'
import { GiveawayRepository } from '../modules/giveaway/giveaway.repository'
import { GiveawayService } from '../modules/giveaway/giveaway.service'
import { GiveawayCaptureRepository } from '../modules/giveaway/giveaway-capture.repository'
import { GiveawayChatCaptureService } from '../modules/giveaway/giveaway-chat-capture.service'
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
import { TournamentCaptureRepository } from '../modules/tournament/tournament-capture.repository'
import { TournamentChatCaptureService } from '../modules/tournament/tournament-chat-capture.service'
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
import { KickController } from '../modules/integrations/kick/kick.controller'
import { KickSupportService } from '../modules/integrations/kick/kick-support.service'
import { FocusedChatRepository } from '../modules/integrations/focused-chat.repository'
import { FocusedChatService } from '../modules/integrations/focused-chat.service'
import { ChatProviderRegistry } from '../modules/integrations/chat-provider.registry'
import { ChatSimulationService } from '../modules/integrations/chat-simulation.service'
import { IntegrationConnectionManager } from '../modules/integrations/integration-connection.manager'
import { IntegrationEventBus } from '../modules/integrations/integration-event.bus'
import { IntegrationRepository } from '../modules/integrations/integration.repository'
import { IntegrationService } from '../modules/integrations/integration.service'
import {
  DEFAULT_INTEGRATION_RUNTIME_CONFIG,
  INTEGRATION_RUNTIME_CONFIG,
  type IntegrationRuntimeConfig,
} from '../modules/integrations/integration-runtime.config'
import { TwitchAuthController } from '../modules/integrations/twitch/twitch-auth.controller'
import { TwitchAuthService } from '../modules/integrations/twitch/twitch-auth.service'
import { TwitchChatAdapter } from '../modules/integrations/twitch/twitch-chat.adapter'
import { YouTubeAuthService } from '../modules/integrations/youtube/youtube-auth.service'
import { YouTubeBroadcastService } from '../modules/integrations/youtube/youtube-broadcast.service'
import { YouTubeChatAdapter } from '../modules/integrations/youtube/youtube-chat.adapter'
import { YouTubeController } from '../modules/integrations/youtube/youtube.controller'

@Module({})
export class AppModule {
  public static register(
    database: SqliteDatabase,
    secureCredentials: SecureCredentialRepository = new UnavailableSecureCredentialRepository(),
    logger: StreamKitLogger = new SilentStreamKitLogger(),
    integrationConfig: IntegrationRuntimeConfig = DEFAULT_INTEGRATION_RUNTIME_CONFIG,
  ): DynamicModule {
    return {
      controllers: [
        DatabaseStatusController,
        DiagnosticsController,
        GiveawayController,
        HealthController,
        IntegrationController,
        KickController,
        TwitchAuthController,
        YouTubeController,
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
        GiveawayCaptureRepository,
        GiveawayChatCaptureService,
        FocusedChatRepository,
        FocusedChatService,
        ChatProviderRegistry,
        ChatSimulationService,
        IntegrationConnectionManager,
        IntegrationEventBus,
        IntegrationRepository,
        IntegrationService,
        KickSupportService,
        { provide: INTEGRATION_RUNTIME_CONFIG, useValue: integrationConfig },
        TwitchAuthService,
        TwitchChatAdapter,
        YouTubeAuthService,
        YouTubeBroadcastService,
        YouTubeChatAdapter,
        TournamentCaptureRepository,
        TournamentChatCaptureService,
        TournamentRepository,
        TournamentService,
        { provide: SECURE_CREDENTIAL_REPOSITORY, useValue: secureCredentials },
        SettingsRepository,
        SettingsService,
      ],
    }
  }
}
