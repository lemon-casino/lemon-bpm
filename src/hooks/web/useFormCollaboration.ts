import { ref, reactive, watch, nextTick, onUnmounted, readonly } from 'vue'
import { ElMessage } from 'element-plus'
import * as TaskApi from '@/api/bpm/task'
import { FormCollaborationMessageType, useWebSocketMessage } from './useWebSocketMessage'

// 字段锁定信息
export interface FieldLockInfo {
  fieldName: string
  userId: number
  userNickname: string
  userAvatar?: string
  lockTime: number
  processInstanceId: string
}

// 字段变更信息
export interface FieldChangeInfo {
  fieldName: string
  value: any
  userId: number
  userNickname: string
  processInstanceId: string
  timestamp: number
}

// 光标位置信息
export interface CursorPositionInfo {
  fieldName: string
  position: number
  userId: number
  userNickname: string
  userAvatar?: string
  processInstanceId: string
}

// 用户编辑状态
export interface UserEditingStatus {
  userId: number
  userNickname: string
  userAvatar?: string
  isEditing: boolean
  editingField?: string
  processInstanceId: string
}

// 协同编辑配置接口
interface FormCollaborationConfig {
  processInstanceId: string
  currentUser: {
    id: number
    nickname: string
    avatar?: string
  }
  sendMessage: (userId: number, type: string, content: any) => Promise<void>
  sendBroadcast: (type: string, content: any) => void
}

