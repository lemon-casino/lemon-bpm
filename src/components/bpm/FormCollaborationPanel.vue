<template>
  <div class="form-collaboration-wrapper" :class="{ 'right-layout': isRightLayout }">
    <!-- 协作状态栏 -->
    <div v-if="showStatusBar && isCollaborationEnabled" ref="statusBarRef" class="collaboration-status-bar" @click="toggleUsersPanel">
      <div class="status-content">
        <div class="status-left">
          <div class="status-icon"></div>
          <span class="status-text">{{ isRightLayout ? '协同编辑' : '实时协同编辑' }}</span>
          <span class="online-count">({{ onlineUserCount }}人在线)</span>
          <el-icon v-if="isRightLayout" class="expand-icon" :class="{ expanded: showUsersPanel }">
            <ArrowDown />
          </el-icon>
        </div>
      </div>
    </div>

    <!-- 协作用户面板 -->
    <div v-if="showUserPanel && isCollaborationEnabled" ref="usersPanelRef" class="collaboration-users-panel" v-show="showUsersPanel" :class="{ 'dragging': isDragging }">
      <div class="panel-header" @mousedown="startDrag" style="cursor: move;">
        <div class="online-indicator"></div>
        <span class="header-title">协作用户 ({{ onlineUserCount }})</span>
        <div class="drag-handle">⋮⋮</div>
      </div>
      
      <div class="users-list">
        <!-- 其他协作用户 -->
        <div 
          v-for="user in collaboratingUsers" 
          :key="user.id"
          class="user-card"
          @click="handleUserClick(user.id)"
        >
          <el-avatar
            class="user-avatar"
            :size="28"
            v-if="user.avatar"
            :src="user.avatar"
          />
          <el-avatar class="user-avatar" :size="28" v-else>
            {{ user.nickname?.substring(0, 1) || 'U' }}
          </el-avatar>
          <div class="user-info">
            <div class="user-name">{{ user.nickname || '未知用户' }}</div>
            <div v-if="getUserEditingStatus(user.id)?.editingField" class="editing-field">
              正在编辑：{{ getFieldDisplayName(getUserEditingStatus(user.id)?.editingField) }}
            </div>
          </div>
          <!-- 在线状态指示器 -->
          <div 
            class="status-indicator"
            :class="{ 
              editing: !!getUserEditingStatus(user.id)?.editingField,
              online: isUserOnline(user.id),
              offline: !isUserOnline(user.id)
            }"
            :title="getUserEditingStatus(user.id)?.editingField ? '编辑中' : (isUserOnline(user.id) ? '在线' : '离线')"
          >
            <el-icon v-if="getUserEditingStatus(user.id)?.editingField" class="editing-icon">
              <Edit />
            </el-icon>
            <div v-else class="online-dot" :class="{ offline: !isUserOnline(user.id) }"></div>
          </div>
        </div>
        
        <!-- 当前用户 -->
        <div class="user-card current-user">
          <el-avatar
            class="user-avatar"
            :size="28"
            v-if="currentUser.avatar"
            :src="currentUser.avatar"
          />
          <el-avatar class="user-avatar" :size="28" v-else>
            {{ currentUser.nickname?.substring(0, 1) || 'M' }}
          </el-avatar>
          <div class="user-info">
            <div class="user-name">{{ currentUser.nickname || '我' }} (我)</div>
            <div v-if="currentEditingField" class="editing-field">
              正在编辑：{{ getFieldDisplayName(currentEditingField) }}
            </div>
          </div>
          <!-- 在线状态指示器 -->
          <div 
            class="status-indicator"
            :class="{ editing: !!currentEditingField }"
            :title="currentEditingField ? '编辑中' : '在线'"
          >
            <el-icon v-if="currentEditingField" class="editing-icon">
              <Edit />
            </el-icon>
            <div v-else class="online-dot"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 字段锁定提示 -->
    <teleport to="body">
      <div 
        v-for="(lockInfo, fieldName) in lockedFields" 
        :key="fieldName"
        v-show="shouldShowLockTooltip(lockInfo)"
        class="field-lock-tooltip"
        :style="getLockTooltipPosition(fieldName)"
      >
        {{ lockInfo.userNickname }} 正在编辑此字段
      </div>
    </teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { ArrowDown, Edit } from '@element-plus/icons-vue'
import { useUserStore } from '@/store/modules/user'
import type { FieldLockInfo, UserEditingStatus } from '@/hooks/web/useFormCollaboration'

interface Props {
  lockedFields: Map<string, FieldLockInfo>
  collaboratingUsers: Map<number, UserEditingStatus>
  processUsers?: any[] // 流程相关用户列表
  currentEditingField: string | null
  isCollaborationEnabled: boolean
  showStatusBar?: boolean
  showUserPanel?: boolean
  fieldDisplayNames?: Record<string, string>
  isRightLayout?: boolean // 是否为右侧布局
  confirmedOnlineUsers?: Set<number> // 确认在线的用户ID集合
}

interface Emits {
  (e: 'toggle-collaboration'): void
  (e: 'user-click', userId: number): void
}

