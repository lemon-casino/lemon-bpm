<template>
  <ContentWrap :bodyStyle="{ padding: '10px 20px 0' }">
    <div class="processInstance-wrap-main position-relative">
      <el-scrollbar>
        <div class="text-#878c93 h-15px process-name">流程：{{ selectProcessDefinition.name }}</div>
        <el-divider class="!my-8px process-divider" />

        <!-- 中间主要内容 tab 栏 -->
        <el-tabs v-model="activeTab" class="process-tabs">
          <!-- 表单信息 -->
          <el-tab-pane label="表单填写" name="form">
            <div class="form-scroll-area" v-loading="processInstanceStartLoading">
              <el-scrollbar>
                <el-row :gutter="10">
                  <el-col :xs="24" :sm="24" :md="17" :lg="17" :xl="17">
                    <form-create
                      :rule="detailForm.rule"
                      v-model:api="fApi"
                      v-model="detailForm.value"
                      :option="detailForm.option"
                      @submit="submitForm"
                      class="form-component"
                    />
                  </el-col>

                  <el-col :xs="24" :sm="24" :md="6" :lg="6" :xl="6" :offset="1" class="timeline-col">
                    <!-- 流程时间线 -->
                    <ProcessInstanceTimeline
                      ref="timelineRef"
                      :activity-nodes="activityNodes"
                      :show-status-icon="false"
                      @select-user-confirm="selectUserConfirm"
                    />
                  </el-col>
                </el-row>
              </el-scrollbar>
            </div>
          </el-tab-pane>
          <!-- 流程图 -->
          <el-tab-pane label="流程图" name="diagram">
            <div class="form-scroll-area">
              <!-- BPMN 流程图预览 -->
              <ProcessInstanceBpmnViewer
                :bpmn-xml="bpmnXML"
                v-if="BpmModelType.BPMN === selectProcessDefinition.modelType"
                class="process-viewer-component"
              />

              <!-- Simple 流程图预览 -->
              <ProcessInstanceSimpleViewer
                :simple-json="simpleJson"
                v-if="BpmModelType.SIMPLE === selectProcessDefinition.modelType"
                class="process-viewer-component"
              />
            </div>
          </el-tab-pane>
        </el-tabs>

        <!-- 底部操作栏 -->
        <div class="b-t-solid border-t-1px border-[var(--el-border-color)] operation-button-container">
          <!-- 操作栏按钮 -->
          <div
            v-if="activeTab === 'form'"
            class="h-50px bottom-10 text-14px flex items-center color-#32373c dark:color-#fff font-bold btn-container"
          >
            <el-button
              plain type="success" @click="submitForm" :disabled="fileUploading || processInstanceStartLoading"
              :class="{'opacity-50 cursor-not-allowed': fileUploading || processInstanceStartLoading}">
              <Icon v-if="processInstanceStartLoading"  class="button-icon animate-spin mr-1" />
              <Icon v-else icon="ep:select" class="button-icon" />&nbsp; 发起
            </el-button>

            <el-button plain type="danger" @click="handleCancel" class="cancel-button">
              <Icon icon="ep:close" class="button-icon" />&nbsp; 取消
            </el-button>
            <el-button plain @click="openDraftBox" class="cancel-sketch">
              <Icon icon="ep:edit" class="button-icon" />&nbsp; 草稿箱
            </el-button>
            <!-- 文件上传状态指示器 -->
            <div v-if="fileUploading" class="inline-flex items-center ml-10px text-red-500 font-bold py-1 px-2 rounded text-sm bg-red-100 upload-indicator">
              <Icon  class="mr-2 animate-spin text-red-500 upload-spinner" :size="18" />
              文件上传中...
            </div>
            <!-- 删除调试按钮 -->
          </div>
        </div>
      </el-scrollbar>
    </div>
    
    <!-- 草稿箱对话框 -->
    <ProcessDraftDialog
      ref="draftDialogRef"
      :process-definition-id="selectProcessDefinition.id"
      :process-definition-key="selectProcessDefinition.key || selectProcessDefinition.id"
      :model-id="selectProcessDefinition.modelId || ''"
      :form-data="detailForm.value"
      :start-user-select-assignees="startUserSelectAssignees"
      @save-success="handleDraftSaveSuccess"
      @show-list="handleShowDraftList"
    />
    
    <!-- 草稿列表抽屉 -->
    <ProcessDraftDrawer
      ref="draftDrawerRef"
      :model-id="selectProcessDefinition.modelId"
      @select="handleDraftSelect"
    />
  </ContentWrap>
