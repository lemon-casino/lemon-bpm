<template>
  <div class="form-field-filter" :class="{ 'vertical-layout': props.layoutMode === 'vertical', 'inline-basic': props.inlineBasicSearch }">
    <!-- 筛选区域 -->
    <div class="filter-container">
      <!-- 基础搜索区域 -->
      <el-row :gutter="8" class="basic-search">

        <!-- 发起人选择器 - 仅在showStartUser为true时显示 -->
        <el-col v-if="props.showStartUser" :xs="24" :sm="12" :md="6" :lg="6" :xl="4">
          <el-select
            v-model="startUserId"
            clearable
            filterable
            :placeholder="props.startUserPlaceholder"
            class=" w-full"
            @change="handleStartUserChange"
          >
            <template #prefix>
              <el-icon><User /></el-icon>
            </template>
            <el-option
              v-for="user in userList"
              :key="user.id"
              :label="user.nickname"
              :value="user.id"
            />
          </el-select>
        </el-col>

        <!-- 移动端友好的日期选择器 - 仅在showDateRange为true时显示 -->
        <template v-if="props.showDateRange">
          <!-- 桌面端：使用日期范围选择器 -->
          <el-col v-if="!isMobileDevice" :xs="24" :sm="24" :md="12" :lg="6" :xl="8">
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              value-format="YYYY-MM-DD HH:mm:ss"
              :start-placeholder="props.startDatePlaceholder"
              :end-placeholder="props.endDatePlaceholder"
              class="date-picker w-full"
              :default-time="[new Date('1 00:00:00'), new Date('1 23:59:59')]"
              @change="handleDateRangeChange"
            />
          </el-col>
          
          <!-- 移动端：使用分离的开始和结束日期选择器 -->
          <template v-else>
            <el-col :xs="24" :sm="12" :md="6" :lg="3" :xl="4">
              <el-date-picker
                v-model="startDate"
                type="date"
                value-format="YYYY-MM-DD"
                :placeholder="props.startDatePlaceholder"
                class="mobile-date-picker w-full"
                @change="handleMobileDateChange"
              />
            </el-col>
            <el-col :xs="24" :sm="12" :md="6" :lg="3" :xl="4">
              <el-date-picker
                v-model="endDate"
                type="date"
                value-format="YYYY-MM-DD"
                :placeholder="props.endDatePlaceholder"
                class="mobile-date-picker w-full"
                @change="handleMobileDateChange"
              />
            </el-col>
          </template>
        </template>


        <el-col :xs="24" :sm="12" :md="6" :lg="6" :xl="4">
          <el-input
            v-model="formFieldValue"
            :placeholder="props.valuePlaceholder"
            clearable
            class="w-full"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>

        <el-col :xs="24" :sm="12" :md="6" :lg="6" :xl="4">
          <el-select
            v-model="modelId"
            clearable
            filterable
            :placeholder="props.modelPlaceholder"
            class="model-select w-full"
            @change="handleModelChange"
          >
            <template #prefix>
              <el-icon><Document /></el-icon>
            </template>
            <el-option
              v-for="model in modelList"
              :key="model.id"
              :label="model.suspensionState === 1 ? `${model.name} - 启用中` : model.suspensionState === 2 ? `${model.name} - 已停用` : model.name"
              :value="model.id"
            />
          </el-select>
        </el-col>

      </el-row>

      <!-- 高级筛选区域 -->
      <div v-if="modelId && formFields.length > 0" class="advanced-filter">
        <div class="filter-header">
          <span class="filter-title">筛选</span>
          <el-button v-if="conditions.length > 0" type="primary" link @click="resetFields">清空筛选</el-button>
        </div>
        
        <!-- 已添加的条件展示 -->
        <div v-if="conditions.length > 0" class="conditions-container">
          <el-tag 
            v-for="(condition, index) in conditions" 
            :key="index"
            closable
            @close="removeCondition(index)"
            class="condition-tag"
          >
            {{ getConditionDisplay(condition) }}
          </el-tag>
        </div>
        
        <!-- 添加筛选条件行 -->
        <el-row :gutter="8" class="filter-row">
          <!-- 规则选择 (原条件) -->
          <el-col :xs="24" :sm="6" :md="4" :lg="3" :xl="2">
            <el-select
              v-model="conditionType"
              clearable
              placeholder="规则"
              class="w-full"
            >
              <el-option label="且" value="and" />
              <el-option label="或" value="or" />
            </el-select>
          </el-col>
          
          <!-- 表单字段选择 -->
          <el-col :xs="24" :sm="8" :md="6" :lg="5" :xl="4">
            <el-select
              v-model="selectedField"
              clearable
              filterable
              placeholder="选择字段"
              class="w-full"
              @change="handleFieldChange"
            >
              <el-option
                v-for="field in formFields"
                :key="field.field"
                :label="field.title"
                :value="field.field"
              />
            </el-select>
          </el-col>
          
          <!-- 操作符选择 -->
          <el-col :xs="24" :sm="6" :md="4" :lg="3" :xl="2">
            <el-select
              v-model="selectedOperator"
              placeholder="操作符"
              class="w-full"
              @change="handleOperatorChange"
            >
              <el-option label="匹配" value="equals" />
              <el-option label="为空" value="isEmpty" />
              <el-option label="不为空" value="notEmpty" />
            </el-select>
          </el-col>
          
          <!-- 字段值选择/输入 -->
          <el-col :xs="24" :sm="8" :md="6" :lg="5" :xl="4" v-if="selectedOperator === 'equals'">
            <!-- 根据字段类型显示不同的输入控件 -->
            <template v-if="selectedFieldInfo">
              <!-- 多选框类型 -->
              <el-select
                v-if="selectedFieldInfo.type === 'checkbox' || selectedFieldInfo.type === 'select'"
                v-model="fieldValue"
                clearable
                filterable
                placeholder="请选择"
                class="w-full"
                @change="handleValueChange"
              >
                <el-option
                  filterable
                  v-for="option in selectedFieldInfo.options"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
              
              <!-- 开关类型 -->
              <el-select
                v-else-if="selectedFieldInfo.type === 'switch'"
                v-model="fieldValue"
                clearable
                filterable
                placeholder="请选择"
                class="w-full"
                @change="handleValueChange"
              >
                <el-option label="是" :value="true" />
                <el-option label="否" :value="false" />
              </el-select>
              
              <!-- 用户选择类型 -->
              <el-select
                v-else-if="selectedFieldInfo.type === 'userSelect'"
                v-model="fieldValue"
                clearable
                filterable
                placeholder="请选择用户"
                class="w-full"
                @change="handleValueChange"
              >
                <el-option
                  v-for="user in userList"
                  :key="user.id"
                  :label="user.nickname"
                  :value="user.id"
                />
              </el-select>
              
              <!-- 默认输入框 -->
              <el-input
                v-else
                v-model="fieldValue"
                clearable
                placeholder="请输入"
                class="w-full"
                @change="handleValueChange"
              />
            </template>
            <el-input v-else disabled placeholder="请先选择字段" class="w-full" />
          </el-col>
          
          <!-- 为空/不为空时不显示值输入框，添加一个占位元素保持布局 -->
          <el-col :xs="24" :sm="8" :md="6" :lg="5" :xl="4" v-else>
            <div class="empty-value-placeholder"></div>
          </el-col>
          
          <el-col :xs="24" :sm="2" :md="2" :lg="2" :xl="2">
            <el-button 
              type="primary" 
              size="small" 
              class="add-btn w-full" 
              @click="addCondition"
              :disabled="!canAddCondition"
            >
              添加
            </el-button>
          </el-col>
        </el-row>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch, onMounted, computed } from 'vue'
