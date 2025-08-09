<template>
  <el-form
    v-show="getShow"
    ref="formLogin"
    :model="loginData.loginForm"
    :rules="LoginRules"
    class="login-form"
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
              @click="setLoginState(LoginStateEnum.RESET_PASSWORD)"
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
      <el-col :span="24">
        <el-divider content-position="center" class="custom-divider">{{ t('login.otherLogin') }}</el-divider>
        <div class="social-login-container">
          <div
            v-for="(item, key) in socialList"
            :key="key"
            class="social-icon"
            @click="doSocialLogin(item.type)"
          >
            <Icon
              :icon="item.icon"
              :size="24"
              class="anticon cursor-pointer"
              :color="item.color || '#7a8ba9'"
            />
          </div>
        </div>
      </el-col>
    </el-row>
  </el-form>
</template>
<script lang="ts" setup>
import { ElLoading } from 'element-plus'
import LoginFormTitle from './LoginFormTitle.vue'
import type { RouteLocationNormalizedLoaded } from 'vue-router'

import { useIcon } from '@/hooks/web/useIcon'

import * as authUtil from '@/utils/auth'
import { usePermissionStore } from '@/store/modules/permission'
import * as LoginApi from '@/api/login'
import { LoginStateEnum, useFormValid, useLoginState } from './useLogin'
import { useEventBus } from '@/hooks/web/useEventBus'
import { initTokenManager } from '@/utils/tokenManager'

defineOptions({ name: 'LoginForm' })

const { t } = useI18n()
const message = useMessage()
const iconHouse = useIcon({ icon: 'ep:house' })
const iconAvatar = useIcon({ icon: 'ep:user' })
const iconLock = useIcon({ icon: 'ep:lock' })
const formLogin = ref()
const { validForm } = useFormValid(formLogin)
const { setLoginState, getLoginState } = useLoginState()
const { currentRoute, push } = useRouter()
const permissionStore = usePermissionStore()
const redirect = ref<string>('')
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
    tenantName: import.meta.env.VITE_APP_DEFAULT_LOGIN_TENANT || '',
    username: import.meta.env.VITE_APP_DEFAULT_LOGIN_USERNAME || '',
    password: import.meta.env.VITE_APP_DEFAULT_LOGIN_PASSWORD || '',
    captchaVerification: '',
    rememberMe: true // 默认记录我。如果不需要，可手动修改
  }
})

