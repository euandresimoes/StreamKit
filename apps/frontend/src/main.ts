import { createRenderizer } from '@renderizer/vue'
import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import renderizerConfig from './renderizer.config'
import './styles/index.scss'

createApp(App).use(createPinia()).use(createRenderizer(renderizerConfig)).mount('#app')