</template>
<script lang="ts" setup>
import { decodeFields, setConfAndFields2 } from '@/utils/formCreate'
import { BpmModelType, BpmModelFormType } from '@/utils/constants'
import {
  CandidateStrategy,
  NodeId,
  FieldPermissionType
} from '@/components/SimpleProcessDesignerV2/src/consts'
import ProcessInstanceBpmnViewer from '../detail/ProcessInstanceBpmnViewer.vue'
import ProcessInstanceSimpleViewer from '../detail/ProcessInstanceSimpleViewer.vue'
import ProcessInstanceTimeline from '../detail/ProcessInstanceTimeline.vue'
import ProcessDraftDialog from './ProcessDraftDialog.vue'
import ProcessDraftDrawer from './ProcessDraftDrawer.vue'
import type { ApiAttrs } from '@form-create/element-ui/types/config'
import { useTagsViewStore } from '@/store/modules/tagsView'
import * as ProcessInstanceApi from '@/api/bpm/processInstance'
import * as DefinitionApi from '@/api/bpm/definition'
import * as DraftApi from '@/api/bpm/draft'
import { ApprovalNodeInfo } from '@/api/bpm/processInstance'
import { useWebSocketMessage } from '@/hooks/web/useWebSocketMessage'
import { emitter, UPLOAD_STATUS_EVENT } from '@/utils/eventBus'
import { ElLoading, ElMessageBox } from 'element-plus'
import { nextTick } from 'vue'

defineOptions({ name: 'ProcessDefinitionDetail' })
const props = defineProps<{
  selectProcessDefinition: any
}>()
const emit = defineEmits(['cancel'])
const processInstanceStartLoading = ref(false) // 流程实例发起中
const { push, currentRoute } = useRouter() // 路由
const message = useMessage() // 消息弹窗
const { delView } = useTagsViewStore() // 视图操作

const detailForm: any = ref({
  rule: [],
  option: {},
  value: {}
}) // 流程表单详情
const fApi = ref<ApiAttrs>()
// 指定审批人
const startUserSelectTasks: any = ref([]) // 发起人需要选择审批人或抄送人的任务列表
const startUserSelectAssignees = ref({}) // 发起人选择审批人的数据
const tempStartUserSelectAssignees = ref({}) // 历史发起人选择审批人的数据，用于每次表单变更时，临时保存
const bpmnXML: any = ref(null) // BPMN 数据
const simpleJson = ref<string | undefined>() // Simple 设计器数据 json 格式
const formFields = ref<Record<string, string>>({})
const activeTab = ref('form') // 当前的 Tab
const activityNodes = ref<ProcessInstanceApi.ApprovalNodeInfo[]>([]) // 审批节点信息
// 添加文件上传状态变量
const fileUploading = ref(false) // 是否有文件正在上传
// 是否重新发起流程
const isReapply = ref(false)

// 草稿箱相关
const draftDialogRef = ref()
const draftDrawerRef = ref()

// 使用 WebSocket 消息
const { sendMessage, sendBroadcast } = useWebSocketMessage()

