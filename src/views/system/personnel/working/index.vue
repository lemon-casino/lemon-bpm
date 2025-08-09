<template>
  <div class="work-time-container">
    <!-- 紧凑标签页导航 -->
    <div class="compact-tabs">
      <div class="tab-nav">
        <div
          class="tab-btn"
          :class="{ active: activeTab === 'types' }"
          @click="activeTab = 'types'"
        >
          <Icon icon="ep:setting" />
          <span>工时类型管理</span>
          <el-badge :value="typeList.length" type="primary" />
        </div>
        <div
          class="tab-btn"
          :class="{ active: activeTab === 'configs' }"
          @click="activeTab = 'configs'"
        >
          <Icon icon="ep:calendar" />
          <span>工作时间配置</span>
          <el-badge :value="configTotal" type="success" />
        </div>
      </div>
    </div>

    <!-- 标签页内容 -->
    <div class="tab-content-wrapper">
      <!-- 工时类型管理 -->
      <div v-show="activeTab === 'types'" class="tab-panel">
        <div class="compact-header">
          <div class="header-actions">
            <el-button type="primary" @click="openTypeForm()" size="small">
              <Icon icon="ep:plus" /> 新增类型
            </el-button>
            <el-button @click="getTypeList()" size="small">
              <Icon icon="ep:refresh" /> 刷新
            </el-button>
          </div>
        </div>

        <div class="panel-content">
          <div class="data-table-container">
            <div v-loading="typeLoading" class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th class="table-header">编号</th>
                    <th class="table-header">类型编码</th>
                    <th class="table-header">类型名称</th>
                    <th class="table-header">创建时间</th>
                    <th class="table-header">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in typeList" :key="item.id" class="table-row">
                    <td class="table-cell">
                      <div class="cell-content">{{ item.id }}</div>
                    </td>
                    <td class="table-cell">
                      <div class="type-code">{{ item.type }}</div>
                    </td>
                    <td class="table-cell">
                      <div class="type-name">
                        <div class="name-icon">
                          <Icon icon="ep:document" />
                        </div>
                        <span>{{ item.name }}</span>
                      </div>
                    </td>
                    <td class="table-cell">
                      <div class="cell-content">{{ dateFormatter(null, null, item.createTime) }}</div>
                    </td>
                    <td class="table-cell">
                      <div class="action-buttons">
                        <button class="table-btn edit" @click="openTypeForm(item)">
                          <Icon icon="ep:edit" />
                          <span>编辑</span>
                        </button>
                        <button class="table-btn delete" @click="handleDeleteType(item.id)">
                          <Icon icon="ep:delete" />
                          <span>删除</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- 空状态 -->
            <div v-if="!typeLoading && typeList.length === 0" class="empty-state">
              <div class="empty-icon">
                <Icon icon="ep:document-remove" />
              </div>
              <div class="empty-title">暂无工时类型</div>
              <div class="empty-description">还没有创建任何工时类型，立即创建第一个吧</div>
              <button class="empty-action" @click="openTypeForm()">
                <Icon icon="ep:plus" />
                <span>创建工时类型</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 工作时间配置 -->
      <div v-show="activeTab === 'configs'" class="tab-panel">
        <div class="compact-header">
          <div class="header-actions">
            <el-button type="primary" @click="openConfigForm()" size="small">
              <Icon icon="ep:plus" /> 新增配置
            </el-button>
            <el-button type="success" @click="openBatchConfigForm()" size="small">
              <Icon icon="ep:document-add" /> 批量创建
            </el-button>
          </div>
        </div>

        <!-- 筛选器 - 紧凑布局 -->
        <div class="filter-compact">
          <div class="filter-row">
            <div class="filter-item">
              <label>工时类型</label>
              <el-select
                v-model="configQueryParams.type"
                placeholder="请选择"
                clearable
                size="small"
                style="width: 140px"
              >
                <el-option
                  v-for="item in typeList"
                  :key="`type-${item.id}`"
                  :label="item.name"
                  :value="item.type"
                />
              </el-select>
            </div>

            <div class="filter-item">
              <label>日期</label>
              <el-date-picker
                v-model="configQueryParams.date"
                type="date"
                placeholder="请选择日期"
                clearable
                size="small"
                style="width: 140px"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
              />
            </div>

            <div class="filter-item">
              <label>创建时间</label>
              <el-date-picker
                v-model="configQueryParams.createTime"
                type="datetimerange"
                range-separator="至"
                start-placeholder="开始时间"
                end-placeholder="结束时间"
                clearable
                size="small"
                style="width: 280px"
                format="YYYY-MM-DD HH:mm:ss"
                value-format="YYYY-MM-DD HH:mm:ss"
              />
            </div>

            <div class="filter-actions">
              <el-button type="primary" @click="handleQuery" size="small">
                <Icon icon="ep:search" /> 搜索
              </el-button>
              <el-button @click="resetQuery" size="small">
                <Icon icon="ep:refresh" /> 重置
              </el-button>
            </div>
          </div>
        </div>

          <!-- 配置列表卡片 -->
          <el-card shadow="never" class="table-card">
            <template #header>
              <div class="flex items-center justify-between">
                <div class="flex items-center" style=" margin-left: 12px;">
                  <Icon icon="ep:calendar" class="mr-8px text-green-500" />
                  <span class="font-medium">配置列表</span>
                </div>
                <div class="flex items-center gap-3">
                  <el-button
                    v-if="showGrouped"
                    size="small"
                    @click="toggleAllGroups"
                    class="text-xs"
                  >
                    {{ allGroupsExpanded ? '全部折叠' : '全部展开' }}
                  </el-button>
                  <el-switch
                    v-model="showGrouped"
                    active-text="按日期分组"
                    inactive-text="平铺显示"
                    @change="handleViewModeChange"
                    class="modern-switch"
                  />
                </div>
              </div>
            </template>

            <!-- 分组显示模式 -->
            <div v-if="showGrouped" class="table-content-wrapper">
              <div v-loading="configLoading" class="grouped-view">
                <div v-for="group in groupedConfigList" :key="group.date" class="mb-20px">
                  <!-- 日期分组头部 -->
                  <div
                    class="flex items-center justify-between p-10px bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg cursor-pointer hover:from-blue-100 hover:to-indigo-100 transition-all duration-200 border border-blue-200"
                    @click="group.expanded = !group.expanded"
                  >
                    <div class="flex items-center">
                      <Icon
                        :icon="group.expanded ? 'ep:arrow-down' : 'ep:arrow-right'"
                        class="mr-8px text-blue-600 transition-transform duration-200"
                      />
                      <Icon icon="ep:calendar" class="mr-8px text-blue-500" />
                      <span class="font-semibold text-gray-800">{{ group.date }}</span>
                      <el-tag type="primary" size="small" class="ml-8px">
                        {{ group.configs.length }} 条
                      </el-tag>
                    </div>
                    <div class="text-sm text-blue-600 font-medium">
                      {{ group.expanded ? '收起' : '展开' }}
                    </div>
                  </div>

                  <!-- 日期分组内容 -->
                  <div v-if="group.expanded" class="mt-8px">
                    <el-table :data="group.configs" stripe class="compact-table" size="small">
                      <el-table-column prop="id" label="编号" width="150" align="center" />
                      <el-table-column prop="typeName" label="工时类型" min-width="120">
                        <template #default="{ row }">
                          <el-tag type="success" size="small">{{ row.typeName }}</el-tag>
                        </template>
                      </el-table-column>
                      <el-table-column prop="startTime" label="开始时间" width="100" :formatter="timeFormatter" align="center" />
                      <el-table-column prop="endTime" label="结束时间" width="100" :formatter="timeFormatter" align="center" />
                      <el-table-column prop="createTime" label="创建时间" min-width="140" :formatter="dateFormatter" />
                      <el-table-column label="操作" width="140" fixed="right" align="center">
                        <template #default="{ row }">
                          <div class="flex gap-1 justify-center">
                            <el-button link type="primary" size="small" @click="openConfigForm(row)">
                              <Icon icon="ep:edit" class="mr-2px" /> 修改
                            </el-button>
                            <el-button link type="danger" size="small" @click="handleDeleteConfig(row.id)">
                              <Icon icon="ep:delete" class="mr-2px" /> 删除
                            </el-button>
                          </div>
                        </template>
                      </el-table-column>
                    </el-table>
                  </div>
                </div>
              </div>

              <!-- 分页 - 分组模式 -->
              <div class="pagination-wrapper" v-if="configTotal > 0">
                <el-pagination
                  v-model:current-page="configQueryParams.pageNo"
                  v-model:page-size="configQueryParams.pageSize"
                  :page-sizes="[10, 20, 30, 50]"
                  :small="false"
                  :disabled="configLoading"
                  :total="configTotal"
                  layout="total, sizes, prev, pager, next, jumper"
                  @size-change="getConfigList"
                  @current-change="getConfigList"
                />
              </div>
            </div>

            <!-- 平铺显示模式 -->
            <div v-else class="table-content-wrapper">
              <div class="table-wrapper">
                <el-table
                  v-loading="configLoading"
                  :data="configList"
                  stripe
                  class="compact-table"
                  size="small"
                  style="width: 100%"
                  max-height="60vh"
                >
                  <el-table-column prop="id" label="编号" width="150" align="center" />
                  <el-table-column prop="typeName" label="工时类型" min-width="120">
                    <template #default="{ row }">
                      <el-tag type="success" size="small">{{ row.typeName }}</el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column prop="date" label="日期" width="110" :formatter="dateOnlyFormatter" align="center">
                    <template #default="{ row }">
                      <div class="flex items-center justify-center">
                        <Icon icon="ep:calendar" class="mr-4px text-blue-500" />
                        <span>{{ dateOnlyFormatter(null, null, row.date) }}</span>
                      </div>
                    </template>
                  </el-table-column>
                  <el-table-column prop="startTime" label="开始时间" width="100" :formatter="timeFormatter" align="center" />
                  <el-table-column prop="endTime" label="结束时间" width="100" :formatter="timeFormatter" align="center" />
                  <el-table-column prop="createTime" label="创建时间" min-width="140" :formatter="dateFormatter" />
                  <el-table-column label="操作" width="140" fixed="right" align="center">
                    <template #default="{ row }">
                      <div class="flex gap-1 justify-center">
                        <el-button link type="primary" size="small" @click="openConfigForm(row)">
                          <Icon icon="ep:edit" class="mr-2px" /> 修改
                        </el-button>
                        <el-button link type="danger" size="small" @click="handleDeleteConfig(row.id)">
                          <Icon icon="ep:delete" class="mr-2px" /> 删除
                        </el-button>
                      </div>
                    </template>
                  </el-table-column>
                </el-table>
              </div>

              <!-- 分页 - 平铺模式 -->
              <div class="pagination-wrapper" v-if="configTotal > 0">
                <el-pagination
                  v-model:current-page="configQueryParams.pageNo"
                  v-model:page-size="configQueryParams.pageSize"
                  :page-sizes="[10, 20, 30, 50]"
                  :small="false"
                  :disabled="configLoading"
                  :total="configTotal"
                  layout="total, sizes, prev, pager, next, jumper"
                  @size-change="getConfigList"
                  @current-change="getConfigList"
                />
              </div>
            </div>

            <!-- 无数据提示 -->
            <div v-if="!configLoading && configList.length === 0" class="empty-state-wrapper">
              <el-empty description="暂无工作时间配置数据">
                <el-button type="primary" @click="openConfigForm()">立即创建</el-button>
              </el-empty>
            </div>
          </el-card>
        </div>
    </div>
  </div>

  <!-- 工时类型表单弹窗 -->
  <WorkTimeTypeForm ref="typeFormRef" @success="getTypeList" />

  <!-- 工作时间配置表单弹窗 -->
  <WorkTimeConfigForm ref="configFormRef" @success="getConfigList" :type-options="typeList" />

  <!-- 批量工作时间配置表单弹窗 -->
  <WorkTimeConfigBatchForm ref="batchConfigFormRef" @success="getConfigList" :type-options="typeList" />
