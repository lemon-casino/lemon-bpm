<template>
  <el-drawer
    :append-to-body="true"
    v-model="settingVisible"
    :show-close="false"
    :size="630"
    :before-close="saveConfig"
  >
    <template #header>
      <div class="config-header">
        <input
          v-if="showInput"
          type="text"
          class="config-editable-input"
          @blur="blurEvent()"
          v-mountedFocus
          v-model="nodeName"
          :placeholder="nodeName"
        />
        <div v-else class="node-name">
          {{ nodeName }} <Icon class="ml-1" icon="ep:edit-pen" :size="16" @click="clickIcon()" />
        </div>
        <div class="divide-line"></div>
      </div>
    </template>
    <div>
      <el-form ref="formRef" :model="configForm" label-position="top" :rules="formRules">
        <el-form-item label="是否系统任务" prop="systemTask">
          <el-switch v-model="configForm.systemTask" />
        </el-form-item>
        
        <!-- 系统任务相关配置 -->
        <template v-if="configForm.systemTask">
          <el-form-item label="流程模型编号" prop="modelKey">
            <el-select 
              v-model="configForm.modelKey" 
              placeholder="请选择流程模型"
              filterable
              clearable
              @change="handleModelChange"
              :loading="modelLoading"
            >
              <el-option 
                v-for="item in modelOptions" 
                :key="item.key"
                :label="item.formName" 
                :value="item.key"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="系统任务发起人编号" prop="refreshId">
            <el-select
              v-model="configForm.refreshId"
              placeholder="请选择系统任务发起人"
              filterable
              clearable
              style="width: 100%"
              @change="handleRefreshIdChange"
              value-key="id"
            >
              <el-option
                v-for="item in userOptions"
                :key="item.id"
                :label="item.nickname"
                :value="item.id"
              />
            </el-select>
          </el-form-item>
        </template>
        
        <!-- 非系统任务相关配置 -->
        <template v-else>
          <el-form-item label="请求方法" prop="method">
            <el-select v-model="configForm.method">
              <el-option :value="BpmHttpRequestMethodEnum.GET" label="GET" />
              <el-option :value="BpmHttpRequestMethodEnum.POST" label="POST" />
              <el-option :value="BpmHttpRequestMethodEnum.PUT" label="PUT" />
              <el-option :value="BpmHttpRequestMethodEnum.DELETE" label="DELETE" />
            </el-select>
          </el-form-item>
          <el-form-item label="请求地址" prop="url">
            <el-input v-model="configForm.url" placeholder="请输入请求地址" />
          </el-form-item>
        </template>

        <!-- 请求头，请求体设置-->
        <HttpRequestParamSetting
          ref="httpParamSettingRef"
          :header="configForm.header"
          :body="configForm.body"
          :bind="'configForm'"
          :modelFormFields="modelFormFields"
        />
        
        <!-- 返回值设置-->
        <el-form-item label="返回值">
          <el-alert
            title="通过请求返回值, 可以修改流程表单的值"
            type="warning"
            show-icon
            :closable="false"
          />
        </el-form-item>
        <el-form-item>
          <div
            class="flex pt-2"
            v-for="(item, index) in configForm.response"
            :key="index"
          >
            <div class="mr-2">
              <el-form-item
                :prop="`response.${index}.key`"
                :rules="{
                  required: true,
                  message: '表单字段不能为空',
                  trigger: 'blur'
                }"
              >
                <div v-if="configForm.systemTask && configForm.modelKey" class="flex items-center">
                  <el-select class="w-100px mr-2" v-model="item.type">
                    <el-option
                      v-for="types in BPM_HTTP_REQUEST_PARAM_TYPES"
                      :key="types.value"
                      :label="types.label"
                      :value="types.value"
                    />
                  </el-select>
                  <!-- 如果是固定值类型，显示输入框 -->
                  <el-input 
                    v-if="item.type === BpmHttpRequestParamTypeEnum.FIXED_VALUE" 
                    class="w-160px" 
                    v-model="item.key" 
                    @input="onInputChange(item)" 
                    placeholder="请输入表单字段"
                  />
                  <!-- 如果是表单类型，显示下拉选择框 -->
                  <el-select
                    v-else-if="item.type === BpmHttpRequestParamTypeEnum.FROM_FORM"
                    class="w-160px"
                    v-model="item.key"
                    placeholder="请选择表单字段"
                    @change="onInputChange(item)"
                  >
                    <el-option
                      v-for="(field, fIdx) in modelFormFields"
                      :key="fIdx"
                      :label="field.title"
                      :value="field.field"
                    />
                  </el-select>
                </div>
                <el-select v-else class="w-160px!" v-model="item.key" placeholder="请选择表单字段">
                  <el-option
                    v-for="(field, fIdx) in formFields"
                    :key="fIdx"
                    :label="field.title"
                    :value="field.field"
                    :disabled="!field.required"
                  />
                </el-select>
              </el-form-item>
            </div>
            <div class="mr-2">
              <el-form-item
                :prop="`response.${index}.value`"
                :rules="{
                  required: true,
                  message: '请求返回字段不能为空',
                  trigger: 'blur'
                }"
              >
                <el-input class="w-160px" v-model="item.value" placeholder="请求返回字段" />
              </el-form-item>
            </div>
            <div class="mr-1 pt-1 cursor-pointer">
              <Icon
                icon="ep:delete"
                :size="18"
                @click="deleteHttpResponseSetting(configForm.response!, index)"
              />
            </div>
          </div>
          <el-button
            type="primary"
            text
            @click="addHttpResponseSetting(configForm.response!)"
          >
            <Icon icon="ep:plus" class="mr-5px" />添加一行
          </el-button>
        </el-form-item>
      </el-form>
    </div>
    <template #footer>
      <el-divider />
      <div>
        <el-button type="primary" @click="saveConfig">确 定</el-button>
        <el-button @click="closeDrawer">取 消</el-button>
      </div>
    </template>
  </el-drawer>
