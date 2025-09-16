<template>
  <!-- 第一步，通过流程定义的列表，选择对应的流程 -->
  <template v-if="!selectProcessDefinition">
    <div class="bpm-card process-selector-card fade-in">
      <!-- 页面标题区域 -->
      <div class="bpm-card-header">
        <div class="card-title">
          <Icon icon="ep:connection" class="title-icon" />
          <span>发起流程</span>
        </div>
        <div class="card-action">
          <div class="bpm-search-bar">
            <el-input
              v-model="searchName"
              class="search-input"
              placeholder="请输入流程名称搜索"
              clearable
              @input="handleQuery"
              @clear="handleQuery"
              prefix-icon="ep:search"
            />
          </div>
        </div>
      </div>
      
      <!-- 内容区域 -->
      <div class="bpm-card-body">
        <div
          class="process-container"
          v-loading="loading"
          element-loading-background="rgba(255, 255, 255, 0.9)"
          element-loading-text="正在加载流程..."
        >
          <!-- 空状态 -->
          <el-empty 
            v-if="!filteredProcessDefinitionList?.length" 
            :image-size="180" 
            description="没有找到匹配的流程" 
            class="empty-state slide-up-in"
          >
            <template #image>
              <el-icon :size="64" class="empty-icon">
                <Search />
              </el-icon>
            </template>
            <template #description>
              <span class="empty-text">
                {{ searchName ? '没有找到匹配的流程，请尝试其他关键词' : '暂无可用的流程定义' }}
              </span>
            </template>
          </el-empty>

          <!-- 流程内容 -->
          <template v-else>
            <el-row :gutter="24" class="process-content">
              <!-- 左侧分类导航 -->
              <el-col :span="6" :xs="24" :sm="8" :md="6" class="category-col">
                <div class="category-nav-container slide-in-left">
                  <h3 class="category-nav-title">
                    <Icon icon="ep:folder" class="mr-5px" />
                    流程分类
                  </h3>
                  <div class="category-nav">
                    <div
                      v-for="category in availableCategories"
                      :key="category.code"
                      class="category-item"
                      :class="{ 'is-active': categoryActive.code === category.code }"
                      @click="handleCategoryClick(category)"
                    >
                      <div class="item-content">
                        <Icon icon="ep:folder" class="category-icon" />
                        <span class="category-name">{{ category.name }}</span>
                      </div>
                      <div class="category-count" v-if="getCategoryCount(category.code)">
                        {{ getCategoryCount(category.code) }}
                      </div>
                    </div>
                  </div>
                </div>
              </el-col>
              
              <!-- 右侧流程定义列表 -->
              <el-col :span="18" :xs="24" :sm="16" :md="18" class="process-col">
                <el-scrollbar ref="scrollWrapper" class="process-scrollbar">
                  <div class="process-sections">
                    <div
                      class="process-section stagger-item slide-up-in"
                      v-for="(definitions, categoryCode) in processDefinitionGroup"
                      :key="categoryCode"
                      :id="`category-section-${categoryCode}`"
                    >
                      <h3 class="section-title">
                        <Icon icon="ep:folder-opened" class="section-icon" />
                        <span>{{ getCategoryName(categoryCode as any) }}</span>
                      </h3>
                      
                      <div class="process-grid">
                        <div
                          v-for="definition in definitions"
                          :key="definition.id"
                          class="process-card cursor-pointer"
                          @click="handleSelect(definition)"
                          @mouseenter="onCardHover"
                        >
                          <div class="card-header cursor-pointer">
                            <div class="process-icon" :style="getRandomGradient(definition.name)">
                              <template v-if="definition.icon">
                                <el-image :src="definition.icon" class="icon-image" />
                              </template>
                              <template v-else>
                                {{ subString(definition.name, 0, 2) }}
                              </template>
                            </div>
                            <div class="process-badge">{{ getCategoryName(definition.category) }}</div>
                          </div>
                          
                          <div class="card-body cursor-pointer">
                            <h4 class="process-name" :title="definition.name">{{ definition.name }}</h4>
                            <p class="process-desc" v-if="definition.description" :title="definition.description">
                              {{ definition.description }}
                            </p>
                          </div>
                          
                          <div class="card-footer cursor-pointer">
                            <el-button 
                              type="primary" 
                              class="action-button select-button cursor-pointer" 
                              size="small"
                              style="cursor: pointer !important;"
                            >
                              <Icon icon="ep:select" class="mr-3px" />
                              <span>选择此流程</span>
                            </el-button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </el-scrollbar>
              </el-col>
            </el-row>
          </template>
        </div>
      </div>
    </div>
  </template>

  <!-- 第二步，填写表单，进行流程的提交 -->
  <ProcessDefinitionDetail
    v-else
    ref="processDefinitionDetailRef"
    :selectProcessDefinition="selectProcessDefinition"
    @cancel="handleCancel"
  />
