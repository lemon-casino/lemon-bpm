<script setup lang="ts">
defineOptions({ name: 'BpmAgentManagement' })
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useI18n } from '@/hooks/web/useI18n'
import { useTable } from '@/hooks/web/useTable'
import { useUserStore } from '@/store/modules/user'
import { useValidator } from '@/hooks/web/useValidator'
import * as TaskTransferConfigApi from '@/api/bpm/task-transfer-config'
import type { TaskTransferConfigVO, TaskTransferConfigSaveReqVO } from '@/api/bpm/task-transfer-config'
import { DICT_TYPE } from '@/utils/dict'
import { getSimpleUserList } from '@/api/system/user'
import type { ProcessDefinitionVO } from '@/api/bpm/model'
import { getModelVersionList, ModelVersionVO } from '@/api/bpm/model'
import { usePermission } from '@/hooks/web/usePermission'
import { useMessage } from '@/hooks/web/useMessage'
import request from '@/config/axios'
import { formatDate } from '@/utils/formatTime'
import { transferRunningTasks, BpmTaskTransferAllReqVO } from '@/api/bpm/task'

const { t } = useI18n() // 国际化
const message = useMessage() // 消息弹窗
const { required } = useValidator() // 表单校验

// 列表相关
const loading = ref(false)
const list = ref<TaskTransferConfigVO[]>([])
const total = ref(0)

// 状态选项
const statusOptions = [
  { label: '全部', value: null },
  { label: '待生效', value: 0 },
  { label: '代理中', value: 1 },
  { label: '已过期', value: 2 },
  { label: '已撤销', value: 3 }
]

// 查询对象
const queryParams = reactive({
  fromUserId: undefined as number | undefined,
  status: undefined as number | undefined,
  modelId: undefined as string | undefined,
  modelVersion: undefined as number | undefined,
  pageNo: 1,
  pageSize: 10
})

// 弹窗表单
const formRef = ref()
const formData = ref<TaskTransferConfigSaveReqVO>({
  id: undefined,
  fromUserId: undefined as unknown as number,
  toUserId: undefined as unknown as number,
  modelId: undefined,
  modelVersion: undefined,
  startTime: undefined as unknown as number,
  endTime: undefined as unknown as number,
  reason: undefined
})

// 弹窗控制
const dialogVisible = ref(false)
const dialogTitle = ref('')

// 用户列表
const userListLoading = ref(false)
const userList = ref<any[]>([])
const userMap = ref<Map<number, string>>(new Map())

// 流程模型列表
const modelLoading = ref(false)
const modelList = ref<ModelVersionVO[]>([])
// 流程模型映射 (id -> name)
const modelMap = ref<Map<string, string>>(new Map())

// 流程版本列表 (根据选中的模型动态变化)
const versionList = ref<number[]>([])
// 模型版本映射 (modelId+version -> 显示名称)
const modelVersionMap = ref<Map<string, string>>(new Map())

// 权限判断
const { hasPermission } = usePermission()
const hasCreatePermission = computed(() => hasPermission(['bpm:task-transfer-config:create']))
const hasUpdatePermission = computed(() => hasPermission(['bpm:task-transfer-config:update']))
const hasDeletePermission = computed(() => hasPermission(['bpm:task-transfer-config:delete']))

// 表单校验
const validateToUser = (rule: any, value: any, callback: any) => {
  if (value === formData.value.fromUserId) {
    callback(new Error('代理人不能是被代理人本人'))
  } else {
    callback()
  }
}

// 表单校验规则
const rules = {
  fromUserId: [
    { required: true, message: '请选择被代理人', trigger: 'change' }
  ],
  toUserId: [
    { required: true, message: '请选择代理人', trigger: 'change' },
    { validator: validateToUser, trigger: 'change' }
  ],
  startTime: [
    { required: true, message: '请选择开始时间', trigger: 'change' }
  ],
  endTime: [
    { required: true, message: '请选择结束时间', trigger: 'change' }
  ],
  reason: [
    { required: true, message: '请输入原因说明', trigger: 'blur' },
    { min: 2, max: 200, message: '长度在 2 到 200 个字符', trigger: 'blur' }
  ]
}

