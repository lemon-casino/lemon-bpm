/**
 * @description mention module 修复版
 * @author AI
 */

import { IDomEditor } from '@wangeditor/editor'
import withMention from './mentionPlugin'

// 定义模块
function mentionModule() {
  console.log('初始化修复版mentionModule');
  
  return {
    editorPlugin: withMention,

    // 渲染 mention
    renderElems: [
      {
        type: 'mention',
        renderElem: (elem: any, children: any, editor: IDomEditor) => {
          // 使用简单的对象结构代替snabbdom的h函数
          // 这里我们返回一个简单的对象，wangEditor会处理它
          const value = elem.value || ''
          console.log('渲染mention元素:', value);
          
          return {
            type: 'span',
            attrs: {
              contentEditable: false,
              style: {
                marginLeft: '3px',
                marginRight: '3px',
                backgroundColor: 'var(--w-e-textarea-slight-bg-color)',
                borderRadius: '3px',
                padding: '0 3px',
              }
            },
            children: [`@${value}`]
          }
        },
      },
    ],

    // mention 转换为 html
    elemsToHtml: [
      {
        type: 'mention',
        elemToHtml: (elem: any, childrenHtml: string) => {
          const { value = '', info = {} } = elem
          const infoStr = encodeURIComponent(JSON.stringify(info))
          console.log('转换mention为HTML:', value);

          return `<span data-w-e-type="mention" data-w-e-is-void data-w-e-is-inline data-value="${value}" data-info="${infoStr}">@${value}</span>`
        },
      },
    ],

    // html 转换为 mention
    parseElemsHtml: [
      {
        selector: 'span[data-w-e-type="mention"]',
        parseElemHtml: (domElem: HTMLElement) => {
          const value = domElem.getAttribute('data-value') || ''
          const infoStr = decodeURIComponent(domElem.getAttribute('data-info') || '')
          console.log('解析HTML为mention:', value);
          
          let info
          try {
            info = JSON.parse(infoStr)
          } catch (ex) {
            info = infoStr
          }

          return {
            type: 'mention',
            value,
            info,
            children: [{ text: '' }], // void node 必须有 children
          }
        },
      },
    ],
  }
}

export default mentionModule 