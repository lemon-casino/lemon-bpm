/**
 * @description mention plugin 修复版
 * @author wangfupeng (修改: AI)
 */

import { DomEditor, IDomEditor } from '@wangeditor/editor'

interface IExtendConfig {
  mentionConfig?: {
    showModal?: (editor: IDomEditor) => void
    hideModal?: (editor: IDomEditor) => void
  }
}

function getMentionConfig(editor: IDomEditor) {
  // 添加空值检查
  const config = editor.getConfig()
  console.log('获取编辑器配置:', config);
  
  const EXTEND_CONF = config.EXTEND_CONF || {}
  console.log('EXTEND_CONF:', EXTEND_CONF);
  
  const mentionConfig = (EXTEND_CONF as IExtendConfig).mentionConfig || {
    showModal: () => {
      console.log('使用默认的showModal函数');
    },
    hideModal: () => {
      console.log('使用默认的hideModal函数');
    }
  }
  console.log('mentionConfig:', mentionConfig);
  
  return mentionConfig
}

// 检查是否配置了MENU_CONF.mention.triggerHandler
function hasMentionTriggerHandler(editor: IDomEditor) {
  const config = editor.getConfig();
  return !!(config.MENU_CONF && 
           config.MENU_CONF.mention && 
           typeof config.MENU_CONF.mention.triggerHandler === 'function');
}

function withMention<T extends IDomEditor>(editor: T) {
  console.log('初始化修复版withMention插件');
  
  const { insertText, isInline, isVoid } = editor
  const newEditor = editor

  // 重写 insertText
  newEditor.insertText = t => {
    console.log('插入文本:', t);
    
    // 选过选中了 void 元素
    const elems = DomEditor.getSelectedElems(newEditor)
    const isSelectedVoidElem = elems.some(elem => newEditor.isVoid(elem))
    if (isSelectedVoidElem) {
      console.log('选中了void元素，使用默认insertText');
      insertText(t)
      return
    }

    // 检查是否有MENU_CONF.mention.triggerHandler配置
    const hasTriggerHandler = hasMentionTriggerHandler(newEditor);
    console.log('是否配置了triggerHandler:', hasTriggerHandler);

    // mention 相关配置
    const mentionConfig = getMentionConfig(newEditor)
    const showModal = mentionConfig.showModal
    const hideModal = mentionConfig.hideModal

    if (t === '@') {
      console.log('检测到@符号输入');
      
      // 如果配置了triggerHandler，则执行默认行为，让triggerHandler处理
      if (hasTriggerHandler) {
        console.log('使用MENU_CONF.mention.triggerHandler处理@符号');
        insertText(t)
        return
      }
      
      // 否则使用EXTEND_CONF.mentionConfig处理
      setTimeout(() => {
        // 展示 modal （异步，以便准确获取光标位置）
        console.log('准备调用showModal函数');
        if (showModal) {
          console.log('调用showModal函数');
          showModal(newEditor)
        } else {
          console.log('showModal函数不存在');
        }

        // 监听，隐藏 modal（异步，等待 modal 渲染后再监听）
        setTimeout(() => {
          function _hide() {
            console.log('触发隐藏modal事件');
            if (hideModal) {
              console.log('调用hideModal函数');
              hideModal(newEditor)
            } else {
              console.log('hideModal函数不存在');
            }
          }
          
          console.log('注册事件监听器');
          newEditor.once('fullScreen', _hide)
          newEditor.once('unFullScreen', _hide)
          newEditor.once('scroll', _hide)
          newEditor.once('modalOrPanelShow', _hide)
          newEditor.once('modalOrPanelHide', _hide)

          function hideOnChange() {
            console.log('编辑器内容变化');
            if (newEditor.selection != null) {
              console.log('编辑器有选区，隐藏modal');
              _hide()
              console.log('移除change事件监听器');
              newEditor.off('change', hideOnChange) // 及时解绑
            }
          }
          
          console.log('注册change事件监听器');
          newEditor.on('change', hideOnChange)
        })
      })
    }

    // 非 '@' 则执行默认行为
    console.log('执行默认insertText');
    insertText(t)
  }

  // 重写 isInline
  newEditor.isInline = elem => {
    const type = DomEditor.getNodeType(elem)
    if (type === 'mention') {
      return true
    }

    return isInline(elem)
  }

  // 重写 isVoid
  newEditor.isVoid = elem => {
    const type = DomEditor.getNodeType(elem)
    if (type === 'mention') {
      return true
    }

    return isVoid(elem)
  }

  return newEditor
}

export default withMention 