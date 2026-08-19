import { type TodoColumn, TodoColumnSchema } from '@streamlet/contracts'

export class TodoColumnEntity implements TodoColumn {
  public readonly color
  public readonly createdAt
  public readonly id
  public readonly icon
  public readonly isCollapsed
  public readonly isPinned
  public readonly name
  public readonly position
  public readonly updatedAt
  public readonly wipLimit
  public readonly workspaceId
  public constructor(value: TodoColumn) {
    const parsed = TodoColumnSchema.parse(value)
    Object.assign(this, parsed)
    this.color = parsed.color
    this.createdAt = parsed.createdAt
    this.id = parsed.id
    this.icon = parsed.icon
    this.isCollapsed = parsed.isCollapsed
    this.isPinned = parsed.isPinned
    this.name = parsed.name
    this.position = parsed.position
    this.updatedAt = parsed.updatedAt
    this.wipLimit = parsed.wipLimit
    this.workspaceId = parsed.workspaceId
  }
}
