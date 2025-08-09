<template>
  <el-dialog
    :title="title"
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    @open="handleDialogOpen"
    :fullscreen="false"
    width="800"
    class="form-preview-dialog"
    destroy-on-close
    draggable
    :close-on-click-modal="false"
  >
    <div class="form-preview-wrapper">
      <div class="form-preview-container" ref="containerRef">
        <form-create :rule="rule" :option="option" />
      </div>
      
      <!-- 滚动按钮 -->
      <div class="scroll-buttons" v-if="isDialogOpen">
        <div 
          v-show="showTopBtn"
          class="scroll-btn"
          @click="scrollToTop"
        >
          <el-icon :size="20">
            <ArrowUpBold />
          </el-icon>
        </div>
        <div 
          v-show="showBottomBtn"
          class="scroll-btn"
          @click="scrollToBottom"
        >
          <el-icon :size="20">
            <ArrowDownBold />
          </el-icon>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { ArrowUpBold, ArrowDownBold } from '@element-plus/icons-vue'
import { useDebounceFn } from '@vueuse/core'

defineOptions({ name: 'FormPreviewDialog' })

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  title: {
    type: String,
    default: '表单详情'
  },
  rule: {
    type: Array,
    required: true
  },
  option: {
    type: Object,
    required: true
  },
  scrollThreshold: {
    type: Number,
    default: 100
  }
})

defineEmits(['update:modelValue'])

const containerRef = ref<HTMLElement | null>(null)
const showTopBtn = ref(false)
const showBottomBtn = ref(false)
const isDialogOpen = ref(false)

// 使用防抖优化滚动性能
const handleScroll = useDebounceFn(() => {
  const container = containerRef.value
  if (container) {
    const { scrollTop, scrollHeight, clientHeight } = container
    showTopBtn.value = scrollTop > props.scrollThreshold
    showBottomBtn.value = scrollTop + clientHeight < scrollHeight - props.scrollThreshold
  }
}, 100)

const scrollToTop = () => {
  const container = containerRef.value
  if (container) {
    container.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }
}

const scrollToBottom = () => {
  const container = containerRef.value
  if (container) {
    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth'
    })
  }
}

const initScrollButtons = async () => {
  await nextTick()
  // 等待内容渲染完成后再检查滚动状态
  setTimeout(() => {
    handleScroll()
  }, 300)
}

const handleDialogOpen = () => {
  isDialogOpen.value = true
  // 初始化滚动监听
  containerRef.value?.addEventListener('scroll', handleScroll)
  // 初始化滚动按钮状态
  initScrollButtons()
}

onUnmounted(() => {
  containerRef.value?.removeEventListener('scroll', handleScroll)
})

// 监听 modelValue 变化，当对话框关闭时重置状态
watch(() => props.modelValue, (newVal) => {
  if (!newVal) {
    isDialogOpen.value = false
    showTopBtn.value = false
    showBottomBtn.value = false
  }
})
</script>

<style lang="scss">
.form-preview-dialog.el-dialog {
  margin: 5vh auto !important;
  
  .el-dialog__body {
    position: relative;
    padding: 0;
    height: 70vh;
    max-height: 800px;
  }

  .el-dialog__header {
    cursor: move;
    margin: 0;
    padding: 15px 20px;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }
}
</style>

<style lang="scss" scoped>
.form-preview-wrapper {
  position: relative;
  height: 100%;
  width: 100%;
}

.form-preview-container {
  height: 100%;
  width: 100%;
  overflow-y: auto;
  padding: 20px;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-thumb {
    background-color: var(--el-color-primary-light-5);
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-track {
    background-color: #f5f7fa;
  }
}

.scroll-buttons {
  position: absolute;
  right: 20px;
  bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 2001;

  .scroll-btn {
    background-color: var(--el-color-primary);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    box-shadow: 0 2px 12px 0 rgba(0,0,0,.1);
    cursor: pointer;
    transition: all 0.3s;
    opacity: 0.8;

    &:hover {
      background-color: var(--el-color-primary);
      opacity: 1;
      transform: scale(1.1);
    }
  }
}
</style> 