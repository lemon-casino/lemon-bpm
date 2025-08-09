<template>
 <!-- 主卡片容器 - 包含所有内容 -->
  <div class="bpm-card">
    <!-- 卡片头部 -->
    <div class="bpm-card-header">
      <div class="card-title">
        <Icon icon="ep:list" class="title-icon" />
        <span>我的流程</span>
      </div>
      <div class="card-action">
        <el-button type="primary" @click="handleCreateProcess">
          <Icon icon="ep:plus" class="mr-5px" />
          发起流程
        </el-button>
      </div>
    </div>
    
    <div class="bpm-card-body">
      <!-- 流程状态水平统计条 - 重新设计成更美观的卡片 -->
      <div class="stats-dashboard fade-in">
        <div class="stat-card running" @click="handleFilterByStatus(1)">
          <div class="stat-icon-container">
            <Icon icon="ep:timer" class="stat-icon" />
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.running || 0 }}</div>
            <div class="stat-title">审批中</div>
          </div>
          <div class="stat-bg-icon"><Icon icon="ep:timer" /></div>
        </div>
        <div class="stat-card completed" @click="handleFilterByStatus(2)">
          <div class="stat-icon-container">
            <Icon icon="ep:circle-check" class="stat-icon" />
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.completed || 0 }}</div>
            <div class="stat-title">已通过</div>
          </div>
          <div class="stat-bg-icon"><Icon icon="ep:circle-check" /></div>
        </div>
        <div class="stat-card canceled" @click="handleFilterByStatus(4)">
          <div class="stat-icon-container">
            <Icon icon="ep:close" class="stat-icon" />
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.canceled || 0 }}</div>
            <div class="stat-title">已取消</div>
          </div>
          <div class="stat-bg-icon"><Icon icon="ep:close" /></div>
        </div>
        <div class="stat-card error" @click="handleFilterByStatus(3)">
          <div class="stat-icon-container">
            <Icon icon="ep:circle-close" class="stat-icon" />
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.error || 0 }}</div>
            <div class="stat-title">已拒绝</div>
          </div>
          <div class="stat-bg-icon"><Icon icon="ep:circle-close" /></div>
        </div>
      </div>
      
      <!-- 紧凑型搜索栏 -->
      <div class="compact-search-bar">
        <div class="search-left">
          <el-input
            v-model="queryParams.name"
            placeholder="请输入流程名称"
            clearable
            @keyup.enter="handleQuery"
            class="search-input"
            prefix-icon="ep:search"
          />
          <el-input
            v-model="queryParams.processDefinitionKey"
            placeholder="请输入流程定义的标识"
            clearable
         style="max-width: 300px"
          />
          <el-select
            v-model="queryParams.category"
            placeholder="流程分类"
            clearable
            class="filter-select"
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
            placeholder="流程状态"
            clearable
            class="filter-select"
            @change="handleQuery"
          >
            <el-option
              v-for="dict in getIntDictOptions(DICT_TYPE.BPM_PROCESS_INSTANCE_STATUS)"
              :key="dict.value"
              :label="dict.label"
              :value="dict.value"
            />
          </el-select>
        </div>
        
        <div class="search-right">
          <el-button type="primary" @click="handleQuery" class="action-button">
            搜索
          </el-button>
          <el-button @click="resetQuery" class="action-button">
            重置
          </el-button>
          <el-button type="info" @click="showAdvancedFilter = !showAdvancedFilter" class="action-button">
            {{ showAdvancedFilter ? '收起' : '高级筛选' }}
            <Icon :icon="showAdvancedFilter ? 'ep:arrow-up' : 'ep:arrow-down'" class="ml-5px" />
          </el-button>
        </div>
      </div>
      
      <!-- 可折叠的高级筛选区域 -->
      <transition name="el-zoom-in-top">
        <div v-if="showAdvancedFilter" class="advanced-filter-panel">
          <!-- 表单字段筛选组件 - 独立一行横排展示 -->
          <div class="form-field-filter-section">
            <div class="field-content">
              <!--                v-model:modelId="queryParams.modelId"-->
              <FormFieldFilter
                ref="formFieldFilterRef"
                v-model:formFieldsParams="queryParams.formFieldsParams"
                v-model:dateRange="queryParams.createTime"
                v-model:formFieldValue="queryParams.formFieldValue"
                @change="handleFormFieldFilterChange"
                :showDateRange="true"
                startDatePlaceholder="发起时间"
                endDatePlaceholder="结束时间"
              />
            </div>
          </div>
        </div>
      </transition>
      
      <!-- 增大高度的表格容器 -->
      <div class="expanded-table-container">
        <!-- 流程列表 -->
        <el-table 
          v-loading="loading" 
          :data="list" 
          class="bpm-table"
          :header-cell-style="{
            background: 'var(--el-fill-color-light)',
            color: 'var(--el-text-color-primary)',
            fontWeight: 'bold'
          }"
          height="100%"
          border
        >
          <el-table-column 
            label="流程名称" 
            align="center" 
            prop="name" 
            min-width="180px" 
            fixed="left" 
            show-overflow-tooltip
          >
            <template #default="scope">
              <div class="flex items-center">
                <Icon icon="ep:connection" class="mr-5px text-primary" />
                <span>{{ scope.row.name }}</span>
              </div>
            </template>
          </el-table-column>
          
          <el-table-column label="摘要" prop="summary" min-width="200" fixed="left" show-overflow-tooltip>
            <template #default="scope">
              <div class="summary-container" v-if="scope.row.summary && scope.row.summary.length > 0">
                <!-- 摘要内容改为横向排列 -->
                <div class="summary-row">
                  <!-- 限制最多显示1项摘要 -->
                  <div v-for="(item, index) in scope.row.summary.slice(0, 1)" :key="index" class="summary-item">
                    <el-tag size="small" type="info" class="mr-5px">{{ item.key }}</el-tag>
                    <span class="summary-value">{{ item.value }}</span>
                  </div>
                  
                  <!-- 如果有更多摘要，显示查看更多按钮（横向排列） -->
                  <el-popover
                    v-if="scope.row.summary.length > 1"
                    placement="bottom-start"
                    :width="300"
                    trigger="hover"
                  >
                    <template #reference>
                      <div class="more-summary">
                        <el-link type="primary" :underline="false">
                          <small>+{{ scope.row.summary.length - 1 }}项</small>
                        </el-link>
                      </div>
                    </template>
                    <div class="summary-popover">
                      <div v-for="(item, index) in scope.row.summary" :key="index" class="mb-5px">
                        <el-tag size="small" type="info" class="mr-5px">{{ item.key }}</el-tag>
                        <span>{{ item.value }}</span>
                      </div>
                    </div>
                  </el-popover>
                </div>
              </div>
              <span v-else>-</span>
            </template>
          </el-table-column>
          
          <el-table-column
            label="流程分类"
            align="center"
            prop="categoryName"
            min-width="100"
          >
            <template #default="scope">
              <el-tag type="success" effect="plain" size="small">
                {{ scope.row.categoryName }}
              </el-tag>
            </template>
          </el-table-column>
          
          <el-table-column label="流程状态" prop="status" width="120">
            <template #default="scope">
              <dict-tag :type="DICT_TYPE.BPM_PROCESS_INSTANCE_STATUS" :value="scope.row.status" />
            </template>
          </el-table-column>
          
          <el-table-column
            label="发起时间"
            align="center"
            prop="startTime"
            width="180"
            :formatter="dateFormatter"
          />
          
          <el-table-column
            label="结束时间"
            align="center"
            prop="endTime"
            width="180"
            :formatter="dateFormatter"
          />
          
          <!-- 操作列按钮 -->
          <el-table-column label="操作" align="center" fixed="right" width="220">
            <template #default="scope">
              <!-- 详情按钮 - 所有状态都显示 -->
              <el-button
                link
                type="primary"
                v-hasPermi="['bpm:process-instance:query']"
                @click="handleDetail(scope.row)"
              >
                详情
              </el-button>
              
              <!-- 运行中的流程显示取消按钮 -->
              <el-button
                v-if="scope.row.status === 1"
                link
                :type="cancelLoadingId === scope.row.id ? 'info' : 'primary'"
                v-hasPermi="['bpm:process-instance:cancel']"
                @click="handleCancel(scope.row)"
                :loading="cancelLoadingId === scope.row.id"
              >
                取消
              </el-button>
              
              <!-- 已完成/已取消/已拒绝的流程显示删除按钮 -->
              <el-button 
                v-if="scope.row.status === 2 || scope.row.status === 3 || scope.row.status === 4"
                link 
                type="danger" 
                v-hasPermi="['bpm:process-instance:delete']"
                @click="handleDelete(scope.row)"
                :loading="deleteLoadingId === scope.row.id"
              >
                删除
              </el-button>
              
              <!-- 已完成/已取消/已拒绝的流程显示重新发起按钮 -->
              <el-button 
                v-if="scope.row.status === 2 || scope.row.status === 3 || scope.row.status === 4"
                link 
                type="primary" 
                @click="handleCreate(scope.row)"
              >
                重新发起
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        
        <!-- 分页 -->
        <div class="pagination-container">
          <Pagination
            :total="total"
            v-model:page="queryParams.pageNo"
            v-model:limit="queryParams.pageSize"
            @pagination="getList"
          />
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { DICT_TYPE, getIntDictOptions } from '@/utils/dict'
import { dateFormatter } from '@/utils/formatTime'
import { ElMessageBox } from 'element-plus'
import {
  getProcessInstanceMyPage,
  deleteProcessInstance,
  cancelProcessInstanceByStartUser,
  type ProcessInstanceVO,
  type ProcessInstanceMyPageParams
} from '@/api/bpm/processInstance'
import { CategoryApi, CategoryVO } from '@/api/bpm/category'
import { FormFieldFilter } from '@/components'

