<template>
  <div
    :class="prefixCls"
    class="relative h-[100%] lt-md:px-10px lt-sm:px-10px lt-xl:px-10px lt-xl:px-10px"
  >
    <div class="login-bg-container">
      <div class="login-bg-overlay"></div>
      <div class="login-bg-pattern"></div>
      <div class="login-bg-dots"></div>
      <div class="login-bg-particles">
        <div class="particle particle-1"></div>
        <div class="particle particle-2"></div>
        <div class="particle particle-3"></div>
        <div class="particle particle-4"></div>
        <div class="particle particle-5"></div>
      </div>
    </div>
    
    <!-- 移动端顶部云图标 -->
    <div class="mobile-top-graphic lt-lg:block hidden">
      <img src="@/assets/svgs/login-box-bg.svg" class="cloud-image-mobile" alt="" />
    </div>
    
    <div class="relative mx-auto h-full flex items-center">
      <!-- 左侧云存储图形区域 -->
      <div class="flex-1 p-30px flex items-center justify-center relative lt-xl:hidden">
        <div class="cloud-storage-graphic">
          <img src="@/assets/svgs/login-box-bg.svg" class="cloud-image" alt="" />
        </div>
      </div>
      
      <!-- 右侧登录区域 -->
      <div class="flex-1 flex items-center justify-center p-30px lt-sm:p-10px">
        <!-- 响应式布局下的Logo显示 -->
        <div class="absolute top-6 left-6 z-10 flex items-center">
          <div class="login-logo-container">
            <img alt="" class="login-logo-image" src="@/assets/imgs/logo.png" />
          </div>
          <span class="login-title text-20px font-bold text-blue-600">{{ underlineToHump(appStore.getTitle) }}</span>
        </div>
        
        <!-- 右上角的主题、语言选择 -->
        <div class="absolute top-6 right-6 z-10 flex items-center space-x-10px h-48px">
          <ThemeSwitch />
          <LocaleDropdown />
        </div>
        
        <!-- 登录表单 -->
        <Transition appear enter-active-class="animate__animated animate__fadeIn">
          <div class="w-[100%] max-w-[420px]">
            <!-- 账号登录 -->
            <LoginForm class="login-card-container" />
            <!-- 三方登录 -->
            <SSOLoginVue class="login-card-container" />
            <!-- 忘记密码 -->
            <ForgetPasswordForm class="login-card-container" />
          </div>
        </Transition>
      </div>
    </div>
    
    <!-- 页脚版权信息 -->
    <div class="absolute bottom-4 w-full text-center text-gray-400 text-xs">
      <span>Copyright©2016-{{ new Date().getFullYear() }} {{ underlineToHump(appStore.getTitle) }} 版权所有</span>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { underlineToHump } from '@/utils'

import { useDesign } from '@/hooks/web/useDesign'
import { useAppStore } from '@/store/modules/app'
import { ThemeSwitch } from '@/layout/components/ThemeSwitch'
import { LocaleDropdown } from '@/layout/components/LocaleDropdown'

import { LoginForm, SSOLoginVue, ForgetPasswordForm } from './components'

defineOptions({ name: 'Login' })

const { t } = useI18n()
const appStore = useAppStore()
const { getPrefixCls } = useDesign()
const prefixCls = getPrefixCls('login')
</script>

<style lang="scss" scoped>
$prefix-cls: #{$namespace}-login;

.#{$prefix-cls} {
  overflow: auto;
  position: relative;
}

// 背景容器
.login-bg-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: 0;
}

// 背景渐变
.login-bg-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #e6f1ff 0%, #f5f9ff 50%, #ebf5ff 100%);
  z-index: 1;
}

