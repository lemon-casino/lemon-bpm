<template>
  <el-dialog
    v-model="dialogVisible"
    :title="title"
    width="800px"
    :close-on-click-modal="false"
    :destroy-on-close="true"
    @closed="onClose"
  >
    <div class="import-steps">
      <el-steps :active="activeStep" finish-status="success" simple class="mb-20px">
        <el-step title="选择EXCEL表" />
        <el-step title="数据预览" />
        <el-step title="导入设置" />
        <el-step title="导入数据" />
      </el-steps>

      <div class="step-content">
        <!-- 步骤1: 选择EXCEL表 -->
        <StepSelectFile
          v-if="activeStep === 0"
          :columns="columns"
          :table-title="tableTitle"
          @select-file="handleFileSelected"
          @download-template="handleDownloadTemplate"
        />

        <!-- 步骤2: 数据预览 -->
        <StepPreviewData
          v-if="activeStep === 1"
          :excel-data="excelData"
          :sheets="excelSheets"
          :selected-sheet="selectedSheet"
          @change-sheet="handleSheetChange"
        />

        <!-- 步骤3: 导入设置 -->
        <StepImportSettings
          v-if="activeStep === 2"
          :excel-data="excelData"
          :columns="columns"
          :column-mapping="columnMapping"
          @update-mapping="handleUpdateMapping"
        />

        <!-- 步骤4: 导入数据 -->
        <StepImportData
          v-if="activeStep === 3"
          :status="importStatus"
          :total="importTotal"
          :success="importSuccess"
          :fail="importFail"
          :warnings="importWarnings"
        />
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button v-if="activeStep > 0" @click="prevStep">上一步</el-button>
        <el-button 
          v-if="activeStep < 3" 
          type="primary" 
          :disabled="!canGoNext"
          @click="nextStep"
        >
          下一步
        </el-button>
        <el-button 
          v-if="activeStep === 3 && importStatus === 'success'"
          type="primary" 
          @click="dialogVisible = false"
        >
          完成
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
import { ref, computed, watch } from 'vue'
import StepSelectFile from './steps/StepSelectFile.vue'
import StepPreviewData from './steps/StepPreviewData.vue'
import StepImportSettings from './steps/StepImportSettings.vue'
import StepImportData from './steps/StepImportData.vue'
import * as XLSX from 'xlsx'
import { ElMessage } from 'element-plus'

defineOptions({ name: 'ImportSteps' })

// 定义组件接受的参数
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  columns: {
    type: Array,
    required: true
  },
  tableTitle: {
    type: String,
    default: ''
  },
  onImport: {
    type: Function,
    required: true
  }
})

// 定义组件事件
const emit = defineEmits(['update:modelValue', 'imported'])

// 对话框可见性
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

// 对话框标题
const title = computed(() => `批量导入${props.tableTitle || '数据'}`)

// 当前激活的步骤
const activeStep = ref(0)

// Excel相关数据
const excelFile = ref<File | null>(null)
const excelData = ref<any[]>([])
const excelSheets = ref<string[]>([])
const selectedSheet = ref('')

// 映射关系
const columnMapping = ref<Record<string, string>>({})

// 导入状态和结果
const importStatus = ref<'idle' | 'importing' | 'success' | 'error'>('idle')
const importTotal = ref(0)
const importSuccess = ref(0)
const importFail = ref(0)
const importWarnings = ref<string[]>([])

// 是否可以进入下一步
const canGoNext = computed(() => {
  switch (activeStep.value) {
    case 0: 
      return !!excelFile.value
    case 1:
      return excelData.value.length > 0
    case 2:
      // 检查至少有一个字段映射
      return Object.keys(columnMapping.value).length > 0
    default:
      return true
  }
})

// 上一步
const prevStep = () => {
  if (activeStep.value > 0) {
    activeStep.value--
  }
}

// 下一步
const nextStep = async () => {
  if (activeStep.value < 3) {
    if (activeStep.value === 2) {
      // 如果是从设置页面进入导入页面，开始导入过程
      importStatus.value = 'importing'
      startImport()
    }
    activeStep.value++
  }
}

