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
        <el-input
          v-model="queryParams.processInstanceName"
          placeholder="请输入流程名称"
          clearable
          @keyup.enter="handleQuery"
          class="search-input"
          prefix-icon="ep:search"
        />

        <div class="flex items-center gap-12px">
          <el-date-picker
            v-model="queryParams.createTime"
            :default-time="[new Date('1 00:00:00'), new Date('1 23:59:59')]"
            type="daterange"
            value-format="YYYY-MM-DD HH:mm:ss"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            class="!w-280px"
          />

          <el-button @click="handleQuery">
            <Icon icon="ep:search" class="mr-5px" />
            搜索
          </el-button>
          <el-button @click="resetQuery">
            <Icon icon="ep:refresh" class="mr-5px" />
            重置
          </el-button>
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
                <el-button type="primary" size="small" @click="handleAudit(item)">查看详情</el-button>
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
      <el-pagination
        v-model:current-page="queryParams.pageNo"
        v-model:page-size="queryParams.pageSize"
        :page-sizes="[12, 21, 51, 104]"
        background
        layout="total, sizes, prev, pager, next, jumper"
        :total="total"
        @size-change="getList"
        @current-change="getList"
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

/** 重置按钮操作 */
const resetQuery = () => {
  queryFormRef.value?.resetFields()
  queryParams.processInstanceName = ''
  queryParams.createTime = []
  handleQuery()
}

/** 初始化 **/
onMounted(() => {
  getList()
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
}

.fixed-search {
  padding: 16px 20px;
  background-color: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-light);
  z-index: 1;
  flex-shrink: 0;
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
}

.copy-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  padding: 0 4px;
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
  }
  
  .card-content {
    flex: 1;
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: 0;
    overflow: hidden;
    
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
        }
      }
    }

    .card-action {
      margin-top: auto;
      margin-bottom: 8px;
      display: flex;
      justify-content: flex-end;
      flex-shrink: 0;
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