/** 设置表单信息、获取流程图数据 **/
const initProcessInfo = async (row: any, formVariables?: any) => {
  // 重置指定审批人
  startUserSelectTasks.value = []
  startUserSelectAssignees.value = {}
  // 记录是否为重新发起流程
  isReapply.value = !!(formVariables && Object.keys(formVariables).length > 0)

  // 情况一：流程表单
  if (row.formType == BpmModelFormType.NORMAL) {
    // 设置表单
    // 注意：需要从 formVariables 中，移除不在 row.formFields 的值。
    // 原因是：后端返回的 formVariables 里面，会有一些非表单的信息。例如说，某个流程节点的审批人。
    //        这样，就可能导致一个流程被审批不通过后，重新发起时，会直接后端报错！！！
    const allowedFields = decodeFields(row.formFields).map((fieldObj: any) => fieldObj.field)
    for (const key in formVariables) {
      if (!allowedFields.includes(key)) {
        delete formVariables[key]
      }
    }
    setConfAndFields2(detailForm, row.formConf, row.formFields, formVariables)

    await nextTick()
    fApi.value?.btn.show(false) // 隐藏提交按钮
    
    // 获取流程审批信息
    await getApprovalDetail(row)

    // 加载流程图
    const processDefinitionDetail = await DefinitionApi.getProcessDefinition(row.id)
    if (processDefinitionDetail) {
      bpmnXML.value = processDefinitionDetail.bpmnXml
      simpleJson.value = processDefinitionDetail.simpleModel
    }
    // 情况二：业务表单
  } else if (row.formCustomCreatePath) {
    await push({
      path: row.formCustomCreatePath
    })
    // 这里暂时无需加载流程图，因为跳出到另外个 Tab；
  }
}

/** 预测流程节点会因为输入的参数值而产生新的预测结果值，所以需重新预测一次 */
watch(
  detailForm.value,
  (newValue) => {
    if (newValue && Object.keys(newValue.value).length > 0) {
      // 记录之前的节点审批人
      tempStartUserSelectAssignees.value = startUserSelectAssignees.value
      startUserSelectAssignees.value = {}
      // 加载最新的审批详情
      getApprovalDetail({
        id: props.selectProcessDefinition.id,
        processVariablesStr: JSON.stringify(newValue.value) // 解决 GET 无法传递对象的问题，后端 String 再转 JSON
      })
    }
  },
  {
    immediate: true
  }
)
/** 获取审批详情 */
  const getApprovalDetail = async (row: any) => {
    try {
    // TODO 获取审批详情，设置 activityId 为发起人节点（为了获取字段权限。暂时只对 Simple 设计器有效）；@jason：这里可以去掉 activityId 么？
    const data = await ProcessInstanceApi.getApprovalDetail({
      processDefinitionId: row.id,
      activityId: NodeId.START_USER_NODE_ID,
      processVariablesStr: row.processVariablesStr  // 解决 GET 无法传递对象的问题，后端 String 再转 JSON
    })

    if (!data) {
      message.error('查询不到审批详情信息！')
      return
    }
    // 获取审批节点，显示 Timeline 的数据
    activityNodes.value = data.activityNodes

    // 获取发起人自选的任务
    startUserSelectTasks.value = data.activityNodes?.filter(
      (node: ApprovalNodeInfo) => CandidateStrategy.START_USER_SELECT === node.candidateStrategy
    )
    // 恢复之前的选择审批人
    if (startUserSelectTasks.value?.length > 0) {
      for (const node of startUserSelectTasks.value) {
        if (
          tempStartUserSelectAssignees.value[node.id] &&
          tempStartUserSelectAssignees.value[node.id].length > 0
        ) {
          startUserSelectAssignees.value[node.id] = tempStartUserSelectAssignees.value[node.id]
        } else {
          startUserSelectAssignees.value[node.id] = []
        }
      }
    }

    // 获取表单字段权限
      const formFieldsPermission = data.formFieldsPermission
      formFields.value = data.formFieldsPermission
      // console.log('formFields', formFields.value)
      // 设置表单字段权限
      if (formFieldsPermission) {
        Object.keys(formFieldsPermission).forEach((item) => {
          setFieldPermission(item, formFieldsPermission[item])
        })
        // 如果是重新发起流程，清除无编辑权限的字段数据
        if (isReapply.value) {
          clearNoEditFields(detailForm.value.value)
        }
      }
    } finally {
    }
  }

