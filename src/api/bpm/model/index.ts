import request from '@/config/axios'

export type ProcessDefinitionVO = {
  id: string
  version: number
  deploymentTIme: string
  suspensionState: number
  formType?: number
}

// 添加流程模型版本列表的类型定义
export interface ModelVersionVO {
  id: string
  name: string
  versions: number[]
}

// 简单流程模型类型定义
export interface SimpleModelVO {
  id: string
  key:string
  formName: string
}

export type ModelVO = {
  id: number
  formName: string
  key: string
  name: string
  description: string
  category: string
  formType: number
  formId: number
  formCustomCreatePath: string
  formCustomViewPath: string
  processDefinition: ProcessDefinitionVO
  status: number
  remark: string
  createTime: string
  bpmnXml: string
}

export const getModelList = async (name: string | undefined) => {
  return await request.get({ url: '/bpm/model/list', params: { name } })
}

// 获取所有简单流程模型列表
export const getAllSimpleModelList = async () => {
  return await request.get<SimpleModelVO[]>({ url: '/bpm/model/list-all-simple' })
}

// 添加获取流程模型版本列表的接口
export const getModelVersionList = async (params?: { needVersion?: boolean }) => {
  try {
    const response = await request.get({ url: '/bpm/model/version-list', params })
    return response
  } catch (error) {
    console.error('getModelVersionList API 错误:', error)
    throw error
  }
}

export const getModel = async (id: string, processDefinitionId?: string) => {
  console.log("current-node-list",await request.get({ url: '/bpm/task/current-node-list?id=' +'528249df-20f2-11f0-b459-d8bbc176bad5'}))
  return await request.get({ 
    url: '/bpm/model/get', 
    params: { 
      id, 
      processDefinitionId 
    } 
  })
}

export const updateModel = async (data: ModelVO) => {
  return await request.put({ url: '/bpm/model/update', data: data })
}
// 返回是否是该模型的管理员
export const modelManager = async (id: string) => {
  console.log('调用modelManager API, id:', id)
  // 直接使用 params 对象，避免手动拼接URL可能导致的问题
  return await request.get({ url: '/bpm/model/model-manager?id=' +id})
}

//获取流程中的所有运行中的流程节点
export const currentNodeList = async (id: string) => {
  console.log('调用modelManager API, id:', id)
  // 直接使用 params 对象，避免手动拼接URL可能导致的问题
  return await request.get({ url: '/bpm/task/current-node-list?id=' +id})
}


// 批量修改流程分类的排序
export const updateModelSortBatch = async (ids: number[]) => {
  return await request.put({
    url: `/bpm/model/update-sort-batch`,
    params: {
      ids: ids.join(',')
    }
  })
}

export const updateModelBpmn = async (data: ModelVO) => {
  return await request.put({ url: '/bpm/model/update-bpmn', data: data })
}

// 任务状态修改
export const updateModelState = async (id: number, state: number) => {
  const data = {
    id: id,
    state: state
  }
  return await request.put({ url: '/bpm/model/update-state', data: data })
}

export const createModel = async (data: ModelVO) => {
  return await request.post({ url: '/bpm/model/create', data: data })
}

export const deleteModel = async (id: number) => {
  return await request.delete({ url: '/bpm/model/delete?id=' + id })
}

export const deployModel = async (id: number) => {
  return await request.post({ url: '/bpm/model/deploy?id=' + id })
}

export const cleanModel = async (id: number) => {
  return await request.delete({ url: '/bpm/model/clean?id=' + id })
}