</template>

<script lang="ts" setup>
import * as DefinitionApi from '@/api/bpm/definition'
import * as ProcessInstanceApi from '@/api/bpm/processInstance'
import { CategoryApi, CategoryVO } from '@/api/bpm/category'
import ProcessDefinitionDetail from './ProcessDefinitionDetail.vue'
import { groupBy, debounce, } from 'lodash-es'
import { subString } from '@/utils/index'
import { Search } from '@element-plus/icons-vue'

defineOptions({ name: 'BpmProcessInstanceCreate' })

const { proxy } = getCurrentInstance() as any
const route = useRoute() // 路由
const message = useMessage() // 消息

const searchName = ref('') // 当前搜索关键字
const processInstanceId: any = route.query.processInstanceId // 流程实例编号。场景：重新发起时
const loading = ref(true) // 加载中
const categoryList: any = ref([]) // 分类的列表
const categoryActive: any = ref({}) // 选中的分类
const processDefinitionList = ref([]) // 流程定义的列表
const formData = ref({}) // 保存表单数据

// 存储和恢复状态的键名
const STORAGE_KEY = 'bpm_process_instance_state'

/** 查询列表 */
const getList = async () => {
  loading.value = true
  try {
    // 所有流程分类数据
    await getCategoryList()
    // 所有流程定义数据
    await getProcessDefinitionList()

    // 如果 processInstanceId 非空，说明是重新发起
    if (processInstanceId?.length > 0) {
      const processInstance = await ProcessInstanceApi.getProcessInstance(processInstanceId)
      if (!processInstance) {
        message.error('重新发起流程失败，原因：流程实例不存在')
        return
      }
      const processDefinition = processDefinitionList.value.find(
        (item: any) => item.key == processInstance.processDefinition?.key
      )
      if (!processDefinition) {
        message.error('重新发起流程失败，原因：流程定义不存在')
        return
      }
      await handleSelect(processDefinition, processInstance.formVariables)
    } else {
      // 尝试从 localStorage 恢复状态
      restoreState()
    }
  } finally {
    loading.value = false
  }
}

// 保存当前状态到 localStorage
const saveState = () => {
  if (selectProcessDefinition.value) {
    // 获取当前表单数据
    if (processDefinitionDetailRef.value) {
      formData.value = processDefinitionDetailRef.value.getFormData()
    }
    
    const state = {
      selectProcessDefinition: selectProcessDefinition.value,
      formData: formData.value,
      timestamp: new Date().getTime()
    }
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch (e) {
      console.error('保存流程状态失败:', e)
    }
  }
}

// 从 localStorage 恢复状态
const restoreState = async () => {
  try {
    const stateStr = localStorage.getItem(STORAGE_KEY)
    if (stateStr) {
      const state = JSON.parse(stateStr)
      
      // 检查状态是否过期（24小时）
      const now = new Date().getTime()
      const isExpired = now - state.timestamp > 24 * 60 * 60 * 1000
      
      if (!isExpired && state.selectProcessDefinition) {
        // 确保流程定义存在于当前列表中
        const definition = processDefinitionList.value.find(
          (item: any) => item.id === state.selectProcessDefinition.id
        )
        
        if (definition) {
          console.log('从本地存储恢复流程状态:', state.selectProcessDefinition.name)
          await handleSelect(definition, state.formData || {})
        }
      } else {
        // 状态过期，清除
        localStorage.removeItem(STORAGE_KEY)
      }
    }
  } catch (e) {
    console.error('恢复流程状态失败:', e)
    localStorage.removeItem(STORAGE_KEY)
  }
}