defineOptions({ name: 'BpmProcessInstanceMy' })
const router = useRouter() // 路由
const message = useMessage() // 消息弹窗
const { t } = useI18n() // 国际化

const loading = ref(true) // 列表的加载中
const total = ref(0) // 列表的总页数
const list = ref([]) // 列表的数据
const cancelLoadingId = ref(null) // 当前正在取消的流程ID
const deleteLoadingId = ref(null) // 当前正在删除的流程ID
const refreshing = ref(false) // 全局数据刷新状态
const formFieldFilterRef = ref<InstanceType<typeof FormFieldFilter> | null>(null)
const queryParams = reactive<ProcessInstanceMyPageParams>({
  pageNo: 1,
  pageSize: 10,
  name: undefined,
  processDefinitionId: undefined,
  category: undefined,
  status: undefined,
  result: undefined,
  startUserId: undefined,
  createTime: [],
  formFieldValue: undefined,
  formFieldsParams:undefined, // 选中的模型ID
})
const queryFormRef = ref() // 搜索的表单
const categoryList = ref<CategoryVO[]>([]) // 流程分类列表
const showAdvancedFilter = ref(false) // 是否显示高级筛选

// 流程统计数据
const stats = reactive({
  running: 0,
  completed: 0,
  canceled: 0,
  error: 0
})

