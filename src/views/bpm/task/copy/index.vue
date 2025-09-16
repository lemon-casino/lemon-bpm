<!-- 工作流 - 抄送我的流程 -->
<template>
  <div class="bpm-card fade-in copy-task-container">
    <div class="bpm-card-header fixed-header">
      <div class="card-title">
        <Icon icon="ep:connection" class="title-icon" />
        <span>抄送我的</span>
      </div>
      <div class="card-subtitle">
        查看抄送给您的流程信息
      </div>
    </div>

    <div class="fixed-search">
      <!-- 搜索栏 -->
      <div class="bpm-search-bar">
        <!-- 桌面端布局 -->
        <div v-if="!isMobileDevice" class="desktop-search-layout">
          <div class="search-controls">
            <el-input
              v-model="queryParams.processInstanceName"
              placeholder="请输入流程名称"
              clearable
              @keyup.enter="handleQuery"
              class="search-input"
              prefix-icon="ep:search"
            />
            <el-date-picker
              v-model="queryParams.createTime"
              :default-time="[new Date('1 00:00:00'), new Date('1 23:59:59')]"
              type="daterange"
              value-format="YYYY-MM-DD HH:mm:ss"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              class="date-range-picker"
            />
          </div>
          <div class="search-actions">
            <el-button type="primary" @click="handleQuery" class="action-btn">
              <Icon icon="ep:search" class="button-icon" />
              <span class="button-text">搜索</span>
            </el-button>
            <el-button @click="resetQuery"   class="action-btn">
              <Icon icon="ep:refresh" class="button-icon" />
              <span class="button-text">重置</span>
            </el-button>
          </div>
        </div>

        <!-- 移动端布局 -->
        <div v-else class="mobile-search-layout">
          <div class="mobile-search-row">
            <el-input
              v-model="queryParams.processInstanceName"
              placeholder="请输入流程名称"
              clearable
              @keyup.enter="handleQuery"
              class="search-input"
              prefix-icon="ep:search"
            />
          </div>

          <div class="mobile-date-row">
            <el-date-picker
              v-model="startDate"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="开始日期"
              class="mobile-date-picker"
              @change="handleMobileDateChange"
            />
            <el-date-picker
              v-model="endDate"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="结束日期"
              class="mobile-date-picker"
              @change="handleMobileDateChange"
            />
          </div>

          <div class="mobile-button-row">
            <el-button type="primary" @click="handleQuery" class="action-btn">
              <Icon icon="ep:search" class="button-icon" />
              <span class="button-text">搜索</span>
            </el-button>
            <el-button @click="resetQuery" class="action-btn">
              <Icon icon="ep:refresh" class="button-icon" />
              <span class="button-text">重置</span>
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 抄送列表区域 - 可滚动部分 -->
    <div class="table-scroll-area">
      <el-empty v-if="list.length === 0 && !loading" description="暂无抄送记录" />
      <div v-else>
        <!-- 抄送卡片列表 -->
        <div v-loading="loading" class="copy-cards">
          <div
            v-for="item in list"
            :key="item.id"
            class="copy-card"
            @mouseenter="handleCardMouseEnter(item.id)"
            @mouseleave="handleCardMouseLeave"
            @click="handleCardClick(item.id)"
          >
            <div class="card-header">
              <div class="flex items-center">
                <Icon icon="ep:message" class="mr-5px text-primary" />
                <span class="process-name">{{ item.processInstanceName }}</span>
              </div>
              <el-tag size="small" type="info" effect="plain">抄送</el-tag>
            </div>

            <div class="card-content">
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">抄送节点</div>
                  <div class="info-value">{{ item.activityName }}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">流程发起人</div>
                  <div class="info-value">{{ item.startUser?.nickname || '-' }}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">流程发起时间</div>
                  <div class="info-value">{{ formatDate(new Date(item.processInstanceStartTime)) }}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">抄送人</div>
                  <div class="info-value">{{ item.createUser?.nickname || '系统' }}</div>
                </div>

                <div class="info-item">
                  <div class="info-label">抄送时间</div>
                  <div class="info-value">{{ formatDate(new Date(item.createTime)) }}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">流程状态</div>
                  <div class="info-value">
                    <dict-tag :type="DICT_TYPE.BPM_PROCESS_INSTANCE_STATUS" :value="item.status" />
                  </div>
                </div>
              </div>

              <div class="card-action">
                <el-button type="primary" size="small" @click.stop="handleAudit(item)">查看详情</el-button>
              </div>

              <!-- 抄送意见 -->
              <div v-if="item.reason" class="reason-section" :class="{ 'expanded': hoveredCardId === item.id }">
                <div class="section-title">
                  <Icon icon="ep:chat-dot-round" class="mr-5px" />
                  抄送意见
                  <span class="collapse-indicator">
                    <Icon :icon="hoveredCardId === item.id ? 'ep:arrow-up' : 'ep:arrow-down'" />
                  </span>
                </div>
                <div class="reason-content">{{ item.reason }}</div>
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
import * as ProcessInstanceApi from '@/api/bpm/processInstance'
import { DICT_TYPE } from '@/utils/dict'