/** 获取所有流程分类数据 */
const getCategoryList = async () => {
  try {
    // 流程分类
    categoryList.value = await CategoryApi.getCategorySimpleList()
  } finally {
  }
}

/** 获取所有流程定义数据 */
const getProcessDefinitionList = async () => {
  try {
    // 流程定义
    processDefinitionList.value = await DefinitionApi.getProcessDefinitionList({
      suspensionState: 1
    })
    // 初始化过滤列表为全部流程定义
    filteredProcessDefinitionList.value = processDefinitionList.value

    // 在获取完所有数据后，设置第一个有效分类为激活状态
    if (availableCategories.value.length > 0 && !categoryActive.value?.code) {
      categoryActive.value = availableCategories.value[0]
    }
  } finally {
  }
}

/** 搜索流程 */
const filteredProcessDefinitionList = ref([]) // 用于存储搜索过滤后的流程定义
const handleQuery = debounce(() => {
  if (searchName.value.trim()) {
    // 如果有搜索关键字，进行过滤
    filteredProcessDefinitionList.value = processDefinitionList.value.filter(
      (definition: any) => definition.name.toLowerCase().includes(searchName.value.toLowerCase()) // 假设搜索依据是流程定义的名称
    )
  } else {
    // 如果没有搜索关键字，恢复所有数据
    filteredProcessDefinitionList.value = processDefinitionList.value
  }
}, 300) // 添加300ms的防抖延迟

/** 流程定义的分组 */
const processDefinitionGroup: any = computed(() => {
  if (!processDefinitionList.value?.length) {
    return {}
  }

  // 如果过滤列表为空，直接返回空对象
  if (!filteredProcessDefinitionList.value?.length) {
    return {}
  }

  // 使用Map优化分组操作
  const grouped = groupBy(filteredProcessDefinitionList.value, 'category')
  
  // 按照 categoryList 的顺序重新组织数据
  // 使用对象字面量而不是空对象+动态赋值，减少属性操作次数
  const orderedGroup = {}
  
  // 仅对有流程定义的分类进行处理
  categoryList.value.forEach((category: any) => {
    const categoryProcessDefinitions = grouped[category.code]
    if (categoryProcessDefinitions?.length) {
      orderedGroup[category.code] = categoryProcessDefinitions
    }
  })
  
  return orderedGroup
})

/** 获取每个分类的流程数量 */
const getCategoryCount = (categoryCode: string) => {
  const group = processDefinitionGroup.value[categoryCode]
  return group ? group.length : 0
}

/** 左侧分类切换 */
const handleCategoryClick = (category: any) => {
  // 先更新活动分类
  categoryActive.value = category
  
  // 使用nextTick确保DOM已更新
  nextTick(() => {
    try {
      // 使用ID直接获取DOM元素
      const categoryElement = document.getElementById(`category-section-${category.code}`)
      
      if (categoryElement) {
        const scrollWrapper = proxy.$refs.scrollWrapper
        
        if (scrollWrapper) {
          // 获取元素相对于滚动容器的偏移量
          const categoryOffsetTop = categoryElement.offsetTop
          
          // 使用平滑滚动效果，提供更好的用户体验
          if (scrollWrapper.$el && scrollWrapper.$el.querySelector('.el-scrollbar__wrap')) {
            const wrapElement = scrollWrapper.$el.querySelector('.el-scrollbar__wrap')
            
            // 使用平滑滚动
            wrapElement.scrollTo({
              top: categoryOffsetTop,
              behavior: 'smooth'
            })
          } else {
            // 备用方法 - 使用平滑滚动
            scrollWrapper.scrollTo({ top: categoryOffsetTop, behavior: 'smooth' })
          }
        }
      }
    } catch (error) {
      console.error('点击分类滚动出错:', error)
    }
  })
}

