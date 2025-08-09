import request from '@/config/axios'

export const getProcessDefinition = async (id?: string, key?: string) => {
  return await request.get({
    url: '/bpm/process-definition/get',
    params: { id, key }
  })
}

export const getProcessDefinitionPage = async (params) => {
  return await request.get({
    url: '/bpm/process-definition/page',
    params
  })
}

export const getProcessDefinitionList = async (params) => {
  return await request.get({
    url: '/bpm/process-definition/list',
    params
  })
}

// 获取流程定义的表单字段
export const getFormFields = async (id: string) => {
  try {
    return await request.get({
      url: '/bpm/process-definition/form-fields',
      params: { id }
    })
  } catch (error) {
    console.error('getFormFields API 错误:', error)
    throw error
  }
}
