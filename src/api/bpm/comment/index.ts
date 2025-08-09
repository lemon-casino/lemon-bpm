import request from '@/config/axios'

/**
 * BPM流程评论数据对象
 */
export interface CommentVO {
  id: number               // 评论ID
  processInstanceId: string // 流程实例ID
  userId: number           // 评论用户ID
  userNickname: string     // 评论用户昵称
  userAvatar: string       // 评论用户头像
  content: string          // 评论内容（支持Markdown格式）
  picUrls: string[]        // 图片URL列表
  createTime: Date         // 创建时间
}

/**
 * 评论创建参数
 */
export interface CommentCreateDTO {
  processInstanceId: string // 流程实例ID
  content: string           // 评论内容（支持Markdown格式）
  picUrls?: string[]        // 图片URL列表
  atUserIds?: number[]      // @用户ID列表
  processName?: string      // 流程名称
}

/**
 * 获取流程实例评论列表
 * @param processInstanceId 流程实例ID
 */
export const getCommentList = async (processInstanceId: string) => {
  return await request.get({ 
    url: `/bpm/process-instance/comment/list?processInstanceId=${processInstanceId}` 
  })
}

/**
 * 创建流程实例评论
 * @param data 评论数据
 */
export const createComment = async (data: CommentCreateDTO) => {
  console.log('评论创建请求数据:', data)
  try {
    const res = await request.post({ 
      url: '/bpm/process-instance/comment/create', 
      data 
    })
    console.log('评论创建响应:', res)
    return res
  } catch (error) {
    console.error('评论创建请求错误:', error)
    throw error
  }
} 