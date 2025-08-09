<template>
  <div v-if="!disabled" class="upload-file">
    <el-upload
      ref="uploadRef"
      v-model:file-list="fileList"
      :action="uploadUrl"
      :auto-upload="autoUpload"
      :before-upload="beforeUpload"
      :disabled="disabled"
      :drag="drag"
      :http-request="httpRequest"
      :limit="props.limit"
      :multiple="props.limit > 1"
      :on-error="excelUploadError"
      :on-exceed="handleExceed"
      :on-preview="handlePreview"
      :on-remove="handleRemove"
      :on-success="handleFileSuccess"
      :show-file-list="true"
      class="upload-file-uploader"
      name="file"
    >
      <el-button type="primary">
        <Icon icon="ep:upload-filled" />
        选取文件
      </el-button>
      <template v-if="isShowTip" #tip>
        <div style="font-size: 8px">
          大小不超过 <b style="color: #f56c6c">{{ fileSize }}MB</b>
        </div>
        <div style="font-size: 8px">
          格式为 <b style="color: #f56c6c">{{ fileType.join('/') }}</b> 的文件
        </div>
      </template>
      <template #file="row">
        <div class="flex items-center">
          <span>{{ row.file.name }}</span>
          <span class="ml-5px text-gray-500" v-if="row.file.size">({{ formatFileSize(row.file.size) }})</span>
          <div class="ml-10px">
            <el-link
              :href="row.file.url"
              :underline="false"
              download
              target="_blank"
              type="primary"
            >
              下载
            </el-link>
          </div>
          <div class="ml-10px">
            <el-button link type="danger" @click="handleRemove(row.file)"> 删除</el-button>
          </div>
        </div>
      </template>
    </el-upload>
  </div>

  <!-- 上传操作禁用时 -->
  <div v-if="disabled" class="upload-file">
    <div v-for="(file, index) in fileList" :key="index" class="flex items-center file-list-item">
      <span>{{ file.name }}</span>
      <div class="ml-10px">
        <el-link :href="file.url" :underline="false" download target="_blank" type="primary">
          下载
        </el-link>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { propTypes } from '@/utils/propTypes'
import type { UploadInstance, UploadProps, UploadRawFile, UploadUserFile } from 'element-plus'
import { isString } from '@/utils/is'
import { useUpload, handleUploadError } from '@/components/UploadFile/src/useUpload'
import { UploadFile } from 'element-plus/es/components/upload/src/upload'
import { emitter, UPLOAD_STATUS_EVENT } from '@/utils/eventBus'

defineOptions({ name: 'UploadFile' })

const message = useMessage() // 消息弹窗
const emit = defineEmits(['update:modelValue', 'uploading'])

const props = defineProps({
  modelValue: propTypes.oneOfType<string | string[]>([String, Array<String>]).isRequired,
  fileType: propTypes.array.def(['doc', 'xls', 'ppt', 'txt', 'pdf']), // 文件类型, 例如['png', 'jpg', 'jpeg']
  fileSize: propTypes.number.def(5), // 大小限制(MB)
  limit: propTypes.number.def(5), // 数量限制
  autoUpload: propTypes.bool.def(true), // 自动上传
  drag: propTypes.bool.def(false), // 拖拽上传
  isShowTip: propTypes.bool.def(true), // 是否显示提示
  disabled: propTypes.bool.def(false) // 是否禁用上传组件 ==> 非必传（默认为 false）
})

// ========== 上传相关 ==========
const uploadRef = ref<UploadInstance>()
const uploadList = ref<UploadUserFile[]>([])
const fileList = ref<UploadUserFile[]>([])
const uploadNumber = ref<number>(0)

const { uploadUrl, httpRequest } = useUpload()