</template>
<script setup lang="ts">
import {
  SimpleFlowNode,
  NodeType,
  HttpRequestSetting,
  BpmHttpRequestMethodEnum,
  BpmHttpRequestParamTypeEnum,
  BPM_HTTP_REQUEST_PARAM_TYPES
} from '../consts'
import { useWatchNode, useDrawer, useNodeName, useFormFields, useNodeForm } from '../node'
import HttpRequestParamSetting from './components/HttpRequestParamSetting.vue'
import * as ModelApi from '@/api/bpm/model'
import request from '@/config/axios'
import { cloneDeep } from 'lodash-es'

defineOptions({
  name: 'HttpTaskNodeConfig'
})
const props = defineProps({
  flowNode: {
    type: Object as () => SimpleFlowNode,
    required: true
  }
})
const message = useMessage() // 消息弹窗
// 抽屉配置
const { settingVisible, closeDrawer, openDrawer } = useDrawer()
// 当前节点
const currentNode = useWatchNode(props)
// 节点名称
const { nodeName, showInput, clickIcon, blurEvent } = useNodeName(NodeType.HTTP_TASK_NODE)
// 表单配置
const formRef = ref() // 表单 Ref
const httpParamSettingRef = ref() // HttpRequestParamSetting组件Ref

// 获取用户列表
const { userOptions } = useNodeForm(NodeType.HTTP_TASK_NODE)

// 表单校验规则
const formRules = reactive({
  url: [{ required: true, message: '请求地址不能为空', trigger: 'blur' }],
  method: [{ required: true, message: '请求方法不能为空', trigger: 'change' }],
  modelKey: [{ required: true, message: '流程模型编号不能为空', trigger: 'change' }],
  refreshId: [] // 系统任务发起人编号非必填
})
// HTTP任务配置表单数据
const configForm = ref<HttpRequestSetting & { modelName?: string }>({
  systemTask: false,
  modelKey: '',
  modelName: '',
  refreshId: '',
  method: BpmHttpRequestMethodEnum.POST,
  url: '',
  header: [],
  body: [],
  response: []
})
// 流程表单字段
const formFields = useFormFields()

// 当前选中模型的表单字段
const modelFormFields = ref<any[]>([])

