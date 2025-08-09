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
      <div class="mobile-top-content">
        <img src="@/assets/svgs/login-box-bg.svg" class="cloud-image-mobile" alt="云存储" />
        <span class="mobile-logo-text">BPM管理系统</span>
      </div>
    </div>
    
    <div class="relative mx-auto h-full flex items-center">
      <!-- 左侧云存储图形区域 -->
      <div class="flex-1 p-30px flex items-center justify-center relative lt-xl:hidden">
        <div class="cloud-storage-graphic">
          <img src="@/assets/svgs/login-box-bg.svg" class="cloud-image" alt="云存储" />
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
            <el-form
              v-show="getShow"
              ref="formLogin"
              :model="loginData.loginForm"
              :rules="LoginRules"
              class="login-form login-card-container"
              label-position="top"
              label-width="120px"
              size="large"
            >
              <el-row>
                <el-col :span="24" class="mb-6">
                  <el-form-item>
                    <LoginFormTitle style="width: 100%" class="login-form-title" />
                  </el-form-item>
                </el-col>
                <el-col :span="24" v-if="false">
                  <el-form-item v-if="loginData.tenantEnable" prop="tenantName">
                    <el-input
                      v-model="loginData.loginForm.tenantName"
                      :placeholder="t('login.tenantNamePlaceholder')"
                      :prefix-icon="iconHouse"
                      link
                      type="primary"
                      class="custom-input"
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="24" class="mb-4">
                  <el-form-item prop="username" class="custom-form-item">
                    <el-input
                      v-model="loginData.loginForm.username"
                      :placeholder="t('login.usernamePlaceholder')"
                      :prefix-icon="iconAvatar"
                      class="custom-input"
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="24" class="mb-4">
                  <el-form-item prop="password" class="custom-form-item">
                    <el-input
                      v-model="loginData.loginForm.password"
                      :placeholder="t('login.passwordPlaceholder')"
                      :prefix-icon="iconLock"
                      show-password
                      type="password"
                      class="custom-input"
                      @keyup.enter="getCode()"
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="24" class="mb-5">
                  <el-form-item>
                    <div class="flex items-center justify-between w-full">
                      <el-checkbox 
                        v-model="loginData.loginForm.rememberMe"
                        class="custom-checkbox"
                      >
                        {{ t('login.remember') }}
                      </el-checkbox>
                      <el-link
                        class="forget-link"
                        type="primary"
                      >
                        {{ t('login.forgetPassword') }}
                      </el-link>
                    </div>
                  </el-form-item>
                </el-col>
                <el-col :span="24" class="mb-6">
                  <el-form-item>
                    <button
                      :disabled="loginLoading"
                      class="login-button"
                      type="button"
                      @click="getCode()"
                    >
                      <span v-if="loginLoading" class="login-loading-icon">
                        <i class="el-icon-loading"></i>
                      </span>
                      <span>{{ t('login.login') }}</span>
                    </button>
                  </el-form-item>
                </el-col>
                <Verify
                  v-if="loginData.captchaEnable"
                  ref="verify"
                  :captchaType="captchaType"
                  :imgSize="{ width: '400px', height: '200px' }"
                  mode="pop"
                  @success="handleLogin"
                />
              </el-row>
            </el-form>
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

import { ElLoading } from 'element-plus'

import { useDesign } from '@/hooks/web/useDesign'
import { useAppStore } from '@/store/modules/app'
import { useIcon } from '@/hooks/web/useIcon'
import { usePermissionStore } from '@/store/modules/permission'

import * as LoginApi from '@/api/login'
import * as authUtil from '@/utils/auth'
import { ThemeSwitch } from '@/layout/components/ThemeSwitch'
import { LocaleDropdown } from '@/layout/components/LocaleDropdown'
import { LoginStateEnum, useFormValid, useLoginState } from './components/useLogin'
import LoginFormTitle from './components/LoginFormTitle.vue'
import router from '@/router'
import { useEventBus } from '@/hooks/web/useEventBus'
import { initTokenManager } from '@/utils/tokenManager'

defineOptions({ name: 'SocialLogin' })

const { t } = useI18n()
const route = useRoute()

