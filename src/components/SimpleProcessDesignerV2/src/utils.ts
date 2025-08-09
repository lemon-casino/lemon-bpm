import { TimeUnitType, ApproveType, APPROVE_TYPE } from './consts'
import { SimpleFlowNode, NodeType } from './consts'

// 获取条件节点默认的名称
export const getDefaultConditionNodeName = (index: number, defaultFlow: boolean | undefined): string => {
  if (defaultFlow) {
    return '其它情况'
  }
  return '条件' + (index + 1)
}

// 获取包容分支条件节点默认的名称
export const getDefaultInclusiveConditionNodeName = (index: number, defaultFlow: boolean | undefined): string => {
  if (defaultFlow) {
    return '其它情况'
  }
  return '包容条件' + (index + 1)
}

export const convertTimeUnit = (strTimeUnit: string) => {
  if (strTimeUnit === 'M') {
    return TimeUnitType.MINUTE
  }
  if (strTimeUnit === 'H') {
    return TimeUnitType.HOUR
  }
  if (strTimeUnit === 'D') {
    return TimeUnitType.DAY
  }
  return TimeUnitType.HOUR
}

export const getApproveTypeText = (approveType: ApproveType): string => {
  let approveTypeText = ''
  APPROVE_TYPE.forEach((item) => {
    if (item.value === approveType) {
      approveTypeText = item.label
      return
    }
  })
  return approveTypeText
}

/**
 * 检查节点是否在并行分支内
 * @param currentNode 当前节点
 * @param rootNode 流程根节点
 * @returns boolean
 */
export function isNodeInParallelBranch(
  currentNode: SimpleFlowNode,
  rootNode: SimpleFlowNode
): boolean {
  const path = findNodePath(currentNode, rootNode)

  // 检查当前节点是否在并行分支的条件节点内
  for (let i = 0; i < path.length; i++) {
    const node = path[i]
    if (node.type === NodeType.PARALLEL_BRANCH_NODE) {
      // 如果找到并行分支节点，检查当前节点是否在其条件节点内
      if (node.conditionNodes?.some(conditionNode => {
        // 检查当前节点是否在这个条件分支的子树中
        const subPath = findNodePath(currentNode, conditionNode)
        if (subPath.length > 0) {
          // 如果在条件分支内，检查是否在包容节点内
          // 从当前节点向上查找最近的包容节点
          for (const pathNode of subPath) {
            if (pathNode.type === NodeType.INCLUSIVE_BRANCH_NODE) {
              // 如果在包容节点内，允许创建条件分支
              return false
            }
          }
          return true
        }
        return false
      })) {
        return true
      }
    }
  }

  // 不在任何并行分支的条件节点内
  return false
}

/**
 * 查找从根节点到目标节点的路径
 * @param targetNode 目标节点
 * @param currentNode 当前节点（通常是根节点）
 * @param path 路径数组
 * @returns SimpleFlowNode[]
 */
export function findNodePath(
  targetNode: SimpleFlowNode,
  currentNode: SimpleFlowNode,
  path: SimpleFlowNode[] = []
): SimpleFlowNode[] {
  // 如果找到目标节点，返回路径
  if (currentNode === targetNode) {
    return [...path, currentNode]
  }

  // 检查条件分支节点
  if (currentNode.conditionNodes) {
    for (const conditionNode of currentNode.conditionNodes) {
      // 在当前分支中搜索
      const newPath = [...path, currentNode]

      // 检查条件节点本身
      if (conditionNode === targetNode) {
        return [...newPath, conditionNode]
      }

      // 检查条件节点的子节点
      if (conditionNode.childNode) {
        const result = findNodePath(targetNode, conditionNode.childNode, newPath)
        if (result.length > 0) {
          return result
        }
      }
    }
  }

  // 检查子节点
  if (currentNode.childNode) {
    const newPath = [...path, currentNode]
    const result = findNodePath(targetNode, currentNode.childNode, newPath)
    if (result.length > 0) {
      return result
    }
  }

  return []
}
