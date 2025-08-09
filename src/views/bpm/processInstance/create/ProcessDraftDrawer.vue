<template>
  <el-drawer
    v-model="visible"
    :title="title"
    :size="size"
    :destroy-on-close="true"
    :close-on-click-modal="true"
    :with-overlay="true"
    :modal="true"
    direction="rtl"
  >
    <template #header>
      <div class="flex items-center justify-between w-full">
        <div class="flex items-center">
          <span class="text-lg font-bold">{{ title }}</span>
          <el-button 
            type="primary" 
            @click="refreshList" 
            circle 
            size="small"
            class="refresh-button ml-3"
          >
            <el-icon><Refresh /></el-icon>
          </el-button>
        </div>
      </div>
    </template>
    
    <div class="draft-list-container" v-loading="loading">
      <el-empty v-if="draftList.length === 0" description="暂无草稿" />
      
      <div v-else class="draft-list">
        <div 
          v-for="draft in draftList" 
          :key="draft.id" 
          class="draft-item"
          @click="handleSelect(draft)"
          @mouseenter="hoveredDraftId = draft.id"
          @mouseleave="hoveredDraftId = null"
        >
          <div class="draft-content">
            <div class="draft-name">{{ getDraftName(draft) }}</div>
            <div class="draft-time">{{ formatTime(draft.updateTime || draft.createTime) }}</div>
          </div>
          
          <!-- 悬停时显示的操作按钮 -->
          <div class="draft-actions" v-show="hoveredDraftId === draft.id">
            <el-button 
              type="danger" 
              circle 
              size="small" 
              @click.stop="handleDelete(draft)"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </div>
      </div>
      
      <!-- 底部提示 -->
      <div class="drawer-footer-tip">
        <p>点击空白区域可关闭侧边栏</p>
      </div>
    </div>
    
    <!-- 遮罩层，用于点击关闭 -->
    <div class="drawer-mask" @click="close" v-if="visible"></div>
  </el-drawer>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { Delete, Refresh } from '@element-plus/icons-vue'
import * as DraftApi from '@/api/bpm/draft'
import { useMessage } from '@/hooks/web/useMessage'
import { formatDate } from '@/utils/formatTime'

const props = defineProps({
  modelId: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['select'])

const message = useMessage()
const visible = ref(false)
const loading = ref(false)
const draftList = ref<DraftApi.BpmProcessDraftDO[]>([])
const hoveredDraftId = ref<number | null>(null)

const title = computed(() => '流程草稿列表')
const size = computed(() => '350px')

// 点击ESC键关闭抽屉
const handleEscKey = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && visible.value) {
    close()
  }
}

onMounted(() => {
  // 添加ESC键监听
  document.addEventListener('keydown', handleEscKey)
})

onBeforeUnmount(() => {
  // 移除ESC键监听
  document.removeEventListener('keydown', handleEscKey)
})

// 打开抽屉
const open = async () => {
  visible.value = true
  await refreshList()
}

// 关闭抽屉
const close = () => {
  visible.value = false
}

// 获取草稿名称
const getDraftName = (draft: DraftApi.BpmProcessDraftDO) => {
  if (draft.name) {
    return draft.name
  }
  
  // 如果没有名称，则使用流程定义键和时间作为名称
  const time = formatDate(new Date(draft.createTime), 'MM-DD HH:mm')
  return `${draft.processDefinitionKey || '未命名'} (${time})`
}

// 刷新草稿列表
const refreshList = async () => {
  loading.value = true
  try {
    const result = await DraftApi.getDraftList(props.modelId)
    
    // 处理数据，确保formVariables字段存在
    draftList.value = result.map(draft => {
      // 如果后端返回的是variables而不是formVariables，进行转换
      if (!draft.formVariables && draft.variables) {
        draft.formVariables = draft.variables
      }
      return draft
    })
  } catch (error) {
    console.error('获取草稿列表失败', error)
    message.error('获取草稿列表失败')
  } finally {
    loading.value = false
  }
}

// 选择草稿
const handleSelect = (draft: DraftApi.BpmProcessDraftDO) => {
  // 确保有formVariables字段
  if (!draft.formVariables && draft.variables) {
    draft.formVariables = draft.variables
  }
  
  // 检查草稿数据
  if (!draft.formVariables && !draft.variables) {
    message.warning('草稿中没有表单数据')
    return
  }
  
  emit('select', draft)
  close()
}

// 删除草稿
const handleDelete = async (draft: DraftApi.BpmProcessDraftDO) => {
  try {
    await DraftApi.deleteDraft(draft.id)
    message.success('删除成功')
    await refreshList()
  } catch (error) {
    console.error('删除草稿失败', error)
    message.error('删除草稿失败')
  }
}

// 格式化时间
const formatTime = (time: string) => {
  if (!time) return ''
  return formatDate(new Date(time), 'YYYY-MM-DD HH:mm')
}

defineExpose({
  open,
  close
})
</script>

<style lang="scss" scoped>
.draft-list-container {
  height: 100%;
  padding: 0 10px;
  position: relative;
}

.draft-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 50px; /* 为底部提示留出空间 */
}

.draft-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-radius: 6px;
  background-color: var(--el-fill-color-light);
  cursor: pointer;
  transition: all 0.3s;
  border: 1px solid transparent;
  
  &:hover {
    background-color: var(--el-fill-color);
    border-color: var(--el-border-color);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }
}

.draft-content {
  flex: 1;
  overflow: hidden;
}

.draft-name {
  font-size: 15px;
  font-weight: 500;
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--el-text-color-primary);
}

.draft-time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.draft-actions {
  margin-left: 12px;
}

.refresh-button {
  margin-left: 12px;
}

.drawer-footer-tip {
  position: absolute;
  bottom: 15px;
  left: 0;
  right: 0;
  text-align: center;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  padding: 8px 0;
}

:deep(.el-drawer__header) {
  margin-bottom: 0;
  padding: 15px 20px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  
  .el-drawer__title {
    font-size: 16px;
    font-weight: 600;
  }
  
  .el-drawer__close-btn {
    margin-left: 12px;
  }
}

:deep(.el-drawer__body) {
  padding: 16px;
  position: relative;
}

:deep(.el-button .el-icon) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* 遮罩层样式 */
.drawer-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: transparent;
  z-index: -1;
}
</style> 