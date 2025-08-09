<template>
  <el-form ref="formRef" :model="condition" :rules="formRules" label-position="top">
    <el-form-item label="配置方式" prop="conditionType">
      <el-radio-group v-model="condition.conditionType" @change="changeConditionType">
        <el-radio
          v-for="(dict, indexConditionType) in conditionConfigTypes"
          :key="indexConditionType"
          :value="dict.value"
          :label="dict.value"
        >
          {{ dict.label }}
        </el-radio>
      </el-radio-group>
    </el-form-item>
    <el-form-item
      v-if="condition.conditionType === ConditionType.RULE && condition.conditionGroups"
      label="条件规则"
    >
      <div class="condition-group-tool">
        <div class="flex items-center">
          <div class="mr-4">条件组关系</div>
          <el-switch
            v-model="condition.conditionGroups.and"
            inline-prompt
            active-text="且"
            inactive-text="或"
          />
        </div>
      </div>
      <el-space direction="vertical" :spacer="condition.conditionGroups.and ? '且' : '或'">
        <el-card
          class="condition-group"
          style="width: 530px"
          v-for="(equation, cIdx) in condition.conditionGroups.conditions"
          :key="cIdx"
        >
          <div
            class="condition-group-delete"
            v-if="condition.conditionGroups.conditions.length > 1"
          >
            <Icon
              color="#0089ff"
              icon="ep:circle-close-filled"
              :size="18"
              @click="deleteConditionGroup(condition.conditionGroups.conditions, cIdx)"
            />
          </div>
          <template #header>
            <div class="flex items-center justify-between">
              <div>条件组</div>
              <div class="flex">
                <div class="mr-4">规则关系</div>
                <el-switch
                  v-model="equation.and"
                  inline-prompt
                  active-text="且"
                  inactive-text="或"
                />
              </div>
            </div>
          </template>

          <div class="flex pt-2" v-for="(rule, rIdx) in equation.rules" :key="rIdx">
            <div class="mr-2">
              <el-form-item
                :prop="`conditionGroups.conditions.${cIdx}.rules.${rIdx}.leftSide`"
                :rules="{
                  required: true,
                  message: '左值不能为空',
                  trigger: 'change'
                }"
              >
                <el-select style="width: 160px" v-model="rule.leftSide">
                  <el-option
                    v-for="(field, fIdx) in fieldOptions"
                    :key="fIdx"
                    :label="field.title"
                    :value="field.field"
                    :disabled="!field.required"
                  />
                </el-select>
              </el-form-item>
            </div>
            <div class="mr-2">
              <el-select v-model="rule.opCode" style="width: 100px">
                <el-option
                  v-for="operator in COMPARISON_OPERATORS"
                  :key="operator.value"
                  :label="operator.label"
                  :value="operator.value"
                />
              </el-select>
            </div>
            <div class="mr-2">
              <el-form-item
                :prop="`conditionGroups.conditions.${cIdx}.rules.${rIdx}.rightSide`"
                :rules="{
                  required: needsRightSide(rule.opCode),
                  message: '右值不能为空',
                  trigger: 'blur'
                }"
              >
                <el-select
                  v-if="isSelectField(rule.leftSide) && needsRightSide(rule.opCode)"
                  filterable
                  v-model="rule.rightSide"
                  style="width: 170px"
                >
                  <el-option
                    v-for="option in getFieldOptions(rule.leftSide)"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  />
                </el-select>
                <el-input 
                  v-else-if="needsRightSide(rule.opCode)" 
                  v-model="rule.rightSide" 
                  style="width: 160px" 
                />
                <div v-else style="width: 160px; color: #909399; font-size: 14px; line-height: 32px;">
                  {{ rule.opCode === 'empty' ? '检查字段内容为空' : '检查字段内容不为空' }}
                </div>
              </el-form-item>
            </div>
            <div class="mr-1 flex items-center" v-if="equation.rules.length > 1">
              <Icon icon="ep:delete" :size="18" @click="deleteConditionRule(equation, rIdx)" />
            </div>
            <div class="flex items-center">
              <Icon icon="ep:plus" :size="18" @click="addConditionRule(equation, rIdx)" />
            </div>
          </div>
        </el-card>
      </el-space>
      <div title="添加条件组" class="mt-4 cursor-pointer">
        <Icon
          color="#0089ff"
          icon="ep:plus"
          :size="24"
          @click="addConditionGroup(condition.conditionGroups?.conditions)"
        />
      </div>
    </el-form-item>
    <el-form-item
      v-if="condition.conditionType === ConditionType.EXPRESSION"
      label="条件表达式"
      prop="conditionExpression"
    >
      <el-input
        type="textarea"
        v-model="condition.conditionExpression"
        clearable
        style="width: 100%"
      />
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import {
  COMPARISON_OPERATORS,
  CONDITION_CONFIG_TYPES,
  ConditionType,
  DEFAULT_CONDITION_GROUP_VALUE,
  ProcessVariableEnum
} from '../../consts'
import { BpmModelFormType } from '@/utils/constants'
import { useFormFieldsAndStartUser } from '../../node'
import type { UserVO } from '@/api/system/user'
import * as UserApi from '@/api/system/user'
import type { FormVO } from '@/api/bpm/form'
import { inject, ref, watch, onMounted } from 'vue'

