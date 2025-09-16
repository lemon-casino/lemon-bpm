<template>
  <div class="bpm-card fade-in todo-task-container">
    <div class="bpm-card-header fixed-header">
      <div class="card-title">
        <Icon icon="ep:tickets" class="title-icon" />
        <span>待办任务</span>
      </div>
    </div>
    
    <div class="fixed-search">
      <!-- 搜索工具栏 -->
      <div class="search-bar">
        <el-row :gutter="16" class="form-row">
          <el-col :xs="24" :sm="12" :md="6" :lg="6">
            <el-input v-model="queryParams.name" placeholder="任务名称" clearable @keyup.enter="handleQuery" class="form-control">
              <template #prefix>
                <Icon icon="ep:search" class="el-input__icon" />
              </template>
            </el-input>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6" :lg="6">
            <el-input v-model="queryParams.processInstanceName" placeholder="请输入流程名称" clearable @keyup.enter="handleQuery" class="form-control">
              <template #prefix>
                <Icon icon="ep:document" class="el-input__icon" />
              </template>
            </el-input>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6" :lg="6">
            <el-select v-model="queryParams.category" clearable placeholder="流程分类" class="w-full form-control">
              <el-option v-for="item in categoryList" :key="item.id" :label="item.name" :value="item.id" />
            </el-select>
          </el-col>
          <el-col :xs="24" :sm="24" :md="6" :lg="6">
            <div class="button-container">
              <el-button type="primary" @click="handleQuery" class="action-btn">搜索</el-button>
              <el-button @click="resetQuery" style="margin-left: 0" class="action-btn">重置</el-button>
              <el-button type="info"  style="margin-left: 0" @click="handleAdvancedFilterToggle(!showAdvancedFilter)" class="action-btn filter-toggle-btn">
                <span class="button-text">{{ showAdvancedFilter ? '收起' : '高级筛选' }}</span>
                <Icon :icon="showAdvancedFilter ? 'ep:arrow-up' : 'ep:arrow-down'" class="button-icon" />
              </el-button>
            </div>
          </el-col>
        </el-row>
        
        <!-- 高级筛选选项 -->
        <div v-if="showAdvancedFilter" class="advanced-filter mt-2">
          <!-- 使用表单字段筛选组件，添加发起人和日期选择器 -->
          <FormFieldFilter
            ref="formFieldFilterRef"
            v-model:formFieldsParams="queryParams.formFieldsParams"
            v-model:formFieldValue="queryParams.formFieldValue"
            v-model:startUserId="queryParams.startUserId"
            v-model:dateRange="queryParams.createTime"
            :debug="isDebugMode"
            :layout-mode="'inline'"
            :inline-basic-search="true"
            :show-start-user="true"
            :show-date-range="true"
            :start-user-placeholder="'发起人'"
            class="form-field-filter-container"
            @change="handleFormFieldFilterChange"
          />
        </div>
      </div>
    </div>
    
    <!-- 任务列表 - 可滚动区域 -->
    <div class="table-scroll-area">
      <el-empty v-if="list.length === 0 && !loading" description="暂无待办任务" />
      <div v-else>
        <div v-loading="loading" class="task-cards">
          <div v-for="task in list" :key="task.id" :class="['task-card', getPriorityClass(task)]">
            <div class="task-header">
              <div class="task-title">{{ task.name }}</div>
              <el-tag :type="getProcessStatusType(task)" size="small">{{ getProcessStatusText(task) }}</el-tag>
            </div>
            <div class="task-content">
              <div class="task-info">
                <div><Icon icon="ep:document" /> 流程：{{ task.processInstance?.name }}</div>
                <div><Icon icon="ep:user" /> 发起人：{{ task.processInstance?.startUser?.nickname || '-' }}</div>
                <div><Icon icon="ep:clock" /> 创建时间：{{ formatDate(task.createTime) }}</div>
              </div>
              <div class="task-action">
                <el-button type="primary" size="small" @click="handleAudit(task)">处理</el-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 分页 - 固定底部 -->
    <div class="pagination-container fixed-pagination">

      <Pagination
        :total="total"
        v-model:page="queryParams.pageNo"
        v-model:limit="queryParams.pageSize"
        :pagerCount="4"
        @pagination="getList"
        :hide-on-single-page="false"
        class="mobile-pagination"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { formatDate } from '@/utils/formatTime'
