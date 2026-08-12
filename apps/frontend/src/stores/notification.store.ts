import { defineStore } from 'pinia'
import { ref } from 'vue'

export type NotificationKind = 'error' | 'success' | 'info'
export type AppNotification = { id: number; kind: NotificationKind; message: string }

export const useNotificationStore = defineStore('notifications', () => {
  const items = ref<AppNotification[]>([])
  let nextId = 1

  function dismiss(id: number): void {
    items.value = items.value.filter((item) => item.id !== id)
  }

  function notify(message: string, kind: NotificationKind = 'info'): number {
    const id = nextId++
    items.value.push({ id, kind, message })
    return id
  }

  return { dismiss, items, notify }
})
