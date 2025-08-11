import { ref, computed, onUnmounted, Ref } from 'vue'
import * as TaskApi from '@/api/bpm/task'
import { useWebSocketMessage, FormCollaborationMessageType } from './useWebSocketMessage'

interface Config {
  processInstanceId: string
  currentUser: { id: number }
  formApi?: Ref<any>
}

interface OnlineCheckPayload {
  initiator: number
  chain: number[]
}

export const useFormCollaboration = (config: Config) => {
  const { processInstanceId, currentUser, formApi } = config

  const processUsers = ref<any[]>([])
  const confirmedOnlineUsers = ref<Set<number>>(new Set())

  // 正在编辑的用户列表
  const editingUsers = ref<Set<number>>(new Set())

  // 标记是否正在应用远程变更，避免死循环
  const isApplyingRemoteChange = ref(false)

  // 协同编辑临时禁用字段的恢复定时器
  const fieldRestoreTimers = new Map<string, NodeJS.Timeout>()
  // 记录字段原始的禁用状态，避免恢复时覆盖原有权限
  const fieldOriginalDisabled = new Map<string, boolean>()

  const chainStarted = ref(false)
  const chainInitiatorId = ref<number | null>(null)
  const pendingResponseUserId = ref<number | null>(null)
  let responseTimer: NodeJS.Timeout | null = null
  let startTimer: NodeJS.Timeout | null = null

  const { sendMessage, onMessage, sendToUsers } = useWebSocketMessage()

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

  /**
   * 广播表单字段变更
   */
  const broadcastFieldChange = (field: string, value: any) => {
    // 标记当前用户正在编辑
    editingUsers.value.add(currentUser.id)
    setTimeout(() => editingUsers.value.delete(currentUser.id), 3000)

    const targets = Array.from(confirmedOnlineUsers.value).filter(
      (id) => id !== currentUser.id
    )
    if (targets.length === 0) return
    sendToUsers(
      targets,
      {
        type: FormCollaborationMessageType.FORM_FIELD_CHANGE,
        data: { field, value }
      },
      'high',
      processInstanceId
    )
  }

  const initCollaboration = async () => {
    await getProcessUsers()
    scheduleStart()
  }

  const stopListener = onMessage((msg: any) => {
    if (msg.id !== processInstanceId) return
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
    } else if (msg.type === FormCollaborationMessageType.FORM_FIELD_CHANGE) {
      const { field, value } = msg.data || {}
      // 如果是自己发送的变更，直接忽略
      if (!field || msg.fromUserId === currentUser.id) return

      editingUsers.value.add(msg.fromUserId)
      setTimeout(() => editingUsers.value.delete(msg.fromUserId), 3000)

      if (formApi?.value) {
        isApplyingRemoteChange.value = true
        formApi.value.setValue(field, value)

        // 记录原始禁用状态并暂时禁用字段
        if (!fieldOriginalDisabled.has(field)) {
          try {
            const rule = formApi.value.getRule ? formApi.value.getRule(field) : null
            fieldOriginalDisabled.set(field, rule?.props?.disabled ?? false)
          } catch (e) {
            fieldOriginalDisabled.set(field, false)
          }
        }
        formApi.value.disabled(true, field)

        // 若已有定时器则重置
        if (fieldRestoreTimers.has(field)) {
          clearTimeout(fieldRestoreTimers.get(field)!)
        }
        fieldRestoreTimers.set(
          field,
          setTimeout(() => {
            const original = fieldOriginalDisabled.get(field) ?? false
            formApi.value.disabled(original, field)
            fieldRestoreTimers.delete(field)
            fieldOriginalDisabled.delete(field)
          }, 2000)
        )

        isApplyingRemoteChange.value = false
      }
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
    broadcastFieldChange,
    editingUsers,
    isApplyingRemoteChange
  }
}