import * as TaskApi from '@/api/bpm/task'
import { CategoryApi, CategoryVO } from '@/api/bpm/category'
import * as UserApi from '@/api/system/user'
import { useEventBus } from '@/hooks/web/useEventBus'
import { useWebSocketMessage } from '@/hooks/web/useWebSocketMessage'
import { ElMessage } from 'element-plus'
import { FormFieldFilter } from '@/components'

defineOptions({ name: 'BpmTodoTask' })

const { push } = useRouter() // 路由

const loading = ref(true) // 列表的加载中
const total = ref(0) // 列表的总页数
const list = ref<any[]>([]) // 列表的数据，使用any类型避免类型错误
const refreshing = ref(false) // 全局数据刷新状态

const formFieldFilterRef = ref<InstanceType<typeof FormFieldFilter> | null>(null)
// 调试模式开关
// 通过环境变量控制调试模式，在开发环境中默认开启
// 可以通过设置环境变量VITE_APP_DEBUG=true/false来控制
// 在生产环境中默认关闭
const isDebugMode = ref(import.meta.env.DEV && import.meta.env.VITE_APP_DEBUG === 'true')

// 数据缓存标志，避免重复请求
const dataLoaded = reactive({
  userList: false,
  categoryList: false
})

const queryParams = reactive({
  pageNo: 1,
  pageSize: 12,
  name: '',
  category: undefined,
  startUserId: undefined,
  createTime: [],
  processInstanceName: '',
  formFieldsParams: undefined, // 选中的模型ID
  formFieldValue: '' // 表单字段参数JSON字符串
})

const categoryList = ref<CategoryVO[]>([]) // 流程分类列表
const userList = ref<UserApi.UserVO[]>([]) // 用户列表
const showAdvancedFilter = ref(false) // 是否显示高级筛选

const { on, off } = useEventBus('processInstance')
const { off: offLogin } = useEventBus('login')

const bpmChannel = new BroadcastChannel('bpm-process-channel')
let isBpmChannelClosed = false // 标记通道是否已关闭

// 使用 WebSocket 消息
const { onMessage } = useWebSocketMessage()

// 请求锁，防止重复请求
const requestLocks = reactive({
  list: false,
  userList: false,
  categoryList: false
})

