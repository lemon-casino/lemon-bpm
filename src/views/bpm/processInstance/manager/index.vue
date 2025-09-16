<template>
  <doc-alert title="工作流手册" url="https://doc.iocoder.cn/bpm/" />

  <ContentWrap>
    <!-- 模式切换 -->
    <div class="mb-10px flex justify-between items-center">
      <div>
        <el-radio-group v-model="viewMode" @change="handleModeChange" size="large">
          <el-radio-button label="instance">
            <Icon icon="ep:grid" class="mr-5px" /> 实例模式
          </el-radio-button>
          <el-radio-button label="data">
            <Icon icon="ep:data-line" class="mr-5px" /> 数据模式
          </el-radio-button>
        </el-radio-group>
        <el-tag class="ml-10px" type="info" effect="plain" size="small">
          {{ viewMode === 'instance' ? '查看流程实例详细信息' : '以表格形式查看流程变量数据' }}
        </el-tag>
      </div>
      <div v-if="viewMode === 'data'">
        <el-tooltip content="导出当前数据为Excel文件" placement="top">
          <el-button type="primary" :loading="exportLoading" @click="handleExportOptions">
            <Icon icon="ep:download" class="mr-5px" /> 导出
          </el-button>
        </el-tooltip>
      </div>
    </div>

    <!-- 搜索工作栏 -->
    <el-form
      class="-mb-15px"
      :model="queryParams"
      ref="queryFormRef"
      :inline="true"
      label-width="68px"
    >
      <el-form-item label="发起人" prop="startUserId">
        <el-select v-model="queryParams.startUserId" placeholder="请选择发起人"  filterable clearable class="!w-240px">
          <el-option
            v-for="user in userList"
            :key="user.id"
            :label="user.nickname"
            :value="user.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="流程名称" prop="name">
        <el-input
          v-model="queryParams.name"
          placeholder="请输入流程名称"
          clearable
          @keyup.enter="handleQuery"
          class="!w-240px"
        />
      </el-form-item>
      <el-form-item label="所属流程" prop="processDefinitionKey">
        <el-input
          v-model="queryParams.processDefinitionKey"
          placeholder="请输入流程定义的标识"
          clearable
          @keyup.enter="handleQuery"
          class="!w-240px"
        />
      </el-form-item>
      <el-form-item label="流程分类" prop="category">
        <el-select
          v-model="queryParams.category"
          placeholder="请选择流程分类"
          clearable
          class="!w-240px"
        >
          <el-option
            v-for="category in categoryList"
            :key="category.code"
            :label="category.name"
            :value="category.code"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="流程状态" prop="status">
        <el-select
          v-model="queryParams.status"
          placeholder="请选择流程状态"
          clearable
          class="!w-240px"
        >
          <el-option
            v-for="dict in getIntDictOptions(DICT_TYPE.BPM_PROCESS_INSTANCE_STATUS)"
            :key="dict.value"
            :label="dict.label"
            :value="dict.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="发起时间" prop="createTime">
        <el-date-picker
          v-model="queryParams.createTime"
          value-format="YYYY-MM-DD HH:mm:ss"
          type="daterange"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          :default-time="[new Date('1 00:00:00'), new Date('1 23:59:59')]"
          class="!w-240px"
        />
      </el-form-item>
      <el-form-item>
        <el-button @click="handleQuery"><Icon icon="ep:search" class="mr-5px" /> 搜索</el-button>
        <el-button @click="resetQuery"><Icon icon="ep:refresh" class="mr-5px" /> 重置</el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <!-- 实例模式列表 -->
  <ContentWrap v-if="viewMode === 'instance'">
    <el-table
      v-loading="loading"
      :data="list"
      border
      stripe
      highlight-current-row
      style="width: 100%"
      table-layout="fixed"
      :height="tableHeight"
      :header-cell-style="{ backgroundColor: '#f8f9fa', fontWeight: '600' }"
      :scrollbar-always-on="true"
      :scroll-x="true"
    >
      <el-table-column label="流程名称" align="center" prop="name" min-width="200px" fixed="left" show-overflow-tooltip />
      <el-table-column
        label="流程分类"
        align="center"
        prop="categoryName"
        width="100"
        fixed="left"
      />
      <!-- 版本号列移到右侧 -->
      <el-table-column label="流程发起人" align="center" prop="startUser.nickname" width="120" />
      <el-table-column label="发起部门" align="center" prop="startUser.deptName" width="120" />
      <el-table-column label="流程状态" prop="status" width="120">
        <template #default="scope">
          <dict-tag :type="DICT_TYPE.BPM_PROCESS_INSTANCE_STATUS" :value="scope.row.status" />
        </template>
      </el-table-column>
      <el-table-column
        label="发起时间"
        align="center"
        prop="startTime"
        width="180"
        :formatter="dateFormatter"
      />
      <el-table-column
        label="结束时间"
        align="center"
        prop="endTime"
        width="180"
        :formatter="dateFormatter"
      />
      <el-table-column align="center" label="耗时" prop="durationInMillis" width="169">
        <template #default="scope">
          {{ scope.row.durationInMillis > 0 ? formatPast2(scope.row.durationInMillis) : '-' }}
        </template>
      </el-table-column>
      <el-table-column label="当前审批任务" align="center" prop="tasks" min-width="120px">
        <template #default="scope">
          <el-button type="primary" v-for="task in scope.row.tasks" :key="task.id" link>
            <span>{{ task.name }}</span>
          </el-button>
        </template>
      </el-table-column>
      <el-table-column label="运行时长" align="center" min-width="180px">
        <template #default="scope">
          <div v-if="scope.row.tasks && scope.row.tasks.length > 0">
            <div v-for="task in scope.row.tasks" :key="task.id" class="mb-5px">
              <el-tooltip :content="formatTaskCreateTime(task.createTime)" placement="top">
                <span>{{ task.name }}: {{ calculateTaskRunningTime(task.createTime) }}</span>
              </el-tooltip>
            </div>
          </div>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="运行时间" align="center" min-width="180px">
        <template #default="scope">
          <div v-if="scope.row.tasks && scope.row.tasks.length > 0">
            <div v-for="task in scope.row.tasks" :key="task.id" class="mb-5px">
              <span>{{ task.name }}: {{ formatTaskCreateTime(task.createTime) }}</span>
            </div>
          </div>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="流程编号" align="center" prop="id" min-width="320px" />
      <el-table-column
        label="版本号"
        align="center"
        width="80"
        fixed="right"
      >
        <template #default="scope">
          {{ scope.row.processDefinitionId ? scope.row.processDefinitionId.split(':')[1] : '-' }}
        </template>
      </el-table-column>
      <el-table-column label="操作" align="center" fixed="right" width="180">
        <template #default="scope">
          <el-button
            link
            type="primary"
            v-hasPermi="['bpm:process-instance:cancel']"
            @click="handleDetail(scope.row)"
          >
            详情
          </el-button>
          <el-button
            link
            type="primary"
            v-if="scope.row.status === 1"
            v-hasPermi="['bpm:process-instance:query']"
            @click="handleCancel(scope.row)"
          >
            取消
          </el-button>
          <el-button
            link
            type="danger"
            v-hasPermi="['bpm:process-instance:delete']"
            @click="handleDelete(scope.row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    <!-- 分页 -->
    <Pagination
      :total="total"
      v-model:page="queryParams.pageNo"
      v-model:limit="queryParams.pageSize"
      @pagination="getList"
    />
  </ContentWrap>

  <!-- 数据模式列表 -->
  <ContentWrap v-else>
    <div class="mb-5px">
      <div v-if="summaryColumns.length > 0" class="data-mode-status">
        <div class="status-main">
          <Icon icon="ep:success-filled" class="text-green-500 mr-5px" />
          <span class="font-medium">数据模式</span>
          <span class="text-gray-600 ml-5px">显示 {{ summaryColumns.length }} 个有效字段</span>
          <span v-if="totalFieldsCount > summaryColumns.length" class="text-gray-500 text-sm ml-5px">
            ({{ totalFieldsCount - summaryColumns.length }} 个已隐藏)
          </span>
        </div>
        <div class="status-actions">
          <el-button type="primary" link @click="handleViewAllFields" size="small">
            <Icon icon="ep:setting" class="mr-5px" />字段管理
          </el-button>
        </div>
      </div>
      <div v-else class="data-mode-status error">
        <div class="status-main">
          <Icon icon="ep:warning-filled" class="text-orange-500 mr-5px" />
          <span class="font-medium">未找到有效数据</span>
          <span class="text-gray-600 ml-5px text-sm">请检查流程表单变量设置</span>
        </div>
      </div>
    </div>

    <div class="table-wrapper">
      <el-table
        v-loading="loading"
        :data="list"
        border
        stripe
        highlight-current-row
        style="width: 100%"
        table-layout="fixed"
        :height="tableHeight"
        :header-cell-style="{ backgroundColor: '#f8f9fa', fontWeight: '600' }"
        :scrollbar-always-on="true"
        :scroll-x="true"
        :show-overflow-tooltip="false"
      >
        <el-table-column type="expand">
          <template #default="props">
            <el-descriptions title="流程实例详情" :column="3" border>
              <el-descriptions-item label="流程编号" :span="3">{{ props.row.id }}</el-descriptions-item>

              <el-descriptions-item label="流程名称">{{ props.row.name }}</el-descriptions-item>
              <el-descriptions-item label="流程分类">{{ props.row.categoryName }}</el-descriptions-item>
              <el-descriptions-item label="流程状态">
                <dict-tag :type="DICT_TYPE.BPM_PROCESS_INSTANCE_STATUS" :value="props.row.status" />
              </el-descriptions-item>
              <el-descriptions-item label="发起人">{{ props.row.startUser?.nickname }}</el-descriptions-item>
              <el-descriptions-item label="发起部门">{{ props.row.startUser?.deptName }}</el-descriptions-item>
              <el-descriptions-item label="发起时间">{{ dateFormatter(null, null, props.row.startTime) }}</el-descriptions-item>
              <el-descriptions-item label="结束时间">{{ props.row.endTime ? dateFormatter(null, null, props.row.endTime) : '-' }}</el-descriptions-item>
              <el-descriptions-item label="当前任务" :span="1">
                <el-tag
                  v-for="task in props.row.tasks"
                  :key="task.id"
                  type="success"
                  class="mr-5px mb-5px"
                >
                  {{ task.name }}
                </el-tag>
                <span v-if="!props.row.tasks || props.row.tasks.length === 0">-</span>
              </el-descriptions-item>
              <el-descriptions-item label="运行时长" :span="1">
                <div v-if="props.row.tasks && props.row.tasks.length > 0">
                  <div v-for="task in props.row.tasks" :key="task.id" class="mb-5px">
                    {{ task.name }}: {{ calculateTaskRunningTime(task.createTime) }}
                    <el-tooltip :content="formatTaskCreateTime(task.createTime)" placement="top">
                      <Icon icon="ep:info-filled" class="ml-5px text-gray-400" />
                    </el-tooltip>
                  </div>
                </div>
                <span v-else>-</span>
              </el-descriptions-item>
              <el-descriptions-item label="运行时间" :span="1">
                <div v-if="props.row.tasks && props.row.tasks.length > 0">
                  <div v-for="task in props.row.tasks" :key="task.id" class="mb-5px">
                    {{ task.name }}: {{ formatTaskCreateTime(task.createTime) }}
                  </div>
                </div>
                <span v-else>-</span>
              </el-descriptions-item>
              <el-descriptions-item label="版本号" :span="1">{{ props.row.processDefinitionId ? props.row.processDefinitionId.split(':')[1] : '-' }}</el-descriptions-item>
            </el-descriptions>
          </template>
        </el-table-column>
        <el-table-column type="index" width="50" fixed="left" />
        <el-table-column label="流程名称" align="center" prop="name" min-width="200px" show-overflow-tooltip fixed="left" />
        <el-table-column
          label="流程分类"
          align="center"
          prop="categoryName"
          width="100"
          fixed="left"
        />
        <!-- 版本号列移到右侧 -->
        <el-table-column label="流程发起人" align="center" prop="startUser.nickname" width="120" />
        <el-table-column label="流程状态" prop="status" width="100" align="center">
          <template #default="scope">
            <dict-tag :type="DICT_TYPE.BPM_PROCESS_INSTANCE_STATUS" :value="scope.row.status" />
          </template>
        </el-table-column>
        <el-table-column
          label="发起时间"
          align="center"
          prop="startTime"
          width="160"
          :formatter="dateFormatter"
          sortable
        />
        <!-- 表单变量展示 -->
        <template v-if="summaryColumns.length > 0">
          <el-table-column
            v-for="column in summaryColumns"
            :key="column.key"
            :label="column.key"
            align="center"
            :min-width="getColumnWidth(column)"
            show-overflow-tooltip
            :class-name="getColumnClass(column)"
          >
            <template #header="{ column: headerColumn }">
              <div class="column-header">
                <span class="column-title">{{ headerColumn.label }}</span>
                <el-tooltip v-if="getColumnTooltip(column)" :content="getColumnTooltip(column)" placement="top">
                  <Icon icon="ep:info-filled" class="ml-5px text-gray-400 text-xs" />
                </el-tooltip>
              </div>
            </template>
            <template #default="scope">
              <!-- 子表单数据展示 -->
              <template v-if="column.isSubform">
                <el-popover
                  placement="right"
                  :width="600"
                  trigger="hover"
                  :title="column.key"
                >
                  <template #reference>
                    <el-button type="primary" link @click.stop="handleViewSubform(scope.row, column.key)">
                      查看详情 <el-badge :value="getSubformItemsCount(scope.row, column.key)" type="info" />
                    </el-button>
                  </template>
                  <div style="max-height: 300px; overflow-y: auto;">
                    <el-table
                      :data="getSubformData(scope.row, column.key).slice(0, 5)"
                      border
                      stripe
                      size="small"
                      style="width: 100%"
                    >
                      <el-table-column
                        v-for="subColumn in column.subColumns"
                        :key="subColumn"
                        :prop="subColumn"
                        :label="subColumn"
                        min-width="150"
                        show-overflow-tooltip
                      />
                    </el-table>
                    <div v-if="getSubformItemsCount(scope.row, column.key) > 5" class="text-center py-10px">
                      <el-button type="primary" link @click.stop="handleViewSubform(scope.row, column.key)">
                        查看全部 {{ getSubformItemsCount(scope.row, column.key) }} 条数据
                      </el-button>
                    </div>
                  </div>
                </el-popover>
              </template>
              <!-- 普通字段展示 -->
              <template v-else>
                <div class="field-content">
                  <template v-if="isArrayField(scope.row, column.key)">
                    <!-- 数组字段特殊处理 -->
                    <el-popover
                      placement="top"
                      :width="400"
                      trigger="hover"
                      :title="`${column.key} 完整内容`"
                    >
                      <template #reference>
                      <span class="array-field-content" :class="{'empty-value': !getDisplayValue(scope.row, column.key) || getDisplayValue(scope.row, column.key) === '-'}">
                        {{ getDisplayValue(scope.row, column.key) }}
                        <Icon icon="ep:list" class="ml-5px text-blue-500 text-xs" />
                      </span>
                      </template>
                      <div class="array-content-detail">
                        <ul class="list-disc list-inside space-y-1">
                          <li v-for="(item, index) in getArrayFieldData(scope.row, column.key)" :key="index" class="text-sm">
                            {{ item }}
                          </li>
                        </ul>
                      </div>
                    </el-popover>
                  </template>
                  <template v-else>
                    <!-- 普通字段 -->
                    <span :class="{'empty-value': !getDisplayValue(scope.row, column.key) || getDisplayValue(scope.row, column.key) === '-'}">
                    {{ getDisplayValue(scope.row, column.key) }}
                  </span>
                    <el-tooltip v-if="isLongContent(getDisplayValue(scope.row, column.key))" :content="getDisplayValue(scope.row, column.key)" placement="top">
                      <Icon icon="ep:more-filled" class="ml-5px text-gray-400 text-xs cursor-pointer" />
                    </el-tooltip>
                  </template>
                </div>
              </template>
            </template>
          </el-table-column>
        </template>
        <!-- 当前审批任务列 -->
        <el-table-column label="当前审批任务" align="center" min-width="120px">
          <template #default="scope">
            <el-button type="primary" v-for="task in scope.row.tasks" :key="task.id" link>
              <span>{{ task.name }}</span>
            </el-button>
            <span v-if="!scope.row.tasks || scope.row.tasks.length === 0">-</span>
          </template>
        </el-table-column>
        <!-- 运行时长列 -->
        <el-table-column label="运行时长" align="center" min-width="180px">
          <template #default="scope">
            <div v-if="scope.row.tasks && scope.row.tasks.length > 0">
              <div v-for="task in scope.row.tasks" :key="task.id" class="mb-5px">
                <el-tooltip :content="formatTaskCreateTime(task.createTime)" placement="top">
                  <span>{{ task.name }}: {{ calculateTaskRunningTime(task.createTime) }}</span>
                </el-tooltip>
              </div>
            </div>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="运行时间" align="center" min-width="180px">
          <template #default="scope">
            <div v-if="scope.row.tasks && scope.row.tasks.length > 0">
              <div v-for="task in scope.row.tasks" :key="task.id" class="mb-5px">
                <span>{{ task.name }}: {{ formatTaskCreateTime(task.createTime) }}</span>
              </div>
            </div>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="流程编号" align="center" prop="id" min-width="300px" />
        <el-table-column
          label="版本号"
          align="center"
          width="80"
          fixed="right"
        >
          <template #default="scope">
            {{ scope.row.processDefinitionId ? scope.row.processDefinitionId.split(':')[1] : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" align="center" fixed="right" width="200">
          <template #default="scope">
            <div class="flex flex-col space-y-1">
              <div>
                <el-button
                  link
                  type="primary"
                  size="small"
                  @click="handleDetail(scope.row)"
                >
                  详情
                </el-button>
                <el-button
                  link
                  type="primary"
                  size="small"
                  @click="handleViewVariables(scope.row)"
                >
                  变量
                </el-button>
              </div>
              <div>
                <el-button
                  link
                  type="danger"
                  size="small"
                  v-if="scope.row.status === 1"
                  v-hasPermi="['bpm:process-instance:query']"
                  @click="handleCancel(scope.row)"
                >
                  取消
                </el-button>
                <el-button
                  link
                  type="danger"
                  size="small"
                  v-hasPermi="['bpm:process-instance:delete']"
                  @click="handleDelete(scope.row)"
                >
                  删除
                </el-button>
              </div>
            </div>
          </template>
        </el-table-column>
      </el-table>


    </div>

    <!-- 分页 -->
    <Pagination
      :total="total"
      v-model:page="queryParams.pageNo"
      v-model:limit="queryParams.pageSize"
      @pagination="getList"
    />
  </ContentWrap>

  <!-- 变量查看对话框 -->
  <Dialog v-model="variablesDialogVisible" title="流程变量详情" width="60%">
    <el-input
      v-model="variablesFilter"
      placeholder="输入关键字过滤变量"
      clearable
      class="mb-10px"
    />
    <el-descriptions :column="1" border size="large">
      <el-descriptions-item
        v-for="(value, key) in filteredVariables"
        :key="key"
        :label="key"
        label-align="right"
        align="left"
        class="variables-item"
      >
        <div class="variables-value">{{ value }}</div>
      </el-descriptions-item>
    </el-descriptions>
    <div v-if="Object.keys(filteredVariables).length === 0" class="text-center py-20px text-gray-400">
      没有匹配的变量
    </div>
    <template #footer>
      <el-button @click="variablesDialogVisible = false">关闭</el-button>
    </template>
  </Dialog>

  <!-- 子表单详情对话框 -->
  <Dialog v-model="subformDialogVisible" :title="currentSubformTitle" width="80%">
    <el-table
      :data="currentSubformData"
      border
      stripe
      highlight-current-row
      style="width: 100%"
    >
      <el-table-column
        v-for="column in currentSubformColumns"
        :key="column"
        :prop="column"
        :label="column"
        min-width="180"
        show-overflow-tooltip
      />
    </el-table>
    <template #footer>
      <el-button @click="subformDialogVisible = false">关闭</el-button>
    </template>
  </Dialog>

  <!-- 所有字段对话框 -->
  <Dialog v-model="allFieldsDialogVisible" title="所有表单字段" width="80%">
    <el-input
      v-model="fieldsFilter"
      placeholder="输入关键字过滤字段"
      clearable
      class="mb-10px"
    />
    <div class="mb-10px">
      <el-button type="primary" @click="handleShowSelectedFields" :disabled="selectedFields.length === 0">
        <Icon icon="ep:view" class="mr-5px" /> 显示选中字段
      </el-button>
      <el-button type="success" @click="handleSelectHiddenFields">
        <Icon icon="ep:select" class="mr-5px" /> 选择未显示字段
      </el-button>
      <el-button type="info" @click="handleResetFields">
        <Icon icon="ep:refresh" class="mr-5px" /> 重置为默认
      </el-button>
    </div>
    <el-table
      ref="fieldsTableRef"
      :data="filteredAllFields"
      border
      stripe
      style="width: 100%"
      max-height="500px"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="55" />
      <el-table-column type="index" label="序号" width="80" />
      <el-table-column prop="key" label="字段名称" min-width="200" />
      <el-table-column prop="type" label="字段类型" width="120">
        <template #default="scope">
          <el-tag :type="scope.row.isSubform ? 'success' : 'info'">
            {{ scope.row.isSubform ? '子表单' : '普通字段' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="isShown" label="当前状态" width="120">
        <template #default="scope">
          <el-tag :type="scope.row.isShown ? 'primary' : 'danger'">
            {{ scope.row.isShown ? '已显示' : '未显示' }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="操作" width="180" align="center">
        <template #default="scope">
          <el-button
            :type="scope.row.isShown ? 'danger' : 'primary'"
            link
            @click="handleToggleField(scope.row)"
          >
            {{ scope.row.isShown ? '隐藏' : '显示' }}
          </el-button>
          <el-button
            v-if="scope.row.isSubform"
            type="primary"
            link
            @click="handleViewSubformStructure(scope.row)"
          >
            查看结构
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    <template #footer>
      <el-button @click="allFieldsDialogVisible = false">关闭</el-button>
      <el-button type="primary" @click="handleApplyFieldChanges">应用变更</el-button>
    </template>
  </Dialog>

  <!-- 导出选项对话框 -->
  <Dialog v-model="exportOptionsVisible" title="导出选项" width="500px">
    <el-form :model="exportOptions" label-width="120px">
      <el-form-item label="导出内容">
        <el-radio-group v-model="exportOptions.exportType">
          <el-radio label="current">仅导出当前显示字段</el-radio>
          <el-radio label="all">导出所有字段</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="子表单处理方式">
        <el-radio-group v-model="exportOptions.subformFormat">
          <el-radio label="columns-simple">表格形式（按列展开，简洁表头）</el-radio>
          <el-radio label="columns-merged">表格形式（按列展开，带合并单元格）</el-radio>
          <el-radio label="flatten">表格形式（拆分为多行）</el-radio>
          <el-radio label="json">JSON字符串（原始格式）</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="文件名">
        <el-input v-model="exportOptions.filename" placeholder="请输入导出文件名" clearable>
          <template #append>.xlsx</template>
        </el-input>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="exportOptionsVisible = false">取消</el-button>
      <el-button type="primary" @click="handleExport" :loading="exportLoading">确认导出</el-button>
    </template>
  </Dialog>
</template>
<script lang="ts" setup>
import { DICT_TYPE, getIntDictOptions } from '@/utils/dict'
import { dateFormatter, formatPast2 } from '@/utils/formatTime'
import { ElMessageBox } from 'element-plus'
import * as ProcessInstanceApi from '@/api/bpm/processInstance'
import { CategoryApi } from '@/api/bpm/category'
import * as UserApi from '@/api/system/user'
import download from '@/utils/download'
import * as XLSX from 'xlsx-js-style'
import { onUnmounted } from 'vue'

// 定义类型接口
interface ColumnItem {
  key: string
  isSubform: boolean
  subColumns?: string[]
  priority?: number
  smartPriority?: number
  fillRate?: number
  isShown?: boolean
}

interface FieldItem {
  key: string
  isSubform: boolean
  isShown: boolean
  subColumns?: string[]
}

interface SummaryItem {
  key: string
  value: any
}

interface FormVariableDisplayItem {
  key: string
  value: any
}

interface ProcessTask {
  id: string
  name: string
}

interface StartUser {
  id: string
  nickname: string
  deptName: string
}

interface ProcessInstanceItem {
  id: string
  name: string
  categoryName: string
  status: number
  startTime: string
  endTime?: string
  durationInMillis?: number
  tasks?: ProcessTask[]
  startUser?: StartUser
  summary?: SummaryItem[]
  formVariablesDisplay?: FormVariableDisplayItem[]
  formVariables?: Record<string, any>
}

// 扩展XLSX类型
interface XLSXRange {
  s: { r: number; c: number }
  e: { r: number; c: number }
}

// 它和【我的流程】的差异是，该菜单可以看全部的流程实例
defineOptions({ name: 'BpmProcessInstanceManager' })

const router = useRouter() // 路由
const message = useMessage() // 消息弹窗
const { t } = useI18n() // 国际化

const loading = ref(true) // 列表的加载中
const total = ref(0) // 列表的总页数
const list = ref<ProcessInstanceItem[]>([]) // 列表的数据
const queryParams = reactive({
  pageNo: 1,
  pageSize: 10,
  startUserId: undefined,
  name: '',
  processDefinitionKey: undefined,
  category: undefined,
  status: undefined,
  createTime: []
})
const queryFormRef = ref() // 搜索的表单
const categoryList = ref<any[]>([]) // 流程分类列表
const userList = ref<any[]>([]) // 用户列表

// 视图模式：instance-实例模式，data-数据模式
const viewMode = ref('instance')
// 导出加载状态
const exportLoading = ref(false)
// 变量查看对话框
const variablesDialogVisible = ref(false)
// 当前查看的变量
const currentVariables = ref({})
// 变量过滤关键字
const variablesFilter = ref('')
// 表单摘要列
const summaryColumns = ref<ColumnItem[]>([])
// 总字段数
const totalFieldsCount = ref(0)

// 子表单详情对话框
const subformDialogVisible = ref(false)
const currentSubformTitle = ref('')
const currentSubformData = ref<any[]>([])
const currentSubformColumns = ref<string[]>([])

// 所有字段对话框
const allFieldsDialogVisible = ref(false)
const allFields = ref<FieldItem[]>([])
const fieldsFilter = ref('')
const selectedFields = ref<FieldItem[]>([]) // 选中的字段
const originalShownFields = ref<string[]>([]) // 原始显示的字段，用于重置
const fieldsTableRef = ref<any>(null) // 字段表格引用

// 导出选项对话框
const exportOptionsVisible = ref(false)
const exportOptions = reactive({
  exportType: 'current', // current: 当前显示字段, all: 所有字段
  subformFormat: 'columns-simple', // columns-simple: 按列展开简洁表头, columns-merged: 按列展开带合并单元格, flatten: 拆分为多行, json: JSON字符串
  filename: '流程实例数据.xlsx' // 默认文件名
})



// 过滤后的变量
const filteredVariables = computed(() => {
  if (!variablesFilter.value) {
    return currentVariables.value
  }

  const filter = variablesFilter.value.toLowerCase()
  const result = {}

  Object.keys(currentVariables.value).forEach(key => {
    const value = currentVariables.value[key]
    if (
      key.toLowerCase().includes(filter) ||
      (typeof value === 'string' && value.toLowerCase().includes(filter))
    ) {
      result[key] = value
    }
  })

  return result
})

// 过滤后的所有字段
const filteredAllFields = computed(() => {
  if (!fieldsFilter.value) {
    return allFields.value
  }

  const filter = fieldsFilter.value.toLowerCase()
  return allFields.value.filter(field =>
    field.key.toLowerCase().includes(filter)
  )
})

// 计算表格高度
const tableHeight = computed(() => {
  // 基础高度为视窗高度减去页面其他元素的高度
  const windowHeight = window.innerHeight || document.documentElement.clientHeight
  const headerHeight = 120 // 页面头部高度
  const searchFormHeight = 80 // 搜索表单高度
  const statusHeight = 40 // 优化后的状态栏高度
  const paginationHeight = 60 // 分页高度
  const padding = 40 // 页面内边距

  const calculatedHeight = windowHeight - headerHeight - searchFormHeight - statusHeight - paginationHeight - padding

  // 确保最小高度550px，最大高度没有限制，让表格充分利用空间
  return Math.max(550, calculatedHeight)
})

/** 查询列表 */
const getList = async () => {
  loading.value = true
  try {
    const data = await ProcessInstanceApi.getProcessInstanceManagerPage(queryParams)
    list.value = data.list
    total.value = data.total

    // 处理数据模式下的表单摘要列
    if (viewMode.value === 'data') {
      if (data.list.length > 0) {
        extractSummaryColumns(data.list)
      } else {
        // 如果数据为空，清空摘要列
        summaryColumns.value = []
        totalFieldsCount.value = 0
      }
    }
  } finally {
    loading.value = false
  }
}

/** 提取表单摘要列 */
const extractSummaryColumns = (dataList: ProcessInstanceItem[]) => {
  const columns = new Set<string>()
  const subformColumns = new Map<string, string[]>() // 存储子表单结构
  const fieldStats = new Map<string, { count: number, nonEmptyCount: number, sampleValues: any[] }>() // 字段统计信息

  // 从所有数据中提取唯一的摘要键并统计字段质量
  dataList.forEach(item => {
    // 从summary中提取字段
    if (item.summary && Array.isArray(item.summary)) {
      item.summary.forEach(summary => {
        if (summary.key) {
          columns.add(summary.key)
          // 统计字段质量
          if (!fieldStats.has(summary.key)) {
            fieldStats.set(summary.key, { count: 0, nonEmptyCount: 0, sampleValues: [] })
          }
          const stats = fieldStats.get(summary.key)!
          stats.count++
          if (summary.value !== null && summary.value !== undefined && summary.value !== '') {
            stats.nonEmptyCount++
            if (stats.sampleValues.length < 3) {
              stats.sampleValues.push(summary.value)
            }
          }
        }
      })
    }

    // 从formVariablesDisplay中提取所有字段
    if (item.formVariablesDisplay && Array.isArray(item.formVariablesDisplay)) {
      item.formVariablesDisplay.forEach(display => {
        if (display.key && !display.key.startsWith('PROCESS_') && display.key.trim() !== '') {
          // 检查字段是否有有效值
          const hasValidValue = display.value !== null &&
            display.value !== undefined &&
            display.value !== '' &&
            !(Array.isArray(display.value) && display.value.length === 0)

          // 只有有效值的字段才添加到columns
          if (hasValidValue) {
            columns.add(display.key)

            // 统计字段质量
            if (!fieldStats.has(display.key)) {
              fieldStats.set(display.key, { count: 0, nonEmptyCount: 0, sampleValues: [] })
            }
            const stats = fieldStats.get(display.key)!
            stats.count++
            stats.nonEmptyCount++
            if (stats.sampleValues.length < 3) {
              stats.sampleValues.push(display.value)
            }

            // 检查新格式：value直接是数组类型（子表单）
            if (Array.isArray(display.value) && display.value.length > 0 && typeof display.value[0] === 'object' && display.value[0] !== null) {
              // 记录子表单字段
              if (!subformColumns.has(display.key)) {
                // 从第一个子表单项中提取列名
                const subColumns = Object.keys(display.value[0])
                subformColumns.set(display.key, subColumns)
              }
            }
            // 检查字符串形式的JSON数组（兼容旧格式）
            else if (display.value && typeof display.value === 'string') {
              try {
                if (display.value.startsWith('[{') && display.value.endsWith('}]')) {
                  const parsedValue = JSON.parse(display.value)
                  if (Array.isArray(parsedValue) && parsedValue.length > 0 && typeof parsedValue[0] === 'object' && parsedValue[0] !== null) {
                    // 这是一个子表单数据
                    if (!subformColumns.has(display.key)) {
                      const subColumns = Object.keys(parsedValue[0])
                      subformColumns.set(display.key, subColumns)
                    }
                  }
                }
              } catch (e) {
                // 解析失败，不是有效的JSON
                console.debug(`${display.key}的值不是有效的JSON数组`, e)
              }
            }
          }
        }
      })
    }
  })

  // 保存总字段数
  totalFieldsCount.value = columns.size

  // 扩展的优先级字段列表（包含更多实际业务字段）
  const priorityFields = [
    '反推运营发起人',
    '反推承接人1',
    '反推进度1',
    '反推产品性质1',
    '预计订货量',
    '采购成本',
  ]

  // 转换为数组格式，包含普通字段和子表单字段
  const allColumns: ColumnItem[] = Array.from(columns).map(key => {
    // 获取字段统计信息
    const stats = fieldStats.get(key)
    const fillRate = stats ? (stats.nonEmptyCount / stats.count) : 0

    // 计算智能优先级
    let smartPriority = 0
    // 基础优先级（预定义字段）
    const basePriority = priorityFields.indexOf(key)
    if (basePriority !== -1) {
      smartPriority += (priorityFields.length - basePriority) * 100
    }

    // 数据质量权重（非空率）
    smartPriority += Math.round(fillRate * 50)

    // 字段名称重要性权重
    const importantKeywords = ['日期', '名称', '订货量', '销量', '编码', '属性', '承接人', '运营', '进度']
    const hasImportantKeyword = importantKeywords.some(keyword => key.includes(keyword))
    if (hasImportantKeyword) {
      smartPriority += 20
    }

    // 检查是否为子表单字段
    if (subformColumns.has(key)) {
      return {
        key,
        isSubform: true,
        subColumns: subformColumns.get(key),
        priority: basePriority,
        smartPriority,
        fillRate
      }
    }
    return {
      key,
      isSubform: false,
      priority: basePriority,
      smartPriority,
      fillRate
    }
  })

  // 按智能优先级排序，优先级高的排在前面
  allColumns.sort((a, b) => {
    // 首先按智能优先级排序
    if (a.smartPriority !== b.smartPriority) {
      return (b.smartPriority || 0) - (a.smartPriority || 0)
    }
    // 如果智能优先级相同，按传统优先级排序
    if (a.priority !== -1 && b.priority !== -1) {
      return a.priority - b.priority
    }
    if (a.priority !== -1) {
      return -1
    }
    if (b.priority !== -1) {
      return 1
    }
    // 最后按字段名称排序
    return a.key.localeCompare(b.key)
  })

  // 动态调整最大展示列数
  const maxColumns = Math.min(25, Math.max(15, Math.ceil(allColumns.length * 0.8)))
  summaryColumns.value = allColumns.slice(0, maxColumns)

  // 输出字段统计信息
  console.info(`表单共有 ${allColumns.length} 个有效字段，显示前 ${summaryColumns.value.length} 个`)
  if (allColumns.length > maxColumns) {
    console.info(`其余 ${allColumns.length - maxColumns} 个字段可通过"查看所有字段"功能查看`)
  }

  // 输出字段质量统计
  console.debug('字段质量统计:',
    Array.from(fieldStats.entries())
      .sort((a, b) => b[1].nonEmptyCount - a[1].nonEmptyCount)
      .slice(0, 10)
      .map(([key, stats]) => `${key}: ${stats.nonEmptyCount}/${stats.count} (${(stats.nonEmptyCount/stats.count*100).toFixed(1)}%)`)
  )
}

/** 获取子表单数据 */
const getSubformData = (row: ProcessInstanceItem, key: string): any[] => {
  // 优先从formVariablesDisplay中获取新格式的直接数组数据
  if (row.formVariablesDisplay && Array.isArray(row.formVariablesDisplay)) {
    const displayItem = row.formVariablesDisplay.find(item => item.key === key)
    if (displayItem && Array.isArray(displayItem.value) && displayItem.value.length > 0) {
      return displayItem.value
    }

    // 兼容字符串形式的JSON数组（旧格式）
    if (displayItem && displayItem.value && typeof displayItem.value === 'string') {
      try {
        if (displayItem.value.startsWith('[{') && displayItem.value.endsWith('}]')) {
          const parsedValue = JSON.parse(displayItem.value)
          if (Array.isArray(parsedValue) && parsedValue.length > 0) {
            return parsedValue
          }
        }
      } catch (e) {
        console.error(`解析${key}的子表单数据失败`, e)
      }
    }
  }
  return []
}

/** 获取子表单项数量 */
const getSubformItemsCount = (row: ProcessInstanceItem, key: string): number => {
  const data = getSubformData(row, key)
  return data.length || 0
}

/**
 * 格式化字符串/数字数组的显示
 * @param {Array} arrayData 字符串或数字数组
 * @returns {string} 格式化后的显示内容
 */
const formatArrayValue = (arrayData: any[]): string => {
  if (!arrayData || !Array.isArray(arrayData)) {
    return '[无效数据]'
  }

  if (arrayData.length === 0) {
    return '[空数组]'
  }

  // 过滤掉空值
  const validItems = arrayData.filter(item => item !== null && item !== undefined && item !== '')

  if (validItems.length === 0) {
    return '[无有效数据]'
  }

  // 如果只有一项，直接返回
  if (validItems.length === 1) {
    return String(validItems[0])
  }

  // 多项数据处理
  if (validItems.length <= 3) {
    // 少于等于3项，全部显示
    return validItems.join(' > ')
  } else {
    // 超过3项，显示前2项和最后1项，中间用省略号
    return `${validItems.slice(0, 2).join(' > ')} ... ${validItems[validItems.length - 1]} (共${validItems.length}项)`
  }
}

/**
 * 格式化数组数据摘要信息
 * @param {Array} arrayData 数组数据
 * @returns {string} 格式化后的摘要信息
 */
const formatArrayDataSummary = (arrayData: any[]): string => {
  if (!arrayData || !Array.isArray(arrayData)) {
    return '[无效数据]'
  }

  if (arrayData.length === 0) {
    return '[空数据]'
  }

  // 获取第一条记录
  const firstItem = arrayData[0]

  // 如果第一条记录不是对象，直接返回值
  if (typeof firstItem !== 'object' || firstItem === null) {
    return String(firstItem)
  }

  // 提取第一条记录的信息
  const keys = Object.keys(firstItem)
  if (keys.length === 0) {
    return '[空对象]'
  }

  // 选择所有字段，直接展示数据内容
  const formattedData = keys.map(key => {
    const value = firstItem[key]
    // 处理不同类型的值
    if (value === null || value === undefined) {
      return `${key}: -`
    } else if (typeof value === 'object') {
      return `${key}: ${JSON.stringify(value).substring(0, 15)}${JSON.stringify(value).length > 15 ? '...' : ''}`
    } else {
      return `${key}: ${String(value)}`
    }
  }).join(' | ')

  // 如果有多条记录，添加一个简单的标记
  return arrayData.length > 1 ? `${formattedData} (+${arrayData.length - 1})` : formattedData
}

/** 获取原始值（用于导出） */
const getRawValue = (row: ProcessInstanceItem, key: string): any => {
  // 首先从summary中获取
  if (row.summary && Array.isArray(row.summary)) {
    const summaryItem = row.summary.find(item => item.key === key)
    if (summaryItem && (summaryItem.value !== null && summaryItem.value !== undefined)) {
      return summaryItem.value
    }
  }

  // 如果summary中没有，从formVariablesDisplay中获取
  if (row.formVariablesDisplay && Array.isArray(row.formVariablesDisplay)) {
    const displayItem = row.formVariablesDisplay.find(item => item.key === key)
    if (displayItem && displayItem.value !== null && displayItem.value !== undefined) {
      // 直接返回原始值，不做类型转换
      if (Array.isArray(displayItem.value)) {
        // 对于数组类型，返回JSON字符串以便在Excel中显示
        return JSON.stringify(displayItem.value)
      } else if (typeof displayItem.value === 'object') {
        // 对于对象类型，返回JSON字符串
        return JSON.stringify(displayItem.value)
      } else {
        // 基础类型值直接返回
        return displayItem.value
      }
    }
  }
  // 确保返回空字符串而不是null，这样Excel中会显示为空单元格
  return ''
}

/** 获取显示值（用于页面展示） */
const getDisplayValue = (row: ProcessInstanceItem, key: string): string => {
  // 首先从summary中获取
  if (row.summary && Array.isArray(row.summary)) {
    const summaryItem = row.summary.find(item => item.key === key)
    if (summaryItem && (summaryItem.value || summaryItem.value === 0)) {
      // 如果summary中的值是数组，需要特殊处理
      if (Array.isArray(summaryItem.value)) {
        return formatArrayValue(summaryItem.value)
      }
      return summaryItem.value
    }
  }

  // 如果summary中没有，从formVariablesDisplay中获取
  if (row.formVariablesDisplay && Array.isArray(row.formVariablesDisplay)) {
    const displayItem = row.formVariablesDisplay.find(item => item.key === key)
    if (displayItem && displayItem.value !== null && displayItem.value !== undefined) {
      // 处理不同类型的value
      if (Array.isArray(displayItem.value)) {
        // 判断数组类型：字符串数组还是对象数组
        if (displayItem.value.length === 0) {
          return '[空数组]'
        } else if (typeof displayItem.value[0] === 'string' || typeof displayItem.value[0] === 'number') {
          // 字符串或数字数组（如类目选择）
          return formatArrayValue(displayItem.value)
        } else if (typeof displayItem.value[0] === 'object') {
          // 对象数组（子表单）- 显示数据条数和第一条记录的摘要
          return formatArrayDataSummary(displayItem.value)
        } else {
          return displayItem.value.join(', ')
        }
      } else if (typeof displayItem.value === 'object' && displayItem.value !== null) {
        // 对象类型 - 尝试格式化显示主要信息
        const obj = displayItem.value
        const keys = Object.keys(obj)
        if (keys.length === 0) {
          return '[空对象]'
        } else if (keys.length === 1) {
          // 单个键值对，直接显示
          const key = keys[0]
          const value = obj[key]
          return `${key}: ${value}`
        } else if (keys.length <= 3) {
          // 少量键值对，显示关键信息
          const pairs = keys.slice(0, 3).map(k => `${k}: ${obj[k]}`).join(', ')
          return keys.length > 3 ? `${pairs}...` : pairs
        } else {
          // 太多键值对，显示概要
          return `[对象: ${keys.length}个字段]`
        }
      } else if (displayItem.value === 0 || displayItem.value) {
        // 基础类型值（字符串、数字等）
        return String(displayItem.value)
      }
    }
  }

  // 最后从formVariables中获取
  if (row.formVariables && row.formVariables[key] !== undefined && row.formVariables[key] !== null) {
    const value = row.formVariables[key]
    // 区分数组和对象类型
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return '[空数组]'
      } else if (typeof value[0] === 'string' || typeof value[0] === 'number') {
        // 字符串或数字数组
        return formatArrayValue(value)
      } else if (typeof value[0] === 'object') {
        // 对象数组（子表单）
        return formatArrayDataSummary(value)
      } else {
        return value.join(', ')
      }
    } else if (typeof value === 'object' && value !== null) {
      // 对象类型格式化显示
      const keys = Object.keys(value)
      if (keys.length === 0) {
        return '[空对象]'
      } else if (keys.length === 1) {
        const key = keys[0]
        return `${key}: ${value[key]}`
      } else if (keys.length <= 3) {
        const pairs = keys.slice(0, 3).map(k => `${k}: ${value[k]}`).join(', ')
        return keys.length > 3 ? `${pairs}...` : pairs
      } else {
        return `[对象: ${keys.length}个字段]`
      }
    }
    return String(value)
  }

  return '-'
}

/** 格式化任务列表用于导出 */
const formatTasksForExport = (tasks: ProcessTask[]): string => {
  if (!tasks || tasks.length === 0) {
    return '-'
  }
  return tasks.map(task => task.name).join(', ')
}

/** 搜索按钮操作 */
const handleQuery = () => {
  queryParams.pageNo = 1
  // 清空之前的数据列表，避免旧数据影响渲染
  list.value = []
  getList()
}

/** 重置按钮操作 */
const resetQuery = () => {
  queryFormRef.value.resetFields()
  // 清空之前的数据列表，避免旧数据影响渲染
  list.value = []
  queryParams.pageNo = 1
  getList()
}

/** 查看详情 */
const handleDetail = (row) => {
  router.push({
    name: 'BpmProcessInstanceDetail',
    query: {
      id: row.id,
      mode: viewMode.value // 传递当前模式，便于详情页面适配展示
    }
  })
}

/** 查看变量 */
const handleViewVariables = (row) => {
  // 格式化变量显示，处理复杂对象
  const formatVariables = (variables) => {
    const result = {}
    if (!variables) return result

    Object.keys(variables).forEach(key => {
      const value = variables[key]
      // 如果是对象或数组，转为JSON字符串
      if (typeof value === 'object' && value !== null) {
        result[key] = JSON.stringify(value)
      } else {
        result[key] = value === null || value === undefined ? '-' : String(value)
      }
    })
    return result
  }

  // 获取流程变量
  const variables = formatVariables(row.formVariables)

  // 添加版本号信息
  if (row.processDefinitionId) {
    const versionNumber = row.processDefinitionId.split(':')[1] || '-'
    variables['流程版本号'] = versionNumber
  }

  currentVariables.value = variables
  variablesDialogVisible.value = true
}

/** 取消按钮操作 */
const handleCancel = async (row) => {
  try {
    // 二次确认
    const { value } = await ElMessageBox.prompt('请输入取消原因', '取消流程', {
      confirmButtonText: t('common.ok'),
      cancelButtonText: t('common.cancel'),
      inputPattern: /^[\s\S]*.*\S[\s\S]*$/, // 判断非空，且非空格
      inputErrorMessage: '取消原因不能为空'
    })
    // 发起取消
    await ProcessInstanceApi.cancelProcessInstanceByAdmin(row.id, value)
    message.success('取消成功')
    // 刷新列表
    await getList()
  } catch (error) {
    console.error('取消流程失败', error)
  }
}

/** 删除按钮操作 */
const handleDelete = async (row) => {
  try {
    // 二次确认
    await ElMessageBox.confirm('确定要删除该流程实例吗？此操作不可逆', '删除流程', {
      confirmButtonText: t('common.ok'),
      cancelButtonText: t('common.cancel'),
      type: 'warning'
    })
    // 发起删除
    await ProcessInstanceApi.deleteProcessInstance(row.id)
    message.success('删除成功')
    // 刷新列表
    await getList()
  } catch (error) {
    console.error('删除流程失败', error)
  }
}

/** 模式切换操作 */
const handleModeChange = () => {
  // 重置页码，确保在模式切换后从第一页开始
  queryParams.pageNo = 1
  // 清空之前的数据列表，避免旧数据影响渲染
  list.value = []
  // 重新获取数据
  getList()
}

/** 获取流程状态名称 */
const getProcessStatusName = (status) => {
  const options = getIntDictOptions(DICT_TYPE.BPM_PROCESS_INSTANCE_STATUS)
  const option = options.find(item => item.value === status)
  return option ? option.label : '未知状态'
}

/**
 * 扁平化处理子表单数据，将子表单拆分为多行
 * @param {Object} baseRow 基础行数据（包含主表信息）
 * @param {Object} formData 表单数据
 * @param {Array} subformColumns 子表单列配置
 * @returns {Array} 扁平化后的数据行数组
 */
const flattenSubformData = (baseRow: Record<string, any>, formData: ProcessInstanceItem, subformColumns: ColumnItem[]): Record<string, any>[] => {
  // 结果数组，至少包含一行基础数据
  const result: Record<string, any>[] = [{ ...baseRow }]

  // 如果没有子表单列，直接返回基础行
  if (!subformColumns || subformColumns.length === 0) {
    return result
  }

  // 处理每个子表单字段
  subformColumns.forEach(column => {
    const key = column.key
    const subformData = getSubformData(formData, key)

    // 如果子表单没有数据，跳过
    if (!subformData || subformData.length === 0) {
      return
    }

    // 临时存储扩展后的行
    const expandedRows: Record<string, any>[] = []

    // 遍历当前结果中的每一行
    result.forEach(row => {
      // 为子表单的每一项创建新行
      subformData.forEach((subItem, index) => {
        // 创建新行，复制当前行的所有数据
        const newRow = { ...row }

        // 将子表单项的每个字段添加到新行中
        // 使用格式：子表单名称[索引].字段名
        Object.entries(subItem).forEach(([subKey, subValue]) => {
          const formattedKey = `${key}[${index}].${subKey}`
          newRow[formattedKey] = subValue
        })

        // 添加到扩展行数组
        expandedRows.push(newRow)
      })
    })

    // 如果有扩展行，替换原结果数组
    if (expandedRows.length > 0) {
      result.length = 0
      result.push(...expandedRows)
    }
  })

  return result
}

/**
 * 将子表单数据按列展开处理，类似于透视表
 * @param {Object} baseRow 基础行数据（包含主表信息）
 * @param {Object} formData 表单数据
 * @param {Array} subformColumns 子表单列配置
 * @param {Boolean} useSimpleHeaders 是否使用简洁的表头（不包含父级字段名和索引）
 * @returns {Object} 展开后的数据行
 */
const expandSubformDataToColumns = (
  baseRow: Record<string, any>,
  formData: ProcessInstanceItem,
  subformColumns: ColumnItem[],
  useSimpleHeaders = false
): Record<string, any> => {
  // 结果对象，初始包含基础行数据
  const result: Record<string, any> = { ...baseRow }

  // 如果没有子表单列，直接返回基础行
  if (!subformColumns || subformColumns.length === 0) {
    return result
  }

  // 处理每个子表单字段
  subformColumns.forEach(column => {
    const key = column.key
    const subformData = getSubformData(formData, key)

    // 如果子表单没有数据，跳过
    if (!subformData || subformData.length === 0) {
      return
    }

    // 遍历子表单数据的每一项
    subformData.forEach((subItem, index) => {
      // 将子表单项的每个字段添加到结果对象中
      Object.entries(subItem).forEach(([subKey, subValue]) => {
        // 根据选择的格式生成列名
        let columnName: string
        if (useSimpleHeaders) {
          // 简洁格式：子字段名 + 序号，避免同名字段覆盖
          columnName = `${subKey}_${index + 1}`
        } else {
          // 带索引格式：父字段名[索引].子字段名
          columnName = `${key}[${index}].${subKey}`
        }

        // 添加到结果对象
        result[columnName] = subValue
      })
    })
  })
  return result
}

/**
 * 将子表单数据展开为多行，便于后续进行单元格合并
 * @param baseRow 基础行数据
 * @param formData 表单数据
 * @param subformColumns 子表单列配置
 * @returns 展开后的数据行数组
 */
const expandSubformDataToRows = (
  baseRow: Record<string, any>,
  formData: ProcessInstanceItem,
  subformColumns: ColumnItem[]
): Record<string, any>[] => {
  const rows: Record<string, any>[] = []

  if (!subformColumns || subformColumns.length === 0) {
    rows.push({ ...baseRow })
    return rows
  }

  let hasSubformData = false

  subformColumns.forEach(column => {
    const key = column.key
    const subformData = getSubformData(formData, key)

    if (subformData && subformData.length > 0) {
      hasSubformData = true
      subformData.forEach(subItem => {
        const row = { ...baseRow }
        Object.entries(subItem).forEach(([subKey, subValue]) => {
          row[`${key}.${subKey}`] = subValue
        })
        rows.push(row)
      })
    }
  })

  if (!hasSubformData) {
    rows.push({ ...baseRow })
  }

  return rows
}

/** 显示导出选项对话框 */
const handleExportOptions = () => {
  exportOptionsVisible.value = true
}

/** 导出按钮操作 */
const handleExport = async () => {
  try {
    // 关闭选项对话框
    exportOptionsVisible.value = false

    // 发起导出
    exportLoading.value = true

    // 获取要导出的字段列表

    let visibleColumns: string[] = []
    let subformColumns: ColumnItem[] = []

    if (exportOptions.exportType === 'current') {
      // 导出当前显示字段
      visibleColumns = summaryColumns.value.map(col => col.key)
      subformColumns = summaryColumns.value.filter(col => col.isSubform)
    } else {
      // 导出所有字段
      const allColumns = extractAllColumns()
      visibleColumns = allColumns.map(col => col.key)
      subformColumns = allColumns.filter(col => col.isSubform)
    }

    // 构建导出数据
    const exportData: Record<string, any>[] = []
    const rowGroupCounts: number[] = []

    // 处理每一行数据
    list.value.forEach(item => {
      // 基础信息
      const baseRow: Record<string, any> = {
        '流程名称': item.name,
        '流程分类': item.categoryName,
        '流程发起人': item.startUser?.nickname || '',
        '流程状态': getProcessStatusName(item.status),
        '发起时间': dateFormatter(null, null, item.startTime),
        '结束时间': dateFormatter(null, null, item.endTime),
        '当前审批任务': formatTasksForExport(item.tasks),
        '运行时长': formatTasksRunningTimeForExport(item.tasks),
        '运行时间': formatTasksCreateTimeForExport(item.tasks),
        '流程编号': item.id
      }

      // 添加普通表单变量（非子表单字段）
      visibleColumns.forEach(key => {
        if (!subformColumns.some(col => col.key === key)) {
          if (!(key in baseRow)) {
            baseRow[key] = getRawValue(item, key)
          }
        }
      })

      if (exportOptions.subformFormat === 'columns-merged') {
        const rows = expandSubformDataToRows(baseRow, item, subformColumns)
        exportData.push(...rows)
        rowGroupCounts.push(rows.length)
      } else {
        const useSimpleHeaders = exportOptions.subformFormat === 'columns-simple'
        const baseRowCopy = JSON.parse(JSON.stringify(baseRow))
        const expandedRow = expandSubformDataToColumns(
          baseRowCopy,
          item,
          subformColumns,
          useSimpleHeaders
        )
        exportData.push(expandedRow)
      }
    })

    try {
      let worksheet
      let workbook = XLSX.utils.book_new()

      // 根据选择的格式创建工作表
      if (exportOptions.subformFormat === 'columns-merged') {
        // 带合并单元格的表格
        worksheet = createMergedHeadersWorksheet(exportData, subformColumns, rowGroupCounts)
      } else {
        // 普通表格 - 确保所有单元格都有数据
        // 先处理数据，确保空值也被正确填充
        const processedData = exportData.map(row => {
          const processedRow = {}
          // 获取所有可能的列名
          const allColumns = new Set<string>()
          exportData.forEach(dataRow => {
            Object.keys(dataRow).forEach(key => allColumns.add(key))
          })

          // 为每一列设置值，空值设置为空字符串
          Array.from(allColumns).forEach(col => {
            processedRow[col] = row[col] !== undefined && row[col] !== null ? row[col] : ''
          })

          return processedRow
        })

        worksheet = XLSX.utils.json_to_sheet(processedData)

        // 设置列宽
        const columnWidths = [
          { wch: 40 }, // 流程名称
          { wch: 15 }, // 流程分类
          { wch: 15 }, // 流程发起人
          { wch: 15 }, // 流程状态
          { wch: 20 }, // 发起时间
          { wch: 20 }, // 结束时间
          { wch: 25 }, // 当前审批任务
          { wch: 30 }, // 运行时长
          { wch: 30 }, // 运行时间
          { wch: 40 }  // 流程编号
        ]

        // 为所有列设置宽度
        const allColumns = Object.keys(processedData[0] || {})
        allColumns.forEach((colName, index) => {
          if (index >= columnWidths.length) {
            // 根据列名长度和内容类型动态设置宽度
            let width = 15 // 默认宽度

            // 根据列名特征设置合适的宽度
            if (colName.includes('[') && colName.includes(']')) {
              // 子表单带索引的列
              width = 25
            } else if (['天猫预计月销量', '淘工厂预计月销量'].some(name => colName.includes(name))) {
              // 销量相关列，可能包含较长数字
              width = 20
            } else if (colName.includes('商品编码')) {
              // 商品编码列
              width = 25
            } else {
              // 其他列，根据列名长度动态设置
              width = Math.max(colName.length * 1.8, 15)
            }

            columnWidths.push({ wch: width })
          }
        })

        worksheet['!cols'] = columnWidths

        // 添加边框样式
        applyBordersToWorksheet(worksheet)
      }

      // 添加工作表到工作簿
      XLSX.utils.book_append_sheet(workbook, worksheet, '流程实例数据')

      // 生成Excel文件
      const excelData = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([excelData], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

      // 下载文件
      download.excel(blob, exportOptions.filename)
      message.success('导出成功')
    } catch (err) {
      console.error('Excel生成失败', err)
      message.error('Excel生成失败')
    }
  } catch (error) {
    console.error('导出失败', error)
  } finally {
    exportLoading.value = false
  }
}

/** 窗口大小改变事件处理 **/
const handleResize = () => {
  // 触发表格高度重新计算
  // tableHeight 是computed属性，会自动响应
}

/** 激活时 **/
onActivated(() => {
  getList()
})

/** 初始化 **/
onMounted(async () => {
  await getList()
  categoryList.value = await CategoryApi.getCategorySimpleList()
  userList.value = await UserApi.getSimpleUserList()

  // 监听窗口大小变化
  window.addEventListener('resize', handleResize)
})

/** 卸载时清理事件监听器 **/
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

/** 查看子表单详情 */
const handleViewSubform = (row: ProcessInstanceItem, columnKey: string) => {
  const data = getSubformData(row, columnKey)
  if (data.length > 0) {
    currentSubformTitle.value = `${row.name} - ${columnKey}`
    currentSubformData.value = data

    // 获取子表单的列
    const column = summaryColumns.value.find(col => col.key === columnKey)
    currentSubformColumns.value = column && column.subColumns ? column.subColumns : (data[0] && typeof data[0] === 'object' && data[0] !== null ? Object.keys(data[0]) : [])

    subformDialogVisible.value = true
  } else {
    message.warning('没有找到子表单数据')
  }
}

/** 查看所有字段 */
const handleViewAllFields = () => {
  // 构建所有字段列表
  const fields = []

  // 从当前显示的字段和总字段中提取
  const allColumns = extractAllColumns()
  const shownKeys = summaryColumns.value.map(col => col.key)

  // 保存原始显示的字段，用于重置
  originalShownFields.value = [...shownKeys]

  allColumns.forEach(column => {
    fields.push({
      key: column.key,
      isSubform: column.isSubform,
      isShown: shownKeys.includes(column.key),
      subColumns: column.subColumns
    })
  })

  allFields.value = fields
  selectedFields.value = [] // 清空选中的字段
  allFieldsDialogVisible.value = true
}

/** 提取所有字段列表（包括未显示的） */
const extractAllColumns = () => {
  const columns = new Set<string>()
  const subformColumns = new Map<string, string[]>() // 存储子表单结构

  // 从所有数据中提取唯一的摘要键
  list.value.forEach(item => {
    // 从summary中提取字段
    if (item.summary && Array.isArray(item.summary)) {
      item.summary.forEach(summary => {
        if (summary.key) {
          columns.add(summary.key)
        }
      })
    }

    // 从formVariablesDisplay中提取所有字段
    if (item.formVariablesDisplay && Array.isArray(item.formVariablesDisplay)) {
      item.formVariablesDisplay.forEach(display => {
        if (display.key && !display.key.startsWith('PROCESS_') && display.key.trim() !== '') {
          columns.add(display.key)

          // 检查新格式：value直接是数组类型（子表单）
          if (Array.isArray(display.value) && display.value.length > 0 && typeof display.value[0] === 'object' && display.value[0] !== null) {
            // 记录子表单字段
            if (!subformColumns.has(display.key)) {
              // 从第一个子表单项中提取列名
              const subColumns = Object.keys(display.value[0])
              subformColumns.set(display.key, subColumns)
            }
          }
          // 检查字符串形式的JSON数组（兼容旧格式）
          else if (display.value && typeof display.value === 'string') {
            try {
              if (display.value.startsWith('[{') && display.value.endsWith('}]')) {
                const parsedValue = JSON.parse(display.value)
                if (Array.isArray(parsedValue) && parsedValue.length > 0 && typeof parsedValue[0] === 'object' && parsedValue[0] !== null) {
                  // 这是一个子表单数据
                  if (!subformColumns.has(display.key)) {
                    const subColumns = Object.keys(parsedValue[0])
                    subformColumns.set(display.key, subColumns)
                  }
                }
              }
            } catch (e) {
              // 解析失败，不是有效的JSON
            }
          }
        }
      })
    }
  })

  // 转换为数组格式，包含普通字段和子表单字段
  return Array.from(columns).map(key => {
    // 检查是否为子表单字段
    if (subformColumns.has(key)) {
      return {
        key,
        isSubform: true,
        subColumns: subformColumns.get(key)
      }
    }
    return { key, isSubform: false }
  }) as ColumnItem[]
}

/** 查看子表单结构 */
const handleViewSubformStructure = (field) => {
  if (field.isSubform && field.subColumns) {
    ElMessageBox.alert(
      field.subColumns.join(', '),
      `子表单 "${field.key}" 的结构`,
      { confirmButtonText: '关闭' }
    )
  }
}

/** 处理字段选择变更 */
const handleSelectionChange = (selection) => {
  selectedFields.value = selection
}

/** 显示选中的字段 */
const handleShowSelectedFields = () => {
  if (selectedFields.value.length === 0) return

  // 保存选中的数量
  const selectedCount = selectedFields.value.length

  // 更新字段的显示状态
  selectedFields.value.forEach(field => {
    const index = allFields.value.findIndex(f => f.key === field.key)
    if (index !== -1) {
      allFields.value[index].isShown = true
    }
  })

  // 清空选中
  selectedFields.value = []

  // 提示用户
  message.success(`已标记 ${selectedCount} 个字段为显示，点击"应用变更"生效`)
}

/** 切换字段显示状态 */
const handleToggleField = (field) => {
  const index = allFields.value.findIndex(f => f.key === field.key)
  if (index !== -1) {
    allFields.value[index].isShown = !allFields.value[index].isShown
  }
}

/** 重置字段显示状态 */
const handleResetFields = () => {
  // 恢复到原始状态
  allFields.value.forEach(field => {
    field.isShown = originalShownFields.value.includes(field.key)
  })

  message.success('已重置为默认显示状态')
}

/** 应用字段变更 */
const handleApplyFieldChanges = () => {
  // 获取所有要显示的字段
  let fieldsToShow = allFields.value
    .filter(field => field.isShown)
    .map(field => {
      return {
        key: field.key,
        isSubform: field.isSubform,
        subColumns: field.subColumns
      }
    })

  // 检查是否有变更
  const currentKeys = summaryColumns.value.map(col => col.key).sort().join(',')
  const newKeys = fieldsToShow.map(field => field.key).sort().join(',')

  if (currentKeys === newKeys) {
    message.info('没有字段显示变更')
    allFieldsDialogVisible.value = false
    return
  }

  // 优先级字段列表（这些字段会排在前面）
  const priorityFields = [
    '反推运营发起人',
    '反推承接人1',
    '反推进度1',
    '反推产品性质1',
    '预计订货量',
    '采购成本',
    '输入框'
  ]

  // 按优先级排序
  fieldsToShow.forEach(field => {
    field.priority = priorityFields.indexOf(field.key)
  })

  fieldsToShow.sort((a, b) => {
    if (a.priority !== -1 && b.priority !== -1) {
      return a.priority - b.priority
    }
    if (a.priority !== -1) {
      return -1
    }
    if (b.priority !== -1) {
      return 1
    }
    return 0
  })

  // 限制最大显示字段数
  const maxColumns = 20
  if (fieldsToShow.length > maxColumns) {
    fieldsToShow = fieldsToShow.slice(0, maxColumns)
    message.warning(`显示字段数量已超过限制，已自动截取前 ${maxColumns} 个字段`)
  }

  // 更新显示的字段
  summaryColumns.value = fieldsToShow
  totalFieldsCount.value = allFields.value.length

  message.success('已应用字段显示变更')
  allFieldsDialogVisible.value = false
}

/** 选择所有未显示的字段 */
const handleSelectHiddenFields = () => {
  if (!fieldsTableRef.value) {
    message.warning('表格实例未找到')
    return
  }

  // 清除当前选中
  fieldsTableRef.value.clearSelection()

  // 选中所有未显示的字段
  const hiddenFields = filteredAllFields.value.filter(field => !field.isShown)

  // 选中未显示的字段
  hiddenFields.forEach(field => {
    fieldsTableRef.value!.toggleRowSelection(field, true)
  })

  if (hiddenFields.length > 0) {
    message.success(`已选中 ${hiddenFields.length} 个未显示的字段`)
  } else {
    message.info('当前没有未显示的字段')
  }
}

/**
 * 创建带合并单元格的Excel工作表（子表单按行展开）
 * @param data 数据行数组
 * @param subformColumns 子表单列配置
 * @param rowGroupCounts 每组数据行数，用于垂直合并
 */
const createMergedHeadersWorksheet = (
  data: Record<string, any>[],
  subformColumns: ColumnItem[],
  rowGroupCounts: number[]
) => {
  if (!data || data.length === 0) {
    return XLSX.utils.aoa_to_sheet([])
  }

  const firstRow = data[0]
  const baseColumns: string[] = []
  Object.keys(firstRow).forEach(key => {
    if (!key.includes('.')) {
      baseColumns.push(key)
    }
  })

  const subformGroups = subformColumns.map(col => ({
    parentKey: col.key,
    childKeys: col.subColumns || []
  }))

  const headerRow1: string[] = []
  const headerRow2: string[] = []
  const merges: XLSXRange[] = []

  baseColumns.forEach(col => {
    headerRow1.push(col)
    headerRow2.push('')
    merges.push({ s: { r: 0, c: headerRow1.length - 1 }, e: { r: 1, c: headerRow1.length - 1 } })
  })

  subformGroups.forEach(group => {
    const startCol = headerRow1.length
    headerRow1.push(group.parentKey)
    for (let i = 1; i < group.childKeys.length; i++) {
      headerRow1.push('')
    }
    group.childKeys.forEach(child => {
      headerRow2.push(child)
    })
    if (group.childKeys.length > 1) {
      merges.push({ s: { r: 0, c: startCol }, e: { r: 0, c: startCol + group.childKeys.length - 1 } })
    }
  })

  const dataRows = data.map(row => {
    const dataRow: any[] = []
    baseColumns.forEach(col => dataRow.push(row[col]))
    subformGroups.forEach(group => {
      group.childKeys.forEach(child => {
        const key = `${group.parentKey}.${child}`
        dataRow.push(row[key])
      })
    })
    return dataRow
  })

  let rowOffset = 2
  rowGroupCounts.forEach(count => {
    if (count > 1) {
      baseColumns.forEach((_, colIndex) => {
        merges.push({ s: { r: rowOffset, c: colIndex }, e: { r: rowOffset + count - 1, c: colIndex } })
      })
    }
    rowOffset += count
  })

  const worksheet = XLSX.utils.aoa_to_sheet([headerRow1, headerRow2, ...dataRows])
  worksheet['!merges'] = merges

  const columnWidths = []
  const totalColumns = headerRow2.length
  for (let i = 0; i < totalColumns; i++) {
    let width = 15
    const header1 = headerRow1[i] || ''
    const header2 = headerRow2[i] || ''
    if (i < baseColumns.length) {
      if (header1 === '流程名称' || header1 === '流程编号') {
        width = 40
      } else if (header1 === '发起时间' || header1 === '结束时间') {
        width = 20
      } else if (header1 === '当前审批任务') {
        width = 25
      } else if (header1 === '流程分类' || header1 === '流程发起人' || header1 === '流程状态') {
        width = 15
      }
    } else {
      if (header2.includes('天猫预计月销量') || header2.includes('淘工厂预计月销量')) {
        width = 20
      } else if (header2.includes('商品编码')) {
        width = 25
      } else {
        const headerLength = Math.max(header1.length, header2.length)
        width = Math.max(headerLength * 1.8, 15)
      }
    }
    columnWidths.push({ wch: width })
  }

  worksheet['!cols'] = columnWidths
  applyBordersToWorksheet(worksheet, 2)
  return worksheet
}

/**
 * 为工作表添加边框样式
 * @param {Object} worksheet 工作表对象
 * @param {Number} headerRows 表头行数（默认为1）
 * @returns {Object} 添加了边框样式的工作表对象
 */
const applyBordersToWorksheet = (worksheet: any, headerRows = 1) => {
  // 如果工作表为空，直接返回
  if (!worksheet || !worksheet['!ref']) {
    return worksheet
  }

  // 获取工作表范围
  const range = XLSX.utils.decode_range(worksheet['!ref'])

  // 定义边框样式
  const borderStyle = {
    style: 'thin', // 细线
    color: { rgb: '666666' } // 深灰色，比纯黑色更柔和
  }

  // 定义表头边框样式（稍粗一些）
  const headerBorderStyle = {
    style: 'medium', // 中等粗细
    color: { rgb: '333333' } // 深灰色
  }

  // 定义完整边框
  const fullBorder = {
    top: borderStyle,
    bottom: borderStyle,
    left: borderStyle,
    right: borderStyle
  }

  // 定义表头边框
  const headerBorder = {
    top: headerBorderStyle,
    bottom: headerBorderStyle,
    left: headerBorderStyle,
    right: headerBorderStyle
  }

  // 首先为所有单元格添加完整边框和基础样式
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellAddress = XLSX.utils.encode_cell({ r, c })

      // 如果单元格不存在，创建一个空单元格
      if (!worksheet[cellAddress]) {
        worksheet[cellAddress] = { v: '', t: 's' }
      }

      // 如果单元格没有样式，添加样式对象
      if (!worksheet[cellAddress].s) {
        worksheet[cellAddress].s = {}
      }

      // 为表头和数据行设置不同的边框和样式
      if (r < headerRows) {
        // 表头使用更粗的边框
        worksheet[cellAddress].s.border = { ...headerBorder }
        worksheet[cellAddress].s.fill = {
          type: 'pattern',
          patternType: 'solid',
          fgColor: { rgb: 'F0F0F0' } // 更浅的灰色背景
        }
        worksheet[cellAddress].s.font = {
          bold: true,
          size: 11,
          color: { rgb: '333333' }
        }
        worksheet[cellAddress].s.alignment = {
          horizontal: 'center',
          vertical: 'center',
          wrapText: false
        }
      } else {
        // 数据行使用普通边框
        worksheet[cellAddress].s.border = { ...fullBorder }
        worksheet[cellAddress].s.font = {
          size: 10,
          color: { rgb: '333333' }
        }
        worksheet[cellAddress].s.alignment = {
          horizontal: 'left',
          vertical: 'center',
          wrapText: true
        }
        // 为数据行添加交替背景色
        if (r % 2 === 0) {
          worksheet[cellAddress].s.fill = {
            type: 'pattern',
            patternType: 'solid',
            fgColor: { rgb: 'FAFAFA' } // 很浅的灰色
          }
        }
      }
    }
  }

  // 特别处理合并单元格，确保合并区域内的所有单元格都有正确的样式
  if (worksheet['!merges']) {
    worksheet['!merges'].forEach((merge: XLSXRange) => {
      const top = merge.s.r
      const bottom = merge.e.r
      const left = merge.s.c
      const right = merge.e.c

      // 为合并区域的每个单元格重新设置样式
      for (let r = top; r <= bottom; r++) {
        for (let c = left; c <= right; c++) {
          const cellAddress = XLSX.utils.encode_cell({ r, c })

          // 确保单元格存在
          if (!worksheet[cellAddress]) {
            worksheet[cellAddress] = { v: '', t: 's' }
          }

          // 确保单元格有样式对象
          if (!worksheet[cellAddress].s) {
            worksheet[cellAddress].s = {}
          }

          // 为合并单元格设置边框和样式
          if (r < headerRows) {
            // 合并表头单元格使用表头边框
            worksheet[cellAddress].s.border = { ...headerBorder }
            worksheet[cellAddress].s.fill = {
              type: 'pattern',
              patternType: 'solid',
              fgColor: { rgb: 'E8E8E8' } // 合并表头使用稍深的灰色
            }
            worksheet[cellAddress].s.font = {
              bold: true,
              size: 11,
              color: { rgb: '333333' }
            }
            worksheet[cellAddress].s.alignment = {
              horizontal: 'center',
              vertical: 'center',
              wrapText: false
            }
          } else {
            // 合并数据单元格使用普通边框
            worksheet[cellAddress].s.border = { ...fullBorder }
            worksheet[cellAddress].s.font = {
              size: 10,
              color: { rgb: '333333' }
            }
            worksheet[cellAddress].s.alignment = {
              horizontal: 'center',
              vertical: 'center',
              wrapText: true
            }
          }
        }
      }
    })
  }

  // 最后确保所有单元格都存在并有内容
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellAddress = XLSX.utils.encode_cell({ r, c })

      // 如果单元格仍然没有值，设置为空字符串
      if (!worksheet[cellAddress] || worksheet[cellAddress].v === undefined || worksheet[cellAddress].v === null) {
        if (!worksheet[cellAddress]) {
          worksheet[cellAddress] = { v: '', t: 's' }
        } else {
          worksheet[cellAddress].v = ''
          worksheet[cellAddress].t = 's'
        }

        // 确保空单元格也有样式
        if (!worksheet[cellAddress].s) {
          worksheet[cellAddress].s = {}
        }

        // 为空单元格设置边框和基础样式
        if (r < headerRows) {
          worksheet[cellAddress].s.border = { ...headerBorder }
          worksheet[cellAddress].s.fill = {
            type: 'pattern',
            patternType: 'solid',
            fgColor: { rgb: 'F0F0F0' }
          }
          worksheet[cellAddress].s.font = {
            bold: true,
            size: 11,
            color: { rgb: '333333' }
          }
          worksheet[cellAddress].s.alignment = {
            horizontal: 'center',
            vertical: 'center',
            wrapText: false
          }
        } else {
          worksheet[cellAddress].s.border = { ...fullBorder }
          worksheet[cellAddress].s.font = {
            size: 10,
            color: { rgb: '999999' } // 空值用浅色显示
          }
          worksheet[cellAddress].s.alignment = {
            horizontal: 'center',
            vertical: 'center',
            wrapText: false
          }
          // 空值单元格使用更浅的背景色
          worksheet[cellAddress].s.fill = {
            type: 'pattern',
            patternType: 'solid',
            fgColor: { rgb: 'F8F8F8' }
          }
        }
      }
    }
  }

  return worksheet
}

