import type { App } from 'vue'
import { Icon } from './Icon'
import ImportSteps from './ImportSteps'

// 注册全局组件
import FormFieldFilter from './bpm/FormFieldFilter'

export {
  ImportSteps,
  FormFieldFilter
}

export const setupGlobCom = (app: App<Element>): void => {
  app.component('Icon', Icon)
}