import { getModelVersionList } from '@/api/bpm/model'
import { getFormFields } from '@/api/bpm/definition'
import { getSimpleUserList } from '@/api/system/user'
import { Search, Document, User } from '@element-plus/icons-vue'

defineOptions({ name: 'BpmFormFieldFilter' })

interface FormField {
  type: string
  field: string
  title: string
  options?: { label: string, value: string | number | boolean }[]
  [key: string]: any
}

interface Condition {
  field: string
  fieldTitle: string
  type: string
  value: any
  conditionType: 'and' | 'or'
  operator?: 'equals' | 'isEmpty' | 'notEmpty' // 操作符：等于、为空、不为空
}

const props = defineProps({
  // 初始值
  initialModelId: {
    type: String,
    default: undefined
  },
  initialFormFieldValue: {
    type: String,
    default: ''
  },
  // 占位符
  modelPlaceholder: {
    type: String,
    default: '流程模型'
  },
  valuePlaceholder: {
    type: String,
    default: '模糊搜索'
  },
  // 布局模式: 'inline'(水平内联) 或 'vertical'(垂直堆叠)
  layoutMode: {
    type: String,
    default: 'inline',
    validator: (value: string) => ['inline', 'vertical'].includes(value)
  },
  // 是否将基础搜索区域与父组件中的其他筛选字段内联显示
  inlineBasicSearch: {
    type: Boolean,
    default: false
  },
  // 是否显示发起人选择器
  showStartUser: {
    type: Boolean,
    default: false
  },
  // 是否显示日期范围选择器
  showDateRange: {
    type: Boolean,
    default: false
  },
  // 发起人选择器占位符
  startUserPlaceholder: {
    type: String,
    default: '发起人'
  },
  // 日期选择器占位符
  startDatePlaceholder: {
    type: String,
    default: '开始日期'
  },
  endDatePlaceholder: {
    type: String,
    default: '结束日期'
  },
  // 初始发起人ID
  initialStartUserId: {
    type: [String, Number],
    default: undefined
  },
  // 初始日期范围
  initialDateRange: {
    type: Array,
    default: () => []
  },
  // 调试模式
  debug: {
    type: Boolean,
    default: false
  }
})

