<template>
  <el-form ref="paramFormRef" :model="props" label-position="top">
  <el-form-item label="请求头">
    <div class="flex pt-2" v-for="(item, index) in props.header" :key="index">
      <div class="mr-2">
        <el-tag :type="isFormField(item.key) ? 'success' : 'info'" size="small">
          {{ isFormField(item.key) ? '表单' : '固定值' }}
        </el-tag>
      </div>
      <div class="mr-2">
        <el-form-item
          :prop="`header.${index}.key`"
          :rules="{
            required: true,
            message: '参数名不能为空',
            trigger: ['blur', 'change']
          }"
        >
          <el-select
            class="w-160px!"
            v-model="item.key"
            filterable
            allow-create
            placeholder="输入参数名"
            @input="onInputChange"
          >
            <el-option
              v-for="(field, fIdx) in props.modelFormFields"
              :key="fIdx"
              :label="field.title"
              :value="field.field"
            />
          </el-select>
        </el-form-item>
      </div>
      <div class="mr-2">
        <el-select class="w-100px!" v-model="item.type">
          <el-option
            v-for="types in BPM_HTTP_REQUEST_PARAM_TYPES"
            :key="types.value"
            :label="types.label"
            :value="types.value"
          />
        </el-select>
      </div>
      <div class="mr-2">
        <el-form-item
          :prop="`header.${index}.value`"
          :rules="{
            required: true,
            message: '参数值不能为空',
            trigger: ['blur', 'change']
          }"
        >
          <el-input
            v-if="item.type === BpmHttpRequestParamTypeEnum.FIXED_VALUE || item.type === undefined"
            class="w-160px"
            v-model="item.value"
            @input="onInputChange"
          />
          <el-select
            v-else-if="item.type === BpmHttpRequestParamTypeEnum.FROM_FORM"
            class="w-160px!"
            v-model="item.value"
          >
            <el-option
              v-for="(field, fIdx) in formFieldOptions"
              :key="fIdx"
              :label="field.title"
              :value="field.field"
              :disabled="!field.required"
            />
          </el-select>
        </el-form-item>
      </div>
      <div class="mr-1 flex items-center">
        <Icon icon="ep:delete" :size="18" @click="deleteHttpRequestParam(props.header, index)" />
      </div>
    </div>
    <el-button type="primary" text @click="addHttpRequestParam(props.header)">
      <Icon icon="ep:plus" class="mr-5px" />添加一行
    </el-button>
  </el-form-item>
  <el-form-item label="请求体">
    <div class="flex pt-2" v-for="(item, index) in props.body" :key="index">
      <div class="mr-2">
        <el-tag :type="isFormField(item.key) ? 'success' : 'info'" size="small">
          {{ isFormField(item.key) ? '表单' : '固定值' }}
        </el-tag>
      </div>
      <div class="mr-2">
        <el-form-item
          :prop="`body.${index}.key`"
          :rules="{
            required: true,
            message: '参数名不能为空',
            trigger: ['blur', 'change']
          }"
        >
          <el-select
            class="w-160px!"
            v-model="item.key"
            filterable
            allow-create
            placeholder="输入参数名"
            @input="onInputChange"
          >
            <el-option
              v-for="(field, fIdx) in props.modelFormFields"
              :key="fIdx"
              :label="field.title"
              :value="field.field"
            />
          </el-select>
        </el-form-item>
      </div>
      <div class="mr-2">
        <el-select class="w-100px!" v-model="item.type">
          <el-option
            v-for="types in BPM_HTTP_REQUEST_PARAM_TYPES"
            :key="types.value"
            :label="types.label"
            :value="types.value"
          />
        </el-select>
      </div>
      <div class="mr-2">
        <el-form-item
          :prop="`body.${index}.value`"
          :rules="{
            required: true,
            message: '参数值不能为空',
            trigger: ['blur', 'change']
          }"
        >
          <el-input
            v-if="item.type === BpmHttpRequestParamTypeEnum.FIXED_VALUE || item.type === undefined"
            class="w-160px"
            v-model="item.value"
            @input="onInputChange"
          />
          <el-select
            v-else-if="item.type === BpmHttpRequestParamTypeEnum.FROM_FORM"
            class="w-160px!"
            v-model="item.value"
          >
            <el-option
              v-for="(field, fIdx) in formFieldOptions"
              :key="fIdx"
              :label="field.title"
              :value="field.field"
              :disabled="!field.required"
            />
          </el-select>
        </el-form-item>
      </div>
      <div class="mr-1 flex items-center">
        <Icon icon="ep:delete" :size="18" @click="deleteHttpRequestParam(props.body, index)" />
      </div>
    </div>
    <el-button type="primary" text @click="addHttpRequestParam(props.body)">
      <Icon icon="ep:plus" class="mr-5px" />添加一行
    </el-button>
  </el-form-item>
  </el-form>
