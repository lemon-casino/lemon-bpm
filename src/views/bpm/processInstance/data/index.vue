<template>
  <!-- 主卡片容器 - 包含所有内容 -->
  <div class="bpm-card">
    <!-- 卡片头部 -->
    <div class="bpm-card-header">
      <div class="card-title">
        <Icon icon="ep:list" class="title-icon" />
        <span>数据</span>
      </div>
      <div class="card-action">
        <el-button type="primary" @click="handleCreateProcess">
          <Icon icon="ep:plus" class="mr-5px" />
          发起流程
        </el-button>
        <!-- 列设置按钮 -->
        <el-dropdown @command="handleColumnCommand" trigger="click">
          <el-button type="info" plain>
            <Icon icon="ep:setting" class="mr-5px" />
            列设置
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item v-for="col in columnOptions" :key="col.prop" :command="col.prop">
                <el-checkbox v-model="col.visible" @click.stop>{{ col.label }}</el-checkbox>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <div class="bpm-card-body">
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
          <el-form-item label="发起人" prop="startUserId" style="margin-bottom: 0px">
            <el-select 
              v-model="selectedStartUsers" 
              placeholder="请选择流程发起人"
              filterable 
              clearable 
              multiple
              class="!w-240px"
              @change="handleStartUserChange"
            >
              <el-option
                v-for="user in userList"
                :key="user.id"
                :label="user.nickname"
                :value="user.id"
              />
            </el-select>
          </el-form-item>
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
          <el-button type="primary" @click="handleQuery" class="action-button"> 搜索 </el-button>
          <el-button @click="resetQuery" class="action-button"> 重置 </el-button>
          <el-button
            type="info"
            @click="showAdvancedFilter = !showAdvancedFilter"
            class="action-button"
          >
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
          @sort-change="handleSortChange"
        >
          <el-table-column
            label="流程名称"
            align="center"
            prop="name"
            min-width="180px"
            fixed="left"
            show-overflow-tooltip
            v-if="getColumnVisible('name')"
          >
            <template #default="scope">
              <div class="flex items-center">
                <Icon icon="ep:connection" class="mr-5px text-primary" />
                <span>{{ scope.row.name }}</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column
            label="摘要"
            prop="formVariablesDisplay"
            min-width="200"
            fixed="left"
            show-overflow-tooltip
            v-if="getColumnVisible('formVariablesDisplay')"
          >
            <template #default="scope">
              <div
                class="summary-container"
                v-if="scope.row.formVariablesDisplay && scope.row.formVariablesDisplay.length > 0"
              >
                <!-- 摘要内容改为横向排列 -->
                <div class="summary-row">
                  <!-- 限制最多显示1项摘要 -->
                  <div
                    v-for="(item, index) in scope.row.formVariablesDisplay.slice(0, 1)"
                    :key="index"
                    class="summary-item"
                  >
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
                      <div v-for="(item, index) in scope.row.formVariablesDisplay" :key="index" class="mb-5px">
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
            v-if="getColumnVisible('categoryName')"
          >
            <template #default="scope">
              <el-tag type="success" effect="plain" size="small">
                {{ scope.row.categoryName }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column 
            label="流程状态"
            prop="status"
            width="120"
            sortable="custom"
            v-if="getColumnVisible('status')"
          >
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
            sortable="custom"
            v-if="getColumnVisible('startTime')"
          />
          <el-table-column
            label="修改时间"
            align="center"
            prop="modifyTime"
            width="180"
            :formatter="dateFormatter"
            sortable="custom"
            v-if="getColumnVisible('modifyTime')"
          />
          <el-table-column
            label="结束时间"
            align="center"
            prop="endTime"
            width="180"
            :formatter="dateFormatter"
            sortable="custom"
            v-if="getColumnVisible('endTime')"
          />

          <!-- 操作列按钮 -->
          <el-table-column 
            label="操作" 
            align="center" 
            fixed="right" 
            width="220"
            v-if="getColumnVisible('operation')"
          >
            <template #default="scope">
              <!-- 详情按钮 - 所有状态都显示 -->
              <!-- 表单详情按钮 -->
              <el-button
                link
                type="info"
                v-hasPermi="['bpm:process-instance:query']"
                @click="handleFormDetail(scope.row)"
              >
                表单详情
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

  <!-- 表单详情抽屉 -->
  <el-drawer v-model="formDetailDrawer" title="表单详情" size="50%" :destroy-on-close="true" :close-on-click-modal="true">
    <div v-loading="formDetailLoading" element-loading-text="加载表单数据中...">
      <template v-if="formDetailForm.rule && formDetailForm.rule.length > 0">
        <form-create
          v-model="formDetailForm.value"
          v-model:api="formDetailApi"
          :option="formDetailForm.option"
          :rule="formDetailForm.rule"
          class="form-component"
        />
      </template>
      <el-empty v-else description="暂无表单数据" />
    </div>
  </el-drawer>
</template>
<script lang="ts" setup>
import { DICT_TYPE, getIntDictOptions } from '@/utils/dict'
import { dateFormatter } from '@/utils/formatTime'
import {
  getProcessInstanceByModelByCategory,
  type ProcessInstanceMyPageParams,
} from '@/api/bpm/processInstance'
import { CategoryApi, CategoryVO } from '@/api/bpm/category'
import { FormFieldFilter } from '@/components'
import FormCreate from '@form-create/element-ui'
import { setConfAndFields2 } from '@/utils/formCreate'
import { nextTick } from 'vue'
import * as UserApi from '@/api/system/user'

defineOptions({ name: 'DataModel' })

// FormCreate组件已在main.ts中全局注册

const router = useRouter() // 路由
const userList = ref<any[]>([]) // 用户列表
const loading = ref(true) // 列表的加载中
const total = ref(0) // 列表的总页数
const list = ref([]) // 列表的数据

const refreshing = ref(false) // 全局数据刷新状态
const formFieldFilterRef = ref<InstanceType<typeof FormFieldFilter> | null>(null)
const selectedStartUsers = ref([]) // 选中的发起人列表
const queryParams = reactive<ProcessInstanceMyPageParams>({
  pageNo: 1,
  pageSize: 10,
  name: undefined,
  category: 'caigou',
  startUserId: undefined,
  startUserIds: undefined,
  createTime: [],
  formFieldValue: undefined,
  formFieldsParams: undefined, // 选中的模型ID
  sortField: undefined,
  sortOrder: undefined
})
const queryFormRef = ref() // 搜索的表单
const categoryList = ref<CategoryVO[]>([]) // 流程分类列表
const showAdvancedFilter = ref(false) // 是否显示高级筛选

// 列配置选项
const columnOptions = reactive([
  { prop: 'name', label: '流程名称', visible: true },
  { prop: 'formVariablesDisplay', label: '摘要', visible: true },
  { prop: 'categoryName', label: '流程分类', visible: true },
  { prop: 'status', label: '流程状态', visible: true },
  { prop: 'startTime', label: '发起时间', visible: true },
  { prop: 'endTime', label: '结束时间', visible: true },
  { prop: 'operation', label: '操作', visible: true }
])

// 获取列是否可见
const getColumnVisible = (prop) => {
  const column = columnOptions.find(col => col.prop === prop)
  return column ? column.visible : true
}

// 处理列显示/隐藏
const handleColumnCommand = (prop) => {
  const column = columnOptions.find(col => col.prop === prop)
  if (column) {
    column.visible = !column.visible
  }
}

// 处理表格排序变更
const handleSortChange = (sort) => {
  const { prop, order } = sort
  queryParams.sortField = prop
  queryParams.sortOrder = order === 'ascending' ? 'asc' : order === 'descending' ? 'desc' : undefined
  getList()
}

// 表单详情相关
const formDetailDrawer = ref(false)
const formDetailLoading = ref(false)
const formDetailApi = ref()

const formDetailForm = ref({
  rule: [],
  option: {
    submitBtn: false,
    resetBtn: false,
    disabled: true
  },
  value: {}
})

/** 处理发起人选择变更 */
const handleStartUserChange = () => {
  // 根据选择的发起人数量，设置不同的参数
  if (!selectedStartUsers.value || selectedStartUsers.value.length === 0) {
    // 清空选择
    queryParams.startUserId = undefined
    queryParams.startUserIds = undefined
  } else if (selectedStartUsers.value.length === 1) {
    // 单选情况
    queryParams.startUserId = selectedStartUsers.value[0]
    queryParams.startUserIds = undefined
  } else {
    // 多选情况
    queryParams.startUserId = undefined
    queryParams.startUserIds = [...selectedStartUsers.value]
  }
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
      // 创建一个新的请求对象，避免修改原始queryParams
      const requestData = { ...queryParams }
      
      // 处理排序参数
      if (queryParams.sortField && queryParams.sortOrder) {
        // 确保排序参数正确传递给API
        requestData.sortBy = queryParams.sortField
        requestData.sortOrder = queryParams.sortOrder
        console.log('排序参数:', requestData.sortBy, requestData.sortOrder)
      }
      
      const response = await getProcessInstanceByModelByCategory(requestData)
      // 处理嵌套的数据结构
      const data = response.page || response
      list.value = data.list || []
      total.value = data.total || 0

      // 更新流程统计数据
  } finally {
    if (setLoading) {
      loading.value = false
    }
  }
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
  queryParams.startUserIds = undefined
  queryParams.processDefinitionKey = undefined
  queryParams.createTime = []
  queryParams.formFieldValue = undefined
  queryParams.formFieldsParams = undefined
  // 重置选中的发起人
  selectedStartUsers.value = []
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

/** 查看表单详情 */
const handleFormDetail = async (row) => {
  formDetailDrawer.value = true
  formDetailLoading.value = true
  try {

    if (row.processDefinition && row.processDefinition.formFields && row.formVariables) {
      // 使用setConfAndFields2函数处理表单数据
      formDetailForm.value.value = row.formVariables
      console.log( row.formVariables)
      setConfAndFields2(
        formDetailForm,
        row.processDefinition.formConf,
        row.processDefinition.formFields,
        row.formVariables
      )

      // 使用nextTick确保表单在数据加载后正确渲染
      nextTick().then(() => {
        // 禁用表单编辑和按钮
        if (formDetailApi.value) {
          formDetailApi.value.btn.show(false)
          formDetailApi.value.resetBtn.show(false)
          formDetailApi.value.disabled(true)
          console.log('表单详情已渲染，并设置为只读模式', formDetailForm.value)
        } else {
          console.warn('表单API未初始化，无法设置只读模式')
        }
      })
    } else {
      formDetailForm.value.rule = []
      formDetailForm.value.value = {}
    }
  } catch (error) {
    console.error('获取表单详情失败', error)
    ElMessage.error('获取表单详情失败')
  } finally {
    formDetailLoading.value = false
  }
}

/** 发起新流程 */
const handleCreateProcess = () => {
  router.push({
    name: 'BpmProcessInstanceCreate'
  })
}

/** 获取流程分类 */
const getCategoryList = async () => {
  categoryList.value = [{name: "采购", code: "caigou"},{name: "财务", code: "finance"}]
}

/** 页面激活时刷新数据 */
onActivated(() => {
  refreshAllData()
})

/** 初始化 */
onMounted(async () => {
  await refreshAllData()
  userList.value = await UserApi.getSimpleUserList()
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

  .bpm-card-header {
    padding: 16px;
    border-bottom: 1px solid var(--el-border-color-light);
    display: flex;
    justify-content: space-between;
    align-items: center;

    .card-title {
      font-size: 16px;
      font-weight: 500;
      display: flex;
      align-items: center;

      .title-icon {
        margin-right: 8px;
        font-size: 18px;
      }
    }
    
    .card-action {
      display: flex;
      gap: 8px;
      
      .el-button {
        margin-left: 0;
      }
    }
  }
  
  .bpm-card-body {
    padding-top: 0px;
    overflow-y: auto; /* 启用内部滚动 */
    flex: 1;
    display: flex;
    flex-direction: column;
  }
}

/* 列设置下拉菜单样式 */
:deep(.el-dropdown-menu) {
  max-height: 300px;
  overflow-y: auto;
  
  .el-dropdown-item {
    padding: 8px 16px;
    
    .el-checkbox {
      width: 100%;
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

/* 表单组件样式 */
.form-component {
  padding: 20px;
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
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
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
  transition:
    transform 0.3s,
    opacity 0.3s;
}

.el-zoom-in-top-enter-from,
.el-zoom-in-top-leave-to {
  opacity: 0;
  transform: scaleY(0);
  transform-origin: top;
}
</style>