const userList = ref<UserVO[]>([])
const loadingUsers = ref(false)
const userMap = inject<Map<string, string>>('userMap', new Map())
const props = defineProps({
  modelValue: {
    type: Object,
    required: true
  }
})
const emit = defineEmits(['update:modelValue'])
const condition = computed({
  get() {
    return props.modelValue
  },
  set(newValue) {
    emit('update:modelValue', newValue)
  }
})
const formType = inject<Ref<number>>('formType') // 表单类型
const conditionConfigTypes = computed(() => {
  return CONDITION_CONFIG_TYPES.filter((item) => {
    // 业务表单暂时去掉条件规则选项
    if (formType?.value === BpmModelFormType.CUSTOM && item.value === ConditionType.RULE) {
      return false
    } else {
      return true
    }
  })
})

/** 条件规则可选择的表单字段 */
const fieldOptions = useFormFieldsAndStartUser()

// 表单校验规则
const formRules = reactive({
  conditionType: [{ required: true, message: '配置方式不能为空', trigger: 'blur' }],
  conditionExpression: [{ required: true, message: '条件表达式不能为空', trigger: 'blur' }]
})
const formRef = ref() // 表单 Ref

/** 切换条件配置方式 */
const changeConditionType = () => {
  if (condition.value.conditionType === ConditionType.RULE) {
    if (!condition.value.conditionGroups) {
      condition.value.conditionGroups = DEFAULT_CONDITION_GROUP_VALUE
    }
  }
}
const deleteConditionGroup = (conditions, index) => {
  conditions.splice(index, 1)
}

const deleteConditionRule = (condition, index) => {
  condition.rules.splice(index, 1)
}

const addConditionRule = (condition, index) => {
  const rule = {
    opCode: '==',
    leftSide: '',
    rightSide: ''
  }
  condition.rules.splice(index + 1, 0, rule)
}

// 监听操作符变化，当选择 empty 或 notEmpty 时，清空右值
watch(() => {
  const rules = []
  condition.value?.conditionGroups?.conditions?.forEach(group => {
    group.rules?.forEach(rule => {
      rules.push(rule)
    })
  })
  return rules
}, (newRules) => {
  newRules.forEach(rule => {
    if (!needsRightSide(rule.opCode)) {
      rule.rightSide = ''
    }
  })
}, { deep: true })

const addConditionGroup = (conditions) => {
  const condition = {
    and: true,
    rules: [
      {
        opCode: '==',
        leftSide: '',
        rightSide: ''
      }
    ]
  }
  conditions.push(condition)
}

// Add interface for field options
interface FieldOption {
  value: string | number
  label: string
}

