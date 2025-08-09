 <template>
  <div class="step-preview-data">
    <div class="preview-header">
      <div class="sheet-selector" v-if="sheets.length > 1">
        <span class="label">工作表:</span>
        <el-select v-model="currentSheet" @change="handleSheetChange" size="small">
          <el-option 
            v-for="sheet in sheets" 
            :key="sheet" 
            :label="sheet" 
            :value="sheet"
          />
        </el-select>
      </div>

      <div class="data-info">
        <el-alert
          :title="`数据预览最多展示100条数据，共${excelData.length}条数据`"
          type="info"
          :closable="false"
          show-icon
        />
      </div>
    </div>

    <div class="preview-table" v-if="excelData.length > 0">
      <el-table
        :data="tableData"
        style="width: 100%"
        max-height="350"
        size="small"
        border
      >
        <el-table-column
          type="index"
          width="50"
          label="序号"
          align="center"
        />
        <el-table-column
          v-for="column in tableColumns"
          :key="column.prop"
          :prop="column.prop"
          :label="column.label"
          min-width="120"
        />
      </el-table>
    </div>

    <div class="empty-data" v-else>
      <el-empty description="没有检测到数据" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, watch } from 'vue'

defineOptions({ name: 'StepPreviewData' })

// 定义组件接受的参数
const props = defineProps({
  excelData: {
    type: Array,
    required: true
  },
  sheets: {
    type: Array,
    default: () => []
  },
  selectedSheet: {
    type: String,
    default: ''
  }
})

// 定义组件事件
const emit = defineEmits(['change-sheet'])

// 当前选中的sheet
const currentSheet = ref(props.selectedSheet)

// 更新选中的sheet
watch(() => props.selectedSheet, (val) => {
  currentSheet.value = val
})

// 限制表格数据最多100条
const tableData = computed(() => {
  return props.excelData.slice(0, 100)
})

// 获取表格列
const tableColumns = computed(() => {
  if (props.excelData.length === 0) return []
  
  const firstRow = props.excelData[0]
  return Object.keys(firstRow).map(key => ({
    prop: key,
    label: key
  }))
})

// 切换sheet
const handleSheetChange = (sheet: string) => {
  emit('change-sheet', sheet)
}
</script>

<style lang="scss" scoped>
.step-preview-data {
  display: flex;
  flex-direction: column;
  gap: 15px;
  
  .preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    
    .sheet-selector {
      display: flex;
      align-items: center;
      gap: 10px;
      
      .label {
        font-size: 14px;
        color: #606266;
      }
    }
  }
  
  .empty-data {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 200px;
  }
}
</style>