// 流程模型选项
const modelOptions = ref<ModelApi.SimpleModelVO[]>([])
const modelLoading = ref(false)
const isLoadingModels = ref(false) // 防止重复请求的标记

// 加载流程模型选项
const loadModelOptions = async () => {
  // 如果正在加载中，则不重复请求
  if (isLoadingModels.value) {
    return
  }
  
  modelLoading.value = true
  isLoadingModels.value = true
  
  try {
    const result = await ModelApi.getAllSimpleModelList()
    console.log('获取流程模型列表结果:', result)
    
    // 处理API直接返回数组的情况
    if (Array.isArray(result)) {
      modelOptions.value = result
    } 
    // 处理API返回包含code和data字段的对象的情况
    else if (result && result.code === 0 && result.data) {
      modelOptions.value = result.data
    } 
    // 处理其他情况
    else {
      console.error('获取流程模型列表失败:', result)
      message.warning('获取流程模型列表失败')
      return
    }
    
    // 如果已有选中的modelKey，查找对应的modelName
    if (configForm.value.modelKey) {
      const selectedModel = modelOptions.value.find(item => item.id === configForm.value.modelKey)
      if (selectedModel) {
        configForm.value.modelName = selectedModel.formName
      }
    }
  } catch (error) {
    console.error('获取流程模型列表失败:', error)
    message.error('获取流程模型列表失败，请刷新重试')
  } finally {
    modelLoading.value = false
    isLoadingModels.value = false
  }
}

// 获取流程定义表单字段
const getProcessDefinitionFormFields = async (modelKey: string) => {
  if (!modelKey) return
  
  try {
    const result = await request.get({ url: `/bpm/process-definition/form-fields?key=${modelKey}` })
    console.log('获取流程表单字段结果:', result)
    
    // 处理API直接返回数组的情况
    const formFieldsData = Array.isArray(result) ? result : 
                          (result && result.code === 0 && Array.isArray(result.data)) ? result.data : null
    
    if (formFieldsData) {
      // 解析表单字段数据
      modelFormFields.value = formFieldsData.map((fieldStr: string) => {
        try {
          const fieldObj = JSON.parse(fieldStr)
          return {
            field: fieldObj.field,
            title: fieldObj.title,
            required: fieldObj.$required || false
          }
        } catch (e) {
          console.error('解析表单字段失败:', e, fieldStr)
          return null
        }
      }).filter(Boolean) // 过滤掉解析失败的字段
      
      console.log('解析后的表单字段:', modelFormFields.value)
    } else {
      console.error('获取流程表单字段数据格式不正确:', result)
      message.warning('获取流程表单字段失败')
    }
  } catch (error) {
    console.error('获取流程表单字段失败:', error)
    message.error('获取流程表单字段失败，请刷新重试')
  }
}

// 监听系统任务和模型ID变化，自动加载表单字段
const isLoadingFormFields = ref(false) // 防止重复请求的标记

watch(
  () => [configForm.value.systemTask, configForm.value.modelKey],
  async ([systemTask, modelKey]) => {
    // 如果正在加载中，则不重复请求
    if (isLoadingFormFields.value) {
      return
    }
    
    if (systemTask && modelKey) {
      isLoadingFormFields.value = true
      try {
        await getProcessDefinitionFormFields(modelKey as string)
      } finally {
        isLoadingFormFields.value = false
      }
    } else {
      // 如果不是系统任务或没有选择模型，清空表单字段
      modelFormFields.value = []
    }
  }
)

// 处理模型选择变化
const handleModelChange = async (value: string) => {
  if (value) {
    const selectedModel = modelOptions.value.find(item => item.id === value)
    if (selectedModel) {
      configForm.value.modelName = selectedModel.formName
      
      // 加载表单字段
      if (configForm.value.systemTask && !isLoadingFormFields.value) {
        isLoadingFormFields.value = true
        try {
          await getProcessDefinitionFormFields(value)
        } finally {
          isLoadingFormFields.value = false
        }
      }
    }
  } else {
    configForm.value.modelName = ''
    modelFormFields.value = []
  }
}