// 定义抄送记录的类型
interface BpmProcessInstanceCopyVO {
  id: number
  processInstanceId: string
  processInstanceName: string
  activityName: string
  startUser: {
    nickname: string
  }
  createUser: {
    nickname: string
  }
  status :number
  processInstanceStartTime: string
  createTime: string
  reason?: string
}

defineOptions({ name: 'BpmProcessInstanceCopy' })

const { push } = useRouter() // 路由

const loading = ref(false) // 列表的加载中
const total = ref(0) // 列表的总页数
const list = ref<BpmProcessInstanceCopyVO[]>([]) // 列表的数据
const queryParams = reactive({
  pageNo: 1,
  pageSize: 12,
  processInstanceId: '',
  processInstanceName: '',
  createTime: []
})
const queryFormRef = ref() // 搜索的表单

// 移动端分离的日期选择器
const startDate = ref<string>('')
const endDate = ref<string>('')

// 移动设备检测
const isMobileDevice = computed(() => {
  if (typeof window !== 'undefined') {
    return window.innerWidth <= 768
  }
  return false
})

// 添加 hovered 状态管理
const hoveredCardId = ref<number | null>(null);

// 鼠标移入卡片事件处理
const handleCardMouseEnter = (id: number) => {
  hoveredCardId.value = id;
};

// 鼠标移出卡片事件处理
const handleCardMouseLeave = () => {
  hoveredCardId.value = null;
};

// 移动端卡片点击处理（用于展开/收起抄送意见）
const handleCardClick = (id: number) => {
  // 仅在移动端生效
  if (isMobileDevice.value) {
    if (hoveredCardId.value === id) {
      hoveredCardId.value = null; // 收起
    } else {
      hoveredCardId.value = id; // 展开
    }
  }
};

// 添加时间格式化函数
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

