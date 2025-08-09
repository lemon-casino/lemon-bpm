<template>
  <Dialog v-model="dialogVisible" :title="dialogTitle" width="800px">
    <el-form
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
            :key="item.type"
            :label="item.name"
            :value="item.type"
          />
        </el-select>
      </el-form-item>
      
      <el-form-item label="选择日期" prop="dates">
        <div class="date-selection-wrapper">
          <div class="date-picker-container">
            <el-date-picker
              v-model="formData.dates"
              type="dates"
              placeholder="请选择多个日期"
              style="width: 100%"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
            />
            <div class="selected-dates-count" v-if="formData.dates.length > 0">
              已选择 <span class="count-number">{{ formData.dates.length }}</span> 天
              <el-button size="small" type="text" @click="clearDates" class="clear-btn">
                <Icon icon="ep:delete" /> 清空
              </el-button>
            </div>
          </div>
          
          <div class="date-actions-container">
            <!-- 说明文本 -->
            <div class="date-help-text">
              请直接选择日期或使用下方快捷选择功能
            </div>
          </div>
        </div>
      </el-form-item>
      
      <!-- 月份操作区域，放在选择日期后面 -->
      <el-form-item label="快捷选择">
        <div class="month-actions-container">
          <!-- 当前月份操作 -->
          <div class="month-action-group">
            <div class="section-title">当前月份</div>
            <div class="button-row">
              <el-button size="small" @click="selectCurrentMonth" type="primary" plain>
                <Icon icon="ep:calendar" class="mr-5px" />
                全部日期
              </el-button>
              <el-button size="small" @click="selectWorkdays" type="success" plain>
                <Icon icon="ep:briefcase" class="mr-5px" />
                工作日
              </el-button>
            </div>
          </div>
          
          <!-- 指定月份操作 -->
          <div class="month-action-group">
            <!-- 月份选择器 -->
            <div class="section-title">选择月份范围</div>
            <el-date-picker
              v-model="selectedMonths"
              type="monthrange"
              range-separator="至"
              start-placeholder="开始月份"
              end-placeholder="结束月份"
              format="YYYY-MM"
              value-format="YYYY-MM"
              size="small"
              style="width: 100%"
            />
            <div class="button-row" style="margin-top: 8px;">
              <el-button size="small" @click="selectSpecificMonth" type="warning" plain>
                <Icon icon="ep:calendar" class="mr-5px" />
                全部日期
              </el-button>
              <el-button size="small" @click="selectSpecificMonthWorkdays" type="info" plain>
                <Icon icon="ep:briefcase" class="mr-5px" />
                工作日
              </el-button>
            </div>
          </div>
        </div>
      </el-form-item>
      
      <el-form-item label="时间段配置">
        <div class="w-full">
          <div class="mb-10px">
            <el-button type="primary" size="small" @click="addTimeSlot">
              <Icon icon="ep:plus" class="mr-5px" /> 添加时间段
            </el-button>
          </div>
          
          <div v-for="(slot, index) in formData.timeSlots" :key="index" class="mb-10px">
            <el-row :gutter="10" align="middle">
              <el-col :span="8">
                <el-time-picker
                  v-model="slot.startTime"
                  placeholder="开始时间"
                  format="HH:mm"
                  value-format="HH:mm"
                  style="width: 100%"
                  @change="validateTimeSlot(index)"
                />
                <div v-if="getTimeSlotError(index, 'start')" class="time-error">
                  {{ getTimeSlotError(index, 'start') }}
                </div>
              </el-col>
              <el-col :span="8">
                <el-time-picker
                  v-model="slot.endTime"
                  placeholder="结束时间"
                  format="HH:mm"
                  value-format="HH:mm"
                  style="width: 100%"
                  @change="validateTimeSlot(index)"
                />
                <div v-if="getTimeSlotError(index, 'end')" class="time-error">
                  {{ getTimeSlotError(index, 'end') }}
                </div>
              </el-col>
              <el-col :span="8">
                <el-button
                  type="danger"
                  size="small"
                  @click="removeTimeSlot(index)"
                  :disabled="formData.timeSlots.length <= 1"
                >
                  <Icon icon="ep:delete" class="mr-5px" /> 删除
                </el-button>
              </el-col>
            </el-row>
          </div>
        </div>
      </el-form-item>
      
      <el-form-item>
        <el-alert
          title="批量创建说明"
          type="info"
          :closable="false"
          show-icon
        >
          <template #default>
            <div>
              <p>• 选择的每个日期都会创建所有配置的时间段</p>
              <p>• 例如：选择3个日期，配置2个时间段，将创建6条工作时间配置</p>
              <p>• 可选择月份范围进行批量处理，支持跨多月批量创建</p>
              <p>• 请确保时间段之间不重叠，开始时间小于结束时间</p>
            </div>
          </template>
        </el-alert>
      </el-form-item>
    </el-form>
    
    <template #footer>
      <el-button @click="submitForm" type="primary" :disabled="formLoading">
        确 定 (将创建 {{ totalConfigs }} 条配置)
      </el-button>
      <el-button @click="dialogVisible = false">取 消</el-button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import * as WorkTimeConfigApi from '@/api/bpm/workTimeConfig'

