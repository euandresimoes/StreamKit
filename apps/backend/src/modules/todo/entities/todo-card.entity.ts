import { type TodoCard, TodoCardSchema } from '@streamkit/contracts'

export class TodoCardEntity implements TodoCard {
  public readonly columnId
  public readonly accentColor
  public readonly createdAt
  public readonly description
  public readonly id
  public readonly isPinned
  public readonly labels
  public readonly checklist
  public readonly notes
  public readonly priority
  public readonly position
  public readonly title
  public readonly updatedAt
  public constructor(value: TodoCard) {
    const parsed = TodoCardSchema.parse(value)
    Object.assign(this, parsed)
    this.columnId = parsed.columnId
    this.accentColor = parsed.accentColor
    this.createdAt = parsed.createdAt
    this.description = parsed.description
    this.id = parsed.id
    this.isPinned = parsed.isPinned
    this.labels = parsed.labels
    this.checklist = parsed.checklist
    this.notes = parsed.notes
    this.priority = parsed.priority
    this.position = parsed.position
    this.title = parsed.title
    this.updatedAt = parsed.updatedAt
  }
}