/** 有效的流程分类 */
const availableCategories = computed(() => {
  if (!processDefinitionGroup.value) {
    return []
  }
  
  return categoryList.value.filter((category: any) => {
    return processDefinitionGroup.value.hasOwnProperty(category.code)
  })
})

/** 获取分类名称 */
const getCategoryName = (code: string) => {
  const category = categoryList.value.find((item: any) => item.code === code)
  return category ? category.name : ''
}

/** 生成随机渐变色 */
const gradientColors = [
  'linear-gradient(135deg, #3498db, #2980b9)', // 蓝色
  'linear-gradient(135deg, #2ecc71, #27ae60)', // 绿色
  'linear-gradient(135deg, #e67e22, #d35400)', // 橙色
  'linear-gradient(135deg, #9b59b6, #8e44ad)', // 紫色
  'linear-gradient(135deg, #1abc9c, #16a085)', // 青绿色
  'linear-gradient(135deg, #f1c40f, #f39c12)', // 黄色
  'linear-gradient(135deg, #e74c3c, #c0392b)', // 红色
]

const getRandomGradient = (seed: string) => {
  // 使用流程名称作为种子，确保相同名称有相同颜色
  const index = seed.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % gradientColors.length
  return { background: gradientColors[index] }
}

/** 选中流程定义 */
const selectProcessDefinition = ref() // 选中的流程定义
const processDefinitionDetailRef = ref() // 流程定义详情 Ref
const handleSelect = async (definition, formVariables = {}) => {
  try {
    console.log('选择流程:', definition.name)
    // 设置选中的流程定义
    selectProcessDefinition.value = definition
    
    // 使用 nextTick 等待组件挂载完成
    await nextTick()
    
    console.log('流程详情组件引用状态:', processDefinitionDetailRef.value ? '已获取' : '未获取')
    
    // 确保流程详情组件已加载并初始化
    if (processDefinitionDetailRef.value) {
      console.log('调用initProcessInfo初始化流程')
      // 初始化流程详情
      processDefinitionDetailRef.value.initProcessInfo(definition, formVariables)
      
      // 如果是重新发起流程，且有表单变量，则填充表单
      if (formVariables && Object.keys(formVariables).length > 0) {
        console.log('检测到表单变量，准备填充表单')
        
        // 等待下一个tick，确保表单已经渲染完成
        await nextTick()
        
        // 确保fillFormVariables方法存在
        if (typeof processDefinitionDetailRef.value.fillFormVariables === 'function') {
          console.log('调用fillFormVariables方法填充表单')
          processDefinitionDetailRef.value.fillFormVariables(formVariables)
        } else {
          console.warn('fillFormVariables方法不存在，表单数据将通过initProcessInfo方法填充')
          // 这种情况下initProcessInfo已经处理了表单变量，不需要额外操作
        }
      }
      
      // 保存状态到本地存储
      saveState()
    } else {
      console.error('流程详情组件引用未获取，无法初始化')
      message.error('加载流程详情失败，请重试')
    }
  } catch (err: any) {
    console.error('选择流程时发生错误:', err)
    message.error('加载流程详情失败: ' + (err.message || '未知错误'))
  }
}

/** 处理取消操作 */
const handleCancel = () => {
  // 清除本地存储的状态
  localStorage.removeItem(STORAGE_KEY)
  // 重置选中的流程定义
  selectProcessDefinition.value = undefined
}

/** 鼠标悬停在卡片上的处理 */
const onCardHover = (event) => {
  // 强制设置鼠标指针为小手样式
  if (event.currentTarget) {
    event.currentTarget.style.cursor = 'pointer';
    
    // 递归设置所有子元素的样式
    const setChildrenCursor = (element) => {
      for (let i = 0; i < element.children.length; i++) {
        const child = element.children[i];
        child.style.cursor = 'pointer';
        if (child.children.length > 0) {
          setChildrenCursor(child);
        }
      }
    };
    
    setChildrenCursor(event.currentTarget);
  }
};

