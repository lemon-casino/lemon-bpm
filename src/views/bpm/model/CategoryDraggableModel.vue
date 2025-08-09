<template>
  <div class="flex items-center h-50px" v-memo="[categoryInfo.name, isCategorySorting]">
    <!-- 头部：分类名 -->
    <div class="flex items-center">
      <el-tooltip content="拖动排序" v-if="isCategorySorting">
        <Icon
          :size="22"
          icon="ic:round-drag-indicator"
          class="ml-10px category-drag-icon cursor-move text-#8a909c"
        />
      </el-tooltip>
      <h3 class="ml-20px mr-8px text-18px">{{ categoryInfo.name }}</h3>
      <div class="color-gray-600 text-16px"> ({{ categoryInfo.modelList?.length || 0 }}) </div>
    </div>
    <!-- 头部：操作 -->
    <div class="flex-1 flex" v-show="!isCategorySorting">
      <div
        v-if="categoryInfo.modelList.length > 0"
        class="ml-20px flex items-center"
        :class="[
          'transition-transform duration-300 cursor-pointer',
          isExpand ? 'rotate-180' : 'rotate-0'
        ]"
        @click="handleExpandClick"
      >
        <Icon icon="ep:arrow-down-bold" color="#999" />
      </div>
      <div class="ml-auto flex items-center" :class="isModelSorting ? 'mr-15px' : 'mr-45px'">
        <template v-if="!isModelSorting">
          <el-button
            v-if="categoryInfo.modelList.length > 0"
            link
            type="info"
            class="mr-20px"
            @click.stop="handleModelSort"
          >
            <Icon icon="fa:sort-amount-desc" class="mr-5px" />
            排序
          </el-button>
          <el-button v-else link type="info" class="mr-20px" @click.stop="openModelForm('create')">
            <Icon icon="fa:plus" class="mr-5px" />
            新建
          </el-button>
          <el-dropdown
            @command="(command) => handleCategoryCommand(command, categoryInfo)"
            placement="bottom"
          >
            <el-button link type="info">
              <Icon icon="ep:setting" class="mr-5px" />
              分类
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="handleRename"> 重命名 </el-dropdown-item>
                <el-dropdown-item command="handleDeleteCategory"> 删除该类 </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </template>
        <template v-else>
          <el-button @click.stop="handleModelSortCancel"> 取 消 </el-button>
          <el-button type="primary" @click.stop="handleModelSortSubmit"> 保存排序 </el-button>
        </template>
      </div>
    </div>
  </div>

  <!-- 模型列表 -->
  <el-collapse-transition>
    <div v-show="renderTable">
      <div v-if="isTableLoading" class="table-skeleton">
        <!-- 简单的骨架屏实现 -->
        <div class="skeleton-row" v-for="i in 3" :key="i"></div>
      </div>
      <el-table
        v-else-if="showTableContent"
        :class="categoryInfo.name"
        ref="tableRef"
        :data="modelList"
        row-key="id"
        :header-cell-style="tableHeaderStyle"
        :cell-style="tableCellStyle"
        :row-style="{ height: '68px' }"
        :max-height="450"
        :scrollbar-always-on="true"
        :virtual-scrolling="{ enabled: true, itemSize: 68 }"
      >
        <el-table-column label="流程名" prop="name" min-width="150">
          <template #default="{ row }">
            <div class="flow-name-container">
              <div class="flow-icon-wrapper">
                <el-tooltip content="拖动排序" v-if="isModelSorting">
                  <Icon
                    icon="ic:round-drag-indicator"
                    class="drag-icon cursor-move text-#8a909c mr-10px"
                  />
                </el-tooltip>
                <el-image v-if="row.icon" :src="row.icon" class="h-38px w-38px mr-10px rounded" />
                <div v-else class="flow-icon">
                  <span style="font-size: 12px; color: #fff">{{ subString(row.name, 0, 2) }}</span>
                </div>
              </div>
              <div class="flow-name-text">{{ row.name }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="可见范围" prop="startUserIds" min-width="150">
          <template #default="{ row }">
            <el-text v-if="!row.startUsers?.length"> 全部可见 </el-text>
            <el-text v-else-if="row.startUsers.length === 1">
              {{ row.startUsers[0].nickname }}
            </el-text>
            <el-text v-else>
              <el-tooltip
                class="box-item"
                effect="dark"
                placement="top"
                :content="row.startUsers.map((user: any) => user.nickname).join('、')"
              >
                {{ row.startUsers[0].nickname }}等 {{ row.startUsers.length }} 人可见
              </el-tooltip>
            </el-text>
          </template>
        </el-table-column>
        <el-table-column label="表单信息" prop="formType" min-width="150">
          <template #default="scope">
            <el-button
              v-if="scope.row.formType === BpmModelFormType.NORMAL"
              type="primary"
              link
              @click="handleFormDetail(scope.row)"
            >
              <span>{{ scope.row.formName }}</span>
            </el-button>
            <el-button
              v-else-if="scope.row.formType === BpmModelFormType.CUSTOM"
              type="primary"
              link
              @click="handleFormDetail(scope.row)"
            >
              <span>{{ scope.row.formCustomCreatePath }}</span>
            </el-button>
            <label v-else>暂无表单</label>
          </template>
        </el-table-column>
        <el-table-column label="最后发布" prop="deploymentTime" min-width="250">
          <template #default="scope">
            <div class="flex items-center">
              <span v-if="scope.row.processDefinition" class="w-150px">
                {{ formatDate(scope.row.processDefinition.deploymentTime) }}
              </span>
              <el-tag v-if="scope.row.processDefinition">
                v{{ scope.row.processDefinition.version }}
              </el-tag>
              <el-tag v-else type="warning">未部署</el-tag>
              <el-tag
                v-if="scope.row.processDefinition?.suspensionState === 2"
                type="warning"
                class="ml-10px"
              >
                已停用
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="scope">
            <div class="flex items-center">
              <el-button
                link
                type="primary"
                class="!align-middle"
                @click="openModelForm('update', scope.row.id)"
                v-if="hasPermiUpdate"
                :disabled="!isManagerUser(scope.row)"
              >
                修改
              </el-button>
              <el-button
                link
                type="primary"
                class="!align-middle !ml-1px"
                @click="openModelForm('copy', scope.row.id)"
                v-if="hasPermiUpdate"
                :disabled="!isManagerUser(scope.row)"
              >
                复制
              </el-button>
              <el-button
                link
                type="primary"
                class="!align-middle !ml-1px"
                @click="handleDeploy(scope.row)"
                v-if="hasPermiDeploy"
                :disabled="!isManagerUser(scope.row)"
              >
                发布
              </el-button>
              <el-button
                link
                type="primary"
                class="!align-middle !ml-1px"
                @click="handleClean(scope.row)"
                v-if="hasPermiClean"
                :disabled="!isManagerUser(scope.row)"
              >
                清理
              </el-button>
              
              <!-- 正在运行按钮 -->
              <el-popover
                v-if="scope.row.processDefinitionIdList && scope.row.processDefinitionIdList.length > 0 && hasPermiRun"
                placement="top"
                :width="120"
                trigger="hover"
              >
                <template #reference>
                  <el-button
                    link
                    type="success"
                    class="!align-middle !ml-1px !px-1"
                  >
                    运行
                  </el-button>
                </template>
                <div class="p-4px">
                  <div class="text-12px font-bold mb-4px">版本信息</div>
                  <div 
                    v-for="(item, index) in [...scope.row.processDefinitionIdList].sort((a, b) => Number(extractVersion(b)) - Number(extractVersion(a)))" 
                    :key="index" 
                    class="mb-2px cursor-pointer hover:bg-gray-100 p-2px rounded" 
                    @click="handleVersionClick(scope.row, item)"
                  >
                    <el-tag size="small" class="!m-0 !text-xs !px-1">版本{{ extractVersion(item) }}</el-tag>
                  </div>
                </div>
              </el-popover>

              <el-dropdown
                class="!align-middle !ml-1px inline-flex"
                @command="(command) => handleModelCommand(command, scope.row)"
                v-if="hasPermiMore"
              >
                <el-button type="primary" link class="!align-middle">更多</el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="handleDefinitionList" v-if="hasPermiPdQuery">
                      历史
                    </el-dropdown-item>
                    <el-dropdown-item
                      command="handleReport"
                      v-if="
                        checkPermi(['bpm:process-instance:manager-query']) &&
                        scope.row.processDefinition
                      "
                      :disabled="!isManagerUser(scope.row)"
                    >
                      报表
                    </el-dropdown-item>
                    <el-dropdown-item
                      command="handleChangeState"
                      v-if="hasPermiUpdate && scope.row.processDefinition"
                      :disabled="!isManagerUser(scope.row)"
                    >
                      {{ scope.row.processDefinition.suspensionState === 1 ? '停用' : '启用' }}
                    </el-dropdown-item>
                    <el-dropdown-item
                      type="danger"
                      command="handleClean"
                      v-if="checkPermi(['bpm:model:clean'])"
                      :disabled="!isManagerUser(scope.row)"
                    >
                      清理
                    </el-dropdown-item>
                    <el-dropdown-item
                      type="danger"
                      command="handleDelete"
                      v-if="hasPermiDelete"
                      :disabled="!isManagerUser(scope.row)"
                    >
                      删除
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </el-collapse-transition>

  <!-- 弹窗：重命名分类 -->
  <Dialog :fullscreen="false" class="rename-dialog" v-model="renameCategoryVisible" width="400">
    <template #title>
      <div class="pl-10px font-bold text-18px"> 重命名分类 </div>
    </template>
    <div class="px-30px">
      <el-input v-model="renameCategoryForm.name" />
    </div>
    <template #footer>
      <div class="pr-25px pb-25px">
        <el-button @click="renameCategoryVisible = false">取 消</el-button>
        <el-button type="primary" @click="handleRenameConfirm">确 定</el-button>
      </div>
    </template>
  </Dialog>

  <!-- 弹窗：表单详情 -->
  <FormPreviewDialog
    v-model="formDetailVisible"
    :rule="formDetailPreview.rule"
    :option="formDetailPreview.option"
    :close-on-click-modal="true"
  />
</template>

<script lang="ts" setup>
import { CategoryApi, CategoryVO } from '@/api/bpm/category'
import Sortable from 'sortablejs'
import { formatDate } from '@/utils/formatTime'
import * as ModelApi from '@/api/bpm/model'
import * as FormApi from '@/api/bpm/form'
import { setConfAndFields2 } from '@/utils/formCreate'
import { BpmModelFormType } from '@/utils/constants'
import { checkPermi } from '@/utils/permission'
import { useUserStoreWithOut } from '@/store/modules/user'
import { useAppStore } from '@/store/modules/app'
import { cloneDeep, isEqual } from 'lodash-es'
import { useTagsView } from '@/hooks/web/useTagsView'
import { useDebounceFn } from '@vueuse/core'
import { subString } from '@/utils/index'
import FormPreviewDialog from '@/components/FormPreviewDialog/index.vue'
import { nextTick } from 'vue'

defineOptions({ name: 'BpmModel' })

// 优化 Props 类型定义
interface UserInfo {
  nickname: string
  [key: string]: any
}

interface ProcessDefinition {
  deploymentTime: string
  version: number
  suspensionState: number
}

interface ModelInfo {
  id: number
  name: string
  icon?: string
  startUsers?: UserInfo[]
  processDefinition?: ProcessDefinition
  formType?: number
  formId?: number
  formName?: string
  formCustomCreatePath?: string
  managerUserIds?: number[]
  [key: string]: any
}

interface CategoryInfoProps {
  id: number
  name: string
  modelList: ModelInfo[]
}

const props = defineProps<{
  categoryInfo: CategoryInfoProps
  isCategorySorting: boolean
  autoExpand?: boolean
}>()

const emit = defineEmits(['success'])
const message = useMessage() // 消息弹窗
const { t } = useI18n() // 国际化
const { push } = useRouter() // 路由
const userStore = useUserStoreWithOut() // 用户信息缓存
const isDark = computed(() => useAppStore().getIsDark) // 是否黑暗模式
const router = useRouter() // 路由

const isModelSorting = ref(false) // 是否正处于排序状态
const originalData = ref<ModelInfo[]>([]) // 原始数据
const modelList = ref<ModelInfo[]>([]) // 模型列表
const isExpand = ref(false) // 是否处于展开状态
const isTableLoading = ref(false) // 表格加载状态
const isTableReady = ref(false) // 表格数据准备状态

// 添加延迟加载控制
const shouldRender = ref(false)

// 处理展开/收起点击
const handleExpandClick = () => {
  if (isExpand.value) {
    // 收起时直接执行
    isExpand.value = false
  } else {
    // 展开时先显示加载状态，然后延迟渲染内容
    isExpand.value = true
    isTableLoading.value = true
    
    // 给展开动画留出完成的时间
    setTimeout(() => {
      isTableLoading.value = false
    }, 300) // 与过渡动画时间匹配
  }
}

onMounted(() => {
  // 延迟200ms加载内容，避免首次渲染卡顿
  setTimeout(() => {
    shouldRender.value = true
  }, 200)
})

// 优化表格渲染
const renderTable = computed(() => {
  return shouldRender.value && isExpand.value
})

// 单独控制表格内容显示与否
const showTableContent = computed(() => {
  return modelList.value && modelList.value.length > 0 && isTableReady.value && !isTableLoading.value
})

// 使用 computed 优化表格样式计算
const tableHeaderStyle = computed(() => ({
  backgroundColor: isDark.value ? '' : '#edeff0',
  paddingLeft: '10px'
}))

const tableCellStyle = computed(() => ({
  paddingLeft: '10px'
}))

/** 权限校验：通过 computed 解决列表的卡顿问题 */
const hasPermiUpdate = computed(() => {
  return checkPermi(['bpm:model:update'])
})
const hasPermiDelete = computed(() => {
  return checkPermi(['bpm:model:delete'])
})
const hasPermiDeploy = computed(() => {
  return checkPermi(['bpm:model:deploy'])
})
const hasPermiClean = computed(() => {
  return checkPermi(['bpm:model:clean'])
})
const hasPermiMore = computed(() => {
  return checkPermi(['bpm:process-definition:query', 'bpm:model:update', 'bpm:model:delete'])
})
const hasPermiPdQuery = computed(() => {
  return checkPermi(['bpm:process-definition:query'])
})
const hasPermiRun = computed(() => {
  return checkPermi(['bpm:model:run'])
})

/** '更多'操作按钮 */
const handleModelCommand = (command: string, row: any) => {
  switch (command) {
    case 'handleDefinitionList':
      // 使用 nextTick 确保菜单已关闭后再进行路由跳转
      nextTick(() => {
        handleDefinitionList(row)
      })
      break
    case 'handleDelete':
      handleDelete(row)
      break
    case 'handleChangeState':
      handleChangeState(row)
      break
    case 'handleClean':
      handleClean(row)
      break
    case 'handleReport':
      nextTick(() => {
        router.push({
          name: 'BpmProcessInstanceReport',
          query: {
            processDefinitionId: row.processDefinition.id,
            processDefinitionKey: row.key
          }
        })
      })
      break
    default:
      break
  }
}

/** '分类'操作按钮 */
const handleCategoryCommand = async (command: string, row: any) => {
  switch (command) {
    case 'handleRename':
      renameCategoryForm.value = await CategoryApi.getCategory(row.id)
      renameCategoryVisible.value = true
      break
    case 'handleDeleteCategory':
      await handleDeleteCategory()
      break
    default:
      break
  }
}

/** 删除按钮操作 */
const handleDelete = async (row: any) => {
  try {
    // 删除的二次确认
    await message.delConfirm()
    // 发起删除
    await ModelApi.deleteModel(row.id)
    message.success(t('common.delSuccess'))
    // 刷新列表
    emit('success')
  } catch {}
}

/** 清理按钮操作 */
const handleClean = async (row: any) => {
  try {
    // 清理的二次确认
    await message.confirm('是否确认清理流程名字为"' + row.name + '"的数据项?')
    // 发起清理
    await ModelApi.cleanModel(row.id)
    message.success('清理成功')
    // 刷新列表
    emit('success')
  } catch {}
}

/** 更新状态操作 */
const handleChangeState = async (row: any) => {
  const state = row.processDefinition.suspensionState
  const newState = state === 1 ? 2 : 1
  try {
    // 修改状态的二次确认
    const id = row.id
    debugger
    const statusState = state === 1 ? '停用' : '启用'
    const content = '是否确认' + statusState + '流程名字为"' + row.name + '"的数据项?'
    await message.confirm(content)
    // 发起修改状态
    await ModelApi.updateModelState(id, newState)
    message.success(statusState + '成功')
    // 刷新列表
    emit('success')
  } catch {}
}

/** 发布流程 */
const handleDeploy = async (row: any) => {
  try {
    await message.confirm('是否确认发布该流程？')
    // 发起部署
    await ModelApi.deployModel(row.id)
    message.success(t('发布成功'))
    // 刷新列表
    emit('success')
  } catch {}
}


/** 跳转到指定流程定义列表 */
const handleDefinitionList = (row: any) => {
  // 使用 setTimeout 添加微小延迟，确保 DOM 更新完成
  setTimeout(() => {
    push({
      name: 'BpmProcessDefinition',
      query: {
        key: row.key
      }
    })
  }, 50)
}

/** 流程表单的详情按钮操作 */
const formDetailVisible = ref(false)
const formDetailPreview = ref({
  rule: [],
  option: {}
})
const handleFormDetail = async (row: any) => {
  if (row.formType == BpmModelFormType.NORMAL) {
    // 设置表单
    const data = await FormApi.getForm(row.formId)
    setConfAndFields2(formDetailPreview, data.conf, data.fields)
    // 弹窗打开
    formDetailVisible.value = true
  } else {
    await push({
      path: row.formCustomCreatePath
    })
  }
}

/** 判断是否可以操作 */
const isManagerUser = (row: any) => {
  const userId = userStore.getUser.id
  return row.managerUserIds && row.managerUserIds.includes(userId)
}

/** 从processDefinitionId中提取版本号 */
const extractVersion = (processDefinitionId: string) => {
  // 格式通常为 "KEY:VERSION:ID"，例如 "CRT:1:39a93ded-688f-11f0-be58-d8bbc176bad5"
  const parts = processDefinitionId.split(':')
  if (parts.length >= 2) {
    return parts[1] // 返回版本号部分
  }
  return ''
}



/** 处理点击特定版本 */
const handleVersionClick = (row: any, processDefinitionId: string) => {
  // 跳转到表单编辑页面，并传入特定的processDefinitionId参数
  router.push({
    path: `/bpm/manager/model/edit/${row.id}`,
    query: { processDefinitionId }
  })
}

/** 处理模型的排序 **/
const handleModelSort = () => {
  // 保存初始数据
  originalData.value = cloneDeep(props.categoryInfo.modelList)
  isModelSorting.value = true
  initSort()
}

/** 处理模型的排序提交 */
const handleModelSortSubmit = async () => {
  // 保存排序
  const ids = modelList.value.map((item: any) => item.id)
  await ModelApi.updateModelSortBatch(ids)
  // 刷新列表
  isModelSorting.value = false
  message.success('排序模型成功')
  emit('success')
}

/** 处理模型的排序取消 */
const handleModelSortCancel = () => {
  // 恢复初始数据
  modelList.value = cloneDeep(originalData.value)
  isModelSorting.value = false
}

/** 创建拖拽实例 */
const tableRef = ref()
const initSort = useDebounceFn(() => {
  const table = document.querySelector(`.${props.categoryInfo.name} .el-table__body-wrapper tbody`)
  if (!table) return

  Sortable.create(table, {
    group: 'shared',
    animation: 150,
    draggable: '.el-table__row',
    handle: '.drag-icon',
    onEnd: ({ newDraggableIndex, oldDraggableIndex }) => {
      if (oldDraggableIndex !== newDraggableIndex) {
        modelList.value.splice(
          newDraggableIndex,
          0,
          modelList.value.splice(oldDraggableIndex, 1)[0]
        )
      }
    }
  })
}, 200)

// 使用防抖优化数据更新
const updateModeList = useDebounceFn(() => {
  const newModelList = props.categoryInfo.modelList
  
  // 快速路径：如果没有数据变化或不在展开状态，跳过处理
  if (!isExpand.value || isEqual(modelList.value, newModelList)) {
    return
  }
  
  // 重置准备状态
  isTableReady.value = false
  
  // 如果数据量小，直接更新
  if (newModelList.length < 50) {
    modelList.value = [...newModelList]
    isTableReady.value = true
    return
  }
  
  // 大数据量使用分片处理
  const chunk = 100
  const total = newModelList.length
  let processed = 0
  
  // 清除旧数据
  modelList.value = []
  
  const processNextChunk = () => {
    // 如果用户已收起，取消后续处理
    if (!isExpand.value) {
      return
    }
    
    const end = Math.min(processed + chunk, total)
    const partialList = newModelList.slice(processed, end)
    
    modelList.value = [...modelList.value, ...partialList]
    processed = end
    
    if (processed < total) {
      // 在下一帧继续处理
      requestAnimationFrame(processNextChunk)
    } else {
      // 全部处理完成
      isTableReady.value = true
    }
  }

  // 开始处理第一批
  requestAnimationFrame(processNextChunk)
}, 100)

// 监听展开状态变化
watch(() => isExpand.value, (newVal) => {
  if (newVal) {
    // 展开时，如果有数据并且还没准备好，延迟加载
    if (props.categoryInfo?.modelList?.length > 0 && !isTableReady.value) {
      isTableLoading.value = true
      
      // 延迟更新数据，先让展开动画完成
      setTimeout(() => {
        updateModeList()
      }, 100)
    }
  } else {
    // 收起时重置加载状态
    isTableLoading.value = false
  }
})

/** 重命名弹窗确定 */
const renameCategoryVisible = ref(false)
const renameCategoryForm = ref({
  name: ''
})
const handleRenameConfirm = async () => {
  if (renameCategoryForm.value?.name.length === 0) {
    return message.warning('请输入名称')
  }
  // 发起修改
  await CategoryApi.updateCategory(renameCategoryForm.value as CategoryVO)
  message.success('重命名成功')
  // 刷新列表
  renameCategoryVisible.value = false
  emit('success')
}

/** 删除分类 */
const handleDeleteCategory = async () => {
  try {
    if (props.categoryInfo.modelList.length > 0) {
      return message.warning('该分类下仍有流程定义,不允许删除')
    }
    await message.confirm('确认删除分类吗?')
    // 发起删除
    await CategoryApi.deleteCategory(props.categoryInfo.id)
    message.success(t('common.delSuccess'))
    // 刷新列表
    emit('success')
  } catch {}
}

/** 添加流程模型弹窗 */
const tagsView = useTagsView()
const openModelForm = async (type: string, id?: number) => {
  if (type === 'create') {
    await push({ name: 'BpmModelCreate' })
  } else {
    await push({
      name: 'BpmModelUpdate',
      params: { id, type }
    })
    // 设置标题
    if (type === 'copy') {
      tagsView.setTitle('复制流程')
    }
  }
}

// 替换原有的 watchEffect
watch(() => props.categoryInfo?.modelList, (newVal) => {
  if (newVal && isExpand.value) {
    // 只在展开状态更新数据
    updateModeList()
  }
}, { deep: true })

// 单独监听 autoExpand
watch(() => props.autoExpand, (newVal) => {
  if (newVal && !isExpand.value) {
    // 使用我们的展开处理函数
    handleExpandClick()
  }
})

// 监听排序状态
watch(() => props.isCategorySorting, (newVal) => {
  if (newVal && isExpand.value) {
    isExpand.value = false
  }
})
</script>

<style lang="scss">
.rename-dialog.el-dialog {
  padding: 0 !important;

  .el-dialog__header {
    border-bottom: none;
  }

  .el-dialog__footer {
    border-top: none !important;
  }
}
</style>
<style lang="scss" scoped>
.flow-icon {
  display: flex;
  width: 40px;
  height: 40px;
  margin-right: 10px;
  background-color: var(--el-color-primary);
  border-radius: 0.25rem;
  align-items: center;
  justify-content: center;
}

.category-draggable-model {
  :deep(.el-table__body-wrapper) {
    overflow-y: auto;
    will-change: transform;
    contain: strict;
  }

  :deep(.el-table__cell) {
    overflow: hidden;
    border-bottom: none !important;
    contain: content;
  }

  :deep(.el-table__body) {
    will-change: transform;
    transform: translateZ(0);
    contain: content;
  }
}

/* 优化过渡动画性能 */
.el-collapse-transition {
  will-change: height;
  transform: translateZ(0);
  backface-visibility: hidden;
}

:deep(.el-table__row) {
  contain: layout style;
}

.form-detail-container {
  height: 100%;
  width: 100%;
  overflow-y: auto;
  padding: 20px;
  position: relative;
  
  // 保留滚动条样式
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-thumb {
    background-color: var(--el-color-primary-light-5);
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-track {
    background-color: #f5f7fa;
  }
}

.table-skeleton {
  padding: 10px;
  
  .skeleton-row {
    height: 40px;
    background: #f5f7fa;
    margin-bottom: 10px;
    border-radius: 4px;
    animation: skeleton-loading 1.5s infinite ease-in-out;
  }
}

@keyframes skeleton-loading {
  0% {
    opacity: 0.6;
  }
  50% {
    opacity: 0.8;
  }
  100% {
    opacity: 0.6;
  }
}

.flow-name-container {
  display: flex;
  align-items: center;
}

.flow-icon-wrapper {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  min-width: 50px; /* 确保图标区域有最小宽度 */
}

.flow-name-text {
  word-break: break-word; /* 在必要的地方换行 */
  white-space: normal; /* 允许文本换行 */
  line-height: 1.5;
  padding-left: 5px; /* 添加左侧间距 */
  flex: 1;
  display: flex;
  align-items: center;
  min-height: 38px; /* 与图标高度保持一致 */
}
</style>
