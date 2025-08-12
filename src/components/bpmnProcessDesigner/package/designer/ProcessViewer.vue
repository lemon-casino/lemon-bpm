<template>
  <div class="process-viewer">
    <div style="height: 100%" ref="processCanvas" v-show="!isLoading"> </div>
    <!-- 自定义箭头样式，用于已完成状态下流程连线箭头 -->
    <!-- 通过脚本动态创建 defs，避免直接操作由 Vue 管理的 DOM 节点导致的报错 -->

    <!-- 审批记录 -->
    <el-dialog :title="dialogTitle || '审批记录'" v-model="dialogVisible" width="1000px">
      <el-row>
        <el-table
          :data="selectTasks"
          size="small"
          border
          header-cell-class-name="table-header-gray"
        >
          <el-table-column
            label="序号"
            header-align="center"
            align="center"
            type="index"
            width="50"
          />
          <el-table-column
            label="审批人"
            min-width="100"
            align="center"
            v-if="selectActivityType === 'bpmn:UserTask'"
          >
            <template #default="scope">
              {{ scope.row.assigneeUser?.nickname || scope.row.ownerUser?.nickname }}
            </template>
          </el-table-column>
          <el-table-column
            label="发起人"
            prop="assigneeUser.nickname"
            min-width="100"
            align="center"
            v-else
          />
          <el-table-column label="部门" min-width="100" align="center">
            <template #default="scope">
              {{ scope.row.assigneeUser?.deptName || scope.row.ownerUser?.deptName }}
            </template>
          </el-table-column>
          <el-table-column
            :formatter="dateFormatter"
            align="center"
            label="开始时间"
            prop="createTime"
            min-width="140"
          />
          <el-table-column
            :formatter="dateFormatter"
            align="center"
            label="结束时间"
            prop="endTime"
            min-width="140"
          />
          <el-table-column align="center" label="审批状态" prop="status" min-width="90">
            <template #default="scope">
              <dict-tag :type="DICT_TYPE.BPM_TASK_STATUS" :value="scope.row.status" />
            </template>
          </el-table-column>
          <el-table-column
            align="center"
            label="审批建议"
            prop="reason"
            min-width="120"
            v-if="selectActivityType === 'bpmn:UserTask'"
          />
          <el-table-column align="center" label="耗时" prop="durationInMillis" width="100">
            <template #default="scope">
              {{ formatPast2(scope.row.durationInMillis) }}
            </template>
          </el-table-column>
        </el-table>
      </el-row>
    </el-dialog>

    <!-- Zoom：放大、缩小 -->
    <div style="position: absolute; top: 0; left: 0; width: 100%">
      <el-row type="flex" justify="end">
        <el-button-group key="scale-control" size="default">
          <el-button
            size="default"
            :plain="true"
            :disabled="defaultZoom <= 0.3"
            :icon="ZoomOut"
            @click="processZoomOut()"
          />
          <el-button size="default" style="width: 90px">
            {{ Math.floor(defaultZoom * 10 * 10) + '%' }}
          </el-button>
          <el-button
            size="default"
            :plain="true"
            :disabled="defaultZoom >= 3.9"
            :icon="ZoomIn"
            @click="processZoomIn()"
          />
          <el-button size="default" :icon="ScaleToOriginal" @click="processReZoom()" />
        </el-button-group>
      </el-row>
    </div>
  </div>
</template>

<script lang="ts" setup>
import '../theme/index.scss'
import BpmnViewer from 'bpmn-js/lib/Viewer'
import MoveCanvasModule from 'diagram-js/lib/navigation/movecanvas'
import { ZoomOut, ZoomIn, ScaleToOriginal } from '@element-plus/icons-vue'
import { DICT_TYPE } from '@/utils/dict'
import { dateFormatter, formatPast2 } from '@/utils/formatTime'
import { BpmProcessInstanceStatus } from '@/utils/constants'

const props = defineProps({
  xml: {
    type: String,
    required: true
  },
  view: {
    type: Object,
    required: true
  }
})