// 修改加载用户列表的函数
const loadUserList = async () => {
  if (loadingUsers.value || userList.value.length > 0) return
  
  try {
    loadingUsers.value = true
    const users = await UserApi.getSimpleUserList()
    userList.value = users
    
    // 更新 userMap
    users.forEach(user => {
      userMap.set(user.id.toString(), user.nickname)
    })
  } catch (error) {
    console.error('Failed to load users:', error)
  } finally {
    loadingUsers.value = false
  }
}

// 修改 getFieldOptions 函数
const getFieldOptions = (field: string): FieldOption[] => {
  const fieldInfo = fieldOptions.find((item) => item.field === field)
  
  // 处理用户字段
  if (field === ProcessVariableEnum.START_USER_ID || fieldInfo?.type === 'UserSelect') {
    // 确保用户列表已加载
    if (userList.value.length === 0 && !loadingUsers.value) {
      loadUserList()
    }
    return userList.value.map(user => ({
      value: user.id.toString(), // 确保 ID 是字符串
      label: user.nickname
    }))
  }
  
  // 处理其他选择字段
  if (fieldInfo?.type === 'checkbox' || fieldInfo?.type === 'radio' ||  fieldInfo?.type === 'select') {
    const fullFieldConfig = formConfig?.value?.fields
      ?.map(field => {
        try {
          return typeof field === 'string' ? JSON.parse(field) : field
        } catch (e) {
          return field
        }
      })
      ?.find(config => config.field === field)

    return fullFieldConfig?.options?.map(option => ({
      value: option.value.toString(), // 确保值是字符串
      label: option.label
    })) || []
  }

  return []
}

// 修改 isSelectField 函数
const isSelectField = (field: string) => {
  const fieldInfo = fieldOptions.find((item) => item.field === field)
  const isUserField = field === ProcessVariableEnum.START_USER_ID || fieldInfo?.type === 'UserSelect'

  if (isUserField && !loadingUsers.value && userList.value.length === 0) {
    loadUserList()
  }

  return isUserField || fieldInfo?.type === 'checkbox' || fieldInfo?.type === 'radio'|| fieldInfo?.type === ''
}

// 判断操作符是否需要右值
const needsRightSide = (opCode: string): boolean => {
  return !['empty', 'notEmpty'].includes(opCode)
}

// 组件挂载时预加载用户列表
onMounted(() => {
  const hasUserField = fieldOptions.some(
    (field) => field.type === 'UserSelect' || field.field === ProcessVariableEnum.START_USER_ID
  )
  if (hasUserField) {
    loadUserList()
  }
})

const formConfig = inject<Ref<FormVO>>('formConfig')

// 监听 formConfig 的变化
watch(
  () => formConfig?.value,
  (newConfig) => {
    // console.log('Condition->formConfig changed:', newConfig)
  },
  { immediate: true }
)

const validate = async () => {
  if (!formRef.value) return false
  
  // 确保所有为空/不为空操作符的规则不会因为rightSide为空而校验失败
  if (condition.value.conditionType === ConditionType.RULE && condition.value.conditionGroups) {
    condition.value.conditionGroups.conditions.forEach(group => {
      group.rules.forEach(rule => {
        if (rule.opCode === 'empty' || rule.opCode === 'notEmpty') {
          // 确保rightSide为空字符串，避免校验问题
          rule.rightSide = ''
        }
      })
    })
  }
  
  return await formRef.value.validate()
}

defineExpose({ validate })
</script>

<style lang="scss" scoped>
.condition-group-tool {
  display: flex;
  justify-content: space-between;
  width: 500px;
  margin-bottom: 20px;
}

.condition-group {
  position: relative;

  &:hover {
    border-color: #0089ff;

    .condition-group-delete {
      opacity: 1;
    }
  }

  .condition-group-delete {
    position: absolute;
    top: 0;
    left: 0;
    display: flex;
    cursor: pointer;
    opacity: 0;
  }
}

::v-deep(.el-card__header) {
  padding: 8px var(--el-card-padding);
  border-bottom: 1px solid var(--el-card-border-color);
  box-sizing: border-box;
}
</style>
