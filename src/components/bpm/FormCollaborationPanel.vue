<template>
  <div 
    ref="panelRef"
    class="collaboration-panel" 
    :class="{ 'dragging': isDragging, 'visible': isVisible, 'collapsed': isCollapsed }"
    :style="panelStyle"
    v-if="isVisible"
  >
    <!-- 面板头部 - 可拖拽区域 -->
    <div class="panel-header" @mousedown="startDrag" @click="toggleCollapse">
      <div class="header-left">
        <div class="panel-icon">
          <el-icon><Connection /></el-icon>
        </div>
        <span class="panel-title">在线协作用户</span>
      </div>
      <div class="header-right">
        <div class="online-count">{{ onlineUsers.length }}人在线</div>
        <el-icon class="toggle-icon" v-if="!isCollapsed">
          <ArrowUp />
        </el-icon>
        <el-icon class="toggle-icon" v-else>
          <ArrowDown />
        </el-icon>
        <el-icon class="close-icon" @click.stop="hidePanel"><Close /></el-icon>
      </div>
    </div>
    
    <!-- 用户列表 -->
    <div class="user-list-container" v-show="!isCollapsed">
      <transition-group name="user-list" tag="ul" class="user-list" v-if="onlineUsers.length">
        <li v-for="user in onlineUsers" :key="user.id" class="user-item" :class="{'highlighted': user.id % 2 === 0}">
          <div class="user-avatar">
            <el-avatar :size="36" v-if="user.avatar" :src="user.avatar" />
            <el-avatar :size="36" v-else>{{ user.nickname?.substring(0, 1) }}</el-avatar>
            <div class="online-indicator"></div>
          </div>
          <div class="user-info">
            <span class="user-name">{{ user.nickname }}</span>
            <!-- 显示用户正在编辑的字段 -->
            <div v-if="userEditingFields[user.id]" class="user-editing">
              <span class="editing-label">正在编辑:</span>
              <el-tag size="small" type="info" class="editing-field">
                {{ userEditingFields[user.id] }}
              </el-tag>
            </div>
          </div>
          <div class="user-status">在线</div>
        </li>
      </transition-group>
      <div v-else class="empty-state">
        <el-icon class="empty-icon"><UserFilled /></el-icon>
        <p>暂无在线用户</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { Close, Connection, UserFilled, ArrowUp, ArrowDown } from '@element-plus/icons-vue'

interface Props {
  processUsers: any[]
  confirmedOnlineUsers: Set<number>
  activeEditors?: Map<string, number>
  fieldLabelMap?: Record<string, string>
}

const props = defineProps<Props>()
const emit = defineEmits(['update:visible'])

// 计算在线用户
const onlineUsers = computed(() =>
  props.processUsers.filter((u) => props.confirmedOnlineUsers.has(u.id))
)

// 计算用户正在编辑的字段
const userEditingFields = computed(() => {
  if (!props.activeEditors || !props.fieldLabelMap) return {}
  
  const result: Record<number, string> = {}
  
  // 遍历所有正在编辑的字段
  props.activeEditors.forEach((userId, fieldName) => {
    // 获取字段显示名称
    const fieldLabel = props.fieldLabelMap?.[fieldName] || fieldName
    result[userId] = fieldLabel
  })
  
  return result
})

// 面板可见性
const isVisible = ref(false)
const isCollapsed = ref(false)

// 显示面板
const showPanel = () => {
  isVisible.value = true
  isCollapsed.value = false // 默认展开显示
}

// 隐藏面板
const hidePanel = () => {
  isVisible.value = false
}

// 折叠面板但不隐藏
const collapsePanel = () => {
  if (isVisible.value && !isCollapsed.value) {
    isCollapsed.value = true
  }
}

// 切换折叠状态
const toggleCollapse = (e: MouseEvent) => {
  // 如果点击的是关闭按钮，不切换折叠状态
  if ((e.target as HTMLElement).closest('.close-icon')) {
    return
  }
  isCollapsed.value = !isCollapsed.value
}

// 切换面板显示状态（用于外部按钮点击）
const togglePanel = () => {
  if (isVisible.value) {
    if (isCollapsed.value) {
      // 如果已经可见但是折叠状态，则展开
      isCollapsed.value = false
    } else {
      // 如果已经可见且展开状态，则隐藏
      isVisible.value = false
    }
  } else {
    // 如果不可见，则显示并展开
    isVisible.value = true
    isCollapsed.value = false
  }
}

// 拖拽功能实现
const isDragging = ref(false)
const panelRef = ref<HTMLElement | null>(null)
// 初始位置设置在右侧
const position = ref({ right: 20, top: 80 })
const dragOffset = ref({ x: 0, y: 0 })

