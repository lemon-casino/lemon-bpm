<template>
  <Dialog v-model="dialogVisible" :title="dialogTitle" width="600px">
    <el-form ref="formRef" v-loading="formLoading" :model="formData" label-width="100px">
      <el-form-item label="类型" prop="type">
        <el-select v-model="formData.type" placeholder="请选择类型" style="width: 100%">
          <el-option
            v-for="item in typeOptions"
            :key="item.id"
            :label="item.name"
            :value="item.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="名称" prop="name">
        <el-input v-model="formData.name" placeholder="请输入名称" clearable style="width: 100%" />
      </el-form-item>
      <el-form-item label="信息" prop="name">
        <el-input
          v-model="formData.atmCard"
          placeholder="请输入信息"
          clearable
          style="width: 100%"
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

defineOptions({ name: 'WorkTimeConfigForm' })

const { t } = useI18n() // 国际化
const message = useMessage() // 消息弹窗

const props = defineProps<{
  typeOptions: FactoryConfigApi.FactoryTypeVO[]
}>()

const dialogVisible = ref(false) // 弹窗的是否展示
const dialogTitle = ref('') // 弹窗的标题
const formLoading = ref(false) // 表单的加载中：1）修改时的数据加载；2）提交的按钮禁用
const formType = ref('') // 表单的类型：create - 新增；update - 修改
const formData = ref({
  id: undefined,
  type: undefined,
  name: '',
  atmCard: ''
})

const formRef = ref() // 表单 Ref

/** 打开弹窗 */
const open = async (row?: FactoryConfigApi.WorkTimeConfigVO) => {
  dialogVisible.value = true
  resetForm()
  if (row) {
    formType.value = 'update'
    dialogTitle.value = '修改配置'
    // 处理数据格式
    formData.value = { ...row }
  } else {
    formType.value = 'create'
    dialogTitle.value = '新增配置'
    // 新增模式下默认选择第一个类型选项
    if (props.typeOptions && props.typeOptions.length > 0) {
      formData.value.type = props.typeOptions[0].id
    }
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
    const data = {
      id: formData.value.id,
      type: formData.value.type,
      name: formData.value.name,
      atmCard: formData.value.atmCard
    }

    if (formType.value === 'create') {
      await FactoryConfigApi.createFactoryConfig(data)
      message.success(t('common.createSuccess'))
    } else {
      await FactoryConfigApi.updateFactoryConfig(data as any)
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
  
  :deep(.el-input),
  :deep(.el-select) {
    width: 100% !important;
  }
  
  :deep(.el-dialog__footer .el-button) {
    width: 100%;
    margin: 5px 0;
    padding: 8px 15px;
    font-size: 14px;
  }
}
</style>