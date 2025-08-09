<template>
  <doc-alert title="流程数据管理" url="https://doc.iocoder.cn/bpm/process-instance/" />

  <!-- 主容器 - 左右布局 -->
  <div class="dbm-container">
    <!-- 左侧导航栏 - 流程分类和模型 -->
    <div class="dbm-sidebar">
      <div class="sidebar-title">
        <Icon icon="ep:connection" class="title-icon" />
        <span>流程模型</span>
      </div>
      
      <div class="sidebar-header">
        <div class="search-box">
          <el-input
            v-model="queryParams.name"
            placeholder="搜索流程模型"
            clearable
            @keyup.enter="handleModelSearch"
            class="modern-search"
          >
            <template #prefix>
              <Icon icon="ep:search" class="search-icon" />
            </template>
          </el-input>
        </div>
      </div>
      
      <div class="sidebar-content">
        <el-scrollbar class="custom-scrollbar">
          <!-- 加载指示器 -->
          <div v-if="treeLoading" class="tree-loading-state">
            <el-skeleton :rows="5" animated />
          </div>
          
          <!-- API错误提示 -->
          <div v-else-if="apiError" class="api-error-state">
            <el-result
              icon="error"
              title="加载失败"
              :sub-title="errorMessage || '数据加载过程中发生错误'"
            >
              <template #extra>
                <el-button type="primary" @click="refreshData">
                  重试
                </el-button>
              </template>
            </el-result>
          </div>
          
          <!-- 分类和流程模型树形结构 -->
          <el-tree
            v-else-if="!showEmptyTree && categoryTreeData.length > 0"
            ref="modelTreeRef"
            :data="categoryTreeData"
            :props="{ 
              label: 'name',
              children: 'modelList'
            }"
            node-key="id"
            highlight-current
            :expand-on-click-node="false"
            @node-click="handleNodeClick"
            default-expand-all
            class="modern-tree"
          >
            <template #default="{ node, data }">
              <div class="custom-tree-node">
                <!-- 分类节点 -->
                <template v-if="node.level === 1">
                  <div class="category-node" :class="{ 'is-expanded': node.expanded }">
                    <div class="category-icon">
                      <Icon icon="ep:folder-opened" v-if="node.expanded" />
                      <Icon icon="ep:folder" v-else />
                    </div>
                    <span class="node-label">{{ data.name }}</span>
                    <span class="count-badge">{{ data.modelList ? data.modelList.length : 0 }}</span>
                  </div>
                </template>
                <!-- 模型节点 -->
                <template v-else>
                  <div class="model-node">
                    <div class="model-icon">
                      <Icon icon="ep:document" />
                    </div>
                    <span class="node-label">{{ data.name }}</span>
                  </div>
                </template>
              </div>
            </template>
          </el-tree>
          
          <!-- 空数据显示 -->
          <div v-else class="empty-tree-state">
            <el-empty 
              description="暂无数据" 
              :image-size="80"
            >
              <template #description>
                <p>暂无流程分类或模型数据</p>
              </template>
              <el-button type="primary" @click="refreshData">
                <Icon icon="ep:refresh" class="mr-5px" />
                重新加载
              </el-button>
            </el-empty>
          </div>
        </el-scrollbar>
      </div>
    </div>
    
    <!-- 右侧内容区 - 流程表单数据列表 -->
    <div class="dbm-content">
      <!-- 右侧头部 -->
      <div class="content-header">
        <div class="model-info" v-if="currentModel">
          <h2>{{ currentModel.name }}</h2>
          <div class="model-meta">
            <el-tag size="small" type="info">{{ currentModel.categoryName }}</el-tag>
            <span class="meta-item">
              <Icon icon="ep:time" class="mr-5px" />
              最近更新: {{ formatDate(currentModel.createTime) }}
            </span>
            <span class="meta-item" v-if="currentModel.processDefinition">
              <Icon icon="ep:info-filled" class="mr-5px" />
              版本: v{{ currentModel.processDefinition.version }}
            </span>
          </div>
        </div>
        <div v-else class="empty-selection">
          <p>请从左侧选择一个流程模型</p>
        </div>
        
        <!-- 工具栏 -->
        <div class="content-toolbar" v-if="currentModel">
          <el-input
            v-model="queryParams.formName"
            placeholder="搜索表单内容"
            clearable
            @keyup.enter="handleFormSearch"
            class="search-input"
            prefix-icon="ep:search"
          />
          
          <el-select
            v-model="queryParams.status"
            placeholder="流程状态"
            clearable
            @change="handleFormSearch"
          >
            <el-option
              v-for="dict in getIntDictOptions(DICT_TYPE.BPM_PROCESS_INSTANCE_STATUS)"
              :key="dict.value"
              :label="dict.label"
              :value="dict.value"
            />
          </el-select>
          
          <el-date-picker
            v-model="queryParams.createTime"
            type="daterange"
            value-format="YYYY-MM-DD HH:mm:ss"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            :default-time="[new Date('1 00:00:00'), new Date('1 23:59:59')]"
            @change="handleFormSearch"
          />
          
          <el-button type="primary" @click="handleFormSearch">
            <Icon icon="ep:search" class="mr-5px" />
            搜索
          </el-button>
          <el-button @click="resetFormQuery">
            <Icon icon="ep:refresh" class="mr-5px" />
            重置
          </el-button>
          <el-button type="success" @click="handleExport" v-if="currentModel">
            <Icon icon="ep:download" class="mr-5px" />
            导出
          </el-button>
        </div>
      </div>
      
      <!-- 表单数据表格 -->
      <div class="content-body" v-if="currentModel">
        <el-table
          v-loading="loading"
          :data="formDataList"
          border
          stripe
          style="width: 100%"
          :header-cell-style="{
            background: 'var(--el-fill-color-light)',
            color: 'var(--el-text-color-primary)',
            fontWeight: 'bold'
          }"
        >
          <!-- 实例ID列 -->
          <el-table-column prop="id" label="实例ID" width="220" fixed="left">
            <template #default="scope">
              <el-link type="primary" @click="handleDetail(scope.row)" :underline="false">
                {{ scope.row.id }}
              </el-link>
            </template>
          </el-table-column>
          
          <!-- 表单名称 -->
          <el-table-column prop="name" label="流程名称" width="180" show-overflow-tooltip>
            <template #default="scope">
              <div class="flex items-center">
                <Icon icon="ep:connection" class="mr-5px text-primary" />
                <span>{{ scope.row.name }}</span>
              </div>
            </template>
          </el-table-column>
          
          <!-- 表单字段动态列 -->
          <template v-if="formFields.length > 0">
            <template v-for="field in formFields" :key="field.key">
              <el-table-column :prop="'formVariables.' + field.key" :label="field.label" show-overflow-tooltip>
                <template #default="scope">
                  <!-- 根据字段类型不同展示不同样式 -->
                  <span v-if="scope.row.formVariables && scope.row.formVariables[field.key] !== undefined">
                    {{ formatFormField(scope.row.formVariables[field.key], field.type) }}
                  </span>
                  <span v-else>-</span>
                </template>
              </el-table-column>
            </template>
          </template>
          
          <!-- 状态列 -->
          <el-table-column label="状态" prop="status" width="100">
            <template #default="scope">
              <dict-tag :type="DICT_TYPE.BPM_PROCESS_INSTANCE_STATUS" :value="scope.row.status" />
            </template>
          </el-table-column>
          
          <!-- 发起人列 -->
          <el-table-column label="发起人" prop="startUserNickname" width="120" />
          
          <!-- 发起时间列 -->
          <el-table-column
            label="发起时间"
            prop="createTime"
            width="160"
            :formatter="dateFormatter"
          />
          
          <!-- 结束时间列 -->
          <el-table-column
            label="结束时间"
            prop="endTime"
            width="160"
            :formatter="dateFormatter"
          />
          
          <!-- 操作列 -->
          <el-table-column label="操作" width="160" fixed="right">
            <template #default="scope">
              <el-button
                link
                type="primary"
                @click="handleDetail(scope.row)"
              >
                详情
              </el-button>
              <el-button
                link
                type="primary"
                v-if="scope.row.status === 1"
                @click="handleCancel(scope.row)"
              >
                取消
              </el-button>
              <el-button 
                link 
                type="primary"
                v-if="scope.row.status !== 1"
                @click="handleRestart(scope.row)"
              >
                重新发起
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        
        <!-- 表格无数据时显示 -->
        <el-empty v-if="!loading && formDataList.length === 0" description="暂无数据">
          <template #description>
            <p>暂无符合条件的流程实例数据</p>
          </template>
        </el-empty>
        
        <!-- 分页组件 -->
        <div class="pagination-container" v-if="formDataList.length > 0">
          <Pagination
            :total="total"
            v-model:page="queryParams.pageNo"
            v-model:limit="queryParams.pageSize"
            @pagination="getFormDataList"
          />
        </div>
      </div>
      
      <!-- 无数据时显示 -->
      <div class="empty-state" v-else>
        <el-empty description="请选择一个流程模型查看数据" />
      </div>
    </div>
  </div>
  
  <!-- 调试信息 - 设置v-if为true可以在页面上显示调试信息 -->
  <div v-if="false" class="debug-panel">
    <pre>{{ JSON.stringify({
      debugId,
      categoryTreeData: categoryTreeData.length,
      showEmptyTree,
      loading,
      treeLoading,
      currentModel: currentModel ? currentModel.name : null,
      formDataList: formDataList.length,
      formFields: formFields.length
    }, null, 2) }}</pre>
  </div>
