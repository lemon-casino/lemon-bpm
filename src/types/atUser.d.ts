/**
 * @用户功能相关的类型定义
 */

// @用户信息类型
export interface AtUserInfo {
  id: number; // 用户ID
  nickname: string; // 用户昵称
  avatar?: string; // 用户头像
}

// 编辑器中的@用户元素数据
export interface AtUserElement {
  type: 'at-user';
  userId: number;
  userName: string;
  value: string; // 显示的@用户文本，例如 "@张三"
}

// @用户通知请求参数
export interface AtUserNotifyParams {
  sourceUserId: number; // 发起@的用户ID
  sourceUserNickname?: string; // 发起@的用户昵称
  targetUserIds: number[]; // 被@的用户ID列表
  businessType: string; // 业务类型，如"comment"评论、"message"消息等
  businessId: string; // 业务ID，如评论ID、消息ID等
  businessContent: string; // 业务内容摘要，用于通知显示
  url?: string; // 可选的跳转链接
}

// @用户操作类型
export enum AtUserActionType {
  ADD = 'add', // 添加@用户
  REMOVE = 'remove', // 移除@用户
  CLEAR = 'clear' // 清空所有@用户
}

// @用户选择回调参数
export interface AtUserSelectCallbackParams {
  type: AtUserActionType;
  users: AtUserInfo[]; // 被选中的用户信息
} 