// 过滤用户列表（排除已选择的被代理人）
const filteredUserList = computed(() => {
  if (!formData.value.fromUserId) {
    return userList.value
  }
  return userList.value.filter(user => user.id !== formData.value.fromUserId)
})

// 监听模型选择，更新版本列表
watch(() => queryParams.modelId, (newModelId) => {
  if (newModelId) {
    // 查询条件中选择了模型，更新对应的版本列表
    const model = modelList.value.find(model => model.id === newModelId)
    versionList.value = model?.versions || []
  } else {
    versionList.value = []
    queryParams.modelVersion = undefined
  }
})

// 监听表单中的模型选择，更新版本列表
watch(() => formData.value.modelId, (newModelId) => {
  if (newModelId) {
    // 表单中选择了模型，更新对应的版本列表
    const model = modelList.value.find(model => model.id === newModelId)
    versionList.value = model?.versions || []
    // 默认选择最新版本
    if (model?.versions && model.versions.length > 0) {
      // 通常版本号是递增的，取最大值
      formData.value.modelVersion = Math.max(...model.versions)
    } else {
      formData.value.modelVersion = undefined
    }
  } else {
    versionList.value = []
    formData.value.modelVersion = undefined
  }
})

// 时间选择相关
const startDateRef = ref()
const endDateRef = ref()
const startTimeRef = ref()
const endTimeRef = ref()

// 当前选中的快捷选项
const activeShortcut = ref('')

// 获取列表数据
const getListData = async () => {
  try {
    loading.value = true
    // 处理查询参数，确保类型正确
    const params = {
      ...queryParams,
      // 如果status存在且不是null，确保转换为数字类型
      status: queryParams.status !== null && queryParams.status !== undefined ? Number(queryParams.status) : undefined,
      // 确保modelVersion是数字类型
      modelVersion: queryParams.modelVersion !== undefined ? Number(queryParams.modelVersion) : undefined
    }
    const res = await TaskTransferConfigApi.getTaskTransferConfigPage(params)
    // 处理数据
    list.value = res.list.map(item => ({
      ...item,
      fromUserName: item.fromUserName || userMap.value.get(item.fromUserId),
      toUserName: item.toUserName || userMap.value.get(item.toUserId),
      // 根据modelId和modelVersion组合显示
      modelName: item.modelName || (item.modelId ? modelMap.value.get(item.modelId) || '未知模型' : '全部流程'),
      startTimeFormatted: formatDate(item.startTime),
      endTimeFormatted: formatDate(item.endTime),
      createTimeFormatted: formatDate(item.createTime)
    }))
    total.value = res.total
  } catch (error) {
    console.error('获取列表数据失败:', error)
    message.error('获取列表数据失败')
  } finally {
    loading.value = false
  }
}

// 打开新增弹窗
const openAdd = () => {
  dialogTitle.value = '新增代理配置'
  dialogVisible.value = true
  
  // 重置表单数据
  formData.value = {
    id: undefined,
    fromUserId: undefined as unknown as number,
    toUserId: undefined as unknown as number,
    modelId: undefined,
    modelVersion: undefined,
    startTime: undefined as unknown as number,
    endTime: undefined as unknown as number,
    reason: undefined
  }
  
  // 清空时间选择器
  startDateRef.value = undefined
  endDateRef.value = undefined
  startTimeRef.value = undefined
  endTimeRef.value = undefined
  
  // 如果存在表单实例，重置验证
  if (formRef.value) {
    formRef.value.resetFields()
  }
}