</template>

<script lang="ts" setup>
import { DICT_TYPE, getIntDictOptions } from '@/utils/dict'
import { dateFormatter } from '@/utils/formatTime'
import { CategoryApi } from '@/api/bpm/category'
import * as ModelApi from '@/api/bpm/model'
import * as ProcessInstanceApi from '@/api/bpm/processInstance'
import { formatDate } from '@/utils/formatTime'
import { ElMessageBox } from 'element-plus'

defineOptions({ name: 'BpmDataManagement' })

const router = useRouter()
const message = useMessage()
const { t } = useI18n()

// 临时调试标记 - 用于强制触发日志打印
const debugId = Date.now()
console.log(`[DBM页面初始化 ${debugId}]`)

// 状态变量
const loading = ref(true) // 初始设为true以显示加载状态
const treeLoading = ref(true) // 树形结构的加载状态
const categoryTreeData = ref([])
const currentModel = ref(null)
const formDataList = ref([])
const total = ref(0)
const formFields = ref([])
const modelTreeRef = ref(null)
const showEmptyTree = ref(false) // 控制是否显示空树提示
const apiError = ref(false) // 是否API请求出错
const errorMessage = ref('') // 错误信息

// 查询参数
const queryParams = reactive({
  // 模型搜索
  name: '',
  
  // 表单数据搜索
  modelKey: undefined, // 使用模型的key作为查询参数
  formName: '',
  status: undefined,
  createTime: [],
  pageNo: 1,
  pageSize: 10
})

