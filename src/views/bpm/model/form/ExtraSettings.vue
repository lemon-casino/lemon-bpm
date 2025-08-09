<template>
  <el-form ref="formRef" :model="modelData" label-width="120px" class="mt-20px">
    <el-form-item class="mb-20px">
      <template #label>
        <el-text size="large" tag="b">提交人权限</el-text>
      </template>
      <div class="flex flex-col">
        <el-checkbox v-model="modelData.allowCancelRunningProcess" label="允许撤销审批中的申请" :disabled="props.isPreviewOnly" />
        <div class="ml-22px">
          <el-text type="info"> 第一个审批节点通过后，提交人仍可撤销申请 </el-text>
        </div>
      </div>
    </el-form-item>
    <el-form-item v-if="modelData.processIdRule" class="mb-20px">
      <template #label>
        <el-text size="large" tag="b">流程编码</el-text>
      </template>
      <div class="flex flex-col">
        <div>
          <el-input
            v-model="modelData.processIdRule.prefix"
            class="w-130px!"
            placeholder="前缀"
            :disabled="!modelData.processIdRule.enable || props.isPreviewOnly"
          >
            <template #prepend>
              <el-checkbox v-model="modelData.processIdRule.enable" :disabled="props.isPreviewOnly" />
            </template>
          </el-input>
          <el-select
            v-model="modelData.processIdRule.infix"
            class="w-130px! ml-5px"
            placeholder="中缀"
            :disabled="!modelData.processIdRule.enable || props.isPreviewOnly"
          >
            <el-option
              v-for="item in timeOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
          <el-input
            v-model="modelData.processIdRule.postfix"
            class="w-80px! ml-5px"
            placeholder="后缀"
            :disabled="!modelData.processIdRule.enable || props.isPreviewOnly"
          />
          <el-input-number
            v-model="modelData.processIdRule.length"
            class="w-120px! ml-5px"
            :min="5"
            :disabled="!modelData.processIdRule.enable || props.isPreviewOnly"
          />
        </div>
        <div class="ml-22px" v-if="modelData.processIdRule.enable">
          <el-text type="info"> 编码示例：{{ numberExample }} </el-text>
        </div>
      </div>
    </el-form-item>
    <el-form-item class="mb-20px">
      <template #label>
        <el-text size="large" tag="b">自动去重</el-text>
      </template>
      <div class="flex flex-col">
        <div>
          <el-text> 同一审批人在流程中重复出现时： </el-text>
        </div>
        <el-radio-group v-model="modelData.autoApprovalType" :disabled="props.isPreviewOnly">
          <div class="flex flex-col">
            <el-radio :value="0">不自动通过</el-radio>
            <el-radio :value="1">仅审批一次，后续重复的审批节点均自动通过</el-radio>
            <el-radio :value="2">仅针对连续审批的节点自动通过</el-radio>
          </div>
        </el-radio-group>
      </div>
    </el-form-item>
    <el-form-item v-if="modelData.titleSetting" class="mb-20px">
      <template #label>
        <el-text size="large" tag="b">标题设置</el-text>
      </template>
      <div class="flex flex-col">
        <el-radio-group v-model="modelData.titleSetting.enable" :disabled="props.isPreviewOnly">
          <div class="flex flex-col">
            <el-radio :value="false">
              系统默认 <el-text type="info"> 展示流程名称 </el-text>
            </el-radio>
            <el-radio :value="true">
              自定义标题
              <el-tooltip content="可通过拖拽选择变量，或直接输入文本" effect="light" placement="top">
                <Icon icon="ep:question-filled" class="ml-5px" />
              </el-tooltip>
            </el-radio>
          </div>
        </el-radio-group>

        <div v-if="modelData.titleSetting.enable" class="mt-10px relative">
          <!-- 标题组合区域 -->
          <div class="mb-10px">
            <div class="mb-5px flex justify-between items-center">
              <span class="font-medium">标题组合</span>
              <div class="flex items-center gap-8px">
                <el-button type="primary" link @click="toolbarVisible = true" :disabled="props.isPreviewOnly">
                  <Icon icon="ep:tools" class="mr-5px" />工具栏
                </el-button>
                <el-button type="primary" link @click="previewVisible = true">
                  <Icon icon="ep:view" class="mr-5px" />预览
                </el-button>
                <el-button type="primary" link @click="addCustomText" :disabled="props.isPreviewOnly">
                  <Icon icon="ep:plus" class="mr-5px" />添加文本
                </el-button>
              </div>
            </div>
            <div class="bg-white border-2 border-[#409eff] rounded-md p-10px">
              <VueDraggable
                v-model="selectedItems"
                :group="{ name: 'titleItems', put: ['variables', 'separators'] }"
                item-key="id"
                class="flex flex-wrap gap-3px min-h-[40px] border border-dashed border-[#e6e6e6] rounded p-3px hover:border-[#409eff] transition-colors"
                :disabled="props.isPreviewOnly"
              >
                <template #item="{ element }">
                  <div
                    class="group flex items-center rounded h-[24px] transition-all"
                    :class="[
                      element.type === 'variable' ? 'bg-[#409eff] text-white hover:bg-[#79bbff]' : 'bg-[#f5f7fa] text-[#606266] hover:bg-[#e9e9eb]'
                    ]"
                  >
                    <div class="px-6px cursor-move flex items-center text-12px">
                      <template v-if="element.type === 'text'">
                        <el-input
                          v-if="element.isEditing"
                          v-model="element.value"
                          size="small"
                          class="!w-80px !text-12px !h-[20px]"
                          @blur="updateCustomText(element, element.value)"
                          @keyup.enter="updateCustomText(element, element.value)"
                        />
                        <span v-else @dblclick="element.isEditing = true">{{ element.value || '点击输入' }}</span>
                      </template>
                      <span v-else>{{ element.label }}</span>
                    </div>
                    <div
                      class="px-4px border-l h-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity flex items-center"
                      :class="element.type === 'variable' ? 'border-[#bae0ff]' : 'border-[#e9e9eb]'"
                      @click="selectedItems.splice(selectedItems.indexOf(element), 1)"
                    >
                      <Icon icon="ep:close" class="text-12px" />
                    </div>
                  </div>
                </template>
                <!-- 添加空状态提示 -->
                <template #header v-if="selectedItems.length === 0">
                  <div class="w-full h-full flex items-center justify-center text-[#909399]">
                    <Icon icon="ep:upload" class="mr-5px" />
                    可拖拽工具栏中的变量到此处组合标题
                  </div>
                </template>
              </VueDraggable>
            </div>
          </div>

          <!-- 工具栏浮动面板 -->
          <div
            v-show="toolbarVisible"
            class="fixed bg-white rounded-md border shadow-lg w-350px"
            :style="{
              top: toolbarPosition.top + 'px',
              left: toolbarPosition.left + 'px',
              zIndex: 2000
            }"
            @mousedown.stop="startDrag($event, 'toolbar')"
          >
            <!-- 头部 -->
            <div class="flex items-center justify-between w-full p-10px border-b bg-[#f5f7fa]">
              <div class="flex items-center text-[#909399]">
                <Icon icon="ep:tools" class="mr-5px" />工具栏
              </div>
              <div class="flex items-center gap-8px">
                <el-tooltip content="固定/取消固定" effect="light">
                  <el-button type="primary" link class="!p-0" @click="isToolbarFixed = !isToolbarFixed">
                    <Icon :icon="isToolbarFixed ? 'ep:lock' : 'ep:unlock'" />
                  </el-button>
                </el-tooltip>
                <el-tooltip content="收起" effect="light">
                  <el-button type="primary" link class="!p-0" @click="toolbarVisible = false">
                    <Icon icon="ep:close" />
                  </el-button>
                </el-tooltip>
              </div>
            </div>

            <!-- 修改内容区域，添加最大高度和滚动 -->
            <div class="p-12px max-h-[60vh] overflow-y-auto">
              <!-- 可用变量 -->
              <div class="mb-10px">
                <div class="mb-5px font-medium">可用变量</div>
                <VueDraggable
                  v-model="availableVariables"
                  :group="{ name: 'variables', pull: 'clone', put: false }"
                  item-key="value"
                  :sort="false"
                  :clone="item => ({
                    ...item,
                    id: Date.now().toString(),
                    type: 'variable',
                    isEditing: false
                  })"
                  class="flex flex-wrap gap-8px"
                  @start="handleDragStart"
                  @end="handleDragEnd"
                >
                  <template #item="{ element }">
                    <div
                      class="cursor-move rounded-md px-10px py-6px flex items-center transition-all"
                      :class="isVariableUsed(element) ? 
                        'bg-[#e6f4ff] text-[#1677ff] hover:bg-[#bae0ff]' : 
                        'bg-[#f5f7fa] text-[#909399] hover:bg-[#e9e9eb]'"
                      @mousedown.stop
                    >
                      {{ element.label }}
                    </div>
                  </template>
                </VueDraggable>
              </div>
              <!-- 连接符 -->
              <div>
                <div class="mb-5px font-medium">连接符</div>
                <VueDraggable
                  :list="separators"
                  :group="{ name: 'separators', pull: 'clone', put: false }"
                  item-key="id"
                  :sort="false"
                  :clone="item => ({
                    ...item,
                    id: Date.now().toString(),
                    type: 'separator',
                    isEditing: false
                  })"
                  class="flex flex-wrap gap-8px"
                  @start="handleDragStart"
                  @end="handleDragEnd"
                >
                  <template #item="{ element }">
                    <div
                      class="cursor-move rounded-md px-10px py-6px flex items-center transition-all"
                      :class="isSeparatorUsed(element) ? 
                       'bg-[#e6f4ff] text-[#1677ff] hover:bg-[#bae0ff]' : 
                        'bg-[#f5f7fa] text-[#909399] hover:bg-[#e9e9eb]'"
                      @mousedown.stop
                    >
                      {{ element.label }}
                    </div>
                  </template>
                </VueDraggable>
              </div>
            </div>
          </div>

          <!-- 预览效果浮动面板 -->
          <div
            v-show="previewVisible"
            class="fixed bg-white rounded-md border shadow-lg w-350px"
            :style="{
              top: previewPosition.top + 'px',
              left: previewPosition.left + 'px',
              zIndex: 2000
            }"
            @mousedown.stop="startDrag($event, 'preview')"
          >
            <div class="flex items-center justify-between w-full p-10px border-b bg-[#f5f7fa]">
              <div class="flex items-center text-[#909399]">
                <Icon icon="ep:view" class="mr-5px" />预览效果
              </div>
              <div class="flex items-center gap-8px">
                <el-tooltip content="固定/取消固定" effect="light">
                  <el-button type="primary" link class="!p-0" @click="isPreviewFixed = !isPreviewFixed">
                    <Icon :icon="isPreviewFixed ? 'ep:lock' : 'ep:unlock'" />
                  </el-button>
                </el-tooltip>
                <el-tooltip content="收起" effect="light">
                  <el-button type="primary" link class="!p-0" @click="previewVisible = false">
                    <Icon icon="ep:close" />
                  </el-button>
                </el-tooltip>
              </div>
            </div>

            <div class="text-[#303133]">
              {{ formatTitlePreview(modelData.titleSetting.title) }}
            </div>
          </div>

          <!-- 使用说明 -->
          <div class="mt-5px text-[#909399] text-12px">
            <Icon icon="ep:info-filled" class="mr-3px" />
            提示：拖拽变量和连接符到标题组合区域，可随时调整顺序
          </div>
        </div>
      </div>
    </el-form-item>
    <el-form-item
      v-if="modelData.summarySetting && modelData.formType === BpmModelFormType.NORMAL"
      class="mb-20px"
    >
      <template #label>
        <el-text size="large" tag="b">摘要设置</el-text>
      </template>
      <div class="flex flex-col">
        <el-radio-group v-model="modelData.summarySetting.enable">
          <div class="flex flex-col">
            <el-radio :value="false">
              系统默认 <el-text type="info"> 展示表单前 3 个字段 </el-text>
            </el-radio>
            <el-radio :value="true"> 自定义摘要 </el-radio>
          </div>
        </el-radio-group>
        <el-select
          class="w-500px!"
          v-if="modelData.summarySetting.enable"
          v-model="modelData.summarySetting.summary"
          multiple
          placeholder="请选择要展示的表单字段"
        >
          <el-option
            v-for="item in formFieldOptions4Summary"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </div>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import { BpmAutoApproveType, BpmModelFormType } from '@/utils/constants'