/** 初始化 **/
onMounted(() => {
  getList()
  
  // 移动端滚动优化
  nextTick(() => {
    // 检测是否为移动设备
    const isMobile = window.innerWidth <= 768
    
    if (isMobile && proxy.$refs.scrollWrapper) {
      const scrollbarEl = proxy.$refs.scrollWrapper.$el
      const scrollWrap = scrollbarEl?.querySelector('.el-scrollbar__wrap')
      
      if (scrollWrap instanceof HTMLElement) {
        // 确保滚动容器可以正常触摸滚动
        scrollWrap.style.overflowY = 'auto'
        // 使用 setAttribute 方法设置自定义CSS属性
        scrollWrap.setAttribute('style', scrollWrap.getAttribute('style') + '; -webkit-overflow-scrolling: touch; touch-action: pan-y;')
        
        // 监听触摸事件，确保滚动正常
        scrollWrap.addEventListener('touchstart', () => {}, { passive: true })
        
        // 在移动设备上，可能需要手动调整滚动区域的高度
        const processCol = document.querySelector('.process-col')
        if (processCol instanceof HTMLElement) {
          const availableHeight = window.innerHeight - processCol.getBoundingClientRect().top - 20
          processCol.style.height = `${availableHeight}px`
          
          if (scrollbarEl instanceof HTMLElement) {
            scrollbarEl.style.height = `${availableHeight}px`
          }
        }
      }
    }
  })
  
  // 监听页面可见性变化，在页面重新可见时保存状态
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && selectProcessDefinition.value) {
      // 页面重新可见时，如果有选中的流程定义，则保存状态
      saveState()
    }
  })
  
  // 监听页面卸载事件，保存状态
  window.addEventListener('beforeunload', () => {
    if (selectProcessDefinition.value) {
      saveState()
    }
  })
})

// 在组件卸载前保存状态
onBeforeUnmount(() => {
  if (selectProcessDefinition.value) {
    saveState()
  }
})
</script>

<style lang="scss">
/* 全局样式（注意：没有scoped） */
.cursor-pointer {
  cursor: pointer !important;
}

.process-card {
  cursor: pointer !important;
}

.process-card * {
  cursor: pointer !important;
}

.action-button, .select-button, .el-button {
  cursor: pointer !important;
}

/* 强制覆盖Element Plus按钮样式 */
.el-button.el-button--primary.el-button--small.action-button.select-button.cursor-pointer,
.el-button--primary,
[class*="el-button"] {
  cursor: pointer !important;
}

/* 直接覆盖Element默认 */
.process-grid button,
.process-grid button * {
  cursor: pointer !important;
}

/* 最高优先级覆盖 */
html body .process-selector-card .process-grid .process-card .card-footer .action-button {
  cursor: pointer !important;
}

/* 移动端触摸滚动支持 */
@media (max-width: 768px) {
  .process-scrollbar,
  .el-scrollbar,
  .el-scrollbar__wrap {
    -webkit-overflow-scrolling: touch !important;
    touch-action: pan-y !important;
  }
}
</style>

<style lang="scss" scoped>
/* 全局光标样式 - 确保显示小手指针 */
.process-selector-card {
  .process-card,
  .process-card *,
  .action-button,
  .select-button,
  [class*="el-button"] {
    cursor: pointer !important;
  }
}

// 整体卡片容器样式
.process-selector-card {
  border-radius: 12px;
  box-shadow: 0 3px 16px rgba(0, 0, 0, 0.08);
  background-color: #ffffff;
  height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  
  .bpm-card-header {
    padding: 18px 24px;
    border-bottom: 1px solid #f0f0f0;
    flex-shrink: 0;
    
    .card-title {
      font-size: 18px;
      font-weight: 600;
      
      .title-icon {
        font-size: 20px;
        margin-right: 10px;
        color: var(--el-color-primary);
        background-color: var(--el-color-primary-light-9);
        padding: 8px;
        border-radius: 8px;
      }
    }
    
    .search-input {
      width: 280px;
      border-radius: 8px;
      
      :deep(.el-input__wrapper) {
        border-radius: 8px;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
        
        &:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        &.is-focus {
          box-shadow: 0 0 0 1px var(--el-color-primary) inset;
        }
      }
    }
  }
  
  .bpm-card-body {
    padding: 0;
    flex: 1;
    overflow: hidden;
  }
}

