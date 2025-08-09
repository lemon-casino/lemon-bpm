import request from '@/config/axios'
import { ProcessDefinitionVO } from '@/api/bpm/model'
import { NodeType, CandidateStrategy } from '@/components/SimpleProcessDesignerV2/src/consts'

export type Task = {
  id: string
  name: string
}

export type ProcessInstanceVO = {
  id: number
  name: string
  processDefinitionId: string
  category: string
  result: number
  tasks: Task[]
  fields: string[]
  status: number
  remark: string
  businessKey: string
  createTime: string
  endTime: string
  processDefinition?: ProcessDefinitionVO
}

// 用户信息
export type User = {
  id: number
  nickname: string
  avatar: string
}

// 审批任务信息
export type ApprovalTaskInfo = {
  id: number
  ownerUser: User
  assigneeUser: User
  status: number
  reason: string
  signPicUrl: string
}

// 审批节点信息
export type ApprovalNodeInfo = {
  id: number
  name: string
  nodeType: NodeType
  candidateStrategy?: CandidateStrategy
  status: number
  startTime?: Date
  endTime?: Date
  candidateUsers?: User[]
  tasks: ApprovalTaskInfo[]
}

// 我的流程查询参数类型
export type ProcessInstanceMyPageParams = {
  pageNo?: number
  pageSize?: number
  name?: string
  category?: string
  status?: number
  startUserId?: number
  processDefinitionKey?: string
  createTime?: string []
  modelId?: string
  formFieldValue?: string
  formFieldsParams?: string[]
}

export const getProcessInstanceMyPage = async (data: ProcessInstanceMyPageParams) => {
  return await request.post({ url: '/bpm/process-instance/my-page', data })
}

// 按模型 或 按分类查询对应的数据

export const getProcessInstanceByModelByCategory = async (data ) => {
  return await request.post({ url: '/bpm/process-instance/list-by-model', data })
}
export const getProcessInstanceManagerPage = async (params: any) => {
  return await request.get({ url: '/bpm/process-instance/manager-page', params })
}

export const getProcessInstancePage = async (params: any) => {
  return await request.get({ url: '/bpm/process-instance/page', params })
}

export const createProcessInstance = async (data) => {
  return await request.post({ url: '/bpm/process-instance/create', data: data })
}

export const cancelProcessInstanceByStartUser = async (id: number, reason: string) => {
  const data = {
    id: id,
    reason: reason
  }
  return await request.delete({ url: '/bpm/process-instance/cancel-by-start-user', data: data })
}

export const cancelProcessInstanceByAdmin = async (id: number, reason: string) => {
  const data = {
    id: id,
    reason: reason
  }
  return await request.delete({ url: '/bpm/process-instance/cancel-by-admin', data: data })
}

export const getProcessInstance = async (id: string) => {
  return await request.get({ url: '/bpm/process-instance/get?id=' + id })
}

export const getProcessInstanceCopyPage = async (params: any) => {
  return await request.get({ url: '/bpm/process-instance/copy/page', params })
}

// 获取审批详情
export const getApprovalDetail = async (params: any) => {
  return await request.get({ url: '/bpm/process-instance/get-approval-detail', params })
}

// 获取流程实例表单详情
export const getProcessInstanceForm = async (id: string) => {
  return await request.get({ url: '/bpm/process-instance/get-approval-detail', params: { processInstanceId: id } })
}

// 获取表单字段权限
export const getFormFieldsPermission = async (params: any) => {
  return await request.get({ url: '/bpm/process-instance/get-form-fields-permission', params })
}

// 获取管理员权限状态
export const getAdminStatus = async (processInstanceId: string) => {
  return await request.get({ url: '/bpm/model/manager', params: { processInstanceId } })
}

// 获取流程实例的 BPMN 模型视图
export const getProcessInstanceBpmnModelView = async (id: string) => {
  return await request.get({ url: '/bpm/process-instance/get-bpmn-model-view?id=' + id })
}

// 获取流程统计数据
export const getProcessStats = async () => {
  return await request.get({ url: '/bpm/process-instance/stats' })
}

// 获取流程定义列表
export const listProcessDefinition = () => {
  return request.get<ProcessDefinitionVO[]>({ url: '/bpm/process-definition/list' })
}

// 删除流程实例
export const deleteProcessInstance = async (id: string) => {
  return await request.delete({ url: `/bpm/process-instance/delete?id=${id}` })
}
