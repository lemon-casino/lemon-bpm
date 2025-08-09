<template>
  <div v-loading="loading" class="process-viewer-wrapper">
    <!-- 使用el-scrollbar作为主要滚动容器 -->
    <el-scrollbar class="process-scrollbar">
      <div class="process-canvas">
        <SimpleProcessViewer
          :flow-node="simpleModel"
          :tasks="tasks"
          :process-instance="processInstance"
        />
      </div>
    </el-scrollbar>
  </div>
</template>
<script lang="ts" setup>
import { propTypes } from '@/utils/propTypes'
import { TaskStatusEnum } from '@/api/bpm/task'
import { SimpleFlowNode, NodeType } from '@/components/SimpleProcessDesignerV2/src/consts'
import { SimpleProcessViewer } from '@/components/SimpleProcessDesignerV2/src/'
defineOptions({ name: 'BpmProcessInstanceSimpleViewer' })

const props = defineProps({
  loading: propTypes.bool.def(false), // 是否加载中
  modelView: propTypes.object,
  simpleJson: propTypes.string // Simple 模型结构数据 (json 格式)
})
const simpleModel = ref<any>({})
// 用户任务
const tasks = ref([])
// 流程实例
const processInstance = ref()

/** 监控模型视图 包括任务列表、进行中的活动节点编号等 */
watch(
  () => props.modelView,
  async (newModelView) => {
    if (newModelView) {
      tasks.value = newModelView.tasks
      processInstance.value = newModelView.processInstance
      // 已经拒绝的活动节点编号集合，只包括 UserTask
      const rejectedTaskActivityIds: string[] = newModelView.rejectedTaskActivityIds
      // 进行中的活动节点编号集合， 只包括 UserTask
      const unfinishedTaskActivityIds: string[] = newModelView.unfinishedTaskActivityIds
      // 已经完成的活动节点编号集合， 包括 UserTask、Gateway 等
      const finishedActivityIds: string[] = newModelView.finishedTaskActivityIds
      // 已经完成的连线节点编号集合，只包括 SequenceFlow
      const finishedSequenceFlowActivityIds: string[] = newModelView.finishedSequenceFlowActivityIds
      setSimpleModelNodeTaskStatus(
        newModelView.simpleModel,
        newModelView.processInstance.status,
        rejectedTaskActivityIds,
        unfinishedTaskActivityIds,
        finishedActivityIds,
        finishedSequenceFlowActivityIds
      )
      simpleModel.value = newModelView.simpleModel
    }
  }
)
/** 监控模型结构数据 */
watch(
  () => props.simpleJson,
  async (value) => {
    if (value) {
      simpleModel.value = JSON.parse(value)
    }
  }
)
const setSimpleModelNodeTaskStatus = (
  simpleModel: SimpleFlowNode | undefined,
  processStatus: number,
  rejectedTaskActivityIds: string[],
  unfinishedTaskActivityIds: string[],
  finishedActivityIds: string[],
  finishedSequenceFlowActivityIds: string[]
) => {
  if (!simpleModel) {
    return
  }
  // 结束节点
  if (simpleModel.type === NodeType.END_EVENT_NODE) {
    if (finishedActivityIds.includes(simpleModel.id)) {
      simpleModel.activityStatus = processStatus
    } else {
      simpleModel.activityStatus = TaskStatusEnum.NOT_START
    }
    return
  }
  // 审批节点
  if (
    simpleModel.type === NodeType.START_USER_NODE ||
    simpleModel.type === NodeType.USER_TASK_NODE ||
    simpleModel.type === NodeType.TRANSACTOR_NODE
  ) {
    simpleModel.activityStatus = TaskStatusEnum.NOT_START
    if (rejectedTaskActivityIds.includes(simpleModel.id)) {
      simpleModel.activityStatus = TaskStatusEnum.REJECT
    } else if (unfinishedTaskActivityIds.includes(simpleModel.id)) {
      simpleModel.activityStatus = TaskStatusEnum.RUNNING
    } else if (finishedActivityIds.includes(simpleModel.id)) {
      simpleModel.activityStatus = TaskStatusEnum.APPROVE
    }
    // TODO 是不是还缺一个 cancel 的状态
  }
  // 抄送节点
  if (simpleModel.type === NodeType.COPY_TASK_NODE) {
    // 抄送节点,只有通过和未执行状态
    if (finishedActivityIds.includes(simpleModel.id)) {
      simpleModel.activityStatus = TaskStatusEnum.APPROVE
    } else {
      simpleModel.activityStatus = TaskStatusEnum.NOT_START
    }
  }
  // 延迟器节点
  if (simpleModel.type === NodeType.DELAY_TIMER_NODE) {
    // 延迟器节点,只有通过和未执行状态
    if (finishedActivityIds.includes(simpleModel.id)) {
      simpleModel.activityStatus = TaskStatusEnum.APPROVE
    } else {
      simpleModel.activityStatus = TaskStatusEnum.NOT_START
    }
  }
  // 触发器节点
  if (simpleModel.type === NodeType.TRIGGER_NODE) {
    // 触发器节点,只有通过和未执行状态
    if (finishedActivityIds.includes(simpleModel.id)) {
      simpleModel.activityStatus = TaskStatusEnum.APPROVE
    } else {
      simpleModel.activityStatus = TaskStatusEnum.NOT_START
    }
  }

  // 条件节点对应 SequenceFlow
  if (simpleModel.type === NodeType.CONDITION_NODE) {
    // 条件节点,只有通过和未执行状态
    if (finishedSequenceFlowActivityIds.includes(simpleModel.id)) {
      simpleModel.activityStatus = TaskStatusEnum.APPROVE
    } else {
      simpleModel.activityStatus = TaskStatusEnum.NOT_START
    }
  }
  // 网关节点
  if (
    simpleModel.type === NodeType.CONDITION_BRANCH_NODE ||
    simpleModel.type === NodeType.PARALLEL_BRANCH_NODE ||
    simpleModel.type === NodeType.INCLUSIVE_BRANCH_NODE ||
    simpleModel.type === NodeType.ROUTER_BRANCH_NODE
  ) {
    // 网关节点。只有通过和未执行状态
    if (finishedActivityIds.includes(simpleModel.id)) {
      simpleModel.activityStatus = TaskStatusEnum.APPROVE
    } else {
      simpleModel.activityStatus = TaskStatusEnum.NOT_START
    }
    simpleModel.conditionNodes?.forEach((node) => {
      setSimpleModelNodeTaskStatus(
        node,
        processStatus,
        rejectedTaskActivityIds,
        unfinishedTaskActivityIds,
        finishedActivityIds,
        finishedSequenceFlowActivityIds
      )
    })
  }

  setSimpleModelNodeTaskStatus(
    simpleModel.childNode,
    processStatus,
    rejectedTaskActivityIds,
    unfinishedTaskActivityIds,
    finishedActivityIds,
    finishedSequenceFlowActivityIds
  )
}
</script>