defineOptions({ name: 'WorkTimeConfigBatchForm' })

const { t } = useI18n() // 国际化
const message = useMessage() // 消息弹窗

const props = defineProps<{
  typeOptions: WorkTimeConfigApi.WorkTimeTypeVO[]
}>()

interface TimeSlot {
  startTime: string
  endTime: string
}

const dialogVisible = ref(false) // 弹窗的是否展示
const dialogTitle = ref('批量创建工作时间配置') // 弹窗的标题
const formLoading = ref(false) // 表单的加载中
const formData = ref({
  type: undefined,
  dates: [] as string[],
  timeSlots: [
    { startTime: '09:00', endTime: '12:00' },
    { startTime: '13:30', endTime: '18:30' }
  ] as TimeSlot[]
})
// 修改月份选择器状态为数组，支持多选
const now = new Date()
const nextMonth = new Date(now)
nextMonth.setMonth(now.getMonth() + 1)

const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
const nextMonthStr = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`

const selectedMonths = ref([currentMonthStr, nextMonthStr]) // 默认为当前月份和下个月

const formRules = reactive({
  type: [{ required: true, message: '工时类型不能为空', trigger: 'change' }],
  dates: [{ required: true, message: '请至少选择一个日期', trigger: 'change' }]
})

const formRef = ref() // 表单 Ref

// 时间段验证错误
const timeSlotErrors = ref<{ [key: string]: string }>({})

// 计算总配置数量
const totalConfigs = computed(() => {
  return formData.value.dates.length * formData.value.timeSlots.length
})

/** 验证时间段 */
const validateTimeSlot = (index: number) => {
  const slot = formData.value.timeSlots[index]
  const startKey = `${index}-start`
  const endKey = `${index}-end`

  // 清除之前的错误
  delete timeSlotErrors.value[startKey]
  delete timeSlotErrors.value[endKey]

  if (!slot.startTime || !slot.endTime) {
    return
  }

  if (slot.startTime >= slot.endTime) {
    timeSlotErrors.value[startKey] = '开始时间必须早于结束时间'
    timeSlotErrors.value[endKey] = '结束时间必须晚于开始时间'
  }
}

/** 获取时间段错误信息 */
const getTimeSlotError = (index: number, type: 'start' | 'end') => {
  const key = `${index}-${type}`
  return timeSlotErrors.value[key] || ''
}

/** 添加时间段 */
const addTimeSlot = () => {
  formData.value.timeSlots.push({ startTime: '', endTime: '' })
}

/** 删除时间段 */
const removeTimeSlot = (index: number) => {
  if (formData.value.timeSlots.length > 1) {
    // 清除相关的错误信息
    delete timeSlotErrors.value[`${index}-start`]
    delete timeSlotErrors.value[`${index}-end`]

    formData.value.timeSlots.splice(index, 1)

    // 重新索引错误信息
    const newErrors: { [key: string]: string } = {}
    Object.keys(timeSlotErrors.value).forEach(key => {
      const [idx, type] = key.split('-')
      const oldIndex = parseInt(idx)
      if (oldIndex > index) {
        const newKey = `${oldIndex - 1}-${type}`
        newErrors[newKey] = timeSlotErrors.value[key]
      } else if (oldIndex < index) {
        newErrors[key] = timeSlotErrors.value[key]
      }
    })
    timeSlotErrors.value = newErrors
  }
}

/** 选择当前月份的所有日期 */
const selectCurrentMonth = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  // 获取当前月份的天数
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // 生成当前月份的所有日期
  const dates: string[] = []
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    dates.push(dateStr)
  }

  formData.value.dates = dates
  message.success(`已选择当前月份的所有日期，共 ${dates.length} 天`)
}

/** 选择当前月份的工作日（周一到周五） */
const selectWorkdays = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  // 获取当前月份的天数
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // 生成当前月份的工作日
  const workdays: string[] = []
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day)
    const dayOfWeek = date.getDay() // 0=周日, 1=周一, ..., 6=周六

    // 只选择周一到周五（排除周六周日）
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      workdays.push(dateStr)
    }
  }

  formData.value.dates = workdays
  message.success(`已选择当前月份的工作日（周一至周五），共 ${workdays.length} 天`)
}

/** 清空选择的日期 */
const clearDates = () => {
  formData.value.dates = []
  message.info('已清空选择的日期')
}

/** 选择指定月份的所有日期 */
const selectSpecificMonth = () => {
  if (!selectedMonths.value || !Array.isArray(selectedMonths.value) || selectedMonths.value.length < 2) {
    message.warning('请先选择月份范围')
    return
  }

  const dates: string[] = []
  const startMonthStr = selectedMonths.value[0]
  const endMonthStr = selectedMonths.value[1]
  
  if (!startMonthStr || !endMonthStr) {
    message.warning('月份范围不完整')
    return
  }
  
  const startDate = new Date(startMonthStr)
  const endDate = new Date(endMonthStr)
  
  // 确保开始月份在结束月份之前
  if (startDate > endDate) {
    message.warning('开始月份必须早于结束月份')
    return
  }
  
  // 计算月份范围内的所有月份
  const months: Date[] = []
  const currentDate = new Date(startDate)
  
  while (currentDate <= endDate) {
    months.push(new Date(currentDate))
    currentDate.setMonth(currentDate.getMonth() + 1)
  }
  
  // 为每个月生成所有日期
  months.forEach(monthDate => {
    const year = monthDate.getFullYear()
    const month = monthDate.getMonth()
    
    // 获取当前月份的天数
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    
    // 生成当前月份的所有日期
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      dates.push(dateStr)
    }
  })
  
  formData.value.dates = dates
  
  // 生成月份范围描述
  const startMonthName = `${startDate.getFullYear()}年${startDate.getMonth() + 1}月`
  const endMonthName = `${endDate.getFullYear()}年${endDate.getMonth() + 1}月`
  const monthRangeDesc = months.length > 2 
    ? `${startMonthName}至${endMonthName}(共${months.length}个月)` 
    : `${startMonthName}至${endMonthName}`
  
  message.success(`已选择${monthRangeDesc}的所有日期，共 ${dates.length} 天`)
}

/** 选择指定月份的工作日（周一到周五） */
const selectSpecificMonthWorkdays = () => {
  if (!selectedMonths.value || !Array.isArray(selectedMonths.value) || selectedMonths.value.length < 2) {
    message.warning('请先选择月份范围')
    return
  }

  const workdays: string[] = []
  const startMonthStr = selectedMonths.value[0]
  const endMonthStr = selectedMonths.value[1]
  
  if (!startMonthStr || !endMonthStr) {
    message.warning('月份范围不完整')
    return
  }
  
  const startDate = new Date(startMonthStr)
  const endDate = new Date(endMonthStr)
  
  // 确保开始月份在结束月份之前
  if (startDate > endDate) {
    message.warning('开始月份必须早于结束月份')
    return
  }
  
  // 计算月份范围内的所有月份
  const months: Date[] = []
  const currentDate = new Date(startDate)
  
  while (currentDate <= endDate) {
    months.push(new Date(currentDate))
    currentDate.setMonth(currentDate.getMonth() + 1)
  }
  
  // 为每个月生成工作日
  months.forEach(monthDate => {
    const year = monthDate.getFullYear()
    const month = monthDate.getMonth()
    
    // 获取当前月份的天数
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    
    // 生成当前月份的工作日
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const dayOfWeek = date.getDay() // 0=周日, 1=周一, ..., 6=周六
      
      // 只选择周一到周五（排除周六周日）
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        workdays.push(dateStr)
      }
    }
  })
  
  formData.value.dates = workdays
  
  // 生成月份范围描述
  const startMonthName = `${startDate.getFullYear()}年${startDate.getMonth() + 1}月`
  const endMonthName = `${endDate.getFullYear()}年${endDate.getMonth() + 1}月`
  const monthRangeDesc = months.length > 2 
    ? `${startMonthName}至${endMonthName}(共${months.length}个月)` 
    : `${startMonthName}至${endMonthName}`
  
  message.success(`已选择${monthRangeDesc}的工作日（周一至周五），共 ${workdays.length} 天`)
}

/** 打开弹窗 */
const open = async () => {
  dialogVisible.value = true
  resetForm()
}

/** 提交表单 */
const emit = defineEmits(['success']) // 定义 success 事件，用于操作成功后的回调
const submitForm = async () => {
  // 校验表单
  if (!formRef) return
  const valid = await formRef.value.validate()
  if (!valid) return
  
  // 校验时间段
  for (let i = 0; i < formData.value.timeSlots.length; i++) {
    const slot = formData.value.timeSlots[i]
    if (!slot.startTime || !slot.endTime) {
      message.error(`第${i + 1}个时间段的开始时间和结束时间不能为空`)
      return
    }
    if (slot.startTime >= slot.endTime) {
      message.error(`第${i + 1}个时间段的开始时间必须小于结束时间`)
      return
    }
  }
  
  // 构建批量创建数据
  const configs: WorkTimeConfigApi.WorkTimeConfigSaveReqVO[] = []
  
  formData.value.dates.forEach(date => {
    formData.value.timeSlots.forEach(slot => {
      configs.push({
        type: formData.value.type!,
        date: date,
        startTime: slot.startTime,
        endTime: slot.endTime
      })
    })
  })
  
  // 提交请求
  formLoading.value = true
  try {
    const batchData: WorkTimeConfigApi.WorkTimeConfigBatchSaveReqVO = {
      configs: configs
    }
    
    await WorkTimeConfigApi.batchCreateWorkTimeConfig(batchData)
    message.success(`成功创建 ${configs.length} 条工作时间配置`)
    dialogVisible.value = false
    // 发送操作成功的事件
    emit('success')
  } finally {
    formLoading.value = false
  }
}

/** 重置表单 */
const resetForm = () => {
  formData.value = {
    type: undefined,
    dates: [],
    timeSlots: [
      { startTime: '09:00', endTime: '12:00' },
      { startTime: '13:30', endTime: '18:30' }
    ]
  }
  
  // 重置为当前月份和下个月
  const now = new Date()
  const nextMonth = new Date(now)
  nextMonth.setMonth(now.getMonth() + 1)
  
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const nextMonthStr = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`
  
  selectedMonths.value = [currentMonthStr, nextMonthStr]
  
  timeSlotErrors.value = {} // 清除时间段错误
  formRef.value?.resetFields()
}