// 查询表单重置
const resetFormQuery = () => {
  queryParams.formName = ''
  queryParams.status = undefined
  queryParams.createTime = []
  queryParams.pageNo = 1
  handleFormSearch()
}

// 获取分类和模型数据
const getCategoryAndModelList = async () => {
  console.log(`[DBM ${debugId}] 开始获取分类和模型数据`)
  treeLoading.value = true
  showEmptyTree.value = false // 先隐藏空树提示
  apiError.value = false
  errorMessage.value = ''
  
  try {
    // 获取分类列表
    console.log(`[DBM ${debugId}] 开始获取分类列表`)
    let categoryList = []
    try {
      const categoryResponse = await CategoryApi.getCategorySimpleList()
      console.log(`[DBM ${debugId}] 分类API响应:`, categoryResponse)
      // 检查响应格式是否为包含data字段的对象(后端包装了一层)
      if (categoryResponse && typeof categoryResponse === 'object') {
        if (Array.isArray(categoryResponse)) {
          // 直接是数组
          categoryList = categoryResponse
        } else if (categoryResponse.data && Array.isArray(categoryResponse.data)) {
          // 包含data字段的对象
          categoryList = categoryResponse.data
        }
      }
    } catch (error) {
      console.error(`[DBM ${debugId}] 获取分类列表失败:`, error)
    }
    
    console.log(`[DBM ${debugId}] 处理后的分类列表:`, categoryList)
    
    if (!categoryList || !Array.isArray(categoryList) || categoryList.length === 0) {
      console.log(`[DBM ${debugId}] 没有分类数据或格式不正确`)
      showEmptyTree.value = true
      categoryTreeData.value = []
      return
    }
    
    // 获取模型列表
    console.log(`[DBM ${debugId}] 开始获取模型列表`)
    let modelList = []
    try {
      const modelResponse = await ModelApi.getModelList(queryParams.name)
      console.log(`[DBM ${debugId}] 模型API响应:`, modelResponse)
      // 检查响应格式是否为包含data字段的对象
      if (modelResponse && typeof modelResponse === 'object') {
        if (Array.isArray(modelResponse)) {
          // 直接是数组
          modelList = modelResponse
        } else if (modelResponse.data && Array.isArray(modelResponse.data)) {
          // 包含data字段的对象
          modelList = modelResponse.data
        }
      }
    } catch (error) {
      console.error(`[DBM ${debugId}] 获取模型列表失败:`, error)
    }
    
    console.log(`[DBM ${debugId}] 处理后的模型列表:`, modelList)
    
    if (!modelList || !Array.isArray(modelList) || modelList.length === 0) {
      console.log(`[DBM ${debugId}] 没有模型数据或格式不正确`)
      showEmptyTree.value = true
      categoryTreeData.value = []
      return
    }
    
    // 确保两个API都返回了数据
    console.log(`[DBM ${debugId}] 分类数量: ${categoryList.length}, 模型数量: ${modelList.length}`)
    
    // 组织数据为树形结构
    const tempTreeData = []
    
    // 创建分类ID/代码到模型的映射，以便更容易查找
    const categoryToModelsMap = {}
    
    // 先尝试所有可能的分类匹配字段，创建映射
    categoryList.forEach(category => {
      const categoryKey = category.code || category.id?.toString() || category.name
      if (categoryKey) {
        categoryToModelsMap[categoryKey] = []
      }
    })
    
    // 遍历所有模型，尝试各种方式匹配分类
    modelList.forEach(model => {
      let matched = false;
      let matchedKey = null;
      
      // 尝试通过category/categoryId/categoryName匹配
      const categoryKeys = [
        model.category,
        model.categoryName, 
        model.categoryId?.toString()
      ].filter(Boolean) // 过滤掉空值
      
      // 只匹配第一个找到的分类，防止重复添加
      for (const key of categoryKeys) {
        if (categoryToModelsMap[key] && !matched) {
          categoryToModelsMap[key].push(model);
          matched = true;
          matchedKey = key;
          break; // 添加break确保只匹配一次
        }
      }
      
      // 如果没有匹配到任何分类，添加到一个默认分类
      if (!matched && modelList.length > 0) {
        if (!categoryToModelsMap['未分类']) {
          categoryToModelsMap['未分类'] = [];
        }
        categoryToModelsMap['未分类'].push(model);
      }
    })
    
    console.log(`[DBM ${debugId}] 分类到模型的映射:`, categoryToModelsMap)
    
    // 基于映射构建树形结构
    categoryList.forEach(category => {
      const categoryKey = category.code || category.id?.toString() || category.name
      const categoryModels = categoryToModelsMap[categoryKey] || []
      
      if (categoryModels.length > 0) {
        tempTreeData.push({
          ...category,
          modelList: categoryModels
        })
      }
    })
    
    // 如果有未分类的模型，添加一个"未分类"节点
    const uncategorizedModels = categoryToModelsMap['未分类'] || []
    if (uncategorizedModels.length > 0) {
      tempTreeData.push({
        id: 'uncategorized',
        name: '未分类',
        code: 'uncategorized',
        modelList: uncategorizedModels
      })
    }
    
    console.log(`[DBM ${debugId}] 处理后的分类树数据:`, tempTreeData)
    
    // 即使没有正确匹配的分类-模型组合，也尝试显示模型
    if (tempTreeData.length === 0 && modelList.length > 0) {
      console.log(`[DBM ${debugId}] 没有匹配的分类-模型组合，创建默认分类`)
      tempTreeData.push({
        id: 'all_models',
        name: '所有模型',
        code: 'all_models',
        modelList: modelList
      })
    }
    
    if (tempTreeData.length === 0) {
      console.log(`[DBM ${debugId}] 处理后没有符合条件的树形数据`)
      showEmptyTree.value = true
      categoryTreeData.value = []
    } else {
      console.log(`[DBM ${debugId}] 设置树形结构数据，长度: ${tempTreeData.length}`)
      categoryTreeData.value = tempTreeData
      showEmptyTree.value = false // 确保有数据时不显示空状态
    }
    
  } catch (error) {
    console.error(`[DBM ${debugId}] 获取模型数据失败:`, error)
    message.error('获取模型数据失败: ' + (error.message || '未知错误'))
    showEmptyTree.value = true
    apiError.value = true
    errorMessage.value = error.message || '获取数据时发生错误'
    categoryTreeData.value = []
  } finally {
    treeLoading.value = false
    loading.value = false
    console.log(`[DBM ${debugId}] getCategoryAndModelList 完成, treeLoading=${treeLoading.value}, showEmptyTree=${showEmptyTree.value}, data长度=${categoryTreeData.value.length}`)
  }
}

