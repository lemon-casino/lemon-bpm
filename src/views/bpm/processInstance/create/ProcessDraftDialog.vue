<template>
  <el-dialog
    v-model="visible"
    title="流程草稿箱"
    width="400px"
    :destroy-on-close="true"
    :close-on-click-modal="false"
    append-to-body
  >
    <div class="draft-dialog-content">
      <p class="draft-dialog-desc">请选择您要进行的操作：</p>
      
      <div class="draft-dialog-buttons">
        <el-row :gutter="15">
          <el-col :span="12">
            <el-button type="primary" @click="showSaveForm" class="draft-btn">
              <el-icon class="mr-1"><Document /></el-icon>
              保存当前表单
            </el-button>
          </el-col>
          <el-col :span="12">
            <el-button type="info" @click="handleShowList" class="draft-btn">
              <el-icon class="mr-1"><List /></el-icon>
              查看草稿列表
            </el-button>
          </el-col>
        </el-row>
      </div>
    </div>
    
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="close">取消</el-button>
      </span>
    </template>
  </el-dialog>
  
  <!-- 保存草稿表单对话框 -->
  <el-dialog
    v-model="saveFormVisible"
    title="保存草稿"
    width="400px"
    :destroy-on-close="true"
    :close-on-click-modal="false"
    append-to-body
  >
    <div class="save-form-content">
      <el-form :model="saveForm" ref="saveFormRef" label-position="top">
        <el-form-item 
          label="草稿名称" 
          prop="name" 
          :rules="[{ required: true, message: '请输入草稿名称', trigger: 'blur' }]"
        >
          <el-input 
            v-model="saveForm.name" 
            placeholder="请输入草稿名称" 
            clearable 
          />
        </el-form-item>
      </el-form>
    </div>
    
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="saveFormVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveDraft" :loading="savingDraft">保存</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { useMessage } from '@/hooks/web/useMessage'
import * as DraftApi from '@/api/bpm/draft'
import { Document, List } from '@element-plus/icons-vue'
import type { FormInstance } from 'element-plus'

const props = defineProps({
  processDefinitionId: {
    type: String,
    required: true
  },
  processDefinitionKey: {
    type: String,
    required: true
  },
  modelId: {
    type: String,
    required: true
  },
  formData: {
    type: Object,
    required: true
  },
  startUserSelectAssignees: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['save-success', 'show-list', 'cancel'])

const message = useMessage()
const visible = ref(false)
const savingDraft = ref(false)
const saveFormVisible = ref(false)
const saveFormRef = ref<FormInstance>()
const saveForm = ref({
  name: ''
})

// 打开对话框
const open = () => {
  visible.value = true
}

// 关闭对话框
const close = () => {
  visible.value = false
  emit('cancel')
}

// 显示保存表单对话框
const showSaveForm = () => {
  // 检查表单数据是否为空
  if (!props.formData || Object.keys(props.formData).length === 0) {
    message.warning('表单数据为空，无法保存草稿')
    return
  }
  
  // 设置默认草稿名称
  saveForm.value.name = `${props.processDefinitionKey}_${new Date().toLocaleDateString()}`
  
  // 关闭主对话框，显示保存表单对话框
  visible.value = false
  saveFormVisible.value = true
}

// 保存草稿
const handleSaveDraft = async () => {
  // 表单验证
  if (!saveFormRef.value) return
  
  await saveFormRef.value.validate(async (valid) => {
    if (!valid) {
      return false
    }
    
    savingDraft.value = true
    try {
      // 构建草稿数据，按照后端API的要求格式化数据
      const draftData = {
        processDefinitionKey: props.processDefinitionKey,
        businessKey: `draft_${Date.now()}`, // 生成临时业务标识
        variables: props.formData,
        modelId: props.modelId,
        startUserSelectAssignees: props.startUserSelectAssignees,
        name: saveForm.value.name // 添加名称
      }
      
      // 调用API保存草稿
      const draftId = await DraftApi.saveDraft(draftData)
      message.success('草稿保存成功')
      emit('save-success', draftId)
      
      // 关闭对话框
      saveFormVisible.value = false
    } catch (error) {
      console.error('保存草稿失败', error)
      message.error('保存草稿失败')
    } finally {
      savingDraft.value = false
    }
  })
}

// 显示草稿列表
const handleShowList = () => {
  emit('show-list')
  close()
}

defineExpose({
  open,
  close
})
</script>

<style lang="scss" scoped>
.draft-dialog-content {
  padding: 10px 0;
}

.draft-dialog-desc {
  margin-bottom: 20px;
  font-size: 14px;
  color: var(--el-text-color-primary);
  text-align: center;
}

.draft-dialog-buttons {
  .draft-btn {
    width: 100%;
    justify-content: center;
    height: 40px;
    font-size: 14px;
    
    .el-icon {
      margin-right: 8px;
      font-size: 18px;
      vertical-align: middle;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
  }
}

.save-form-content {
  padding: 10px 0;
}

:deep(.el-dialog__header) {
  margin-right: 0;
  padding: 15px 20px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  
  .el-dialog__title {
    font-size: 16px;
    font-weight: 600;
  }
}

:deep(.el-dialog__body) {
  padding: 20px;
}

:deep(.el-dialog__footer) {
  padding: 10px 20px 15px;
  border-top: 1px solid var(--el-border-color-lighter);
}

:deep(.el-button .el-icon) {
  margin-right: 4px;
  font-size: 16px;
  vertical-align: middle;
}

/* 响应式调整 */
@media (max-width: 576px) {
  .draft-dialog-buttons {
    .el-row {
      margin-left: 0 !important;
      margin-right: 0 !important;
    }
    
    .el-col {
      padding-left: 0 !important;
      padding-right: 0 !important;
      margin-bottom: 10px;
      width: 100%;
    }
  }
}
</style> 