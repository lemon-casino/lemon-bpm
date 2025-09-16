<template>
  <div class="bpm-card fade-in done-task-container">
    <div class="bpm-card-header fixed-header">
      <div class="card-title">
        <Icon icon="ep:finished" class="title-icon" />
        <span>已办任务</span>
      </div>
    </div>
    
    <!-- 搜索栏 - 固定部分 -->
    <div class="fixed-search">
      <div class="bpm-search-bar">
        <el-input
          v-model="queryParams.processInstanceName"
          placeholder="请输入流程名称"
          clearable
          @keyup.enter="handleQuery"
          class="search-input"
          prefix-icon="ep:search"
        />
        <el-input
          v-model="queryParams.name"
          placeholder="请输入节点名称"
          clearable
          @keyup.enter="handleQuery"
          class="search-input"
          prefix-icon="ep:search"
        />

        
        <div class="search-controls">
          <el-select
            v-model="queryParams.category"
            placeholder="请选择流程分类"
            clearable
            class="control-select"
            @change="handleQuery"
          >
            <el-option
              v-for="category in categoryList"
              :key="category.code"
              :label="category.name"
              :value="category.code"
            />
          </el-select>
          
          <el-select
            v-model="queryParams.status"
            placeholder="请选择流程状态"
            clearable
            class="control-select"
            @change="handleQuery"
          >
            <el-option
              v-for="dict in getIntDictOptions(DICT_TYPE.BPM_PROCESS_INSTANCE_STATUS)"
              :key="dict.value"
              :label="dict.label"
              :value="dict.value"
            />
          </el-select>
          
          <el-button @click="showPopover = !showPopover" class="filter-button">
            <Icon icon="ep:filter" class="mr-5px" />
            <span class="button-text">高级筛选</span>
          </el-button>
        </div>
      </div>
      
      <!-- 高级筛选 - 条件性显示的固定部分 -->
      <transition name="el-fade-in-linear">
        <div v-if="showPopover" class="bpm-advanced-filter">
          <div class="filter-title">
            <Icon icon="ep:filter" class="filter-icon" />
            <span>高级筛选</span>
          </div>
          <!-- 表单字段筛选组件 - 独立一行 -->
          <div class="form-field-filter-section">
            <div class="field-content">
              <el-row :gutter="16">
                <el-col :span="24">
                  <FormFieldFilter
                    ref="formFieldFilterRef"
                    v-model:formFieldsParams="queryParams.formFieldsParams"
                    v-model:formFieldValue="queryParams.formFieldValue"
                    v-model:startUserId="queryParams.startUserId"
                    v-model:dateRange="queryParams.createTime"
                    :showStartUser="true"
                    :showDateRange="true"
                    startUserPlaceholder="流程发起人"
                    startDatePlaceholder="开始日期"
                    endDatePlaceholder="结束日期"
                    @change="handleFormFieldFilterChange"
                  />
                </el-col>
              </el-row>
            </div>
          </div>
          
          <div class="filter-actions">
            <el-button @click="resetQuery">清空</el-button>
            <el-button @click="showPopover = false">取消</el-button>
            <el-button type="primary" @click="handleQuery">确认</el-button>
          </div>
        </div>
      </transition>
    </div>
    
    <!-- 任务列表区域 - 可滚动部分 -->
    <div class="table-scroll-area">
      <el-empty v-if="list.length === 0 && !loading" description="暂无已办任务" />
      <div v-else>
        <!-- 任务卡片列表 -->
        <div v-loading="loading" class="task-cards">
          <div
            v-for="task in list"
            :key="task.id"
            class="done-task-card"
            @mouseenter="handleCardMouseEnter(task.id)"
            @mouseleave="handleCardMouseLeave"
          >
            <div class="task-header">
              <div class="flex items-center">
                <Icon icon="ep:document" class="mr-5px text-primary" />
                <span class="task-title">{{ task.processInstance?.name }}</span>
              </div>
              <dict-tag :type="DICT_TYPE.BPM_TASK_STATUS" :value="task.status" />
            </div>
            
            <div class="task-content">
              <div class="task-info-grid">
                <div class="info-item">
                  <div class="info-label">当前任务</div>
                  <div class="info-value">{{ task.name }}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">流程发起人</div>
                  <div class="info-value">{{ task.processInstance?.startUser?.nickname }}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">任务开始时间</div>
                  <div class="info-value">{{ formatDate(new Date(task.createTime)) }}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">任务结束时间</div>
                  <div class="info-value">{{ formatDate(new Date(task.endTime)) }}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">处理耗时</div>
                  <div class="info-value">{{ formatPast2(task.durationInMillis) }}</div>
                </div>
              </div>
              
              <div class="task-action">
                <el-button type="primary" size="small" @click="handleAudit(task)">查看历史</el-button>
              </div>
              
              <div class="task-opinion" :class="{ 'expanded': hoveredCardId === task.id }">
                <div class="opinion-title">
                  <Icon icon="ep:chat-dot-round" class="mr-5px" />
                  审批意见
                  <span class="collapse-indicator">
                    <Icon :icon="hoveredCardId === task.id ? 'ep:arrow-up' : 'ep:arrow-down'" />
                  </span>
                </div>
                <div class="opinion-content">{{ task.reason }}</div>
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
import { DICT_TYPE, getIntDictOptions } from '@/utils/dict'
import { formatPast2 } from '@/utils/formatTime'
import * as TaskApi from '@/api/bpm/task'
import { CategoryApi, CategoryVO } from '@/api/bpm/category'
import { useEventBus } from '@/hooks/web/useEventBus'
import { onBeforeRouteUpdate } from 'vue-router'
import { FormFieldFilter } from '@/components'
import * as UserApi from '@/api/system/user'
const userList = ref<UserApi.UserVO[]>([]) // 用户列表
// 定义任务类型
interface BpmTaskVO {
  id: string
  name: string
  status: number
  createTime: string
  endTime: string
  durationInMillis: number
  reason?: string
  processInstance?: {
    id: string
    name: string
    startUser?: {
      nickname: string
    }
  }
}