// 向父组件暴露的事件
const emit = defineEmits([
  'update:modelId', 
  'update:formFieldValue', 
  'update:formFieldsParams', 
  'update:startUserId',
  'update:dateRange',
  'change'
])

// 数据模型
const modelId = ref<string | undefined>(props.initialModelId)
const formFieldValue = ref<string>(props.initialFormFieldValue)
const startUserId = ref<string | number | undefined>(props.initialStartUserId)
const dateRange = ref<any[]>(props.initialDateRange || [])
// 移动端分离的日期选择器
const startDate = ref<string>('')
const endDate = ref<string>('')
const modelList = ref<any[]>([])
const formFields = ref<FormField[]>([])
const selectedField = ref<string>('')
const selectedFieldInfo = ref<FormField | null>(null)
const conditionType = ref<'and' | 'or'>('and')
const selectedOperator = ref<'equals' | 'isEmpty' | 'notEmpty'>('equals') // 默认为等于
const fieldValue = ref<any>(null)
const conditions = ref<Condition[]>([])
const userList = ref<any[]>([])

// 移动设备检测
const isMobileDevice = computed(() => {
  if (typeof window !== 'undefined') {
    return window.innerWidth <= 768
  }
  return false
})

// 计算属性：是否可以添加条件
const canAddCondition = computed(() => {
  // 当操作符为"为空"或"不为空"时，只需要选择字段即可
  if (selectedOperator.value === 'isEmpty' || selectedOperator.value === 'notEmpty') {
    return selectedField.value !== ''
  }
  // 否则需要同时有字段和值
  return selectedField.value && fieldValue.value !== null && fieldValue.value !== ''
})

// 计算属性：表单字段参数
const formFieldsParams = computed(() => {
  if (conditions.value.length === 0) return []
  
  // 按条件类型分组
  const andConditions: Record<string, any> = {}
  const orConditions: Record<string, any> = {}
  
  conditions.value.forEach(condition => {
    // 根据操作符设置不同的值
    let conditionValue = condition.value
    if (condition.operator === 'isEmpty') {
      conditionValue = 'isEmpty'
    } else if (condition.operator === 'notEmpty') {
      conditionValue = 'notEmpty'
    }
    
    if (condition.conditionType === 'and') {
      andConditions[condition.field] = conditionValue
    } else {
      orConditions[condition.field] = conditionValue
    }
  })
  
  const result: Array<{and?: Record<string, any>, or?: Record<string, any>}> = []
  
  if (Object.keys(andConditions).length > 0) {
    result.push({ and: andConditions })
  }
  
  if (Object.keys(orConditions).length > 0) {
    result.push({ or: orConditions })
  }
  
  return result
})

/** 获取模型版本列表 */
const getModelList = async () => {
  // 如果已经加载过模型列表，且列表不为空，则不再重复加载
  if (modelList.value.length > 0) {
    if (props.debug) {
      console.log('模型列表已加载，跳过请求')
    }
    return
  }
  
  try {
    if (props.debug) {
      console.log('开始获取模型列表...')
    }
    const res = await getModelVersionList({ needVersion: false })
    if (res) {
      modelList.value = res
      if (props.debug) {
        console.log('模型列表数据:', res)
      }
    } else {
      console.warn('模型列表数据为空或格式不正确')
    }
  } catch (error) {
    console.error('获取模型列表失败:', error)
  }
}

