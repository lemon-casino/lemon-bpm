import { ref, watch, watchEffect, onUnmounted, nextTick, readonly } from 'vue'
import { useWebSocket } from '@vueuse/core'
import { getRefreshToken } from '@/utils/auth'
import { useUserStore } from '@/store/modules/user'

export interface WebSocketMessage {
  type: string
  content: string
}

// 表单协同编辑消息类型
export enum FormCollaborationMessageType {
  FORM_FIELD_LOCK = 'FORM_FIELD_LOCK',
  FORM_FIELD_UNLOCK = 'FORM_FIELD_UNLOCK',
  FORM_FIELD_CHANGE = 'FORM_FIELD_CHANGE',
  FORM_CURSOR_POSITION = 'FORM_CURSOR_POSITION',
  USER_EDITING_STATUS = 'USER_EDITING_STATUS',
  // 链式在线检测请求与响应
  ONLINE_CHECK_REQUEST = 'ONLINE_CHECK_REQUEST',
  ONLINE_CHECK_RESPONSE = 'ONLINE_CHECK_RESPONSE',
  USER_OFFLINE = 'USER_OFFLINE',
  USER_ONLINE = 'USER_ONLINE'
}

// 定义消息内容接口
export interface MessageContent {
  type?: string;
  fromUserId?: number;
  text?: string;
  data?: any;
  timestamp?: number;
  [key: string]: any;
}

