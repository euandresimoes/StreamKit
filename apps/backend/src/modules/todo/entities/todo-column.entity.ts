import { type TodoColumn, TodoColumnSchema } from '@streamkit/contracts'

export class TodoColumnEntity implements TodoColumn {
  public readonly color
  public readonly createdAt
  public readonly id
  public readonly name
  public readonly position
  public readonly updatedAt
  public readonly workspaceId
  public constructor(value: TodoColumn) {
    const parsed = TodoColumnSchema.parse(value)
    Object.assign(this, parsed)
    this.color = parsed.color
    this.createdAt = parsed.createdAt
    this.id = parsed.id
    this.name = parsed.name
    this.position = parsed.position
    this.updatedAt = parsed.updatedAt
    this.workspaceId = parsed.workspaceId
  }
}
