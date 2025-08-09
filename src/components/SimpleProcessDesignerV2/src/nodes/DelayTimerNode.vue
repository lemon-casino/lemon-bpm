<template>
  <div class="node-wrapper">
    <div class="node-container">
      <div
        class="node-box"
        :class="[
          { 'node-config-error': !currentNode.showText },
          `${useTaskStatusClass(currentNode?.activityStatus)}`
        ]"
      >
        <div class="node-title-container">
          <div class="node-title-icon delay-node"><span class="iconfont icon-delay"></span></div>
          <input
            v-if="!readonly && showInput"
            type="text"
            class="editable-title-input"
            @blur="blurEvent()"
            v-mountedFocus
            v-model="currentNode.name"
            :placeholder="currentNode.name"
          />
          <div v-else class="node-title" @click="clickTitle">
            {{ currentNode.name }}
          </div>
        </div>
        <div class="node-content" @click="openNodeConfig">
          <div class="node-text" :title="currentNode.showText" v-if="currentNode.showText">
            {{ currentNode.showText }}
          </div>
          <div class="node-text" v-else>
            {{ NODE_DEFAULT_TEXT.get(NodeType.DELAY_TIMER_NODE) }}
          </div>
          <Icon v-if="!readonly" icon="ep:arrow-right-bold" />
        </div>
        <div v-if="!readonly" class="node-toolbar">
          <div class="toolbar-icon"
            ><Icon color="#0089ff" icon="ep:circle-close-filled" :size="18" @click="deleteNode"
          /></div>
        </div>
      </div>

      <!-- 传递子节点给添加节点组件。会在子节点前面添加节点 -->
      <NodeHandler
        v-if="currentNode"
        v-model:child-node="currentNode.childNode"
        :current-node="currentNode"
      />
    </div>
    <DelayTimerNodeConfig
      v-if="!readonly && currentNode"
      ref="nodeSetting"
      :flow-node="currentNode"
      @find:return-task-nodes="findReturnTaskNodes"
    />
  </div>
</template>
<script setup lang="ts">
import { SimpleFlowNode, NodeType, NODE_DEFAULT_TEXT } from '../consts'
import NodeHandler from '../NodeHandler.vue'
import { useNodeName2, useWatchNode, useTaskStatusClass } from '../node'
import DelayTimerNodeConfig from '../nodes-config/DelayTimerNodeConfig.vue'
defineOptions({
  name: 'DelayTimerNode'
})
const props = defineProps({
  flowNode: {
    type: Object as () => SimpleFlowNode,
    required: true
  },
  parentNode: {
    type: Object as () => SimpleFlowNode,
    default: null
  }
})
// 定义事件，更新父组件。
const emits = defineEmits<{
  'update:flowNode': [node: SimpleFlowNode | undefined]
  'find:parentNode': [nodeList: SimpleFlowNode[], nodeType: NodeType]
}>()
// 是否只读
const readonly = inject<Boolean>('readonly')
// 监控节点的变化
const currentNode = useWatchNode(props)
// 节点名称编辑
const { showInput, blurEvent, clickTitle } = useNodeName2(currentNode, NodeType.DELAY_TIMER_NODE)

const nodeSetting = ref()
// 打开节点配置
const openNodeConfig = () => {
  if (readonly) {
    return
  }
  nodeSetting.value.showDelayTimerNodeConfig(currentNode.value)
  nodeSetting.value.openDrawer()
}

// 删除节点。更新当前节点为孩子节点
const deleteNode = () => {
  emits('update:flowNode', currentNode.value.childNode)
}

// 查找可跳转节点
const findReturnTaskNodes = (matchNodeList: SimpleFlowNode[]) => {
  // 从父节点查找所有用户任务节点（向上查找）
  emits('find:parentNode', matchNodeList, NodeType.USER_TASK_NODE)
  // console.log('findReturnTaskNodes', matchNodeList)
  // 从根节点开始查找所有用户任务节点（向下查找）
  const rootNode = findRootNode(currentNode.value)
  if (rootNode.type === NodeType.USER_TASK_NODE) {
    // 如果找到了起始节点，从它的子节点开始查找
    if (rootNode.childNode) {
      findAllUserTaskNodes(rootNode.childNode, matchNodeList)
    }
  } else {
    // 否则从当前找到的最上层节点开始查找
    findAllUserTaskNodes(rootNode, matchNodeList)
  }
  
  // 过滤掉当前节点
  const currentNodeId = currentNode.value.id
  const filteredList = matchNodeList.filter(node => node.id !== currentNodeId)
  matchNodeList.length = 0
  matchNodeList.push(...filteredList)
}

// 查找根节点
const findRootNode = (node: SimpleFlowNode): SimpleFlowNode => {
  let parent: SimpleFlowNode | null = props.parentNode
  let current: SimpleFlowNode = node
  
  while (parent !== null) {
    current = parent
    parent = findParentNode(current)
  }
  
  return current
}

// 查找父节点
const findParentNode = (node: SimpleFlowNode): SimpleFlowNode | null => {
  if (!props.parentNode) return null
  if (props.parentNode.childNode === node) return props.parentNode
  return null
}

// 递归查找所有用户任务节点
const findAllUserTaskNodes = (node: SimpleFlowNode, matchNodeList: SimpleFlowNode[]) => {
  if (!node) return
  
  // 检查当前节点
  if (node.type === NodeType.USER_TASK_NODE) {
    if (!matchNodeList.some(n => n.id === node.id)) {
      matchNodeList.push(node)
    }
  }
  
  // 检查子节点
  if (node.childNode) {
    findAllUserTaskNodes(node.childNode, matchNodeList)
  }
  
  // 检查条件分支节点的子节点
  if (node.type === NodeType.CONDITION_BRANCH_NODE && node.conditionNodes) {
    node.conditionNodes.forEach(conditionNode => {
      if (conditionNode.childNode) {
        findAllUserTaskNodes(conditionNode.childNode, matchNodeList)
      }
    })
  }
}
</script>

<style lang="scss" scoped></style>