export const useFormCollaboration = (config: FormCollaborationConfig) => {
  const { processInstanceId, currentUser, sendMessage, sendBroadcast } = config
  
  // 初始化 WebSocket 消息服务
  const { onMessage, sendMessage: wsSendMessage, status } = useWebSocketMessage()
  
  // 消息监听器清理函数
  let messageListenerCleanup: (() => void) | null = null
  
  // 初始化状态标记
  let isInitialized = false
  
  // 状态管理
  
  // 协作状态管理
  const lockedFields = ref<Map<string, FieldLockInfo>>(new Map())
  const collaboratingUsers = ref<Map<number, UserEditingStatus>>(new Map())
  const fieldCursors = ref<Map<string, CursorPositionInfo[]>>(new Map())
  const processUsers = ref<any[]>([])
  
  // 当前用户编辑状态
  const currentEditingField = ref<string | null>(null)
  const isCollaborationEnabled = ref(true)
  
  // 在线检测相关
  const onlineCheckRequests = ref<Map<string, {
    userId: number, 
    timestamp: number, 
    randomNumber: string, 
    processInstanceId: string,
    batchId?: string
  }>>(new Map())
  const confirmedOnlineUsers = ref<Set<number>>(new Set())
  
  /**
   * 获取流程相关用户列表
   */
  const getProcessUsers = async () => {
    try {
      const response = await TaskApi.getRunningTaskList(processInstanceId)
      if (response && response.length > 0) {
        // 提取所有相关用户
        const users = new Set()
        response.forEach((task: any) => {
          if (task.nodes && task.nodes.length > 0) {
            task.nodes.forEach((node: any) => {
              if (node.users && node.users.length > 0) {
                node.users.forEach((userTask: any) => {
                  if (userTask.user) {
                    users.add(userTask.user)
                  }
                })
              }
            })
          }
        })
        processUsers.value = Array.from(users)
        console.log('获取到流程相关用户:', processUsers.value.length, '人')
      }
    } catch (error) {
      console.error('获取流程用户列表失败:', error)
    }
  }
  
  /**
   * 向流程相关用户广播消息
   */
  const broadcastToProcessUsers = async (messageType: FormCollaborationMessageType, data: any) => {
    if (!isCollaborationEnabled.value) return
    
    const message = {
      type: messageType,
      data: {
        ...data,
        processInstanceId,
        userId: currentUser.id,
        userNickname: currentUser.nickname,
        userAvatar: currentUser.avatar,
        timestamp: Date.now()
      }
    }
    
    // 向所有流程相关用户发送消息（跨浏览器通信）
    for (const user of processUsers.value) {
      if (user.id !== currentUser.id) {
        try {
          // 使用WebSocket消息服务发送消息，确保跨浏览器通信
          await wsSendMessage(user.id, message)
        } catch (error) {
          console.error(`向用户 ${user.id} 发送协作消息失败:`, error)
        }
      }
    }
    
    // 同时使用广播通道进行同浏览器内的本地通信（仅作为备用）
    try {
      sendBroadcast('form-collaboration', message)
    } catch (error) {
      // 广播通道失败不影响跨浏览器通信
      console.warn('本地广播通道发送失败:', error)
    }
  }
  
  /**
   * 锁定字段
   */
  const lockField = async (fieldName: string) => {
    if (!fieldName || !isCollaborationEnabled.value) return false
    
    // 检查字段是否已被其他用户锁定
    const existingLock = lockedFields.value.get(fieldName)
    if (existingLock && existingLock.userId !== currentUser.id) {
      ElMessage.warning(`字段 "${fieldName}" 正在被 ${existingLock.userNickname} 编辑中`)
      return false
    }
    
    // 创建锁定信息
    const lockInfo: FieldLockInfo = {
      fieldName,
      userId: currentUser.id,
      userNickname: currentUser.nickname,
      userAvatar: currentUser.avatar,
      lockTime: Date.now(),
      processInstanceId
    }
    
    // 本地锁定
    lockedFields.value.set(fieldName, lockInfo)
    currentEditingField.value = fieldName
    
    // 广播锁定消息
    await broadcastToProcessUsers(FormCollaborationMessageType.FORM_FIELD_LOCK, lockInfo)
    
    // 添加字段编辑样式
    addFieldEditingStyle(fieldName, currentUser)
    
    console.log(`字段 "${fieldName}" 已锁定`)
    return true
  }
  
  /**
   * 解锁字段
   */
  const unlockField = async (fieldName: string) => {
    if (!fieldName || !isCollaborationEnabled.value) return
    
    const lockInfo = lockedFields.value.get(fieldName)
    if (!lockInfo || lockInfo.userId !== currentUser.id) return
    
    // 本地解锁
    lockedFields.value.delete(fieldName)
    if (currentEditingField.value === fieldName) {
      currentEditingField.value = null
    }
    
    // 广播解锁消息
    await broadcastToProcessUsers(FormCollaborationMessageType.FORM_FIELD_UNLOCK, {
      fieldName,
      processInstanceId
    })
    
    // 移除字段编辑样式
    removeFieldEditingStyle(fieldName)
    
    console.log(`字段 "${fieldName}" 已解锁`)
  }
  
  /**
   * 处理字段值变更
   */
  const handleFieldChange = async (fieldName: string, value: any) => {
    if (!fieldName || !isCollaborationEnabled.value) return
    
    // 检查是否有锁定权限
    const lockInfo = lockedFields.value.get(fieldName)
    if (!lockInfo || lockInfo.userId !== currentUser.id) return
    
    const changeInfo: FieldChangeInfo = {
      fieldName,
      value,
      userId: currentUser.id,
      userNickname: currentUser.nickname,
      processInstanceId,
      timestamp: Date.now()
    }
    
    // 广播字段变更
    await broadcastToProcessUsers(FormCollaborationMessageType.FORM_FIELD_CHANGE, changeInfo)
    
    console.log(`字段 "${fieldName}" 值已变更:`, value)
  }
  
  /**
   * 处理光标位置变更
   */
  const handleCursorPosition = async (fieldName: string, position: number) => {
    if (!fieldName || !isCollaborationEnabled.value) return
    
    const cursorInfo: CursorPositionInfo = {
      fieldName,
      position,
      userId: currentUser.id,
      userNickname: currentUser.nickname,
      userAvatar: currentUser.avatar,
      processInstanceId
    }
    
    // 广播光标位置（频率控制，避免过于频繁）
    await broadcastToProcessUsers(FormCollaborationMessageType.FORM_CURSOR_POSITION, cursorInfo)
  }
  
  /**
   * 处理字段获得焦点
   */
  const handleFieldFocus = async (fieldName: string) => {
    if (!fieldName || !isCollaborationEnabled.value) return
    
    // 尝试锁定字段
    const lockSuccess = await lockField(fieldName)
    if (lockSuccess) {
      // 广播用户编辑状态
      await broadcastUserEditingStatus(true, fieldName)
    }
  }

  /**
   * 处理字段失去焦点
   */
  const handleFieldBlur = async (fieldName: string) => {
    if (!fieldName || !isCollaborationEnabled.value) return
    
    // 解锁字段
    await unlockField(fieldName)
    
    // 广播用户编辑状态
    await broadcastUserEditingStatus(false)
  }

  /**
   * 广播用户编辑状态
   */
  const broadcastUserEditingStatus = async (isEditing: boolean, editingField?: string) => {
    const userStatus: UserEditingStatus = {
      userId: currentUser.id,
      userNickname: currentUser.nickname,
      userAvatar: currentUser.avatar,
      isEditing,
      editingField,
      processInstanceId
    }
    
    // 更新本地状态
    collaboratingUsers.value.set(currentUser.id, userStatus)
    
    // 广播状态变更
    await broadcastToProcessUsers(FormCollaborationMessageType.USER_EDITING_STATUS, userStatus)
  }

  /**
   * 发送用户离线通知
   */
  const sendUserOfflineNotification = async () => {
    if (!isCollaborationEnabled.value) return
    
    console.log('发送用户离线通知给所有协作用户')
    
    const offlineNotification = {
      userId: currentUser.id,
      userNickname: currentUser.nickname,
      userAvatar: currentUser.avatar,
      processInstanceId,
      timestamp: Date.now()
    }
    
    // 广播用户离线通知
    await broadcastToProcessUsers(FormCollaborationMessageType.USER_OFFLINE, offlineNotification)
    
    console.log(`用户 ${currentUser.id} (${currentUser.nickname}) 已发送离线通知`)
  }

  // 用户上线通知防抖
  const onlineNotificationTimer: { current: NodeJS.Timeout | null } = { current: null }
  let lastOnlineNotificationTime = 0
  
  /**
   * 发送用户上线通知
   */
  const sendUserOnlineNotification = async (force = false) => {
    if (!isCollaborationEnabled.value) return
    
    const now = Date.now()
    const timeSinceLastNotification = now - lastOnlineNotificationTime
    
    // 增强防抖机制：15秒内不重复发送上线通知，减少服务端压力
    if (!force && timeSinceLastNotification < 15000) {
      if (!onlineNotificationTimer.current) {
        const delay = 15000 - timeSinceLastNotification
        onlineNotificationTimer.current = setTimeout(() => {
          onlineNotificationTimer.current = null
          sendUserOnlineNotification(true)
        }, delay)
        console.log(`📤 上线通知防抖：将在 ${Math.ceil(delay/1000)} 秒后发送 (减少服务端压力)`)
      }
      return
    }
    
    // 检查是否有其他用户在线，如果只有自己则不发送通知
    if (processUsers.value.length <= 1) {
      console.log('📤 跳过上线通知：当前流程只有自己一个用户')
      return
    }
    
    // 清除防抖定时器
    if (onlineNotificationTimer.current) {
      clearTimeout(onlineNotificationTimer.current)
      onlineNotificationTimer.current = null
    }
    
    console.log('📤 发送用户上线通知给所有协作用户')
    
    const onlineNotification = {
      userId: currentUser.id,
      userNickname: currentUser.nickname,
      userAvatar: currentUser.avatar,
      processInstanceId,
      timestamp: now
    }
    
    try {
      // 直接广播用户上线通知，移除自测逻辑减少消息量
      await broadcastToProcessUsers(FormCollaborationMessageType.USER_ONLINE, onlineNotification)
      lastOnlineNotificationTime = now
      console.log(`✅ 用户 ${currentUser.id} (${currentUser.nickname}) 已发送上线通知`)
    } catch (error) {
      console.error('❌ 发送用户上线通知失败:', error)
    }
  }

  // 在线检测防抖和智能调度
  let onlineCheckTimer: NodeJS.Timeout | null = null
  let lastOnlineCheckTime = 0
  let pendingOnlineCheck = false
  
  // 定期心跳检测定时器
  let heartbeatTimer: NodeJS.Timeout | null = null
  
  /**
   * 启动定期心跳检测（优化版）
   */
  const startHeartbeatCheck = () => {
    if (heartbeatTimer) return
    
    // 每60秒进行一次心跳检测，减少服务端压力
    heartbeatTimer = setInterval(() => {
      if (isCollaborationEnabled.value && processUsers.value.length > 1) {
        console.log('💓 执行定期心跳检测')
        sendOnlineCheckRequest(true)
      }
    }, 60000)
    
    console.log('💓 启动定期心跳检测 (60秒间隔，减少服务端压力)')
  }
  
  /**
   * 停止定期心跳检测
   */
  const stopHeartbeatCheck = () => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
      console.log('停止定期心跳检测')
    }
  }
  
  /**
   * 发送在线检测请求
   */
  const sendOnlineCheckRequest = async (force = false) => {
    if (!isCollaborationEnabled.value) return
    
    // 检查是否有其他用户，如果只有自己则不发送检测请求
    if (processUsers.value.length <= 1) {
      console.log('🔍 跳过在线检测：当前流程只有自己一个用户')
      return
    }
    
    const now = Date.now()
    const timeSinceLastCheck = now - lastOnlineCheckTime
    
    // 增强智能调度：20秒内不重复检测（除非强制），减少服务端压力
    if (!force && timeSinceLastCheck < 20000) {
      if (!pendingOnlineCheck) {
        pendingOnlineCheck = true
        // 延迟到合适的时间再执行
        const delay = 20000 - timeSinceLastCheck
        onlineCheckTimer = setTimeout(() => {
          pendingOnlineCheck = false
          sendOnlineCheckRequest(true)
        }, delay)
        console.log(`🔍 在线检测智能调度：将在 ${Math.ceil(delay/1000)} 秒后执行 (减少服务端压力)`)
      }
      return
    }
    
    // 清除待处理的检测
    if (onlineCheckTimer) {
      clearTimeout(onlineCheckTimer)
      onlineCheckTimer = null
      pendingOnlineCheck = false
    }
    
    console.log('🔍 发送在线检测请求给所有流程用户')
    console.log(`📋 当前流程实例ID: ${processInstanceId}`)
    console.log(`👤 当前用户ID: ${currentUser.id} (${currentUser.nickname})`)
    
    // 生成批次ID用于跟踪这次检测（使用连字符避免与checkId分隔符冲突）
    const batchId = `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 6)}`
    const currentBatchUsers = new Set<number>()
    let successCount = 0
    let failedCount = 0
    
    console.log(`🎯 流程相关用户总数: ${processUsers.value.length}`)
    console.log(`📊 当前确认在线用户数: ${confirmedOnlineUsers.value.size}`)
    
    // 向所有流程相关用户发送在线检测请求
    for (const user of processUsers.value) {
      if (user.id !== currentUser.id) {
        try {
          // 修复：生成唯一的检测ID格式：发起者ID_目标用户ID_批次ID_流程实例ID
          const checkId = `${currentUser.id}_${user.id}_${batchId}_${processInstanceId}`
          
          // 记录检测请求
          onlineCheckRequests.value.set(checkId, {
            userId: user.id,
            timestamp: now,
            randomNumber: batchId,
            processInstanceId,
            batchId
          })
          
          currentBatchUsers.add(user.id)
          
          const checkRequest = {
            type: FormCollaborationMessageType.ONLINE_CHECK_REQUEST,
            data: {
              checkId,
              fromUserId: currentUser.id,
              fromUserNickname: currentUser.nickname,
              targetUserId: user.id, // 明确指定目标用户ID
              processInstanceId,
              batchId,
              userId: currentUser.id,
              userNickname: currentUser.nickname,
              userAvatar: currentUser.avatar,
              timestamp: now
            }
          }
          
          // 直接向目标用户发送消息，增加重试机制
          const sendSuccess = await wsSendMessage(user.id, checkRequest)
          if (sendSuccess) {
            successCount++
            console.log(`📤 发送在线检测请求成功: ${checkId} -> 用户${user.id}`)
          } else {
            failedCount++
            // 发送失败时立即标记用户为离线
            confirmedOnlineUsers.value.delete(user.id)
            console.log(`❌ 发送在线检测请求失败: 用户${user.id}`)
          }
        } catch (error) {
          console.error(`❌ 向用户 ${user.id} 发送在线检测请求失败:`, error)
          failedCount++
          // 发送失败时立即标记用户为离线
          confirmedOnlineUsers.value.delete(user.id)
        }
      }
    }
    
    lastOnlineCheckTime = now
    console.log(`📊 在线检测请求发送完成: 成功 ${successCount} 个, 失败 ${failedCount} 个 (批次: ${batchId})`)
    console.log(`⏰ 设置8秒超时处理 (批次: ${batchId})`)
    
    // 设置超时处理，8秒后处理未响应的用户（适当延长超时时间）
    setTimeout(() => {
      handleOnlineCheckTimeout(batchId, currentBatchUsers)
    }, 8000)
  }
  
  /**
   * 处理在线检测超时
   */
  const handleOnlineCheckTimeout = (batchId: string, expectedUsers: Set<number>) => {
    const now = Date.now()
    const expiredUsers = new Set<number>()
    let timeoutCount = 0
    
    // 检查本批次的超时请求
    for (const [checkId, request] of onlineCheckRequests.value.entries()) {
      if (request.batchId === batchId && now - request.timestamp > 8000) {
        expiredUsers.add(request.userId)
        onlineCheckRequests.value.delete(checkId)
        timeoutCount++
      }
    }
    
    // 批量更新超时用户状态
    if (expiredUsers.size > 0) {
      for (const userId of expiredUsers) {
        // 从确认在线用户中移除
        confirmedOnlineUsers.value.delete(userId)
        
        // 更新协作用户状态为离线
        if (collaboratingUsers.value.has(userId)) {
          const userStatus = collaboratingUsers.value.get(userId)!
          collaboratingUsers.value.set(userId, {
            ...userStatus,
            isOnline: false,
            lastOnlineTime: now
          })
        }
      }
      console.log(`在线检测超时处理完成：${timeoutCount} 个用户超时 (批次: ${batchId})`)
    }
  }

  /**
   * 处理在线检测请求（修复版）
   */
  const handleOnlineCheckRequest = async (data: any) => {
    console.log(`📥 收到在线检测请求:`, data)
    
    // 解析checkId：发起者ID_目标用户ID_批次ID_流程实例ID
    const checkIdParts = data.checkId.split('_')
    if (checkIdParts.length !== 4) {
      console.error('❌ 无效的checkId格式:', data.checkId)
      return
    }
    
    const [fromUserId, targetUserId, batchId, requestProcessInstanceId] = checkIdParts
    console.log(`🔍 解析checkId: 发起者${fromUserId} -> 目标${targetUserId}, 批次${batchId}, 流程${requestProcessInstanceId}`)
    
    // 验证目标用户ID是否为当前用户
    if (parseInt(targetUserId) !== currentUser.id) {
      console.log(`❌ 在线检测请求不是发给当前用户的: 目标用户${targetUserId}, 当前用户${currentUser.id}`)
      return
    }
    
    // 验证流程实例ID是否匹配当前页面
    const isMatchingProcess = requestProcessInstanceId === processInstanceId
    
    if (!isMatchingProcess) {
      console.log(`❌ 流程实例ID不匹配: 请求${requestProcessInstanceId}, 当前${processInstanceId}`)
      return
    }
    
    console.log(`✅ 在线检测请求验证通过，准备回复`)
    
    // 构造回复ID：发起者ID_响应者ID_批次ID_流程实例ID
    const responseCheckId = `${fromUserId}_${currentUser.id}_${batchId}_${processInstanceId}`
    
    // 立即回复在线状态
    const checkResponse = {
      type: FormCollaborationMessageType.ONLINE_CHECK_RESPONSE,
      data: {
        checkId: responseCheckId,
        originalCheckId: data.checkId,
        fromUserId: parseInt(fromUserId),
        responseUserId: currentUser.id,
        responseUserNickname: currentUser.nickname,
        processInstanceId: processInstanceId,
        isMatchingProcess: true,
        batchId,
        userId: currentUser.id,
        userNickname: currentUser.nickname,
        userAvatar: currentUser.avatar,
        timestamp: Date.now()
      }
    }
    
    console.log(`📤 准备发送在线检测响应:`, checkResponse)
    
    // 直接向请求发起者发送响应消息
    const sendSuccess = await wsSendMessage(parseInt(fromUserId), checkResponse)
    if (sendSuccess) {
      console.log(`✅ 回复在线检测成功: ${responseCheckId} (批次: ${batchId})`)
    } else {
      console.log(`❌ 回复在线检测失败: ${responseCheckId} (批次: ${batchId})`)
    }
  }

  /**
   * 处理在线检测响应（修复版）
   */
  const handleOnlineCheckResponse = (data: any) => {
    console.log(`📥 收到在线检测响应:`, data)
    console.log(`🔍 当前用户ID: ${currentUser.id}, 当前流程实例ID: ${processInstanceId}`)
    
    if (data.fromUserId !== currentUser.id) {
      console.log(`❌ 响应不是发给当前用户的: 目标${data.fromUserId}, 当前${currentUser.id}`)
      return // 只处理发给自己的响应
    }
    
    // 快速验证流程实例ID
    if (data.processInstanceId !== processInstanceId) {
      console.log(`❌ 流程实例ID不匹配: 响应${data.processInstanceId}, 当前${processInstanceId}`)
      return // 静默忽略不匹配的流程
    }
    
    console.log(`✅ 流程实例ID匹配，证明用户${data.responseUserId}在相同流程实例下在线`)
    
    // 修复：解析新的响应ID格式：发起者ID_响应者ID_批次ID_流程实例ID
    const checkIdParts = data.checkId.split('_')
    if (checkIdParts.length !== 4) {
      console.error('❌ 无效的响应checkId格式:', data.checkId)
      return
    }
    
    const [fromUserId, responseUserId, responseBatchId, responseProcessId] = checkIdParts
    console.log(`🔍 解析响应checkId: 发起者${fromUserId}, 响应者${responseUserId}, 批次${responseBatchId}, 流程${responseProcessId}`)
    
    // 验证发起者ID是否为当前用户
    if (parseInt(fromUserId) !== currentUser.id) {
      console.warn(`❌ 响应发起者ID不匹配: 期望 ${currentUser.id}, 收到 ${fromUserId}`)
      return
    }
    
    // 验证响应用户ID是否匹配
    if (parseInt(responseUserId) !== data.responseUserId) {
      console.warn(`❌ 响应用户ID不匹配: 期望 ${responseUserId}, 收到 ${data.responseUserId}`)
      return
    }
    
    // 查找并移除对应的原始请求：发起者ID_目标用户ID_批次ID_流程实例ID
    const originalCheckId = `${currentUser.id}_${data.responseUserId}_${responseBatchId}_${processInstanceId}`
    console.log(`🔍 查找原始请求ID: ${originalCheckId}`)
    console.log(`📋 当前待处理请求列表:`, Array.from(onlineCheckRequests.value.keys()))
    
    const foundRequest = onlineCheckRequests.value.get(originalCheckId)
    
    if (!foundRequest) {
      console.log(`❌ 未找到对应的在线检测请求: ${originalCheckId}`)
      console.log(`📊 当前确认在线用户数: ${confirmedOnlineUsers.value.size}`)
      return
    }
    
    console.log(`✅ 找到对应的原始请求:`, foundRequest)
    
    // 移除已处理的请求
    onlineCheckRequests.value.delete(originalCheckId)
    
    // 更新用户在线状态
    updateUserOnlineStatus(data.responseUserId, data.responseUserNickname, data.userAvatar || '', Date.now(), responseBatchId)
    
    console.log(`✅ 处理在线检测响应成功: 用户${data.responseUserId} (${data.responseUserNickname}) (批次: ${responseBatchId})`)
    console.log(`📊 更新后确认在线用户数: ${confirmedOnlineUsers.value.size}`)
  }
  
  /**
   * 更新用户在线状态（统一处理）
   */
  const updateUserOnlineStatus = (userId: number, nickname: string, avatar: string, timestamp: number, batchId?: string) => {
    // 确认用户在线
    confirmedOnlineUsers.value.add(userId)
    
    // 更新或添加协作用户状态
    const existingUser = collaboratingUsers.value.get(userId)
    collaboratingUsers.value.set(userId, {
      userId: userId,
      userNickname: nickname,
      userAvatar: avatar,
      isEditing: existingUser?.isEditing || false,
      editingField: existingUser?.editingField,
      processInstanceId: processInstanceId,
      isOnline: true,
      lastOnlineTime: timestamp
    })
    
    // 简化日志：只在调试模式下输出详细信息
    if (process.env.NODE_ENV === 'development') {
      console.log(`用户 ${userId} (${nickname}) 确认在线${batchId ? ` (批次: ${batchId})` : ''}`)
    }
  }
  
  /**
   * 添加字段编辑样式
   */
  const addFieldEditingStyle = (fieldName: string, user: any) => {
    nextTick(() => {
      try {
        // 查找表单字段元素
        const fieldElement = document.querySelector(`[data-field="${fieldName}"]`) || 
                           document.querySelector(`input[name="${fieldName}"]`) ||
                           document.querySelector(`textarea[name="${fieldName}"]`) ||
                           document.querySelector(`select[name="${fieldName}"]`)
        
        if (fieldElement) {
          // 添加编辑中的样式类
          fieldElement.classList.add('form-field-editing')
          
          // 设置边框颜色（根据用户ID生成唯一颜色）
          const userColor = generateUserColor(user.id)
          fieldElement.style.borderColor = userColor
          fieldElement.style.borderWidth = '2px'
          fieldElement.style.borderStyle = 'solid'
          
          // 添加用户标识
          addUserIndicator(fieldElement, user, userColor)
        }
      } catch (error) {
        console.error('添加字段编辑样式失败:', error)
      }
    })
  }
  
  /**
   * 移除字段编辑样式
   */
  const removeFieldEditingStyle = (fieldName: string) => {
    nextTick(() => {
      try {
        const fieldElement = document.querySelector(`[data-field="${fieldName}"]`) || 
                           document.querySelector(`input[name="${fieldName}"]`) ||
                           document.querySelector(`textarea[name="${fieldName}"]`) ||
                           document.querySelector(`select[name="${fieldName}"]`)
        
        if (fieldElement) {
          fieldElement.classList.remove('form-field-editing')
          fieldElement.style.borderColor = ''
          fieldElement.style.borderWidth = ''
          fieldElement.style.borderStyle = ''
          
          // 移除用户标识
          removeUserIndicator(fieldElement)
        }
      } catch (error) {
        console.error('移除字段编辑样式失败:', error)
      }
    })
  }
  
  /**
   * 添加用户编辑指示器
   */
  const addUserIndicator = (fieldElement: Element, user: any, color: string) => {
    // 移除已存在的指示器
    removeUserIndicator(fieldElement)
    
    // 创建用户指示器
    const indicator = document.createElement('div')
    indicator.className = 'form-collaboration-indicator'
    indicator.style.cssText = `
      position: absolute;
      top: -8px;
      right: -8px;
      background: ${color};
      color: white;
      padding: 2px 6px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: bold;
      z-index: 1000;
      pointer-events: none;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    `
    indicator.textContent = user.nickname?.substring(0, 2) || '用户'
    
    // 设置父元素为相对定位
    const parent = fieldElement.parentElement
    if (parent) {
      parent.style.position = 'relative'
      parent.appendChild(indicator)
    }
  }
  
  /**
   * 移除用户编辑指示器
   */
  const removeUserIndicator = (fieldElement: Element) => {
    const parent = fieldElement.parentElement
    if (parent) {
      const indicator = parent.querySelector('.form-collaboration-indicator')
      if (indicator) {
        indicator.remove()
      }
    }
  }
  
  /**
   * 根据用户ID生成唯一颜色
   */
  const generateUserColor = (userId: number): string => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ]
    return colors[userId % colors.length]
  }
  
  /**
   * 处理接收到的协作消息
   */
  const handleCollaborationMessage = (message: any) => {
    if (!message.data || message.data.processInstanceId !== processInstanceId) return
    if (message.data.userId === currentUser.id) return // 忽略自己的消息
    
    const { type, data } = message
    
    switch (type) {
      case FormCollaborationMessageType.FORM_FIELD_LOCK:
        handleRemoteFieldLock(data)
        break
      case FormCollaborationMessageType.FORM_FIELD_UNLOCK:
        handleRemoteFieldUnlock(data)
        break
      case FormCollaborationMessageType.FORM_FIELD_CHANGE:
        handleRemoteFieldChange(data)
        break
      case FormCollaborationMessageType.FORM_CURSOR_POSITION:
        handleRemoteCursorPosition(data)
        break
      case FormCollaborationMessageType.USER_EDITING_STATUS:
        handleRemoteUserStatus(data)
        break
    }
  }
  
  /**
   * 处理远程字段锁定
   */
  const handleRemoteFieldLock = (data: FieldLockInfo) => {
    lockedFields.value.set(data.fieldName, data)
    addFieldEditingStyle(data.fieldName, {
      id: data.userId,
      nickname: data.userNickname,
      avatar: data.userAvatar
    })
    console.log(`远程用户 ${data.userNickname} 锁定了字段 "${data.fieldName}"`)
  }
  
  /**
   * 处理远程字段解锁
   */
  const handleRemoteFieldUnlock = (data: any) => {
    lockedFields.value.delete(data.fieldName)
    removeFieldEditingStyle(data.fieldName)
    console.log(`远程用户解锁了字段 "${data.fieldName}"`)
  }
  
  /**
   * 处理远程字段变更
   */
  const handleRemoteFieldChange = (data: FieldChangeInfo) => {
    if (formApi && formApi.value) {
      try {
        // 更新表单字段值
        formApi.value.setValue(data.fieldName, data.value)
        console.log(`远程用户 ${data.userNickname} 更新了字段 "${data.fieldName}":`, data.value)
      } catch (error) {
        console.error('更新远程字段值失败:', error)
      }
    }
  }
  
  /**
   * 处理远程光标位置
   */
  const handleRemoteCursorPosition = (data: CursorPositionInfo) => {
    // 更新光标位置映射
    const fieldCursors = fieldCursors.value.get(data.fieldName) || []
    const existingIndex = fieldCursors.findIndex(cursor => cursor.userId === data.userId)
    
    if (existingIndex >= 0) {
      fieldCursors[existingIndex] = data
    } else {
      fieldCursors.push(data)
    }
    
    fieldCursors.value.set(data.fieldName, fieldCursors)
    
    // TODO: 实现光标位置的视觉显示
    console.log(`远程用户 ${data.userNickname} 在字段 "${data.fieldName}" 位置 ${data.position}`)
  }
  
  /**
   * 处理远程用户状态
   */
  const handleRemoteUserStatus = (data: UserEditingStatus) => {
    collaboratingUsers.value.set(data.userId, data)
    console.log(`远程用户 ${data.userNickname} 编辑状态:`, data.isEditing ? '编辑中' : '空闲')
  }

  /**
   * 处理用户离线通知
   */
  const handleUserOfflineNotification = (data: any) => {
    const { userId, userNickname, processInstanceId: messageProcessId } = data
    
    // 验证流程实例ID是否匹配
    if (messageProcessId !== processInstanceId) {
      console.log(`忽略不匹配流程的用户离线通知: 用户${userId}, 流程${messageProcessId}`)
      return
    }
    
    console.log(`收到用户 ${userId} (${userNickname}) 的离线通知`)
    
    // 从确认在线用户列表中移除该用户
    if (confirmedOnlineUsers.value.has(userId)) {
      confirmedOnlineUsers.value.delete(userId)
      console.log(`用户 ${userId} 已从在线用户列表中移除`)
    }
    
    // 从协作用户列表中移除该用户，或标记为离线
    if (collaboratingUsers.value.has(userId)) {
      const userStatus = collaboratingUsers.value.get(userId)!
      collaboratingUsers.value.set(userId, {
        ...userStatus,
        isOnline: false,
        isEditing: false,
        editingField: null,
        lastOnlineTime: Date.now()
      })
      console.log(`用户 ${userId} 协作状态已更新为离线`)
    }
    
    // 解锁该用户锁定的所有字段
    for (const [fieldName, lockInfo] of lockedFields.value.entries()) {
      if (lockInfo.userId === userId) {
        lockedFields.value.delete(fieldName)
        removeFieldEditingStyle(fieldName)
        console.log(`已解锁用户 ${userId} 锁定的字段: ${fieldName}`)
      }
    }
    
    // 清理该用户的光标位置信息
    for (const [fieldName, cursors] of fieldCursors.value.entries()) {
      const filteredCursors = cursors.filter(cursor => cursor.userId !== userId)
      if (filteredCursors.length !== cursors.length) {
        fieldCursors.value.set(fieldName, filteredCursors)
        console.log(`已清理用户 ${userId} 在字段 ${fieldName} 的光标位置`)
      }
    }
  }

  /**
   * 处理用户上线通知（优化版）
   */
  const handleUserOnlineNotification = (data: any) => {
    const { userId, userNickname, userAvatar, processInstanceId: messageProcessId, timestamp } = data
    
    // 验证流程实例ID是否匹配
    if (messageProcessId !== processInstanceId) {
      return // 静默忽略其他流程实例的通知
    }
    
    // 避免处理自己的上线通知
    if (userId === currentUser.id) {
      return
    }
    
    console.log(`用户 ${userNickname} 加入协作`)
    
    // 直接更新用户在线状态（无需额外的在线检测）
    updateUserOnlineStatus(userId, userNickname, userAvatar, timestamp)
    
    // 智能在线检测：只在必要时触发
    // 如果当前没有进行中的在线检测，且距离上次检测超过5秒，则触发检测
    const timeSinceLastCheck = Date.now() - lastOnlineCheckTime
    if (!pendingOnlineCheck && timeSinceLastCheck > 5000) {
      setTimeout(() => {
        sendOnlineCheckRequest()
      }, 1000) // 给新用户1秒时间完成初始化
    }
  }
  
  /**
   * 初始化协作功能
   */
  const initCollaboration = async () => {
    // 防止重复初始化
    if (isInitialized) {
      console.log('表单协作功能已初始化，跳过重复初始化')
      return
    }
    
    console.log('初始化表单协作功能')
    
    // 清理之前的消息监听器
    if (messageListenerCleanup) {
      messageListenerCleanup()
      messageListenerCleanup = null
    }
    
    // 设置 WebSocket 消息监听
    messageListenerCleanup = onMessage((message) => {
      try {
        console.log('📨 收到WebSocket原始消息:', message)
        
        // 兼容新旧消息格式
        let collaborationMessage = null
        
        // 新格式：直接包含 targetUserId 和 message 的格式
        if (message.targetUserId && message.message) {
          console.log(`🔍 检测到新格式消息，目标用户: ${message.targetUserId}, 当前用户: ${currentUser.id}`)
          
          // 检查是否是发给当前用户的消息
          if (message.targetUserId === currentUser.id) {
            collaborationMessage = message.message
            console.log('✅ 收到新格式协作消息:', collaborationMessage)
          } else {
            console.log(`❌ 消息不是发给当前用户的: 目标用户${message.targetUserId}, 当前用户${currentUser.id}`)
            return
          }
        }
        // 旧格式：{ type: 'demo-message-receive', content: '...' }
        else if (message.type === 'demo-message-receive') {
          console.log(`🔍 检测到旧格式消息`)
          const content = JSON.parse(message.content)
          console.log('📋 解析后的旧格式消息内容:', content)
          
          // 检查是否是协作消息（包含我们定义的消息类型）
          if (content.text) {
            try {
              collaborationMessage = JSON.parse(content.text)
              console.log('✅ 旧格式协作消息解析成功:', collaborationMessage)
            } catch (parseError) {
              // 不是JSON格式的协作消息，忽略
              console.log('❌ 非协作消息，忽略:', content.text)
              return
            }
          }
        } else {
          console.log(`❌ 不是协作消息格式，忽略`)
        }
        
        // 验证并处理协作消息
        if (collaborationMessage && Object.values(FormCollaborationMessageType).includes(collaborationMessage.type)) {
          console.log(`📤 处理协作消息类型: ${collaborationMessage.type}`)
          handleRemoteMessage(collaborationMessage)
        } else if (collaborationMessage) {
          console.log('❌ 未知的协作消息类型:', collaborationMessage.type)
        } else {
          console.log('❌ 协作消息格式无效')
        }
        
      } catch (error) {
        console.error('❌ 处理WebSocket消息失败:', error)
      }
    })
    
    // 获取流程用户列表
    await getProcessUsers()
    
    // 将当前用户添加到确认在线用户列表中
    confirmedOnlineUsers.value.add(currentUser.id)
    console.log(`当前用户 ${currentUser.id} 已添加到在线用户列表`)
    
    // 状态恢复：将离线用户重新标记为在线候选
    collaboratingUsers.value.forEach((user, userId) => {
      if (!user.isEditing) {
        // 将之前离线的用户重新加入候选列表
        confirmedOnlineUsers.value.add(userId)
      }
    })
    
    // 发送在线检测请求和用户上线通知
    setTimeout(async () => {
      // 发送用户上线通知
      try {
        await sendUserOnlineNotification()
      } catch (error) {
        console.error('发送用户上线通知失败:', error)
      }
      
      // 发送在线检测请求
      sendOnlineCheckRequest()
    }, 1000) // 延迟1秒发送，确保WebSocket连接稳定
    
    // 标记为已初始化
    isInitialized = true
    console.log('表单协作功能初始化完成')
  }
  
  /**
   * 清理协作功能
   */
  const cleanupCollaboration = async (fullCleanup = false) => {
    console.log('清理表单协作功能', fullCleanup ? '(完全清理)' : '(保留状态)')
    
    // 在完全清理时发送用户离线通知
    if (fullCleanup && isCollaborationEnabled.value) {
      try {
        await sendUserOfflineNotification()
      } catch (error) {
        console.error('发送用户离线通知失败:', error)
      }
    }
    
    // 清理消息监听器
    if (messageListenerCleanup) {
      messageListenerCleanup()
      messageListenerCleanup = null
    }
    
    // 解锁当前用户锁定的所有字段
    for (const [fieldName, lockInfo] of lockedFields.value.entries()) {
      if (lockInfo.userId === currentUser.id) {
        unlockField(fieldName)
      }
    }
    
    // 清理在线检测请求
    onlineCheckRequests.value.clear()
    
    if (fullCleanup) {
      // 完全清理：组件卸载时使用
      lockedFields.value.clear()
      collaboratingUsers.value.clear()
      fieldCursors.value.clear()
      currentEditingField.value = null
      confirmedOnlineUsers.value.clear()
      
      // 重置初始化标记
      isInitialized = false
    } else {
      // 部分清理：网络重连时使用，保留用户状态但标记为离线
      const now = Date.now()
      for (const [userId, userStatus] of collaboratingUsers.value.entries()) {
        collaboratingUsers.value.set(userId, {
          ...userStatus,
          isOnline: false,
          lastOnlineTime: now,
          isEditing: false,
          editingField: null
        })
      }
      
      // 清理当前编辑字段状态
      currentEditingField.value = null
      
      // 保留确认在线用户列表，但会在下次在线检测时重新验证
      console.log('保留协作状态，等待重新连接验证')
    }
  }
  
  // 监听WebSocket连接状态
  watch(status, (newStatus) => {
    console.log('WebSocket连接状态变化:', newStatus)
    if (newStatus === 'OPEN') {
      // 连接成功后，发送用户上线通知
      sendUserOnlineNotification()
      // 启动心跳检测
      if (isCollaborationEnabled.value) {
        startHeartbeatCheck()
      }
    } else if (newStatus === 'CLOSED' || newStatus === 'CONNECTING') {
      // 连接断开时停止心跳检测
      stopHeartbeatCheck()
    }
  })

  // 监听协同编辑启用状态
  watch(isCollaborationEnabled, (enabled) => {
    console.log('协同编辑状态变化:', enabled)
    if (enabled) {
      // 启用协同编辑时，发送用户上线通知
      sendUserOnlineNotification()
      // 如果WebSocket已连接，启动心跳检测
      if (status.value === 'OPEN') {
        startHeartbeatCheck()
      }
    } else {
      // 禁用协同编辑时，清理状态
      cleanupCollaboration(false)
      // 停止心跳检测
      stopHeartbeatCheck()
    }
  })

  // 组件卸载时清理
  onUnmounted(() => {
    cleanupCollaboration(true) // 完全清理
    // 停止心跳检测
    stopHeartbeatCheck()
    // 清理定时器
    if (onlineCheckTimer) {
      clearTimeout(onlineCheckTimer)
      onlineCheckTimer = null
    }
    if (onlineNotificationTimer.current) {
      clearTimeout(onlineNotificationTimer.current)
      onlineNotificationTimer.current = null
    }
  })
  
  /**
   * 处理远程协作消息
   */
  const handleRemoteMessage = (message: any) => {
    try {
      console.log('🔄 处理远程协作消息:', message)
      
      // 对于在线检测相关消息，不要过滤自己的消息，因为响应需要处理
      const isOnlineCheckMessage = message.type === FormCollaborationMessageType.ONLINE_CHECK_REQUEST || 
                                  message.type === FormCollaborationMessageType.ONLINE_CHECK_RESPONSE
      
      // 忽略自己发送的消息（除了在线检测消息）
      if (!isOnlineCheckMessage && message.userId === currentUser.id) {
        console.log('❌ 忽略自己发送的消息:', message.type)
        return
      }
      
      console.log(`✅ 开始处理消息类型: ${message.type}`)
      
      switch (message.type) {
        case FormCollaborationMessageType.FORM_FIELD_LOCK:
          handleRemoteFieldLock(message)
          break
          
        case FormCollaborationMessageType.FORM_FIELD_UNLOCK:
          handleRemoteFieldUnlock(message)
          break
          
        case FormCollaborationMessageType.FORM_FIELD_CHANGE:
          handleRemoteFieldChange(message)
          break
          
        case FormCollaborationMessageType.FORM_CURSOR_POSITION:
          handleRemoteCursorPosition(message)
          break
          
        case FormCollaborationMessageType.USER_EDITING_STATUS:
          handleRemoteUserStatus(message)
          break
          
        case FormCollaborationMessageType.ONLINE_CHECK_REQUEST:
          handleOnlineCheckRequest(message.data)
          break
          
        case FormCollaborationMessageType.ONLINE_CHECK_RESPONSE:
          handleOnlineCheckResponse(message.data)
          break
          
        case FormCollaborationMessageType.USER_OFFLINE:
          handleUserOfflineNotification(message.data)
          break
          
        case FormCollaborationMessageType.USER_ONLINE:
          handleUserOnlineNotification(message.data)
          break
          
        default:
          console.warn('未知的协作消息类型:', message.type)
      }
    } catch (error) {
      console.error('处理远程协作消息失败:', error)
      ElMessage.error('处理协作消息失败')
    }
  }
  
  /**
   * 网络重连处理
   */
  const handleReconnection = () => {
    console.log('WebSocket 重连，重新初始化协作状态')
    
    // 部分清理协作功能，保留用户状态
    cleanupCollaboration(false)
    
    // 重置初始化标记，允许重新初始化
    isInitialized = false
    
    // 重新初始化
    if (isCollaborationEnabled.value) {
      setTimeout(() => {
        initCollaboration()
      }, 1000) // 延迟1秒，确保WebSocket连接稳定
    }
  }

  return {
    // 状态
    lockedFields: readonly(lockedFields),
    collaboratingUsers: readonly(collaboratingUsers),
    fieldCursors: readonly(fieldCursors),
    currentEditingField: readonly(currentEditingField),
    isCollaborationEnabled,
    processUsers: readonly(processUsers),
    confirmedOnlineUsers: readonly(confirmedOnlineUsers),
    wsStatus: readonly(status),
    
    // 方法
    initCollaboration,
    cleanupCollaboration,
    lockField,
    unlockField,
    handleFieldChange,
    handleCursorPosition,
    handleFieldFocus,
    handleFieldBlur,
    broadcastUserEditingStatus,
    sendUserOfflineNotification,
    sendUserOnlineNotification,
    getProcessUsers,
    sendOnlineCheckRequest,
    handleRemoteMessage,
    handleUserOfflineNotification,
    handleUserOnlineNotification,
    handleReconnection,
    startHeartbeatCheck,
    stopHeartbeatCheck
  }
}