/** 查询任务列表 */
const getList = async () => {
  loading.value = true
  try {
    const data = await ProcessInstanceApi.getProcessInstanceCopyPage(queryParams)
    list.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}

/** 处理详情查看 */
const handleAudit = (row) => {
  const query = {
    id: row.processInstanceId,
    activityId: undefined
  }
  if (row.activityId) {
    query.activityId = row.activityId
  }
  push({
    name: 'BpmProcessInstanceDetail',
    query
  })
}

/** 搜索按钮操作 */
const handleQuery = () => {
  queryParams.pageNo = 1
  getList()
}

/** 处理移动端日期变更 */
const handleMobileDateChange = () => {
  // 将分离的开始和结束日期合并为日期范围
  if (startDate.value && endDate.value) {
    queryParams.createTime = [
      `${startDate.value} 00:00:00`,
      `${endDate.value} 23:59:59`
    ]
  } else if (startDate.value) {
    queryParams.createTime = [
      `${startDate.value} 00:00:00`,
      `${startDate.value} 23:59:59`
    ]
  } else if (endDate.value) {
    queryParams.createTime = [
      `${endDate.value} 00:00:00`,
      `${endDate.value} 23:59:59`
    ]
  } else {
    queryParams.createTime = []
  }
}

/** 重置按钮操作 */
const resetQuery = () => {
  queryFormRef.value?.resetFields()
  queryParams.processInstanceName = ''
  queryParams.createTime = []
  // 重置移动端日期字段
  startDate.value = ''
  endDate.value = ''
  handleQuery()
}

/** 初始化 **/
onMounted(() => {
  getList()
  
  // 初始化移动端日期字段
  if (queryParams.createTime && queryParams.createTime.length === 2) {
    startDate.value = queryParams.createTime[0].split(' ')[0]
    endDate.value = queryParams.createTime[1].split(' ')[0]
  }
})
</script>

<style lang="scss" scoped>
@use '@/styles/_mixins' as *;

.copy-task-container {
  height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;
  background-color: var(--el-bg-color);
  overflow: hidden;
  
  /* 移动端适配 - 允许整体滚动 */
  @media (max-width: 768px) {
    height: auto;
    min-height: calc(100vh - 80px);
    overflow-y: auto;
    overflow-x: hidden;
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 20px;
    
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
    padding-bottom: 30px;
  }
}

.fixed-header {
  padding: 16px 20px;
  background-color: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-light);
  z-index: 1;
  flex-shrink: 0;
  
  .card-subtitle {
    font-size: 13px;
    color: var(--el-text-color-secondary);
    margin-top: 4px;
  }
  
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
  padding: 20px 24px;
  background: linear-gradient(135deg, var(--el-bg-color) 0%, var(--el-bg-color-page) 100%);
  border-bottom: 1px solid var(--el-border-color-lighter);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  z-index: 1;
  flex-shrink: 0;
  
  /* 移动端搜索栏适配 - 不再固定 */
  @media (max-width: 768px) {
    position: relative;
    padding: 16px 16px;
    background: var(--el-bg-color);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  }
  
  @media (max-width: 480px) {
    padding: 12px 12px;
  }
}