/**
 * 设置表单权限
 */
const setFieldPermission = (field: string, permission: string) => {
  if (permission === FieldPermissionType.READ) {
    //@ts-ignore
    fApi.value?.disabled(true, field)
  }
  if (permission === FieldPermissionType.WRITE) {
    //@ts-ignore
    fApi.value?.disabled(false, field)
  }
  if (permission === FieldPermissionType.NONE) {
    //@ts-ignore
    fApi.value?.hidden(true, field)
  }
}

/**
 * 清除无编辑权限字段的值
 */
const clearNoEditFields = (values: Record<string, any>) => {
  if (!values) {
    return
  }
  Object.keys(formFields.value || {}).forEach((key) => {
    const perm = formFields.value[key]
    if (perm && perm !== FieldPermissionType.WRITE && key in values) {
      delete values[key]
      try {
        fApi.value?.setValue(key, undefined)
      } catch (e) {
        // ignore
      }
    }
  })
}

/** 提交按钮 */
const submitForm = async () => {
  if (!fApi.value || !props.selectProcessDefinition) {
    return
  }
  
  // 检查文件是否正在上传中
  if (fileUploading.value) {
    message.warning('请等待文件上传完成后再发起流程')
    return
  }
  
  // 流程表单校验
  await validateForm()
  // 如果有指定审批人，需要校验
  if (startUserSelectTasks.value?.length > 0) {
    for (const userTask of startUserSelectTasks.value) {
      if (
        Array.isArray(startUserSelectAssignees.value[userTask.id]) &&
        startUserSelectAssignees.value[userTask.id].length === 0
      )
        return message.warning(`请选择${userTask.name}的候选人`)
    }
  }

  // 提交请求
  processInstanceStartLoading.value = true
  try {
    await ProcessInstanceApi.createProcessInstance({
      processDefinitionId: props.selectProcessDefinition.id,
      variables: detailForm.value.value,
      startUserSelectAssignees: startUserSelectAssignees.value
    })

    // 获取第一个审批节点（跳过发起人节点）
    const firstApprovalNode = activityNodes.value?.find(node => 
      node.nodeType === 11 && node.candidateUsers && node.candidateUsers.length > 0
    )
    
    // 包装消息发送为 Promise，确保能正确处理异步操作
    const sendNotifications = async () => {
      try {
        if (firstApprovalNode?.candidateUsers) {
          // 给所有候选审批人发送消息
          const sendPromises = firstApprovalNode.candidateUsers.map(approver => {
            console.log('发送通知给审批人:', approver)
            return new Promise((resolve) => {
              // 发送消息
              sendMessage(
                approver.id, 
                `新的流程 ${props.selectProcessDefinition.name} 需要您审批`
              )
              // 给一个短暂的延迟以确保消息发送
              setTimeout(resolve, 100)
            })
          })
          
          // 等待所有消息发送完成
          await Promise.all(sendPromises)
          
          // 发送广播
          await new Promise(resolve => {
            sendBroadcast('process-approve')
            setTimeout(resolve, 100)
          })
        }
        return true
      } catch (error) {
        console.error('发送通知消息失败:', error)
        return false
      }
    }
    
    // 等待消息发送完成
    await sendNotifications()
    
    // 添加短暂延迟确保所有消息都已发送
    await new Promise(resolve => setTimeout(resolve, 200))

    // 提示
    message.success('发起流程成功')
    
    // 弹出确认对话框询问是否保留当前填写状态
    try {
      const result = await new Promise((resolve) => {
        ElMessageBox({
          title: '流程发起成功',
          message: `
            <div style="text-align: center; padding: 20px 0;">
              <div style="font-size: 16px; color: #409EFF; margin-bottom: 20px;">
                <i class="el-icon-success" style="font-size: 24px; margin-right: 8px;"></i>
                流程已成功发起！
              </div>
              <div style="font-size: 14px; color: #606266; line-height: 1.6; margin-bottom: 20px;">
                请选择下一步操作：
              </div>
              <div style="background: #f5f7fa; padding: 15px; border-radius: 8px; margin: 0 -10px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                  <span style="color: #67C23A; font-weight: 500;">✓ 进入我的流程</span>
                  <span style="color: #909399; font-size: 13px;"><span style="font-weight: 600;color:firebrick;  ">保持状态</span>并跳转到<span style="font-size: 18px;font-weight: 900;color:cadetblue;  ">我的流程</span></span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                  <span style="color: #409EFF; font-weight: 500;">⏸ 留在当前页</span>
                  <span style="color: #909399; font-size: 13px;"><span style="font-weight: 600;color:firebrick;  ">保持状态</span>但停留在<span style="font-size: 18px;font-weight: 900;color:cadetblue;  ">当前页面</span></span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #F56C6C; font-weight: 500;">✗ 返回列表</span>
                  <span style="color: #909399; font-size: 13px;"><span style="font-weight: 600;color:firebrick;  ">清空当前页面</span>，并返回到<span style="font-size: 18px;font-weight: 900;color:cadetblue;  ">列表页面</span></span>
                </div>
              </div>
              <div style="margin-top: 25px; display: flex; gap: 10px; justify-content: center;">
                <button id="goToMyProcess" style="min-width: 100px; padding: 8px 16px; border-radius: 20px; border: none; background: linear-gradient(135deg, #67C23A, #85ce61); color: white; font-weight: 500; cursor: pointer; transition: all 0.3s ease;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0, 0, 0, 0.15)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">进入我的流程</button>
                <button id="stayCurrentPage" style="min-width: 100px; padding: 8px 16px; border-radius: 20px; border: none; background: linear-gradient(135deg, #409EFF, #66b1ff); color: white; font-weight: 500; cursor: pointer; transition: all 0.3s ease;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0, 0, 0, 0.15)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">留在当前页</button>
                <button id="returnToList" style="min-width: 100px; padding: 8px 16px; border-radius: 20px; border: none; background: linear-gradient(135deg, #909399, #b3b6bc); color: white; font-weight: 500; cursor: pointer; transition: all 0.3s ease;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0, 0, 0, 0.15)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">返回列表</button>
              </div>
            </div>
          `,
          dangerouslyUseHTMLString: true,
          showConfirmButton: false,
          showCancelButton: false,
          center: true,
          customClass: 'custom-success-dialog',
          showClose: false,
          type: '',
          icon: '',
          callback: () => {
            // 对话框关闭时的回调，这里不需要手动清理事件监听器
            // 因为DOM元素会被销毁，事件监听器会自动被清理
          }
        })
        
        // 定义事件处理函数
        const handleGoToMyProcess = () => {
          resolve('goToMyProcess')
          ElMessageBox.close()
        }
        
        const handleStayCurrentPage = () => {
          resolve('stayCurrentPage')
          ElMessageBox.close()
        }
        
        const handleReturnToList = () => {
          resolve('returnToList')
          ElMessageBox.close()
        }
        
        // 添加按钮点击事件监听器
        nextTick(() => {
          const goBtn = document.getElementById('goToMyProcess')
          const stayBtn = document.getElementById('stayCurrentPage')
          const returnBtn = document.getElementById('returnToList')
          
          if (goBtn) goBtn.addEventListener('click', handleGoToMyProcess)
          if (stayBtn) stayBtn.addEventListener('click', handleStayCurrentPage)
          if (returnBtn) returnBtn.addEventListener('click', handleReturnToList)
        })
      })
      
      // 根据用户选择执行不同的操作
      if (result === 'goToMyProcess') {
        // 用户选择"进入我的流程" - 保留状态并跳转
        delView(unref(currentRoute))
        await push({
          name: 'BpmProcessInstanceMy'
        })
      } else if (result === 'stayCurrentPage') {
        // 用户选择"留在当前页" - 保留状态但不跳转
        // 什么都不做，保持当前状态
        console.log('用户选择留在当前页面，保留状态')
             } else if (result === 'returnToList') {
         // 用户选择"返回列表" - 清空状态并调用取消处理函数
         handleCancel()
       }
    } catch (error) {
      console.error('对话框处理失败:', error)
      // 如果对话框失败，默认跳转到我的流程
      delView(unref(currentRoute))
      await push({
        name: 'BpmProcessInstanceMy'
      })
    }
  } catch (error) {
    console.error('流程发起失败:', error)
    message.error('流程发起失败，请重试')
  } finally {
    processInstanceStartLoading.value = false
  }
}

