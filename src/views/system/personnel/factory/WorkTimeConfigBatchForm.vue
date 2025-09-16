<template>
  <Dialog v-model="dialogVisible" :title="dialogTitle" width="900px">
    <!-- 模式切换 -->
    <div class="mode-switch" style="margin-bottom: 20px;">
      <el-radio-group v-model="inputMode" @change="onModeChange">
        <el-radio-button label="form">表单模式</el-radio-button>
        <el-radio-button label="json">JSON导入模式</el-radio-button>
      </el-radio-group>
    </div>

    <!-- 表单模式 -->
    <el-form
      v-if="inputMode === 'form'"
      ref="formRef"
      v-loading="formLoading"
      :model="formData"
      :rules="formRules"
      label-width="120px"
    >
      <el-form-item label="工时类型" prop="type">
        <el-select
          v-model="formData.type"
          placeholder="请选择工时类型"
          style="width: 100%"
        >
          <el-option
            v-for="item in typeOptions"
            :key="item.id"
            :label="item.name"
            :value="item.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="工厂名称" prop="name">
        <el-input
          v-model="formData.name"
          placeholder="请输入工厂名称"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="银行卡信息" prop="atmCard">
        <el-input
          v-model="formData.atmCard"
          placeholder="请输入银行卡信息"
          style="width: 100%"
        />
      </el-form-item>
    </el-form>

    <!-- JSON导入模式 -->
    <div v-if="inputMode === 'json'" class="json-import-section">
      <el-form
        ref="jsonFormRef"
        :model="jsonFormData"
        :rules="jsonFormRules"
        label-width="120px"
      >
        <el-form-item label="工时类型" prop="type">
          <el-select
            v-model="jsonFormData.type"
            placeholder="请选择工时类型"
            style="width: 100%"
          >
            <el-option
              v-for="item in typeOptions"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="JSON数据" prop="jsonData">
          <el-input
            v-model="jsonFormData.jsonData"
            type="textarea"
            :rows="8"
            placeholder="请输入JSON格式的工厂数据，例如：&#10;[&#10;  {&quot;name&quot;: &quot;工厂1&quot;, &quot;atmCard&quot;: &quot;6222021234567890123&quot;},&#10;  {&quot;name&quot;: &quot;工厂2&quot;, &quot;atmCard&quot;: &quot;6222021234567890124&quot;},&#10;  {&quot;name&quot;: &quot;工厂3&quot;}&#10;]&#10;注：atmCard字段为可选项"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item>
          <el-button @click="parseJsonData" type="info" size="small">
            解析JSON数据
          </el-button>
          <el-button @click="clearJsonData" size="small">
            清空数据
          </el-button>
        </el-form-item>
      </el-form>
      
      <!-- 解析结果预览 -->
      <div v-if="parsedConfigs.length > 0" class="parsed-preview">
        <el-divider content-position="left">解析结果预览 ({{ parsedConfigs.length }} 条)</el-divider>
        <div class="preview-list">
          <el-tag
            v-for="(config, index) in parsedConfigs"
            :key="index"
            class="preview-tag"
            type="success"
          >
            {{ config.name }}{{ config.atmCard ? ` (${config.atmCard})` : '' }}
          </el-tag>
        </div>
      </div>
    </div>
    
    <template #footer>
      <el-button @click="submitForm" type="primary" :disabled="formLoading || !canSubmit">
        确 定 (将创建 {{ totalConfigs }} 条配置)
      </el-button>
      <el-button @click="dialogVisible = false">取 消</el-button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import * as FactoryConfigApi from '@/api/bpm/FactoryConfig'

defineOptions({ name: 'WorkTimeConfigBatchForm' })

const { t } = useI18n() // 国际化
const message = useMessage() // 消息弹窗

const props = defineProps<{
  typeOptions: FactoryConfigApi.FactoryTypeVO[]
}>()

interface TimeSlot {
  startTime: string
  endTime: string
}

const dialogVisible = ref(false) // 弹窗的是否展示
const dialogTitle = ref('批量创建配置') // 弹窗的标题
const formLoading = ref(false) // 表单的加载中
// 输入模式：form表单模式，json导入模式
const inputMode = ref('form')

// 表单模式数据
const formData = ref({
  type: undefined,
  name: '',
  atmCard: '' // 银行卡信息
})

// JSON导入模式数据
const jsonFormData = ref({
  type: undefined,
  jsonData: ''
})

// 解析后的配置数据
const parsedConfigs = ref<Array<{name: string, atmCard?: string}>>([])

