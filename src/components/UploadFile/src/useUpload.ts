import * as FileApi from '@/api/infra/file'
import CryptoJS from 'crypto-js'
import { UploadRawFile, UploadRequestOptions } from 'element-plus/es/components/upload/src/upload'
import axios from 'axios'
import { getAccessToken } from '@/utils/auth'
import { config } from '@/config/axios/config'
import { getTokenExpiresTime, isTokenExpired, refreshTokenProactively } from '@/utils/tokenManager'
import { useMessage } from '@/hooks/web/useMessage'

/**
 * 文件上传超时时间设置（毫秒）
 * 默认设置为10分钟，可处理大部分大文件上传场景
 */
const UPLOAD_TIMEOUT = 600000 // 10分钟

/**
 * 获得上传 URL
 */
export const getUploadUrl = (): string => {
  // 使用config中的base_url，以便正确处理NGINX_BASE_URL前缀
  return config.base_url + '/infra/file/upload'
}

export const useUpload = () => {
  // 后端上传地址
  const uploadUrl = getUploadUrl()
  // 是否使用前端直连上传
  const isClientUpload = UPLOAD_TYPE.CLIENT === import.meta.env.VITE_UPLOAD_TYPE
  
  // 初始化上传，检查认证信息
  const initializeUpload = async () => {
    const token = getAccessToken()
    if (!token) {
      console.error('初始化上传检查：未找到访问令牌，上传可能会失败')
      return false
    }
    
    // 检查令牌是否即将过期
    const expiresTime = getTokenExpiresTime()
    if (isTokenExpired(expiresTime)) {
      console.warn('初始化上传检查：访问令牌即将过期，尝试刷新')
      // 尝试刷新令牌
      const refreshSuccess = await refreshTokenProactively()
      if (!refreshSuccess) {
        console.error('令牌刷新失败，上传可能会失败')
      } else {
        console.log('令牌刷新成功，可以继续上传')
      }
    }
    
    console.log('上传初始化 - 认证检查通过，令牌前10位:', token.substring(0, 10) + '...')
    return true
  }
  
  // 在组件初始化时检查认证状态
  initializeUpload()
  
  // 重写ElUpload上传方法
  const httpRequest = async (options: UploadRequestOptions) => {
    // 再次检查认证信息并主动刷新令牌
    try {
      await initializeUpload()
    } catch (e) {
      console.warn('上传开始前认证检查失败，尝试继续上传', e)
    }
    
    // 模式一：前端上传
    if (isClientUpload) {
      // 验证认证信息
      const token = getAccessToken()
      if (!token) {
        console.error('获取预签名URL前检查：未找到访问令牌')
        return Promise.reject(new Error('认证失败: 未找到访问令牌，无法获取上传地址'))
      }
      
      // 1.1 生成文件名称
      const fileName = await generateFileName(options.file)
      // 1.2 获取文件预签名地址
      const presignedInfo = await FileApi.getFilePresignedUrl(fileName)
      // 1.3 上传文件（不能使用 ElUpload 的 ajaxUpload 方法的原因：其使用的是 FormData 上传，Minio 不支持）
      return axios
        .put(presignedInfo.uploadUrl, options.file, {
          headers: {
            'Content-Type': options.file.type
          },
          // 使用更长的超时时间，避免大文件上传超时
          timeout: UPLOAD_TIMEOUT,
          // 添加上传进度处理
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              // 计算上传百分比
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
              console.log(`Minio上传进度: ${percentCompleted}%`)
              
              // 这里可以通过事件总线或其他方式通知组件更新进度条
              // 我们暂时不实现该功能，但为未来扩展预留接口
            }
          }
        })
        .then(() => {
          // 1.4. 记录文件信息到后端（异步）
          createFile(presignedInfo, fileName, options.file)
          // 通知成功，数据格式保持与后端上传的返回结果一致
          return { data: presignedInfo.url }
        })
    } else {
      // 模式二：后端上传
      // 重写 el-upload httpRequest 文件上传成功会走成功的钩子，失败走失败的钩子
      return new Promise((resolve, reject) => {
        // 创建专用的上传请求，使用较长的超时时间
        uploadFileWithLongTimeout({ file: options.file })
          .then((response) => {
            // request.upload 返回的是服务器响应的 data 部分，即 { code: 0, data: "url", msg: "" }
            const res = response
            if (res.code === 0) {
              resolve(res)
            } else {
              console.error('上传失败，错误码:', res.code, '错误信息:', res.msg || '未知错误')
              reject(res)
            }
          })
          .catch((error) => {
            console.error('上传请求异常:', error.message || error)
            // 如果是401错误，提供更明确的信息
            if (error.response && error.response.status === 401) {
              console.error('认证失败(401)，可能是token无效或已过期')
              
              // 尝试获取token进行诊断
              const token = getAccessToken()
              if (!token) {
                console.error('认证失败原因: 未找到访问令牌')
              } else {
                console.error('当前令牌前10位:', token.substring(0, 10), '...')
              }
            }
            reject(error)
          })
      })
    }
  }

  return {
    uploadUrl,
    httpRequest
  }
}