// 自定义formatDate函数
const formatDate = (date: Date): string => {
  if (!date || isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date);
};

defineOptions({ name: 'BpmDoneTask' })

const { push } = useRouter() // 路由

const loading = ref(true) // 列表的加载中
const total = ref(0) // 列表的总页数
const list = ref<BpmTaskVO[]>([]) // 列表的数据
const queryParams = reactive({
  pageNo: 1,
  pageSize: 12,
  name: '',
  processInstanceName:'',
  category: undefined,
  status: undefined,
  startUserId: undefined,
  createTime: [],
  formFieldValue: undefined,
  formFieldsParams:undefined, // 选中的模型ID
})
const queryFormRef = ref() // 搜索的表单
const categoryList = ref<CategoryVO[]>([]) // 流程分类列表
const showPopover = ref(false)
const formFieldFilterRef = ref<InstanceType<typeof FormFieldFilter> | null>(null)
const { on, off } = useEventBus('processInstance')
const { on: onLogin, off: offLogin } = useEventBus('login')
// 监听任务状态变化
const bpmChannel = new BroadcastChannel('bpm-process-channel')
let isBpmChannelClosed = false

// 添加鼠标悬停状态管理
const hoveredCardId = ref<string | null>(null);

// 鼠标移入卡片事件处理
const handleCardMouseEnter = (id: string) => {
  hoveredCardId.value = id;
};

// 鼠标移出卡片事件处理
const handleCardMouseLeave = () => {
  hoveredCardId.value = null;
};

