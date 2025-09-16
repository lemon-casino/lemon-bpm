<template>
  <Dialog 
    v-model="dialogVisible" 
    title="人员选择" 
    :width="isMobileDevice ? '95%' : '800px'"
    :class="{ 
      'mobile-user-select-dialog': isMobileDevice,
      'ios-mobile-dialog': isMobileDevice && isIOS 
    }"
  >
    <!-- 移动端：直接人员选择 -->
    <div v-if="isMobileDevice" class="mobile-layout" v-loading="formLoading">
      <!-- 顶部操作区域：只有按钮 -->
      <div class="mobile-top-area">
        <!-- 操作按钮 -->
        <div class="mobile-action-buttons">
          <el-button
            :disabled="formLoading || !selectedUserIdList?.length"
            type="primary"
            @click="submitForm"
            class="mobile-confirm-btn"
          >
            确定 {{ selectedUserIdList?.length ? `(${selectedUserIdList.length})` : '' }}
          </el-button>
          <el-button 
            @click="dialogVisible = false"
            class="mobile-cancel-btn"
          >
            取消
          </el-button>
        </div>
      </div>
      
      <!-- 内容区域：直接显示人员选择 -->
      <div class="mobile-content-area">
        <div class="mobile-tab-content">
          <div class="mobile-user-selection">
            <!-- 已选择的用户列表 -->
            <div class="mobile-user-section collapsible" v-if="selectedUsers.length">
              <div class="mobile-section-header" @click="selectedCollapsed = !selectedCollapsed">
                <div class="section-title-area">
                  <Icon 
                    :icon="selectedCollapsed ? 'ep:arrow-right' : 'ep:arrow-down'" 
                    class="collapse-icon"
                  />
                  <span>已选 ({{ selectedUsers.length }})</span>
                </div>
                <el-button 
                  v-if="selectedUsers.length" 
                  type="danger" 
                  size="small" 
                  text
                  @click.stop="clearAllSelected"
                >
                  清空
                </el-button>
              </div>
              <el-collapse-transition>
                <div v-show="!selectedCollapsed" class="mobile-user-list">
                  <div 
                    v-for="user in selectedUsers" 
                    :key="user.id"
                    class="mobile-user-item selected"
                  >
                    <el-avatar :size="32" :src="user.avatar">
                      <span>{{ user.nickname?.charAt(0) || '?' }}</span>
                    </el-avatar>
                    <div class="mobile-user-info">
                      <div class="mobile-user-name">{{ user.nickname }}</div>
                      <div class="mobile-user-dept">{{ getDeptName(user.deptId) }}</div>
                    </div>
                    <el-button 
                      type="danger" 
                      size="small" 
                      circle
                      class="mobile-remove-btn"
                      @click="removeUser(user)"
                    >
                      <Icon icon="ep:close" />
                    </el-button>
                  </div>
                </div>
              </el-collapse-transition>
            </div>
            
            <!-- 未选择的用户列表 -->
            <div class="mobile-user-section collapsible">
              <div class="mobile-section-header" @click="unselectedCollapsed = !unselectedCollapsed">
                <div class="section-title-area">
                  <Icon 
                    :icon="unselectedCollapsed ? 'ep:arrow-right' : 'ep:arrow-down'" 
                    class="collapse-icon"
                  />
                  <span>未选 ({{ unselectedUsers.length }})</span>
                </div>
                <el-input
                  v-model="searchKeyword"
                  placeholder="搜索成员"
                  size="small"
                  class="mobile-search"
                  clearable
                  @click.stop
                >
                  <template #prefix>
                    <Icon icon="ep:search" />
                  </template>
                </el-input>
              </div>
              <el-collapse-transition>
                <div v-show="!unselectedCollapsed" class="mobile-user-list">
                  <div 
                    v-for="user in filteredUnselectedUsers" 
                    :key="user.id"
                    class="mobile-user-item"
                    @click="selectUser(user)"
                  >
                    <el-avatar :size="32" :src="user.avatar">
                      <span>{{ user.nickname?.charAt(0) || '?' }}</span>
                    </el-avatar>
                    <div class="mobile-user-info">
                      <div class="mobile-user-name">{{ user.nickname }}</div>
                      <div class="mobile-user-dept">{{ getDeptName(user.deptId) }}</div>
                    </div>
                    <el-button 
                      type="primary" 
                      size="small" 
                      circle
                      class="mobile-select-btn"
                    >
                      <Icon icon="ep:plus" />
                    </el-button>
                  </div>
                </div>
              </el-collapse-transition>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 桌面端：原有布局 -->
    <el-row v-else class="gap2" v-loading="formLoading">
      <el-col :span="6">
        <ContentWrap class="h-1/1">
          <el-tree
            ref="treeRef"
            :data="deptTree"
            :expand-on-click-node="false"
            :props="defaultProps"
            default-expand-all
            highlight-current
            node-key="id"
            @node-click="handleNodeClick"
          />
        </ContentWrap>
      </el-col>
      <el-col :span="17">
        <el-transfer
          v-model="selectedUserIdList"
          :titles="['未选', '已选']"
          filterable
          filter-placeholder="搜索成员"
          :data="transferUserList"
          :props="{ label: 'nickname', key: 'id' }"
        />
      </el-col>
    </el-row>
    
    <template #footer v-if="!isMobileDevice">
      <el-button
        :disabled="formLoading || !selectedUserIdList?.length"
        type="primary"
        @click="submitForm"
      >
        确 定 {{ selectedUserIdList?.length ? `(${selectedUserIdList.length})` : '' }}
      </el-button>
      <el-button @click="dialogVisible = false">
        取 消
      </el-button>
    </template>
  </Dialog>