// 内容容器
.process-container {
  position: relative;
  height: 100%;
  
  .empty-state {
    padding: 60px 0;
    
    .empty-icon {
      color: var(--el-color-primary);
      background-color: var(--el-color-primary-light-9);
      border-radius: 50%;
      padding: 16px;
      margin-bottom: 12px;
    }
    
    .empty-text {
      color: var(--el-text-color-secondary);
      font-size: 14px;
    }
  }
  
  .process-content {
    margin: 0;
    height: 100%;
  }
}

// 分类导航样式
.category-col {
  border-right: 1px solid #f0f0f0;
  padding: 0;
  background-color: #f9fafc;
  border-radius: 0 0 0 12px;
  height: 100%;
  
  .category-nav-container {
    padding: 16px 0;
    height: 100%;
    display: flex;
    flex-direction: column;
    
    .category-nav-title {
      font-size: 16px;
      font-weight: 600;
      padding: 0 20px 12px;
      margin: 0;
      color: var(--el-text-color-primary);
      border-bottom: 1px solid #f0f0f0;
      flex-shrink: 0;
    }
    
    .category-nav {
      padding: 12px 8px;
      flex: 1;
      overflow-y: auto;
      
      .category-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        margin: 4px 0;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.25s ease;
        position: relative;
        overflow: hidden;
        
        .item-content {
          display: flex;
          align-items: center;
          z-index: 1;
        }
        
        &::after {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          width: 3px;
          height: 100%;
          background-color: var(--el-color-primary);
          opacity: 0;
          transition: all 0.25s ease;
        }
        
        &:hover {
          background-color: rgba(var(--el-color-primary-rgb), 0.08);
          
          &::after {
            opacity: 0.5;
          }
        }
        
        &.is-active {
          background-color: rgba(var(--el-color-primary-rgb), 0.1);
          font-weight: 600;
          color: var(--el-color-primary);
          
          &::after {
            opacity: 1;
          }
          
          .category-icon {
            color: var(--el-color-primary);
          }
        }
        
        .category-icon {
          margin-right: 10px;
          font-size: 16px;
          color: #909399;
        }
        
        .category-name {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .category-count {
          background-color: rgba(var(--el-color-primary-rgb), 0.1);
          color: var(--el-color-primary);
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          min-width: 24px;
          text-align: center;
        }
      }
    }
  }
}