// 模型搜索
const handleModelSearch = async () => {
  console.log(`[DBM ${debugId}] 执行模型搜索, 关键词: ${queryParams.name}`)
  try {
    await getCategoryAndModelList()
    // 如果有搜索关键词，展开所有节点
    if (queryParams.name && modelTreeRef.value && !showEmptyTree.value) {
      console.log(`[DBM ${debugId}] 尝试展开所有节点`)
      nextTick(() => {
        try {
          // 修复: 使用正确的方式展开节点，而不是调用expandAll
          if (modelTreeRef.value && categoryTreeData.value && modelTreeRef.value.store) {
            console.log(`[DBM ${debugId}] 尝试展开所有节点, 节点数量: ${categoryTreeData.value.length}`)
            // 手动展开所有节点
            Object.keys(modelTreeRef.value.store.nodesMap).forEach(key => {
              try {
                console.log(`[DBM ${debugId}] 展开节点: ${key}`)
                modelTreeRef.value.store.nodesMap[key].expanded = true
              } catch (nodeError) {
                console.error(`[DBM ${debugId}] 展开节点 ${key} 失败:`, nodeError)
              }
            })
          } else {
            console.log(`[DBM ${debugId}] Tree组件未准备好或没有store属性`)
          }
        } catch (error) {
          console.error(`[DBM ${debugId}] 展开节点失败:`, error)
        }
      })
    }
  } catch (error) {
    console.error(`[DBM ${debugId}] 搜索处理失败:`, error)
    message.error('搜索处理失败')
  }
}