// 处理文件选择
const handleFileSelected = async (file: File) => {
  excelFile.value = file
  try {
    // 记录开始处理文件
    console.log('开始处理Excel文件:', file.name, file.size, file.type)
    
    const arrayBuffer = await file.arrayBuffer()
    const data = new Uint8Array(arrayBuffer)
    
    // 增强XLSX配置选项
    const readOpts = { 
      type: 'array',
      raw: true,        // 保留原始值
      cellDates: true,  // 将日期解析为JS日期对象
      cellStyles: true, // 保留单元格样式
      cellNF: true,     // 保留数字格式
      dateNF: 'yyyy-mm-dd', // 日期格式
      sheetStubs: true, // 创建空单元格
      WTF: true         // 显示更详细的错误
    }
    
    // 解析Excel数据
    const workbook = XLSX.read(data, readOpts)
    
    // 检查WorkBook是否有效
    if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
      console.error('无效的Excel文件结构:', workbook)
      throw new Error('无效的Excel文件结构')
    }
    
    // 获取所有Sheet名称
    excelSheets.value = workbook.SheetNames
    selectedSheet.value = workbook.SheetNames[0]
    
    // 获取当前Sheet
    const sheetName = selectedSheet.value
    const worksheet = workbook.Sheets[sheetName]
    
    if (!worksheet) {
      console.error(`无法获取工作表: ${sheetName}`)
      throw new Error(`无法获取工作表: ${sheetName}`)
    }
    
    // 转换Sheet数据为JSON
    const jsonOpts = {
      header: 1,        // 使用第一行作为字段名
      defval: '',       // 空单元格的默认值
      blankrows: false  // 忽略空行
    }
    
    // 先获取所有数据，包括表头
    let allData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      blankrows: false
    })
    
    // 检查是否有数据
    if (!allData || allData.length === 0) {
      console.error('Excel文件为空或格式不正确')
      throw new Error('Excel文件为空或格式不正确')
    }
    
    // 日志输出表头和首行数据
    console.log('表头:', allData[0])
    if (allData.length > 1) {
      console.log('首行数据:', allData[1])
    }
    
    // 获取表头(第一行)
    const headers = allData[0]
    
    // 如果表头是数组，将其转换为对象格式
    if (Array.isArray(headers)) {
      // 重新解析数据为对象格式，跳过第一行表头
      excelData.value = allData.slice(1).map(row => {
        const obj = {}
        headers.forEach((header, index) => {
          if (header) { // 只处理非空表头
            obj[header] = Array.isArray(row) && index < row.length ? row[index] : ''
          }
        })
        return obj
      })
    } else {
      // 标准的sheet_to_json输出
      excelData.value = XLSX.utils.sheet_to_json(worksheet, {
        defval: '',
        blankrows: false
      })
    }
    
    // 检查转换后的数据
    if (!excelData.value || excelData.value.length === 0) {
      console.error('无法从Excel提取有效数据', { 
        sheetName, 
        headers, 
        dataType: typeof excelData.value,
        dataLength: Array.isArray(excelData.value) ? excelData.value.length : 0
      })
      throw new Error('无法从Excel提取有效数据')
    }
    
    console.log(`成功加载Excel数据: ${excelData.value.length}行`)
    
    // 自动创建初始映射关系
    createInitialMapping()
  } catch (error) {
    console.error('解析Excel失败:', error)
    excelData.value = []
    ElMessage.error('解析Excel文件失败: ' + (error.message || '未知错误'))
  }
}

// 创建初始字段映射关系
const createInitialMapping = () => {
  if (excelData.value.length === 0) return
  
  const firstRow = excelData.value[0]
  const mapping: Record<string, string> = {}
  
  // 遍历Excel列名
  for (const excelCol in firstRow) {
    // 查找匹配的表单字段
    const matchedColumn = props.columns.find((col: any) => {
      // 尝试匹配列名和字段名
      return col.label === excelCol || 
             (col.rule && col.rule[0] && col.rule[0].field === excelCol)
    })
    
    if (matchedColumn) {
      mapping[excelCol] = matchedColumn.rule[0].field
    }
  }
  
  columnMapping.value = mapping
}