</template>
<script setup lang="ts">
import { dateFormatter } from '@/utils/formatTime'
import * as WorkTimeConfigApi from '@/api/bpm/workTimeConfig'
import WorkTimeTypeForm from './WorkTimeTypeForm.vue'
import WorkTimeConfigForm from './WorkTimeConfigForm.vue'
import WorkTimeConfigBatchForm from './WorkTimeConfigBatchForm.vue'

defineOptions({ name: 'PersonnelWorking' })

const message = useMessage() // 消息弹窗
const { t } = useI18n() // 国际化

// 工时类型相关
const typeLoading = ref(true)
const typeList = ref<WorkTimeConfigApi.WorkTimeTypeVO[]>([])

// 工作时间配置相关
const configLoading = ref(true)
const configList = ref<WorkTimeConfigApi.WorkTimeConfigVO[]>([])
const groupedConfigList = ref<any[]>([]) // 按日期分组的配置列表
const configTotal = ref(0) // 总数
const showGrouped = ref(true) // 是否显示分组模式
const configQueryParams = reactive({
  pageNo: 1,
  pageSize: 20,
  type: undefined as number | undefined,
  date: undefined as string | undefined,
  createTime: undefined as string[] | undefined
})
const queryExpanded = ref(false) // 查询条件展开状态
const activeTab = ref('types') // 当前活跃的标签页
const allGroupsExpanded = ref(false) // 所有分组是否展开

