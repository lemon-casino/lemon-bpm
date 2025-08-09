<template>
  <div class="step-import-settings">
    <div class="settings-header">
      <el-alert
        title="请设置Excel列和字段的对应关系"
        type="info"
        :closable="false"
        show-icon
      />
    </div>

    <div class="mapping-area">
      <div class="mapping-header">
        <div class="excel-column">Excel列名</div>
        <div class="field-column">对应字段</div>
      </div>

      <div class="mapping-rows">
        <div class="mapping-row" v-for="(excelColumn, index) in excelColumns" :key="index">
          <div class="excel-column">{{ excelColumn }}</div>
          <div class="field-column">
            <el-select
              v-model="mapping[excelColumn]"
              placeholder="请选择"
              clearable
              filterable
              @change="updateMapping"
            >
              <el-option
                v-for="field in fieldOptions"
                :key="field.value"
                :label="field.label"
                :value="field.value"
              />
            </el-select>
          </div>
        </div>
      </div>
    </div>

    <div class="validation-results" v-if="validationMessage">
      <el-alert
        :title="validationMessage"
        :type="hasMapping ? 'success' : 'warning'"
        :closable="false"
        show-icon
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, watch, onMounted } from 'vue'

defineOptions({ name: 'StepImportSettings' })

// 定义组件接受的参数
const props = defineProps({
  excelData: {
    type: Array,
    required: true
  },
  columns: {
    type: Array,
    required: true
  },
  columnMapping: {
    type: Object,
    default: () => ({})
  }
})

// 定义组件事件
const emit = defineEmits(['update-mapping'])

// Excel列名列表
const excelColumns = computed(() => {
  if (props.excelData.length === 0) return []
  
  const firstRow = props.excelData[0]
  return Object.keys(firstRow)
})

// 字段选项列表
const fieldOptions = computed(() => {
  return props.columns.map((col: any) => {
    const field = col.rule?.[0]?.field || ''
    const required = col.rule?.[0]?.$required || false
    
    return {
      label: `${col.label}${required ? ' (必填)' : ''}`,
      value: field
    }
  })
})

// 映射关系
const mapping = ref<Record<string, string>>({})

// 初始化映射
onMounted(() => {
  mapping.value = { ...props.columnMapping }
})

// 监听映射变化
watch(() => props.columnMapping, (val) => {
  mapping.value = { ...val }
}, { deep: true })

// 更新映射
const updateMapping = () => {
  emit('update-mapping', mapping.value)
}

// 校验映射是否有效
const hasMapping = computed(() => {
  return Object.values(mapping.value).some(v => !!v)
})

// 校验消息
const validationMessage = computed(() => {
  if (!hasMapping.value) {
    return '请至少设置一个字段映射关系'
  }
  
  // 检查必填字段是否已映射
  const requiredFields = props.columns
    .filter((col: any) => col.rule?.[0]?.$required)
    .map((col: any) => col.rule[0].field)
  
  const mappedFields = Object.values(mapping.value)
  const missingRequired = requiredFields.filter(field => !mappedFields.includes(field))
  
  if (missingRequired.length > 0) {
    const missingLabels = missingRequired.map(field => {
      const col = props.columns.find((c: any) => c.rule?.[0]?.field === field)
      return col ? col.label : field
    })
    
    return `有${missingRequired.length}个必填字段未映射: ${missingLabels.join(', ')}`
  }
  
  return `已设置${Object.keys(mapping.value).length}个字段映射`
})
</script>

<style lang="scss" scoped>
.step-import-settings {
  display: flex;
  flex-direction: column;
  gap: 20px;
  
  .mapping-area {
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    overflow: hidden;
    
    .mapping-header {
      display: flex;
      background-color: #f5f7fa;
      padding: 10px;
      font-weight: bold;
      
      .excel-column {
        flex: 1;
        padding: 0 10px;
      }
      
      .field-column {
        flex: 1;
        padding: 0 10px;
      }
    }
    
    .mapping-rows {
      max-height: 350px;
      overflow-y: auto;
      
      .mapping-row {
        display: flex;
        border-top: 1px solid #ebeef5;
        padding: 10px;
        
        &:hover {
          background-color: #f5f7fa;
        }
        
        .excel-column {
          flex: 1;
          padding: 0 10px;
          display: flex;
          align-items: center;
        }
        
        .field-column {
          flex: 1;
          padding: 0 10px;
          
          :deep(.el-select) {
            width: 100%;
          }
        }
      }
    }
  }
  
  .validation-results {
    margin-top: 10px;
  }
}
</style> 