import * as FormApi from '@/api/bpm/form'
import { parseFormFields } from '@/components/FormCreate/src/utils'
import { ProcessVariableEnum } from '@/components/SimpleProcessDesignerV2/src/consts'
import VueDraggable from 'vuedraggable'

const props = defineProps({
  isPreviewOnly: {
    type: Boolean,
    default: false
  }
})

const modelData = defineModel<any>()

/** 自定义 ID 流程编码 */
const timeOptions = ref([
  {
    value: '',
    label: '无'
  },
  {
    value: 'DAY',
    label: '精确到日'
  },
  {
    value: 'HOUR',
    label: '精确到时'
  },
  {
    value: 'MINUTE',
    label: '精确到分'
  },
  {
    value: 'SECOND',
    label: '精确到秒'
  }
])
const numberExample = computed(() => {
  if (modelData.value.processIdRule.enable) {
    let infix = ''
    switch (modelData.value.processIdRule.infix) {
      case 'DAY':
        infix = dayjs().format('YYYYMMDD')
        break
      case 'HOUR':
        infix = dayjs().format('YYYYMMDDHH')
        break
      case 'MINUTE':
        infix = dayjs().format('YYYYMMDDHHmm')
        break
      case 'SECOND':
        infix = dayjs().format('YYYYMMDDHHmmss')
        break
      default:
        break
    }
    return (
      modelData.value.processIdRule.prefix +
      infix +
      modelData.value.processIdRule.postfix +
      '1'.padStart(modelData.value.processIdRule.length - 1, '0')
    )
  } else {
    return ''
  }
})

