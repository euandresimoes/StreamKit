import { Inject, Injectable } from '@nestjs/common'
import { WorkspaceSchema } from '@streamkit/contracts'
import { asc, max } from 'drizzle-orm'

import { SQLITE_DATABASE } from '../../../infrastructure/database/database.tokens'
import { todoWorkspaces } from '../../../infrastructure/database/schema'
import type { SqliteDatabase } from '../../../infrastructure/database/sqlite-database'
import { WorkspaceEntity } from '../entities/workspace.entity'
import { WorkspaceRepository } from './workspace.repository'

@Injectable()
export class SqliteWorkspaceRepository extends WorkspaceRepository {
  public constructor(@Inject(SQLITE_DATABASE) private readonly database: SqliteDatabase) {
    super()
  }

  public async create(workspace: WorkspaceEntity): Promise<WorkspaceEntity> {
    await this.database.orm.insert(todoWorkspaces).values(workspace)
    return workspace
  }

  public async list(): Promise<WorkspaceEntity[]> {
    const rows = await this.database.orm
      .select()
      .from(todoWorkspaces)
      .orderBy(asc(todoWorkspaces.position))

    return rows.map((unvalidatedRow) => {
      const row = WorkspaceSchema.parse(unvalidatedRow)
      return new WorkspaceEntity(
        row.id,
        row.name,
        row.description,
        row.position,
        row.createdAt,
        row.updatedAt,
      )
    })
  }

  public async nextPosition(): Promise<number> {
    const [result] = await this.database.orm
      .select({ highestPosition: max(todoWorkspaces.position) })
      .from(todoWorkspaces)

    return (result?.highestPosition ?? -1) + 1
  }
}