const props = withDefaults(defineProps<Props>(), {
  showStatusBar: true,
  showUserPanel: true,
  fieldDisplayNames: () => ({}),
  isRightLayout: false,
  processUsers: () => []
})

const emit = defineEmits<Emits>()

// 用户面板显示控制
const showUsersPanel = ref(false)
const statusBarRef = ref<HTMLElement>()
const usersPanelRef = ref<HTMLElement>()

// 拖动相关状态
const isDragging = ref(false)
const dragOffset = ref({ x: 0, y: 0 })
const panelPosition = ref({ x: 0, y: 0 })

const userStore = useUserStore()
const currentUser = userStore.getUser

// 响应式计算属性
const onlineUserCount = computed(() => {
  // 基于确认在线的用户数量
  if (props.confirmedOnlineUsers) {
    // 确认在线用户数量，确保包含当前用户
    const onlineCount = props.confirmedOnlineUsers.size
    const hasCurrentUser = props.confirmedOnlineUsers.has(currentUser.id)
    return hasCurrentUser ? onlineCount : onlineCount + 1
  }
  // 否则使用原有逻辑（协作用户数量 + 当前用户）
  return props.collaboratingUsers.size + 1
})

const collaboratingUsers = computed(() => {
  // 如果有确认在线用户列表，使用该列表
  if (props.confirmedOnlineUsers) {
    const onlineUsers: any[] = []
    for (const userId of props.confirmedOnlineUsers) {
      const userInfo = props.processUsers?.find(user => user.id === userId)
      if (userInfo) {
        const editingStatus = props.collaboratingUsers.get(userId)
        onlineUsers.push({
          ...userInfo,
          editingStatus: editingStatus || { editingField: null, isOnline: true }
        })
      }
    }
    return onlineUsers
  }
  
  // 否则使用原有逻辑
  const onlineUsers: any[] = []
  props.collaboratingUsers.forEach((status, userId) => {
    const userInfo = props.processUsers?.find(user => user.id === userId)
    if (userInfo) {
      onlineUsers.push({
        ...userInfo,
        editingStatus: status
      })
    }
  })
  
  return onlineUsers
})

// 检查用户是否在线（优先使用确认在线用户列表）
const isUserOnline = (userId: number): boolean => {
  if (props.confirmedOnlineUsers) {
    return props.confirmedOnlineUsers.has(userId)
  }
  return props.collaboratingUsers.has(userId)
}

// 获取用户的编辑状态
const getUserEditingStatus = (userId: number) => {
  return props.collaboratingUsers.get(userId)
}

// 工具提示位置管理
const tooltipPositions = ref<Map<string, { x: number, y: number }>>(new Map())

/**
 * 根据用户ID生成唯一颜色
 */
const getUserColor = (userId: number): string => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ]
  return colors[userId % colors.length]
}

/**
 * 获取字段显示名称
 */
const getFieldDisplayName = (fieldName: string): string => {
  return props.fieldDisplayNames[fieldName] || fieldName
}

/**
 * 切换用户面板显示
 */
const toggleUsersPanel = () => {
  if (props.isRightLayout && props.isCollaborationEnabled) {
    showUsersPanel.value = !showUsersPanel.value
    if (showUsersPanel.value) {
      // 延迟计算位置，确保DOM已更新
      setTimeout(updateUsersPanelPosition, 50)
    }
  }
}

/**
 * 开始拖动
 */
const startDrag = (event: MouseEvent) => {
  if (!usersPanelRef.value) return
  
  event.preventDefault()
  isDragging.value = true
  
  const rect = usersPanelRef.value.getBoundingClientRect()
  dragOffset.value = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  }
  
  // 记录当前位置
  panelPosition.value = {
    x: rect.left,
    y: rect.top
  }
  
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  document.body.style.userSelect = 'none'
}

/**
 * 拖动过程中
 */
const onDrag = (event: MouseEvent) => {
  if (!isDragging.value || !usersPanelRef.value) return
  
  const newX = event.clientX - dragOffset.value.x
  const newY = event.clientY - dragOffset.value.y
  
  // 限制在视窗范围内
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const panelWidth = usersPanelRef.value.offsetWidth
  const panelHeight = usersPanelRef.value.offsetHeight
  
  const constrainedX = Math.max(0, Math.min(newX, viewportWidth - panelWidth))
  const constrainedY = Math.max(0, Math.min(newY, viewportHeight - panelHeight))
  
  panelPosition.value = { x: constrainedX, y: constrainedY }
  
  // 应用新位置
  usersPanelRef.value.style.left = `${constrainedX}px`
  usersPanelRef.value.style.top = `${constrainedY}px`
  usersPanelRef.value.style.right = 'auto'
}

/**
 * 停止拖动
 */
const stopDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.body.style.userSelect = ''
}

/**
 * 更新用户面板位置，确保在可视区域内
 */
