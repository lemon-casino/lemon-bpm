import { ref, shallowRef } from 'vue'
import { IDomEditor } from '@wangeditor/editor'
import { AtUserInfo } from '@/types/atUser'

/**
 * @用户功能Hook
 * @param editor 编辑器实例
 */
export const useAtUser = (editor: IDomEditor | null) => {
  // 被@的用户列表
  const atUsers = ref<AtUserInfo[]>([])
  
  // 临时存储编辑器实例，便于异步操作
  const editorRef = shallowRef<IDomEditor | null>(editor)
  
  // 标记是否正在处理@用户操作
  const isProcessingMention = ref(false)
  
  // 更新编辑器实例
  const setEditor = (newEditor: IDomEditor | null) => {
    editorRef.value = newEditor
  }
  
  /**
   * 通用的插入@用户功能，支持多种编辑器API
   * @param editor 编辑器实例
   * @param user 用户信息
   * @returns 成功返回true，失败返回false
   */
  const insertMention = (editor: IDomEditor, user: { id: number | string, nickname: string, avatar?: string }) => {
    if (!editor) {
      console.error('insertMention失败: 编辑器实例为空')
      return false
    }
    
    console.log('尝试插入@用户，编辑器实例:', editor)
    isProcessingMention.value = true
    
    try {
      // 尝试直接替换HTML内容 - 这是最可靠的方法
      if (typeof editor.getHtml === 'function' && typeof editor.setHtml === 'function') {
        // 先恢复选区
        if (typeof editor.restoreSelection === 'function') {
          editor.restoreSelection()
          console.log('恢复选区成功')
        }
        
        // 获取当前HTML
        const currentHtml = editor.getHtml()
        console.log('当前HTML:', currentHtml)
        
        // 寻找最后一个@符号并替换
        let replacedHtml = currentHtml
        
        // 使用选区位置信息找到当前光标前的@符号
        try {
          // 获取选区详情
          if (typeof (editor as any).getSelectionDetail === 'function') {
            const selection = (editor as any).getSelectionDetail()
            console.log('当前选区详情:', selection)
            
            if (selection) {
              // 根据选区信息获取光标前的HTML内容
              let currentText = ''
              if (typeof editor.getText === 'function') {
                currentText = editor.getText()
                console.log('当前文本内容:', currentText)
              }
              
              // 使用更精确的方式定位光标位置前的@符号
              let cursorIndex = 0
              
              if (selection.anchor && selection.anchor.offset !== undefined) {
                cursorIndex = selection.anchor.offset
              }
              
              // 获取HTML字符串的光标位置
              const textBeforeCursor = currentText.substring(0, cursorIndex)
              const htmlLength = currentHtml.length
              
              // 转换HTML为纯文本估算位置比例
              const htmlText = currentHtml.replace(/<[^>]+>/g, '')
              const htmlTextLength = htmlText.length || 1
              
              // 估算光标在HTML中的大致位置
              const htmlCursorPos = Math.min(
                Math.floor((textBeforeCursor.length / htmlTextLength) * htmlLength),
                htmlLength - 1
              )
              
              // 从估算的光标位置向前查找@符号
              const searchRange = 20 // 搜索范围，避免搜索太远的@
              const startPos = Math.max(0, htmlCursorPos - searchRange)
              const searchText = currentHtml.substring(startPos, htmlCursorPos + 1)
              const atPos = searchText.lastIndexOf('@')
              
              if (atPos !== -1) {
                // 找到了@符号，计算其在原HTML中的实际位置
                const actualAtPos = startPos + atPos
                console.log('找到@符号位置:', actualAtPos)
                
                // 分割HTML并替换@符号
                const beforeAt = currentHtml.substring(0, actualAtPos)
                const afterAt = currentHtml.substring(actualAtPos + 1) // 跳过@本身
                
                // 创建带样式的@用户标记 - 改进样式使其更明显
                const mentionHtml = `<span class="mention user-mention" data-id="${user.id}" style="color: #409EFF; background-color: rgba(64, 158, 255, 0.1); padding: 0 3px; border-radius: 3px; font-weight: bold;">@${user.nickname}</span>&nbsp;`
                
                // 拼接替换后的HTML
                replacedHtml = beforeAt + mentionHtml + afterAt
                console.log('替换后HTML:', replacedHtml.substring(0, 100) + '...')
              } else {
                console.warn('未在光标附近找到@符号，尝试查找最后一个@')
                // 回退到查找最后一个@的方法
                const lastAtPos = currentHtml.lastIndexOf('@')
                if (lastAtPos !== -1) {
                  const beforeAt = currentHtml.substring(0, lastAtPos)
                  const afterAt = currentHtml.substring(lastAtPos + 1)
                  
                  // 创建带样式的@用户标记
                  const mentionHtml = `<span class="mention user-mention" data-id="${user.id}" style="color: #409EFF; background-color: rgba(64, 158, 255, 0.1); padding: 0 3px; border-radius: 3px; font-weight: bold;">@${user.nickname}</span>&nbsp;`
                  
                  replacedHtml = beforeAt + mentionHtml + afterAt
                }
              }
            }
          } else {
            console.warn('编辑器不支持getSelectionDetail方法，使用简单查找方式')
            // 回退到简单的方法
            const lastAtPos = currentHtml.lastIndexOf('@')
            if (lastAtPos !== -1) {
              const beforeAt = currentHtml.substring(0, lastAtPos)
              const afterAt = currentHtml.substring(lastAtPos + 1)
              
              // 创建带样式的@用户标记
              const mentionHtml = `<span class="mention user-mention" data-id="${user.id}" style="color: #409EFF; background-color: rgba(64, 158, 255, 0.1); padding: 0 3px; border-radius: 3px; font-weight: bold;">@${user.nickname}</span>&nbsp;`
              
              replacedHtml = beforeAt + mentionHtml + afterAt
            }
          }
        } catch (error) {
          console.error('定位@符号时出错:', error)
          // 出错时使用简单的方法
          const lastAtPos = currentHtml.lastIndexOf('@')
          if (lastAtPos !== -1) {
            const beforeAt = currentHtml.substring(0, lastAtPos)
            const afterAt = currentHtml.substring(lastAtPos + 1)
            
            // 创建带样式的@用户标记
            const mentionHtml = `<span class="mention user-mention" data-id="${user.id}" style="color: #409EFF; background-color: rgba(64, 158, 255, 0.1); padding: 0 3px; border-radius: 3px; font-weight: bold;">@${user.nickname}</span>&nbsp;`
            
            replacedHtml = beforeAt + mentionHtml + afterAt
          }
        }
        
        // 设置回HTML内容
        editor.setHtml(replacedHtml)
        console.log('使用HTML替换方式成功插入@用户')
        
        // 延迟一点时间后调用blur，防止编辑器立即获取焦点
        setTimeout(() => {
          // 尝试移除编辑器焦点，让用户手动点击重新获取焦点
          try {
            const editorElement = document.querySelector('.w-e-text-container');
            if (editorElement && document.activeElement === editorElement) {
              (document.activeElement as HTMLElement).blur();
            }
          } catch (e) {
            console.error('移除编辑器焦点失败:', e);
          }
          
          isProcessingMention.value = false
        }, 100);
        
        return true
      }
      
      // 如果不支持HTML替换，尝试其他方法
      // 先尝试恢复选区
      if (typeof editor.restoreSelection === 'function') {
        editor.restoreSelection()
        console.log('恢复选区成功')
        
        // 尝试插入节点
        if (typeof editor.insertNode === 'function') {
          // 尝试删除已有的@符号
          if (typeof editor.deleteBackward === 'function') {
            editor.deleteBackward('character')
            console.log('删除已有的@符号')
          }
          
          // 插入节点
          const mentionNode = {
            type: 'mention',
            value: `@${user.nickname}`,
            info: { id: user.id, avatar: user.avatar || '' },
            children: [{ text: '' }],
          }
          
          editor.insertNode(mentionNode)
          
          // 在节点后面插入空格
          if (typeof editor.insertText === 'function') {
            editor.insertText(' ')
          }
          
          console.log('使用insertNode方法成功插入@用户')
          return true
        } else if (typeof editor.dangerouslyInsertHtml === 'function') {
          // 尝试删除已有的@符号
          if (typeof editor.deleteBackward === 'function') {
            editor.deleteBackward('character')
            console.log('删除已有的@符号')
          }
          
          // 使用HTML插入
          const mentionHtml = `<span data-w-e-type="mention" data-w-e-is-void data-w-e-is-inline data-value="@${user.nickname}" data-info="${encodeURIComponent(JSON.stringify({id: user.id, avatar: user.avatar}))}" class="mention">@${user.nickname}</span>&nbsp;`
          
          editor.dangerouslyInsertHtml(mentionHtml)
          console.log('使用dangerouslyInsertHtml方法成功插入@用户')
          return true
        }
      }
      
      // 所有方法都失败，尝试最后的备用方案
      console.warn('所有可靠方法都失败，尝试最后的备用方案')
      
      // 尝试使用insertText
      if (typeof editor.insertText === 'function') {
        // 尝试删除已有的@符号
        if (typeof editor.deleteBackward === 'function') {
          editor.deleteBackward('character')
        }
        
        editor.insertText(`@${user.nickname} `)
        console.log('使用insertText方法插入@用户成功')
        return true
      }
      
      console.error('所有插入@用户的方法都失败')
      isProcessingMention.value = false
      return false
    } catch (error) {
      console.error('插入@用户失败:', error)
      isProcessingMention.value = false
      return false
    }
  }
  
  /**
   * 在编辑器中插入@用户标记
   * @param user 用户信息
   */
  const insertAtUser = (user: AtUserInfo) => {
    if (!editorRef.value) return false
    
    const editor = editorRef.value
    const result = insertMention(editor, user)
    
    // 添加到@用户列表中（如果不存在且插入成功）
    if (result && !atUsers.value.some(u => u.id === user.id)) {
      atUsers.value.push(user)
      console.log(`已将用户 ${user.nickname}(ID:${user.id}) 添加到@列表中`)
    }
    
    return result
  }
  
  /**
   * 批量插入多个@用户
   * @param users 用户列表
   */
  const insertAtUsers = (users: AtUserInfo[]) => {
    if (!users || users.length === 0) return false
    
    let success = true
    users.forEach(user => {
      const result = insertAtUser(user)
      if (!result) success = false
    })
    
    return success
  }
  
  /**
   * 清空所有@用户
   */
  const clearAtUsers = () => {
    atUsers.value = []
    console.log('已清空@用户列表')
  }
  
  /**
   * 从编辑器内容中解析@用户
   * @param content 编辑器内容
   */
  const parseAtUsersFromContent = (content: string): number[] => {
    // 如果没有用户被@或内容为空，直接返回空数组
    if (!content || atUsers.value.length === 0) {
      return []
    }
    
    console.log('准备从内容中解析@用户，当前@用户列表:', atUsers.value)
    
    try {
      // 首先尝试移除HTML标签以获取纯文本内容
      const plainText = content.replace(/<[^>]+>/g, ' ')
      
      // 正则匹配所有@xxx格式的文本（使用更宽松的匹配）
      const atMatches = plainText.match(/@([^\s@<>&;,."']+)/g) || []
      console.log('从内容中匹配到的@标记:', atMatches)
      
      if (atMatches.length === 0) {
        return []
      }
      
      // 将匹配到的@用户名与已知的@用户列表对比，找出匹配的用户ID
      const matchedUserIds = atUsers.value
        .filter(user => {
          // 检查用户昵称是否在@列表中
          const isMatched = atMatches.some(match => {
            // 移除@符号，并进行更宽松的比较
            const matchName = match.substring(1).toLowerCase()
            const userName = user.nickname.toLowerCase()
            return matchName === userName || userName.includes(matchName) || matchName.includes(userName)
          })
          
          if (isMatched) {
            console.log(`用户 ${user.nickname}(ID:${user.id}) 在内容中被@`)
          }
          
          return isMatched
        })
        .map(user => user.id)
      
      // 如果没有成功匹配，则直接返回所有已添加的@用户ID（兜底方案）
      if (matchedUserIds.length === 0 && atMatches.length > 0 && atUsers.value.length > 0) {
        console.log('无法精确匹配@用户，使用当前所有@用户列表')
        return atUsers.value.map(user => user.id)
      }
      
      console.log('最终匹配到的@用户ID:', matchedUserIds)
      return [...new Set(matchedUserIds)] // 去重
    } catch (error) {
      console.error('解析@用户出错:', error)
      // 出现错误时，返回所有@用户ID作为兜底策略
      return atUsers.value.map(user => user.id)
    }
  }
  
  return {
    atUsers,
    setEditor,
    insertAtUser,
    insertAtUsers,
    clearAtUsers,
    parseAtUsersFromContent,
    insertMention, // 导出通用函数
    isProcessingMention // 导出正在处理状态
  }
} 
