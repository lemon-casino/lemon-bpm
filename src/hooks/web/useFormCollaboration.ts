import { ref, computed, onUnmounted } from 'vue'
import * as TaskApi from '@/api/bpm/task'
import { useWebSocketMessage, FormCollaborationMessageType } from './useWebSocketMessage'

interface Config {
  processInstanceId: string
  currentUser: { id: number }
}

interface OnlineCheckPayload {
  initiator: number
  chain: number[]
}

// 表单同步消息类型
export const FORM_SYNC_MESSAGE_TYPE = 'demo-message-send'

// 表单变更数据结构
export interface FormFieldChangeData {
  fieldName: string
  fieldValue: any
  userId: number
  userName: string
  timestamp: number
}

export const useFormCollaboration = (config: Config) => {
  const { processInstanceId, currentUser } = config

  const processUsers = ref<any[]>([])
  const confirmedOnlineUsers = ref<Set<number>>(new Set())

  const chainStarted = ref(false)
  const chainInitiatorId = ref<number | null>(null)
  const pendingResponseUserId = ref<number | null>(null)
  let responseTimer: NodeJS.Timeout | null = null
  let startTimer: NodeJS.Timeout | null = null

  // 表单同步相关状态
  const activeEditors = ref<Map<string, number>>(new Map()) // 字段名 -> 用户ID
  const fieldValues = ref<Map<string, any>>(new Map()) // 字段名 -> 值
  const lastFieldUpdate = ref<Map<string, number>>(new Map()) // 字段名 -> 时间戳

  const { sendMessage, onMessage } = useWebSocketMessage()

  const sortedUserIds = computed(() =>
    processUsers.value.map((u: any) => u.id).sort((a: number, b: number) => a - b)
  )

  const nextUserId = (id: number): number | null => {
    const ids = sortedUserIds.value
    const index = ids.indexOf(id)
    if (index === -1) return null
    return ids[(index + 1) % ids.length]
  }

  const getProcessUsers = async () => {
    try {
      const runningTasks = await TaskApi.getRunningTaskList(processInstanceId)
      const users = new Set<any>()
      if (runningTasks && runningTasks.length > 0) {
        for (const task of runningTasks) {
          if (task.nodes && task.nodes.length > 0) {
            for (const node of task.nodes) {
              if (node.users && node.users.length > 0) {
                for (const userTask of node.users) {
                  if (userTask.user) {
                    users.add(userTask.user)
                  }
                }
              }
            }
          }
        }
      }
      processUsers.value = Array.from(users)
    } catch (error) {
      console.error('获取流程用户列表失败:', error)
    }
  }

  const finalizeChain = () => {
    chainStarted.value = false
    pendingResponseUserId.value = null
    chainInitiatorId.value = null
    if (responseTimer) {
      clearTimeout(responseTimer)
      responseTimer = null
    }
  }
  const handleNoResponse = (targetId: number) => {
    pendingResponseUserId.value = null
    const next = nextUserId(targetId)
    if (!next || next === chainInitiatorId.value) {
      finalizeChain()
    } else {
      sendCheck(next)
    }
  }

  const sendCheck = (targetId: number) => {
    const message = {
      type: FormCollaborationMessageType.ONLINE_CHECK_REQUEST,
      data: {
        initiator: chainInitiatorId.value,
        chain: Array.from(confirmedOnlineUsers.value)
      } as OnlineCheckPayload
    }
    sendMessage(targetId, message, 'normal', processInstanceId)
    pendingResponseUserId.value = targetId
    if (responseTimer) clearTimeout(responseTimer)
    responseTimer = setTimeout(() => handleNoResponse(targetId), 3000)
  }

  const startChain = () => {
    if (chainStarted.value) return
    chainStarted.value = true
    chainInitiatorId.value = currentUser.id
    confirmedOnlineUsers.value = new Set([currentUser.id])
    const next = nextUserId(currentUser.id)
    if (!next || next === currentUser.id) {
      finalizeChain()
    } else {
      sendCheck(next)
    }
  }

  const scheduleStart = () => {
    const ids = sortedUserIds.value
    if (!ids.length) return
    if (currentUser.id === ids[0]) {
      startChain()
    } else {
      startTimer = setTimeout(() => {
        if (!chainStarted.value) {
          startChain()
        }
      }, 5000)
    }
  }

  // 初始化协同编辑功能
  const initCollaboration = async () => {
    await getProcessUsers()
    scheduleStart()
  }

  // 发送表单字段变更
  const sendFormFieldChange = (fieldName: string, fieldValue: any, userName: string) => {
    if (!confirmedOnlineUsers.value.size || confirmedOnlineUsers.value.size <= 1) {
      console.log('没有其他在线用户，无需发送表单变更')
      return
    }

    // 更新本地状态
    activeEditors.value.set(fieldName, currentUser.id)
    fieldValues.value.set(fieldName, fieldValue)
    lastFieldUpdate.value.set(fieldName, Date.now())

    // 构造表单变更消息
    const fieldChangeData: FormFieldChangeData = {
      fieldName,
      fieldValue,
      userId: currentUser.id,
      userName,
      timestamp: Date.now()
    }

    // 发送给所有在线用户
    for (const userId of confirmedOnlineUsers.value) {
      if (userId !== currentUser.id) {
        const message = {
          type: FormCollaborationMessageType.FORM_FIELD_CHANGE,
          data: fieldChangeData
        }
        sendMessage(userId, message, 'high', `${processInstanceId}_field_${fieldName}`)
        console.log(`发送表单字段 ${fieldName} 变更到用户 ${userId}`)
      }
    }
  }

  // 监听消息
  const stopListener = onMessage((msg: any) => {
    if (msg.id !== processInstanceId) return
    
    // 处理在线检测消息
    if (msg.type === FormCollaborationMessageType.ONLINE_CHECK_REQUEST) {
      const payload = msg.data as OnlineCheckPayload
      chainStarted.value = true
      chainInitiatorId.value = payload.initiator
      const updatedChain = [...payload.chain, currentUser.id]
      confirmedOnlineUsers.value = new Set(updatedChain)
      sendMessage(
        msg.fromUserId,
        {
          type: FormCollaborationMessageType.ONLINE_CHECK_RESPONSE,
          data: { initiator: payload.initiator, chain: updatedChain } as OnlineCheckPayload
        },
        'normal',
        processInstanceId
      )
      const next = nextUserId(currentUser.id)
      if (next === payload.initiator) {
        sendMessage(
          payload.initiator,
          {
            type: FormCollaborationMessageType.ONLINE_CHECK_RESPONSE,
            data: { initiator: payload.initiator, chain: updatedChain } as OnlineCheckPayload
          },
          'normal',
          processInstanceId
        )
      } else if (next != null) {
        sendCheck(next)
      }
    } else if (msg.type === FormCollaborationMessageType.ONLINE_CHECK_RESPONSE) {
      const payload = msg.data as OnlineCheckPayload
      confirmedOnlineUsers.value = new Set(payload.chain)
      if (currentUser.id === payload.initiator && msg.fromUserId === pendingResponseUserId.value) {
        if (responseTimer) clearTimeout(responseTimer)
        const lastId = payload.chain[payload.chain.length - 1]
        const next = nextUserId(lastId)
        if (!next || next === payload.initiator) {
          finalizeChain()
        } else {
          sendCheck(next)
        }
      } else if (msg.fromUserId === pendingResponseUserId.value) {
        if (responseTimer) clearTimeout(responseTimer)
        pendingResponseUserId.value = null
      }
    } 
    // 处理表单字段变更消息
    else if (msg.type === FormCollaborationMessageType.FORM_FIELD_CHANGE) {
      const fieldChange = msg.data as FormFieldChangeData
      console.log(`收到表单字段 ${fieldChange.fieldName} 变更，来自用户 ${fieldChange.userName}`)
      
      // 更新本地状态
      activeEditors.value.set(fieldChange.fieldName, fieldChange.userId)
      fieldValues.value.set(fieldChange.fieldName, fieldChange.fieldValue)
      lastFieldUpdate.value.set(fieldChange.fieldName, fieldChange.timestamp)
    }
  })

  onUnmounted(() => {
    stopListener()
    if (responseTimer) clearTimeout(responseTimer)
    if (startTimer) clearTimeout(startTimer)
  })

  return {
    processUsers,
    confirmedOnlineUsers,
    initCollaboration,
    // 导出表单同步相关方法和状态
    sendFormFieldChange,
    activeEditors,
    fieldValues,
    lastFieldUpdate
  }
}
