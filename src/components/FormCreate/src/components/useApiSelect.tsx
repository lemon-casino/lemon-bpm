import request from '@/config/axios'
import { isEmpty } from '@/utils/is'
import { ApiSelectProps } from '@/components/FormCreate/src/type'
import { jsonParse } from '@/utils'
import { Fragment } from 'vue'

// 添加本地存储工具
const CACHE_KEY_PREFIX = 'api_select_label_cache_'

// 缓存持久化工具
const labelCache = {
  // 获取缓存的标签
  getLabel(key: string, value: string | number): string | null {
    try {
      if (!key || !value) {
        console.log('getLabel: key或value为空，无法获取缓存')
        return null
      }

      // 规范化缓存键，避免特殊字符导致的问题
      const safeKey = this._normalizeCacheKey(key)
      const safeValue = typeof value === 'object' ? JSON.stringify(value) : String(value)

      const cacheKey = `${CACHE_KEY_PREFIX}${safeKey}_${safeValue}`
      const cachedLabel = localStorage.getItem(cacheKey)

      console.log(`getLabel: 尝试获取缓存 [${cacheKey}]，结果: ${cachedLabel || '未找到'}`)
      return cachedLabel
    } catch (e) {
      console.error('读取标签缓存失败:', e)
      return null
    }
  },

  // 保存标签到缓存
  saveLabel(key: string, value: string | number, label: string): void {
    try {
      if (!key || !value) {
        console.log('saveLabel: key或value为空，无法保存缓存')
        return
      }

      if (!label) {
        console.log('saveLabel: label为空，不保存缓存')
        return
      }

      if (isLikelyId(label)) {
        console.log(`saveLabel: label [${label}] 疑似ID，不保存缓存`)
        return
      }

      // 规范化缓存键，避免特殊字符导致的问题
      const safeKey = this._normalizeCacheKey(key)
      const safeValue = typeof value === 'object' ? JSON.stringify(value) : String(value)

      const cacheKey = `${CACHE_KEY_PREFIX}${safeKey}_${safeValue}`
      // console.log(`saveLabel: 保存缓存 [${cacheKey}] = [${label}]`)

      // 设置缓存，并添加过期时间（7天）
      localStorage.setItem(cacheKey, label)

      // 记录缓存时间，用于过期判断
      const timestamp = Date.now()
      localStorage.setItem(`${cacheKey}_time`, String(timestamp))
    } catch (e) {
      console.error('保存标签缓存失败:', e)
    }
  },

  // 批量保存标签
  saveLabels(key: string, items: { value: string | number; label: string }[]): void {
    if (!key || !items || items.length === 0) {
      console.log('saveLabels: key为空或items为空，无法批量保存缓存')
      return
    }

    console.log(`saveLabels: 批量保存 ${items.length} 个标签到缓存`)

    items.forEach((item) => {
      if (item.value && item.label && !isLikelyId(item.label)) {
        this.saveLabel(key, item.value, item.label)
      }
    })
  },

  // 清理过期缓存（超过7天的缓存）
  cleanExpiredCache(): void {
    try {
      console.log('cleanExpiredCache: 开始清理过期缓存')
      const now = Date.now()
      const expireTime = 7 * 24 * 60 * 60 * 1000 // 7天

      // 遍历localStorage中的所有项
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)

        // 检查是否是我们的缓存项
        if (key && key.startsWith(CACHE_KEY_PREFIX) && key.endsWith('_time')) {
          const timestamp = Number(localStorage.getItem(key))

          // 检查是否过期
          if (now - timestamp > expireTime) {
            // 获取原始缓存键（去掉_time后缀）
            const originalKey = key.substring(0, key.length - 5)

            // 删除缓存和时间戳
            localStorage.removeItem(originalKey)
            localStorage.removeItem(key)

            console.log(`cleanExpiredCache: 删除过期缓存 [${originalKey}]`)
          }
        }
      }

      console.log('cleanExpiredCache: 过期缓存清理完成')
    } catch (e) {
      console.error('清理过期缓存失败:', e)
    }
  },

  // 规范化缓存键，避免特殊字符导致的问题
  _normalizeCacheKey(key: string): string {
    // 移除URL中的查询参数，只保留路径部分
    const urlPath = key.split('?')[0]

    // 移除可能导致问题的特殊字符
    return urlPath.replace(/[^a-zA-Z0-9_\-]/g, '_')
  }
}
// 将labelCache暴露到全局作用域，使TableForm组件能够访问到它
if (typeof window !== 'undefined') {
  ;(window as any).labelCache = labelCache

  // 每天只清理一次过期缓存
  const lastCleanTime = localStorage.getItem('api_select_cache_last_clean')
  const now = Date.now()

  if (!lastCleanTime || now - Number(lastCleanTime) > 24 * 60 * 60 * 1000) {
    // 异步清理缓存，不阻塞主流程
    setTimeout(() => {
      labelCache.cleanExpiredCache()
      localStorage.setItem('api_select_cache_last_clean', String(now))
    }, 5000) // 延迟5秒执行，避免影响页面加载
  }
}
// 请求限制工具，防止频繁请求
const requestLimiter = {
  failedRequests: new Map<string, { count: number; lastAttempt: number }>(),

  // 记录请求失败
  recordFailure(key: string): void {
    const now = Date.now()
    const record = this.failedRequests.get(key) || { count: 0, lastAttempt: 0 }
    record.count += 1
    record.lastAttempt = now
    this.failedRequests.set(key, record)
  },

  // 检查是否应该限制请求
  shouldLimit(key: string): boolean {
    const record = this.failedRequests.get(key)
    if (!record) return false

    const now = Date.now()
    const timeSinceLastAttempt = now - record.lastAttempt

    // 根据失败次数增加等待时间
    let waitTime = 0
    if (record.count <= 2) {
      waitTime = 5000 // 5秒
    } else if (record.count <= 5) {
      waitTime = 30000 // 30秒
    } else if (record.count <= 10) {
      waitTime = 300000 // 5分钟
    } else {
      waitTime = 3600000 // 1小时
    }

    return timeSinceLastAttempt < waitTime
  },

  // 重置失败记录
  resetFailure(key: string): void {
    this.failedRequests.delete(key)
  }
}