</template>
<script lang="ts" setup>
import { defaultProps, handleTree } from '@/utils/tree'
import * as DeptApi from '@/api/system/dept'
import * as UserApi from '@/api/system/user'
import { useWindowSize } from '@vueuse/core'

defineOptions({ name: 'UserSelectForm' })
const emit = defineEmits<{
  confirm: [id: any, userList: any[]]
}>()
const { t } = useI18n() // 国际
const message = useMessage() // 消息弹窗

// 响应式检测
const { width } = useWindowSize()
const isMobileDevice = computed(() => width.value < 768)

// 数据状态
const deptTree = ref<Tree[]>([]) // 部门树形结构化
const deptList = ref<any[]>([]) // 保存扁平化的部门列表数据
const userList = ref<UserApi.UserVO[]>([]) // 所有用户列表
const filteredUserList = ref<UserApi.UserVO[]>([]) // 当前部门过滤后的用户列表
const selectedUserIdList: any = ref([]) // 选中的用户列表
const dialogVisible = ref(false) // 弹窗的是否展示
const formLoading = ref(false) // 表单的加载中
const activityId = ref()

// 移动端相关状态
const activeTab = ref('dept') // 当前激活的标签页
const searchKeyword = ref('') // 搜索关键词

// 折叠状态管理
const selectedCollapsed = ref(false) // 已选区域是否折叠
const unselectedCollapsed = ref(false) // 未选区域是否折叠

// iOS设备检测
const isIOS = computed(() => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
})

/** 计算属性：合并已选择的用户和当前部门过滤后的用户 */
const transferUserList = computed(() => {
  // 1.1 获取所有已选择的用户
  const selectedUsers = userList.value.filter((user: any) =>
    selectedUserIdList.value.includes(user.id)
  )

  // 1.2 获取当前部门过滤后的未选择用户
  const filteredUnselectedUsers = filteredUserList.value.filter(
    (user: any) => !selectedUserIdList.value.includes(user.id)
  )

  // 2. 合并并去重
  return [...selectedUsers, ...filteredUnselectedUsers]
})

/** 移动端计算属性：未选择的用户列表 */
const unselectedUsers = computed(() => {
  return filteredUserList.value.filter(
    (user: any) => !selectedUserIdList.value.includes(user.id)
  )
})

/** 移动端计算属性：已选择的用户列表 */
const selectedUsers = computed(() => {
  return userList.value.filter((user: any) =>
    selectedUserIdList.value.includes(user.id)
  )
})

/** 移动端计算属性：搜索过滤后的未选用户 */
const filteredUnselectedUsers = computed(() => {
  if (!searchKeyword.value) {
    return unselectedUsers.value
  }
  return unselectedUsers.value.filter((user: any) =>
    user.nickname?.toLowerCase().includes(searchKeyword.value.toLowerCase())
  )
})

/** 获取部门名称 */
const getDeptName = (deptId: number) => {
  const dept = deptList.value.find(d => d.id === deptId)
  return dept?.name || '未知部门'
}