/** 取消发起审批 */
const handleCancel = () => {
  emit('cancel')
}

/** 选择发起人 */
const selectUserConfirm = (id: string, userList: any[]) => {
  startUserSelectAssignees.value[id] = userList?.map((item: any) => item.id)
}

// 流程表单校验
async function validateForm() {
  const formInstance = fApi.value
  if (!formInstance) {
    throw new Error('表单实例未初始化')
  }

  // 获取所有规则
  const rules = (formInstance as any).rule || []
  // 只保留可编辑字段的校验规则
  const validFields = rules
    .filter((rule: { field: string, $required: boolean, hidden: boolean }) => {
      const field = rule.field
      // 获取字段权限，如果没有权限设置，则不校验
      const permission = formFields.value[field]
      // console.log('permission', permission)
      // 只校验权限为 WRITE 的字段且必填的字段且非隐藏字段
      return permission === FieldPermissionType.WRITE && rule.$required && !rule.hidden
    })
    .map((rule: { field: string }) => rule.field)
  if (validFields.length > 0) {
    // 只校验可编辑且必填字段
    // console.log('validFields', validFields)
    // 对每个字段单独进行校验
    for (const field of validFields) {
      await formInstance.validateField(field)
    }
  }
}

// 监听文件上传状态变化事件
onMounted(() => {
  emitter.on(UPLOAD_STATUS_EVENT, (uploading: boolean) => {
    if (fileUploading.value !== uploading) {
      fileUploading.value = uploading
      
      // 强制UI更新
      nextTick(() => {
      })
    }
  })
})