/** 添加 HTTP 请求返回值设置项 */
const addHttpResponseSetting = (responseSetting: Record<string, string>[]) => {
  // 创建新对象添加到数组
  const newItem = {
    key: '',
    value: '',
    type: BpmHttpRequestParamTypeEnum.FIXED_VALUE
  }
  responseSetting.push(newItem)
}

/** 删除 HTTP 请求返回值设置项 */
const deleteHttpResponseSetting = (responseSetting: Record<string, string>[], index: number) => {
  responseSetting.splice(index, 1)
}

// 检查字段是否存在于表单字段中
const checkFieldExists = (field: string) => {
  return modelFormFields.value.some(item => item.field === field)
}

// 处理输入变化
const onInputChange = (item: any) => {
  // 如果是系统任务并且有模型ID
  if (configForm.value.systemTask && configForm.value.modelKey) {
    // 检查输入的key是否匹配表单字段
    if (!checkFieldExists(item.key)) {
      // 如果不匹配，将类型设置为固定值
      item.type = BpmHttpRequestParamTypeEnum.FIXED_VALUE
    }
  }
}

/** 保存配置 */
const saveConfig = async () => {
  if (!formRef) return false
  if (!httpParamSettingRef.value) return false
  
  // 根据是否是系统任务动态设置校验规则
  if (configForm.value.systemTask) {
    formRules.url = []
    formRules.method = []
    formRules.modelKey = [{ required: true, message: '流程模型编号不能为空', trigger: 'change' }]
  } else {
    formRules.url = [{ required: true, message: '请求地址不能为空', trigger: 'blur' }]
    formRules.method = [{ required: true, message: '请求方法不能为空', trigger: 'change' }]
    formRules.modelKey = []
  }
  
  // 调试信息：打印当前请求体和请求头数据
  console.log('保存前请求头数据:', JSON.stringify(configForm.value.header))
  console.log('保存前请求体数据:', JSON.stringify(configForm.value.body))
  try {
    // 首先验证HttpRequestParamSetting组件
    const paramValid = await httpParamSettingRef.value.validate()
    if (!paramValid) {
      console.error('请求参数验证失败')
      message.warning('请求参数验证失败，请检查请求头和请求体参数')
      return false
    }
    
    // 然后验证主表单
    const formValid = await formRef.value.validate()
    if (!formValid) {
      console.error('表单验证失败')
      return false
    }
    
    // 验证通过
    console.log('表单验证通过')
  } catch (err) {
    console.error('表单验证异常:', err)
    message.warning('表单验证失败，请检查输入')
    return false
  }
  
  const showText = getShowText()
  if (!showText) return false
  
  currentNode.value.name = nodeName.value!
  currentNode.value.showText = showText
  
  // 创建新对象保存配置，避免引用问题
  currentNode.value.httpRequestSetting = {
    systemTask: configForm.value.systemTask,
    modelKey: configForm.value.modelKey,
    modelName: configForm.value.modelName,
    refreshId: configForm.value.refreshId,
    method: configForm.value.method,
    url: configForm.value.url,
    header: cloneDeep(configForm.value.header),
    body: cloneDeep(configForm.value.body),
    response: cloneDeep(configForm.value.response)
  }
  
  settingVisible.value = false
  return true
}

/** 获取节点展示内容 */
const getShowText = (): string => {
  let showText = ''
  if (configForm.value.systemTask) {
    // 如果modelName为空但modelKey存在，尝试从modelOptions中查找对应的formName
    if (!configForm.value.modelName && configForm.value.modelKey && modelOptions.value.length > 0) {
      const selectedModel = modelOptions.value.find(item => item.id === configForm.value.modelKey || item.key === configForm.value.modelKey)
      if (selectedModel) {
        configForm.value.modelName = selectedModel.formName
      }
    }
    
    console.log('getShowText中的configForm:', configForm.value)
    // 使用modelName(formName)显示，如果没有则使用modelKey
    showText = `系统任务: ${configForm.value.modelName || configForm.value.modelKey}`
  } else {
    showText = `${configForm.value.method === BpmHttpRequestMethodEnum.GET ? 'GET' : 
                configForm.value.method === BpmHttpRequestMethodEnum.POST ? 'POST' : 
                configForm.value.method === BpmHttpRequestMethodEnum.PUT ? 'PUT' : 'DELETE'} ${configForm.value.url}`
  }
  return showText
}