/** 格式化任务创建时间 */
const formatTaskCreateTime = (timestamp: number) => {
  if (!timestamp) return '-'
  return dateFormatter(null, null, new Date(timestamp))
}

/** 计算任务运行时长 */
const calculateTaskRunningTime = (timestamp: number) => {
  if (!timestamp) return '-'
  const duration = Date.now() - timestamp
  return formatPast2(duration)
}

/** 格式化任务运行时长用于导出 */
const formatTasksRunningTimeForExport = (tasks: ProcessTask[]): string => {
  if (!tasks || tasks.length === 0) {
    return '-'
  }
  return tasks.map(task => `${task.name}: ${calculateTaskRunningTime(task.createTime)}`).join(', ')
}

/** 格式化任务运行时间用于导出 */
const formatTasksCreateTimeForExport = (tasks: ProcessTask[]): string => {
  if (!tasks || tasks.length === 0) {
    return '-'
  }
  return tasks.map(task => `${task.name}: ${formatTaskCreateTime(task.createTime)}`).join(', ')
}

/** 获取列宽度 */
const getColumnWidth = (column: ColumnItem): number => {
  // 基础宽度
  let width = 120

  // 根据字段名长度调整
  const labelLength = column.key.length
  width += Math.min(labelLength * 8, 100)

  // 根据字段类型调整
  if (column.isSubform) {
    width = Math.max(width, 200) // 子表单字段需要更多空间
  } else {
    // 根据字段重要性调整
    if (column.smartPriority && column.smartPriority > 200) {
      width += 50 // 重要字段给更多空间
    }

    // 根据数据填充率调整
    if (column.fillRate && column.fillRate > 0.8) {
      width += 30 // 数据充足的字段给更多空间
    }
  }

  // 特定字段的宽度优化
  const wideFields = ['推品名称', '产品线简称', '供应商名称', '特殊备注', '产品信息']
  if (wideFields.some(field => column.key.includes(field))) {
    width = Math.max(width, 250)
  }

  // 数组类型字段需要更多空间（如类目选择）
  const arrayFields = ['类目选择', '选择', '列表', '多选']
  if (arrayFields.some(field => column.key.includes(field))) {
    width = Math.max(width, 300)
  }

  const narrowFields = ['日期', '状态', '属性', '数量']
  if (narrowFields.some(field => column.key.includes(field))) {
    width = Math.min(width, 150)
  }

  // 确保宽度在合理范围内
  return Math.max(120, Math.min(width, 400))
}