/** 打开弹窗 */
const open = async (id: number, selectedList?: any[]) => {
  activityId.value = id
  resetForm()

  // 加载部门、用户列表
  const deptData = await DeptApi.getSimpleDeptList()
  deptList.value = deptData // 保存扁平结构的部门数据
  deptTree.value = handleTree(deptData) // 转换成树形结构
  userList.value = await UserApi.getSimpleUserList()

  // 初始状态下，过滤列表等于所有用户列表
  filteredUserList.value = [...userList.value]
  selectedUserIdList.value = selectedList?.map((item: any) => item.id) || []
  
  // 移动端直接显示人员选择，桌面端默认显示部门选择
  if (isMobileDevice.value) {
    activeTab.value = 'users' // 移动端不需要部门选择
  } else {
    activeTab.value = 'dept' // 桌面端保持原有逻辑
  }
  
  dialogVisible.value = true
}

/** 获取指定部门及其所有子部门的ID列表 */
const getChildDeptIds = (deptId: number, deptList: any[]): number[] => {
  const ids = [deptId]
  const children = deptList.filter((dept) => dept.parentId === deptId)
  children.forEach((child) => {
    ids.push(...getChildDeptIds(child.id, deptList))
  })
  return ids
}

/** 获取部门过滤后的用户列表 */
const filterUserList = async (deptId?: number) => {
  formLoading.value = true
  try {
    if (!deptId) {
      // 如果没有选择部门，显示所有用户
      filteredUserList.value = [...userList.value]
      return
    }

    // 直接使用已保存的部门列表数据进行过滤
    const deptIds = getChildDeptIds(deptId, deptList.value)

    // 过滤出这些部门下的用户
    filteredUserList.value = userList.value.filter((user) => deptIds.includes(user.deptId))
    
    // 移动端切换到人员选择标签页
    if (isMobileDevice.value) {
      activeTab.value = 'users'
    }
  } finally {
    formLoading.value = false
  }
}

/** 提交选择 */
const submitForm = async () => {
  try {
    message.success(t('common.updateSuccess'))
    dialogVisible.value = false
    // 从所有用户列表中筛选出已选择的用户
    const emitUserList = userList.value.filter((user: any) =>
      selectedUserIdList.value.includes(user.id)
    )
    // 发送操作成功的事件
    emit('confirm', activityId.value, emitUserList)
  } finally {
  }
}

/** 重置表单 */
const resetForm = () => {
  deptTree.value = []
  deptList.value = []
  userList.value = []
  filteredUserList.value = []
  selectedUserIdList.value = []
  searchKeyword.value = ''
  activeTab.value = 'dept'
  selectedCollapsed.value = false
  unselectedCollapsed.value = false
}

/** 处理部门被点击 */
const handleNodeClick = (row: { [key: string]: any }) => {
  filterUserList(row.id)
}

/** 移动端：选择用户 */
const selectUser = (user: any) => {
  if (!selectedUserIdList.value.includes(user.id)) {
    selectedUserIdList.value.push(user.id)
  }
}

/** 移动端：移除用户 */
const removeUser = (user: any) => {
  const index = selectedUserIdList.value.indexOf(user.id)
  if (index > -1) {
    selectedUserIdList.value.splice(index, 1)
  }
}

/** 移动端：清空所有选中 */
const clearAllSelected = () => {
  selectedUserIdList.value = []
}

defineExpose({ open }) // 提供 open 方法，用于打开弹窗
</script>

<style lang="scss" scoped>
// 桌面端原有样式
:deep() {
  .el-transfer {
    display: flex;
  }
  .el-transfer__buttons {
    display: flex !important;
    flex-direction: column-reverse;
    justify-content: center;
    gap: 20px;
    .el-transfer__button:nth-child(2) {
      margin: 0;
    }
  }
}

// 移动端适配样式
.mobile-user-select-dialog {
  :deep(.el-dialog) {
    margin: 0 !important;
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    max-height: 100vh !important;
    display: flex !important;
    flex-direction: column !important;
    border-radius: 0 !important;
    
    .el-dialog__header {
      flex-shrink: 0 !important;
      padding: 15px 20px 10px !important;
      border-bottom: 1px solid var(--el-border-color-lighter) !important;
      
      .el-dialog__title {
        font-size: 18px !important;
        font-weight: 600 !important;
      }
    }
    
    .el-dialog__body {
      flex: 1 !important;
      overflow: hidden !important;
      padding: 0 !important;
      display: flex !important;
      flex-direction: column !important;
    }
    
    // 移动端不显示footer
    .el-dialog__footer {
      display: none !important;
    }
  }
}