/**
 * 创建文件信息
 * @param vo 文件预签名信息
 * @param name 文件名称
 * @param file 文件
 */
function createFile(vo: FileApi.FilePresignedUrlRespVO, name: string, file: UploadRawFile) {
  const fileVo = {
    configId: vo.configId,
    url: vo.url,
    path: name,
    name: file.name,
    type: file.type,
    size: file.size
  }
  FileApi.createFile(fileVo)
  return fileVo
}

/**
 * 生成文件名称（使用算法SHA256）
 * @param file 要上传的文件
 */
async function generateFileName(file: UploadRawFile) {
  // 读取文件内容
  const data = await file.arrayBuffer()
  const wordArray = CryptoJS.lib.WordArray.create(data)
  // 计算SHA256
  const sha256 = CryptoJS.SHA256(wordArray).toString()
  // 拼接后缀
  const ext = file.name.substring(file.name.lastIndexOf('.'))
  return `${sha256}${ext}`
}

/**
 * 使用较长超时时间的文件上传请求
 * @param data 上传数据
 */
function uploadFileWithLongTimeout(data: any) {
  // 使用 FileApi.updateFile 方法进行文件上传
  // 该方法已经包含了认证信息和超时设置
  return FileApi.updateFile(data)
}

/**
 * 上传类型
 */
enum UPLOAD_TYPE {
  // 客户端直接上传（只支持S3服务）
  CLIENT = 'client',
  // 客户端发送到后端上传
  SERVER = 'server'
}

/**
 * 统一处理上传错误
 * @param error 错误对象
 * @param onRetry 重试回调函数
 * @returns 是否已处理成功
 */
export const handleUploadError = async (error: any, onRetry: () => void): Promise<boolean> => {
  const message = useMessage()
  // 获取具体错误信息
  let errorMsg = '上传失败，请重试！'
  let isAuthError = false

  if (error && error.message) {
    // 处理超时错误
    if (error.message.includes('timeout')) {
      errorMsg = '文件上传超时，请检查网络或尝试分批上传较小的文件！'
    } else if (error.message.includes('认证失败') || error.message.includes('未找到访问令牌')) {
      errorMsg = '登录凭证已过期，正在尝试刷新...'
      isAuthError = true
    } else if (error.response && error.response.status === 401) {
      errorMsg = '登录凭证已过期，正在尝试刷新...'
      isAuthError = true
    } else if (error.response && error.response.data && error.response.data.msg) {
      // 处理服务器返回的具体错误信息
      errorMsg = error.response.data.msg
    }
  } else if (error && error.code === 401) {
    errorMsg = '登录凭证已过期，正在尝试刷新...'
    isAuthError = true
  }

  // 如果是认证错误，尝试刷新令牌并重试
  if (isAuthError) {
    console.log('检测到认证错误，尝试刷新令牌')
    const refreshSuccess = await refreshTokenProactively()
    if (refreshSuccess) {
      // 令牌刷新成功，重试上传
      console.log('令牌已刷新，重试上传')
      onRetry()
      return true // 已处理
    } else {
      errorMsg = '登录凭证已过期，请刷新页面后重新登录再尝试上传！'
    }
  }

  // 显示错误消息
  message.error(errorMsg)
  return false // 未处理成功
}
