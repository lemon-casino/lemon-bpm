import { localeProps, makeRequiredRule } from '@/components/FormCreate/src/utils'
import { generateFieldId } from '@/utils'
import { selectRule } from '@/components/FormCreate/src/config/selectRule'
import { SelectRuleOption } from '@/components/FormCreate/src/type'
import { cloneDeep } from 'lodash-es'


/**
 * 通用选择器规则 hook
 *
 * @param option 规则配置
 */
export const useSelectRule = (option: SelectRuleOption) => {
  const label = option.label
  const name = option.name
  const rules = cloneDeep(selectRule)
  return {
    icon: option.icon,
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
          filterable: true,
          clearable: true,
        }
      }
    },
    props(_, { t }) {
      if (!option.props) {
        option.props = []
      }
      // 深拷贝所有配置项，确保每个组件实例有独立的配置对象
      const requiredRule = cloneDeep(makeRequiredRule())
      const optionProps = cloneDeep(option.props)
      const rulesCopy = cloneDeep(rules)

      
      // 生成新的配置数组，确保所有配置项都是深拷贝的
      const allRules = [
        requiredRule,
        ...optionProps,
        ...rulesCopy,
      ]
      
      // 使用 localeProps 进行本地化处理
      return localeProps(t, name + '.props', allRules)
    }
  }
}