/** 表单选项 */
const formField = ref<Array<{ field: string; title: string }>>([])
const formFieldOptions4Title = computed(() => {
  let cloneFormField = formField.value.map((item) => {
    return {
      label: item.title,
      value: item.field,
      preview: `[${item.title}]`
    }
  })
  // 固定添加系统字段，并设置更友好的预览显示
  cloneFormField.unshift({
    label: '流程名称',
    value: ProcessVariableEnum.PROCESS_DEFINITION_NAME,
    preview: '[请假流程]'
  })
  cloneFormField.unshift({
    label: '发起时间',
    value: ProcessVariableEnum.START_TIME,
    preview: '[2024-03-20 10:00]'
  })
  cloneFormField.unshift({
    label: '发起人',
    value: ProcessVariableEnum.START_USER_ID,
    preview: '[张三]'
  })
  return cloneFormField
})
const formFieldOptions4Summary = computed(() => {
  return formField.value.map((item) => {
    return {
      label: item.title,
      value: item.field
    }
  })
})

/** 添加标题解析方法 */
const parseSavedTitle = (title: string) => {
  if (!title) return []

  const items: any[] = []
  let currentIndex = 0

  while (currentIndex < title.length) {
    if (title[currentIndex] === '{') {
      // 找到变量的结束位置
      const endIndex = title.indexOf('}', currentIndex)
      if (endIndex !== -1) {
        const variableKey = title.substring(currentIndex + 1, endIndex)
        // 查找对应的变量
        const variable = formFieldOptions4Title.value.find(item => item.value === variableKey)
        if (variable) {
          items.push({
            id: Date.now() + Math.random().toString(),
            type: 'variable',
            value: variable.value,
            label: variable.label,
            preview: variable.preview,
            isEditing: false
          })
        } else {
          // 如果在当前可用变量中找不到，可能是表单字段尚未加载，添加一个占位变量
          items.push({
            id: Date.now() + Math.random().toString(),
            type: 'variable',
            value: variableKey,
            label: variableKey, // 使用原始键作为标签
            preview: `[${variableKey}]`,
            isEditing: false
          })
        }
        currentIndex = endIndex + 1
        continue
      }
    }

    // 处理非变量文本
    let textEnd = title.indexOf('{', currentIndex)
    if (textEnd === -1) textEnd = title.length

    const text = title.substring(currentIndex, textEnd)
    if (text) {
      // 检查是否是预定义的分隔符
      const separator = separators.find(sep => sep.value === text)
      if (separator) {
        items.push({
          ...separator,
          id: Date.now() + Math.random().toString()
        })
      } else {
        items.push({
          id: Date.now() + Math.random().toString(),
          type: 'text',
          value: text,
          label: text,
          isEditing: false
        })
      }
    }
    currentIndex = textEnd
  }

  return items
}