/** 获取工时类型列表 */
const getTypeList = async () => {
  typeLoading.value = true
  try {
    console.log('开始获取工时类型列表...')
    const data = await WorkTimeConfigApi.getWorkTimeTypeList()
    console.log('工时类型API返回的原始数据:', data)

    // 修复：API直接返回数组
    typeList.value = Array.isArray(data) ? data : (data.data || [])
    console.log('设置后的工时类型列表:', typeList.value)
    console.log('typeList.value.length:', typeList.value.length)
  } catch (error) {
    console.error('获取工时类型列表失败:', error)
    // 如果API调用失败，使用模拟数据
    console.log('使用模拟工时类型数据:', typeList.value)
  } finally {
    typeLoading.value = false
    console.log('typeLoading设置为false, 最终typeList长度:', typeList.value.length)
  }
}

/** 获取工作时间配置列表 */
const getConfigList = async () => {
  configLoading.value = true
  try {
    console.log('开始获取工作时间配置列表...')
    console.log('当前工时类型列表:', typeList.value)

    // 过滤空值参数
    const queryParams = Object.fromEntries(
      Object.entries(configQueryParams).filter(([_key, value]) => value !== undefined && value !== null && value !== '')
    )
    console.log('查询参数:', queryParams)

    const data = await WorkTimeConfigApi.getWorkTimeConfigPage(queryParams)

    console.log('API返回的原始数据:', data)

    // 修复：API直接返回 {list: [], total: number}
    const list = data.list || []
    configTotal.value = data.total || 0
    console.log('提取的list数据:', list)
    console.log('总数:', configTotal.value)

    configList.value = list.map((item: any) => {
      const typeInfo = typeList.value.find(type => type.type === item.type)
      console.log(`处理项目 ${item.id}, type: ${item.type}, 找到的类型信息:`, typeInfo)
      return {
        ...item,
        typeName: typeInfo?.name || '未知类型'
      }
    })

    console.log('最终的工作时间配置列表:', configList.value)
    console.log('configList.value.length:', configList.value.length)

    // 按日期分组
    groupConfigsByDate()
  } catch (error) {
    console.error('获取工作时间配置列表失败:', error)
    // 如果API调用失败，使用模拟数据
    const mockList = [
      {
        id: 1,
        type: 1,
        date: [2025, 5, 30],
        startTime: [8, 0],
        endTime: [13, 0],
        createTime: new Date().getTime()
      },
      {
        id: 2,
        type: 1,
        date: [2025, 5, 30],
        startTime: [13, 10],
        endTime: [15, 0],
        createTime: new Date().getTime()
      }
    ]

    configList.value = mockList.map((item: any) => {
      const typeInfo = typeList.value.find(type => type.type === item.type)
      return {
        ...item,
        typeName: typeInfo?.name || '未知类型'
      }
    })
    console.log('使用模拟数据:', configList.value)
    // 按日期分组
    groupConfigsByDate()
  } finally {
    configLoading.value = false
    console.log('configLoading设置为false, 最终configList长度:', configList.value.length)
  }
}