// 点击节点处理
const handleNodeClick = (data, node) => {
  console.log(`[DBM ${debugId}] 点击节点:`, data, '级别:', node.level)
  
  // 如果点击的是分类节点，则展开/折叠该节点
  if (node.level === 1) {
    node.expanded = !node.expanded
    return
  }
  
  // 如果点击的是模型节点，加载该模型的表单数据
  try {
    currentModel.value = data
    console.log(`[DBM ${debugId}] 当前选中模型:`, currentModel.value)
    
    queryParams.modelKey = data.key
    console.log(`[DBM ${debugId}] 设置modelKey:`, queryParams.modelKey)
    
    resetFormQuery()
    getFormDataList()
    getFormFields()
  } catch (error) {
    console.error(`[DBM ${debugId}] 处理节点点击失败:`, error)
    message.error('加载模型数据失败')
  }
}

// 获取表单字段
const getFormFields = async () => {
  if (!currentModel.value) {
    console.log(`[DBM ${debugId}] 未选择模型，无法获取表单字段`)
    return
  }
  
  try {
    console.log(`[DBM ${debugId}] 尝试获取模型的表单字段, 模型ID:`, currentModel.value.id, '表单ID:', currentModel.value.formId)
    
    // 暂时使用示例字段
    formFields.value = [
      { key: 'title', label: '标题', type: 'string' },
      { key: 'content', label: '内容', type: 'string' },
      { key: 'amount', label: '金额', type: 'number' },
      { key: 'requestDate', label: '申请日期', type: 'date' },
      { key: 'department', label: '部门', type: 'string' }
    ]
    
    console.log(`[DBM ${debugId}] 设置默认表单字段:`, formFields.value)
  } catch (error) {
    console.error(`[DBM ${debugId}] 获取表单字段失败:`, error)
    message.error('获取表单字段失败')
  }
}