const appStore = useAppStore()
const { getPrefixCls } = useDesign()
const prefixCls = getPrefixCls('login')
const iconHouse = useIcon({ icon: 'ep:house' })
const iconAvatar = useIcon({ icon: 'ep:user' })
const iconLock = useIcon({ icon: 'ep:lock' })
const formLogin = ref<any>()
const { validForm } = useFormValid(formLogin)
const { getLoginState } = useLoginState()
const { push } = useRouter()
const permissionStore = usePermissionStore()
const loginLoading = ref(false)
const verify = ref()
const captchaType = ref('blockPuzzle') // blockPuzzle 滑块 clickWord 点击文字
const { emit } = useEventBus('login')

const getShow = computed(() => unref(getLoginState) === LoginStateEnum.LOGIN)

const LoginRules = {
  tenantName: [required],
  username: [required],
  password: [required]
}
const loginData = reactive({
  isShowPassword: false,
  captchaEnable: import.meta.env.VITE_APP_CAPTCHA_ENABLE !== 'false',
  tenantEnable: import.meta.env.VITE_APP_TENANT_ENABLE !== 'false',
  loginForm: {
    tenantName: 'admin',
    username: '',
    password: '',
    captchaVerification: '',
    rememberMe: false
  }
})

// 获取验证码
const getCode = async () => {
  // 情况一，未开启：则直接登录
  if (!loginData.captchaEnable) {
    await handleLogin({})
  } else {
    // 情况二，已开启：则展示验证码；只有完成验证码的情况，才进行登录
    // 弹出验证码
    verify.value.show()
  }
}

//获取租户ID
const getTenantId = async () => {
  if (loginData.tenantEnable) {
    const res = await LoginApi.getTenantIdByName(loginData.loginForm.tenantName)
    authUtil.setTenantId(res)
  }
}

// 记住我
const getCookie = () => {
  const loginForm = authUtil.getLoginForm()
  if (loginForm) {
    loginData.loginForm = {
      ...loginData.loginForm,
      username: loginForm.username ? loginForm.username : loginData.loginForm.username,
      password: loginForm.password ? loginForm.password : loginData.loginForm.password,
      rememberMe: loginForm.rememberMe ? true : false,
      tenantName: loginForm.tenantName ? loginForm.tenantName : loginData.loginForm.tenantName
    }
  }
}

const loading = ref() // ElLoading.service 返回的实例

// tricky: 配合LoginForm.vue中redirectUri需要对参数进行encode，需要在回调后进行decode
function getUrlValue(key: string): string {
  const url = new URL(decodeURIComponent(location.href))
  return url.searchParams.get(key) ?? ''
}

// 尝试登录: 当账号已经绑定，socialLogin会直接获得token
const tryLogin = async () => {
  try {
    const type = getUrlValue('type')
    const redirect = getUrlValue('redirect')
    const code = route?.query?.code as string
    const state = route?.query?.state as string

    const res = await LoginApi.socialLogin(type, code, state)
    authUtil.setToken(res)
    // 初始化令牌管理器，启动无感刷新
    initTokenManager()

    router.push({ path: redirect || '/' })
    // 社交登录成功后触发事件
    emit('login-success')
  } catch (err) {}
}

// 登录
const handleLogin = async (params) => {
  loginLoading.value = true
  try {
    await getTenantId()
    const data = await validForm()
    if (!data) {
      return
    }

    let redirect = getUrlValue('redirect')

    const type = getUrlValue('type')
    const code = route?.query?.code as string
    const state = route?.query?.state as string

    const loginDataLoginForm = { ...loginData.loginForm }
    const res = await LoginApi.login({
      // 账号密码登录
      username: loginDataLoginForm.username,
      password: loginDataLoginForm.password,
      captchaVerification: params.captchaVerification,
      // 社交登录
      socialCode: code,
      socialState: state,
      socialType: type
    })
    if (!res) {
      return
    }
    loading.value = ElLoading.service({
      lock: true,
      text: '正在加载系统中...',
      background: 'rgba(0, 0, 0, 0.7)'
    })
    if (loginDataLoginForm.rememberMe) {
      authUtil.setLoginForm(loginDataLoginForm)
    } else {
      authUtil.removeLoginForm()
    }
    authUtil.setToken(res)
    // 初始化令牌管理器，启动无感刷新
    initTokenManager()
    if (!redirect) {
      redirect = '/'
    }
    // 判断是否为SSO登录
    if (redirect.indexOf('sso') !== -1) {
      window.location.href = window.location.href.replace('/login?redirect=', '')
    } else {
      push({ path: redirect || permissionStore.addRouters[0].path })
      // 登录成功后触发事件
      emit('login-success')
    }
  } finally {
    loginLoading.value = false
    // 确保loading.value存在才调用close方法
    if (loading.value) {
      loading.value.close()
    }
  }
}