.mobile-layout {
  height: 100%;
  display: flex;
  flex-direction: column;
}

// 顶部操作区域
.mobile-top-area {
  flex-shrink: 0;
  background: white;
  border-bottom: 1px solid var(--el-border-color-lighter);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

// 移动端不再需要标签页导航样式

// 操作按钮区域
.mobile-action-buttons {
  display: flex;
  gap: 12px;
  padding: 15px;
}

.mobile-confirm-btn,
.mobile-cancel-btn {
  flex: 1;
  height: 44px;
  font-size: 16px;
  font-weight: 500;
  border-radius: 8px;
}

.mobile-confirm-btn {
  background: var(--el-color-primary);
  border-color: var(--el-color-primary);
  color: white;
  
  &:disabled {
    background: var(--el-color-info-light-5);
    border-color: var(--el-color-info-light-5);
    color: var(--el-text-color-placeholder);
  }
}

.mobile-cancel-btn {
  background: var(--el-bg-color);
  border-color: var(--el-border-color);
  color: var(--el-text-color-regular);
}

// 内容区域
.mobile-content-area {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.mobile-tab-content {
  height: 100%;
  overflow: hidden;
  padding: 10px;
}

.mobile-dept-wrapper {
  height: 100%;
  overflow-y: auto;
  padding: 10px;
  background: var(--el-bg-color-page);
  border-radius: 8px;
}

.mobile-tree {
  :deep(.el-tree-node) {
    .el-tree-node__content {
      height: 44px;
      padding: 0 12px;
      margin: 2px 0;
      border-radius: 6px;
      font-size: 15px;
      
      &:hover {
        background-color: var(--el-color-primary-light-9);
      }
      
      &.is-current {
        background-color: var(--el-color-primary-light-8);
        color: var(--el-color-primary);
        font-weight: 500;
      }
      
      .el-tree-node__expand-icon {
        font-size: 16px;
        color: var(--el-text-color-regular);
      }
      
      .el-tree-node__label {
        font-weight: 400;
      }
    }
  }
}

.mobile-user-selection {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 15px;
  overflow-y: auto;
  padding-right: 2px; // 为滚动条预留空间
}

.mobile-user-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--el-bg-color-page);
  border-radius: 8px;
  padding: 12px;
  min-height: 0;
  
  // 可折叠区域样式
  &.collapsible {
    flex: none; // 不使用弹性布局，让高度自适应
    border: 1px solid var(--el-border-color-lighter);
    transition: all 0.3s ease;
    
    &:hover {
      border-color: var(--el-color-primary-light-7);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    }
  }
}

.mobile-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  
  // 可折叠区域的头部样式
  .collapsible & {
    cursor: pointer;
    padding: 8px 12px;
    margin: -8px -12px 10px;
    border-radius: 8px;
    transition: all 0.2s ease;
    
    &:hover {
      background-color: var(--el-bg-color-page);
    }
    
    &:active {
      transform: scale(0.98);
    }
  }
}

// 标题区域（包含箭头和文字）
.section-title-area {
  display: flex;
  align-items: center;
  gap: 8px;
}

// 折叠箭头图标
.collapse-icon {
  font-size: 16px;
  color: var(--el-text-color-regular);
  transition: transform 0.2s ease;
  
  &:hover {
    color: var(--el-color-primary);
  }
}

.mobile-search {
  width: 140px;
  
  :deep(.el-input__wrapper) {
    height: 32px;
    border-radius: 16px;
    
    .el-input__inner {
      font-size: 14px;
      text-align: left;
    }
  }
}

.mobile-user-list {
  flex: 1;
  overflow-y: auto;
  margin: -4px;
  padding: 4px;
  
  // 在可折叠区域中限制最大高度
  .collapsible & {
    max-height: 300px; // 限制最大高度，约显示4-5个用户
    flex: none;
  }
}