// 组件卸载时清除事件监听
onUnmounted(() => {
  emitter.off(UPLOAD_STATUS_EVENT)
})

/**
 * 填充表单变量
 * 用于重新发起流程时，填充已有的表单数据
 */
const fillFormVariables = (formVariables) => {
  if (!formVariables || Object.keys(formVariables).length === 0) {
    return
  }

  // 过滤无编辑权限的字段
  const editableVariables = { ...formVariables }
  Object.keys(formFields.value || {}).forEach((key) => {
    const perm = formFields.value[key]
    if (perm && perm !== FieldPermissionType.WRITE) {
      delete editableVariables[key]
    }
  })

  try {
    // 更新表单数据
    if (detailForm.value && fApi.value) {
      // 先保存表单变量到detailForm.value
      detailForm.value.value = { ...editableVariables }

      // 重新解析表单规则和配置
      if (props.selectProcessDefinition && props.selectProcessDefinition.formConf && props.selectProcessDefinition.formFields) {
        // 保留当前值，重新设置表单
        setConfAndFields2(detailForm, props.selectProcessDefinition.formConf, props.selectProcessDefinition.formFields, editableVariables)

        // 等待表单重新渲染
        nextTick(() => {
          // 设置表单字段权限
          if (formFields.value) {
            Object.keys(formFields.value).forEach((item) => {
              setFieldPermission(item, formFields.value[item])
            })
          }

          // 隐藏提交按钮
          fApi.value?.btn.show(false)

          // 强制刷新表单
          if (fApi.value?.refreshValue) {
            fApi.value.refreshValue()
          }
          // 再次清除无权限字段
          clearNoEditFields(detailForm.value.value)
        })
      } else {
        // 使用form-create的API逐个设置字段值
        Object.keys(editableVariables).forEach(key => {
          if (editableVariables[key] !== undefined) {
            try {
              fApi.value.setValue(key, editableVariables[key])
            } catch (e) {
              console.error(`设置字段 ${key} 失败:`, e)
            }
          }
        })

        // 强制表单更新
        nextTick(() => {
          if (fApi.value?.refreshValue) {
            fApi.value.refreshValue()
          }
          clearNoEditFields(detailForm.value.value)
        })
      }
    }
  } catch (error) {
    console.error('填充表单变量失败:', error)
  }
}