/** 查询任务列表 */
const getList = async () => {
  loading.value = true
  try {
    const data = await TaskApi.getTaskDonePage(queryParams)
    list.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}

/** 搜索按钮操作 */
const handleQuery = () => {
  queryParams.pageNo = 1
  getList()
}

/** 重置按钮操作 */
const resetQuery = () => {
  queryFormRef.value?.resetFields()
  // 重置表单字段相关参数
  queryParams.formFieldValue = undefined
  queryParams.formFieldsParams =undefined
  if (formFieldFilterRef.value) {
    formFieldFilterRef.value.resetFields()
  }
  handleQuery()
}

/** 处理表单字段筛选组件的值变化 */
const handleFormFieldFilterChange = (data: any) => {
  queryParams.formFieldsParams = data.formFieldsParams || undefined
  queryParams.formFieldValue = data.formFieldValue || ''
  queryParams.startUserId = data.startUserId
  queryParams.createTime = data.dateRange
}
/** 处理历史按钮 */
const handleAudit = (row) => {
  push({
    name: 'BpmProcessInstanceDetail',
    query: {
      id: row.processInstance.id
    }
  })
}

/** 获取流程分类 */
const getCategoryList = async () => {
  categoryList.value = await CategoryApi.getCategorySimpleList()
}

// 监听流程操作成功事件
const handleProcessSuccess = () => {
  getList()
}

onBeforeRouteUpdate(() => {
  getList()
})

/** 初始化 **/
onMounted(() => {
  getList()
  getCategoryList()
  getUserList()
  // 监听流程操作成功事件
  on('process-approve-success', handleProcessSuccess)
  // 监听BroadcastChannel消息
  bpmChannel.onmessage = (event) => {
    if (event.data === 'process-approve') {
      getList()
    }
  }
  // 监听登录事件
  onLogin('login-success', getList)
})


// 组件销毁前的清理工作
onBeforeUnmount(() => {
  off('process-approve-success', handleProcessSuccess)
  offLogin('login-success', getList)
  // 关闭BroadcastChannel
  if (!isBpmChannelClosed) {
    bpmChannel.close()
    isBpmChannelClosed = true
  }
})

/** 获取用户列表 */
const getUserList = async () => {
    userList.value = await UserApi.getSimpleUserList()
}

</script>

<style lang="scss" scoped>
@use '@/styles/_mixins' as *;

.done-task-container {
  height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;
  background-color: var(--el-bg-color);
  overflow: hidden;
  
  /* 移动端适配 - 允许整体滚动 */
  @media (max-width: 768px) {
    height: calc(100vh - 80px);
    overflow-y: auto;
    overflow-x: hidden;
    scroll-behavior: smooth; /* 平滑滚动 */
    -webkit-overflow-scrolling: touch; /* iOS惯性滚动 */
    
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
    height: calc(100vh - 60px);
  }
}

.fixed-header {
  padding: 16px 20px;
  background-color: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-light);
  z-index: 1;
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
  padding: 16px 20px;
  background-color: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-light);
  z-index: 1;
  flex-shrink: 0;
  
  /* 移动端适配 - 允许搜索栏滑动 */
  @media (max-width: 768px) {
    padding: 12px 16px;
    position: relative;
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
  padding: 20px;
  
  /* 自定义滚动条样式 */
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
  
  /* Firefox滚动条样式 */
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

.task-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  padding: 0 4px;
  
  /* 移动端网格适配 */
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 12px;
    padding: 0;
  }
  
  @media (max-width: 480px) {
    gap: 10px;
  }
}