.mobile-user-item {
  display: flex;
  align-items: center;
  padding: 12px;
  margin-bottom: 8px;
  background: white;
  border-radius: 8px;
  border: 1px solid var(--el-border-color-lighter);
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: var(--el-color-primary-light-5);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  
  &:active {
    transform: translateY(1px);
  }
  
  &.selected {
    background: var(--el-color-primary-light-9);
    border-color: var(--el-color-primary-light-5);
  }
}

.mobile-user-info {
  flex: 1;
  margin-left: 12px;
  min-width: 0;
}

.mobile-user-name {
  font-size: 15px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mobile-user-dept {
  font-size: 13px;
  color: var(--el-text-color-regular);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mobile-select-btn,
.mobile-remove-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  margin-left: 8px;
  flex-shrink: 0;
  
  :deep(.el-icon) {
    font-size: 16px;
  }
}

// 移动端不再需要badge样式



// iOS 设备特殊处理 - 使用固定视口高度避免Safari地址栏问题
.ios-mobile-dialog {
  :deep(.el-dialog) {
    height: 100vh !important;
    min-height: 100vh !important;
    // 使用 env() 函数处理安全区域
    padding-top: env(safe-area-inset-top, 0) !important;
    padding-bottom: env(safe-area-inset-bottom, 0) !important;
  }
  
  .mobile-layout {
    // 为iOS安全区域预留空间
    padding-top: max(10px, env(safe-area-inset-top, 0));
    padding-bottom: max(10px, env(safe-area-inset-bottom, 0));
    padding-left: max(10px, env(safe-area-inset-left, 0));
    padding-right: max(10px, env(safe-area-inset-right, 0));
  }
}

// 通用iOS WebKit处理
@supports (-webkit-touch-callout: none) {
  .mobile-user-select-dialog {
    :deep(.el-dialog) {
      // 防止iOS Safari的bounce效果
      overflow: hidden !important;
      -webkit-overflow-scrolling: touch !important;
    }
  }
  
  .mobile-user-list,
  .mobile-dept-wrapper {
    // iOS滚动优化
    -webkit-overflow-scrolling: touch !important;
    overflow-scrolling: touch !important;
  }
}

// 响应式断点
@media (max-width: 480px) {
  .mobile-user-select-dialog {
    :deep(.el-dialog__header) {
      padding: 12px 15px 8px !important;
      
      .el-dialog__title {
        font-size: 17px !important;
      }
    }
  }
  
  .mobile-action-buttons {
    padding: 12px;
  }
  
  .mobile-confirm-btn,
  .mobile-cancel-btn {
    height: 40px;
    font-size: 15px;
  }
  
  .mobile-tab-content {
    padding: 8px;
  }
  
  .mobile-user-section.collapsible {
    .mobile-user-list {
      max-height: 250px; // 小屏幕上稍微减少高度
    }
  }
  
  .section-title-area {
    gap: 6px; // 小屏幕上减少间距
  }
  
  .collapse-icon {
    font-size: 14px;
  }
  
  .mobile-user-item {
    padding: 10px;
    margin-bottom: 6px;
  }
  
  .mobile-user-name {
    font-size: 14px;
  }
  
  .mobile-user-dept {
    font-size: 12px;
  }
  
  .mobile-select-btn,
  .mobile-remove-btn {
    width: 28px;
    height: 28px;
    
    :deep(.el-icon) {
      font-size: 14px;
    }
  }
}

// 平板端适配 - 不使用全屏，使用弹窗模式
@media (min-width: 768px) and (max-width: 1023px) {
  .mobile-user-select-dialog {
    :deep(.el-dialog) {
      position: relative !important;
      top: auto !important;
      left: auto !important;
      width: 90% !important;
      height: auto !important;
      max-width: 700px !important;
      max-height: 85vh !important;
      margin: 7.5vh auto !important;
      border-radius: 12px !important;
    }
  }
  
  .mobile-layout {
    padding: 15px;
    max-height: 70vh;
  }
}

// 确保滚动条样式
.mobile-user-list {
  &::-webkit-scrollbar {
    width: 4px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: var(--el-border-color);
    border-radius: 2px;
    
    &:hover {
      background: var(--el-border-color-darker);
    }
  }
}

.mobile-dept-wrapper {
  &::-webkit-scrollbar {
    width: 4px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: var(--el-border-color);
    border-radius: 2px;
    
    &:hover {
      background: var(--el-border-color-darker);
    }
  }
}
</style>