// 切换Sheet
const handleSheetChange = (sheet: string) => {
  selectedSheet.value = sheet
  if (!excelFile.value) return

  const reader = new FileReader()
  reader.onload = (e) => {
    if (!e.target || !e.target.result) return
    
    try {
      const data = new Uint8Array(e.target.result as ArrayBuffer)
      
      // 使用增强的配置选项
      const readOpts = { 
        type: 'array',
        raw: true,
        cellDates: true,
        cellStyles: true,
        cellNF: true,
        dateNF: 'yyyy-mm-dd',
        sheetStubs: true,
        WTF: true
      }
      
      const workbook = XLSX.read(data, readOpts)
      const worksheet = workbook.Sheets[sheet]
      
      if (!worksheet) {
        throw new Error(`无法获取工作表: ${sheet}`)
      }
      
      // 获取所有数据，包括表头
      let allData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: '',
        blankrows: false
      })
      
      // 检查是否有数据
      if (!allData || allData.length === 0) {
        throw new Error('Excel工作表为空或格式不正确')
      }
      
      // 获取表头(第一行)
      const headers = allData[0]
      
      // 如果表头是数组，将其转换为对象格式
      if (Array.isArray(headers)) {
        // 重新解析数据为对象格式，跳过第一行表头
        excelData.value = allData.slice(1).map(row => {
          const obj = {}
          headers.forEach((header, index) => {
            if (header) {
              obj[header] = Array.isArray(row) && index < row.length ? row[index] : ''
            }
          })
          return obj
        })
      } else {
        // 标准的sheet_to_json输出
        excelData.value = XLSX.utils.sheet_to_json(worksheet, {
          defval: '',
          blankrows: false
        })
      }
      
      if (!excelData.value || excelData.value.length === 0) {
        throw new Error('无法从Excel工作表提取有效数据')
      }
      
      console.log(`成功切换到工作表"${sheet}": ${excelData.value.length}行`)
      
      // 更新字段映射
      createInitialMapping()
    } catch (error) {
      console.error(`切换工作表"${sheet}"失败:`, error)
      excelData.value = []
      ElMessage.error('切换Excel工作表失败: ' + (error.message || '未知错误'))
    }
  }
  
  reader.onerror = (e) => {
    console.error('读取文件失败:', e)
    ElMessage.error('读取Excel文件失败')
  }
  
  reader.readAsArrayBuffer(excelFile.value)
}

// 更新字段映射
const handleUpdateMapping = (mapping: Record<string, string>) => {
  columnMapping.value = mapping
}

// 处理模板下载
const handleDownloadTemplate = () => {
  // 创建工作簿和工作表
  const wb = XLSX.utils.book_new()
  
  // 提取列标题作为表头
  const headers = props.columns.map((col: any) => col.label)
  const ws = XLSX.utils.aoa_to_sheet([headers])
  
  // 将工作表添加到工作簿
  XLSX.utils.book_append_sheet(wb, ws, '导入模板')
  
  // 生成Excel文件并下载
  XLSX.writeFile(wb, `${props.tableTitle || '数据'}导入模板.xlsx`)
}

// 开始导入过程
const startImport = async () => {
  importTotal.value = excelData.value.length
  importSuccess.value = 0
  importFail.value = 0
  importWarnings.value = []
  
  try {
    // 转换数据格式
    const transformedData = excelData.value.map(row => {
      const result: Record<string, any> = {}
      
      for (const excelCol in row) {
        const fieldName = columnMapping.value[excelCol]
        if (fieldName) {
          result[fieldName] = row[excelCol]
        }
      }
      
      return result
    })
    
    // 检查必填字段
    props.columns.forEach((col: any) => {
      const field = col.rule && col.rule[0]
      if (field && field.$required) {
        transformedData.forEach((row, index) => {
          if (row[field.field] === undefined || row[field.field] === '') {
            importWarnings.value.push(`第${index + 1}行缺少必填字段: ${col.label}`)
          }
        })
      }
    })
    
    // 调用导入回调
    const result = await props.onImport(transformedData)
    importSuccess.value = transformedData.length
    importStatus.value = 'success'
  } catch (error) {
    console.error('导入失败:', error)
    importFail.value = importTotal.value
    importStatus.value = 'error'
  }
}

// 关闭对话框时重置状态
const onClose = () => {
  activeStep.value = 0
  excelFile.value = null
  excelData.value = []
  excelSheets.value = []
  selectedSheet.value = ''
  columnMapping.value = {}
  importStatus.value = 'idle'
  importTotal.value = 0
  importSuccess.value = 0
  importFail.value = 0
  importWarnings.value = []
  
  // 通知父组件导入完成
  if (importStatus.value === 'success') {
    emit('imported', {
      success: importSuccess.value,
      fail: importFail.value,
      warnings: importWarnings.value
    })
  }
}
</script>

<style lang="scss" scoped>
.import-steps {
  padding: 0 20px;
  
  .mb-20px {
    margin-bottom: 20px;
  }
  
  .step-content {
    min-height: 300px;
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>