/* 搜索栏样式 */
.bpm-search-bar {
  width: 100%;
  
  /* 桌面端布局 */
  .desktop-search-layout {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 4px 0;
    
    .search-controls {
      display: flex;
      align-items: center;
      gap: 16px;
      flex: 1;
      
      .search-input {
        flex: 1;
        min-width: 240px;
        max-width: 320px;
        
        :deep(.el-input__wrapper) {
          background-color: var(--el-fill-color-blank);
          border: 1px solid var(--el-border-color-light);
          
          &:hover {
            background-color: var(--el-bg-color);
            border-color: var(--el-color-primary-light-5);
          }
        }
      }
      
      .date-range-picker {
        width: 300px;
        flex-shrink: 0;
        
        :deep(.el-input__wrapper) {
          background-color: var(--el-fill-color-blank);
          border: 1px solid var(--el-border-color-light);
          
          &:hover {
            background-color: var(--el-bg-color);
            border-color: var(--el-color-primary-light-5);
          }
        }
      }
    }
    
    .search-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
      
      .action-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 0 20px;
        white-space: nowrap;
        font-weight: 500;
        border-radius: 8px;
        margin-left: 0px;
        .button-icon {
          font-size: 16px;
        }
        
        .button-text {
          font-size: 14px;
        }
        
        &[type="primary"] {
          background: linear-gradient(135deg, var(--el-color-primary) 0%, var(--el-color-primary-dark-2) 100%);
          border: none;
          
          &:hover {
            background: linear-gradient(135deg, var(--el-color-primary-light-3) 0%, var(--el-color-primary) 100%);
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(64, 158, 255, 0.3);
          }
        }
        
        &:not([type="primary"]) {
          background-color: var(--el-fill-color-blank);
          border: 1px solid var(--el-border-color);
          color: var(--el-text-color-regular);
          
          &:hover {
            background-color: var(--el-color-primary-light-9);
            border-color: var(--el-color-primary-light-5);
            color: var(--el-color-primary);
          }
        }
      }
    }
  }
  
  /* 移动端布局 */
  .mobile-search-layout {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    width: 100%;
    
    .mobile-search-row {
      width: 100%;
      display: flex;
      justify-content: center;
      
      .search-input {
        width: 100%;
        height: 44px;
        
        :deep(.el-input__wrapper) {
          background-color: var(--el-bg-color);
          border: 2px solid var(--el-border-color-lighter);
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
          
          &:hover, &:focus-within {
            border-color: var(--el-color-primary-light-5);
            box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
          }
        }
      }
    }
    
    .mobile-date-row {
      width: 100%;
      display: flex;
      gap: 12px;
      justify-content: center;
      
      .mobile-date-picker {
        flex: 1;
        height: 44px;
        
        :deep(.el-input__wrapper) {
          background-color: var(--el-bg-color);
          border: 2px solid var(--el-border-color-lighter);
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
          
          &:hover, &:focus-within {
            border-color: var(--el-color-primary-light-5);
            box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
          }
        }
      }
    }
    
    .mobile-button-row {
      display: flex;
      gap: 12px;
      justify-content: center;
      align-items: center;
      margin-top: 4px;
      width: 100%;
      
      .action-btn {
        flex: 1;
        max-width: 150px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        border-radius: 12px;
        font-weight: 600;
        margin: 0 !important;
        
        .button-icon {
          font-size: 18px;
        }
        
        .button-text {
          font-size: 15px;
        }
        
        &[type="primary"] {
          background: linear-gradient(135deg, var(--el-color-primary) 0%, var(--el-color-primary-dark-2) 100%);
          border: none;
          box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
          
          &:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 16px rgba(64, 158, 255, 0.4);
          }
          
          &:active {
            transform: translateY(0);
          }
        }
        
        &:not([type="primary"]) {
          background-color: var(--el-bg-color);
          border: 2px solid var(--el-border-color-light);
          color: var(--el-text-color-regular);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
          
          &:hover {
            background-color: var(--el-color-primary-light-9);
            border-color: var(--el-color-primary-light-5);
            color: var(--el-color-primary);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
          }
          
          &:active {
            transform: translateY(0);
          }
        }
      }
    }
  }
  
  /* 小屏幕手机适配 */
  @media (max-width: 480px) {
    .mobile-search-layout {
      gap: 10px;
      
      .mobile-search-row {
        width: 100%;
        display: flex;
        justify-content: center;
        
        .search-input {
          height: 42px;
        }
      }
      
      .mobile-date-row {
        width: 100%;
        flex-direction: column;
        gap: 10px;
        align-items: center;
        
        .mobile-date-picker {
          height: 42px;
        }
      }
      
      .mobile-button-row {
        flex-direction: column;
        gap: 10px;
        align-items: center;
        width: 100%;
        
        .action-btn {
          width: 100%;
          max-width: none;
          height: 42px;
          margin: 0 !important;
          
          .button-icon {
            font-size: 18px;
          }
          
          .button-text {
            font-size: 16px;
          }
        }
      }
    }
  }
}

.table-scroll-area {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 20px;
  
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
  
  scrollbar-width: thin;
  scrollbar-color: rgba(144, 147, 153, 0.3) transparent;
  
  /* 移动端适配 - 不再单独滚动 */
  @media (max-width: 768px) {
    padding: 20px 16px;
    overflow: visible;
    flex: none;
  }
  
  @media (max-width: 480px) {
    padding: 16px 12px;
  }
}

.copy-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  padding: 0 4px;
  
  /* 移动端卡片网格适配 */
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 12px;
    padding: 0;
  }
  
  @media (max-width: 480px) {
    gap: 10px;
  }
}