// 表单验证规则
const formRules = reactive({
  type: [{ required: true, message: '工时类型不能为空', trigger: 'change' }],
  name: [{ required: true, message: '工厂名称不能为空', trigger: 'blur' }],
  atmCard: [{ required: false, message: '银行卡信息格式不正确', trigger: 'blur' }]
})

// JSON表单验证规则
const jsonFormRules = reactive({
  type: [{ required: true, message: '工时类型不能为空', trigger: 'change' }],
  jsonData: [{ required: true, message: 'JSON数据不能为空', trigger: 'blur' }]
})

const formRef = ref() // 表单 Ref
const jsonFormRef = ref() // JSON表单 Ref

// 计算总配置数量
const totalConfigs = computed(() => {
  if (inputMode.value === 'form') {
    return formData.value.name ? 1 : 0
  } else {
    return parsedConfigs.value.length
  }
})

// 计算是否可以提交
const canSubmit = computed(() => {
  if (inputMode.value === 'form') {
    return formData.value.type && formData.value.name
  } else {
    return jsonFormData.value.type && parsedConfigs.value.length > 0
  }
})

/** 打开弹窗 */
const open = async () => {
  dialogVisible.value = true
  resetForm()
}

/** 提交表单 */
const emit = defineEmits(['success']) // 定义 success 事件，用于操作成功后的回调
const submitForm = async () => {
  let configs: FactoryConfigApi.FactorySaveReqVO[] = []
  
  if (inputMode.value === 'form') {
    // 表单模式校验
    if (!formRef.value) return
    const valid = await formRef.value.validate()
    if (!valid) return
    
    // 构建单个配置数据
    configs = [{
      type: formData.value.type!,
      name: formData.value.name,
      atmCard: formData.value.atmCard // 银行卡信息
    }]
  } else {
    // JSON模式校验
    if (!jsonFormRef.value) return
    const valid = await jsonFormRef.value.validate()
    if (!valid) return
    
    if (parsedConfigs.value.length === 0) {
      message.error('请先解析JSON数据')
      return
    }
    
    // 构建批量配置数据
    configs = parsedConfigs.value.map(item => ({
      type: jsonFormData.value.type!,
      name: item.name,
      atmCard: item.atmCard // 银行卡信息
    }))
  }
  
  // 提交请求
  formLoading.value = true
  try {
    const batchData: FactoryConfigApi.WorkTimeConfigBatchSaveReqVO = {
      configs: configs
    }
    
    await FactoryConfigApi.batchCreateWorkTimeConfig(batchData)
    message.success(`成功创建 ${configs.length} 条工厂配置`)
    dialogVisible.value = false
    // 发送操作成功的事件
    emit('success')
  } finally {
    formLoading.value = false
  }
}

/** 模式切换处理 */
const onModeChange = (mode: string) => {
  // 切换模式时重置数据
  resetForm()
}

/** 解析JSON数据 */
const parseJsonData = () => {
  try {
    if (!jsonFormData.value.jsonData.trim()) {
      message.warning('请输入JSON数据')
      return
    }
    
    const data = JSON.parse(jsonFormData.value.jsonData)
    
    if (!Array.isArray(data)) {
      message.error('JSON数据必须是数组格式')
      return
    }
    
    // 验证数据格式
    const validConfigs = []
    for (let i = 0; i < data.length; i++) {
      const item = data[i]
      if (!item || typeof item !== 'object') {
        message.error(`第${i + 1}项数据格式错误，必须是对象`)
        return
      }
      if (!item.name || typeof item.name !== 'string') {
        message.error(`第${i + 1}项缺少name字段或name不是字符串`)
        return
      }
      
      // 验证atmCard字段（可选）
      if (item.atmCard && typeof item.atmCard !== 'string') {
        message.error(`第${i + 1}项atmCard字段必须是字符串`)
        return
      }
      
      validConfigs.push({ 
        name: item.name.trim(),
        atmCard: item.atmCard ? item.atmCard.trim() : undefined
      })
    }
    
    if (validConfigs.length === 0) {
      message.error('没有有效的配置数据')
      return
    }
    
    parsedConfigs.value = validConfigs
    message.success(`成功解析 ${validConfigs.length} 条配置数据`)
  } catch (error) {
    message.error('JSON格式错误，请检查数据格式')
    console.error('JSON解析错误:', error)
  }
}

/** 清空JSON数据 */
const clearJsonData = () => {
  jsonFormData.value.jsonData = ''
  parsedConfigs.value = []
}

