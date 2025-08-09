<template>
  <Dialog v-model="dialogVisible" :title="dialogTitle" width="500px">
    <el-form
      ref="formRef"
      v-loading="formLoading"
      :model="formData"
      :rules="formRules"
      label-width="100px"
    >
      <el-form-item label="类型编码" prop="type">
        <el-input-number
          v-model="formData.type"
          :min="1"
          :max="999"
          placeholder="请输入类型编码"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="类型名称" prop="name">
        <el-input
          v-model="formData.name"
          placeholder="请输入类型名称"
          maxlength="50"
          show-word-limit
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

defineOptions({ name: 'WorkTimeTypeForm' })

const { t } = useI18n() // 国际化
const message = useMessage() // 消息弹窗

const dialogVisible = ref(false) // 弹窗的是否展示
const dialogTitle = ref('') // 弹窗的标题
const formLoading = ref(false) // 表单的加载中：1）修改时的数据加载；2）提交的按钮禁用
const formType = ref('') // 表单的类型：create - 新增；update - 修改
const formData = ref({
  id: undefined,
  type: undefined,
  name: ''
})
const formRules = reactive({
  type: [{ required: true, message: '类型编码不能为空', trigger: 'blur' }],
  name: [{ required: true, message: '类型名称不能为空', trigger: 'blur' }]
})
const formRef = ref() // 表单 Ref

/** 打开弹窗 */
const open = async (row?: WorkTimeConfigApi.WorkTimeTypeVO) => {
  dialogVisible.value = true
  resetForm()
  if (row) {
    formType.value = 'update'
    dialogTitle.value = '修改工时类型'
    formData.value = { ...row }
  } else {
    formType.value = 'create'
    dialogTitle.value = '新增工时类型'
  }
}

/** 提交表单 */
const emit = defineEmits(['success']) // 定义 success 事件，用于操作成功后的回调
const submitForm = async () => {
  // 校验表单
  if (!formRef) return
  const valid = await formRef.value.validate()
  if (!valid) return
  // 提交请求
  formLoading.value = true
  try {
    const data = formData.value as unknown as WorkTimeConfigApi.WorkTimeTypeVO
    if (formType.value === 'create') {
      await WorkTimeConfigApi.createWorkTimeType(data)
      message.success(t('common.createSuccess'))
    } else {
      await WorkTimeConfigApi.updateWorkTimeType(data)
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
    name: ''
  }
  formRef.value?.resetFields()
}

defineExpose({ open }) // 提供 open 方法，用于打开弹窗
</script>