.done-task-card {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  transition: all 0.3s ease;
  height: 260px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  
  /* 移动端卡片适配 */
  @media (max-width: 768px) {
    height: auto;
    min-height: 200px;
    
    &:hover {
      transform: none; /* 移动端禁用悬停变换 */
      height: auto;
      min-height: 200px;
    }
  }
  
  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
    height: auto;
    min-height: 260px;
    z-index: 10;
    overflow: visible;
    
    .task-opinion {
      display: flex;
      opacity: 1;
      max-height: 200px;
    }
  }
  
  .task-header {
    padding: 12px 16px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-shrink: 0;
    
    .task-title {
      font-size: 14px;
      font-weight: 500;
      color: var(--el-text-color-primary);
      word-break: break-word;
      max-width: 85%;
      line-height: 1.4;
    }
  }
  
  .task-content {
    flex: 1;
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: 0;
    overflow: hidden;
    
    .task-info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin-bottom: 4px;
      flex-shrink: 0;
      
      /* 移动端信息网格适配 */
      @media (max-width: 768px) {
        grid-template-columns: 1fr;
        gap: 10px;
        margin-bottom: 8px;
      }
      
      .info-item {
        .info-label {
          font-size: 12px;
          color: var(--el-text-color-secondary);
          margin-bottom: 4px;
        }
        
        .info-value {
          font-size: 13px;
          color: var(--el-text-color-primary);
          @include text-ellipsis;
        }
      }
    }

    .task-action {
      margin-top: auto;
      margin-bottom: 8px;
      display: flex;
      justify-content: flex-end;
      flex-shrink: 0;
    }
    
    .task-opinion {
      background-color: var(--el-bg-color-page);
      border-radius: 8px;
      padding: 12px;
      margin-top: 0;
      border: 1px solid var(--el-border-color-lighter);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      border-left: 3px solid var(--el-color-success);
      transition: all 0.3s ease;
      flex: 0 0 auto;
      min-height: 0;
      max-height: 0;
      display: none;
      opacity: 0;
      flex-direction: column;
      overflow: hidden;
      cursor: pointer;
      
      &.expanded {
        display: flex !important;
        opacity: 1 !important;
        max-height: 200px !important;
      }
      
      .opinion-title {
        font-size: 13px;
        color: var(--el-text-color-regular);
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        font-weight: 500;
        flex-shrink: 0;
        
        .collapse-indicator {
          margin-left: auto;
          color: var(--el-text-color-secondary);
        }
      }
      
      .opinion-content {
        font-size: 13px;
        color: var(--el-text-color-primary);
        line-height: 1.6;
        flex: 1;
        overflow: hidden;
        transition: all 0.3s ease;
        padding: 0 4px;
        position: relative;
        display: -webkit-box;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
        max-height: 24px;
        
        &::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 20px;
          background: linear-gradient(transparent, var(--el-bg-color-page));
          pointer-events: none;
          opacity: 1;
          transition: opacity 0.3s;
        }
      }
      
      &:hover .opinion-content {
        overflow-y: auto;
        margin-top: 4px;
        display: block;
        -webkit-line-clamp: unset;
        max-height: 155px;
        
        &::-webkit-scrollbar {
          width: 4px;
        }
        
        &::-webkit-scrollbar-thumb {
          background-color: var(--el-border-color);
          border-radius: 2px;
        }
        
        &::-webkit-scrollbar-track {
          background-color: transparent;
        }
        
        &::after {
          opacity: 0;
        }
      }
    }
  }
}

.form-field-filter-section {
  margin-bottom: 16px;
  display: flex;
  align-items: flex-start;
  
  .field-label {
    width: 100px;
    line-height: 32px;
    text-align: right;
    padding-right: 12px;
    color: var(--el-text-color-regular);
    font-size: 14px;
    flex-shrink: 0;
  }
  
  .field-content {
    flex: 1;
  }
}


/* 统一表单控件样式 */
:deep(.el-input__wrapper),
:deep(.el-select),
:deep(.el-select__wrapper),
:deep(.el-date-editor.el-input__wrapper) {
  height: 36px !important;
}

:deep(.el-input__wrapper),
:deep(.el-select__wrapper),
:deep(.el-date-editor.el-input__wrapper) {
  padding-right: 11px !important;
  padding-left: 11px !important;
}

:deep(.el-date-editor) {
  --el-date-editor-width: 100% !important;
  width: 100% !important;
}

