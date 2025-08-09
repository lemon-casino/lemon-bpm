import type { UserVO } from '@/api/system/user'
import { emitter } from '@/utils/eventBus'
import { EventBusKey } from '@/utils/eventBus'

/**
 * 用户列表缓存
 * 用于减少重复请求getSimpleUserList的次数
 */

// 缓存数据
let userListCache: UserVO[] | null = null

// 缓存时间戳
let cacheTimestamp: number = 0

// 缓存过期时间（毫秒）- 默认5分钟
const CACHE_EXPIRATION = 5 * 60 * 1000

/**
 * 获取缓存的用户列表
 * @returns 缓存的用户列表，如果没有缓存或缓存过期则返回null
 */
export const getCachedUserList = (): UserVO[] | null => {
  // 如果没有缓存或缓存已过期，返回null
  if (!userListCache || isExpired()) {
    return null
  }
  return userListCache
}

/**
 * 设置用户列表缓存
 * @param userList 用户列表数据
 */
export const setCachedUserList = (userList: UserVO[]): void => {
  userListCache = userList
  cacheTimestamp = Date.now()
}

/**
 * 清除用户列表缓存
 */
export const clearUserListCache = (): void => {
  userListCache = null
  cacheTimestamp = 0
}

/**
 * 检查缓存是否过期
 * @returns 是否过期
 */
export const isExpired = (): boolean => {
  return Date.now() - cacheTimestamp > CACHE_EXPIRATION
}

// 监听用户列表更新事件，清除缓存
emitter.on(EventBusKey.UserListUpdate, () => {
  clearUserListCache()
}) 