onMounted(() => {
  getCookie()
  tryLogin()
})
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

// 自定义表单项
.custom-form-item {
  margin-bottom: 20px;
}

// 自定义输入框
:deep(.custom-input) {
  .el-input__wrapper {
    background-color: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 0 15px;
    box-shadow: none;
    transition: all 0.3s ease;
    
    &:hover {
      border-color: #cbd5e1;
      background-color: #f1f5f9;
    }
    
    &.is-focus {
      border-color: #3b82f6;
      background-color: #ffffff;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
    }
  }
  
  .el-input__inner {
    height: 44px;
    color: #334155;
    font-size: 14px;
  }
  
  .el-input__prefix-inner {
    font-size: 16px;
    color: #64748b;
    margin-right: 10px;
  }
}

// 登录按钮
.login-button {
  width: 100%;
  height: 44px;
  border-radius: 8px;
  background-color: #1d4ed8;
  color: white;
  font-weight: 500;
  font-size: 15px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  position: relative;
  
  &:hover {
    background-color: #1e40af;
  }
  
  &:active {
    transform: translateY(1px);
  }
  
  &:disabled {
    background-color: #93c5fd;
    cursor: not-allowed;
  }
  
  .login-loading-icon {
    margin-right: 8px;
  }
}

// 记住我复选框
:deep(.custom-checkbox) {
  .el-checkbox__inner {
    border-color: #cbd5e1;
    background-color: #ffffff;
    border-radius: 3px;
    
    &:hover {
      border-color: #3b82f6;
    }
  }
  
  .el-checkbox__input.is-checked .el-checkbox__inner {
    background-color: #3b82f6;
    border-color: #3b82f6;
  }
  
  .el-checkbox__label {
    color: #64748b;
    font-size: 13px;
  }
}

// 忘记密码链接
.forget-link {
  font-weight: 400;
  font-size: 13px;
  color: #3b82f6;
  text-decoration: none;
  
  &:hover {
    color: #1d4ed8;
    text-decoration: underline;
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
  
  // 在登录表单旁边显示云图标
  .login-form-title {
    position: relative;
    
    &::after {
      content: '';
      display: block;
      position: absolute;
      top: -5px;
      right: -10px;
      width: 70px;
      height: 70px;
      background-image: url('@/assets/svgs/login-box-bg.svg');
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
      opacity: 0.85;
      z-index: 1;
      animation: float 6s ease-in-out infinite;
    }
  }
  
  // 为移动端添加额外的顶部内边距，确保表单内容不被云图标遮挡
  .login-form {
    margin-top: 20px;
    position: relative;
    z-index: 3;
  }
}

// 动画效果
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
    margin-top: 40px;
    width: 90%;
    position: relative;
    z-index: 5;
  }
  
  .login-bg-dots {
    background-size: 15px 15px;
  }
  
  .particle {
    display: none;
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
  
  // 暗黑模式下的输入框
  .custom-input {
    .el-input__wrapper {
      background-color: #1e293b;
      border: 1px solid #334155;
      
      &:hover {
        background-color: #1e293b;
        border-color: #475569;
      }
      
      &.is-focus {
        background-color: #0f172a;
        border-color: #60a5fa;
      }
    }
    
    .el-input__inner {
      color: #e2e8f0;
    }
    
    .el-input__prefix-inner {
      color: #94a3b8;
    }
  }
  
  // 暗黑模式下的社交图标
  .social-icon {
    background-color: #1e293b;
    
    &:hover {
      background-color: #334155;
    }
  }
  
  // 暗黑模式下的按钮
  .login-button {
    background-color: #3b82f6;
    
    &:hover {
      background-color: #2563eb;
    }
    
    &:disabled {
      background-color: #1e40af;
      opacity: 0.6;
    }
  }
  
  // 暗黑模式下的复选框
  .custom-checkbox {
    .el-checkbox__inner {
      background-color: #1e293b;
      border-color: #475569;
    }
    
    .el-checkbox__label {
      color: #cbd5e1;
    }
  }
  
  // 忘记密码链接
  .forget-link {
    color: #60a5fa;
    
    &:hover {
      color: #93c5fd;
    }
  }
}
</style>
