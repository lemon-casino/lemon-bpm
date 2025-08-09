<template>
  <ContentWrap>
    <el-table v-loading="loading" :data="list">
      <el-table-column label="定义编号" align="center" prop="id" width="400" />
      <el-table-column label="流程名称" align="center" prop="name" width="200">
        <template #default="scope">
          <el-button type="primary" link @click="handleBpmnDetail(scope.row)">
            <span>{{ scope.row.name }}</span>
          </el-button>
        </template>
      </el-table-column>
      <el-table-column label="定义分类" align="center" prop="categoryName" width="100" />
      <el-table-column label="表单信息" align="center" prop="formType" width="200">
        <template #default="scope">
          <el-button
            v-if="scope.row.formType === 10"
            type="primary"
            link
            @click="handleFormDetail(scope.row)"
          >
            <span>{{ scope.row.formName }}</span>
          </el-button>
          <el-button v-else type="primary" link @click="handleFormDetail(scope.row)">
            <span>{{ scope.row.formCustomCreatePath }}</span>
          </el-button>
        </template>
      </el-table-column>
      <el-table-column label="流程版本" align="center" prop="processDefinition.version" width="80">
        <template #default="scope">
          <el-tag v-if="scope.row">v{{ scope.row.version }}</el-tag>
          <el-tag type="warning" v-else>未部署</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态 - 运行实例" align="center" prop="version" width="140" >
        <template #default="scope">
          <el-tag type="success" v-if="scope.row.suspensionState === 1" >激活</el-tag>
          <el-tag type="warning" v-if="scope.row.suspensionState === 2">挂起</el-tag>
          <el-tag type="success" v-if="scope.row.hasRunningInstance === 1" style="margin-left: 5px">有</el-tag>
          <el-tag type="danger" v-if="scope.row.hasRunningInstance === 0"  style="margin-left: 5px">无</el-tag>
        </template>
      </el-table-column>

      <el-table-column
        label="部署时间"
        align="center"
        prop="deploymentTime"
        width="180"
        :formatter="dateFormatter"
      />
      <el-table-column
        label="操作"
        align="center"
        width="180"
      >
        <template #default="scope">
          <el-button
            type="primary"
            link
            @click="handleEdit(scope.row)"
            v-if="checkPermi(['bpm:model:update'])"
          >
            编辑
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

  <!-- 弹窗：表单详情 -->
  <Dialog title="表单详情" v-model="formDetailVisible" width="800">
    <form-create :rule="formDetailPreview.rule" :option="formDetailPreview.option" />
  </Dialog>

  <!-- 弹窗：流程模型图的预览 -->
  <Dialog title="流程图" v-model="bpmnDetailVisible" width="800">
    <MyProcessViewer style="height: 700px" key="designer" :xml="bpmnXml" />
  </Dialog>
</template>

<script lang="ts" setup>
import { dateFormatter } from '@/utils/formatTime'
import { MyProcessViewer } from '@/components/bpmnProcessDesigner/package'
import * as DefinitionApi from '@/api/bpm/definition'
import { setConfAndFields2 } from '@/utils/formCreate'
import { checkPermi } from '@/utils/permission'
import { useMessage } from '@/hooks/web/useMessage'

defineOptions({ name: 'BpmProcessDefinition' })

const { push } = useRouter() // 路由
const { query } = useRoute() // 查询参数
const message = useMessage() // 消息提示

const loading = ref(true) // 列表的加载中
const total = ref(0) // 列表的总页数
const list = ref([]) // 列表的数据
const queryParams = reactive({
  pageNo: 1,
  pageSize: 10,
  key: query.key
})

/** 查询列表 */
const getList = async () => {
  loading.value = true
  try {
    const data = await DefinitionApi.getProcessDefinitionPage(queryParams)
    list.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}

/** 流程表单的详情按钮操作 */
const formDetailVisible = ref(false)
const formDetailPreview = ref({
  rule: [],
  option: {}
})
const handleFormDetail = async (row: any) => {
  if (row.formType == 10) {
    // 设置表单
    setConfAndFields2(formDetailPreview, row.formConf, row.formFields)
    // 弹窗打开
    formDetailVisible.value = true
  } else {
    await push({
      path: row.formCustomCreatePath
    })
  }
}

/** 流程图的详情按钮操作 */
const bpmnDetailVisible = ref(false)
const bpmnXml = ref('')
const handleBpmnDetail = async (row: any) => {
  // 设置可见
  bpmnXml.value = ''
  bpmnDetailVisible.value = true
  // 加载 BPMN XML
  bpmnXml.value = (await DefinitionApi.getProcessDefinition(row.id))?.bpmnXml
}

/** 编辑按钮操作 */
const handleEdit = async (row: any) => {
  if (!row.modelId) {
    console.error('modelId 不存在', row);
    message.error('流程模型ID不存在，无法编辑');
    return;
  }
  
  // 确保 modelId 是字符串类型，并去除可能的空格
  const modelId = String(row.modelId).trim();
  console.log('编辑流程定义', row);
  console.log('modelId:', modelId, 'type:', typeof modelId);
  
  try {
    // 显示确认对话框，提醒用户这是从历史流程进行编辑
    await message.confirm(
      '您正在编辑历史流程版本，保存后将会创建新的流程版本，所有使用此流程的流程实例将会转到新版本。确定要继续吗？',
      '编辑提示',
      {
        type: 'warning',
        confirmButtonText: '确定编辑',
        cancelButtonText: '取消'
      }
    );
    
    // 用户确认后，执行路由跳转
    // 使用 useRouter 的 push 方法
    push({
      name: 'BpmModelUpdate',
      params: {
        type: 'edit',
        id: modelId
      },
      query: { 
        processDefinitionId: row.id 
      }
    });
    console.log('路由跳转成功');
  } catch (error) {
    // 用户取消或发生错误
    console.error('路由跳转失败或用户取消:', error);
  }
}

/** 初始化 **/
onMounted(() => {
  getList()
})
</script>