// 打开编辑弹窗
const openEdit = (row: TaskTransferConfigVO) => {
  dialogTitle.value = '编辑代理配置'
  dialogVisible.value = true
  
  // 设置表单数据
  formData.value = {
    id: row.id,
    fromUserId: row.fromUserId,
    toUserId: row.toUserId,
    modelId: row.modelId,
    modelVersion: row.modelVersion,
    startTime: row.startTime,
    endTime: row.endTime,
    reason: row.reason
  }
  
  // 设置时间选择器的值
  if (row.startTime) {
    const startDateTime = new Date(row.startTime);
    startDateRef.value = formatDate(startDateTime, 'YYYY-MM-DD');
    startTimeRef.value = formatDate(startDateTime, 'HH:mm:ss');
  }
  
  if (row.endTime) {
    const endDateTime = new Date(row.endTime);
    endDateRef.value = formatDate(endDateTime, 'YYYY-MM-DD');
    endTimeRef.value = formatDate(endDateTime, 'HH:mm:ss');
  }
}

// 提交表单
const submitForm = async () => {
  if (!formRef.value) return
  await formRef.value.validate()
  
  try {
    loading.value = true
    const data = {
      ...formData.value
    }

    if (data.id) {
      // 编辑时保留id
      await TaskTransferConfigApi.updateTaskTransferConfig(data)
      message.success('修改成功')
    } else {
      // 新增时删除id字段
      delete data.id
      await TaskTransferConfigApi.createTaskTransferConfig(data)
      message.success('新增成功')
    }
    
    dialogVisible.value = false
    await getListData()
  } catch (error) {
    console.error('提交表单失败:', error)
    message.error('提交失败')
  } finally {
    loading.value = false
  }
}

// 删除
const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('是否确认删除?', '警告')
    await TaskTransferConfigApi.deleteTaskTransferConfig(row.id)
    message.success('删除成功')
    await getListData()
  } catch {
    // 取消删除
  }
}

// 撤销
const handleRevoke = async (row) => {
  try {
    await ElMessageBox.confirm('是否确认撤销该代理配置?', '警告')
    await TaskTransferConfigApi.revokeTaskTransferConfig(row.id)
    message.success('撤销成功')
    await getListData()
  } catch {
    // 取消撤销
  }
}

// 处理时间选择
const handleTimeChange = () => {
  const startDate = startDateRef.value
  const endDate = endDateRef.value
  const startTime = startTimeRef.value || '00:00:00'
  const endTime = endTimeRef.value || '23:59:59'

  if (startDate && endDate) {
    // 转换为时间戳
    const startDateTime = new Date(`${startDate} ${startTime}`).getTime()
    const endDateTime = new Date(`${endDate} ${endTime}`).getTime()
    formData.value.startTime = startDateTime
    formData.value.endTime = endDateTime
  } else {
    formData.value.startTime = undefined
    formData.value.endTime = undefined
  }
}

// 快捷选项处理
const handleQuickSelect = (type: 'week' | 'month') => {
  const now = new Date()
  const start = new Date()
  const end = new Date()
  
  if (type === 'week') {
    end.setTime(start.getTime() + 3600 * 1000 * 24 * 7)
  } else {
    end.setTime(start.getTime() + 3600 * 1000 * 24 * 30)
  }
  
  // 设置日期
  startDateRef.value = formatDate(start, 'YYYY-MM-DD')
  endDateRef.value = formatDate(end, 'YYYY-MM-DD')
  
  // 设置时间
  startTimeRef.value = '00:00:00'
  endTimeRef.value = '23:59:59'
  
  // 更新表单数据
  handleTimeChange()
}

// 获取用户列表
const getUserList = async () => {
  try {
    userListLoading.value = true
    const res = await getSimpleUserList()
    userList.value = res
    // 构建用户Map
    userMap.value = new Map(res.map(user => [user.id, user.nickname]))
  } catch (error) {
    console.error('获取用户列表失败:', error)
    message.error('获取用户列表失败')
  } finally {
    userListLoading.value = false
  }
}



// 重置表单
const resetForm = () => {
  formData.value = {
    id: undefined,
    fromUserId: undefined,
    toUserId: undefined,
    modelId: undefined,
    modelVersion: undefined,
    startTime: undefined,
    endTime: undefined,
    reason: undefined
  }
  startDateRef.value = ''
  endDateRef.value = ''
  startTimeRef.value = ''
  endTimeRef.value = ''
  activeShortcut.value = ''
  if (formRef.value) {
    formRef.value.resetFields()
  }
}