<style lang="scss" scoped>
.process-viewer-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden; // 确保内容不会溢出
}

.process-scrollbar {
  height: 100%;
  width: 100%;
  overflow: hidden; // 强制隐藏溢出内容
  
  :deep(.el-scrollbar__wrap) {
    overflow-x: hidden; // 默认隐藏水平滚动条
    overflow-y: hidden; // 默认隐藏垂直滚动条
    scrollbar-width: none; // Firefox 隐藏滚动条
    -ms-overflow-style: none; // IE 和 Edge 隐藏滚动条
    scroll-behavior: smooth; // 平滑滚动
    
    &::-webkit-scrollbar {
      width: 0;  // 隐藏默认滚动条
      height: 0;
      display: none; // 彻底隐藏滚动条
    }
    
    &:hover {
      overflow-x: auto; // 鼠标悬停时显示水平滚动条
      overflow-y: auto; // 鼠标悬停时显示垂直滚动条
    }
  }
  
  :deep(.el-scrollbar__bar) {
    opacity: 0; // 默认隐藏滚动条
    transition: opacity 0.3s ease;
    z-index: 10; // 确保滚动条在内容之上
    
    &.is-horizontal {
      height: 6px; // 减小滚动条高度
      bottom: 2px; // 与容器底部保持距离
    }
    
    &.is-vertical {
      width: 6px; // 减小滚动条宽度
      right: 2px; // 与容器右侧保持距离
    }
    
    .el-scrollbar__thumb {
      background-color: rgba(144, 147, 153, 0.3); // 更淡的滚动条颜色
      border-radius: 20px; // 完全圆角
      
      &:hover {
        background-color: rgba(144, 147, 153, 0.5); // 鼠标悬停时稍微加深颜色
      }
    }
  }
  
  // 鼠标悬停在容器上时显示滚动条
  &:hover {
    :deep(.el-scrollbar__bar) {
      opacity: 0.6; // 显示时的不透明度
      
      &:hover {
        opacity: 0.8; // 鼠标悬停在滚动条上时的不透明度
      }
    }
  }
}

.process-canvas {
  min-width: 100%;
  min-height: 100%;
  width: 100%;
  height: 100%;
  padding: 0; // 移除内边距，完全填充可用空间
  background-color: #f9f9f9; // 统一的背景色
  margin: 0 auto; // 居中显示
  position: relative; // 确保拖拽时的定位正确
  
  :deep(.simple-process-model-container) {
    width: 100%;
    height: 100%;
    min-width: 100%;
    min-height: 100%;
    position: relative;
    z-index: 1; // 确保流程图在最上层
  }
}

// 防止拖拽过程中产生额外的滚动条
:deep(body.cursor-grabbing) {
  overflow: hidden !important;
  
  * {
    cursor: grabbing !important;
  }
  
  // 更有针对性地禁用滚动条，确保只有当前拖拽中的容器受影响
  [data-dragging-container="true"] {
    .el-scrollbar__wrap {
      overflow: hidden !important; 
      pointer-events: none !important;
    }
    
    .el-scrollbar__bar {
      display: none !important; // 完全隐藏滚动条
      opacity: 0 !important;
      pointer-events: none !important;
    }
  }
  
  // 禁用当前拖拽容器中的滚动视图
  [data-dragging-container="true"] .el-scrollbar__view {
    overflow: visible !important;
  }
}

// 确保拖拽层位于最上层


// 适配移动设备
@media (max-width: 767px) {
  .process-canvas {
    padding: 0;
    
    :deep(.simple-process-model-container) {
      width: 100%;
      height: 100%;
    }
  }
}
</style>