defineExpose({ open }) // 提供 open 方法，用于打开弹窗
</script>

<style scoped>
.el-row {
  margin-bottom: 0;
}

.date-selection-wrapper {
  width: 100%;
}

.date-picker-container {
  position: relative;
  margin-bottom: 8px;
}

.selected-dates-count {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  color: #606266;
  background: rgba(255, 255, 255, 0.9);
  padding: 2px 8px;
  border-radius: 10px;
  pointer-events: none;
  display: flex;
  align-items: center;
  gap: 8px;
}

.count-number {
  font-weight: bold;
  color: #409eff;
}

.month-count {
  font-size: 12px;
  color: #409eff;
  font-weight: normal;
}

.date-actions-container {
  display: flex;
  margin-top: 16px;
  flex-wrap: wrap;
  gap: 16px;
}

.month-selector {
  flex: 0 0 220px;
  margin-right: 8px;
  margin-bottom: 12px;
}

.section-title {
  font-size: 13px;
  color: #606266;
  margin-bottom: 8px;
  font-weight: 500;
}

.button-groups {
  display: flex;
  flex: 1;
  gap: 24px;
}

.button-group {
  flex: 1;
  min-width: 200px;
  background: #f9f9f9;
  border-radius: 4px;
  padding: 10px;
  border: 1px solid #ebeef5;
}

.button-row {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.clear-action {
  display: flex;
  align-items: flex-end;
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
  .button-groups {
    flex-direction: column;
    gap: 16px;
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
    margin-top: 16px;
  }
  
  .clear-action .el-button {
    width: 100%;
  }
  
  .month-action-group {
    margin-bottom: 16px;
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