/** 获取表单字段列表 */
const fetchFormFields = async () => {
  if (!modelId.value) {
    formFields.value = []
    return
  }
  
  try {
    if (props.debug) {
      console.log('开始获取表单字段...')
    }
    const res = await getFormFields(modelId.value)
    if (res ) {
      // 解析返回的表单字段数据
      formFields.value = res.map((fieldJson: string) => {
        try {
          return JSON.parse(fieldJson)
        } catch (e) {
          console.error('解析表单字段JSON失败:', e)
          return null
        }
      }).filter(Boolean)
      
      if (props.debug) {
        console.log('表单字段数据:', formFields.value)
      }
    } else {
      console.warn('表单字段数据为空或格式不正确')
      formFields.value = []
    }
  } catch (error) {
    console.error('获取表单字段失败:', error)
    formFields.value = []
  }
}

/** 获取用户列表 */
const fetchUserList = async () => {
  try {
    userList.value = await getSimpleUserList()
    if (props.debug) {
      console.log('用户列表数据:', userList.value)
    }
  } catch (error) {
    console.error('获取用户列表失败:', error)
    userList.value = []
  }
}

// 处理模型变更
const handleModelChange = async () => {
  selectedField.value = ''
  selectedFieldInfo.value = null
  fieldValue.value = null
  conditions.value = []
  
  if (modelId.value) {
    await fetchFormFields()
  }
  
  emitChange()
}

// 处理字段变更
const handleFieldChange = () => {
  fieldValue.value = null
  // 重置操作符为默认值
  selectedOperator.value = 'equals'
  
  if (selectedField.value) {
    selectedFieldInfo.value = formFields.value.find(field => field.field === selectedField.value) || null
    
    // 如果是用户选择类型，加载用户列表
    if (selectedFieldInfo.value?.type === 'userSelect' && userList.value.length === 0) {
      fetchUserList()
    }
  } else {
    selectedFieldInfo.value = null
  }
}

// 处理值变更
const handleValueChange = () => {
  // 可以在这里添加额外的值处理逻辑
}

// 处理操作符变更
const handleOperatorChange = () => {
  // 当操作符为"为空"或"不为空"时，清空字段值
  if (selectedOperator.value === 'isEmpty' || selectedOperator.value === 'notEmpty') {
    fieldValue.value = null
  }
}

// 添加条件
const addCondition = () => {
  // 当操作符为"为空"或"不为空"时，只需要选择字段
  // 否则需要同时有字段和值
  if (!selectedField.value || 
      (selectedOperator.value === 'equals' && (fieldValue.value === null || fieldValue.value === ''))) {
    return
  }
  
  const fieldInfo = formFields.value.find(field => field.field === selectedField.value)
  if (!fieldInfo) return
  
  // 添加条件前，如果有模糊搜索内容，先清空
  if (formFieldValue.value) {
    formFieldValue.value = ''
  }
  
  // 根据操作符设置值
  let value = fieldValue.value
  if (selectedOperator.value === 'isEmpty' || selectedOperator.value === 'notEmpty') {
    // 为空或不为空操作符不需要具体值
    value = null
  }
  
  conditions.value.push({
    field: selectedField.value,
    fieldTitle: fieldInfo.title,
    type: fieldInfo.type,
    value: value,
    conditionType: conditionType.value,
    operator: selectedOperator.value
  })
  
  // 重置选择
  selectedField.value = ''
  selectedFieldInfo.value = null
  fieldValue.value = null
  selectedOperator.value = 'equals' // 重置为默认操作符
  
  emitChange()
}

// 移除条件
const removeCondition = (index: number) => {
  conditions.value.splice(index, 1)
  emitChange()
}

