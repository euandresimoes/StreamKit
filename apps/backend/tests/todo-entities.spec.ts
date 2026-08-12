import { TodoCardEntity } from '../src/modules/todo/entities/todo-card.entity'
import { TodoColumnEntity } from '../src/modules/todo/entities/todo-column.entity'
const base = {
  createdAt: '2026-08-12T00:00:00.000Z',
  id: '12b28c21-cdd2-405a-824e-a54f20383195',
  position: 0,
  updatedAt: '2026-08-12T00:00:00.000Z',
}
describe('TODO entities', () => {
  it('protects column invariants', () => {
    expect(
      () =>
        new TodoColumnEntity({
          ...base,
          color: null,
          name: ' ',
          workspaceId: 'c8ee1c4b-4b1f-4a9a-959d-ce1b942943da',
        }),
    ).toThrow()
  })
  it('protects card title and position invariants', () => {
    expect(
      () =>
        new TodoCardEntity({
          ...base,
          columnId: 'c8ee1c4b-4b1f-4a9a-959d-ce1b942943da',
          description: null,
          notes: null,
          position: -1,
          title: '',
        }),
    ).toThrow()
  })
})