const socialList = [
  { icon: 'ant-design:wechat-filled', type: 30, color: '#07c160' },
  { icon: 'ant-design:dingtalk-circle-filled', type: 20, color: '#1677ff' },
  { icon: 'ant-design:github-filled', type: 0, color: '#24292f' },
  { icon: 'ant-design:alipay-circle-filled', type: 0, color: '#1677ff' }
]

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
// 获取租户 ID
const getTenantId = async () => {
  if (loginData.tenantEnable) {
    const res = await LoginApi.getTenantIdByName(loginData.loginForm.tenantName)
    authUtil.setTenantId(res)
  }
}
// 记住我
const getLoginFormCache = () => {
  const loginForm = authUtil.getLoginForm()
  if (loginForm) {
    loginData.loginForm = {
      ...loginData.loginForm,
      username: loginForm.username ? loginForm.username : loginData.loginForm.username,
      password: loginForm.password ? loginForm.password : loginData.loginForm.password,
      rememberMe: loginForm.rememberMe,
      tenantName: loginForm.tenantName ? loginForm.tenantName : loginData.loginForm.tenantName
    }
  }
}
// 根据域名，获得租户信息
const getTenantByWebsite = async () => {
  const website = location.host
  const res = await LoginApi.getTenantByWebsite(website)
  if (res) {
    loginData.loginForm.tenantName = res.name
    authUtil.setTenantId(res.id)
  }
}
const loading = ref() // ElLoading.service 返回的实例
// 登录
const handleLogin = async (params: any) => {
  loginLoading.value = true
  try {
    await getTenantId()
    const data = await validForm()
    if (!data) {
      return
    }
    const loginDataLoginForm = { ...loginData.loginForm }
    loginDataLoginForm.captchaVerification = params.captchaVerification
    const res = await LoginApi.login(loginDataLoginForm)
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
    if (!redirect.value) {
      redirect.value = '/'
    }
    // 判断是否为SSO登录
    if (redirect.value.indexOf('sso') !== -1) {
      window.location.href = window.location.href.replace('/login?redirect=', '')
    } else {
      await push({ path: redirect.value || permissionStore.addRouters[0].path })
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

// 社交登录
const doSocialLogin = async (type: number) => {
  if (type === 0) {
    message.error('此方式未配置')
  } else {
    loginLoading.value = true
    if (loginData.tenantEnable) {
      // 尝试先通过 tenantName 获取租户
      await getTenantId()
      // 如果获取不到，则需要弹出提示，进行处理
      if (!authUtil.getTenantId()) {
        try {
          const data = await message.prompt('请输入租户名称', t('common.reminder'))
          if (data?.action !== 'confirm') throw 'cancel'
          const res = await LoginApi.getTenantIdByName(data.value)
          authUtil.setTenantId(res)
        } catch (error) {
          if (error === 'cancel') return
        } finally {
          loginLoading.value = false
        }
      }
    }
    // 计算 redirectUri
    // tricky: type、redirect需要先encode一次，否则钉钉回调会丢失。
    // 配合 Login/SocialLogin.vue#getUrlValue() 使用
    const redirectUri =
      location.origin +
      '/social-login?' +
      encodeURIComponent(`type=${type}&redirect=${redirect.value || '/'}`)

    // 进行跳转
    window.location.href = await LoginApi.socialAuthRedirect(type, encodeURIComponent(redirectUri))
  }
}
watch(
  () => currentRoute.value,
  (route: RouteLocationNormalizedLoaded) => {
    redirect.value = route?.query?.redirect as string
  },
  {
    immediate: true
  }
)
onMounted(() => {
  getLoginFormCache()
  getTenantByWebsite()
})
</script>

<style lang="scss" scoped>
.login-form {
  width: 100%;
  position: relative;
  z-index: 5;
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

// 自定义分隔线
:deep(.custom-divider) {
  margin: 30px 0 20px;
  
  .el-divider__text {
    background-color: white;
    padding: 0 12px;
    color: #94a3b8;
    font-size: 13px;
  }
  
  &::before, &::after {
    border-color: #e2e8f0;
  }
}

// 社交登录容器
.social-login-container {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 15px;
}

// 社交图标
.social-icon {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  background-color: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background-color: #f1f5f9;
    transform: translateY(-2px);
  }
  
  &:active {
    transform: translateY(0);
  }
}

// "记住我"和"忘记密码"行
:deep(.anticon) {
  transition: all 0.3s ease;
}

// 移动端响应式调整
@media (max-width: 767px) {
  .login-form-title {
    position: relative;
    z-index: 10;
    
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
  
  .custom-form-item {
    margin-bottom: 15px;
    position: relative;
    z-index: 10;
  }
  
  :deep(.custom-input) {
    .el-input__wrapper {
      padding: 0 12px;
      position: relative;
      z-index: 10;
    }
    
    .el-input__inner {
      height: 40px;
      font-size: 13px;
    }
    
    .el-input__prefix-inner {
      position: relative;
      z-index: 11;
    }
  }
  
  .login-button {
    height: 42px;
    font-size: 14px;
    position: relative;
    z-index: 10;
  }
  
  .social-login-container {
    gap: 12px;
    position: relative;
    z-index: 10;
  }
  
  .social-icon {
    width: 36px;
    height: 36px;
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
</style>

<style lang="scss">
.dark {
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
  
  // 暗黑模式下的分隔线
  .custom-divider {
    .el-divider__text {
      background-color: #0d1b30;
      color: #64748b;
    }
    
    &::before, &::after {
      border-color: #334155;
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
