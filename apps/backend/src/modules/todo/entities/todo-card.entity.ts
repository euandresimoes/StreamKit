import { type TodoCard, TodoCardSchema } from '@streamkit/contracts'

export class TodoCardEntity implements TodoCard {
  public readonly columnId
  public readonly createdAt
  public readonly description
  public readonly id
  public readonly notes
  public readonly position
  public readonly title
  public readonly updatedAt
  public constructor(value: TodoCard) {
    const parsed = TodoCardSchema.parse(value)
    Object.assign(this, parsed)
    this.columnId = parsed.columnId
    this.createdAt = parsed.createdAt
    this.description = parsed.description
    this.id = parsed.id
    this.notes = parsed.notes
    this.position = parsed.position
    this.title = parsed.title
    this.updatedAt = parsed.updatedAt
  }
}
