import { createApp } from 'vue'
import App from './App.vue'
import { ElLoadingDirective } from 'element-plus'
import './styles/theme.css'
import router from './router'
import './styles/global.css'

const app = createApp(App)

app.directive('loading', ElLoadingDirective)
app.use(router)
app.mount('#app')