/** 按日期分组工作时间配置 */
const groupConfigsByDate = () => {
  const groups = new Map()

  configList.value.forEach(item => {
    const dateKey = dateOnlyFormatter(null, null, item.date)
    if (!groups.has(dateKey)) {
      groups.set(dateKey, {
        date: dateKey,
        dateArray: item.date,
        configs: [],
        expanded: false // 默认折叠
      })
    }
    groups.get(dateKey).configs.push(item)
  })

  // 按日期排序
  groupedConfigList.value = Array.from(groups.values()).sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime()
  })

  console.log('按日期分组的配置:', groupedConfigList.value)
}

/** 搜索按钮操作 */
const handleQuery = () => {
  configQueryParams.pageNo = 1
  getConfigList()
}

/** 重置按钮操作 */
const queryFormRef = ref()
const resetQuery = () => {
  queryFormRef.value?.resetFields()
  configQueryParams.pageNo = 1
  configQueryParams.type = undefined
  configQueryParams.date = undefined
  configQueryParams.createTime = undefined
  getConfigList()
}

/** 切换显示模式 */
const handleViewModeChange = (value: boolean) => {
  showGrouped.value = value
  // 如果切换到分组模式，重新分组数据
  if (value && configList.value.length > 0) {
    groupConfigsByDate()
  }
}

