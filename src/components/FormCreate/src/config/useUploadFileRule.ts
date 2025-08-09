import { generateFieldId } from '@/utils'
import { localeProps, makeRequiredRule } from '@/components/FormCreate/src/utils'

export const useUploadFileRule = () => {
  const label = '文件上传'
  const name = 'UploadFile'
  return {
    icon: 'icon-upload',
    label,
    name,
    rule() {
      return {
        type: name,
        field: generateFieldId(),
        title: label,
        info: '',
        $required: false,
        props: {
          fileType: ['*'],
          fileSize: 500
        }
      }
    },
    props(_, { t }) {
      return localeProps(t, name + '.props', [
        makeRequiredRule(),
        {
          type: 'select',
          field: 'fileType',
          title: '文件类型',
          value: ['*', ],
          options: [
            { label: '所有格式', value: '*' },
            { label: 'Word文档', value: 'doc' },
            { label: 'Word文档(新版)', value: 'docx' },
            { label: 'Excel表格', value: 'xls' },
            { label: 'Excel表格(新版)', value: 'xlsx' },
            { label: 'PowerPoint演示', value: 'ppt' },
            { label: 'PowerPoint演示(新版)', value: 'pptx' },
            { label: 'PDF文档', value: 'pdf' },
            { label: '文本文档', value: 'txt' },
            { label: '富文本格式', value: 'rtf' },
            
          ],
          props: {
            multiple: true
          }
        },
        {
          type: 'switch',
          field: 'autoUpload',
          title: '是否在选取文件后立即进行上传',
          value: true
        },
        {
          type: 'switch',
          field: 'drag',
          title: '拖拽上传',
          value: false
        },
        {
          type: 'switch',
          field: 'isShowTip',
          title: '是否显示提示',
          value: true
        },
        {
          type: 'inputNumber',
          field: 'fileSize',
          title: '大小限制(MB)',
          value: 500,
          props: { min: 0 }
        },
        {
          type: 'inputNumber',
          field: 'limit',
          title: '数量限制',
          value: 5,
          props: { min: 0 }
        },
        {
          type: 'switch',
          field: 'disabled',
          title: '是否禁用',
          value: false
        }
      ])
    }
  }
}
