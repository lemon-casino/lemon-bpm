import request from '@/config/axios'

/**
 * 流程草稿数据对象
 */
export interface BpmProcessDraftDO {
  id: number // 草稿ID
  processDefinitionKey: string // 流程定义标识
  modelId: string // 模型ID
  businessKey: string // 业务标识
  formVariables: Record<string, any> // 表单变量
  variables: Record<string, any> // 表单变量（兼容后端返回格式）
  createTime: string // 创建时间
  updateTime: string // 更新时间
  name: string // 草稿名称
  startUserSelectAssignees?: Record<string, any[]> // 发起人选择审批人
}

/**
 * 保存流程草稿请求参数
 */
export interface SaveDraftReqVO {
  id?: number // 草稿ID（更新时使用）
  processDefinitionKey: string // 流程定义标识
  modelId?: string // 模型ID
  businessKey: string // 业务标识
  variables: Record<string, any> // 表单变量
  name: string // 草稿名称
  startUserSelectAssignees?: Record<string, any[]> // 发起人选择审批人
}

/**
 * 保存流程草稿
 * @param data 草稿数据
 * @param id 草稿ID（可选）
 * @returns 草稿ID
 */
export const saveDraft = (data: SaveDraftReqVO, id?: number) => {
  return request.post({ 
    url: '/bpm/process-draft/save', 
    data,
    params: { id } 
  })
}

/**
 * 删除流程草稿
 * @param id 草稿ID
 * @returns 是否成功
 */
export const deleteDraft = (id: number) => {
  return request.delete({ 
    url: '/bpm/process-draft/delete', 
    params: { id } 
  })
}

/**
 * 获取我的流程草稿列表
 * @param modelId 模型ID（可选）
 * @returns 草稿列表
 */
export const getDraftList = (modelId?: string) => {
  return request.get<BpmProcessDraftDO[]>({ 
    url: '/bpm/process-draft/list', 
    params: { modelId } 
  })
} 