// 格式化文件大小显示
const formatFileSize = (sizeInBytes: number): string => {
  if (sizeInBytes < 1024) {
    return sizeInBytes + ' B'
  } else if (sizeInBytes < 1024 * 1024) {
    return (sizeInBytes / 1024).toFixed(2) + ' KB'
  } else if (sizeInBytes < 1024 * 1024 * 1024) {
    return (sizeInBytes / (1024 * 1024)).toFixed(2) + ' MB'
  } else {
    return (sizeInBytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
  }
}

// 文件上传之前判断
const beforeUpload: UploadProps['beforeUpload'] = (file: UploadRawFile) => {
  if (fileList.value.length >= props.limit) {
    message.error(`上传文件数量不能超过${props.limit}个!`)
    return false
  }

  // 检查是否支持所有格式
  const supportAllTypes = props.fileType.includes('*')

  // 不支持所有格式时才进行类型校验
  let isValidType = true
  if (!supportAllTypes) {
    let fileExtension = ''
    if (file.name.lastIndexOf('.') > -1) {
      fileExtension = file.name.slice(file.name.lastIndexOf('.') + 1)
    }
    isValidType = props.fileType.some((type: string) => {
      if (file.type.indexOf(type) > -1) return true
      return !!(fileExtension && fileExtension.indexOf(type) > -1)
    })

    if (!isValidType) {
      message.error(`文件格式不正确, 请上传${props.fileType.join('/')}格式!`)
      return false
    }
  }

  const isLimit = file.size < props.fileSize * 1024 * 1024
  if (!isLimit) {
    message.error(`上传文件大小不能超过${props.fileSize}MB!`)
    return false
  }

  // 大文件上传提示（超过10MB视为大文件）
  if (file.size > 10 * 1024 * 1024) {
    message.warning(`您正在上传较大的文件(${formatFileSize(file.size)})，可能需要较长时间，请耐心等待...`)
  }

  message.success('正在上传文件，请稍候...')
  uploadNumber.value++
  // 触发uploading事件，表示有文件正在上传
  emit('uploading', true)
  // 同时通过eventBus发送上传状态变化事件
  emitter.emit(UPLOAD_STATUS_EVENT, true)
}
// 处理上传的文件发生变化
// const handleFileChange = (uploadFile: UploadFile): void => {
//   uploadRef.value.data.path = uploadFile.name
// }
// 文件上传成功
const handleFileSuccess: UploadProps['onSuccess'] = (res: any): void => {
  message.success('上传成功')
  // 删除自身
  const index = fileList.value.findIndex((item) => {
    // 修复类型错误，使用类型断言
    return item.response && typeof item.response === 'object' && 'data' in (item.response as Record<string, any>) && (item.response as Record<string, any>).data === res.data
  })
  fileList.value.splice(index, 1)
  uploadList.value.push({ name: res.data, url: res.data })
  if (uploadList.value.length == uploadNumber.value) {
    fileList.value.push(...uploadList.value)
    uploadList.value = []
    uploadNumber.value = 0
    emitUpdateModelValue()
    // 触发uploading事件，表示没有文件正在上传
    emit('uploading', false)
    // 同时通过eventBus发送上传状态变化事件
    emitter.emit(UPLOAD_STATUS_EVENT, false)
  }
}
// 文件数超出提示
const handleExceed: UploadProps['onExceed'] = (): void => {
  message.error(`上传文件数量不能超过${props.limit}个!`)
}
// 上传错误提示
const excelUploadError: UploadProps['onError'] = async (error: any, file: any): Promise<void> => {
  // 如果处理成功（如令牌刷新并重试），则不显示错误通知
  const handled = await handleUploadError(error, file, () => {
    // 重试逻辑
    if (uploadRef.value) {
      const upload = document.querySelector('.upload-file-uploader .el-upload__input') as HTMLInputElement
      if (upload) {
        upload.files = file.raw ? new DataTransfer().files : null
        upload.click()
      }
    }
  })
  
  if (!handled) {
    // 获取具体错误信息
    let errorMsg = '导入数据失败，请您重新上传！'

    if (error && error.message) {
      // 处理超时错误
      if (error.message.includes('timeout')) {
        errorMsg = '文件上传超时，请检查网络或尝试分批上传较小的文件！'
      } else if (error.response && error.response.data && error.response.data.msg) {
        // 处理服务器返回的具体错误信息
        errorMsg = error.response.data.msg
      }
    }

    message.error(errorMsg)
  }
  
  // 减少上传计数
  uploadNumber.value--
  // 如果没有正在上传的文件，触发上传完成事件
  if (uploadNumber.value <= 0) {
    uploadNumber.value = 0
    emit('uploading', false)
    emitter.emit(UPLOAD_STATUS_EVENT, false)
  }
}
// 删除上传文件
const handleRemove = (file: UploadFile) => {
  const index = fileList.value.map((f) => f.name).indexOf(file.name)
  if (index > -1) {
    fileList.value.splice(index, 1)
    emitUpdateModelValue()

    // 如果删除的是正在上传的文件，更新uploadNumber计数
    if (uploadNumber.value > 0) {
      uploadNumber.value--
      // 如果没有正在上传的文件，触发uploading事件
      if (uploadNumber.value <= 0) {
        uploadNumber.value = 0
        emit('uploading', false)
        emitter.emit(UPLOAD_STATUS_EVENT, false)
      }
    }
  }
}
const handlePreview: UploadProps['onPreview'] = (uploadFile) => {
  console.log(uploadFile)
}

// 监听模型绑定值变动
watch(
  () => props.modelValue,
  (val: string | string[]) => {
    if (!val) {
      fileList.value = [] // fix：处理掉缓存，表单重置后上传组件的内容并没有重置
      return
    }

    fileList.value = [] // 保障数据为空
    // 情况1：字符串
    if (isString(val)) {
      fileList.value.push(
        ...val.split(',').map((url) => ({ name: url.substring(url.lastIndexOf('/') + 1), url }))
      )
      return
    }
    // 情况2：数组
    fileList.value.push(
      ...(val as string[]).map((url) => ({ name: url.substring(url.lastIndexOf('/') + 1), url }))
    )
  },
  { immediate: true, deep: true }
)
// 发送文件链接列表更新
const emitUpdateModelValue = () => {
  // 情况1：数组结果
  let result: string | string[] = fileList.value.map((file) => file.url!)
  // 情况2：逗号分隔的字符串
  if (props.limit === 1 || isString(props.modelValue)) {
    result = result.join(',')
  }
  emit('update:modelValue', result)
}
</script>
<style lang="scss" scoped>
.upload-file-uploader {
  margin-bottom: 5px;
}

:deep(.upload-file-list .el-upload-list__item) {
  position: relative;
  margin-bottom: 10px;
  line-height: 2;
  border: 1px solid #e4e7ed;
}

:deep(.el-upload-list__item-file-name) {
  max-width: 250px;
}

:deep(.upload-file-list .ele-upload-list__item-content) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: inherit;
}

:deep(.ele-upload-list__item-content-action .el-link) {
  margin-right: 10px;
}

.file-list-item {
  border: 1px dashed var(--el-border-color-darker);
  border-radius: 8px;
}
</style>
