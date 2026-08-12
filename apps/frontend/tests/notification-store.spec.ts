import { createPinia, setActivePinia } from 'pinia'

import { useNotificationStore } from '../src/stores/notification.store'

describe('notification store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('adds typed notifications and dismisses them', () => {
    const notifications = useNotificationStore()
    const id = notifications.notify('Salvo', 'success')
    expect(notifications.items).toEqual([{ id, kind: 'success', message: 'Salvo' }])

    notifications.dismiss(id)
    expect(notifications.items).toEqual([])
  })
})