export const useWebSocketMessage = () => {
  // 初始化用户store
  const userStore = useUserStore()

  // WebSocket 连接
  const wsPrefix = import.meta.env.PROD
    ? window.location.origin + (import.meta.env.NGINX_BASE_URL || '/baoxuan')
    : import.meta.env.VITE_BASE_URL
  const wsUrl =
    (wsPrefix + '/infra/ws').replace('http', 'ws') +
    '?token=' + getRefreshToken()

  const { data, status, send, open, close } = useWebSocket(wsUrl, {
    autoReconnect: {
      retries: 5,
      delay: 1000,
      onFailed() {
        console.error('WebSocket连接重试失败，已达到最大重试次数')
      }
    },
    heartbeat: {
      message: 'ping',
      interval: 30000
    }
  })

  // 连接状态监听
  watch(() => status.value, (newStatus, oldStatus) => {
    console.log(`WebSocket连接状态变化: ${oldStatus} -> ${newStatus}`)
  })

  // 连接初始化标志
  const isInitialized = ref(false)

  // 广播通道
  const bpmChannel = new BroadcastChannel('bpm-process-channel')
  // 标记通道是否已关闭
  let isBpmChannelClosed = false

  // 消息队列，存储连接未打开时的消息
  const messageQueue = ref<{toUserId: number, text: string}[]>([])

  // 新的消息队列结构，支持优先级和重试
  interface QueuedMessage {
    targetUserId: number
    message: any
    timestamp: number
    id: string
    retryCount: number
    priority: 'high' | 'normal'
  }

  const priorityMessageQueue = ref<QueuedMessage[]>([])

  // 生成消息ID
  const generateMessageId = () => {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }



  // 添加消息到队列
  const addToQueue = (messageData: QueuedMessage) => {
    if (messageData.priority === 'high') {
      // 高优先级消息插入到队列前面
      priorityMessageQueue.value.unshift(messageData)
    } else {
      // 普通优先级消息添加到队列末尾
      priorityMessageQueue.value.push(messageData)
    }
    console.log(`消息已加入队列，当前队列长度: ${priorityMessageQueue.value.length}`)
  }

  // 检查连接并尝试重连
  const ensureConnection = async () => {
    // 如果连接已打开，直接返回成功
    if (status.value === 'OPEN') {
      return true
    }

    console.log('WebSocket连接未打开，尝试重新连接...')

    // 如果连接正在进行中，等待一段时间
    if (status.value === 'CONNECTING') {
      console.log('WebSocket正在连接中，等待连接完成...')
      // 等待连接完成或超时
      return new Promise((resolve) => {
        // 设置超时
        const timeout = setTimeout(() => {
          console.log('WebSocket连接等待超时')
          unwatch()
          resolve(false)
        }, 5000)

        // 监听状态变化
        const unwatch = watch(() => status.value, (newStatus) => {
          if (newStatus === 'OPEN') {
            clearTimeout(timeout)
            unwatch()
            console.log('WebSocket连接已成功建立')
            resolve(true)
          } else if (newStatus === 'CLOSED') {
            clearTimeout(timeout)
            unwatch()
            console.log('WebSocket连接已关闭')
            resolve(false)
          }
        }, { immediate: true })
      })
    }

    // 如果连接已关闭，尝试重新打开
    if (status.value === 'CLOSED') {
      try {
        // 先关闭旧连接
        close()
        // 延迟一段时间再重新连接
        await new Promise(resolve => setTimeout(resolve, 500))
        // 重新打开连接
        open()

        // 等待连接完成或超时
        return new Promise((resolve) => {
          // 设置超时
          const timeout = setTimeout(() => {
            console.log('WebSocket重新连接超时')
            unwatch()
            resolve(false)
          }, 5000)

          // 监听状态变化
          const unwatch = watch(() => status.value, (newStatus) => {
            if (newStatus === 'OPEN') {
              clearTimeout(timeout)
              unwatch()
              console.log('WebSocket重新连接成功')
              resolve(true)
            } else if (newStatus === 'CLOSED') {
              clearTimeout(timeout)
              unwatch()
              console.log('WebSocket重新连接失败')
              resolve(false)
            }
          }, { immediate: true })
        })
      } catch (error) {
        console.error('WebSocket重新连接出错:', error)
        return false
      }
    }

    return false
  }

  // 处理消息队列
  const processMessageQueue = () => {
    // 处理旧的消息队列
    if (messageQueue.value.length > 0 && status.value === 'OPEN') {
      console.log(`处理旧消息队列，共有 ${messageQueue.value.length} 条消息待发送`)

      // 复制队列并清空原队列
      const queueToProcess = [...messageQueue.value]
      messageQueue.value = []

      // 发送队列中的消息
      queueToProcess.forEach(msg => {
        try {
          // 🔧 使用正确的demo-message-send格式
          const demoMessage = {
            type: 'demo-message-send',
            toUserId: msg.toUserId,
            text: msg.text
          }

          console.log('从队列发送demo-message-send消息:', demoMessage)
          send(JSON.stringify(demoMessage))
        } catch (error) {
          console.error('从队列发送WebSocket消息失败:', error)
          // 如果发送失败，将消息重新加入队列
          messageQueue.value.push(msg)
        }
      })
    }

    // 处理新的优先级消息队列
    if (priorityMessageQueue.value.length > 0 && status.value === 'OPEN') {
      console.log(`处理优先级消息队列，共有 ${priorityMessageQueue.value.length} 条消息待发送`)

      // 复制队列并清空原队列
      const queueToProcess = [...priorityMessageQueue.value]
      priorityMessageQueue.value = []

      // 发送队列中的消息
      queueToProcess.forEach(messageData => {
        try {
          // 🔧 发送QueuedMessage中的message字段（demo-message-send格式）
          send(JSON.stringify(messageData.message))
          console.log(`从优先级队列发送demo-message-send给用户 ${messageData.targetUserId}:`, messageData.message.type)
        } catch (error) {
          console.error('从优先级队列发送消息失败:', error)
          // 如果发送失败且重试次数未超限，重新加入队列
          if (messageData.retryCount < 3) {
            messageData.retryCount++
            addToQueue(messageData)
          } else {
            console.error(`消息 ${messageData.id} 重试次数已达上限，丢弃消息`)
          }
        }
      })
    }
  }

  // 定时处理消息队列
  let queueProcessInterval: number | null = null

  // 启动队列处理定时器
  const startQueueProcessor = () => {
    if (queueProcessInterval === null) {
      queueProcessInterval = window.setInterval(() => {
        if (status.value === 'OPEN' && (messageQueue.value.length > 0 || priorityMessageQueue.value.length > 0)) {
          processMessageQueue()
        }
      }, 5000) // 每5秒检查一次队列
      console.log('启动WebSocket消息队列处理定时器')
    }
  }

  // 停止队列处理定时器
  const stopQueueProcessor = () => {
    if (queueProcessInterval !== null) {
      window.clearInterval(queueProcessInterval)
      queueProcessInterval = null
      console.log('停止WebSocket消息队列处理定时器')
    }
  }

  // 消息发送状态统计
  const messageSendStats = ref({
    totalSent: 0,
    successCount: 0,
    failureCount: 0,
    lastSendTime: 0,
    recentErrors: [] as string[]
  })

  // 诊断连接状态
  const diagnoseConnection = () => {
    console.log('🔍 WebSocket连接诊断:')
    console.log(`  连接状态: ${status.value}`)
    console.log(`  连接URL: ${wsUrl}`)
    console.log(`  初始化状态: ${isInitialized.value}`)
    console.log(`  消息队列长度: ${messageQueue.value.length}`)
    console.log(`  优先级队列长度: ${priorityMessageQueue.value.length}`)
    console.log(`  发送统计: 总计${messageSendStats.value.totalSent}, 成功${messageSendStats.value.successCount}, 失败${messageSendStats.value.failureCount}`)

    if (status.value === 'OPEN') {
      console.log('🔗 连接正常，发送测试ping消息')
      sendMessage(userStore.getUser?.id || 0, {
        type: 'ping',
        timestamp: Date.now()
      }, 'high')
    }
  }

  // 服务端响应监控
  const monitorServerResponse = (messageType: string, targetUserId: number) => {
    const monitorId = `${messageType}_${targetUserId}_${Date.now()}`
    console.log(`📊 开始监控服务端响应: ${monitorId}`)

    // 5秒后检查是否收到服务端的任何响应
    setTimeout(() => {
      console.log(`⏰ 服务端响应监控超时: ${monitorId}`)
      console.log(`💡 建议检查服务端是否正确注册了 ${messageType} 类型的监听器`)
    }, 5000)

    return monitorId
  }

  // 监听连接状态变化
  watch(() => status.value, (newStatus) => {
    console.log('WebSocket连接状态变化:', newStatus)
    if (newStatus === 'OPEN') {
      // 连接打开时，立即处理队列并启动定时处理
      processMessageQueue()
      startQueueProcessor()
      isInitialized.value = true
    } else if (newStatus === 'CLOSED') {
      // 连接关闭时，停止定时处理
      stopQueueProcessor()
    }
  })

  /**
   * 发送消息给指定用户 (使用demo-message-send类型)
   * @param userId 目标用户ID
   * @param message 消息内容
   * @param priority 消息优先级（高优先级消息会优先发送）
   * @param messageId 模型ID
   * @returns Promise<boolean> 返回发送是否成功
   */
  const sendMessage = async (
    userId: number,
    message: any,
    priority: 'high' | 'normal' = 'normal',
    messageId?: string
  ): Promise<boolean> => {
    if (!message) {
      console.warn('发送消息失败 消息内容为空')
      return false
    }

    // 🔧 使用demo-message-send格式，直接发送原始消息内容
    const originalMessage = {
      type: message.type,
      data: message.data || {},
      timestamp: Date.now(),
      id: messageId || generateMessageId(),
      fromUserId: userStore.getUser?.id || null
    }

    // 构造符合后端期望的demo-message-send格式
    const demoMessage = {
      type: 'demo-message-send',  // 🔧 添加必需的type字段
      text: JSON.stringify(originalMessage)  // 直接发送JSON字符串，不压缩
    }
    if (userId !== 0) {
      demoMessage['toUserId'] = userId // 后端期望的目标用户ID字段
    }

    console.log(`📤 准备发送demo-message-send给用户 ${userId}:`, message.type)
    console.log(`📤 消息内容:`, originalMessage)

    if (status.value === 'OPEN') {
      try {
        const messageString = JSON.stringify(demoMessage)
        console.log(`📤 发送的demo-message-send JSON:`, messageString)
        send(messageString)
        console.log(`✅ demo-message-send已发送给用户 ${userId}`)

        // 更新发送统计
        messageSendStats.value.totalSent++
        messageSendStats.value.successCount++
        messageSendStats.value.lastSendTime = Date.now()

        // 启动服务端响应监控
        monitorServerResponse('demo-message-send', userId)

        return true
      } catch (error: any) {
        console.error(`❌ 发送demo-message-send失败，加入队列:`, error)

        // 更新发送统计
        messageSendStats.value.totalSent++
        messageSendStats.value.failureCount++
        messageSendStats.value.recentErrors.push(`${error.message} - ${new Date().toISOString()}`)

        // 保持最近10个错误记录
        if (messageSendStats.value.recentErrors.length > 10) {
          messageSendStats.value.recentErrors.shift()
        }

        addToQueue({
          targetUserId: userId,
          message: demoMessage,
          timestamp: Date.now(),
          id: generateMessageId(),
          retryCount: 0,
          priority: 'normal'
        })
        return false
      }
    } else {
      console.log(`WebSocket未连接，demo-message-send加入队列`)
      addToQueue({
        targetUserId: userId,
        message: demoMessage,
        timestamp: Date.now(),
        id: generateMessageId(),
        retryCount: 0,
        priority
      })
      return false
    }
  }

  /**
   * 向多个用户发送消息
   * @param userIds 目标用户ID数组
   * @param message 消息内容
   * @param priority 消息优先级
   * @param messageId 自定义消息ID
   */
  const sendToUsers = async (
    userIds: number[],
    message: any,
    priority: 'high' | 'normal' = 'normal',
    messageId?: string
  ): Promise<boolean> => {
    if (!userIds || userIds.length === 0) return false
    const results = await Promise.all(
      userIds.map((id) => sendMessage(id, message, priority, messageId))
    )
    return results.every(Boolean)
  }

  // 发送广播消息
  const sendBroadcast = (type: string, data?: any) => {
    try {
      // 检查通道是否已关闭
      if (isBpmChannelClosed) {
        console.warn('广播通道已关闭，无法发送消息')
        return false
      }

      bpmChannel.postMessage({
        type,
        data,
        timestamp: Date.now()
      })
      return true
    } catch (error) {
      console.error('发送广播消息失败:', error)
      return false
    }
  }

  // 监听消息
  const onMessage = (callback: (data: any) => void) => {
    // 返回 watchEffect 的停止函数，用于清理监听器
    return watchEffect(() => {
      console.log('🔍 WebSocket data.value 变化:', data.value, '类型:', typeof data.value)

      if (!data.value) {
        console.log('❌ data.value 为空，跳过处理')
        return
      }

      try {
        // 心跳消息处理
        if (data.value === 'pong') {
          console.log('💓 收到心跳消息 pong')
          return
        }

        console.log('📨 WebSocket收到原始数据:', data.value)

        // 尝试解析JSON
        let parsedData
        try {
          parsedData = JSON.parse(data.value)
          console.log('📨 WebSocket解析后的消息:', JSON.stringify(parsedData, null, 2))
        } catch (parseError) {
          console.error('❌ JSON解析失败:', parseError, '原始数据:', data.value)
          return
        }

        // 🔧 处理demo-message-receive类型的消息
        if (parsedData && typeof parsedData === 'object') {
          if (parsedData.type === 'demo-message-receive') {
            console.log('📥 收到demo-message-receive消息')

            let messageContent: MessageContent = {} as MessageContent

            // 检查是否有content字段（新格式）
            if (parsedData.content) {
              console.log('📦 处理content字段中的消息')
              try {
                // 先解析content字段的JSON
                const contentData = JSON.parse(parsedData.content)
                console.log('📋 content解析结果:', contentData)

                // 检查content中是否有text字段，直接解析JSON
                if (contentData.text) {
                  console.log('📦 解析text字段中的JSON消息')
                  try {
                    // 直接解析JSON，不解压缩
                    const textData = JSON.parse(contentData.text)
                    messageContent = {
                      ...contentData,
                      ...textData  // 将text中的内容合并到消息中
                    } as MessageContent
                    console.log('✅ text字段JSON解析成功')
                  } catch (textParseError) {
                    console.log('📦 text字段不是JSON格式，保持原样')
                    messageContent = contentData as MessageContent
                  }
                } else {
                  messageContent = contentData as MessageContent
                }
              } catch (contentParseError) {
                console.error('❌ 解析content字段失败:', contentParseError)
                console.error('❌ content内容:', parsedData.content)
                messageContent = parsedData as MessageContent
              }
            }
            // 检查是否有text字段（旧格式，直接JSON消息内容）
            else if (parsedData.text) {
              console.log('📦 解析text字段中的JSON消息')
              try {
                // 直接解析JSON，不解压缩
                messageContent = JSON.parse(parsedData.text) as MessageContent
                console.log('✅ text字段JSON解析成功:', messageContent.type)
              } catch (parseError) {
                console.error('❌ 解析text字段JSON失败:', parseError)
                console.error('❌ text内容:', parsedData.text)
                messageContent = parsedData as MessageContent
              }
            } else {
              console.warn('⚠️ demo-message-receive消息缺少content和text字段')
              messageContent = parsedData as MessageContent
            }

            console.log('📋 最终处理的消息:', {
              type: messageContent.type || 'demo-message-receive',
              fromUserId: messageContent.fromUserId,
              text: messageContent.text,
              data: messageContent.data,
              timestamp: messageContent.timestamp
            })
            callback(messageContent)
          } else if ('type' in parsedData) {
            // 兼容处理其他类型的消息
            console.log('✅ 收到其他业务消息，类型:', parsedData.type)
            console.log('📋 消息详情:', {
              type: parsedData.type,
              targetUserId: parsedData.targetUserId,
              fromUserId: parsedData.fromUserId,
              data: parsedData.data,
              timestamp: parsedData.timestamp
            })
            callback(parsedData)
          } else {
            console.warn('⚠️ 收到无type字段的消息:', parsedData)
            // 兼容处理：尝试从嵌套结构中提取
            if (parsedData.message && parsedData.message.type) {
              console.log('🔄 尝试兼容旧格式消息')
              callback(parsedData.message)
            } else {
              callback(parsedData)
            }
          }
        } else {
          console.warn('⚠️ 收到非对象类型消息:', parsedData)
          callback(parsedData)
        }
      } catch (error: any) {
        console.error('❌ 处理WebSocket消息错误:', error)
        console.error('❌ 错误详情:', {
          message: error.message,
          stack: error.stack,
          原始数据: data.value
        })
      }
    })
  }

  // 监听广播
  const onBroadcast = (type: string, callback: (data: any) => void) => {
    try {
      bpmChannel.onmessage = (event) => {
        if (event.data.type === type) {
          callback(event.data)
        }
      }
    } catch (error) {
      console.error('设置广播监听失败:', error)
    }
  }

  // 初始化连接
  const initConnection = async () => {
    if (!isInitialized.value) {
      console.log('初始化WebSocket连接')
      const connected = await ensureConnection()
      if (connected) {
        isInitialized.value = true
        startQueueProcessor()
      } else {
        console.warn('WebSocket初始化连接失败，将在需要时重试')
      }
    }
    return isInitialized.value
  }

  // 组件卸载时清理资源
  onUnmounted(() => {
    console.log('组件卸载，清理WebSocket资源')

    // 停止队列处理器
    stopQueueProcessor()

    // 标记通道已关闭
    isBpmChannelClosed = true

    // 安全关闭广播通道
    try {
      bpmChannel.close()
    } catch (error) {
      console.error('关闭广播通道失败:', error)
    }

    // 关闭WebSocket连接
    try {
      close()
    } catch (error) {
      console.error('关闭WebSocket连接失败:', error)
    }
  })

  // 初始化连接
  nextTick(() => {
    initConnection()
  })

  return {
    send,
    sendMessage,
    sendToUsers,
    sendBroadcast,
    onMessage,
    onBroadcast,
    status: readonly(status),
    ensureConnection,
    initConnection,
    wsStatus: readonly(status),
    diagnoseConnection,
    messageSendStats: readonly(messageSendStats)
  }
}