const updateUsersPanelPosition = () => {
  if (!statusBarRef.value || !usersPanelRef.value) return
  
  const statusBarRect = statusBarRef.value.getBoundingClientRect()
  const panelElement = usersPanelRef.value
  const viewportHeight = window.innerHeight
  const viewportWidth = window.innerWidth
  
  // 计算面板的理想位置
  let top = statusBarRect.bottom + 8
  let right = 20
  
  // 检查是否会超出底部边界
  const panelHeight = panelElement.offsetHeight || 300 // 默认高度（横排布局后高度减少）
  if (top + panelHeight > viewportHeight - 20) {
    // 如果超出底部，则显示在状态栏上方
    top = statusBarRect.top - panelHeight - 8
    
    // 如果上方也不够空间，则调整到可视区域内
    if (top < 20) {
      top = 20
      panelElement.style.maxHeight = `${viewportHeight - 40}px`
    }
  }
  
  // 检查是否会超出右侧边界
  const panelWidth = panelElement.offsetWidth || 380 // 默认宽度（横排布局后宽度增加）
  if (right + panelWidth > viewportWidth - 20) {
    right = viewportWidth - panelWidth - 20
  }
  
  // 应用计算出的位置
  panelElement.style.top = `${top}px`
  panelElement.style.right = `${right}px`
}

/**
 * 切换协同编辑状态
 */
const toggleCollaboration = () => {
  emit('toggle-collaboration')
}

/**
 * 是否显示锁定提示
 */
const shouldShowLockTooltip = (lockInfo: FieldLockInfo): boolean => {
  return lockInfo.userId !== currentUser.id
}

/**
 * 获取锁定提示位置
 */
const getLockTooltipPosition = (fieldName: string) => {
  const position = tooltipPositions.value.get(fieldName)
  if (!position) return { display: 'none' }
  
  return {
    left: `${position.x}px`,
    top: `${position.y - 40}px`
  }
}

/**
 * 更新提示位置
 */
const updateTooltipPositions = () => {
  for (const [fieldName] of props.lockedFields) {
    const fieldElement = document.querySelector(`[data-field="${fieldName}"]`) || 
                        document.querySelector(`input[name="${fieldName}"]`) ||
                        document.querySelector(`textarea[name="${fieldName}"]`) ||
                        document.querySelector(`select[name="${fieldName}"]`)
    
    if (fieldElement) {
      const rect = fieldElement.getBoundingClientRect()
      tooltipPositions.value.set(fieldName, {
        x: rect.left + rect.width / 2,
        y: rect.top + window.scrollY
      })
    }
  }
}

/**
 * 处理用户点击
 */
const handleUserClick = (userId: number) => {
  emit('user-click', userId)
}

// 监听锁定字段变化，更新提示位置
watch(() => props.lockedFields, () => {
  setTimeout(updateTooltipPositions, 100)
}, { deep: true })

// 监听窗口滚动和大小变化
let scrollTimer: number | null = null
const handleScroll = () => {
  if (scrollTimer) clearTimeout(scrollTimer)
  scrollTimer = window.setTimeout(updateTooltipPositions, 100)
}

const handleResize = () => {
  updateTooltipPositions()
  if (showUsersPanel.value && props.isRightLayout) {
    updateUsersPanelPosition()
  }
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
  window.addEventListener('resize', handleResize)
  document.addEventListener('click', handleClickOutside)
  updateTooltipPositions()
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('resize', handleResize)
  document.removeEventListener('click', handleClickOutside)
  // 清理拖动事件监听器
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  if (scrollTimer) clearTimeout(scrollTimer)
})

// 注意：此组件通过props接收协同编辑数据，不直接调用useFormCollaboration
// 连接状态和重连功能应该由父组件提供

// 监听窗口大小变化，更新用户面板位置
watch(() => showUsersPanel.value, (newValue) => {
  if (newValue && props.isRightLayout) {
    setTimeout(updateUsersPanelPosition, 50)
  }
})

// 监听窗口滚动，更新用户面板位置
const handleUsersPanelScroll = () => {
  if (showUsersPanel.value && props.isRightLayout) {
    updateUsersPanelPosition()
  }
}

// 点击外部关闭用户面板
const handleClickOutside = (event: MouseEvent) => {
  if (!showUsersPanel.value) return
  
  const target = event.target as HTMLElement
  const statusBar = statusBarRef.value
  const usersPanel = usersPanelRef.value
  
  // 如果点击的不是状态栏和用户面板，则关闭面板
  if (statusBar && !statusBar.contains(target) && 
      usersPanel && !usersPanel.contains(target)) {
    showUsersPanel.value = false
  }
}
</script>

<style scoped>
/* 组件特定样式 */
.form-collaboration-wrapper {
  position: relative;
}

.users-list {
  max-height: 300px;
  overflow-y: auto;
}

.user-item {
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: #f5f5f5;
  }
}

.user-avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

/* 滚动条样式 */
.users-list::-webkit-scrollbar {
  width: 4px;
}

.users-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 2px;
}

.users-list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 2px;
}

.users-list::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.online-indicator {
  width: 8px;
  height: 8px;
  background: #52c41a;
  border-radius: 50%;
  margin-right: 8px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(82, 196, 26, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(82, 196, 26, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(82, 196, 26, 0);
  }
}


</style>