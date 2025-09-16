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
        <el-button type="success" @click="refreshAllData" :loading="refreshing" class="header-btn">
          <Icon icon="ep:refresh" class="mr-5px" />
          <span class="btn-text">刷新数据</span>
        </el-button>
        <el-button type="primary" @click="handleCreateProcess" class="header-btn">
          <Icon icon="ep:plus" class="mr-5px" />
          <span class="btn-text">发起流程</span>
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
        <!-- 桌面端表格视图 -->
        <el-table 
          v-loading="loading" 
          :data="list" 
          class="bmp-table desktop-table"
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
          <el-table-column label="运行节点" prop="tasks" width="140" align="center">
            <template #default="scope">
              <div v-if="scope.row.tasks && scope.row.tasks.length > 0">
                <!-- 如果只有一个任务，直接显示 -->
                <div v-if="scope.row.tasks.length === 1" class="task-single">
                  <el-tag type="warning" effect="plain" size="small">
                    {{ scope.row.tasks[0].name }}
                  </el-tag>
                </div>
                <!-- 如果有多个任务，显示第一个+更多 -->
                <div v-else class="task-multiple">
                  <el-tag type="warning" effect="plain" size="small" class="mb-2px">
                    {{ scope.row.tasks[0].name }}
                  </el-tag>
                  <el-popover
                    placement="bottom-start"
                    :width="250"
                    trigger="hover"
                  >
                    <template #reference>
                      <div class="more-tasks">
                        <el-link type="warning" :underline="false">
                          <small>+{{ scope.row.tasks.length - 1 }}个</small>
                        </el-link>
                      </div>
                    </template>
                    <div class="tasks-popover">
                      <div v-for="task in scope.row.tasks" :key="task.id" class="mb-5px">
                        <el-tag type="warning" effect="plain" size="small">
                          {{ task.name }}
                        </el-tag>
                      </div>
                    </div>
                  </el-popover>
                </div>
              </div>
              <span v-else class="text-placeholder">-</span>
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
        
        <!-- 移动端卡片视图 -->
        <div v-loading="loading" class="mobile-card-view">
          <div v-for="item in list" :key="item.id" class="process-card">
            <!-- 卡片头部 -->
            <div class="card-header">
              <div class="process-name">
                <Icon icon="ep:connection" class="process-icon" />
                <span class="name-text">{{ item.name }}</span>
              </div>
              <dict-tag :type="DICT_TYPE.BPM_PROCESS_INSTANCE_STATUS" :value="item.status" />
            </div>
            
            <!-- 卡片内容 -->
            <div class="card-content">
              <!-- 摘要信息 -->
              <div v-if="item.summary && item.summary.length > 0" class="summary-section">
                <div class="section-title">摘要信息</div>
                <div class="summary-list">
                  <div v-for="(summary, index) in item.summary.slice(0, 2)" :key="index" class="summary-item-mobile">
                    <el-tag size="small" type="info">{{ summary.key }}</el-tag>
                    <span class="summary-value-mobile">{{ summary.value }}</span>
                  </div>
                  <div v-if="item.summary.length > 2" class="more-summary-mobile">
                    <el-button text type="primary" size="small" @click="showMoreSummary(item)">
                      查看更多 (+{{ item.summary.length - 2 }}项)
                    </el-button>
                  </div>
                </div>
              </div>
              
              <!-- 基本信息 -->
              <div class="info-section">
                <div class="info-row">
                  <span class="info-label">流程分类:</span>
                  <el-tag type="success" effect="plain" size="small">{{ item.categoryName }}</el-tag>
                </div>
                <!-- 运行节点信息 -->
                <div v-if="item.tasks && item.tasks.length > 0" class="info-row">
                  <span class="info-label">运行节点:</span>
                  <div class="running-tasks-mobile">
                    <!-- 如果只有一个任务 -->
                    <el-tag v-if="item.tasks.length === 1" type="warning" effect="plain" size="small">
                      {{ item.tasks[0].name }}
                    </el-tag>
                    <!-- 如果有多个任务 -->
                    <div v-else class="multiple-tasks-mobile">
                      <el-tag type="warning" effect="plain" size="small" class="mr-5px">
                        {{ item.tasks[0].name }}
                      </el-tag>
                      <el-button text type="warning" size="small" @click="showMoreTasks(item)">
                        +{{ item.tasks.length - 1 }}个
                      </el-button>
                    </div>
                  </div>
                </div>
                <div class="info-row">
                  <span class="info-label">发起时间:</span>
                  <span class="info-value">{{ dateFormatter(null, null, item.startTime) }}</span>
                </div>
                <div v-if="item.endTime" class="info-row">
                  <span class="info-label">结束时间:</span>
                  <span class="info-value">{{ dateFormatter(null, null, item.endTime) }}</span>
                </div>
              </div>
            </div>
            
            <!-- 卡片操作 -->
            <div class="card-actions">
              <!-- 详情按钮 -->
              <el-button
                size="small"
                type="primary"
                v-hasPermi="['bpm:process-instance:query']"
                @click="handleDetail(item)"
              >
                详情
              </el-button>
              
              <!-- 运行中的流程显示取消按钮 -->
              <el-button
                v-if="item.status === 1"
                size="small"
                :type="cancelLoadingId === item.id ? 'info' : 'warning'"
                v-hasPermi="['bpm:process-instance:cancel']"
                @click="handleCancel(item)"
                :loading="cancelLoadingId === item.id"
              >
                取消
              </el-button>
              
              <!-- 已完成/已取消/已拒绝的流程显示删除按钮 -->
              <el-button 
                v-if="item.status === 2 || item.status === 3 || item.status === 4"
                size="small"
                type="danger" 
                v-hasPermi="['bpm:process-instance:delete']"
                @click="handleDelete(item)"
                :loading="deleteLoadingId === item.id"
              >
                删除
              </el-button>
              
              <!-- 已完成/已取消/已拒绝的流程显示重新发起按钮 -->
              <el-button 
                v-if="item.status === 2 || item.status === 3 || item.status === 4"
                size="small"
                type="success"
                @click="handleCreate(item)"
              >
                重新发起
              </el-button>
            </div>
          </div>
          
          <!-- 移动端空状态 -->
          <div v-if="list.length === 0 && !loading" class="mobile-empty">
            <Icon icon="ep:document" class="empty-icon" />
            <p>暂无流程数据</p>
          </div>
        </div>
        
        <!-- 分页 -->
        <div class="pagination-container">
          <Pagination
            :total="total"
            v-model:page="queryParams.pageNo"
            v-model:limit="queryParams.pageSize"
            :pagerCount="4"
            @pagination="getList"
            :small="isMobile"
            :hide-on-single-page="false"
            class="mobile-pagination"
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

