import request from '@/config/axios'

// BPM 流程分类 VO
export interface CategoryVO {
  id: number // 分类编号
  name: string // 分类名
  code: string // 分类标志
  status: number // 分类状态
  sort: number // 分类排序
}

// 工时类型请求的全局缓存
let workTimeTypesCache: any[] = [];
let workTimeTypesPromise: Promise<any> | null = null;

// BPM 流程分类 API
export const CategoryApi = {
  // 查询流程分类分页
  getCategoryPage: async (params: any) => {
    return await request.get({ url: `/bpm/category/page`, params })
  },

  // 查询流程分类列表
  getCategorySimpleList: async () => {
    return await request.get({ url: `/bpm/category/simple-list` })
  },

  // 查询流程分类详情
  getCategory: async (id: number) => {
    return await request.get({ url: `/bpm/category/get?id=` + id })
  },

  // 新增流程分类
  createCategory: async (data: CategoryVO) => {
    return await request.post({ url: `/bpm/category/create`, data })
  },

  // 修改流程分类
  updateCategory: async (data: CategoryVO) => {
    return await request.put({ url: `/bpm/category/update`, data })
  },

  // 批量修改流程分类的排序
  updateCategorySortBatch: async (ids: number[]) => {
    return await request.put({
      url: `/bpm/category/update-sort-batch`,
      params: {
        ids: ids.join(',')
      }
    })
  },

  // 删除流程分类
  deleteCategory: async (id: number) => {
    return await request.delete({ url: `/bpm/category/delete?id=` + id })
  },

  // 查询工时类型列表
  fetchWorkTimeTypes: async () => {
    // 如果已经有缓存数据，直接返回
    if (workTimeTypesCache.length > 0) {
      console.log('使用工时类型缓存数据', workTimeTypesCache.length, '条记录')
      return {
        code: 0,
        data: workTimeTypesCache,
        msg: "success (cached)"
      };
    }
    
    // 如果有请求正在进行中，复用该请求
    if (workTimeTypesPromise) {
      console.log('复用工时类型正在进行的请求')
      return workTimeTypesPromise;
    }
    
    console.log('发起新的工时类型请求')
    // 创建新的请求并缓存Promise
    workTimeTypesPromise = request.get({ url: `/bpm/work-time-config/get-type` })
      .then(result => {
        console.log('工时类型原始响应:', result)
        // 请求成功，更新缓存
        if (result.code === 0 && Array.isArray(result.data)) {
          workTimeTypesCache = result.data;
          console.log('更新工时类型缓存，共', workTimeTypesCache.length, '条记录')
        } 
        // 处理直接返回数组的情况
        else if (Array.isArray(result)) {
          workTimeTypesCache = result;
          console.log('更新工时类型缓存(直接数组)，共', workTimeTypesCache.length, '条记录')
          // 将结果转换为标准格式
          return {
            code: 0,
            data: result,
            msg: "success (array converted)"
          };
        }
        return result;
      })
      .finally(() => {
        // 请求完成后，清除Promise缓存
        workTimeTypesPromise = null;
      });
    
    return workTimeTypesPromise;
  },
  
  // 清除工时类型缓存（用于数据刷新场景）
  clearWorkTimeTypesCache: () => {
    console.log('清除工时类型缓存')
    workTimeTypesCache = [];
    workTimeTypesPromise = null;
  }
}