// 检测字符串是否可能是ID而不是名称
function isLikelyId(text: string | null | undefined): boolean {
  // console.log('isLikelyId检查文本:', text)
  if (!text) {
    // console.log('isLikelyId: 文本为空，判断为ID')
    return true
  }

  // 空字符串或仅包含空白字符
  if (!text.trim()) {
    // console.log('isLikelyId: 文本仅包含空白字符，判断为ID')
    return true
  }

  // 检查是否包含中文字符，如果包含中文，则不是ID
  if (/[\u4e00-\u9fa5]/.test(text)) {
    // console.log('isLikelyId: 文本包含中文字符，判断为非ID')
    return false
  }

  // 纯数字 - 但允许短数字作为名称的一部分（如"用户1"中的"1"）
  // 长度超过5的纯数字很可能是ID
  if (/^\d+$/.test(text) && text.length > 5) {
    console.log('isLikelyId: 文本是长数字，判断为ID')
    return true
  }

  // 类UUID
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text)) {
    console.log('isLikelyId: 文本是UUID格式，判断为ID')
    return true
  }

  // 其他明显不是名称的格式 (如仅包含特殊字符等)
  if (/^[_\-.\/:@]+$/.test(text)) {
    console.log('isLikelyId: 文本仅包含特殊字符，判断为ID')
    return true
  }

  // 检查是否只包含数字和特殊字符（没有字母）
  const hasLetters = /[a-zA-Z\u4e00-\u9fa5]/.test(text) // 包含英文字母或中文
  const result = !hasLetters && /^[\d_\-.\/:@]+$/.test(text)
  console.log(`isLikelyId: 文本包含字母或中文: ${hasLetters}, 最终判断结果: ${result ? 'ID' : '非ID'}`)
  return result
}