</template>
<script setup lang="ts">
import {
  HttpRequestParam,
  BPM_HTTP_REQUEST_PARAM_TYPES,
  BpmHttpRequestParamTypeEnum,
  ProcessVariableEnum
} from '../../consts'
import { useFormFieldsAndStartUser } from '../../node'
defineOptions({
  name: 'HttpRequestParamSetting'
})

const props = defineProps({
  header: {
    type: Array as () => HttpRequestParam[],
    required: false,
    default: () => []
  },
  body: {
    type: Array as () => HttpRequestParam[],
    required: false,
    default: () => []
  },
  bind: {
    type: String,
    required: true
  },
  modelFormFields: {
    type: Array as () => any[],
    required: false,
    default: () => []
  }
})



// 表单引用
const paramFormRef = ref()

// 流程表单字段，发起人字段
const formFieldOptions = useFormFieldsAndStartUser()
formFieldOptions.unshift({
    field: ProcessVariableEnum.HTTP_PROCESS_INSTANCE_ID,
    title: '流程链接',
    required: true
  }
)

/** 判断参数名是否为表单字段 */
const isFormField = (key: string) => {
  if (!key || !props.modelFormFields) return false
  return props.modelFormFields.some((field: any) => field.field === key)
}
/** 添加请求配置项 */
const addHttpRequestParam = (arr: HttpRequestParam[]) => {
  // 添加默认值，确保key和value不为空
  const newItem = {
    key: '参数名',
    type: BpmHttpRequestParamTypeEnum.FIXED_VALUE,
    value: '参数值'
  }
  arr.push(newItem)
  
  // 触发验证
  nextTick(() => {
    if (paramFormRef.value) {
      paramFormRef.value.validate()
    }
  })
}

/** 删除请求配置项 */
const deleteHttpRequestParam = (arr: HttpRequestParam[], index: number) => {
  arr.splice(index, 1)
  
  // 触发验证
  nextTick(() => {
    if (paramFormRef.value) {
      paramFormRef.value.validate()
    }
  })
}

/** 处理输入变化 */
const onInputChange = () => {
  // 触发表单验证
  const parentForm = inject('elForm', null)
  if (parentForm) {
    nextTick(() => {
      // @ts-ignore
      parentForm.validateField(`${props.bind}.header`)
      // @ts-ignore
      parentForm.validateField(`${props.bind}.body`)
    })
  }
}



/**
 * 验证表单
 */
const validate = async () => {
  if (!paramFormRef.value) return false
  
  try {
    // 首先确保所有参数都有值
    if (props.header && props.header.length > 0) {
      props.header.forEach((item, index) => {
        if (!item.key) item.key = `参数名${index + 1}`
        if (!item.value) item.value = `参数值${index + 1}`
        if (item.type === undefined) item.type = BpmHttpRequestParamTypeEnum.FIXED_VALUE
      })
    }
    
    if (props.body && props.body.length > 0) {
      props.body.forEach((item, index) => {
        if (!item.key) item.key = `参数名${index + 1}`
        if (!item.value) item.value = `参数值${index + 1}`
        if (item.type === undefined) item.type = BpmHttpRequestParamTypeEnum.FIXED_VALUE
      })
    }
    
    // 验证表单
    await paramFormRef.value.validate()
    return true
  } catch (err) {
    console.error('HttpRequestParamSetting验证失败:', err)
    return false
  }
}

// 暴露给父组件的方法
defineExpose({
  addHttpRequestParam,
  deleteHttpRequestParam,
  validate
})
</script>

<style lang="scss" scoped></style>

