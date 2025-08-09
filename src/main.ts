// 引入unocss css
import '@/plugins/unocss'

// 导入全局的svg图标
import '@/plugins/svgIcon'

// 初始化多语言
import { setupI18n } from '@/plugins/vueI18n'

// 引入状态管理
import { setupStore } from '@/store'

// 全局组件
import { setupGlobCom } from '@/components'

// 引入 element-plus
import { setupElementPlus } from '@/plugins/elementPlus'

// 引入 form-create
import { setupFormCreate } from '@/plugins/formCreate'

// 引入全局样式
import '@/styles/index.scss'

// 引入动画
import '@/plugins/animate.css'

// 路由
import router, { setupRouter } from '@/router'

// 指令
import { setupAuth, setupMountedFocus } from '@/directives'

import { createApp, nextTick } from 'vue'

import App from './App.vue'

import './permission'

// 完全移除百度统计
import Logger from '@/utils/Logger'

import VueDOMPurifyHTML from 'vue-dompurify-html' // 解决v-html 的安全隐患

import FormCreate from '@/components/FormCreate'

// 引入令牌管理器
import { startTokenRefreshChecker, setupUserActivityMonitoring } from '@/utils/tokenManager'

// 创建实例
const setupAll = async () => {
  const app = createApp(App)

  await setupI18n(app)

  setupStore(app)

  setupGlobCom(app)

  setupElementPlus(app)

  setupFormCreate(app)

  setupRouter(app)

  // directives 指令
  setupAuth(app)
  setupMountedFocus(app)

  await router.isReady()

  app.use(VueDOMPurifyHTML)

  app.use(FormCreate)

  app.mount('#app')

  
  // 添加应用初始化后的钩子，用于增强菜单行为
  nextTick(() => {
    // 在应用程序挂载后执行
    setTimeout(() => {
      // 增强菜单的深层子菜单支持
      enhanceSubMenuBehavior();
      
      // 初始化令牌管理器
      startTokenRefreshChecker();
      setupUserActivityMonitoring();
      
      console.log('令牌管理器初始化完成');
    }, 300);
  });
}

// 增强子菜单行为，支持深层子菜单
function enhanceSubMenuBehavior() {
  // 监听菜单项点击事件
  document.addEventListener('click', function(e) {
    const target = e.target as HTMLElement;
    // 检查是否点击了子菜单
    if (target && target.closest('.el-sub-menu__title')) {
      const subMenu = target.closest('.el-sub-menu') as HTMLElement;
      if (subMenu && subMenu.classList.contains('is-opened')) {
        // 当有子菜单打开时，延迟处理其内部的子菜单
        setTimeout(() => {
          // 找到所有弹出的菜单
          const allPoppers = document.querySelectorAll('.el-menu.el-menu--popup');
          allPoppers.forEach((popper, index) => {
            // 检查弹出菜单是否包含活动子项
            const hasActiveChild = popper.querySelector('.is-active');
            if (hasActiveChild) {
              popper.classList.add('has-active-child');
            }
          });
        }, 50);
      }
    }
  });
}

setupAll()

Logger.prettyPrimary(`欢迎使用`, import.meta.env.VITE_APP_TITLE)