/** 统一数据刷新函数 */
const refreshAllData = async (showLoading = true) => {
  if (refreshing.value) return // 防止重复刷新
  
  refreshing.value = true
  if (showLoading) {
    loading.value = true
  }
  
  try {
    // 并行获取所有数据
    await Promise.all([
      getList(false), // 传入false避免重复设置loading
      getCategoryList()
    ])
  } catch (error) {
    console.error('数据刷新失败:', error)
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

/** 查询列表 */
const getList = async (setLoading = true) => {
  if (setLoading) {
    loading.value = true
  }
  try {
    const response = await getProcessInstanceMyPage(queryParams)
    // 处理嵌套的数据结构
    const data = response.page || response
    list.value = data.list || []
    total.value = data.total || 0
    
    // 更新流程统计数据
    if (response.statusList && Array.isArray(response.statusList)) {
      // 重置统计数据
      stats.running = 0
      stats.completed = 0
      stats.error = 0
      stats.canceled = 0
      
      // 根据状态列表更新统计数据
      response.statusList.forEach(item => {
        if (item.key === 1) stats.running = item.value || 0
        else if (item.key === 2) stats.completed = item.value || 0
        else if (item.key === 3) stats.error = item.value || 0
        else if (item.key === 4) stats.canceled = item.value || 0
      })
    }
  } finally {
    if (setLoading) {
      loading.value = false
    }
  }
}

/** 处理按状态筛选 */
const handleFilterByStatus = (status) => {
  queryParams.status = status
  handleQuery()
}

/** 搜索按钮操作 */
const handleQuery = () => {
  queryParams.pageNo = 1
  refreshAllData()
}

/** 重置按钮操作 */
const resetQuery = () => {
  queryFormRef.value?.resetFields()
  
  // 明确重置特定字段，确保它们被正确清空  : '' ,
  queryParams.name = ''
  queryParams.category = undefined
  queryParams.status = undefined
  queryParams.startUserId = undefined
  queryParams.processDefinitionKey = undefined
  queryParams.createTime = []
  queryParams.formFieldValue = undefined
  queryParams.formFieldsParams =undefined
  // 在重置后立即执行查询
  if (formFieldFilterRef.value) {
    formFieldFilterRef.value.resetFields()
  }
  handleQuery()
}

/** 处理表单字段筛选变更 */
const handleFormFieldFilterChange = (data: any) => {
  // 更新表单字段参数
  queryParams.formFieldValue = data.formFieldValue || undefined
  queryParams.formFieldsParams = data.formFieldsParams || undefined
  queryParams.createTime = data.dateRange
}


/** 跳转流程详情 */
const handleDetail = (row: ProcessInstanceVO) => {
  router.push({
    name: 'BpmProcessInstanceDetail',
    query: {
      id: row.id
    }
  })
}

/** 跳转流程定义 */
const handleCreate = async (row: ProcessInstanceVO) => {
  router.push({
    name: 'BpmProcessInstanceCreate',
    query: {
      processInstanceId: row.id
    }
  })
}

/** 发起新流程 */
const handleCreateProcess = () => {
  router.push({
    name: 'BpmProcessInstanceCreate'
  })
}

/** 取消流程 */
const handleCancel = async (row: ProcessInstanceVO) => {
  try {
    // 二次确认并获取用户输入的取消原因
    const { value } = await ElMessageBox.prompt('请输入取消原因', '取消流程', {
      confirmButtonText: t('common.ok'),
      cancelButtonText: t('common.cancel'),
      inputPattern: /^[\s\S]*.*\S[\s\S]*$/, // 判断非空，且非空格
      inputErrorMessage: '取消原因不能为空'
    })
    
    // 用户确认后设置loading状态，记录当前流程ID
    cancelLoadingId.value = row.id
    
    // 执行操作
     await cancelProcessInstanceByStartUser(row.id, value)
     // 提示成功
     message.success(t('用户取消成功'))
    // 刷新所有数据
    await refreshAllData()
  } catch {} finally {
    cancelLoadingId.value = null
  }
}

/** 删除流程 */
const handleDelete = async (row: ProcessInstanceVO) => {
  try {
    // 二次确认
    await ElMessageBox.confirm('确定要删除该流程实例吗？删除后将无法恢复！', '提示', {
      confirmButtonText: t('common.ok'),
      cancelButtonText: t('common.cancel'),
      type: 'warning'
    })

    // 设置loading状态，记录当前流程ID
    deleteLoadingId.value = row.id

    // 执行删除操作
    await deleteProcessInstance(row.id)
    
    // 提示成功
    message.success('流程删除成功')
    
    // 刷新所有数据
    await refreshAllData()
  } catch (error) {
    console.error('删除流程失败:', error)
  } finally {
    deleteLoadingId.value = null
  }
}

/** 获取流程分类 */
const getCategoryList = async () => {
  categoryList.value = await CategoryApi.getCategorySimpleList()
}

/** 页面激活时刷新数据 */
onActivated(() => {
  refreshAllData()
})

/** 初始化 */
onMounted(async () => {
  await refreshAllData()
})
</script>

<style lang="scss" scoped>
.text-primary {
  color: var(--el-color-primary);
}

/* 修复滚动问题 - 调整主容器高度 */
.bpm-card {
  height: calc(100vh - 120px); /* 调整为更合适的高度 */
  display: flex;
  flex-direction: column;
  overflow: hidden; /* 防止溢出 */
  margin-bottom: 0; /* 移除底部间距 */
  
  .bpm-card-body {
    padding-top: 0px;
    overflow-y: auto; /* 启用内部滚动 */
    flex: 1;
    display: flex;
    flex-direction: column;
  }
}

/* 美化状态卡片 */
.stats-dashboard {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 16px;
  
  .stat-card {
    position: relative;
    overflow: hidden;
    border-radius: 12px;
    padding: 16px;
    display: flex;
    align-items: center;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
    
    &:hover {
      transform: translateY(-4px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.12);
    }
    
    .stat-icon-container {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 16px;
      flex-shrink: 0;
      
      .stat-icon {
        font-size: 24px;
        color: white;
      }
    }
    
    .stat-content {
      z-index: 1;
      flex-grow: 1;
    }
    
    .stat-value {
      font-size: 24px;
      font-weight: 700;
      line-height: 1.2;
      margin-bottom: 4px;
      font-feature-settings: "tnum";
      transition: all 0.3s ease;
    }
    
    .stat-title {
      font-size: 14px;
      opacity: 0.8;
    }
    
    .stat-bg-icon {
      position: absolute;
      bottom: -15px;
      right: -15px;
      font-size: 80px;
      opacity: 0.1;
      z-index: 0;
    }
    
    /* 各状态卡片的颜色设置 */
    &.running {
      background: linear-gradient(135deg, #3498db, #2980b9);
      color: white;
      
      .stat-icon-container {
        background-color: rgba(255, 255, 255, 0.2);
      }
      
      &:hover .stat-value {
        transform: scale(1.1);
      }
    }
    
    &.completed {
      background: linear-gradient(135deg, #2ecc71, #27ae60);
      color: white;
      
      .stat-icon-container {
        background-color: rgba(255, 255, 255, 0.2);
      }
      
      &:hover .stat-value {
        transform: scale(1.1);
      }
    }
    
    &.canceled {
      background: linear-gradient(135deg, #95a5a6, #7f8c8d);
      color: white;
      
      .stat-icon-container {
        background-color: rgba(255, 255, 255, 0.2);
      }
      
      &:hover .stat-value {
        transform: scale(1.1);
      }
    }
    
    &.error {
      background: linear-gradient(135deg, #e74c3c, #c0392b);
      color: white;
      
      .stat-icon-container {
        background-color: rgba(255, 255, 255, 0.2);
      }
      
      &:hover .stat-value {
        transform: scale(1.1);
      }
    }
  }
}

/* 紧凑型搜索栏 */
.compact-search-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--el-fill-color-light);
  padding: 12px 16px;
  border-radius: var(--border-radius-base);
  margin-bottom: 0px;
  flex-wrap: wrap;
  gap: 12px;
  
  .search-left {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    flex: 1;
    min-width: 0;
  }
  
  .search-right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
  
  .search-input {
    width: 250px;
    max-width: 100%;
  }
  
  .filter-select {
    width: 150px;
  }
  
  .action-button {
    padding-left: 16px;
    padding-right: 16px;
  }
}

/* 高级筛选面板 */
.advanced-filter-panel {
  background-color: var(--el-bg-color-overlay);
  border-radius: var(--border-radius-base);
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: var(--shadow-light);
  border: 1px solid var(--border-color-light);
  
  .filter-form {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-bottom: 16px;
    
    @media (max-width: 1200px) {
      grid-template-columns: repeat(2, 1fr);
    }
    
    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }
  
  .filter-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
}

/* 扩展的表格容器 */
.expanded-table-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 300px; /* 确保表格有一个最小高度 */
  
  .el-table {
    flex: 1;
    overflow: auto;
  }
  
  .pagination-container {
    padding: 12px 0;
    padding-top: 0px;
    padding-bottom: 0px;

    background-color: var(--el-bg-color);
    border-top: 1px solid var(--border-color-light);
    z-index: 10;
    display: flex;
    justify-content: flex-end;
  }
}

/* 摘要样式优化 */
.summary-container {
  max-width: 100%;
  
  .summary-row {
    display: flex;
    align-items: center;
    flex-wrap: nowrap;
    max-width: 100%;
  }
  
  .summary-item {
    display: flex;
    align-items: center;
    margin-right: 8px;
    max-width: calc(100% - 45px); /* 减去"+N项"按钮宽度 */
    white-space: nowrap;
    overflow: hidden;
  }
  
  .summary-value {
    display: inline-block;
    max-width: 140px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    vertical-align: middle;
  }
  
  .more-summary {
    margin-left: 4px;
    font-size: 12px;
    white-space: nowrap;
  }
}

.summary-popover {
  max-height: 200px;
  overflow-y: auto;
}

/* 添加动画 */
.fade-in {
  animation: fadeIn 0.5s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* FormFieldFilter 样式 */
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

/* 动画 */
.el-zoom-in-top-enter-active,
.el-zoom-in-top-leave-active {
  transition: transform 0.3s, opacity 0.3s;
}

.el-zoom-in-top-enter-from,
.el-zoom-in-top-leave-to {
  opacity: 0;
  transform: scaleY(0);
  transform-origin: top;
}
</style>