// 背景点状图案
.login-bg-dots {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: radial-gradient(#c7dbff 1px, transparent 1px);
  background-size: 20px 20px;
  opacity: 0.3;
  z-index: 2;
}

// 背景图案
.login-bg-pattern {
  display: none;
}

// 背景粒子
.login-bg-particles {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: 2;
}

.particle {
  position: absolute;
  border-radius: 50%;
  background-color: rgba(100, 160, 255, 0.2);
  pointer-events: none;
}

.particle-1 {
  width: 20px;
  height: 20px;
  top: 20%;
  left: 10%;
  animation: float-slow 15s infinite ease-in-out;
}

.particle-2 {
  width: 30px;
  height: 30px;
  top: 60%;
  left: 15%;
  animation: float-slow 18s infinite ease-in-out reverse;
}

.particle-3 {
  width: 15px;
  height: 15px;
  top: 30%;
  right: 20%;
  animation: float-slow 12s infinite ease-in-out 1s;
}

.particle-4 {
  width: 25px;
  height: 25px;
  bottom: 20%;
  right: 15%;
  animation: float-slow 20s infinite ease-in-out;
}

.particle-5 {
  width: 12px;
  height: 12px;
  bottom: 35%;
  left: 30%;
  animation: float-slow 16s infinite ease-in-out 2s;
}

@keyframes float-slow {
  0% {
    transform: translate(0, 0);
  }
  25% {
    transform: translate(-15px, 15px);
  }
  50% {
    transform: translate(10px, -15px);
  }
  75% {
    transform: translate(-15px, -10px);
  }
  100% {
    transform: translate(0, 0);
  }
}

// Logo 样式
.login-logo-container {
  position: relative;
  width: 40px;
  height: 40px;
  margin-right: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  padding: 4px;
  background-color: white;
}

.login-logo-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: all 0.3s ease;
  filter: drop-shadow(0 0 3px rgba(24, 144, 255, 0.2));
  z-index: 3;
  position: relative;
}

.login-title {
  color: #1d4ed8;
  transition: all 0.3s ease;
}

// 云存储图形
.cloud-storage-graphic {
  position: relative;
  width: 450px;
  height: 450px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cloud-image {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 10px 20px rgba(100, 160, 255, 0.2));
  animation: float 6s ease-in-out infinite;
}

// 登录表单容器
.login-card-container {
  background: white;
  border-radius: 20px;
  border: 1px solid rgba(220, 230, 250, 0.7);
  box-shadow: 0 10px 30px rgba(100, 160, 255, 0.1);
  padding: 30px;
  transition: all 0.3s ease;
  width: 100%;
  max-width: 420px;
  
  &:hover {
    box-shadow: 0 12px 35px rgba(100, 160, 255, 0.15);
  }
}

// 动画增强
@keyframes float {
  0% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
  100% {
    transform: translateY(0px);
  }
}

// 响应式调整
@media (max-width: 991px) {
  .login-card-container {
    width: 100%;
    max-width: 400px;
    margin: 0 auto;
    padding: 25px 20px;
  }
  
  .cloud-storage-graphic {
    width: 320px;
    height: 320px;
  }
}

@media (max-width: 767px) {
  .login-card-container {
    background: white;
    border-radius: 16px;
    padding: 20px 15px;
    margin-top: 30px;
    width: 90%;
  }
  
  .login-bg-dots {
    background-size: 15px 15px;
  }
  
  .particle {
    display: none;
  }
  
  // 在移动端显示小版本云图标
  .cloud-small {
    display: block;
    width: 100px;
    height: 100px;
    margin: 0 auto 20px;
  }
}

// 在移动端顶部添加小型云存储图标
@media (max-width: 767px) {
  .mobile-top-graphic {
    display: none;
  }
  
  .cloud-image-mobile {
    width: 100px;
    height: auto;
    opacity: 0.85;
    filter: drop-shadow(0 5px 15px rgba(100, 160, 255, 0.2));
    animation: float 6s ease-in-out infinite;
  }
}

// 动画效果优化
@keyframes float {
  0% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
  100% {
    transform: translateY(0px);
  }
}
</style>

<style lang="scss">
.dark {
  // 暗黑模式下的背景
  .login-bg-overlay {
    background: linear-gradient(135deg, #0d2447 0%, #0f1d35 50%, #0e2041 100%);
  }
  
  .login-bg-dots {
    background-image: radial-gradient(#1e3a62 1px, transparent 1px);
    opacity: 0.2;
  }
  
  .particle {
    background-color: rgba(100, 160, 255, 0.15);
  }
  
  // 暗黑模式下的登录卡片
  .login-card-container {
    background: #0d1b30;
    border: 1px solid #1e3a62;
    box-shadow: 0 10px 30px rgba(0, 10, 30, 0.3);
    
    &:hover {
      box-shadow: 0 12px 35px rgba(0, 10, 30, 0.4);
    }
  }
  
  // 暗黑模式下的Logo容器
  .login-logo-container {
    background-color: #0f1d35;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
  }
}
</style>
