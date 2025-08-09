<template>
  <!-- 发起人节点 -->
  <StartUserNode
    v-if="currentNode && currentNode.type === NodeType.START_USER_NODE"
    :flow-node="currentNode"
  />
  <!-- 审批节点 -->
  <UserTaskNode
    v-if="
      currentNode &&
      (currentNode.type === NodeType.USER_TASK_NODE ||
        currentNode.type === NodeType.TRANSACTOR_NODE)
    "
    :flow-node="currentNode"
    @update:flow-node="handleModelValueUpdate"
    @find:parent-node="findFromParentNode"
  />

  <!-- 抄送节点 -->
  <CopyTaskNode
    v-if="currentNode && currentNode.type === NodeType.COPY_TASK_NODE"
    :flow-node="currentNode"
    @update:flow-node="handleModelValueUpdate"
  />
  <!-- 条件节点 -->
  <ExclusiveNode
    v-if="currentNode && currentNode.type === NodeType.CONDITION_BRANCH_NODE"
    :flow-node="currentNode"
    @update:model-value="handleModelValueUpdate"
    @find:parent-node="findFromParentNode"
  />
  <!-- 并行节点 -->
  <ParallelNode
    v-if="currentNode && currentNode.type === NodeType.PARALLEL_BRANCH_NODE"
    :flow-node="currentNode"
    @update:model-value="handleModelValueUpdate"
    @find:parent-node="findFromParentNode"
  />
  <!-- 包容分支节点 -->
  <InclusiveNode
    v-if="currentNode && currentNode.type === NodeType.INCLUSIVE_BRANCH_NODE"
    :flow-node="currentNode"
    @update:model-value="handleModelValueUpdate"
    @find:parent-node="findFromParentNode"
  />
  <!-- 延迟器节点 -->
  <DelayTimerNode
    v-if="currentNode && currentNode.type === NodeType.DELAY_TIMER_NODE"
    :flow-node="currentNode"
    @update:flow-node="handleModelValueUpdate"
  />
  <!-- 路由分支节点 -->
  <RouterNode
    v-if="currentNode && currentNode.type === NodeType.ROUTER_BRANCH_NODE"
    :flow-node="currentNode"
    @update:flow-node="handleModelValueUpdate"
  />
   <!-- 触发器节点 -->
   <TriggerNode
    v-if="currentNode && currentNode.type === NodeType.TRIGGER_NODE"
    :flow-node="currentNode"
    @update:flow-node="handleModelValueUpdate"
  />
   <!-- HTTP任务节点 -->
   <HttpTaskNode
    v-if="currentNode && currentNode.type === NodeType.HTTP_TASK_NODE"
    :flow-node="currentNode"
    @update:flow-node="handleModelValueUpdate"
  />
  <!-- 递归显示孩子节点  -->
  <ProcessNodeTree
    v-if="currentNode && currentNode.childNode"
    v-model:flow-node="currentNode.childNode"
    :parent-node="currentNode"
    @find:recursive-find-parent-node="recursiveFindParentNode"
  />

  <!-- 结束节点 -->
  <EndEventNode
    v-if="currentNode && currentNode.type === NodeType.END_EVENT_NODE"
    :flow-node="currentNode"
  />
</template>
<script setup lang="ts">
// 导入各种流程节点组件
import StartUserNode from './nodes/StartUserNode.vue'
import EndEventNode from './nodes/EndEventNode.vue'
import UserTaskNode from './nodes/UserTaskNode.vue'
import CopyTaskNode from './nodes/CopyTaskNode.vue'
import ExclusiveNode from './nodes/ExclusiveNode.vue'
import ParallelNode from './nodes/ParallelNode.vue'
import InclusiveNode from './nodes/InclusiveNode.vue'
import DelayTimerNode from './nodes/DelayTimerNode.vue'
import RouterNode from './nodes/RouterNode.vue'
import TriggerNode from './nodes/TriggerNode.vue'
import HttpTaskNode from './nodes/HttpTaskNode.vue'

// 导入流程节点相关的类型定义和工具函数
import { SimpleFlowNode, NodeType } from './consts'
import { useWatchNode } from './node'

// 定义组件名称
defineOptions({
  name: 'ProcessNodeTree'
})

// 定义组件的 props
const props = defineProps({
  // 父节点对象
  parentNode: {
    type: Object as () => SimpleFlowNode,
    default: () => null
  },
  // 当前流程节点对象
  flowNode: {
    type: Object as () => SimpleFlowNode,
    default: () => null
  }
})

// 定义组件的事件
const emits = defineEmits<{
  // 更新流程节点的事件
  'update:flowNode': [node: SimpleFlowNode | undefined]
  // 递归查找父节点的事件
  'find:recursiveFindParentNode': [
    nodeList: SimpleFlowNode[],  // 节点列表
    curentNode: SimpleFlowNode,  // 当前节点
    nodeType: number            // 节点类型
  ]
}>()

// 使用 useWatchNode hook 监听节点变化
const currentNode = useWatchNode(props)

// 处理节点更新事件，用于删除节点等操作
const handleModelValueUpdate = (updateValue) => {
  emits('update:flowNode', updateValue)
}

// 从父节点中查找指定类型的节点
const findFromParentNode = (nodeList: SimpleFlowNode[], nodeType: number) => {
  emits('find:recursiveFindParentNode', nodeList, props.parentNode, nodeType)
}

const recursiveFindParentNode = (
  nodeList: SimpleFlowNode[],    
  findNode: SimpleFlowNode,      
  nodeType: number              
) => {
  if (!findNode) return
  
  // Create a Set to track visited nodes and prevent cycles
  const visitedNodes = new Set<string>()
  
  const findNodesRecursive = (node: SimpleFlowNode) => {
    if (!node || visitedNodes.has(node.id)) return
    
    visitedNodes.add(node.id)
    
    // Check current node
    if (node.type === nodeType) {
      if (!nodeList.some(n => n.id === node.id)) {
        nodeList.push(node)
      }
    }
    
    // Check child node
    if (node.childNode) {
      findNodesRecursive(node.childNode)
    }
    
    // Check condition nodes if present
    if (node.type === NodeType.CONDITION_BRANCH_NODE && node.conditionNodes) {
      node.conditionNodes.forEach(conditionNode => {
        if (conditionNode.childNode) {
          findNodesRecursive(conditionNode.childNode)
        }
      })
    }
  }

  // Start recursive search
  findNodesRecursive(findNode)

  // Continue search in parent node
  if (props.parentNode) {
    emits('find:recursiveFindParentNode', nodeList, props.parentNode, nodeType)
  }
}

// 从父级注入工时类型数据和方法
const workTimeTypeOptions = inject('workTimeTypeOptions', ref<any[]>([]))
const isLoadingWorkTimeTypes = inject('isLoadingWorkTimeTypes', ref(false))
const fetchWorkTimeTypes = inject('fetchWorkTimeTypes', async () => [])
const clearAndRefetchWorkTimeTypes = inject('clearAndRefetchWorkTimeTypes', async () => [])

// 传递工时类型数据给子组件
provide('workTimeTypeOptions', workTimeTypeOptions)
provide('isLoadingWorkTimeTypes', isLoadingWorkTimeTypes)
provide('fetchWorkTimeTypes', fetchWorkTimeTypes)
provide('clearAndRefetchWorkTimeTypes', clearAndRefetchWorkTimeTypes)
</script>
<style lang="scss" scoped></style>
