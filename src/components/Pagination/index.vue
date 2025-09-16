<!-- 基于 ruoyi-vue3 的 Pagination 重构，核心是简化无用的属性，并使用 ts 重写 -->
<template>
  <el-pagination
    v-show="total > 0"
    v-model:current-page="currentPage"
    v-model:page-size="pageSize"
    :background="true"
    :page-sizes="pageSizeOptions"
    :pager-count="pagerCount"
    :total="total"
    :small="isSmall"
    :class="paginationClass"
    :layout="paginationLayout"
    @size-change="handleSizeChange"
    @current-change="handleCurrentChange"
  />
</template>
<script lang="ts" setup>
import { computed, watchEffect, ref, onMounted, onUnmounted } from 'vue'
import { useAppStore } from '@/store/modules/app'

defineOptions({ name: 'Pagination' })

// 此处解决了当全局size为small的时候分页组件样式太大的问题
const appStore = useAppStore()
const layoutCurrentSize = computed(() => appStore.currentSize)
const isSmall = ref<boolean>(layoutCurrentSize.value === 'small')
watchEffect(() => {
  isSmall.value = layoutCurrentSize.value === 'small'
})

// 响应式屏幕尺寸检测
const isMobile = ref<boolean>(false)
const isTablet = ref<boolean>(false)

const checkScreenSize = () => {
  const width = window.innerWidth
  isMobile.value = width < 768
  isTablet.value = width >= 768 && width < 1024
}

onMounted(() => {
  checkScreenSize()
  window.addEventListener('resize', checkScreenSize)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkScreenSize)
})

const props = defineProps({
  // 总条目数
  total: {
    required: true,
    type: Number
  },
  // 当前页数：pageNo
  page: {
    type: Number,
    default: 1
  },
  // 每页显示条目个数：pageSize
  limit: {
    type: Number,
    default: 20
  },
  // 设置最大页码按钮数。 页码按钮的数量，当总页数超过该值时会折叠
  // 移动端页码按钮的数量端默认值 5
  pagerCount: {
    type: Number,
    default: 5
  }
})

const emit = defineEmits(['update:page', 'update:limit', 'pagination'])

// 计算属性：根据屏幕尺寸动态调整分页器数量
const pagerCount = computed(() => {
  // 如果传入了固定的pagerCount，则使用传入的值
  if (props.pagerCount) {
    return props.pagerCount
  }
  // 否则根据屏幕尺寸动态调整
  if (isMobile.value) return 3
  if (isTablet.value) return 5
  return 7
})

// 计算属性：根据屏幕尺寸动态调整页面大小选项
const pageSizeOptions = computed(() => {
  if (isMobile.value) {
    return [10, 20, 50]
  }
  if (isTablet.value) {
    return [10, 20, 30, 50, 100]
  }
  return [12, 24, 36, 48, 60, 120, 240,360,600,1200]
})

// 计算属性：根据屏幕尺寸动态调整布局
const paginationLayout = computed(() => {
  if (isMobile.value) {
    return 'prev, pager, next'
  }
  if (isTablet.value) {
    return 'total, prev, pager, next, sizes'
  }
  return 'total, sizes, prev, pager, next, jumper'
})

// 计算属性：根据屏幕尺寸动态调整样式类
const paginationClass = computed(() => {
  const baseClass = 'mb-15px mt-15px'
  if (isMobile.value) {
    return `${baseClass} mobile-pagination`
  }
  if (isTablet.value) {
    return `${baseClass} tablet-pagination`
  }
  return `${baseClass} float-right`
})

const currentPage = computed({
  get() {
    return props.page
  },
  set(val) {
    // 触发 update:page 事件，更新 limit 属性，从而更新 pageNo
    emit('update:page', val)
  }
})
const pageSize = computed({
  get() {
    return props.limit
  },
  set(val) {
    // 触发 update:limit 事件，更新 limit 属性，从而更新 pageSize
    emit('update:limit', val)
  }
})
const handleSizeChange = (val) => {
  // 如果修改后超过最大页面，强制跳转到第 1 页
  if (currentPage.value * val > props.total) {
    currentPage.value = 1
  }
  // 触发 pagination 事件，重新加载列表
  emit('pagination', { page: currentPage.value, limit: val })
}
const handleCurrentChange = (val) => {
  // 触发 pagination 事件，重新加载列表
  emit('pagination', { page: val, limit: pageSize.value })
}
</script>

<style scoped>
/* 移动端适配样式 */
.mobile-pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
}

.mobile-pagination :deep(.el-pagination) {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
}

.mobile-pagination :deep(.el-pagination .el-pager) {
  margin: 0 5px;
}

.mobile-pagination :deep(.el-pagination .el-pager li) {
  min-width: 28px;
  height: 28px;
  line-height: 28px;
  font-size: 12px;
}

.mobile-pagination :deep(.el-pagination .btn-prev),
.mobile-pagination :deep(.el-pagination .btn-next) {
  min-width: 28px;
  height: 28px;
  line-height: 28px;
  padding: 0 4px;
}

/* 平板端适配样式 */
.tablet-pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.tablet-pagination :deep(.el-pagination) {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.tablet-pagination :deep(.el-pagination .el-pagination__total) {
  margin-right: 10px;
  font-size: 13px;
}

.tablet-pagination :deep(.el-pagination .el-pagination__sizes) {
  margin: 0 10px;
}

.tablet-pagination :deep(.el-pagination .el-select .el-input) {
  width: 100px;
}

/* 响应式布局 */
@media (max-width: 767px) {
  .mobile-pagination :deep(.el-pagination) {
    padding: 5px 0;
  }
  
  .mobile-pagination :deep(.el-pagination .el-pager li) {
    margin: 0 2px;
  }
}

@media (min-width: 768px) and (max-width: 1023px) {
  .tablet-pagination :deep(.el-pagination) {
    padding: 8px 0;
  }
}

/* 确保在小屏幕上分页组件不会溢出 */
@media (max-width: 480px) {
  .mobile-pagination {
    padding: 0 10px;
  }
  
  .mobile-pagination :deep(.el-pagination .el-pager li) {
    min-width: 24px;
    height: 24px;
    line-height: 24px;
    font-size: 11px;
    margin: 0 1px;
  }
  
  .mobile-pagination :deep(.el-pagination .btn-prev),
  .mobile-pagination :deep(.el-pagination .btn-next) {
    min-width: 24px;
    height: 24px;
    line-height: 24px;
    padding: 0 2px;
  }
}
</style>