// 获取条件显示文本
const getConditionDisplay = (condition: Condition) => {
  const conditionText = condition.conditionType === 'and' ? '且' : '或'
  
  // 处理特殊操作符
  if (condition.operator === 'isEmpty') {
    return ` ${conditionText} ${condition.fieldTitle} 为空`
  } else if (condition.operator === 'notEmpty') {
    return ` ${conditionText} ${condition.fieldTitle} 不为空`
  }
  
  // 处理普通值显示
  let valueDisplay = condition.value
  
  // 根据字段类型格式化值显示
  if (condition.type === 'checkbox' || condition.type === 'select') {
    const field = formFields.value.find(f => f.field === condition.field)
    if (field && field.options) {
      const option = field.options.find(opt => opt.value === condition.value)
      if (option) {
        valueDisplay = option.label
      }
    }
  } else if (condition.type === 'switch') {
    valueDisplay = condition.value ? '是' : '否'
  } else if (condition.type === 'userSelect') {
    const user = userList.value.find(u => u.id === condition.value)
    if (user) {
      valueDisplay = user.nickname
    }
  }
  
  return ` ${conditionText} ${condition.fieldTitle} 匹配 ${valueDisplay}`
}

// 删除这里的第一个emitChange函数

// 监听表单字段值变化
watch(
  () => formFieldValue.value,
  (newVal, oldVal) => {
    if (props.debug) {
      console.log('表单字段值变化:', oldVal, '->', newVal)
    }

    // 避免重复处理相同的值
    if (newVal === oldVal) {
      return
    }

    // 当模糊搜索有内容时，清空流程模型及其他相关内容
    if (newVal && newVal.trim() !== '') {
      // 清空流程模型
      modelId.value = undefined
      // 清空表单字段
      formFields.value = []
      // 清空已添加的条件
      conditions.value = []
      // 重置选择状态
      selectedField.value = ''
      selectedFieldInfo.value = null
      fieldValue.value = null
    }

    emitChange()
  }
)

// 监听props变化
watch(
  () => props.initialModelId,
  (newVal) => {
    if (newVal !== modelId.value) {
      modelId.value = newVal
      if (newVal) {
        fetchFormFields()
      }
    }
  }
)

watch(
  () => props.initialFormFieldValue,
  (newVal) => {
    if (newVal !== formFieldValue.value) {
      formFieldValue.value = newVal
    }
  }
)

// 监听表单字段参数变化
watch(
  () => formFieldsParams.value,
  (newVal) => {
    if (props.debug) {
      console.log('表单字段参数变化:', newVal)
    }
    
    // 当有表单字段参数时，清空模糊搜索内容
    if (newVal && newVal.length > 0 && formFieldValue.value) {
      formFieldValue.value = ''
      // 不需要调用emitChange，因为formFieldValue的变化会触发它自己的watch
    }
  }
)

/** 处理发起人变更 */
const handleStartUserChange = () => {
  emit('update:startUserId', startUserId.value)
  emitChange()
}

/** 处理日期范围变更 */
const handleDateRangeChange = () => {
  emit('update:dateRange', dateRange.value)
  emitChange()
}

/** 处理移动端日期变更 */
const handleMobileDateChange = () => {
  // 将分离的开始和结束日期合并为日期范围
  if (startDate.value && endDate.value) {
    dateRange.value = [
      `${startDate.value} 00:00:00`,
      `${endDate.value} 23:59:59`
    ]
  } else if (startDate.value) {
    dateRange.value = [
      `${startDate.value} 00:00:00`,
      `${startDate.value} 23:59:59`
    ]
  } else if (endDate.value) {
    dateRange.value = [
      `${endDate.value} 00:00:00`,
      `${endDate.value} 23:59:59`
    ]
  } else {
    dateRange.value = []
  }
  
  emit('update:dateRange', dateRange.value)
  emitChange()
}

/** 发送变更事件 */
const emitChange = () => {
  // 更新modelId
  emit('update:modelId', modelId.value)
  
  // 更新表单字段值
  emit('update:formFieldValue', formFieldValue.value)
  
  // 更新表单字段参数
  emit('update:formFieldsParams', formFieldsParams.value.length > 0 ? formFieldsParams.value : undefined)
  
  // 发送综合变更事件
  emit('change', {
    modelId: modelId.value,
    formFieldValue: formFieldValue.value,
    formFieldsParams: formFieldsParams.value.length > 0 ? formFieldsParams.value : undefined,
    startUserId: startUserId.value,
    dateRange: dateRange.value
  })
}

/** 重置所有字段 */
const resetFields = () => {
  modelId.value = undefined
  formFieldValue.value = ''
  selectedField.value = ''
  selectedFieldInfo.value = null
  fieldValue.value = null
  conditions.value = []
  startUserId.value = undefined
  dateRange.value = []
  // 重置移动端日期字段
  startDate.value = ''
  endDate.value = ''
  
  emitChange()
}

