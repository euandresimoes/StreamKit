import type { Workspace as WorkspaceContract } from '@streamkit/contracts'

export class WorkspaceEntity implements WorkspaceContract {
  public constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string | null,
    public readonly icon: string,
    public readonly position: number,
    public readonly createdAt: string,
    public readonly updatedAt: string,
  ) {
    if (name.length === 0) {
      throw new Error('Workspace name cannot be empty')
    }
    if (icon.length === 0) throw new Error('Workspace icon cannot be empty')
    if (position < 0 || !Number.isInteger(position)) {
      throw new Error('Workspace position must be a non-negative integer')
    }
  }
}