// 关闭弹窗
const closeDialog = () => {
  dialogVisible.value = false
  resetForm()
}

// 重置查询
const resetQuery = () => {
  // 重置查询参数
  queryParams.fromUserId = undefined
  queryParams.status = undefined
  queryParams.modelId = undefined
  queryParams.modelVersion = undefined
  // 强制重新搜索
  getListData()
}

// 获取状态文本
const getStatusText = (status) => {
  switch (Number(status)) {
    case 0:
      return '待生效'
    case 1:
      return '代理中'
    case 2:
      return '已过期'
    case 3:
      return '已撤销'
    default:
      return '未知状态'
  }
}

// 获取状态类型
const getStatusType = (status) => {
  switch (Number(status)) {
    case 0:
      return 'info'
    case 1:
      return 'success'
    case 2:
      return 'warning'
    case 3:
      return 'danger'
    default:
      return 'info'
  }
}

// 获取流程定义标签类型
const getProcessDefinitionTagType = () => {
  // 固定返回info类型
  return 'info'
}

// 获取流程模型和版本列表
const getModelList = async () => {
  try {
    modelLoading.value = true
    const res = await getModelVersionList()
    modelList.value = res
    
    // 构建模型映射
    modelMap.value = new Map(res.map(model => [model.id, model.name]))
    
    // 构建模型版本映射
    res.forEach(model => {
      model.versions.forEach(version => {
        // 使用 modelId:version 作为键
        const key = `${model.id}:${version}`
        modelVersionMap.value.set(key, `${model.name} v${version}`)
      })
    })
    
    return Promise.resolve()
  } catch (error) {
    console.error('获取流程模型列表失败:', error)
    message.error('获取流程模型列表失败')
    return Promise.reject(error)
  } finally {
    modelLoading.value = false
  }
}

// 正在运行任务转办对话框
const transferRunningDialogVisible = ref(false)
const transferRunningForm = ref<BpmTaskTransferAllReqVO>({
  fromUserId: undefined as unknown as number,
  toUserId: undefined as unknown as number,
  reason: '',
  modelId: undefined,
  version: undefined
})
const transferRunningFormRef = ref()

// 正在运行任务转办对话框的表单校验规则
const transferRunningRules = {
  fromUserId: [
    { required: true, message: '请选择当前审批人', trigger: 'change' }
  ],
  toUserId: [
    { required: true, message: '请选择新审批人', trigger: 'change' },
    { validator: validateToUser, trigger: 'change' }
  ],
  reason: [
    { required: true, message: '请输入转办原因', trigger: 'blur' },
    { min: 2, max: 200, message: '长度在 2 到 200 个字符', trigger: 'blur' }
  ]
}

// 打开正在运行任务转办对话框
const openTransferRunning = () => {
  transferRunningDialogVisible.value = true
  transferRunningForm.value = {
    fromUserId: undefined as unknown as number,
    toUserId: undefined as unknown as number,
    reason: '',
    modelId: undefined,
    version: undefined
  }
  
  // 如果存在表单实例，重置验证
  if (transferRunningFormRef.value) {
    transferRunningFormRef.value.resetFields()
  }
}

// 监听转办表单中的模型选择，更新版本列表
watch(() => transferRunningForm.value.modelId, (newModelId) => {
  if (newModelId) {
    // 表单中选择了模型，更新对应的版本列表
    const model = modelList.value.find(model => model.id === newModelId)
    versionList.value = model?.versions || []
    // 默认选择最新版本
    if (model?.versions && model.versions.length > 0) {
      // 通常版本号是递增的，取最大值
      transferRunningForm.value.version = Math.max(...model.versions)
    } else {
      transferRunningForm.value.version = undefined
    }
  } else {
    versionList.value = []
    transferRunningForm.value.version = undefined
  }
})

