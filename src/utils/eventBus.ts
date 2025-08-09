/**
 * 全局事件总线，用于组件间通信
 */
import mitt from 'mitt'

// 创建一个全局事件总线实例
export const emitter = mitt()

// 上传状态事件名
export const UPLOAD_STATUS_EVENT = 'upload-status-change'
// 草稿箱事件名
export const DRAFT_BOX_EVENT = 'draft-box-event'

export const enum EventBusKey {
  UserListUpdate = 'user-list-update', // 用户列表更新事件
  DraftSaved = 'draft-saved', // 草稿保存事件
  DraftLoaded = 'draft-loaded', // 草稿加载事件
  DraftDeleted = 'draft-deleted', // 草稿删除事件
} 