const panelStyle = computed(() => ({
  right: `${position.value.right}px`,
  top: `${position.value.top}px`,
}))

const startDrag = (e: MouseEvent) => {
  // 如果点击的是关闭按钮，不启动拖拽
  if ((e.target as HTMLElement).closest('.close-icon')) {
    return
  }
  
  // 如果是单击事件，不启动拖拽（允许折叠/展开操作）
  if (e.type === 'click') {
    return
  }
  
  isDragging.value = true
  
  if (panelRef.value) {
    const rect = panelRef.value.getBoundingClientRect()
    dragOffset.value = {
      x: e.clientX - (window.innerWidth - rect.right),
      y: e.clientY - rect.top
    }
  }
  
  // 添加全局事件监听器
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  
  // 防止文本选择
  e.preventDefault()
}

const onDrag = (e: MouseEvent) => {
  if (!isDragging.value) return
  
  // 计算新位置，保持在窗口内
  const newRight = Math.max(0, window.innerWidth - e.clientX - dragOffset.value.x)
  const newTop = Math.max(0, Math.min(window.innerHeight - 300, e.clientY - dragOffset.value.y))
  
  position.value = { right: newRight, top: newTop }
}

const stopDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

// 组件卸载时清理事件监听器
onUnmounted(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
})

// 暴露方法给父组件
defineExpose({
  showPanel,
  hidePanel,
  togglePanel,
  collapsePanel
})
</script>

<style scoped>
.collaboration-panel {
  position: fixed;
  z-index: 2000;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  width: 280px;
  overflow: hidden;
  opacity: 0;
  transform: translateY(-10px);
  transition: opacity 0.25s ease, transform 0.25s ease, height 0.3s ease;
  pointer-events: none;
  border: 1px solid rgba(235, 238, 245, 0.8);
}

.collaboration-panel.visible {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.collaboration-panel.collapsed {
  height: 48px; /* 只显示头部高度 */
}

.collaboration-panel.dragging {
  opacity: 0.92;
  transition: none;
  cursor: move;
}

.panel-header {
  padding: 12px 16px;
  background-color: #409eff;
  color: white;
  font-size: 15px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: space-between;
  user-select: none;
  cursor: pointer;
}

.header-left, .header-right {
  display: flex;
  align-items: center;
}

.panel-icon {
  margin-right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  width: 24px;
  height: 24px;
}

.panel-title {
  letter-spacing: 0.5px;
}

.online-count {
  font-size: 13px;
  margin-right: 8px;
  background-color: rgba(255, 255, 255, 0.2);
  padding: 2px 8px;
  border-radius: 10px;
}

.toggle-icon {
  margin-right: 8px;
  font-size: 14px;
}

.close-icon {
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  transition: background-color 0.2s;
  font-size: 16px;
}

.close-icon:hover {
  background-color: rgba(255, 255, 255, 0.3);
}

.user-list-container {
  max-height: 300px;
  overflow-y: auto;
}

.user-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.user-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  position: relative;
}

.user-item.highlighted {
  background-color: #f5f7fa;
}

.user-avatar {
  position: relative;
  margin-right: 12px;
}

.online-indicator {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 8px;
  height: 8px;
  background-color: #67c23a;
  border-radius: 50%;
  border: 1px solid #ffffff;
}

.user-info {
  flex: 1;
  overflow: hidden;
}

.user-name {
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #303133;
}

.user-editing {
  display: flex;
  align-items: center;
  margin-top: 4px;
  font-size: 12px;
}

.editing-label {
  color: #909399;
  margin-right: 4px;
}

.editing-field {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-status {
  font-size: 13px;
  color: #67c23a;
  margin-left: 8px;
}

.empty-state {
  padding: 30px 20px;
  text-align: center;
  color: #909399;
  font-size: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.empty-icon {
  font-size: 36px;
  margin-bottom: 10px;
  color: #c0c4cc;
}

/* 用户列表动画 */
.user-list-enter-active,
.user-list-leave-active {
  transition: all 0.3s;
}

.user-list-enter-from,
.user-list-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* 自定义滚动条 */
.user-list-container::-webkit-scrollbar {
  width: 4px;
}

.user-list-container::-webkit-scrollbar-track {
  background: transparent;
}

.user-list-container::-webkit-scrollbar-thumb {
  background: #dcdfe6;
  border-radius: 2px;
}

.user-list-container::-webkit-scrollbar-thumb:hover {
  background: #c0c4cc;
}
</style>