const processCanvas = ref()
const bpmnViewer = ref<BpmnViewer | null>(null)
const defaultZoom = ref(1) // 默认缩放比例
const isLoading = ref(false) // 是否加载中
const hasMounted = ref(false)

const processInstance = ref<any>({}) // 流程实例
const tasks = ref([]) // 流程任务

const dialogVisible = ref(false) // 弹窗可见性
const dialogTitle = ref<string | undefined>(undefined) // 弹窗标题
const selectActivityType = ref<string | undefined>(undefined) // 选中 Task 的活动编号
const selectTasks = ref<any[]>([]) // 选中的任务数组

/** Zoom：恢复 */
const processReZoom = () => {
  defaultZoom.value = 1
  bpmnViewer.value?.get('canvas').zoom('fit-viewport', 'auto')
}

/** Zoom：放大 */
const processZoomIn = (zoomStep = 0.1) => {
  let newZoom = Math.floor(defaultZoom.value * 100 + zoomStep * 100) / 100
  if (newZoom > 4) {
    throw new Error('[Process Designer Warn ]: The zoom ratio cannot be greater than 4')
  }
  defaultZoom.value = newZoom
  bpmnViewer.value?.get('canvas').zoom(defaultZoom.value)
}

/** Zoom：缩小 */
const processZoomOut = (zoomStep = 0.1) => {
  let newZoom = Math.floor(defaultZoom.value * 100 - zoomStep * 100) / 100
  if (newZoom < 0.2) {
    throw new Error('[Process Designer Warn ]: The zoom ratio cannot be less than 0.2')
  }
  defaultZoom.value = newZoom
  bpmnViewer.value?.get('canvas').zoom(defaultZoom.value)
}

/** 流程图预览清空 */
const clearViewer = () => {
  if (processCanvas.value) {
    processCanvas.value.innerHTML = ''
  }
  if (bpmnViewer.value) {
    bpmnViewer.value.destroy()
  }
  bpmnViewer.value = null
}

/** 添加自定义箭头 */
// TODO 芋艿：自定义箭头不生效，有点奇怪！！！！相关的 marker-end、marker-start 暂时也注释了！！！
// 通过脚本动态创建完成状态下的连线箭头样式
const addCustomDefs = () => {
  if (!bpmnViewer.value) {
    return
  }
  const canvas = bpmnViewer.value.get('canvas')
  const svg: SVGSVGElement = canvas?._svg
  if (!svg) {
    return
  }

  // 如果已经存在自定义箭头，则无需再次添加
  if (svg.querySelector('#sequenceflow-end-white-success')) {
    return
  }

  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')

  const successMarker = document.createElementNS('http://www.w3.org/2000/svg', 'marker')
  successMarker.setAttribute('id', 'sequenceflow-end-white-success')
  successMarker.setAttribute('viewBox', '0 0 20 20')
  successMarker.setAttribute('refX', '11')
  successMarker.setAttribute('refY', '10')
  successMarker.setAttribute('markerWidth', '10')
  successMarker.setAttribute('markerHeight', '10')
  successMarker.setAttribute('orient', 'auto')

  const successPath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  successPath.setAttribute('class', 'success-arrow')
  successPath.setAttribute('d', 'M 1 5 L 11 10 L 1 15 Z')
  successPath.setAttribute('style', 'stroke-width: 1px; stroke-linecap: round; stroke-dasharray: 10000, 1')
  successMarker.appendChild(successPath)

  const conditionalMarker = document.createElementNS('http://www.w3.org/2000/svg', 'marker')
  conditionalMarker.setAttribute('id', 'conditional-flow-marker-white-success')
  conditionalMarker.setAttribute('viewBox', '0 0 20 20')
  conditionalMarker.setAttribute('refX', '-1')
  conditionalMarker.setAttribute('refY', '10')
  conditionalMarker.setAttribute('markerWidth', '10')
  conditionalMarker.setAttribute('markerHeight', '10')
  conditionalMarker.setAttribute('orient', 'auto')

  const conditionalPath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  conditionalPath.setAttribute('class', 'success-conditional')
  conditionalPath.setAttribute('d', 'M 0 10 L 8 6 L 16 10 L 8 14 Z')
  conditionalPath.setAttribute('style', 'stroke-width: 1px; stroke-linecap: round; stroke-dasharray: 10000, 1')
  conditionalMarker.appendChild(conditionalPath)

  defs.appendChild(successMarker)
  defs.appendChild(conditionalMarker)
  svg.appendChild(defs)
}

