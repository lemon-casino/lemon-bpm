<template>
  <Dialog v-model="dialogVisible" :title="dialogTitle" width="600px">
    <el-form
      ref="formRef"
      v-loading="formLoading"
      :model="formData"
      :rules="formRules"
      label-width="100px"
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
      <el-form-item label="日期" prop="date">
        <el-date-picker
          v-model="formData.date"
          type="date"
          placeholder="请选择日期"
          style="width: 100%"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
        />
      </el-form-item>
      <el-form-item label="开始时间" prop="startTime">
        <el-time-picker
          v-model="formData.startTime"
          placeholder="请选择开始时间"
          style="width: 100%"
          format="HH:mm"
          value-format="HH:mm"
        />
      </el-form-item>
      <el-form-item label="结束时间" prop="endTime">
        <el-time-picker
          v-model="formData.endTime"
          placeholder="请选择结束时间"
          style="width: 100%"
          format="HH:mm"
          value-format="HH:mm"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="submitForm" type="primary" :disabled="formLoading">确 定</el-button>
      <el-button @click="dialogVisible = false">取 消</el-button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import * as WorkTimeConfigApi from '@/api/bpm/workTimeConfig'

defineOptions({ name: 'WorkTimeConfigForm' })

const { t } = useI18n() // 国际化
const message = useMessage() // 消息弹窗

const props = defineProps<{
  typeOptions: WorkTimeConfigApi.WorkTimeTypeVO[]
}>()

const dialogVisible = ref(false) // 弹窗的是否展示
const dialogTitle = ref('') // 弹窗的标题
const formLoading = ref(false) // 表单的加载中：1）修改时的数据加载；2）提交的按钮禁用
const formType = ref('') // 表单的类型：create - 新增；update - 修改
const formData = ref({
  id: undefined,
  type: undefined,
  date: '',
  startTime: '',
  endTime: ''
})
/** 验证开始时间 */
const validateStartTime = (rule: any, value: any, callback: any) => {
  if (!value) {
    callback()
    return
  }

  if (formData.value.endTime && value >= formData.value.endTime) {
    callback(new Error('开始时间必须早于结束时间'))
    return
  }

  callback()
}

/** 验证结束时间 */
const validateEndTime = (rule: any, value: any, callback: any) => {
  if (!value) {
    callback()
    return
  }

  if (formData.value.startTime && value <= formData.value.startTime) {
    callback(new Error('结束时间必须晚于开始时间'))
    return
  }

  callback()
}

const formRules = reactive({
  type: [{ required: true, message: '工时类型不能为空', trigger: 'change' }],
  date: [{ required: true, message: '日期不能为空', trigger: 'change' }],
  startTime: [
    { required: true, message: '开始时间不能为空', trigger: 'change' },
    { validator: validateStartTime, trigger: ['change', 'blur'] }
  ],
  endTime: [
    { required: true, message: '结束时间不能为空', trigger: 'change' },
    { validator: validateEndTime, trigger: ['change', 'blur'] }
  ]
})
const formRef = ref() // 表单 Ref

/** 打开弹窗 */
const open = async (row?: WorkTimeConfigApi.WorkTimeConfigVO) => {
  dialogVisible.value = true
  resetForm()
  if (row) {
    formType.value = 'update'
    dialogTitle.value = '修改工作时间配置'
    // 处理数据格式
    const data = { ...row }
    // 处理日期格式
    if (Array.isArray(data.date)) {
      data.date = `${data.date[0]}-${data.date[1].toString().padStart(2, '0')}-${data.date[2].toString().padStart(2, '0')}`
    }
    // 处理时间格式
    if (Array.isArray(data.startTime)) {
      data.startTime = `${data.startTime[0].toString().padStart(2, '0')}:${data.startTime[1].toString().padStart(2, '0')}`
    }
    if (Array.isArray(data.endTime)) {
      data.endTime = `${data.endTime[0].toString().padStart(2, '0')}:${data.endTime[1].toString().padStart(2, '0')}`
    }
    formData.value = data
  } else {
    formType.value = 'create'
    dialogTitle.value = '新增工作时间配置'
  }
}

/** 提交表单 */
const emit = defineEmits(['success']) // 定义 success 事件，用于操作成功后的回调
const submitForm = async () => {
  // 校验表单
  if (!formRef) return
  const valid = await formRef.value.validate()
  if (!valid) return

  // 校验时间逻辑
  if (formData.value.startTime >= formData.value.endTime) {
    message.error('开始时间必须小于结束时间')
    return
  }

  // 提交请求
  formLoading.value = true
  try {
    const data: WorkTimeConfigApi.WorkTimeConfigSaveReqVO = {
      id: formData.value.id,
      type: formData.value.type,
      date: formData.value.date,
      startTime: formData.value.startTime,
      endTime: formData.value.endTime
    }

    if (formType.value === 'create') {
      await WorkTimeConfigApi.createWorkTimeConfig(data)
      message.success(t('common.createSuccess'))
    } else {
      await WorkTimeConfigApi.updateWorkTimeConfig(data as any)
      message.success(t('common.updateSuccess'))
    }
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
    id: undefined,
    type: undefined,
    date: '',
    startTime: '',
    endTime: ''
  }
  formRef.value?.resetFields()
}

defineExpose({ open }) // 提供 open 方法，用于打开弹窗
</script>