/** 处理系统任务发起人编号变化 */
const handleRefreshIdChange = (value: number | string | undefined) => {
  // 值可能是数字、字符串或undefined（当清空选择时）
  // el-select的值已经是数字类型，直接赋值即可
  configForm.value.refreshId = value
}

/** 显示HTTP任务节点配置， 由父组件传过来 */
const showHttpTaskNodeConfig = async (node: SimpleFlowNode) => {
  nodeName.value = node.name
  
  // 加载流程模型选项
  await loadModelOptions()
  
  // 初始化配置表单
  if (node.httpRequestSetting) {
    // 使用cloneDeep对整个配置对象进行深拷贝
    configForm.value = {
      systemTask: node.httpRequestSetting.systemTask || false,
      modelKey: node.httpRequestSetting.modelKey || '',
      modelName: node.httpRequestSetting.modelName || '',
      refreshId: node.httpRequestSetting.refreshId || '',
      method: node.httpRequestSetting.method || BpmHttpRequestMethodEnum.POST,
      url: node.httpRequestSetting.url || '',
      header: cloneDeep(node.httpRequestSetting.header) || [],
      body: cloneDeep(node.httpRequestSetting.body) || [],
      response: cloneDeep(node.httpRequestSetting.response) || []
    }
    
    // 如果有modelKey但没有modelName，尝试从选项中找到对应的formName
    if (configForm.value.modelKey && !configForm.value.modelName) {
      const selectedModel = modelOptions.value.find(item => item.id === configForm.value.modelKey)
      if (selectedModel) {
        configForm.value.modelName = selectedModel.formName
      }
    }
    
    // 处理refreshId，确保下拉框显示正确的用户昵称
    // refreshId可能是数字或字符串，需要确保比较时类型一致
    if (configForm.value.refreshId) {
      // 将refreshId转换为数字类型进行比较
      const refreshIdNum = Number(configForm.value.refreshId)
      // 查找对应的用户信息
      const selectedUser = userOptions.value.find(item => item.id === refreshIdNum)
      if (!selectedUser) {
        console.warn('未找到对应的用户信息，ID:', configForm.value.refreshId)
      } else {
        // 将refreshId转换为数字类型，确保el-select能正确显示选中项
        configForm.value.refreshId = refreshIdNum
      }
    }
    
    // 如果是系统任务并且有模型ID，加载表单字段
    if (configForm.value.systemTask && configForm.value.modelKey && !isLoadingFormFields.value) {
      isLoadingFormFields.value = true
      try {
        await getProcessDefinitionFormFields(configForm.value.modelKey)
      } finally {
        isLoadingFormFields.value = false
      }
    }
  }
  
  // 确保请求头和请求体有默认值
  if (!configForm.value.header || configForm.value.header.length === 0) {
    configForm.value.header = []
  }
  
  if (!configForm.value.body || configForm.value.body.length === 0) {
    configForm.value.body = []
    // 添加一个默认的请求体参数
    configForm.value.body.push({
      key: '参数名',
      type: BpmHttpRequestParamTypeEnum.FIXED_VALUE,
      value: '参数值'
    })
  }
  
  // 确保每个参数都有正确的类型
  configForm.value.header.forEach((item) => {
    if (item.type === undefined) {
      item.type = BpmHttpRequestParamTypeEnum.FIXED_VALUE
    }
  })
  
  configForm.value.body.forEach((item) => {
    if (item.type === undefined) {
      item.type = BpmHttpRequestParamTypeEnum.FIXED_VALUE
    }
  })
  
  // 确保每个响应参数都有type属性
  if (configForm.value.response) {
    configForm.value.response.forEach((item) => {
      if (item.type === undefined) {
        item.type = BpmHttpRequestParamTypeEnum.FIXED_VALUE
      }
    })
  }
}

defineExpose({ openDrawer, showHttpTaskNodeConfig }) // 暴露方法给父组件
</script>

<style lang="scss" scoped></style>