/** 节点选中 */
const onSelectElement = (element: any) => {
  // 清空原选中
  selectActivityType.value = undefined
  dialogTitle.value = undefined
  if (!element || !processInstance.value?.id) {
    return
  }

  // UserTask 的情况
  const activityType = element.type
  selectActivityType.value = activityType
  if (activityType === 'bpmn:UserTask') {
    dialogTitle.value = element.businessObject ? element.businessObject.name : undefined
    selectTasks.value = tasks.value.filter((item: any) => item?.taskDefinitionKey === element.id)
    dialogVisible.value = true
  } else if (activityType === 'bpmn:EndEvent' || activityType === 'bpmn:StartEvent') {
    dialogTitle.value = '审批信息'
    selectTasks.value = [
      {
        assigneeUser: processInstance.value.startUser,
        createTime: processInstance.value.startTime,
        endTime: processInstance.value.endTime,
        status: processInstance.value.status,
        durationInMillis: processInstance.value.durationInMillis
      }
    ]
    dialogVisible.value = true
  }
}

/** 修复 SequenceFlow 中缺少 sourceRef 或 targetRef 的问题 */
const fixSequenceFlowRefs = (xml: string): string => {
  // 如果XML为空，直接返回
  if (!xml) return xml

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, 'application/xml')

    const invalidIds: string[] = []
    // 查找所有 SequenceFlow 标签
    const sequenceFlows = Array.from(doc.getElementsByTagName('bpmn:SequenceFlow'))
    sequenceFlows.forEach((flow) => {
      const id = flow.getAttribute('id') || ''
      const hasSource = flow.hasAttribute('sourceRef')
      const hasTarget = flow.hasAttribute('targetRef')
      if (!hasSource || !hasTarget) {
        invalidIds.push(id)
        flow.parentNode?.removeChild(flow)
      }
    })

    if (invalidIds.length > 0) {
      console.warn(`[BPM流程图] 发现 ${invalidIds.length} 个缺少 sourceRef 或 targetRef 的 SequenceFlow 元素，已自动移除`)

      // 同时尝试移除相关的 BPMNEdge 元素 (DI部分的可视化)
      const edges = Array.from(doc.getElementsByTagName('bpmndi:BPMNEdge'))
      edges.forEach((edge) => {
        const ref = edge.getAttribute('bpmnElement') || ''
        if (invalidIds.includes(ref)) {
          edge.parentNode?.removeChild(edge)
        }
      })

      console.info('[BPM流程图] XML修复完成，已移除所有无效连线')
    }

    return new XMLSerializer().serializeToString(doc)
  } catch (error) {
    console.error('[BPM流程图] 修复XML时出错:', error)
    // 提供详细的错误信息
    if (error instanceof Error) {
      console.error('[BPM流程图] 错误详情:', error.message)
      console.error('[BPM流程图] 错误堆栈:', error.stack)
    }

    return xml // 如果处理过程中出错，返回原始XML
  }
}