/**
 * 打开草稿箱对话框
 */
const openDraftBox = () => {
  draftDialogRef.value?.open()
}

/**
 * 草稿保存成功回调
 */
const handleDraftSaveSuccess = (draftId) => {
  message.success(`草稿已保存，ID: ${draftId}`)
}

/**
 * 显示草稿列表
 */
const handleShowDraftList = () => {
  draftDrawerRef.value?.open()
}

/**
 * 选择草稿回调
 */
const handleDraftSelect = async (draft: DraftApi.BpmProcessDraftDO) => {
  if (!draft) {
    message.warning('草稿数据无效')
    return
  }
  
  // 确定表单数据源
  let formData = null
  if (draft.formVariables) {
    formData = draft.formVariables
  } else if (draft.variables) {
    formData = draft.variables
  }
  
  if (!formData) {
    message.warning('草稿中没有表单数据')
    return
  }
  
  // 检查表单实例是否准备好
  if (!fApi.value) {
    message.error('表单未准备好，请刷新页面后重试')
    return
  }
  
  try {
    // 显示加载状态
    const loading = ElLoading.service({
      lock: true,
      text: '加载草稿数据中...',
      background: 'rgba(0, 0, 0, 0.7)'
    })
    
    // 填充表单数据
    fillFormVariables(formData)
    
    // 如果有审批人数据，也填充
    if (draft.startUserSelectAssignees) {
      startUserSelectAssignees.value = draft.startUserSelectAssignees
      tempStartUserSelectAssignees.value = draft.startUserSelectAssignees
    }
    
    // 等待表单渲染完成
    await nextTick()
    
    // 关闭加载状态
    setTimeout(() => {
      loading.close()
      message.success('草稿数据已加载')
    }, 500)
  } catch (error) {
    console.error('加载草稿数据失败:', error)
    message.error('加载草稿数据失败')
  }
}

/** 获取当前表单数据，用于状态保存 */
const getFormData = () => {
  return detailForm.value?.value || {}
}

// 暴露方法给父组件
defineExpose({
  initProcessInfo,
  fillFormVariables,
  getFormData
})
</script>

<style lang="scss" scoped>
$wrap-padding-height: 20px;
$wrap-margin-height: 15px;
$button-height: 51px;
$process-header-height: 105px;

.processInstance-wrap-main {
  height: calc(
    100vh - var(--top-tool-height) - var(--tags-view-height) - var(--app-footer-height) - 35px
  );
  max-height: calc(
    100vh - var(--top-tool-height) - var(--tags-view-height) - var(--app-footer-height) - 35px
  );
  overflow: auto;

  .form-scroll-area {
    display: flex;
    height: calc(
      100vh - var(--top-tool-height) - var(--tags-view-height) - var(--app-footer-height) - 35px -
        $process-header-height - 40px
    );
    max-height: calc(
      100vh - var(--top-tool-height) - var(--tags-view-height) - var(--app-footer-height) - 35px -
        $process-header-height - 40px
    );
    overflow: auto;
    flex-direction: column;
    border-radius: 8px;
    padding: 0;
    position: relative;



    .process-viewer-component {
      width: 100%;
      height: 100%;
      flex: 1;
      display: flex;
      position: relative;

      // 确保外层滚动不受内部拖拽影响
      &:deep(.simple-process-model-container) {
        min-height: 100%;
        min-width: 100%;
        overflow: visible;
      }
    }
  }
}