/** 获取列样式类名 */
const getColumnClass = (column: ColumnItem): string => {
  const classes = ['custom-column']

  if (column.isSubform) {
    classes.push('subform-column')
  }

  if (column.smartPriority && column.smartPriority > 200) {
    classes.push('high-priority-column')
  }

  if (column.fillRate && column.fillRate > 0.8) {
    classes.push('high-fill-column')
  } else if (column.fillRate && column.fillRate < 0.3) {
    classes.push('low-fill-column')
  }

  return classes.join(' ')
}

/** 获取列提示信息 */
const getColumnTooltip = (column: ColumnItem): string => {
  const tooltips = []

  if (column.fillRate !== undefined) {
    tooltips.push(`数据填充率: ${(column.fillRate * 100).toFixed(1)}%`)
  }

  if (column.smartPriority !== undefined) {
    tooltips.push(`智能优先级: ${column.smartPriority}`)
  }

  if (column.isSubform) {
    tooltips.push('子表单字段，点击查看详情')
  }

  return tooltips.length > 0 ? tooltips.join('\n') : ''
}

/** 判断是否为长内容 */
const isLongContent = (content: string): boolean => {
  if (!content || content === '-') return false
  return content.length > 50 || content.includes('\n')
}

/** 判断是否为数组字段 */
const isArrayField = (row: ProcessInstanceItem, key: string): boolean => {
  // 首先从formVariablesDisplay中检查
  if (row.formVariablesDisplay && Array.isArray(row.formVariablesDisplay)) {
    const displayItem = row.formVariablesDisplay.find(item => item.key === key)
    if (displayItem && Array.isArray(displayItem.value)) {
      // 如果是字符串或数字数组，返回true
      return displayItem.value.length > 0 && (typeof displayItem.value[0] === 'string' || typeof displayItem.value[0] === 'number')
    }
  }

  // 检查summary
  if (row.summary && Array.isArray(row.summary)) {
    const summaryItem = row.summary.find(item => item.key === key)
    if (summaryItem && Array.isArray(summaryItem.value)) {
      return summaryItem.value.length > 0 && (typeof summaryItem.value[0] === 'string' || typeof summaryItem.value[0] === 'number')
    }
  }

  return false
}

