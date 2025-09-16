<template>
  <Dialog v-model="dialogVisible" :title="dialogTitle" width="500px">
    <el-form
      ref="formRef"
      v-loading="formLoading"
      :model="formData"
      :rules="formRules"
      label-width="100px"
    >
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
import * as FactoryConfigApi from '@/api/bpm/FactoryConfig'

defineOptions({ name: 'WorkTimeTypeForm' })

const { t } = useI18n() // 国际化
const message = useMessage() // 消息弹窗

const dialogVisible = ref(false) // 弹窗的是否展示
const dialogTitle = ref('') // 弹窗的标题
const formLoading = ref(false) // 表单的加载中：1）修改时的数据加载；2）提交的按钮禁用
const formType = ref('') // 表单的类型：create - 新增；update - 修改
const formData = ref({
  id: undefined,
  name: ''
})
const formRules = reactive({
  name: [{ required: true, message: '类型名称不能为空', trigger: 'blur' }]
})
const formRef = ref() // 表单 Ref

/** 打开弹窗 */
const open = async (row?: FactoryConfigApi.FactoryTypeVO) => {
  dialogVisible.value = true
  resetForm()
  if (row) {
    formType.value = 'update'
    dialogTitle.value = '修改类型'
    formData.value = { ...row }
  } else {
    formType.value = 'create'
    dialogTitle.value = '新增类型'
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
    const data = formData.value as unknown as FactoryConfigApi.FactoryTypeVO
    if (formType.value === 'create') {
      await FactoryConfigApi.createFactoryType(data)
      message.success(t('common.createSuccess'))
    } else {
      await FactoryConfigApi.updateFactoryType(data)
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

<style scoped>
/* 移动端适配 */
@media (max-width: 768px) {
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
  
  :deep(.el-input) {
    width: 100% !important;
  }
  
  :deep(.el-input__count) {
    font-size: 11px;
    bottom: 0;
    right: 5px;
  }
  
  :deep(.el-dialog__footer .el-button) {
    width: 100%;
    margin: 5px 0;
    padding: 8px 15px;
    font-size: 14px;
  }
}
</style>
