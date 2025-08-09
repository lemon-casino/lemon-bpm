<template>
  <div class="login-title-container">
    <div class="title-content">
      <h2 class="login-title">HELLO</h2>
      <p class="login-welcome">欢迎使用{{ systemName }}</p>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { LoginStateEnum, useLoginState } from './useLogin'
import { useAppStore } from '@/store/modules/app'
import { underlineToHump } from '@/utils'

defineOptions({ name: 'LoginFormTitle' })

const { t } = useI18n()
const appStore = useAppStore()

const { getLoginState } = useLoginState()

const systemName = computed(() => underlineToHump(appStore.getTitle) + '管理平台')

const getFormTitle = computed(() => {
  const titleObj = {
    [LoginStateEnum.RESET_PASSWORD]: t('sys.login.forgetFormTitle'),
    [LoginStateEnum.LOGIN]: t('sys.login.signInFormTitle'),
    [LoginStateEnum.SSO]: t('sys.login.ssoFormTitle')
  }
  return titleObj[unref(getLoginState)] || t('sys.login.signInFormTitle')
})

const getSubtitle = computed(() => {
  const subtitleObj = {
    [LoginStateEnum.RESET_PASSWORD]: t('sys.login.forgetFormSubtitle'),
    [LoginStateEnum.LOGIN]: systemName.value,
    [LoginStateEnum.SSO]: t('sys.login.ssoFormSubtitle')
  }
  return subtitleObj[unref(getLoginState)]
})
</script>

<style lang="scss" scoped>
.login-title-container {
  margin-bottom: 30px;
  position: relative;
  z-index: 10;
}

.title-content {
  text-align: center;
  width: 100%;
}

.login-title {
  font-size: 26px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #1a56db;
  letter-spacing: 0;
  position: relative;
  z-index: 10;
}

.login-welcome {
  font-size: 15px;
  color: #1d4ed8;
  font-weight: 500;
  position: relative;
  z-index: 10;
  margin: 0;
}

// 移动端适配
@media (max-width: 767px) {
  .login-title-container {
    margin-bottom: 20px;
    padding: 0 8px;
  }
  
  .title-content {
    text-align: left;
  }
  
  .login-title {
    font-size: 22px;
    margin-bottom: 4px;
  }
  
  .login-welcome {
    font-size: 13px;
    width: 140px;
    line-height: 1.4;
  }
}

.dark {
  .login-title {
    color: #60a5fa;
  }
  
  .login-welcome {
    color: #60a5fa;
  }
}
</style>