/** 重置表单 */
const resetForm = () => {
  // 重置表单模式数据
  formData.value = {
    type: undefined,
    name: '',
    atmCard: '' // 银行卡信息
  }
  
  // 重置JSON模式数据
  jsonFormData.value = {
    type: undefined,
    jsonData: ''
  }
  
  // 清空解析结果
  parsedConfigs.value = []
  
  // 重置表单验证
  formRef.value?.resetFields()
  jsonFormRef.value?.resetFields()
}

defineExpose({ open }) // 提供 open 方法，用于打开弹窗
</script>

<style scoped>
/* 模式切换样式 */
.mode-switch {
  text-align: center;
  padding: 10px 0;
  border-bottom: 1px solid #ebeef5;
}

/* JSON导入区域样式 */
.json-import-section {
  margin-top: 10px;
}

/* 解析结果预览样式 */
.parsed-preview {
  margin-top: 20px;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e9ecef;
}

.preview-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.preview-tag {
  margin: 0;
}

.date-actions-container .el-button {
  font-size: 12px;
}

.date-actions-container .el-button .mr-5px {
  margin-right: 4px;
}

/* 时间验证错误样式 */
.time-error {
  color: #f56c6c;
  font-size: 12px;
  margin-top: 4px;
  line-height: 1.2;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .date-actions-container {
    flex-direction: column;
  }
  
  .month-selector {
    width: 100%;
    margin-bottom: 16px;
  }
  
  .button-groups {
    width: 100%;
  }
}

@media (max-width: 768px) {
  /* 对话框宽度调整 */
  :deep(.el-dialog) {
    width: 95% !important;
    max-width: 95%;
    margin: 10px auto;
  }
  
  :deep(.el-dialog__header) {
    padding: 12px;
  }
  
  :deep(.el-dialog__body) {
    padding: 10px;
  }
  
  :deep(.el-dialog__footer) {
    padding: 10px;
  }
  
  /* 模式切换按钮组 */
  .mode-switch {
    margin-bottom: 10px;
  }
  
  .mode-switch :deep(.el-radio-button) {
    margin-bottom: 5px;
  }
  
  .mode-switch :deep(.el-radio-button__inner) {
    padding: 6px 10px;
    font-size: 12px;
  }
  
  /* 表单元素 */
  :deep(.el-form-item) {
    margin-bottom: 12px;
  }
  
  :deep(.el-form-item__label) {
    padding: 0 0 6px;
    line-height: 1.2;
    font-size: 13px;
  }
  
  :deep(.el-form-item__content) {
    line-height: 1.2;
  }
  
  /* 文本域 */
  :deep(.el-textarea__inner) {
    min-height: 120px !important;
  }
  
  /* 解析结果预览 */
  .parsed-preview {
    margin-top: 10px;
    padding: 10px;
  }
  
  .preview-list {
    gap: 5px;
  }
  
  .preview-tag {
    margin: 2px;
    font-size: 11px;
    padding: 0 4px;
    height: 22px;
    line-height: 20px;
  }
  
  /* 按钮组 */
  .button-groups {
    flex-direction: column;
    gap: 10px;
  }
  
  .button-group {
    width: 100%;
  }
  
  .month-selector .el-date-picker {
    width: 100%;
  }
  
  .button-row {
    flex-direction: column;
  }
  
  .button-row .el-button {
    width: 100%;
    margin-left: 0;
    margin-bottom: 8px;
  }
  
  .clear-action {
    width: 100%;
    margin-top: 10px;
  }
  
  .clear-action .el-button {
    width: 100%;
  }
  
  .month-action-group {
    margin-bottom: 10px;
  }
  
  /* 底部按钮 */
  :deep(.el-dialog__footer .el-button) {
    width: 100%;
    margin: 5px 0;
    padding: 8px 15px;
    font-size: 14px;
  }
}

.month-actions-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.month-action-group {
  background: #f9f9f9;
  border-radius: 4px;
  padding: 16px;
  border: 1px solid #ebeef5;
}

@media (min-width: 768px) {
  .month-actions-container {
    flex-direction: row;
  }
  
  .month-action-group {
    flex: 1;
  }
}

.clear-btn {
  pointer-events: auto;
  padding: 2px 4px;
  height: auto;
  font-size: 11px;
  margin-left: 4px;
}

.date-help-text {
  font-size: 12px;
  color: #909399;
  margin: 8px 0;
  text-align: center;
  font-style: italic;
}
</style>