// 获取表单数据列表
const getFormDataList = async () => {
  if (!queryParams.modelKey) {
    console.log(`[DBM ${debugId}] 未设置modelKey，无法查询表单数据`)
    return
  }
  
  loading.value = true
  formDataList.value = [] // 清空之前的数据
  
  try {
    // 构建查询参数
    const params = {
      pageNo: queryParams.pageNo,
      pageSize: queryParams.pageSize,
      processDefinitionKey: queryParams.modelKey, // 使用模型key查询
      name: queryParams.formName,
      status: queryParams.status,
      createTime: queryParams.createTime && queryParams.createTime.length === 2 ? queryParams.createTime : undefined
    }
    
    console.log(`[DBM ${debugId}] 查询流程实例参数:`, params)
    
    // 调用API获取数据
    const data = await ProcessInstanceApi.getProcessInstancePage(params)
    console.log(`[DBM ${debugId}] 获取到的流程实例数据:`, data)
    
    if (data && typeof data === 'object') {
      let listData = []
      let totalCount = 0
      
      if (Array.isArray(data)) {
        // 直接是数组
        listData = data
        totalCount = data.length
      } else if (data.list && Array.isArray(data.list)) {
        // 包含list字段的对象
        listData = data.list
        totalCount = data.total || data.list.length
      } else if (data.data) {
        // 嵌套在data字段中
        if (Array.isArray(data.data)) {
          listData = data.data
          totalCount = data.data.length
        } else if (data.data.list && Array.isArray(data.data.list)) {
          listData = data.data.list
          totalCount = data.data.total || data.data.list.length
        }
      }
      
      formDataList.value = listData
      total.value = totalCount
      
      console.log(`[DBM ${debugId}] 处理后的表单数据:`, formDataList.value)
      
      // 如果是首次加载且有数据，尝试提取表单字段
      if (formDataList.value.length > 0 && formFields.value.length === 0) {
        const firstRecord = formDataList.value[0]
        console.log(`[DBM ${debugId}] 首条记录数据:`, firstRecord)
        
        if (firstRecord.formVariables) {
          console.log(`[DBM ${debugId}] 从表单变量中提取字段:`, firstRecord.formVariables)
          formFields.value = Object.keys(firstRecord.formVariables).map(key => ({
            key,
            label: key, // 可以在这里进行字段名称美化
            type: typeof firstRecord.formVariables[key]
          }))
          
          console.log(`[DBM ${debugId}] 从数据中提取的表单字段:`, formFields.value)
        } else {
          console.log(`[DBM ${debugId}] 记录中无表单变量数据`)
        }
      }
    } else {
      console.log(`[DBM ${debugId}] API返回数据格式不正确或为空`)
      formDataList.value = []
      total.value = 0
    }
  } catch (error) {
    console.error(`[DBM ${debugId}] 获取表单数据失败:`, error)
    message.error('获取表单数据失败: ' + (error.message || '未知错误'))
    formDataList.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

// 表单数据搜索
const handleFormSearch = () => {
  console.log(`[DBM ${debugId}] 执行表单搜索`)
  queryParams.pageNo = 1
  getFormDataList()
}

// 格式化表单字段显示
const formatFormField = (value, type) => {
  if (value === null || value === undefined) return '-'
  
  try {
    switch (type) {
      case 'date':
      case 'object': // 对象可能是日期类型
        if (typeof value === 'number') {
          return formatDate(value)
        }
        return String(value)
      case 'number':
        return Number(value).toLocaleString()
      case 'boolean':
        return value ? '是' : '否'
      default:
        return String(value)
    }
  } catch (error) {
    console.error(`[DBM ${debugId}] 格式化字段失败:`, error, value, type)
    return String(value)
  }
}

// 处理导出
const handleExport = () => {
  message.success('数据导出功能开发中')
}

// 查看详情
const handleDetail = (row) => {
  console.log(`[DBM ${debugId}] 查看详情:`, row)
  router.push({
    name: 'BpmProcessInstanceDetail',
    query: {
      id: row.id
    }
  })
}

// 取消流程
const handleCancel = async (row) => {
  console.log(`[DBM ${debugId}] 尝试取消流程:`, row)
  try {
    const { value } = await ElMessageBox.prompt('请输入取消原因', '取消流程', {
      confirmButtonText: t('common.ok'),
      cancelButtonText: t('common.cancel'),
      inputPattern: /^[\s\S]*.*\S[\s\S]*$/,
      inputErrorMessage: '取消原因不能为空'
    })
    
    console.log(`[DBM ${debugId}] 取消流程，原因:`, value)
    await ProcessInstanceApi.cancelProcessInstanceByStartUser(row.id, value)
    message.success('取消流程成功')
    getFormDataList()
  } catch (error) {
    // 用户取消操作或API错误
    if (error?.message) {
      console.error(`[DBM ${debugId}] 取消流程失败:`, error)
    }
  }
}

// 重新发起流程
const handleRestart = (row) => {
  console.log(`[DBM ${debugId}] 重新发起流程:`, row)
  router.push({
    name: 'BpmProcessInstanceCreate',
    query: {
      processInstanceId: row.id
    }
  })
}

// 手动刷新数据
const refreshData = () => {
  console.log(`[DBM ${debugId}] 手动刷新数据`)
  getCategoryAndModelList()
}

// 直接输出到控制台，确保初始化完成
console.log(`[DBM ${debugId}] 组件脚本已执行完毕，等待onMounted触发`)

// 初始化
onMounted(() => {
  console.log(`[DBM ${debugId}] onMounted 触发，开始初始化数据`)
  // 使用 nextTick 确保DOM已经更新
  nextTick(() => {
    console.log(`[DBM ${debugId}] nextTick 触发，开始获取分类和模型数据`)
    getCategoryAndModelList()
  })
})

console.log(`[DBM ${debugId}] 脚本结束`)
</script>

<style lang="scss" scoped>
.dbm-container {
  display: flex;
  height: calc(100vh - 120px);
  background-color: var(--el-bg-color);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  
  /* 左侧导航样式 */
  .dbm-sidebar {
    width: 280px;
    border-right: 1px solid var(--el-border-color-light);
    display: flex;
    flex-direction: column;
    background-color: var(--el-bg-color-overlay);
    box-shadow: inset -2px 0 4px rgba(0, 0, 0, 0.03);
    position: relative;
    transition: all 0.3s ease;
    
    .sidebar-title {
      padding: 16px 20px;
      border-bottom: 1px solid var(--el-border-color-lighter);
      display: flex;
      align-items: center;
      background: linear-gradient(to right, var(--el-color-primary-light-9), var(--el-bg-color));
      
      .title-icon {
        font-size: 18px;
        color: var(--el-color-primary);
        margin-right: 10px;
      }
      
      span {
        font-size: 16px;
        font-weight: 600;
        color: var(--el-text-color-primary);
        letter-spacing: 0.01em;
      }
    }
    
    .sidebar-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--el-border-color-lighter);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
      position: relative;
      z-index: 2;
      
      .search-box {
        .el-input {
          font-size: 14px;
          
          &.modern-search {
            .el-input__wrapper {
              border-radius: 20px;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
              transition: all 0.3s;
              padding-left: 12px;
              
              &:hover {
                box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
              }
              
              &:focus-within {
                box-shadow: 0 2px 12px rgba(var(--el-color-primary-rgb), 0.2);
              }
            }
            
            .search-icon {
              font-size: 16px;
              color: var(--el-text-color-secondary);
              margin-right: 8px;
            }
            
            .el-input__inner {
              font-weight: 500;
              letter-spacing: 0.01em;
            }
          }
        }
      }
    }
    
    .sidebar-content {
      flex: 1;
      overflow: hidden;
      padding: 12px 0;
      
      :deep(.el-scrollbar__wrap) {
        overflow-x: hidden;
      }
      
      .custom-scrollbar {
        height: 100%;
      }
      
      .tree-loading-state,
      .api-error-state,
      .empty-tree-state {
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 20px;
      }
      
      .tree-loading-state {
        padding: 20px;
        width: 100%;
      }
      
      .modern-tree {
        --node-hover-bg: var(--el-color-primary-light-9);
        --node-active-bg: var(--el-color-primary-light-8);
        
        :deep(.el-tree-node) {
          position: relative;
          
          &.is-current {
            > .el-tree-node__content {
              background-color: var(--node-active-bg);
              
              &:hover {
                background-color: var(--node-active-bg);
              }
            }
          }
          
          .el-tree-node__content {
            height: auto;
            padding: 4px 0;
            transition: all 0.2s;
            border-radius: 4px;
            margin: 0 8px;
            
            &:hover {
              background-color: var(--node-hover-bg);
            }
          }
        }
      }
      
      .custom-tree-node {
        width: 100%;
        display: flex;
        align-items: center;
        
        .category-node, .model-node {
          display: flex;
          align-items: center;
          width: 100%;
          padding: 8px 6px 8px 0;
          border-radius: 4px;
          transition: all 0.3s;
          
          .node-label {
            transition: all 0.2s;
            font-size: 14px;
            color: var(--el-text-color-primary);
            flex: 1;
          }
          
          &:hover .node-label {
            color: var(--el-color-primary);
          }
          
          .count-badge {
            margin-left: auto;
            background-color: var(--el-color-primary-light-8);
            color: var(--el-color-primary-dark-2);
            padding: 1px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
            transition: all 0.3s;
          }
        }
        
        .category-node {
          font-weight: 600;
          
          .category-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            margin-right: 8px;
            border-radius: 6px;
            background-color: var(--el-color-primary-light-8);
            color: var(--el-color-primary);
            transition: all 0.3s;
          }
          
          &.is-expanded {
            .category-icon {
              background-color: var(--el-color-primary-light-5);
              color: var(--el-color-white);
            }
          }
          
          &:hover .category-icon {
            background-color: var(--el-color-primary-light-5);
            color: var(--el-color-white);
            transform: scale(1.05);
          }
        }
        
        .model-node {
          padding-left: 8px;
          
          .model-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
            margin-right: 8px;
            border-radius: 6px;
            background-color: var(--el-color-info-light-8);
            color: var(--el-color-info-dark-2);
            transition: all 0.3s;
          }
          
          &:hover .model-icon {
            background-color: var(--el-color-primary-light-7);
            color: var(--el-color-primary);
            transform: scale(1.05);
          }
        }
      }
    }
  }
  
  /* 右侧内容区样式 */
  .dbm-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background-color: var(--el-bg-color);
    
    .content-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--el-border-color-light);
      
      .model-info {
        margin-bottom: 16px;
        
        h2 {
          margin: 0 0 8px 0;
          font-size: 18px;
          font-weight: 600;
        }
        
        .model-meta {
          display: flex;
          align-items: center;
          gap: 12px;
          color: var(--el-text-color-secondary);
          font-size: 13px;
          
          .meta-item {
            display: flex;
            align-items: center;
          }
        }
      }
      
      .empty-selection {
        height: 50px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--el-text-color-secondary);
      }
      
      .content-toolbar {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        
        .search-input {
          width: 220px;
        }
        
        .el-select, .el-date-picker {
          width: 200px;
        }
      }
    }
    
    .content-body {
      flex: 1;
      padding: 16px 20px;
      overflow: auto;
      display: flex;
      flex-direction: column;
      
      .el-table {
        flex: 1;
      }
      
      .el-empty {
        margin: auto;
      }
      
      .pagination-container {
        margin-top: 16px;
        display: flex;
        justify-content: flex-end;
      }
    }
    
    .empty-state {
      flex: 1;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 40px;
    }
  }
}

/* 调试面板 */
.debug-panel {
  position: fixed;
  bottom: 0;
  right: 0;
  background-color: rgba(0, 0, 0, 0.8);
  color: #fff;
  padding: 10px;
  max-width: 400px;
  max-height: 300px;
  overflow: auto;
  z-index: 9999;
  font-size: 12px;
  
  pre {
    margin: 0;
  }
}

/* 响应式调整 */
@media (max-width: 1200px) {
  .dbm-container {
    .dbm-sidebar {
      width: 240px;
    }
    
    .dbm-content {
      .content-header {
        .content-toolbar {
          .search-input, .el-select, .el-date-picker {
            width: 180px;
          }
        }
      }
    }
  }
}

@media (max-width: 768px) {
  .dbm-container {
    flex-direction: column;
    
    .dbm-sidebar {
      width: 100%;
      height: 300px;
      border-right: none;
      border-bottom: 1px solid var(--el-border-color-light);
    }
  }
}
</style> 