:deep(.el-range-editor.el-input__wrapper) {
  padding: 0 11px !important;
  width: 100% !important;
}

:deep(.el-input__inner),
:deep(.el-range-input) {
  height: 34px !important;
  line-height: 34px !important;
}

:deep(.el-button) {
  height: 36px !important;
}

.fixed-pagination {
  padding: 16px 20px;
  background-color: var(--el-bg-color);
  border-top: 1px solid var(--el-border-color-light);
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
  z-index: 1;
  
  /* 移动端分页适配 - 不再固定 */
  @media (max-width: 768px) {
    justify-content: center;
    padding: 12px 16px;
    position: relative;
    margin-bottom: 20px; /* 底部留出空间 */
    
    :deep(.el-pagination) {
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

@media screen and (max-width: 1440px) {
  .task-cards {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media screen and (max-width: 1024px) {
  .task-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media screen and (max-width: 768px) {
  .task-cards {
    grid-template-columns: 1fr;
  }
}

/* 搜索栏移动端样式 */
.bpm-search-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  
  .search-input {
    flex: 1;
    min-width: 200px;
  }
  
  .search-controls {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    
    .control-select {
      width: 155px;
    }
    
    .filter-button {
      display: flex;
      align-items: center;
      
      .button-text {
        display: inline;
      }
    }
  }
  
  /* 移动端搜索栏适配 */
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    
    .search-input {
      width: 100%;
      min-width: unset;
    }
    
    .search-controls {
      flex-direction: column;
      gap: 10px;
      width: 100%;
      
      .control-select {
        width: 100%;
      }
      
      .filter-button {
        width: 100%;
        justify-content: center;
        
        .button-text {
          display: inline;
        }
      }
    }
  }
  
  @media (max-width: 480px) {
    gap: 10px;
    
    .search-controls {
      gap: 8px;
      
      .filter-button {
        .button-text {
          display: none; /* 小屏幕只显示图标 */
        }
        
        .mr-5px {
          margin-right: 0 !important;
        }
      }
    }
  }
}

/* 高级筛选面板移动端适配 */
.bpm-advanced-filter {
  background-color: var(--el-bg-color-overlay);
  border-radius: 8px;
  padding: 16px;
  margin-top: 12px;
  border: 1px solid var(--el-border-color-light);
  
  .filter-title {
    display: flex;
    align-items: center;
    margin-bottom: 16px;
    font-weight: 500;
    color: var(--el-text-color-primary);
    
    .filter-icon {
      margin-right: 8px;
      color: var(--el-color-primary);
    }
  }
  
  .filter-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 16px;
    
    @media (max-width: 768px) {
      flex-direction: row;
      justify-content: center;
      align-items: center;
      gap: 10px;
      margin-top: 20px;
      padding: 0 8px;
      
      .el-button {
        flex: 1;
        max-width: 100px;
        height: 44px;
        font-size: 16px;
        border-radius: 8px;
        
        /* 确保按钮文字居中 */
        display: flex;
        align-items: center;
        justify-content: center;
      }
    }
    
    @media (max-width: 480px) {
      gap: 8px;
      padding: 0 4px;
      
      .el-button {
        height: 48px;
        font-size: 16px;
        max-width: 90px;
        
        /* 小屏幕进一步优化 */
        padding: 0 12px;
      }
    }
  }
  
  /* 移动端适配 */
  @media (max-width: 768px) {
    padding: 16px;
    margin-top: 10px;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    
    .filter-title {
      margin-bottom: 16px;
      font-size: 16px;
      justify-content: center;
      
      .filter-icon {
        font-size: 18px;
      }
    }
  }
  
  @media (max-width: 480px) {
    padding: 14px;
    border-radius: 10px;
    
    .filter-title {
      margin-bottom: 14px;
      font-size: 15px;
      
      .filter-icon {
        font-size: 16px;
      }
    }
  }
}
</style>