/** 修改 initData 方法，添加标题解析 */
const initData = () => {
  if (!modelData.value.processIdRule) {
    modelData.value.processIdRule = {
      enable: false,
      prefix: '',
      infix: '',
      postfix: '',
      length: 5
    }
  }
  if (!modelData.value.autoApprovalType) {
    modelData.value.autoApprovalType = BpmAutoApproveType.NONE
  }
  if (!modelData.value.titleSetting) {
    modelData.value.titleSetting = {
      enable: false,
      title: ''
    }
  }
  if (!modelData.value.summarySetting) {
    modelData.value.summarySetting = {
      enable: false,
      summary: []
    }
  }

  // 初始化标题组合数据
  if (modelData.value.titleSetting?.enable && modelData.value.titleSetting.title) {
    selectedItems.value = parseSavedTitle(modelData.value.titleSetting.title)
    // 确保标题内容已被正确更新
    updateTitleContent()
  } else {
    selectedItems.value = []
  }
}

/** 监听表单 ID 变化，加载表单数据 */
watch(
  () => modelData.value.formId,
  async (newFormId) => {
    if (newFormId && modelData.value.formType === BpmModelFormType.NORMAL) {
      const data = await FormApi.getForm(newFormId)
      console.log(data)
      const result: Array<{ field: string; title: string }> = []
      if (data.fields) {
        data.fields.forEach((fieldStr: string) => {
          parseFormFields(JSON.parse(fieldStr), result)
        })
      }
      formField.value = result

      // 在表单字段加载完成后，重新解析标题
      if (modelData.value.titleSetting?.enable && modelData.value.titleSetting.title) {
        selectedItems.value = parseSavedTitle(modelData.value.titleSetting.title)
      }
    } else {
      formField.value = []
    }
  },
  { immediate: true }
)