// 初始化
onMounted(async () => {
  // 加载模型列表
  await getModelList()
  await  fetchUserList()
  // 如果有初始模型ID，加载表单字段
  if (modelId.value) {
    await fetchFormFields()
  }
  
  // 初始化移动端日期字段
  if (dateRange.value && dateRange.value.length === 2) {
    startDate.value = dateRange.value[0].split(' ')[0]
    endDate.value = dateRange.value[1].split(' ')[0]
  }
})

// 向父组件暴露方法，使用上面定义的resetFields函数
defineExpose({
  resetFields,  // 直接引用上面定义的函数
  setModelId: (id: string) => {
    modelId.value = id
    fetchFormFields()
  },
  getFormFieldsParams: () => formFieldsParams.value
})
</script>

<style lang="scss" scoped>
.form-field-filter {
  width: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.filter-container {
  background-color: #fff;
  border-radius: 4px;
  padding: 12px;
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.filter-title {
  font-size: 14px;
  font-weight: 500;
  color: #606266;
}

/* 内联基础搜索样式 */
.inline-basic {
  .advanced-filter {
    border-top: 1px solid var(--el-border-color-lighter);
    margin-top: 8px;
    padding-top: 8px;
  }
}

/* 添加筛选条件行样式 */
.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.empty-value-placeholder {
  height: 32px; /* 与输入框高度保持一致 */
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
}

.rule-item {
  width: 80px;
}

.field-item {
  width: 160px;
}

.value-item {
  width: 180px;
}

.conditions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.condition-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.filter-item {
  margin-right: 8px;
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

/* 移动端日期选择器样式 */
.mobile-date-picker {
  @media (max-width: 768px) {
    :deep(.el-input__wrapper) {
      height: 44px !important;
      padding: 0 12px !important;
      border-radius: 8px !important;
      border: 1px solid var(--el-border-color) !important;
      
      .el-input__inner {
        height: 42px !important;
        line-height: 42px !important;
        font-size: 16px !important;
        text-align: center;
        
        &::placeholder {
          font-size: 14px !important;
          color: var(--el-text-color-placeholder) !important;
        }
      }
      
      .el-input__suffix {
        .el-input__suffix-inner {
          .el-icon {
            font-size: 18px !important;
            color: var(--el-color-primary) !important;
          }
        }
      }
    }
  }
  
  @media (max-width: 480px) {
    :deep(.el-input__wrapper) {
      height: 48px !important;
      
      .el-input__inner {
        height: 46px !important;
        line-height: 46px !important;
        font-size: 16px !important;
      }
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
    
    .el-date-table {
      th {
        padding: 8px 4px !important;
        font-size: 12px !important;
      }
      
      td {
        padding: 0 !important;
        width: 32px !important;
        height: 32px !important;
        
        .cell {
          width: 32px !important;
          height: 32px !important;
          line-height: 32px !important;
          font-size: 14px !important;
          border-radius: 6px !important;
          
          &:hover {
            background-color: var(--el-color-primary-light-9) !important;
          }
        }
        
        &.current:not(.disabled) .cell {
          background-color: var(--el-color-primary) !important;
          color: #fff !important;
        }
      }
    }
    
    .el-picker-panel__header {
      padding: 12px 16px !important;
      border-bottom: 1px solid var(--el-border-color-lighter) !important;
      
      .el-picker-panel__icon-btn {
        width: 32px !important;
        height: 32px !important;
        line-height: 32px !important;
        border-radius: 6px !important;
        
        &:hover {
          background-color: var(--el-color-primary-light-9) !important;
        }
      }
    }
    
    .el-picker-panel__content {
      padding: 12px !important;
    }
    
    .el-picker-panel__footer {
      padding: 8px 16px 12px !important;
      border-top: 1px solid var(--el-border-color-lighter) !important;
      
      .el-button {
        height: 36px !important;
        padding: 0 16px !important;
        border-radius: 6px !important;
        font-size: 14px !important;
      }
    }
  }
}

/* 移动端遮罩层 */
:deep(.el-overlay) {
  @media (max-width: 768px) {
    background-color: rgba(0, 0, 0, 0.5) !important;
  }
}

</style>