// 移动端检测
const isMobile = ref(false)

// 流程统计数据
const stats = reactive({
  running: 0,
  completed: 0,
  canceled: 0,
  error: 0
})

// 检测屏幕尺寸
const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768
}

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

/** 显示更多摘要信息 */
const showMoreSummary = (item: ProcessInstanceVO) => {
  ElMessageBox.alert(
    item.summary?.map(s => `${s.key}: ${s.value}`).join('\n') || '暂无摘要信息',
    '完整摘要信息',
    {
      confirmButtonText: '确定',
      customClass: 'summary-dialog'
    }
  )
}

/** 显示更多运行节点信息 */
const showMoreTasks = (item: ProcessInstanceVO) => {
  ElMessageBox.alert(
    item.tasks?.map(task => task.name).join('\n') || '暂无运行节点信息',
    '所有运行节点',
    {
      confirmButtonText: '确定',
      customClass: 'tasks-dialog'
    }
  )
}

/** 页面激活时不再自动刷新数据
onActivated(() => {
  // 移除自动刷新，改为手动刷新
})*/

/** 初始化 */
onMounted(async () => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  await refreshAllData()
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
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
  
  /* 移动端适配 */
  @media (max-width: 768px) {
    height: calc(100vh - 80px); /* 移动端减少顶部空间 */
    
    .bpm-card-body {
      padding: 0 8px; /* 移动端减少左右padding */
    }
  }
  
  @media (max-width: 480px) {
    height: calc(100vh - 60px); /* 小屏幕进一步优化 */
    
    .bpm-card-body {
      padding: 0 4px;
    }
  }
}

/* 卡片头部样式 */
.bpm-card-header {
  .card-action {
    display: flex;
    gap: 8px;
    
    .header-btn {
      display: flex;
      align-items: center;
      
      .btn-text {
        display: inline;
      }
    }
    
    /* 移动端头部适配 */
    @media (max-width: 768px) {
      gap: 6px;
      
      .header-btn {
        padding: 8px 12px;
        
        .btn-text {
          display: none; /* 移动端隐藏按钮文字，只显示图标 */
        }
      }
    }
    
    @media (max-width: 480px) {
      .header-btn {
        padding: 6px 10px;
        min-width: 40px;
        
        .mr-5px {
          margin-right: 0 !important;
        }
      }
    }
  }
}