// 优化预览格式化方法
const formatTitlePreview = (title: string) => {
  if (!title) return ''
  let previewTitle = title

  formFieldOptions4Title.value.forEach((field) => {
    const placeholder = `{${field.value}}`
    if (previewTitle.includes(placeholder)) {
      previewTitle = previewTitle.replace(placeholder, field.preview)
    }
  })

  return previewTitle
}

// 添加可用变量和已选变量的数据
const availableVariables = computed(() => {
  return formFieldOptions4Title.value.map(item => ({
    ...item,
    type: 'variable'
  }))
})

const selectedItems = ref<Array<{
  id: string,
  type: 'variable' | 'separator' | 'text',
  value?: string,
  label?: string,
  preview?: string,
  isEditing: boolean
}>>([])

// 添加自由文本输入相关方法
const addCustomText = () => {
  selectedItems.value.push({
    id: Date.now().toString(),
    type: 'text',
    value: '',
    label: '自定义文本',
    isEditing: true
  })
}

// 更新自定义文本内容
const updateCustomText = (item: any, value: string) => {
  item.value = value
  item.isEditing = false
  updateTitleContent()
}

// 修改更新标题内容的方法
const updateTitleContent = () => {
  const titleContent = selectedItems.value
    .map(item => {
      if (item.type === 'variable') {
        return `{${item.value}}`;
      }
      return item.value;
    })
    .join('');

  // 确保 titleSetting 对象存在，然后更新标题
  if (!modelData.value.titleSetting) {
    modelData.value.titleSetting = {
      enable: true,
      title: titleContent
    };
  } else {
    modelData.value.titleSetting.title = titleContent;
  }
}

// 监听选中项变化
watch(selectedItems, () => {
  updateTitleContent()
}, { deep: true })

// 修改分隔符选项
const separators = [
  { type: 'separator', value: '的', label: '的', id: 'sep1', preview: '的' },
  { type: 'separator', value: '发起', label: '发起', id: 'sep2', preview: '发起' },
  { type: 'separator', value: '-', label: '-', id: 'sep3', preview: '-' },
  { type: 'separator', value: '：', label: '：', id: 'sep4', preview: '：' },
  { type: 'separator', value: '，', label: '，', id: 'sep5', preview: '，' },
  { type: 'separator', value: '于', label: '于', id: 'sep6', preview: '于' }
]

// 监听 titleSetting.enable 变化，当启用自定义标题时解析已有标题
watch(
  () => modelData.value.titleSetting?.enable,
  (newValue) => {
    if (newValue && modelData.value.titleSetting.title) {
      selectedItems.value = parseSavedTitle(modelData.value.titleSetting.title)
    } else {
      selectedItems.value = []
    }
  }
)

