<script lang="ts" setup>
import { computed, onMounted, ref, unref, watch } from 'vue'
import { useAppStore } from '@/store/modules/app'
import { useDesign } from '@/hooks/web/useDesign'

defineOptions({ name: 'Logo' })

const { getPrefixCls } = useDesign()

const prefixCls = getPrefixCls('logo')

const appStore = useAppStore()

const show = ref(true)

const title = computed(() => appStore.getTitle)

const layout = computed(() => appStore.getLayout)

const collapse = computed(() => appStore.getCollapse)

onMounted(() => {
  if (unref(collapse)) show.value = false
})

watch(
  () => collapse.value,
  (collapse: boolean) => {
    if (unref(layout) === 'topLeft' || unref(layout) === 'top' || unref(layout) === 'cutMenu') {
      show.value = true
      return
    }
    if (!collapse) {
      setTimeout(() => {
        show.value = !collapse
      }, 400)
    } else {
      show.value = !collapse
    }
  }
)

watch(
  () => layout.value,
  (layout) => {
    if (layout === 'top' || layout === 'cutMenu') {
      show.value = true
    } else {
      if (unref(collapse)) {
        show.value = false
      } else {
        show.value = true
      }
    }
  }
)
</script>

<template>
  <div class="logo-container">
    <router-link
      :class="[
        prefixCls,
        layout !== 'classic' ? `${prefixCls}__Top` : '',
        'flex items-center cursor-pointer relative decoration-none overflow-hidden logo-wrapper',
        { 'collapsed-logo': collapse }
      ]"
      to="/"
    >
      <div :class="['logo-image-container', { 'collapsed-container': collapse }]">
        <img
          class="logo-image"
          src="@/assets/imgs/logo.png"
          alt="Logo"
        />
        <div class="logo-glow"></div>
        <div :class="['img-breathing-border', { 'collapsed-border': collapse }]"></div>
      </div>

      <div
        v-if="show"
        :class="[
          'logo-title',
          {
            'text-[var(--logo-title-text-color)]': layout === 'classic',
            'text-[var(--top-header-text-color)]':
              layout === 'topLeft' || layout === 'top' || layout === 'cutMenu'
          }
        ]"
      >
        {{ title }}
      </div>
    </router-link>
  </div>
</template>

<style lang="scss" scoped>
.logo-container {
  position: relative;
  background-color: #001529;

  
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: calc(100% - 20px);
    height: 1px;
    background: linear-gradient(to right, 
      rgba(0, 0, 0, 0),
      rgba(0, 0, 0, 0.15),
      rgba(0, 0, 0, 0)
    );
  }
  
  /* 添加阳光效果 */

}

@keyframes sunlight {
  0% {
    opacity: 0.5;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.05);
  }
  100% {
    opacity: 0.5;
    transform: scale(1);
  }
}


.logo-wrapper {
  height: var(--logo-height);
  padding: 0 16px;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  position: relative;
  overflow: hidden;
  z-index: 2;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    background: linear-gradient(to right, 
      rgba(24, 144, 255, 0.05), 
      rgba(24, 144, 255, 0.02),
      rgba(24, 144, 255, 0)
    );
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  &:hover {
    &::before {
      opacity: 1;
    }
    
    .logo-image {
      transform: scale(1.05);
      filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.8));
    }
    
    .logo-glow {
      opacity: 1;
    }
    
    .img-breathing-border:not(.collapsed-border) {
      border-width: 3px;
      box-shadow: 0 0 20px rgba(255, 255, 255, 0.6);
    }
    
    .logo-image-container::before {
      opacity: 1;
      background: #ffffff;
    }
  }
}

// 折叠状态下的Logo样式
.collapsed-logo {
  justify-content: center;
  padding: 0 8px;
  
  .logo-image-container {
    margin: 0 auto;
  }
}

.logo-image-container {
  position: relative;
  width: calc(var(--logo-height) - 18px);
  height: calc(var(--logo-height) - 18px);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 
    0 4px 10px rgba(0, 0, 0, 0.25),
    inset 0 0 0 1px rgba(255, 255, 255, 0.15);
  padding: 4px;
  background-color: #ffffff;
  box-sizing: border-box;
  
  &.collapsed-container {
    width: calc(var(--logo-height) - 20px);
    height: calc(var(--logo-height) - 20px);
  }
}

.logo-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: all 0.3s ease;
  filter: drop-shadow(0 0 5px rgba(24, 144, 255, 0.4));
  z-index: 3;
  position: relative;
}

.logo-glow {
  position: absolute;
  top: -20px;
  left: -20px;
  width: calc(100% + 40px);
  height: calc(100% + 40px);
  background: radial-gradient(circle, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0) 70%);
  opacity: 0.3;
  transition: opacity 0.3s ease;
  pointer-events: none;
  z-index: 2;
}

.img-breathing-border {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  border: 2px solid transparent;
  border-radius: 6px;
  -webkit-mask: 
    linear-gradient(#fff 0 0) padding-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
  opacity: 1;
  z-index: 1;
  transition: all 0.3s ease;
  box-shadow: 0 0 15px rgba(255, 255, 255, 0.4);
  box-sizing: border-box;
  
  &.collapsed-border {
    border-width: 0; /* 移动端折叠状态下移除边框 */
    box-shadow: none;
  }
}

/* 背景元素 */
.logo-image-container::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  border-radius: 6px;
  background: #ffffff;
  z-index: 0;
  transform-origin: center;
  mix-blend-mode: normal;
  box-shadow: none;
}

.logo-title {
  margin-left: 14px;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.5px;
  transition: all 0.3s ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #fff;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}

/* 添加移动端媒体查询 */
@media screen and (max-width: 768px) {
  .logo-image-container {
    width: calc(var(--logo-height) - 22px);
    height: calc(var(--logo-height) - 22px);
    padding: 3px;
    
    &.collapsed-container {
      width: calc(var(--logo-height) - 24px);
      height: calc(var(--logo-height) - 24px);
      padding: 2px;
      box-shadow: none; /* 移除所有阴影，包括内阴影边框 */
    }
  }
  
  .img-breathing-border {
    border-width: 1px;
    box-shadow: 0 0 8px rgba(255, 255, 255, 0.3);
    
    &.collapsed-border {
      border-width: 0; /* 移动端折叠状态下移除边框 */
      box-shadow: none;
    }
  }
  
  .logo-title {
    margin-left: 10px;
    font-size: 16px;
  }
  
  .collapsed-logo {
    padding: 0 4px;
  }
}

/* 平板适配 */
@media screen and (min-width: 769px) and (max-width: 1024px) {
  .logo-image-container {
    width: calc(var(--logo-height) - 20px);
    height: calc(var(--logo-height) - 20px);
    
    &.collapsed-container {
      width: calc(var(--logo-height) - 22px);
      height: calc(var(--logo-height) - 22px);
      box-shadow: none; /* 移除所有阴影，包括内阴影边框 */
    }
  }
  
  .img-breathing-border {
    border-width: 1.5px;
    
    &.collapsed-border {
      border-width: 0; /* 移除边框 */
      box-shadow: none; /* 移除阴影 */
    }
  }
}
</style>