// 流程区域样式
.process-col {
  padding: 0;
  height: 100%;
  
  .process-scrollbar {
    height: 100%;
    
    :deep(.el-scrollbar__wrap) {
      overflow-x: hidden;
    }
  }
  
  .process-sections {
    padding: 20px;
    
    .process-section {
      margin-bottom: 36px;
      
      &:last-child {
        margin-bottom: 0;
      }
      
      .section-title {
        font-size: 16px;
        font-weight: 600;
        margin: 0 0 20px;
        padding-bottom: 10px;
        border-bottom: 1px dashed #e8e8e8;
        color: var(--el-text-color-primary);
        display: flex;
        align-items: center;
        
        .section-icon {
          margin-right: 8px;
          color: var(--el-color-primary);
        }
      }
      
      .process-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: 20px;
        
        .process-card {
          border-radius: 12px;
          background-color: #ffffff;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
          overflow: hidden;
          transition: all 0.3s ease;
          cursor: pointer !important;
          height: 100%;
          display: flex;
          flex-direction: column;
          
          &:hover {
            transform: translateY(-6px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
            cursor: pointer !important;
            
            .card-footer .action-button {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .card-header, .card-body, .card-footer {
            cursor: pointer !important;
          }
          
          .card-header {
            padding: 16px;
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            position: relative;
            
            .process-icon {
              width: 48px;
              height: 48px;
              border-radius: 12px;
              overflow: hidden;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: 600;
              font-size: 18px;
              text-transform: uppercase;
              margin-bottom: 6px;
              
              .icon-image {
                width: 100%;
                height: 100%;
                object-fit: cover;
              }
            }
            
            .process-badge {
              font-size: 12px;
              color: var(--el-color-primary);
              background-color: rgba(var(--el-color-primary-rgb), 0.1);
              padding: 4px 8px;
              border-radius: 12px;
            }
          }
          
          .card-body {
            padding: 0 16px 16px;
            flex: 1;
            
            .process-name {
              font-size: 16px;
              font-weight: 600;
              color: var(--el-text-color-primary);
              margin: 0 0 8px;
              overflow: hidden;
              text-overflow: ellipsis;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
              line-height: 1.3;
              min-height: 42px;
            }
            
            .process-desc {
              font-size: 13px;
              color: var(--el-text-color-secondary);
              margin: 0;
              overflow: hidden;
              text-overflow: ellipsis;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
              line-height: 1.4;
            }
          }
          
          .card-footer {
            padding: 12px 16px;
            border-top: 1px solid #f5f5f5;
            text-align: center;
            
            .action-button {
              width: 100%;
              border-radius: 8px;
              opacity: 0.8;
              transform: translateY(4px);
              transition: all 0.3s ease;
              cursor: pointer;
              
              &:hover {
                opacity: 1;
                background-color: var(--el-color-primary-dark-2);
              }
            }
            
            .select-button {
              position: relative;
              overflow: hidden;
              
              &::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(255, 255, 255, 0.1);
                transform: translateX(-100%);
                transition: transform 0.3s ease;
              }
              
              &:hover {
                &::before {
                  transform: translateX(0);
                }
              }
            }
          }
        }
      }
    }
  }
}

// 动画效果
.fade-in {
  animation: fadeIn 0.5s ease-out;
}

.slide-up-in {
  animation: slideUpIn 0.5s ease-out;
}

.slide-in-left {
  animation: slideInLeft 0.5s ease-out;
}

.stagger-item {
  animation-delay: calc(var(--el-transition-duration) * 0.1 * var(--index, 0));
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUpIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

// 响应式适配
@media (max-width: 768px) {
  .process-selector-card {
    height: auto;
    min-height: calc(100vh - 120px);
    
    .bpm-card-header {
      flex-direction: column;
      gap: 12px;
      align-items: flex-start;
      
      .search-input {
        width: 100%;
      }
    }
  }
  
  .process-content {
    flex-direction: column;
  }
  
  .category-col {
    margin-bottom: 20px;
    border-right: none;
    border-bottom: 1px solid #f0f0f0;
    height: auto;
    max-height: 300px;
    
    .category-nav-container {
      max-height: 300px;
    }
  }
  
  .process-col {
    height: auto;
    min-height: 400px;
    position: relative;
    
    .process-scrollbar {
      height: auto;
      max-height: calc(100vh - 500px);
      min-height: 400px;
      overflow: auto;
      -webkit-overflow-scrolling: touch; /* 添加iOS流畅滚动支持 */
      
      :deep(.el-scrollbar__wrap) {
        overflow-x: hidden;
        overflow-y: auto !important; /* 强制显示垂直滚动 */
        height: 100% !important;
        max-height: inherit;
        scrollbar-width: thin; /* Firefox滚动条 */
        -ms-overflow-style: auto; /* IE滚动条 */
        touch-action: pan-y; /* 允许垂直触摸滚动 */
        
        &::-webkit-scrollbar {
          width: 4px; /* 为WebKit浏览器添加细滚动条 */
          display: block;
        }
        
        &::-webkit-scrollbar-thumb {
          background-color: rgba(144, 147, 153, 0.3);
          border-radius: 4px;
        }
      }
      
      :deep(.el-scrollbar__view) {
        min-height: 100%;
        height: auto;
        width: 100%;
      }
      
      :deep(.el-scrollbar__bar) {
        opacity: 0.3; /* 默认显示滚动条但透明度低 */
        display: block !important;
        z-index: 10;
      }
    }
    
    .process-sections {
      width: 100%;
      height: auto;
      overflow: visible;
    }
  }
  
  .process-section .process-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }
}
</style>