// 监听 formField 变化，重新解析标题
watch(
  () => formField.value,
  () => {

    if (modelData.value.titleSetting?.enable && modelData.value.titleSetting.title) {
      // 保存当前选中的变量值，以便在解析后尝试恢复
      const oldSelectedItems = [...selectedItems.value]

      // 重新解析标题
      selectedItems.value = parseSavedTitle(modelData.value.titleSetting.title)

      // 更新已选项中的表单字段标签（针对表单字段加载后的情况）
      selectedItems.value.forEach((item, index) => {
        if (item.type === 'variable') {
          const foundVariable = formFieldOptions4Title.value.find(v => v.value === item.value)
          if (foundVariable) {
            // 更新标签和预览
            item.label = foundVariable.label
            item.preview = foundVariable.preview
          }
        }
      })
    }
  }
)

// 添加判断变量是否已使用的方法
const isVariableUsed = (variable: any) => {
  return selectedItems.value.some(item =>
    item.type === 'variable' && item.value === variable.value
  )
}

// 添加判断连接符是否已使用的方法
const isSeparatorUsed = (separator: any) => {
  return selectedItems.value.some(item =>
    item.type === 'separator' && item.value === separator.value
  )
}

const previewVisible = ref(false)
const isPreviewFixed = ref(false)

// 保留必要的状态
const toolbarVisible = ref(false)
const isToolbarFixed = ref(false)

// 添加拖拽相关的状态和方法
const isDraggingItem = ref(false)

const handleDragStart = () => {
  isDraggingItem.value = true
}

const handleDragEnd = () => {
  isDraggingItem.value = false
}

// 添加位置状态
const toolbarPosition = ref({ top: 60, left: window.innerWidth - 400 })
const previewPosition = ref({ top: 60, left: window.innerWidth - 400 })

// 拖拽相关状态
const isDragging = ref(false)
const dragTarget = ref<'toolbar' | 'preview' | null>(null)
const dragOffset = ref({ x: 0, y: 0 })

// 拖拽方法
const startDrag = (event: MouseEvent, target: 'toolbar' | 'preview') => {
  if ((target === 'toolbar' && isToolbarFixed.value) ||
    (target === 'preview' && isPreviewFixed.value)) {
    return
  }

  isDragging.value = true
  dragTarget.value = target
  const position = target === 'toolbar' ? toolbarPosition.value : previewPosition.value
  dragOffset.value = {
    x: event.clientX - position.left,
    y: event.clientY - position.top
  }

  document.addEventListener('mousemove', handleDrag)
  document.addEventListener('mouseup', stopDrag)
}

const handleDrag = (event: MouseEvent) => {
  if (!isDragging.value || !dragTarget.value) return

  const position = dragTarget.value === 'toolbar' ? toolbarPosition : previewPosition
  position.value = {
    left: Math.max(0, Math.min(event.clientX - dragOffset.value.x, window.innerWidth - 350)),
    top: Math.max(0, Math.min(event.clientY - dragOffset.value.y, window.innerHeight - 100))
  }
}

const stopDrag = () => {
  isDragging.value = false
  dragTarget.value = null
  document.removeEventListener('mousemove', handleDrag)
  document.removeEventListener('mouseup', stopDrag)
}

// 组件卸载时清理
onUnmounted(() => {
  document.removeEventListener('mousemove', handleDrag)
  document.removeEventListener('mouseup', stopDrag)
})

// 添加确保标题设置被正确更新的方法
const ensureTitleSettings = () => {
  if (modelData.value.titleSetting?.enable) {
    updateTitleContent()
  }
}

// 暴露方法给父组件使用
defineExpose({
  initData,
  ensureTitleSettings
})
</script>

<style>
.title-toolbar-dialog .el-dialog__header,
.title-preview-dialog .el-dialog__header {
  margin: 0;
  padding: 10px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
}

.title-toolbar-dialog .el-dialog__body,
.title-preview-dialog .el-dialog__body {
  padding: 12px;
}

/* 确保对话框可以拖动到页面任何位置 */
.title-toolbar-dialog .el-dialog,
.title-preview-dialog .el-dialog {
  position: absolute;
  margin: 0 !important;
  z-index: 2000;
}

/* 确保拖拽项在对话框之上 */
.title-toolbar-dialog .el-dialog__body {
  overflow: visible;
}

/* 确保拖拽时item显示在最上层 */
.sortable-drag {
  z-index: 2100;
}
</style>