export const useApiSelect = (option: ApiSelectProps) => {
  return defineComponent({
    name: option.name,
    props: {
      // 选项标签
      labelField: {
        type: String,
        default: () => option.labelField ?? 'label'
      },
      // 选项的值
      valueField: {
        type: String,
        default: () => option.valueField ?? 'value'
      },
      // api 接口
      url: {
        type: String,
        default: () => option.url ?? ''
      },
      // 请求类型
      method: {
        type: String,
        default: 'GET'
      },
      // 选项解析函数
      parseFunc: {
        type: String,
        default: ''
      },
      // 请求参数
      data: {
        type: String,
        default: ''
      },
      // 选择器类型，下拉框 select、多选框 checkbox、单选框 radio
      selectType: {
        type: String,
        default: 'select'
      },
      // 是否多选
      multiple: {
        type: Boolean,
        default: false
      },
      // 是否远程搜索
      remote: {
        type: Boolean,
        default: false
      },
      // 远程搜索时携带的参数
      remoteField: {
        type: String,
        default: 'label'
      },
      // 联动字段映射
      linkField: {
        type: String,
        default: ''
      },
      // form-create 注入对象
      formCreateInject: {
        type: Object,
        default: null
      }
    },
    setup(props) {
      const attrs = useAttrs()
      const options = ref<any[]>([]) // 下拉数据
      const loading = ref(false) // 是否正在从远程获取数据
      const queryParam = ref<any>() // 当前输入的值
      const modelValueLabels = ref<Record<string, string>>({}) // 用于存储modelValue对应的label
      const isDataLoaded = ref(false) // 标记数据是否已加载
      const tempOptions = ref<any[]>([]) // 临时选项，用于在数据加载前显示当前值
      const autoReloadTimer = ref<number | null>(null) // 自动重新加载定时器
      const requestInProgress = ref(false) // 请求进行中标记，防止并发请求

      // 获取选项数据的函数
      const getOptions = async () => {
        // 如果URL为空或者已有请求在进行中，直接返回
        if (isEmpty(props.url) || requestInProgress.value) {
          return
        }

        // 检查是否应该限制请求
        const requestKey = `${props.url}_all`
        if (requestLimiter.shouldLimit(requestKey)) {
          console.log(`接口[${props.url}]请求已被限制，等待一段时间后再试`)
          return
        }

        requestInProgress.value = true
        loading.value = true

        try {
          let responseData
          switch (props.method) {
            case 'GET':
              let url: string = props.url
              if (props.remote) {
                if (queryParam.value != undefined) {
                  if (url.includes('?')) {
                    url = `${url}&${props.remoteField}=${queryParam.value}`
                  } else {
                    url = `${url}?${props.remoteField}=${queryParam.value}`
                  }
                }
              }
              responseData = await request.get({ url: url })
              break
            case 'POST':
              const data: any = jsonParse(props.data)
              if (props.remote) {
                data[props.remoteField] = queryParam.value
              }
              responseData = await request.post({ url: props.url, data: data })
              break
          }

          parseOptions(responseData)

          // 将解析后的选项保存到本地缓存
          if (options.value && options.value.length > 0) {
            labelCache.saveLabels(props.url, options.value)
          }

          updateModelValueLabels()
          isDataLoaded.value = true

          // 重置请求失败计数
          requestLimiter.resetFailure(requestKey)
        } catch (error) {
          console.error(`获取选项数据失败:`, error)
          requestLimiter.recordFailure(requestKey)
        } finally {
          requestInProgress.value = false
          loading.value = false
        }
      }

      // 根据ID直接获取用户信息，优化单选时的显示
      const fetchUserInfoById = async (id: any) => {
        // 确保id是string或number类型
        if (id === undefined || id === null || id === '') {
          console.log('fetchUserInfoById: 无效的ID值')
          return false
        }

        // 将id转换为string
        const safeId = typeof id === 'object' ? JSON.stringify(id) : String(id)

        // 先检查缓存中是否有对应的标签
        const cachedLabel = labelCache.getLabel(props.url, safeId)
        if (cachedLabel && !isLikelyId(cachedLabel)) {
          // 如果缓存中有有效的标签，直接使用
          console.log(`fetchUserInfoById: 使用缓存标签 [${cachedLabel}] 用于ID [${safeId}]`)
          modelValueLabels.value[safeId] = cachedLabel
          createTempOption()
          return true
        }

        if (isEmpty(props.url)) {
          console.log('fetchUserInfoById: URL为空，无法获取用户信息')
          return false
        }

        if (requestInProgress.value) {
          console.log('fetchUserInfoById: 已有请求进行中，稍后再试')
          return false
        }

        // 检查是否应该限制请求
        const requestKey = `${props.url}_${safeId}`
        if (requestLimiter.shouldLimit(requestKey)) {
          console.log(`fetchUserInfoById: 用户ID[${safeId}]的请求已被限制，等待一段时间后再试`)
          return false
        }

        console.log(`fetchUserInfoById: 开始获取ID为[${safeId}]的用户信息`)
        requestInProgress.value = true
        loading.value = true

        try {
          // 构建获取单个用户信息的请求URL/参数
          let url: string = props.url
          let data: any = {}
          let result: any = null

          // 添加ID过滤参数，通常后端API支持按ID过滤
          if (props.method === 'GET') {
            // 使用?id=xxx的方式过滤单个用户
            // 检查URL是否已包含查询参数
            const separator = url.includes('?') ? '&' : '?'
            url = `${url}${separator}${props.valueField}=${encodeURIComponent(safeId)}`
            console.log(`fetchUserInfoById: 发送GET请求 URL=[${url}]`)
            result = await request.get({ url: url })
          } else {
            // POST方式，在data中添加id过滤
            data = jsonParse(props.data) || {}
            data[props.valueField] = safeId
            console.log(`fetchUserInfoById: 发送POST请求 URL=[${props.url}], 数据=`, data)
            result = await request.post({ url: props.url, data: data })
          }

          // 解析返回结果，查找匹配的用户信息
          if (result) {
            console.log(`fetchUserInfoById: 收到响应数据:`, result)

            // 检查是否有data字段，这是标准API返回格式
            if (result.data !== undefined) {
              result = result.data
            } else if (result.records !== undefined) {
              // 某些API可能使用records作为数据字段
              result = result.records
            } else if (result.items !== undefined) {
              // 某些API可能使用items作为数据字段
              result = result.items
            }

            let userInfo = null

            // 如果是数组，查找匹配ID的项
            if (Array.isArray(result)) {
              console.log(`fetchUserInfoById: 在数组中查找ID=[${safeId}]的项`)
              userInfo = result.find((item) => String(item[props.valueField]) === safeId)
            }
            // 如果有list属性且为数组，在list中查找
            else if (result.list && Array.isArray(result.list)) {
              console.log(`fetchUserInfoById: 在result.list中查找ID=[${safeId}]的项`)
              userInfo = result.list.find((item) => String(item[props.valueField]) === safeId)
            }
            // 如果有rows属性且为数组，在rows中查找（某些API使用rows）
            else if (result.rows && Array.isArray(result.rows)) {
              console.log(`fetchUserInfoById: 在result.rows中查找ID=[${safeId}]的项`)
              userInfo = result.rows.find((item) => String(item[props.valueField]) === safeId)
            }
            // 如果只返回单个对象，直接使用
            else if (
              typeof result === 'object' &&
              result !== null &&
              result[props.valueField] !== undefined &&
              String(result[props.valueField]) === safeId
            ) {
              console.log(`fetchUserInfoById: 响应是单个对象，直接使用`)
              userInfo = result
            }

            // 如果找到用户信息，更新缓存和临时选项
            if (userInfo) {
              console.log(`fetchUserInfoById: 找到用户信息:`, userInfo)

              // 确保userInfo是有效对象
              if (typeof userInfo === 'object' && userInfo !== null) {
                const label = parseExpression(userInfo, String(props.labelField))
                console.log(`fetchUserInfoById: 解析的标签=[${label}]`)

                if (label && !isLikelyId(label)) {
                  console.log(`fetchUserInfoById: 标签有效，保存并使用`)
                  modelValueLabels.value[safeId] = label
                  // 保存到本地缓存
                  labelCache.saveLabel(props.url, safeId, label)
                  // 更新tempOptions
                  createTempOption()

                  // 重置请求失败计数
                  requestLimiter.resetFailure(requestKey)
                  return true
                } else {
                  console.log(`fetchUserInfoById: 解析的标签无效或疑似ID，不使用`)
                }
              }
            } else {
              console.log(`fetchUserInfoById: 未找到匹配的用户信息`)
            }
          } else {
            console.log(`fetchUserInfoById: 响应为空或无效`)
          }

          console.log(`fetchUserInfoById: 请求未能获取有效标签，记录失败`)
          requestLimiter.recordFailure(requestKey)
          return false
        } catch (error) {
          console.error('fetchUserInfoById: 获取用户信息失败:', error)
          requestLimiter.recordFailure(requestKey)
          return false
        } finally {
          requestInProgress.value = false
          loading.value = false
        }
      }

      // 更新modelValue对应的标签信息
      const updateModelValueLabels = () => {
        if (!attrs.modelValue || options.value.length === 0) return

        // 处理单选情况
        if (!props.multiple && attrs.modelValue) {
          const stringValue = String(attrs.modelValue)
          const selectedOption = options.value.find((opt) => String(opt.value) === stringValue)
          if (selectedOption) {
            modelValueLabels.value[stringValue] = selectedOption.label
            // 保存到缓存
            labelCache.saveLabel(props.url, stringValue, selectedOption.label)
          }
        }
        // 处理多选情况
        else if (props.multiple && Array.isArray(attrs.modelValue) && attrs.modelValue.length > 0) {
          attrs.modelValue.forEach((value) => {
            const stringValue = String(value)
            const selectedOption = options.value.find((opt) => String(opt.value) === stringValue)
            if (selectedOption) {
              modelValueLabels.value[stringValue] = selectedOption.label
              // 保存到缓存
              labelCache.saveLabel(props.url, stringValue, selectedOption.label)
            }
          })
        }
      }

      // 创建临时选项
      const createTempOption = () => {
        console.log('创建临时选项...')
        tempOptions.value = []

        // 处理单选模式
        if (!props.multiple && attrs.modelValue) {
          const stringValue = String(attrs.modelValue)
          console.log(`为单选值 [${stringValue}] 创建临时选项`)

          // 检查现有选项中是否已有此值
          const existingOption = options.value.find((opt) => String(opt.value) === stringValue)

          // 检查是否有缓存标签
          const cachedLabel = modelValueLabels.value[stringValue]

          // 如果有缓存标签，无论是否已有选项，都创建临时选项，确保使用最新的标签
          if (cachedLabel) {
            console.log(`使用缓存标签 [${cachedLabel}] 创建临时选项`)

            tempOptions.value.push({
              label: cachedLabel,
              value: attrs.modelValue
            })
          }
          // 如果没有缓存标签，但也没有现有选项，则使用友好的临时标签
          else if (!existingOption) {
            // 使用"加载中..."作为临时标签，而不是直接显示ID
            const tempLabel = /^\d+$/.test(stringValue)
              ? `正在加载(ID:${stringValue})...`
              : String(attrs.modelValue)
            console.log(`使用临时标签 [${tempLabel}] 创建临时选项`)

            tempOptions.value.push({
              label: tempLabel,
              value: attrs.modelValue
            })
          } else {
            console.log(`在现有选项中已找到值 [${stringValue}]，标签为 [${existingOption.label}]`)
          }
        }
        // 处理多选模式
        else if (props.multiple && Array.isArray(attrs.modelValue) && attrs.modelValue.length > 0) {
          console.log(`为多选值创建临时选项，值数量: ${attrs.modelValue.length}`)

          for (const value of attrs.modelValue) {
            const stringValue = String(value)

            // 检查现有选项中是否已有此值
            const existingOption = options.value.find((opt) => String(opt.value) === stringValue)

            // 检查是否有缓存标签
            const cachedLabel = modelValueLabels.value[stringValue]

            // 如果有缓存标签，无论是否已有选项，都创建临时选项，确保使用最新的标签
            if (cachedLabel) {
              console.log(`使用缓存标签 [${cachedLabel}] 创建临时选项 (值: ${stringValue})`)

              tempOptions.value.push({
                label: cachedLabel,
                value: value
              })
            }
            // 如果没有缓存标签，但也没有现有选项，则使用友好的临时标签
            else if (!existingOption) {
              // 使用"加载中..."作为临时标签，而不是直接显示ID
              const tempLabel = /^\d+$/.test(stringValue)
                ? `正在加载(ID:${stringValue})...`
                : String(value)
              console.log(`使用临时标签 [${tempLabel}] 创建临时选项 (值: ${stringValue})`)

              tempOptions.value.push({
                label: tempLabel,
                value: value
              })
            } else {
              console.log(`在现有选项中已找到值 [${stringValue}]，标签为 [${existingOption.label}]`)
            }
          }
        }

        console.log('临时选项创建完成:', tempOptions.value)
      }

      function parseOptions(data: any) {
        //  情况一：如果有自定义解析函数优先使用自定义解析
        if (!isEmpty(props.parseFunc)) {
          const parsed = parseFunc()?.(data)
          if (Array.isArray(parsed)) {
            // 兼容自定义解析函数未返回原始数据的情况
            options.value = parsed.map((opt: any) => ({
              ...opt,
              raw: opt.raw ?? opt
            }))
          } else {
            options.value = parsed
          }
          return
        }

        // 检查是否有 data 字段，这是标准 API 返回格式
        if (data && data.data) {
          data = data.data
        }

        // 情况二：返回的直接是一个列表
        if (Array.isArray(data)) {
          parseOptions0(data)
          return
        }
        // 情况三：返回的是分页数据,尝试读取 list
        if (data && data.list) {
          data = data.list
          if (Array.isArray(data)) {
            parseOptions0(data)
            return
          }
        }
        // 情况四：不是标准返回
        console.warn(`接口[${props.url}] 返回结果不是标准返回格式，建议采用自定义解析函数处理`)
      }

      function parseOptions0(data: any[]) {
        if (Array.isArray(data)) {
          options.value = data.map((item: any) => ({
            label: parseExpression(item, props.labelField),
            value: parseExpression(item, props.valueField),
            raw: item
          }))
          return
        }
        console.warn(`接口[${props.url}] 返回结果不是一个数组`)
      }

      function parseFunc() {
        let parse: any = null
        if (!!props.parseFunc) {
          // 解析字符串函数
          parse = new Function(`return ${props.parseFunc}`)()
        }
        return parse
      }

      function parseExpression(data: any, template: string) {
        // 检测是否使用了表达式
        if (template.indexOf('${') === -1) {
          const result = data[template]
          if (result === undefined || result === null) {
            console.warn(
              `接口选择器选项[${template}] 解析值失败，请检查属性名称是否存在于接口返回值中`
            )
            // 返回一个友好的提示，而不是 undefined
            return `未知(ID:${data.id || '未知'})`
          }
          return result
        }
        // 正则表达式匹配模板字符串中的 ${...}
        const pattern = /\$\{([^}]*)}/g
        // 使用replace函数配合正则表达式和回调函数来进行替换
        return template.replace(pattern, (_, expr) => {
          // expr 是匹配到的 ${} 内的表达式（这里是属性名），从 data 中获取对应的值
          const result = data[expr.trim()] // 去除前后空白，以防用户输入带空格的属性名
          if (result === undefined || result === null) {
            console.warn(
              `接口选择器选项模版[${template}][${expr.trim()}] 解析值失败结果为[${result}], 请检查属性名称是否存在于接口返回值中,存在则忽略此条！！！`
            )
            // 返回一个友好的提示，而不是 undefined
            return `未知(ID:${data.id || '未知'})`
          }
          return result
        })
      }

      const remoteMethod = async (query: any) => {
        if (!query) {
          return
        }
        loading.value = true
        try {
          queryParam.value = query
          await getOptions()
        } finally {
          loading.value = false
        }
      }

      // 触发 change 事件时，额外返回选中项的原始数据
      const applyLinkField = (raw: any | any[]) => {
        if (!props.linkField || !props.formCreateInject) return
        const map = jsonParse(props.linkField) || {}
        const api = props.formCreateInject.api || props.formCreateInject.fapi
        if (!api || typeof map !== 'object') return
        Object.entries(map).forEach(([source, target]) => {
          if (Array.isArray(raw)) {
            const values = raw
              .map((item) => item && item[source])
              .filter((v) => v !== undefined)
            api.setValue && api.setValue(target as string, values)
          } else if (raw && raw[source] !== undefined) {
            api.setValue && api.setValue(target as string, raw[source])
          }
        })
      }

      const triggerChange = (val: any) => {
        const handler = (attrs as any).onChange

        const findItem = (v: any) =>
          options.value.find((item) => String(item.value) === String(v))

        if (props.multiple && Array.isArray(val)) {
          const rows = val.map((v) => findItem(v)?.raw)
          applyLinkField(rows)
          handler && handler(val, rows)
        } else {
          const row = findItem(val)?.raw
          applyLinkField(row)
          handler && handler(val, row)
        }
      }

      // 添加一个新的方法来确保数据已加载
      const ensureDataLoaded = async (value: any) => {
        if (!value) return false

        // 检查是否已经有对应的标签
        const stringValue = String(value)
        const hasValidLabel =
          modelValueLabels.value[stringValue] && !isLikelyId(modelValueLabels.value[stringValue])

        // 如果已经有有效的标签（不是ID），则返回true
        if (hasValidLabel) return true

        // 如果没有有效标签，先尝试获取单个用户信息
        const success = await fetchUserInfoById(value)
        if (success) return true

        // 如果获取单个用户信息失败且选项还未加载，尝试加载所有选项
        if (!isDataLoaded.value) {
          try {
            await getOptions()
            // 再次检查是否有了有效的标签
            updateModelValueLabels()
            return (
              modelValueLabels.value[stringValue] &&
              !isLikelyId(modelValueLabels.value[stringValue])
            )
          } catch (error) {
            console.error('确保数据加载失败:', error)
            return false
          }
        }

        return false
      }

      // 添加自动检测并重新加载机制，但使用更智能的方式减少请求
      const checkAndReloadIfNeeded = async () => {
        if (!attrs.modelValue) return

        if (!props.multiple) {
          // 单选模式
          const currentValue = attrs.modelValue
          await ensureDataLoaded(currentValue)
        } else if (Array.isArray(attrs.modelValue)) {
          // 多选模式，检查每个选中的值
          for (const value of attrs.modelValue) {
            await ensureDataLoaded(value)
            // 添加短暂延迟，避免同时发送大量请求
            await new Promise((resolve) => setTimeout(resolve, 100))
          }
        }
      }

      // 启动自动检测
      const startAutoDetection = () => {
        // 先清除可能存在的定时器
        stopAutoDetection()

        // 延迟2秒后首次检查，避免与初始加载冲突
        setTimeout(async () => {
          await checkAndReloadIfNeeded()

          // 然后每30秒检查一次，如果还有数字ID就重新加载
          // 这个频率低得多，减少了服务器负担
          autoReloadTimer.value = window.setInterval(checkAndReloadIfNeeded, 30000)
        }, 2000)
      }

      // 停止自动检测
      const stopAutoDetection = () => {
        if (autoReloadTimer.value !== null) {
          clearInterval(autoReloadTimer.value)
          autoReloadTimer.value = null
        }
      }

      // 修改组件挂载时的逻辑
      onMounted(async () => {
        console.log('ApiSelect组件挂载，初始化数据...')

        // 先尝试从缓存创建临时选项
        if (attrs.modelValue) {
          console.log('检测到modelValue:', attrs.modelValue)

          if (!props.multiple) {
            // 单选模式
            const stringValue = String(attrs.modelValue)
            console.log(`单选模式，值为: ${stringValue}`)

            const cachedLabel = labelCache.getLabel(props.url, stringValue)
            if (cachedLabel) {
              console.log(`从缓存中获取到标签: ${cachedLabel}`)
              modelValueLabels.value[stringValue] = cachedLabel
            } else {
              console.log(`缓存中未找到标签，将尝试从API获取`)
              // 立即尝试获取单个用户信息
              await fetchUserInfoById(stringValue)
            }
          } else if (Array.isArray(attrs.modelValue)) {
            // 多选模式
            console.log(`多选模式，值数量: ${attrs.modelValue.length}`)

            for (const value of attrs.modelValue) {
              const stringValue = String(value)
              const cachedLabel = labelCache.getLabel(props.url, stringValue)
              if (cachedLabel) {
                console.log(`从缓存中获取到标签: ${cachedLabel} (值: ${stringValue})`)
                modelValueLabels.value[stringValue] = cachedLabel
              } else {
                console.log(`缓存中未找到标签 (值: ${stringValue})，将尝试从API获取`)
                // 立即尝试获取单个用户信息，但不等待结果，避免多个请求阻塞
                fetchUserInfoById(stringValue).catch((e) => console.error('获取用户信息失败:', e))
                // 添加短暂延迟，避免并发请求过多
                await new Promise((resolve) => setTimeout(resolve, 50))
              }
            }
          }

          // 创建临时选项
          createTempOption()
        }

        // 加载所有选项数据
        console.log('开始加载所有选项数据...')
        await getOptions()
        console.log('所有选项数据加载完成')

        // 确保modelValue对应的标签已更新
        updateModelValueLabels()

        // 再次创建临时选项，确保使用最新数据
        createTempOption()

        // 启动自动检测，但使用更低的频率
        console.log('启动自动检测机制')
        startAutoDetection()
      })

      // 在组件卸载时清除定时器
      onUnmounted(() => {
        stopAutoDetection()
      })

      // 在attrs.modelValue发生变化时也要重新检查
      watch(
        () => attrs.modelValue,
        async (newVal) => {
          if (newVal) {
            // 创建临时选项
            createTempOption()

            // 使用节流方式检查，避免频繁请求
            setTimeout(async () => {
              await checkAndReloadIfNeeded()
            }, 500)
          }
        },
        { deep: true }
      )

      const buildSelect = () => {
        // 结合临时选项和实际选项以确保即使在数据加载前也能正确显示
        const mergedOptions = [...tempOptions.value, ...options.value]

        // 去重，如果临时选项的值在options中已存在就不显示临时选项
        const uniqueOptions = mergedOptions.reduce((acc, current) => {
          const stringValue = String(current.value)

          const exists = acc.find((item) => String(item.value) === stringValue)

          if (!exists) {
            acc.push(current)
          }
          return acc
        }, [] as any[])

        // 添加调试日志
        /*  console.log('buildSelect: 合并后的选项:', uniqueOptions)
          console.log('buildSelect: 当前的modelValueLabels:', modelValueLabels.value)
          console.log('buildSelect: 当前选中值:', attrs.modelValue)*/

        // 遍历uniqueOptions，优先使用modelValueLabels中的缓存标签
        uniqueOptions.forEach(item => {
          const stringValue = String(item.value)

          // 检查是否有缓存标签
          if (modelValueLabels.value[stringValue]) {
            const cachedLabel = modelValueLabels.value[stringValue]

            // 如果缓存标签不是ID，则使用缓存标签
            if (!isLikelyId(cachedLabel)) {
              // console.log(`buildSelect: 为选项 [${stringValue}] 使用缓存标签 [${cachedLabel}] 替换原始标签 [${item.label}]`)
              item.label = cachedLabel
            } else {
              // console.log(`buildSelect: 选项 [${stringValue}] 的缓存标签 [${cachedLabel}] 疑似ID，继续使用原始标签 [${item.label}]`)
            }
          } else {
            // console.log(`buildSelect: 选项 [${stringValue}] 没有缓存标签，使用原始标签 [${item.label}]`)
          }
        })

        // console.log('buildSelect: 更新标签后的选项:', uniqueOptions)

        // 确保当前选中的值在选项列表中有对应的选项
        const currentValue = attrs.modelValue
        if (currentValue && !Array.isArray(currentValue)) {
          const stringValue = String(currentValue)
          const existsInOptions = uniqueOptions.some(item => String(item.value) === stringValue)

          if (!existsInOptions && modelValueLabels.value[stringValue]) {
            // console.log(`buildSelect: 当前选中值 [${stringValue}] 不在选项列表中，但有缓存标签，添加临时选项`)
            uniqueOptions.push({
              value: currentValue,
              label: modelValueLabels.value[stringValue] || `ID:${stringValue}`
            })
          }
        }

        // 创建一个计算属性，用于确定显示值
        // 这个函数将根据当前选中的值和modelValueLabels计算出应该显示的标签
        const getDisplayValue = (value: any) => {
          if (!value) return value;

          if (Array.isArray(value)) {
            // 多选模式
            return value.map(v => {
              const stringValue = String(v);
              // 检查modelValueLabels中是否有对应的标签
              if (modelValueLabels.value[stringValue]) {
                return {
                  value: v,
                  label: modelValueLabels.value[stringValue]
                };
              }
              // 在选项列表中查找
              const option = uniqueOptions.find(item => String(item.value) === stringValue);
              if (option) {
                return {
                  value: v,
                  label: option.label
                };
              }
              // 如果都找不到，返回原始值
              return {
                value: v,
                label: `ID:${stringValue}`
              };
            });
          } else {
            // 单选模式
            const stringValue = String(value);
            // 检查modelValueLabels中是否有对应的标签
            if (modelValueLabels.value[stringValue]) {
              // console.log(`getDisplayValue: 使用缓存标签 [${modelValueLabels.value[stringValue]}] 显示值 [${stringValue}]`);
              return {
                value: value,
                label: modelValueLabels.value[stringValue]
              };
            }
            // 在选项列表中查找
            const option = uniqueOptions.find(item => String(item.value) === stringValue);
            if (option) {
              //         console.log(`getDisplayValue: 使用选项标签 [${option.label}] 显示值 [${stringValue}]`);
              return {
                value: value,
                label: option.label
              };
            }
            // 如果都找不到，返回原始值
            //  console.log(`getDisplayValue: 未找到标签，显示原始值 [${value}]`);
            return {
              value: value,
              label: `ID:${stringValue}`
            };
          }
        };

        // 获取当前显示值
        const displayValue = getDisplayValue(attrs.modelValue);
        //      console.log('buildSelect: 当前显示值:', displayValue);

        if (props.multiple) {
          // fix：多写此步是为了解决 multiple 属性问题
          return (
            <el-select
              class="w-full"
              multiple
              filterable
              loading={loading.value}
              {...attrs}
              remote={props.remote}
              {...(props.remote && { remoteMethod: remoteMethod })}
              value-key="value"
              onChange={triggerChange}
            >
              {{
                default: () => uniqueOptions.map((item, index) => {
                  const stringValue = String(item.value)
                  // console.log(`渲染选项: 值=[${stringValue}], 标签=[${item.label}]`)
                  return (
                    <el-option
                      key={index}
                      label={item.label}
                      value={item.value}
                    />
                  )
                }),
                // 自定义渲染选中值的方式
                'prefix': () => {
                  // 如果当前有选中值且是单个值
                  if (attrs.modelValue && !Array.isArray(attrs.modelValue)) {
                    const stringValue = String(attrs.modelValue)
                    // 如果有缓存标签，显示缓存标签
                    if (modelValueLabels.value[stringValue]) {
                      console.log(`使用缓存标签 [${modelValueLabels.value[stringValue]}] 渲染选中值 [${stringValue}]`)
                      // 这里不直接返回内容，因为prefix插槽通常用于添加前缀图标等
                      return null
                    }
                  }
                  return null
                }
              }}
            </el-select>
          )
        }

        // 单选模式
        return (
          <el-select
            class="w-full"
            filterable
            loading={loading.value}
            {...attrs}
            remote={props.remote}
            {...(props.remote && { remoteMethod: remoteMethod })}
            value-key="value"
            onChange={triggerChange}
          >
            {{
              default: () => uniqueOptions.map((item, index) => {
                const stringValue = String(item.value)
                // console.log(`渲染选项: 值=[${stringValue}], 标签=[${item.label}]`)
                return (
                  <el-option
                    key={index}
                    label={item.label}
                    value={item.value}
                  />
                )
              }),
              // 自定义渲染选中值的方式
              'prefix': () => {
                // 如果当前有选中值
                if (attrs.modelValue) {
                  const stringValue = String(attrs.modelValue)
                  // 如果有缓存标签，显示缓存标签
                  if (modelValueLabels.value[stringValue]) {
                    console.log(`使用缓存标签 [${modelValueLabels.value[stringValue]}] 渲染选中值 [${stringValue}]`)
                    // 这里不直接返回内容，因为prefix插槽通常用于添加前缀图标等
                    return null
                  }
                }
                return null
              }
            }}
          </el-select>
        )
      }
      const buildCheckbox = () => {
        if (isEmpty(options.value)) {
          options.value = [
            { label: '选项1', value: '选项1' },
            { label: '选项2', value: '选项2' }
          ]
        }
        return (
          <el-checkbox-group class="w-full" {...attrs} onChange={triggerChange}>
            {options.value.map((item, index) => (
              <el-checkbox key={index} label={item.value}>
                {item.label}
              </el-checkbox>
            ))}
          </el-checkbox-group>
        )
      }
      const buildRadio = () => {
        if (isEmpty(options.value)) {
          options.value = [
            { label: '选项1', value: '选项1' },
            { label: '选项2', value: '选项2' }
          ]
        }
        return (
          <el-radio-group class="w-full" {...attrs} onChange={triggerChange}>
            {options.value.map((item, index) => (
              <el-radio key={index} value={item.value}>
                {item.label}
              </el-radio>
            ))}
          </el-radio-group>
        )
      }
      return () => (
        <Fragment>
          {props.selectType === 'select'
            ? buildSelect()
            : props.selectType === 'radio'
              ? buildRadio()
              : props.selectType === 'checkbox'
                ? buildCheckbox()
                : buildSelect()}
        </Fragment>
      )
    }
  })
}