/** 初始化 BPMN 视图 */
const importXML = async (xml: string) => {
  // 清空流程图
  clearViewer()

  // 初始化流程图
  if (xml != null && xml !== '') {
    try {
      const fixedXml = fixSequenceFlowRefs(xml)

      const viewer = new BpmnViewer({
        additionalModules: [MoveCanvasModule],
        container: processCanvas.value
      })
      bpmnViewer.value = viewer
      viewer.on('element.click', ({ element }) => {
        onSelectElement(element)
      })

      isLoading.value = true
      await viewer.importXML(fixedXml)
      addCustomDefs()
    } catch (e: any) {
      console.error('[BPM流程图] 导入XML出错:', e)
      clearViewer()

      const msg = typeof e === 'string' ? e : e?.toString?.() ?? ''
      if (msg.includes('targetRef not specified') || msg.includes('sourceRef not specified')) {
        console.warn('[BPM流程图] 检测到SequenceFlow缺少 sourceRef 或 targetRef，尝试移除问题元素后重新导入')

        try {
          const fallbackXml = xml.replace(/<bpmn:SequenceFlow[^>]*>[\s\S]*?<\/bpmn:SequenceFlow>/g, '')

          const viewer = new BpmnViewer({
            additionalModules: [MoveCanvasModule],
            container: processCanvas.value
          })
          bpmnViewer.value = viewer
          await viewer.importXML(fallbackXml)
          console.log('[BPM流程图] 已移除所有SequenceFlow元素，流程图仅显示节点')
        } catch (fallbackError) {
          console.error('[BPM流程图] 降级方案也失败:', fallbackError)
        }
      }
    } finally {
      isLoading.value = false
      setProcessStatus(props.view)
    }
  }
}

/** 高亮流程 */
const setProcessStatus = (view: any) => {
  // 设置相关变量
  if (!view || !view.processInstance) {
    return
  }
  processInstance.value = view.processInstance
  tasks.value = view.tasks
  if (isLoading.value || !bpmnViewer.value) {
    return
  }
  const {
    unfinishedTaskActivityIds,
    finishedTaskActivityIds,
    finishedSequenceFlowActivityIds,
    rejectedTaskActivityIds
  } = view
  const canvas: any = bpmnViewer.value.get('canvas')
  const elementRegistry: any = bpmnViewer.value.get('elementRegistry')

  // 已完成节点
  if (Array.isArray(finishedSequenceFlowActivityIds)) {
    finishedSequenceFlowActivityIds.forEach((item: any) => {
      if (item != null) {
        canvas.addMarker(item, 'success')
        const element = elementRegistry.get(item)
        const conditionExpression = element.businessObject.conditionExpression
        if (conditionExpression) {
          canvas.addMarker(item, 'condition-expression')
        }
      }
    })
  }
  if (Array.isArray(finishedTaskActivityIds)) {
    finishedTaskActivityIds.forEach((item: any) => canvas.addMarker(item, 'success'))
  }

  // 未完成节点
  if (Array.isArray(unfinishedTaskActivityIds)) {
    unfinishedTaskActivityIds.forEach((item: any) => canvas.addMarker(item, 'primary'))
  }

  // 被拒绝节点
  if (Array.isArray(rejectedTaskActivityIds)) {
    rejectedTaskActivityIds.forEach((item: any) => {
      if (item != null) {
        canvas.addMarker(item, 'danger')
      }
    })
  }

  // 特殊：处理 end 节点的高亮。因为 end 在拒绝、取消时，被后端计算成了 finishedTaskActivityIds 里
  if (
    [BpmProcessInstanceStatus.CANCEL, BpmProcessInstanceStatus.REJECT].includes(
      processInstance.value.status
    )
  ) {
    const endNodes = elementRegistry.filter((element: any) => element.type === 'bpmn:EndEvent')
    endNodes.forEach((item: any) => {
      canvas.removeMarker(item.id, 'success')
      if (processInstance.value.status === BpmProcessInstanceStatus.CANCEL) {
        canvas.addMarker(item.id, 'cancel')
      } else {
        canvas.addMarker(item.id, 'danger')
      }
    })
  }
}

watch(
  () => props.xml,
  (newXml: string) => {
    if (hasMounted.value) {
      importXML(newXml)
    }
  }
)

watch(
  () => props.view,
  (newView: any) => {
    if (hasMounted.value) {
      setProcessStatus(newView)
    }
  }
)

/** mounted：初始化 */
onMounted(() => {
  hasMounted.value = true
  importXML(props.xml)
  setProcessStatus(props.view)
})

/** unmount：销毁 */
onBeforeUnmount(() => {
  clearViewer()
  hasMounted.value = false
})
</script>