// 提交转办表单
const submitTransferRunning = async () => {
  if (!transferRunningFormRef.value) return
  await transferRunningFormRef.value.validate()
  
  try {
    loading.value = true
    
    // 确认是否转办
    await ElMessageBox.confirm('确定要转办正在运行中的任务吗？此操作将改变所有符合条件的任务审批人。', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    // 发送请求
    await transferRunningTasks(transferRunningForm.value)
    message.success('转办成功')
    
    transferRunningDialogVisible.value = false
  } catch (error) {
    console.error('转办失败:', error)
    if (error !== 'cancel') {
      message.error('转办失败')
    }
  } finally {
    loading.value = false
  }
}

// 关闭转办对话框
const closeTransferRunningDialog = () => {
  transferRunningDialogVisible.value = false
  transferRunningForm.value = {
    fromUserId: undefined as unknown as number,
    toUserId: undefined as unknown as number,
    reason: '',
    modelId: undefined,
    version: undefined
  }
}

// 初始化
onMounted(() => {
  // 首先加载用户列表和流程模型
  getUserList()
  getModelList().then(() => {
    // 流程模型加载完成后再加载表格数据
    getListData()
  })
})
</script>

<template>
  <div class="app-container">
    <!-- 搜索工作栏 -->
    <el-card class="filter-container">
      <el-form :model="queryParams" ref="queryFormRef" :inline="true" class="search-form">
        <div class="form-content">
          <div class="form-fields">
            <el-form-item label="被代理人" prop="fromUserId">
              <el-select
                v-model="queryParams.fromUserId"
                placeholder="请选择被代理人"
                clearable
                :loading="userListLoading"
                @change="getListData"
                filterable
                style="min-width: 200px; width: 100%;"
              >
                <el-option
                  v-for="item in userList"
                  :key="item.id"
                  :label="item.nickname"
                  :value="item.id"
                />
              </el-select>
            </el-form-item>
            
            <el-form-item label="状态" prop="status">
              <el-select
                v-model="queryParams.status"
                placeholder="请选择状态"
                clearable
                @change="(val) => { 
                  // 如果选择全部，则设置为undefined
                  queryParams.status = val === null ? undefined : Number(val); 
                  getListData(); 
                }"
                style="min-width: 200px; width: 100%;"
              >
                <el-option
                  v-for="item in statusOptions"
                  :key="item.value !== null ? item.value : 'all'"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
            
            <el-form-item label="流程模型" prop="modelId">
              <el-select
                v-model="queryParams.modelId"
                placeholder="请选择流程模型"
                clearable
                :loading="modelLoading"
                @change="getListData"
                filterable
                style="min-width: 200px; width: 100%;"
              >
                <el-option
                  v-for="item in modelList"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                />
              </el-select>
            </el-form-item>
            
            <el-form-item label="版本号" prop="modelVersion">
              <el-select
                v-model="queryParams.modelVersion"
                placeholder="请选择版本号"
                clearable
                @change="getListData"
                :disabled="!queryParams.modelId"
                style="min-width: 100px; width: 100%;"
              >
                <el-option
                  v-for="version in versionList"
                  :key="version"
                  :label="`v${version}`"
                  :value="version"
                />
              </el-select>
            </el-form-item>
          </div>
          
          <div class="form-buttons">
            <el-button type="primary" @click="getListData"><i class="fa fa-search"></i> 搜索</el-button>
            <el-button @click="resetQuery"><i class="fa fa-refresh"></i> 重置</el-button>
            <el-button 
              v-if="hasCreatePermission"
              type="success" 
              @click="openAdd" 
            ><i class="fa fa-plus"></i> 新增</el-button>
            <el-button 
              v-if="hasUpdatePermission"
              type="warning" 
              @click="openTransferRunning" 
            ><i class="fa fa-exchange"></i> 正在运行</el-button>
          </div>
        </div>
      </el-form>
    </el-card>

    <!-- 列表 -->
    <el-card class="mt-10px">
      <el-table 
        v-loading="loading" 
        :data="list"
        :empty-text="'暂无数据'"
        element-loading-text="加载中..."
        element-loading-spinner="el-icon-loading"
        element-loading-background="rgba(255, 255, 255, 0.8)"
        height="400"
        style="width: 100%;"
      >
        <template #empty>
          <el-empty description="暂无数据" />
        </template>
        <el-table-column label="被代理人" prop="fromUserName" align="center" />
        <el-table-column label="代理人" prop="toUserName" align="center" />
        <el-table-column label="流程模型" prop="modelName" align="center">
          <template #default="{ row }">
            <el-tag
              :type="getProcessDefinitionTagType()"
              size="small"
            >
              {{ row.modelName }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="版本号" prop="modelVersion" align="center" width="80">
          <template #default="{ row }">
            <el-tag
              type="info"
              size="small"
              v-if="row.modelVersion"
            >
              v{{ row.modelVersion }}
            </el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="代理时间" min-width="200" align="center">
          <template #default="{ row }">
            {{ row.startTimeFormatted }} 至 {{ row.endTimeFormatted }}
          </template>
        </el-table-column>
        <el-table-column label="状态" prop="status" align="center">
          <template #default="{ row }">
            <el-tag
              :type="getStatusType(row.status)"
              size="small"
            >
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建人" prop="creator" v-if="false" align="center" />
        <el-table-column label="创建时间" prop="createTimeFormatted" width="180" align="center" />
        <el-table-column label="操作" width="200" fixed="right" align="center">
          <template #default="{ row }">
            <el-button 
              v-if="hasUpdatePermission"
              link 
              type="primary" 
              @click="openEdit(row)"
            >编辑</el-button>
            <el-button 
              v-if="hasUpdatePermission && row.status !== 3"
              link 
              type="warning" 
              @click="handleRevoke(row)"
            >撤销</el-button>
            <el-button 
              v-if="hasDeletePermission"
              link 
              type="danger" 
              @click="handleDelete(row)"
            >删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <!-- 分页 -->
      <pagination 
        v-if="total > 0"
        :total="total" 
        v-model:page="queryParams.pageNo" 
        v-model:limit="queryParams.pageSize"
        @pagination="getListData"
      />
    </el-card>

    <!-- 弹窗 -->
    <el-dialog 
      :title="dialogTitle" 
      v-model="dialogVisible" 
      width="600px" 
      append-to-body
      destroy-on-close
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      @close="closeDialog"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="被代理人" prop="fromUserId">
          <el-select
            v-model="formData.fromUserId"
            placeholder="请选择被代理人"
            clearable
            :loading="userListLoading"
            filterable
          >
            <el-option
              v-for="item in userList"
              :key="item.id"
              :label="item.nickname"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="代理人" prop="toUserId">
          <el-select
            v-model="formData.toUserId"
            placeholder="请选择代理人"
            clearable
            :loading="userListLoading"
            filterable
          >
            <el-option
              v-for="item in filteredUserList"
              :key="item.id"
              :label="item.nickname"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="流程模型">
          <el-select
            v-model="formData.modelId"
            placeholder="请选择流程模型"
            clearable
            :loading="modelLoading"
            filterable
          >
            <el-option
              v-for="item in modelList"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="版本号">
          <el-select
            v-model="formData.modelVersion"
            placeholder="请选择版本号"
            clearable
            :disabled="!formData.modelId"
          >
            <el-option
              v-for="version in versionList"
              :key="version"
              :label="`v${version}`"
              :value="version"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="代理时间" class="time-picker-container">
          <div class="time-shortcuts">
            <el-link type="primary" @click="handleQuickSelect('week')">未来一周</el-link>
            <el-link type="primary" @click="handleQuickSelect('month')">未来一个月</el-link>
          </div>
          <div class="time-row">
            <div class="time-label">开始时间：</div>
            <div class="time-controls">
              <el-form-item prop="startTime" class="nested-form-item">
                <el-date-picker
                  v-model="startDateRef"
                  type="date"
                  placeholder="开始日期"
                  value-format="YYYY-MM-DD"
                  :disabled-date="(time) => time.getTime() < new Date().setHours(0, 0, 0, 0)"
                  @change="handleTimeChange"
                  size="default"
                />
                <el-time-picker
                  v-model="startTimeRef"
                  placeholder="开始时间"
                  value-format="HH:mm:ss"
                  @change="handleTimeChange"
                  size="default"
                />
              </el-form-item>
            </div>
          </div>
          <div class="time-row">
            <div class="time-label">结束时间：</div>
            <div class="time-controls">
              <el-form-item prop="endTime" class="nested-form-item">
                <el-date-picker
                  v-model="endDateRef"
                  type="date"
                  placeholder="结束日期"
                  value-format="YYYY-MM-DD"
                  :disabled-date="(time) => time.getTime() < (startDateRef ? new Date(startDateRef).getTime() : new Date().setHours(0, 0, 0, 0))"
                  @change="handleTimeChange"
                  size="default"
                />
                <el-time-picker
                  v-model="endTimeRef"
                  placeholder="结束时间"
                  value-format="HH:mm:ss"
                  @change="handleTimeChange"
                  size="default"
                />
              </el-form-item>
            </div>
          </div>
        </el-form-item>
        <el-form-item label="原因说明" prop="reason">
          <el-input
            v-model="formData.reason"
            type="textarea"
            placeholder="请输入原因说明"
            :rows="3"
            show-word-limit
            maxlength="200"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="closeDialog">取消</el-button>
        <el-button type="primary" @click="submitForm" :loading="loading">确定</el-button>
      </template>
    </el-dialog>

    <!-- 转办正在运行任务的弹窗 -->
    <el-dialog 
      title="批量代理运行中任务"
      v-model="transferRunningDialogVisible" 
      width="600px" 
      append-to-body
      destroy-on-close
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      @close="closeTransferRunningDialog"
    >
      <el-form
        ref="transferRunningFormRef"
        :model="transferRunningForm"
        :rules="transferRunningRules"
        label-width="100px"
      >
        <el-form-item label="当前审批人" prop="fromUserId">
          <el-select
            v-model="transferRunningForm.fromUserId"
            placeholder="请选择当前审批人"
            clearable
            :loading="userListLoading"
            filterable
            style="width: 100%;"
          >
            <el-option
              v-for="item in userList"
              :key="item.id"
              :label="item.nickname"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="新审批人" prop="toUserId">
          <el-select
            v-model="transferRunningForm.toUserId"
            placeholder="请选择新审批人"
            clearable
            :loading="userListLoading"
            filterable
            style="width: 100%;"
          >
            <el-option
              v-for="item in filteredUserList"
              :key="item.id"
              :label="item.nickname"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="流程模型">
          <el-select
            v-model="transferRunningForm.modelId"
            placeholder="请选择流程模型（可选）"
            clearable
            :loading="modelLoading"
            filterable
            style="width: 100%;"
          >
            <el-option
              v-for="item in modelList"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
          <div class="form-tips">不选择则转办所有模型的运行中任务</div>
        </el-form-item>
        <el-form-item label="版本号">
          <el-select
            v-model="transferRunningForm.version"
            placeholder="请选择版本号（可选）"
            clearable
            :disabled="!transferRunningForm.modelId"
            style="width: 100%;"
          >
            <el-option
              v-for="version in versionList"
              :key="version"
              :label="`v${version}`"
              :value="version"
            />
          </el-select>
          <div class="form-tips">不选择则转办所选模型的所有版本任务</div>
        </el-form-item>
        <el-form-item label="代理原因" prop="reason">
          <el-input
            v-model="transferRunningForm.reason"
            type="textarea"
            placeholder="请输入代理原因"
            :rows="3"
            show-word-limit
            maxlength="200"
            style="width: 100%;"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="closeTransferRunningDialog">取消</el-button>
        <el-button type="primary" @click="submitTransferRunning" :loading="loading">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.app-container {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: calc(100vh - 84px);
}

.filter-container {
  padding: 18px;
  margin-bottom: 16px;
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  
  .search-form {
    width: 100%;
    
    .form-content {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      
      .form-fields {
        display: flex;
        flex-wrap: wrap;
        gap: 20px;
        flex: 1;
        
        .el-form-item {
          margin-bottom: 15px;
          margin-right: 0;
        }
      }
      
      .form-buttons {
        display: flex;
        gap: 10px;
        align-items: flex-start;
        margin-left: 20px;
        margin-bottom: 10px;
        
        @media (max-width: 768px) {
          margin-left: 0;
          justify-content: flex-end;
          width: 100%;
        }
      }
    }
  }
}

.el-card {
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  
  &.mt-10px {
    margin-top: 16px;
  }
}

.el-table {
  margin: 10px 0;
  
  .el-button {
    padding: 4px 8px;
    
    &:not(:last-child) {
      margin-right: 8px;
    }
  }
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
  padding: 10px 0;
}

.el-dialog {
  .el-select,
  .el-date-picker,
  .el-textarea {
    width: 100%;
  }
  
  .el-textarea {
    .el-input__count {
      background: transparent;
    }
  }
  
  .dialog-footer {
    padding-top: 20px;
    text-align: right;
    
    .el-button + .el-button {
      margin-left: 10px;
    }
  }
}

:deep(.el-table) {
  .el-table__header {
    th {
      background-color: #f5f7fa;
      color: #606266;
      font-weight: 600;
      text-align: center;
    }
  }
  
  .el-table__row {
    td {
      padding: 8px 0;
    }
  }
}

:deep(.el-form-item__label) {
  font-weight: 500;
}

:deep(.el-dialog__body) {
  padding: 20px 24px;
}

:deep(.el-dialog__footer) {
  padding: 10px 24px 20px;
  border-top: 1px solid #dcdfe6;
}

:deep(.el-empty) {
  padding: 40px 0;
}

:deep(.el-loading-spinner) {
  .el-loading-text {
    color: #409eff;
  }
}

:deep(.el-select-dropdown__item) {
  padding: 0 20px;
}

:deep(.el-dialog) {
  .el-dialog__header {
    margin-right: 0;
    padding: 20px 24px;
    border-bottom: 1px solid #dcdfe6;
    
    .el-dialog__title {
      font-size: 16px;
      font-weight: 600;
    }
  }
}

.time-picker-container {
  .time-shortcuts {
    display: flex;
    gap: 16px;
    margin-bottom: 16px;
    
    .el-link {
      font-size: 14px;
    }
  }
  
  .time-row {
    display: flex;
    margin-bottom: 16px;
    
    .time-label {
      width: 80px;
      line-height: 32px;
      color: var(--el-text-color-regular);
      font-size: 14px;
    }
    
    .time-controls {
      flex: 1;
      display: flex;
      gap: 12px;
      
      :deep(.el-date-editor.el-input) {
        width: 150px;
      }
      
      :deep(.el-input-number) {
        width: 120px;
      }
    }
  }
  
  .nested-form-item {
    margin-bottom: 0;
    width: 100%;
    
    :deep(.el-form-item__content) {
      display: flex;
      flex-direction: row;
      gap: 12px;
    }
    
    :deep(.el-date-editor) {
      flex: 3;
    }
    
    :deep(.el-time-picker) {
      flex: 2;
    }
    
    :deep(.el-form-item__error) {
      position: absolute;
      top: 100%;
      left: 0;
    }
  }
}

:deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px var(--el-border-color) inset !important;
  
  &:hover {
    box-shadow: 0 0 0 1px var(--el-color-primary) inset !important;
  }
  
  &.is-focus {
    box-shadow: 0 0 0 1px var(--el-color-primary) inset !important;
  }
}

.form-tips {
  color: #909399;
  font-size: 12px;
  margin-top: 4px;
  line-height: 1.4;
}
</style>