/** 获取数组字段的完整数据 */
const getArrayFieldData = (row: ProcessInstanceItem, key: string): any[] => {
  // 首先从formVariablesDisplay中获取
  if (row.formVariablesDisplay && Array.isArray(row.formVariablesDisplay)) {
    const displayItem = row.formVariablesDisplay.find(item => item.key === key)
    if (displayItem && Array.isArray(displayItem.value)) {
      return displayItem.value.filter(item => item !== null && item !== undefined && item !== '')
    }
  }

  // 检查summary
  if (row.summary && Array.isArray(row.summary)) {
    const summaryItem = row.summary.find(item => item.key === key)
    if (summaryItem && Array.isArray(summaryItem.value)) {
      return summaryItem.value.filter(item => item !== null && item !== undefined && item !== '')
    }
  }

  return []
}


</script>

<style scoped>
.empty-value {
  color: #999;
  font-style: italic;
}
.variables-value {
  white-space: pre-wrap;
  word-break: break-all;
}
:deep(.variables-item) {
  .el-descriptions__label {
    width: 200px;
    font-weight: bold;
  }
  .el-descriptions__content {
    min-width: 300px;
  }
}

/* 列样式优化 */
.column-header {
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.column-title {
  flex: 1;
  text-align: center;
}

.field-content {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  word-break: break-word;
  line-height: 1.4;
}

.array-field-content {
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 2px 6px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
}

.array-field-content:hover {
  background-color: #f0f9ff;
  color: #1d4ed8;
}

.array-content-detail {
  max-height: 200px;
  overflow-y: auto;
  padding: 8px 0;
}

.array-content-detail ul {
  margin: 0;
  padding-left: 16px;
}

.array-content-detail li {
  margin: 4px 0;
  color: #374151;
  line-height: 1.5;
}

/* 列优先级样式 */
:deep(.custom-column) {
  .cell {
    padding: 8px 12px;
  }
}

:deep(.high-priority-column) {
  background-color: rgba(64, 158, 255, 0.05);
  .cell {
    font-weight: 500;
  }
}

:deep(.subform-column) {
  background-color: rgba(103, 194, 58, 0.05);
}



:deep(.low-fill-column) {
  .cell {
    border-left: 3px solid #f56c6c;
    color: #999;
  }
}

/* 表格整体优化 */
:deep(.el-table) {
  .el-table__header-wrapper {
    th {
      background-color: #f8f9fa;
      color: #606266;
      font-weight: 600;
    }
  }

  .el-table__body-wrapper {
    .el-table__row {
      &:hover {
        background-color: #f5f7fa;
      }
    }
  }

  /* 固定列阴影效果 */
  .el-table__fixed-left::before {
    box-shadow: 2px 0 6px rgba(0, 0, 0, 0.1);
  }

  .el-table__fixed-right::before {
    box-shadow: -2px 0 6px rgba(0, 0, 0, 0.1);
  }

  /* 增强滚动条显示 */
  .el-scrollbar__bar {
    opacity: 1 !important;
    z-index: 100;
  }

  .el-scrollbar__bar.is-vertical {
    right: 0;
    width: 8px;
  }

  .el-scrollbar__bar.is-horizontal {
    bottom: 0;
    height: 8px;
  }

  .el-scrollbar__thumb {
    background-color: #409eff !important;
    border-radius: 4px;
    opacity: 0.7;
    transition: all 0.3s ease;
  }

  .el-scrollbar__thumb:hover {
    background-color: #337ecc !important;
    opacity: 1;
  }

  /* 滚动轨道 */
  .el-scrollbar__track {
    background-color: #f5f5f5;
    border-radius: 4px;
    opacity: 0.8;
  }

  .el-scrollbar__track:hover {
    background-color: #e8e8e8;
  }
}

/* 数据模式状态栏样式 */
.data-mode-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: linear-gradient(to right, #f8fffe, #f0f9f0);
  border: 1px solid #e1f3d8;
  border-radius: 6px;
  font-size: 14px;
  margin-bottom: 8px;
}

.data-mode-status.error {
  background: linear-gradient(to right, #fef9f7, #fef3f0);
  border-color: #fed7cc;
}

.status-main {
  display: flex;
  align-items: center;
  flex: 1;
}

.status-actions {
  display: flex;
  align-items: center;
}

/* 表格容器样式 */
:deep(.el-table) {
  /* 确保表格可以水平滚动 */
  overflow-x: auto;
  overflow-y: auto;

  /* 添加滚动指示器 */
  box-shadow: inset 0 -1px 3px rgba(0, 0, 0, 0.1);
}

:deep(.el-table__body-wrapper) {
  /* 确保表格主体可以滚动 */
  overflow-x: auto;
  overflow-y: auto;

  /* 添加滚动阴影提示 */
  background:
    linear-gradient(90deg, white 30%, rgba(255,255,255,0)),
    linear-gradient(90deg, rgba(255,255,255,0), white 70%),
    radial-gradient(farthest-side at 0 50%, rgba(0,0,0,.2), rgba(0,0,0,0)),
    radial-gradient(farthest-side at 100% 50%, rgba(0,0,0,.2), rgba(0,0,0,0));
  background-repeat: no-repeat;
  background-size: 40px 100%, 40px 100%, 14px 100%, 14px 100%;
  background-position: 0 0, 100%, 0 0, 100%;
  background-attachment: local, local, scroll, scroll;
}

:deep(.el-table__header-wrapper) {
  /* 确保表头和主体滚动同步 */
  overflow-x: hidden;
}

/* 表格包装器 */
.table-wrapper {
  position: relative;
  width: 100%;
}



/* 固定高度容器 */
.table-container {
  position: relative;
  height: 100%;
  overflow: hidden;
}

/* 响应式调整 */
@media (max-width: 1600px) {
  :deep(.custom-column) {
    .cell {
      padding: 6px 8px;
      font-size: 13px;
    }
  }
}

@media (max-width: 1200px) {
  :deep(.custom-column) {
    .cell {
      padding: 4px 6px;
      font-size: 12px;
    }
  }

  /* 小屏幕下调整表格高度 */
  .table-container {
    height: 400px;
  }
}
</style>