.copy-card {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  transition: all 0.3s ease;
  height: 260px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  
  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
    height: auto;
    min-height: 260px;
    z-index: 10;
    overflow: visible;
    
    .reason-section {
      display: flex;
      opacity: 1;
      max-height: 200px;
    }
    
    /* 移动端禁用悬停效果 */
    @media (max-width: 768px) {
      transform: none;
      height: auto;
      min-height: 200px;
    }
  }
  
  /* 移动端卡片适配 */
  @media (max-width: 768px) {
    height: auto;
    min-height: 200px;
    padding: 14px;
    overflow: visible; /* 允许内容溢出显示 */
    
    .card-content {
      overflow: visible; /* 允许内容溢出显示 */
      
      .info-grid {
        grid-template-columns: 1fr;
        gap: 10px;
        margin-bottom: 8px;
      }
    }
    
    /* 移动端抄送意见显示优化 */
    .reason-section {
      margin-top: 12px;
      border-radius: 6px;
      padding: 10px;
      
      /* 默认收起状态 */
      &:not(.expanded) {
        display: flex !important;
        opacity: 1 !important;
        max-height: 60px !important;
        
        .reason-content {
          display: -webkit-box !important;
          -webkit-line-clamp: 2 !important;
          -webkit-box-orient: vertical !important;
          overflow: hidden !important;
          max-height: 40px !important;
          
          &::after {
            display: block !important;
            background: linear-gradient(transparent, var(--el-bg-color-page)) !important;
          }
        }
      }
      
      /* 展开状态 */
      &.expanded {
        display: flex !important;
        opacity: 1 !important;
        max-height: none !important;
        
        .reason-content {
          max-height: none !important;
          -webkit-line-clamp: unset !important;
          overflow: visible !important;
          display: block !important;
          
          &::after {
            display: none !important; /* 移除渐变遮罩 */
          }
        }
      }
      
      .section-title {
        font-size: 12px;
        margin-bottom: 6px;
        
        .collapse-indicator {
          display: block; /* 移动端显示展开/收起指示器 */
        }
      }
      
      .reason-content {
        font-size: 12px;
        line-height: 1.5;
      }
    }
  }
  
  @media (max-width: 480px) {
    padding: 12px;
    border-radius: 6px;
  }
  
  .card-header {
    padding: 12px 16px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-shrink: 0;
    
    .process-name {
      font-size: 14px;
      font-weight: 500;
      color: var(--el-text-color-primary);
      word-break: break-word;
      max-width: 85%;
      line-height: 1.4;
    }
    
    /* 移动端头部适配 */
    @media (max-width: 768px) {
      padding: 0 0 12px 0; /* 移除左右内边距，因为卡片已有padding */
      
      .process-name {
        max-width: 75%;
        font-size: 15px;
        line-height: 1.3;
      }
    }
    
    @media (max-width: 480px) {
      .process-name {
        font-size: 14px;
      }
    }
  }
  
  .card-content {
    flex: 1;
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: 0;
    overflow: hidden;
    
    /* 移动端内容区域适配 */
    @media (max-width: 768px) {
      padding: 0; /* 移除内边距，因为卡片已有padding */
      overflow: visible; /* 允许内容溢出显示 */
      gap: 10px;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin-bottom: 4px;
      flex-shrink: 0;
      
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
          
          /* 移动端取消文本省略，显示完整内容 */
          @media (max-width: 768px) {
            white-space: normal;
            overflow: visible;
            text-overflow: unset;
            word-break: break-word;
            line-height: 1.4;
            font-size: 14px;
          }
        }
      }
    }

    .card-action {
      margin-top: auto;
      margin-bottom: 8px;
      display: flex;
      justify-content: flex-end;
      flex-shrink: 0;
      
      /* 移动端按钮区域适配 */
      @media (max-width: 768px) {
        justify-content: center;
        margin-top: 16px;
        margin-bottom: 12px;
        
        .el-button {
          padding: 8px 20px;
          font-size: 14px;
          border-radius: 6px;
        }
      }
      
      @media (max-width: 480px) {
        .el-button {
          padding: 6px 16px;
          font-size: 13px;
        }
      }
    }
    
    .reason-section {
      background-color: var(--el-bg-color-page);
      border-radius: 8px;
      padding: 12px;
      margin-top: 0;
      border: 1px solid var(--el-border-color-lighter);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      border-left: 3px solid var(--el-color-primary);
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
      
      .section-title {
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
      
      .reason-content {
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
      
      &:hover .reason-content {
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
    position: relative;
    justify-content: center;
    padding: 12px 16px;
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

/* 统一表单控件样式 */
:deep(.el-input__wrapper),
:deep(.el-select),
:deep(.el-select__wrapper),
:deep(.el-date-editor.el-input__wrapper) {
  height: 36px !important;
  border-radius: 6px !important;
  transition: all 0.2s ease !important;
  
  &:hover {
    border-color: var(--el-color-primary) !important;
  }
  
  &:focus-within {
    border-color: var(--el-color-primary) !important;
    box-shadow: 0 0 0 2px var(--el-color-primary-light-8) !important;
  }
}

:deep(.el-input__wrapper),
:deep(.el-select__wrapper),
:deep(.el-date-editor.el-input__wrapper) {
  padding-right: 12px !important;
  padding-left: 12px !important;
}

:deep(.el-date-editor) {
  --el-date-editor-width: 100% !important;
  width: 100% !important;
}

:deep(.el-input__inner) {
  height: 34px !important;
  line-height: 34px !important;
  font-size: 14px !important;
}

:deep(.el-button) {
  height: 36px !important;
  border-radius: 6px !important;
  font-weight: 500 !important;
  transition: all 0.2s ease !important;
  
  &:hover {
    transform: translateY(-1px) !important;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1) !important;
  }
  
  &:active {
    transform: translateY(0) !important;
  }
}

/* 移动端表单控件适配 */
.mobile-search-layout {
  :deep(.el-input__wrapper),
  :deep(.el-select),
  :deep(.el-select__wrapper),
  :deep(.el-date-editor.el-input__wrapper) {
    height: 44px !important;
    border-radius: 8px !important;
  }
  
  :deep(.el-input__inner) {
    height: 42px !important;
    line-height: 42px !important;
    font-size: 16px !important;
  }
  
  :deep(.el-button) {
    height: 44px !important;
    border-radius: 8px !important;
    font-size: 14px !important;
    margin: 0 !important;
  }
}

/* 小屏幕手机端适配 */
@media (max-width: 480px) {
  .mobile-search-layout {
    :deep(.el-input__wrapper),
    :deep(.el-select),
    :deep(.el-select__wrapper),
    :deep(.el-date-editor.el-input__wrapper) {
      height: 42px !important;
    }
    
    :deep(.el-input__inner) {
      height: 40px !important;
      line-height: 40px !important;
      font-size: 16px !important;
    }
    
    :deep(.el-button) {
      height: 42px !important;
      font-size: 16px !important;
      margin: 0 !important;
    }
  }
}

/* 移动端日期选择器弹出面板优化 */
:deep(.el-picker-panel) {
  @media (max-width: 768px) {
    position: fixed !important;
    top: 50% !important;
    left: 50% !important;
    transform: translate(-50%, -50%) !important;
    width: 90vw !important;
    max-width: 350px !important;
    max-height: 80vh !important;
    border-radius: 12px !important;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2) !important;
    z-index: 9999 !important;
  }
}

@media screen and (max-width: 1440px) {
  .copy-cards {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media screen and (max-width: 1024px) {
  .copy-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media screen and (max-width: 768px) {
  .copy-cards {
    grid-template-columns: 1fr;
  }
}
</style>
