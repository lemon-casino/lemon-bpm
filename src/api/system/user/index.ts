import request from '@/config/axios'
import { getCachedUserList, setCachedUserList } from '@/utils/userCache'

export interface UserVO {
  id: number
  username: string
  nickname: string
  deptId: number
  postIds: string[]
  email: string
  mobile: string
  sex: number
  avatar: string
  loginIp: string
  status: number
  remark: string
  loginDate: Date
  createTime: Date
}

// 查询用户管理列表
export const getUserPage = (params: PageParam) => {
  return request.get({ url: '/system/user/page', params })
}

// 查询所有用户列表
export const getAllUser = () => {
  return request.get({ url: '/system/user/all' })
}

// 查询用户详情
export const getUser = (id: number) => {
  return request.get({ url: '/system/user/get?id=' + id })
}

// 新增用户
export const createUser = (data: UserVO) => {
  return request.post({ url: '/system/user/create', data })
}

// 修改用户
export const updateUser = (data: UserVO) => {
  return request.put({ url: '/system/user/update', data })
}

// 删除用户
export const deleteUser = (id: number) => {
  return request.delete({ url: '/system/user/delete?id=' + id })
}

// 导出用户
export const exportUser = (params) => {
  return request.download({ url: '/system/user/export', params })
}

// 下载用户导入模板
export const importUserTemplate = () => {
  return request.download({ url: '/system/user/get-import-template' })
}

// 用户密码重置
export const resetUserPwd = (id: number, password: string) => {
  const data = {
    id,
    password
  }
  return request.put({ url: '/system/user/update-password', data: data })
}

// 用户状态修改
export const updateUserStatus = (id: number, status: number) => {
  const data = {
    id,
    status
  }
  return request.put({ url: '/system/user/update-status', data: data })
}

// 获取用户精简信息列表
export const getSimpleUserList = async (): Promise<UserVO[]> => {
  // 先检查缓存中是否有数据
  const cachedData = _getCachedUserList()
  if (cachedData) {
    return cachedData
  }
  
  // 如果没有缓存数据，则发起请求
  try {
    const data = await request.get<UserVO[]>({ url: '/system/user/simple-list' })
    // 将获取到的数据存入缓存
    _setCachedUserList(data)
    return data
  } catch (error) {
    // 如果请求失败（例如404错误），返回空数组避免前端报错
    console.error('获取用户列表失败:', error)
    return []
  }
}

// 用户列表缓存
let _userListCache: UserVO[] | null = null
let _userListCacheTime: number = 0
const USER_CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存有效期

// 获取缓存的用户列表
const _getCachedUserList = (): UserVO[] | null => {
  if (!_userListCache) return null
  
  const now = Date.now()
  if (now - _userListCacheTime > USER_CACHE_DURATION) {
    // 缓存过期
    _userListCache = null
    return null
  }
  
  return _userListCache
}

// 设置用户列表缓存
const _setCachedUserList = (data: UserVO[]) => {
  _userListCache = data
  _userListCacheTime = Date.now()
}