.form-box {
  :deep(.el-card) {
    border: none;
  }
}

/* 确保上传中状态显示良好 */
.position-relative {
  position: relative;
}

.absolute {
  position: absolute;
}


// 流程名称响应式样式
.process-name {
  position: relative;
  display: block;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  @media (max-width: 575px) {
    font-size: 14px;
    padding-right: 10px;
  }
}

// 分隔线响应式样式
.process-divider {
  @media (max-width: 575px) {
    margin-top: 4px !important;
    margin-bottom: 4px !important;
  }
}

// Tab页响应式样式
.process-tabs {
  @media (max-width: 575px) {
    :deep(.el-tabs__header) {
      margin-bottom: 10px;
    }

    :deep(.el-tabs__item) {
      padding: 0 10px;
    }
  }
}

// 操作按钮容器响应式样式
.operation-button-container {
  position: relative;
  z-index: 100;

  @media (max-width: 575px) {
    padding: 5px 0;
  }

  .btn-container {
    @media (max-width: 575px) {
      height: 40px !important;
      flex-wrap: wrap;
      gap: 8px;
    }
  }
}

// 按钮响应式样式
.el-button {
  @media (max-width: 575px) {
    padding: 6px 12px;
    min-height: 32px;
    font-size: 13px;

    .button-icon {
      font-size: 16px;
    }
  }
}

// 上传状态指示器响应式样式
.upload-indicator {
  @media (max-width: 575px) {
    margin-left: 0 !important;
    width: 100%;
    justify-content: center;
    margin-top: 5px;
  }

  .upload-spinner {
    @media (max-width: 575px) {
      margin-right: 5px !important;
    }
  }
}

// 审批记录时间线响应式样式
.timeline-col {
  // 在中等屏幕及以上显示为右侧栏
  @media (min-width: 992px) {
    padding-left: 15px;
  }

  // 在小屏幕上作为独立部分显示
  @media (max-width: 991px) {
    margin-top: 20px;
    border-top: 1px solid var(--el-border-color-lighter);
    padding-top: 20px;
  }
}

// 适配流程图在小屏幕上的显示
@media (max-width: 767px) {
  .form-scroll-area {
    min-height: 450px; // 确保在小屏幕上有足够的显示空间

    .process-viewer-component {
      min-height: 400px;

      // 确保内部滚动条容器的大小正确
      :deep(.process-scrollbar) {
        width: 100%;
        height: 100%;
      }
    }
  }
}

// 极小屏幕额外优化
@media (max-width: 450px) {
  .processInstance-wrap-main {
    padding: 0 5px;
  }

  .el-tabs__nav {
    width: 100%;
    display: flex;

    .el-tabs__item {
      flex: 1;
      text-align: center;
    }
  }
}

// 自定义成功对话框样式
:deep(.custom-success-dialog) {
  border-radius: 16px;
  overflow: hidden;
  
  .el-message-box__header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 20px 24px 16px;
    text-align: center;
    
    .el-message-box__title {
      color: white;
      font-size: 18px;
      font-weight: 600;
    }
  }
  
  .el-message-box__content {
    padding: 0 24px 20px;
    
    .el-message-box__message {
      margin: 0;
    }
  }
  
  .el-message-box__btns {
    padding: 20px 24px 24px;
    text-align: center;
    border-top: 1px solid #f0f0f0;
    
    .el-button {
      min-width: 100px;
      border-radius: 20px;
      font-weight: 500;
      transition: all 0.3s ease;
      
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }
      
      &.el-button--success {
        background: linear-gradient(135deg, #67C23A, #85ce61);
        border: none;
        
        &:hover {
          background: linear-gradient(135deg, #85ce61, #67C23A);
        }
      }
      
      &.el-button--info {
        background: linear-gradient(135deg, #909399, #b3b6bc);
        border: none;
        
        &:hover {
          background: linear-gradient(135deg, #b3b6bc, #909399);
        }
      }
    }
  }
}
</style>