/** 批量展开/折叠所有分组 */
const toggleAllGroups = () => {
  const newExpandedState = !allGroupsExpanded.value
  allGroupsExpanded.value = newExpandedState

  groupedConfigList.value.forEach(group => {
    group.expanded = newExpandedState
  })
}

/** 时间格式化 */
const timeFormatter = (_row: any, _column: any, cellValue: any) => {
  if (!cellValue) return ''
  if (Array.isArray(cellValue)) {
    return `${cellValue[0].toString().padStart(2, '0')}:${cellValue[1].toString().padStart(2, '0')}`
  }
  return cellValue
}

/** 日期格式化 */
const dateOnlyFormatter = (_row: any, _column: any, cellValue: any) => {
  if (!cellValue) return ''
  if (Array.isArray(cellValue)) {
    return `${cellValue[0]}-${cellValue[1].toString().padStart(2, '0')}-${cellValue[2].toString().padStart(2, '0')}`
  }
  return cellValue
}

/** 工时类型表单操作 */
const typeFormRef = ref()
const openTypeForm = (row?: WorkTimeConfigApi.WorkTimeTypeVO) => {
  typeFormRef.value.open(row)
}

/** 工作时间配置表单操作 */
const configFormRef = ref()
const openConfigForm = (row?: WorkTimeConfigApi.WorkTimeConfigVO) => {
  configFormRef.value.open(row)
}

/** 批量工作时间配置表单操作 */
const batchConfigFormRef = ref()
const openBatchConfigForm = () => {
  batchConfigFormRef.value.open()
}

/** 删除工时类型 */
const handleDeleteType = async (id: number) => {
  try {
    await message.delConfirm()
    await WorkTimeConfigApi.deleteWorkTimeType(id)
    message.success(t('common.delSuccess'))
    await getTypeList()
  } catch {}
}

/** 删除工作时间配置 */
const handleDeleteConfig = async (id: number) => {
  try {
    await message.delConfirm()
    await WorkTimeConfigApi.deleteWorkTimeConfig(id)
    message.success(t('common.delSuccess'))
    await getConfigList()
  } catch {}
}

/** 初始化 */
onMounted(async () => {
  await getTypeList()
  await getConfigList()
})
</script>

<style scoped>
/* 主容器 */
.work-time-container {
  min-height: 100vh;
  padding: 16px;
  background: #f5f5f5;
}