/* 美化状态卡片 */
.stats-dashboard {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 16px;
  
  /* 移动端适配 */
  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  
  @media (max-width: 480px) {
    gap: 8px;
  }
  
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
  
  /* 移动端搜索栏适配 */
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
    padding: 16px;
    
    .search-left {
      flex-direction: column;
      gap: 12px;
      width: 100%;
    }
    
    .search-right {
      justify-content: center;
      width: 100%;
      flex-wrap: wrap;
    }
    
    .search-input {
      width: 100%;
    }
    
    .filter-select {
      width: 100%;
    }
    
    .action-button {
      flex: 1;
      min-width: 80px;
    }
  }
  
  @media (max-width: 480px) {
    padding: 12px;
    gap: 12px;
    
    .search-left {
      gap: 10px;
    }
    
    .search-right {
      gap: 8px;
    }
    
    .action-button {
      padding: 8px 12px;
      font-size: 14px;
    }
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
  
  /* 桌面端表格显示，移动端隐藏 */
  .desktop-table {
    display: table;
  }
  
  /* 移动端卡片视图隐藏，桌面端显示 */
  .mobile-card-view {
    display: none;
  }
  
  /* 移动端适配 */
  @media (max-width: 768px) {
    .desktop-table {
      display: none;
    }
    
    .mobile-card-view {
      display: block;
      flex: 1;
      padding: 0 4px;
    }
    
    .pagination-container {
      justify-content: center;
      padding: 16px 0;
    }
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

/* 移动端卡片样式 */
.process-card {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 12px;
  margin-bottom: 16px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  
  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    transform: translateY(-2px);
  }
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    background: var(--el-fill-color-extra-light);
    border-bottom: 1px solid var(--el-border-color-lighter);
    
    .process-name {
      display: flex;
      align-items: center;
      flex: 1;
      min-width: 0;
      
      .process-icon {
        color: var(--el-color-primary);
        font-size: 18px;
        margin-right: 8px;
        flex-shrink: 0;
      }
      
      .name-text {
        font-weight: 600;
        font-size: 16px;
        color: var(--el-text-color-primary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
  }
  
  .card-content {
    padding: 16px;
    
    .summary-section {
      margin-bottom: 16px;
      
      .section-title {
        font-size: 14px;
        font-weight: 500;
        color: var(--el-text-color-regular);
        margin-bottom: 8px;
      }
      
      .summary-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        
        .summary-item-mobile {
          display: flex;
          align-items: center;
          gap: 8px;
          
          .summary-value-mobile {
            flex: 1;
            font-size: 14px;
            color: var(--el-text-color-primary);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }
        
        .more-summary-mobile {
          margin-top: 4px;
        }
      }
    }
    
    .info-section {
      .info-row {
        display: flex;
        align-items: center;
        margin-bottom: 8px;
        
        &:last-child {
          margin-bottom: 0;
        }
        
        .info-label {
          font-size: 14px;
          color: var(--el-text-color-regular);
          margin-right: 8px;
          min-width: 70px;
          flex-shrink: 0;
        }
        
        .info-value {
          font-size: 14px;
          color: var(--el-text-color-primary);
          flex: 1;
        }
      }
    }
  }
  
  .card-actions {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    padding: 12px 16px;
    background: var(--el-fill-color-extra-light);
    border-top: 1px solid var(--el-border-color-lighter);
    gap: 8px;
    flex-wrap: wrap;
    
    .el-button {
      margin: 0;
    }
    
    @media (max-width: 480px) {
      justify-content: center;
      
      .el-button {
        flex: 1;
        max-width: 80px;
      }
    }
  }
}

.mobile-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--el-text-color-placeholder);
  
  .empty-icon {
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.6;
  }
  
  p {
    font-size: 16px;
    margin: 0;
  }
}

/* 摘要对话框样式 */
:deep(.summary-dialog) {
  .el-message-box__content {
    white-space: pre-line;
    text-align: left;
    max-height: 300px;
    overflow-y: auto;
  }
}

/* 运行节点对话框样式 */
:deep(.tasks-dialog) {
  .el-message-box__content {
    white-space: pre-line;
    text-align: left;
    max-height: 300px;
    overflow-y: auto;
  }
}

/* 桌面端运行节点样式 */
.task-single {
  display: flex;
  justify-content: center;
}

.task-multiple {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  
  .more-tasks {
    font-size: 12px;
    text-align: center;
  }
}

.tasks-popover {
  max-height: 200px;
  overflow-y: auto;
}

/* 移动端运行节点样式 */
.running-tasks-mobile {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  
  .multiple-tasks-mobile {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px;
  }
}

.text-placeholder {
  color: var(--el-text-color-placeholder);
  font-style: italic;
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