/** 统一数据刷新函数 */
const refreshAllData = async (showLoading = true, forceRefresh = false) => {
  if (refreshing.value) {
    if (isDebugMode.value) {
      console.log('数据刷新中，跳过重复刷新')
    }
    return // 防止重复刷新
  }
  
  refreshing.value = true
  if (showLoading) {
    loading.value = true
  }
  
  try {
    // 如果强制刷新，则重置数据加载标志
    if (forceRefresh) {
      if (isDebugMode.value) {
        console.log('强制刷新数据，重置数据加载标志')
      }
      dataLoaded.userList = false
      dataLoaded.categoryList = false
    }
    
    // 并行获取所有数据
    await Promise.all([
      getList(false), // 传入false避免重复设置loading
      getUserList(),
      getCategoryList()
    ])
  } catch (error) {
    console.error('数据刷新失败:', error)
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

/** 查询任务列表 */
const getList = async (setLoading = true) => {
  // 如果已经在请求中，则不重复请求
  if (requestLocks.list) {
    if (isDebugMode.value) {
      console.log('任务列表请求锁定中，跳过重复请求')
    }
    return
  }
  
  requestLocks.list = true
  
  if (setLoading) {
    loading.value = true
  }
  try {
    // 构建查询参数，确保formFieldsParams正确传递
    const params = { ...queryParams }

    const data = await TaskApi.getTaskTodoPage(params)
    list.value = data.list
    total.value = data.total
  } catch (error) {
    console.error('获取任务列表失败:', error)
    list.value = []
    total.value = 0
    
    // 显示错误提示
    ElMessage.error('获取任务列表失败，请稍后重试')
  } finally {
    if (setLoading) {
      loading.value = false
    }
    requestLocks.list = false
  }
}

/** 搜索按钮操作 */
const handleQuery = () => {
  if (isDebugMode.value) {
    console.log('执行搜索操作')
  }
  
  queryParams.pageNo = 1
  // 仅刷新任务列表，不刷新静态数据
  getList()
}

/** 重置按钮操作 */
const resetQuery = () => {
  if (isDebugMode.value) {
    console.log('重置查询参数')
  }
  
  // 重置查询参数
  queryParams.name = ''
  queryParams.category = undefined
  queryParams.startUserId = undefined
  queryParams.createTime = []
  queryParams.processInstanceName = ''
  
  // 重置表单字段相关参数
  queryParams.formFieldsParams = undefined
  queryParams.formFieldValue = ''
  
  // 重置页码
  queryParams.pageNo = 1
  
  // 调用子组件的重置方法
  if (formFieldFilterRef.value) {
    formFieldFilterRef.value.resetFields()
  }
  // 刷新数据，不强制刷新静态数据
  refreshAllData(true, false)
}

/** 处理审批按钮 */
const handleAudit = (row: any) => {
  push({
    name: 'BpmProcessInstanceDetail',
    query: {
      id: row.processInstance.id,
      taskId: row.id
    }
  })
}

/** 获取任务优先级样式 */
const getPriorityClass = (task: any) => {
  // 演示数据，实际应根据API返回的优先级设置
  // 这里基于任务ID的最后一位数字模拟优先级
  const lastDigit = parseInt(task.id.charAt(task.id.length - 1))
  
  if (lastDigit >= 7) {
    return 'priority-high'
  } else if (lastDigit >= 3) {
    return 'priority-medium'
  } else {
    return 'priority-low'
  }
}

/** 获取流程状态文本 */
const getProcessStatusText = (task: any) => {
  return '待处理'
}

/** 获取流程状态类型 */
const getProcessStatusType = (task: any): 'success' | 'warning' | 'info' | 'primary' | 'danger' => {
  return 'warning'
}

/** 页面激活时刷新数据 */
onActivated(() => {
  if (isDebugMode.value) {
    console.log('页面激活，仅刷新任务列表')
  }
  
  // 仅刷新任务列表，不刷新静态数据
  // 如果已经在请求中，getList函数内部会跳过重复请求
  getList()
})

/** 初始化 **/
onMounted(async () => {
  if (isDebugMode.value) {
    console.log('组件挂载，初始化数据')
  }
  
  // 首次加载数据
  await refreshAllData()
  
  // 监听审批事件 - 只在组件挂载时注册一次
  on('process-approve-success', () => {
    // 仅刷新任务列表，不刷新静态数据
    getList()
  })
  


  // 监听 BroadcastChannel 消息 - 只在组件挂载时注册一次
  try {
    bpmChannel.onmessage = (event) => {
      if (isBpmChannelClosed) return // 如果通道已关闭，不处理消息
      
      if (event.data.type === 'process-approve') {
        // 仅刷新任务列表，不刷新静态数据
        getList()
      }
    }
  } catch (error) {
    console.error('设置BroadcastChannel监听失败:', error)
  }

  // 监听 WebSocket 消息 - 只在组件挂载时注册一次
  onMessage((message) => {
    if (message.type === 'bpm-task') {
      // 仅刷新任务列表，不刷新静态数据
      getList()
    }
  })
})

/** 获取用户列表 */
const getUserList = async () => {
  // 如果已经在请求中，则不重复请求
  if (requestLocks.userList) {
    if (isDebugMode.value) {
      console.log('用户列表请求锁定中，跳过重复请求')
    }
    return
  }
  
  // 如果已经加载过用户列表，且列表不为空，则不再重复加载
  if (dataLoaded.userList && userList.value.length > 0) {
    if (isDebugMode.value) {
      console.log('用户列表已加载，跳过请求')
    }
    return
  }
  
  requestLocks.userList = true
  
  try {
    if (isDebugMode.value) {
      console.log('开始获取用户列表...')
    }
    userList.value = await UserApi.getSimpleUserList()
    dataLoaded.userList = true
  } catch (error) {
    console.error('获取用户列表失败:', error)
  } finally {
    requestLocks.userList = false
  }
}

/** 获取分类列表 */
const getCategoryList = async () => {
  // 如果已经在请求中，则不重复请求
  if (requestLocks.categoryList) {
    if (isDebugMode.value) {
      console.log('分类列表请求锁定中，跳过重复请求')
    }
    return
  }
  
  // 如果已经加载过分类列表，且列表不为空，则不再重复加载
  if (dataLoaded.categoryList && categoryList.value.length > 0) {
    if (isDebugMode.value) {
      console.log('分类列表已加载，跳过请求')
    }
    return
  }
  
  requestLocks.categoryList = true
  
  try {
    if (isDebugMode.value) {
      console.log('开始获取分类列表...')
    }
    categoryList.value = await CategoryApi.getCategorySimpleList()
    dataLoaded.categoryList = true
  } catch (error) {
    console.error('获取分类列表失败:', error)
  } finally {
    requestLocks.categoryList = false
  }
}

/** 处理表单字段筛选组件的值变化 */
const handleFormFieldFilterChange = (data: any) => {
  queryParams.formFieldsParams = data.formFieldsParams || undefined
  queryParams.formFieldValue = data.formFieldValue || ''
  queryParams.startUserId = data.startUserId
  queryParams.createTime = data.dateRange
}
/** 处理高级筛选显示状态变更 */
const handleAdvancedFilterToggle = (show: boolean) => {
  if (isDebugMode.value) {
    console.log('高级筛选显示状态变更:', show)
  }
  
  showAdvancedFilter.value = show
}


// 组件卸载时清理资源
onUnmounted(() => {
  // 取消事件总线监听
  off('process-approve-success')
  offLogin('login-success')
  
  // 关闭 BroadcastChannel
  if (bpmChannel && !isBpmChannelClosed) {
    try {
      bpmChannel.close()
      isBpmChannelClosed = true
    } catch (error) {
      console.error('关闭BroadcastChannel失败:', error)
    }
  }
  
  // 重置刷新状态
  refreshing.value = false
})

</script>

<style lang="scss" scoped>
.todo-task-container {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 120px);
  overflow: visible;
  position: relative;
  
  /* 移动端适配 - 允许整体滚动 */
  @media (max-width: 768px) {
    height: auto;
    min-height: calc(100vh - 80px);
    overflow-y: auto;
    overflow-x: hidden;
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
    
    /* 自定义滚动条样式 */
    &::-webkit-scrollbar {
      width: 4px;
    }
    
    &::-webkit-scrollbar-thumb {
      background-color: rgba(144, 147, 153, 0.3);
      border-radius: 2px;
    }
    
    &::-webkit-scrollbar-track {
      background-color: transparent;
    }
  }
  
  @media (max-width: 480px) {
    min-height: calc(100vh - 60px);
  }
}

.fixed-header {
  flex-shrink: 0;
  
  /* 移动端头部适配 */
  @media (max-width: 768px) {
    position: relative;
    padding: 12px 16px;
  }
  
  @media (max-width: 480px) {
    padding: 10px 12px;
  }
}

.fixed-search {
  flex-shrink: 0;
  padding: 12px 16px;
  background-color: #fff;
  z-index: 5;
  min-height: 64px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  
  /* 移动端搜索栏适配 - 不再固定 */
  @media (max-width: 768px) {
    position: relative;
    padding: 12px 16px;
    min-height: auto;
    transform: translateY(0);
    transition: transform 0.3s ease;
  }
  
  @media (max-width: 480px) {
    padding: 10px 12px;
  }
}

.table-scroll-area {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px;
  
  /* 滚动条样式优化 */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-thumb {
    background-color: rgba(144, 147, 153, 0.3);
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-track {
    background-color: transparent;
  }
  
  /* Firefox 滚动条样式 */
  scrollbar-width: thin;
  scrollbar-color: rgba(144, 147, 153, 0.3) transparent;
  
  /* 移动端适配 - 不再单独滚动 */
  @media (max-width: 768px) {
    padding: 16px 12px;
    overflow: visible;
    flex: none;
  }
  
  @media (max-width: 480px) {
    padding: 12px 8px;
  }
}

.fixed-pagination {
  flex-shrink: 0;
  padding: 16px;
  background-color: #fff;
  border-top: 1px solid #f0f0f0;
  z-index: 5;
  
  /* 移动端分页适配 - 不再固定 */
  @media (max-width: 768px) {
    position: relative;
    padding: 12px 16px;
    margin-bottom: 20px; /* 底部留出空间 */
    
    :deep(.el-pagination) {
      justify-content: center;
      
      .el-pagination__sizes,
      .el-pagination__jump {
        display: none; /* 移动端隐藏页面大小选择和跳转 */
      }
      
      .el-pager {
        .number {
          min-width: 32px;
          height: 32px;
          line-height: 32px;
        }
      }
      
      .btn-prev,
      .btn-next {
        min-width: 32px;
        height: 32px;
      }
    }
  }
  
  @media (max-width: 480px) {
    padding: 10px 12px;
    margin-bottom: 16px;
    
    :deep(.el-pagination) {
      .el-pagination__total {
        display: none; /* 小屏幕隐藏总数显示 */
      }
    }
  }
}

.search-bar {
  margin-bottom: 8px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  
  /* 移动端搜索栏适配 */
  @media (max-width: 768px) {
    margin-bottom: 6px;
    
    .form-row {
      flex-direction: column;
      gap: 10px;
      
      .el-col {
        width: 100% !important;
        max-width: 100% !important;
        flex: none !important;
        margin-bottom: 0;
      }
    }
  }
  
  @media (max-width: 480px) {
    .form-row {
      gap: 10px;
      
      /* 按钮容器样式已在 .button-container 中单独处理 */
    }
  }
}

.form-row {
  display: flex;
  align-items: center;
  min-height: 36px;
}

.form-control {
  height: 36px;
  margin: 4px 0;
  
  /* 移动端表单控件适配 */
  @media (max-width: 768px) {
    height: 40px;
    margin: 0;
  }
  
  @media (max-width: 480px) {
    height: 38px;
  }
}

/* 统一表单控件样式 */
:deep(.el-input__wrapper),
:deep(.el-select),
:deep(.el-select__wrapper),
:deep(.el-date-editor.el-input__wrapper) {
  height: 36px !important;
  
  @media (max-width: 768px) {
    height: 40px !important;
  }
  
  @media (max-width: 480px) {
    height: 38px !important;
  }
}

:deep(.el-input__wrapper),
:deep(.el-select__wrapper),
:deep(.el-date-editor.el-input__wrapper) {
  padding-right: 11px !important;
  padding-left: 11px !important;
  
  @media (max-width: 768px) {
    padding-right: 12px !important;
    padding-left: 12px !important;
  }
}

:deep(.el-date-editor) {
  --el-date-editor-width: 100% !important;
  width: 100% !important;
}

:deep(.el-range-editor.el-input__wrapper) {
  padding: 0 11px !important;
  width: 100% !important;
  
  @media (max-width: 768px) {
    padding: 0 12px !important;
  }
}

:deep(.el-input__inner),
:deep(.el-range-input) {
  height: 34px !important;
  line-height: 34px !important;
  
  @media (max-width: 768px) {
    height: 38px !important;
    line-height: 38px !important;
  }
  
  @media (max-width: 480px) {
    height: 36px !important;
    line-height: 36px !important;
    font-size: 16px !important; /* 防止iOS自动缩放 */
  }
}

:deep(.el-button) {
  height: 36px !important;
  
  @media (max-width: 768px) {
    height: 40px !important;
  }
  
  @media (max-width: 480px) {
    height: 38px !important;
  }
}

.button-container {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  height: 36px;
  margin: 4px 0;
  gap: 8px;
  flex-wrap: wrap;
  
  /* 移动端按钮容器适配 */
  @media (max-width: 768px) {
    justify-content: center;
    height: auto;
    margin: 8px 0 0 0;
    gap: 8px;
    flex-direction: column;
    
    .action-btn {
      width: 100%;
      height: 40px;
      font-size: 14px;
      padding: 0 16px;
      border-radius: 6px;
      
      /* 确保按钮内容居中 */
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      
      .button-text {
        white-space: nowrap;
        font-size: 14px;
      }
      
      .button-icon {
        font-size: 14px;
        flex-shrink: 0;
      }
    }
  }
  
  @media (max-width: 480px) {
    gap: 6px;
    margin: 6px 0 0 0;
    
    .action-btn {
      height: 38px;
      font-size: 14px;
      padding: 0 14px;
      border-radius: 5px;
      
      .button-text {
        font-size: 14px;
      }
      
      .button-icon {
        font-size: 13px;
      }
    }
  }
}

.advanced-filter {
  padding-top: 8px;
  border-top: 1px solid var(--el-border-color-lighter);
  
  /* 移动端高级筛选适配 */
  @media (max-width: 768px) {
    padding: 8px 12px;
    margin-top: 8px;
    border-radius: 6px;
    background-color: var(--el-bg-color-page);
    border: 1px solid var(--el-border-color-lighter);
  }
  
  @media (max-width: 480px) {
    padding: 6px 10px;
    margin-top: 6px;
    border-radius: 4px;
  }
}

/* 表单字段相关样式 */
.mt-2 {
  margin-top: 8px;
}

.task-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  grid-gap: 16px;
  
  /* 移动端任务卡片网格适配 */
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    grid-gap: 12px;
  }
  
  @media (max-width: 480px) {
    grid-gap: 10px;
  }
}

.task-card {
  border-radius: 8px;
  padding: 16px;
  background-color: var(--el-bg-color-overlay);
  box-shadow: var(--el-box-shadow-lighter);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: 4px;
  }
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: var(--el-box-shadow);
    
    /* 移动端禁用悬停效果 */
    @media (max-width: 768px) {
      transform: none;
    }
  }
  
  /* 移动端卡片适配 */
  @media (max-width: 768px) {
    padding: 14px;
  }
  
  @media (max-width: 480px) {
    padding: 12px;
    border-radius: 6px;
  }
}

.priority-high {
  &::before {
    background-color: var(--el-color-danger);
  }
}

.priority-medium {
  &::before {
    background-color: var(--el-color-warning);
  }
}

.priority-low {
  &::before {
    background-color: var(--el-color-success);
  }
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.task-title {
  font-weight: bold;
  font-size: 16px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 80%;
}

.task-content {
  display: flex;
  justify-content: space-between;
}

.task-info {
  flex: 1;
  div {
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--el-text-color-secondary);
    font-size: 14px;
  }
}

.task-action {
  display: flex;
  align-items: flex-end;
}

.fade-in {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