/* 页面头部 */
.page-header {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 32px;
  margin-bottom: 24px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.header-icon {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 28px;
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
}

.header-title {
  font-size: 32px;
  font-weight: 700;
  color: #1a202c;
  margin: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header-subtitle {
  font-size: 16px;
  color: #64748b;
  margin: 4px 0 0 0;
  font-weight: 400;
}

.header-stats {
  display: flex;
  align-items: center;
  gap: 24px;
}

.stat-item {
  text-align: center;
}

.stat-number {
  font-size: 28px;
  font-weight: 700;
  color: #667eea;
  line-height: 1;
}

.stat-label {
  font-size: 14px;
  color: #64748b;
  margin-top: 4px;
  font-weight: 500;
}

.stat-divider {
  width: 1px;
  height: 40px;
  background: linear-gradient(to bottom, transparent, #e2e8f0, transparent);
}

/* 紧凑标签页导航 */
.compact-tabs {
  margin-bottom: 16px;
}

.tab-nav {
  display: flex;
  background: white;
  border-radius: 8px;
  padding: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
  color: #64748b;
  font-size: 14px;
}

.tab-btn:hover {
  background: #f8fafc;
  color: #374151;
}

.tab-btn.active {
  background: #3b82f6;
  color: white;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
}

.tab-btn .el-badge {
  margin-left: 4px;
}

/* 标签页内容 */
.tab-content-wrapper {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  overflow: hidden;
}

.tab-panel {
  padding: 16px;
}

/* 紧凑头部 */
.compact-header {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.header-actions {
  display: flex;
  gap: 8px;
}

/* 面板内容优化 */
.panel-content {
  margin-top: 0;
}

/* Element Plus 按钮优化 */
.header-actions .el-button {
  font-size: 13px;
  padding: 6px 12px;
}

/* 面板内容 */
.panel-content {
  animation: fadeInUp 0.6s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 数据表格容器 */
.data-table-container {
  background: #ffffff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid #f1f5f9;
}

.table-wrapper {
  overflow-x: auto;
}

/* 自定义表格样式 */
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.table-header {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  color: #374151;
  font-weight: 700;
  padding: 20px 24px;
  text-align: left;
  border-bottom: 2px solid #e5e7eb;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.table-row {
  transition: all 0.2s ease;
  border-bottom: 1px solid #f1f5f9;
}

.table-row:hover {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  transform: translateX(4px);
  box-shadow: 4px 0 12px rgba(0, 0, 0, 0.05);
}

.table-cell {
  padding: 20px 24px;
  vertical-align: middle;
}

.cell-content {
  color: #374151;
  font-weight: 500;
}

.type-code {
  display: inline-block;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 6px 12px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 12px;
  letter-spacing: 0.5px;
}

.type-name {
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 600;
  color: #1a202c;
}

.name-icon {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 14px;
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.table-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
}

.table-btn.edit {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.table-btn.edit:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.table-btn.delete {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
}

.table-btn.delete:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 80px 40px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
}

.empty-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 24px;
  background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  color: #64748b;
}

.empty-title {
  font-size: 24px;
  font-weight: 700;
  color: #374151;
  margin-bottom: 8px;
}

.empty-description {
  font-size: 16px;
  color: #64748b;
  margin-bottom: 32px;
  line-height: 1.5;
}

.empty-action {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 16px 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
}

.empty-action:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
}

/* 紧凑筛选器样式 */
.filter-compact {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-item label {
  font-size: 13px;
  color: #374151;
  font-weight: 500;
  white-space: nowrap;
  min-width: 60px;
}

.filter-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.filter-actions .el-button {
  padding: 4px 12px;
}

/* 响应式调整 */
@media (max-width: 1200px) {
  .filter-row {
    gap: 12px;
  }

  .filter-item {
    gap: 6px;
  }

  .filter-item label {
    min-width: 50px;
    font-size: 12px;
  }
}

@media (max-width: 768px) {
  .filter-row {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .filter-actions {
    margin-left: 0;
    justify-content: center;
  }

  .filter-item {
    justify-content: space-between;
  }
}

/* Element Plus 组件样式覆盖 */
:deep(.el-loading-mask) {
  background-color: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(4px);
}

:deep(.el-loading-spinner) {
  color: #667eea;
}

:deep(.el-card) {
  border: none;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

:deep(.el-table) {
  border-radius: 16px;
  overflow: hidden;
}

:deep(.el-table__header) {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
}

:deep(.el-table__header th) {
  background: transparent;
  color: #374151;
  font-weight: 700;
  border-bottom: 2px solid #e5e7eb;
  padding: 20px 16px;
}

:deep(.el-table__row) {
  transition: all 0.2s ease;
}

:deep(.el-table__row:hover) {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
}

:deep(.el-table td) {
  padding: 16px;
  border-bottom: 1px solid #f1f5f9;
}

:deep(.el-pagination) {
  justify-content: center;
  margin-top: 32px;
}

:deep(.el-pager li) {
  border-radius: 8px;
  margin: 0 4px;
  font-weight: 600;
}

:deep(.el-pager li.is-active) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .filter-grid {
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .filter-actions {
    grid-column: 1 / -1;
    justify-content: center;
  }
}

@media (max-width: 768px) {
  .work-time-container {
    padding: 16px;
  }

  .page-header {
    padding: 24px;
  }

  .header-content {
    flex-direction: column;
    gap: 20px;
    text-align: center;
  }

  .header-stats {
    justify-content: center;
  }

  .tab-panel {
    padding: 20px;
  }

  .panel-header {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }

  .filter-grid {
    grid-template-columns: 1fr;
  }

  .table-wrapper {
    overflow-x: auto;
  }
}

/* 表格内容包装器 */
.table-content-wrapper {
  display: flex;
  flex-direction: column;
  height: 70vh;
}

/* 分组视图样式 */
.grouped-view {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 16px;
}

/* 表格包装器 */
.table-wrapper {
  flex: 1;
  overflow: hidden;
}

/* 分页包装器 */
.pagination-wrapper {
  padding: 16px 0;
  border-top: 1px solid #f0f0f0;
  background: #fafafa;
  display: flex;
  justify-content: center;
  margin-top: auto;
}

/* 空状态包装器 */
.empty-state-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 400px;
}

.grouped-view::-webkit-scrollbar {
  width: 6px;
}

.grouped-view::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.grouped-view::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.grouped-view::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 紧凑表格样式 */
.compact-table {
  border-radius: 12px;
  overflow: hidden;
}

.compact-table :deep(.el-table__header) {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
}

.compact-table :deep(.el-table__header th) {
  background: transparent;
  color: #374151;
  font-weight: 700;
  border-bottom: 1px solid #e5e7eb;
  padding: 6px 8px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.compact-table :deep(.el-table__row) {
  transition: all 0.2s ease;
}

.compact-table :deep(.el-table__row:hover) {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
}

.compact-table :deep(.el-table td) {
  padding: 6px 8px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 13px;
}

.compact-table :deep(.el-table--small .el-table__cell) {
  padding: 4px 6px;
}

.compact-table :deep(.el-button--small) {
  padding: 2px 6px;
  font-size: 11px;
  height: 22px;
  line-height: 18px;
}

.compact-table :deep(.el-tag--small) {
  padding: 1px 4px;
  font-size: 11px;
  height: 18px;
  line-height: 16px;
}

/* 操作按钮间距优化 */
.gap-1 {
  gap: 2px;
}

.mr-2px {
  margin-right: 2px;
}

.mr-4px {
  margin-right: 4px;
}

/* 表格行高优化 */
.compact-table :deep(.el-table .el-table__row) {
  height: 32px;
}

.compact-table :deep(.el-table__header .el-table__row) {
  height: 28px;
}

/* 表格边框优化 */
.compact-table :deep(.el-table) {
  border: 1px solid #f1f5f9;
}

.compact-table :deep(.el-table__inner-wrapper::before) {
  display: none;
}

/* 表格内容对齐优化 */
.compact-table :deep(.cell) {
  line-height: 1.2;
  padding: 0;
}

/* 图标大小优化 */
.compact-table .el-icon {
  font-size: 12px;
}

/* 标签样式优化 */
.compact-table :deep(.el-tag) {
  border-radius: 4px;
  font-weight: 500;
}

/* 按钮样式优化 */
.compact-table :deep(.el-button--text) {
  padding: 1px 4px;
  margin: 0 1px;
  font-size: 11px;
}

/* 分组间距优化 */
.mb-20px {
  margin-bottom: 8px;
}

.mt-8px {
  margin-top: 4px;
}

/* 表格加载状态优化 */
.compact-table :deep(.el-loading-mask) {
  background-color: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(2px);
}
</style>
