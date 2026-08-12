import { defineRenderizerConfig } from '@renderizer/vue'

export default defineRenderizerConfig({
  adapter: 'vue',
  windows: {
    default: {
      backgroundColor: '#111318',
      frame: true,
      minHeight: 480,
      minWidth: 720,
      popup: true,
    },
    presets: [
      {
        height: 680,
        id: 'settings',
        minHeight: 480,
        minWidth: 720,
        title: 'StreamKit — Configurações',
        width: 940,
      },
    ],
  },
})
