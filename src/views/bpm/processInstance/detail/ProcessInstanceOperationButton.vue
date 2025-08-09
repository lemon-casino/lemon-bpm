<template>
  <div class="flex flex-col w-full color-#32373c dark:color-#fff font-bold operations-panel">
    <!-- 主要操作按钮组 - 始终保持在同一行 -->
    <div class="primary-actions-row" v-if="runningTask && isHandleTaskStatus()">
      <!-- 【通过】按钮 -->
      <el-popover
        :visible="popOverVisible.approve"
        placement="top-end"
        :width="420"
        trigger="click"
        v-if="isShowButton(OperationButtonType.APPROVE)"
      >
        <template #reference>
          <el-button
            plain
            type="success"
            @click="openPopover('approve')"
            :disabled="fileUploading"
            class="primary-action-btn"
            :class="{ 'opacity-50 cursor-not-allowed': fileUploading }"
          >
            <Icon icon="ep:select" class="action-icon" />&nbsp;
            {{ getButtonDisplayName(OperationButtonType.APPROVE) }}
          </el-button>
        </template>
        <!-- 审批表单 -->
        <div class="flex flex-col flex-1 pt-20px px-20px" v-loading="formLoading">
          <el-form
            label-position="top"
            class="mb-auto"
            ref="approveFormRef"
            :model="approveReasonForm"
            :rules="approveReasonRule"
            label-width="100px"
          >
            <el-card v-if="runningTask?.formId > 0" class="mb-15px !-mt-10px">
              <template #header>
                <span class="el-icon-picture-outline">
                  填写表单【{{ runningTask?.formName }}】
                </span>
              </template>
              <form-create
                v-model="approveForm.value"
                v-model:api="approveFormFApi"
                :option="approveForm.option"
                :rule="approveForm.rule"
              />
            </el-card>
            <el-form-item :label="`${nodeTypeName}意见`" prop="reason">
              <el-input
                v-model="approveReasonForm.reason"
                :placeholder="`请输入${nodeTypeName}意见`"
                type="textarea"
                :rows="4"
              />
            </el-form-item>
            <el-form-item
              v-if="runningTask.signEnable"
              label="签名"
              prop="signPicUrl"
              ref="approveSignFormRef"
            >
              <el-button @click="signRef.open()">点击签名</el-button>
              <el-image
                class="w-90px h-40px ml-5px"
                v-if="approveReasonForm.signPicUrl"
                :src="approveReasonForm.signPicUrl"
                :preview-src-list="[approveReasonForm.signPicUrl]"
              />
            </el-form-item>
            <el-form-item>
              <el-button
                :disabled="isApproveButtonDisabled"
                type="success"
                @click="handleAudit(true, approveFormRef)"
              >
                {{ getButtonDisplayName(OperationButtonType.APPROVE) }}
              </el-button>
              <el-button @click="closePropover('approve', approveFormRef)"> 取消 </el-button>
            </el-form-item>
          </el-form>
        </div>
      </el-popover>

      <!-- 【拒绝】按钮 -->
      <el-popover
        :visible="popOverVisible.reject"
        placement="top-end"
        :width="420"
        trigger="click"
        v-if="isShowButton(OperationButtonType.REJECT)"
      >
        <template #reference>
          <el-button
            class="primary-action-btn"
            plain
            type="danger"
            @click="openPopover('reject')"
            :disabled="fileUploading"
            :class="{ 'opacity-50 cursor-not-allowed': fileUploading }"
          >
            <Icon icon="ep:close" class="action-icon" />&nbsp;
            {{ getButtonDisplayName(OperationButtonType.REJECT) }}
          </el-button>
        </template>

        <!-- 审批表单 -->
        <div class="flex flex-col flex-1 pt-20px px-20px" v-loading="formLoading">
          <el-form
            label-position="top"
            class="mb-auto"
            ref="rejectFormRef"
            :model="rejectReasonForm"
            :rules="rejectReasonRule"
            label-width="100px"
          >
            <el-form-item label="审批意见" prop="reason">
              <el-input
                v-model="rejectReasonForm.reason"
                placeholder="请输入审批意见"
                type="textarea"
                :rows="4"
              />
            </el-form-item>
            <el-form-item>
              <el-button
                :disabled="isApproveButtonDisabled"
                type="danger"
                @click="handleAudit(false, rejectFormRef)"
              >
                {{ getButtonDisplayName(OperationButtonType.REJECT) }}
              </el-button>
              <el-button @click="closePropover('reject', rejectFormRef)"> 取消 </el-button>
            </el-form-item>
          </el-form>
        </div>
      </el-popover>

      <!-- 【暂存】按钮 -->
      <el-popover
        :visible="popOverVisible.save"
        placement="top-end"
        :width="420"
        trigger="click"
        v-if="props.writableFields && props.writableFields.length > 0"
      >
        <template #reference>
          <el-button
            class="primary-action-btn"
            plain
            type="info"
            @click="openPopover('save')"
            :disabled="fileUploading || formLoading"
            :class="{ 'opacity-50 cursor-not-allowed': fileUploading || formLoading }"
          >
            <Icon icon="ep:edit" class="action-icon" />&nbsp;
            暂存
          </el-button>
        </template>
        
        <!-- 暂存表单 -->
        <div class="flex flex-col flex-1 pt-20px px-20px" v-loading="formLoading">
          <div class="mb-15px text-center">
            <Icon icon="ep:info-filled" class="text-blue-500 mr-2" :size="20" />
            <span class="font-medium">确定要暂存当前表单吗？</span>
          </div>
          <div class="text-gray-500 mb-15px text-center text-sm">
            暂存后可以稍后继续编辑并提交
          </div>
          <div class="flex justify-center">
            <el-button :disabled="formLoading" type="primary" @click="handleSaveTaskForm">
              确认暂存
            </el-button>
            <el-button @click="closePropover('save')">取消</el-button>
          </div>
        </div>
      </el-popover>
    </div>

    <!-- 文件上传状态指示器 -->
    <div
      v-if="fileUploading"
      class="inline-flex items-center ml-10px text-red-500 font-bold py-1 px-2 rounded text-sm bg-red-100 upload-indicator"
    >
      <Icon icon="svg-spinners:270-ring" class="mr-2 animate-spin text-red-500" :size="18" />
      文件上传中...
    </div>

    <!-- 次要操作按钮组 -->
    <div class="secondary-actions-group">
      <!-- 【评论】按钮 - 不需要特殊权限，任何人都可以查看和添加评论 -->
      <div @click="openComment()" class="secondary-action-btn action-comment">
        <Icon :size="16" icon="ep:chat-dot-round" class="action-icon" />&nbsp; 评论
      </div>

      <!-- 【催办】按钮 - 仅在流程进行中时显示 -->
      <div
        v-if="!isEndProcessStatus(processInstance?.status)"
        @click="openUrge()"
        class="secondary-action-btn action-urge"
      >
        <Icon :size="16" icon="ep:alarm-clock" class="action-icon" />&nbsp; 催办
      </div>

      <!-- 管理员按钮容器 - 确保更突出显示 -->
      <div
        class="admin-buttons-container"
        v-if="shouldShowAdminButtons"
        :data-debug="`管理员按钮显示条件：adminStatus=${adminStatus}, 无taskId=${!router.currentRoute.value.query.taskId}, 流程状态=${processInstance?.status}, 流程已结束=${isEndProcessStatus(processInstance?.status)}`"
      >
        <!-- 【管理员审批通过】按钮 -->
        <el-popover
          :visible="popOverVisible.adminApprove"
          placement="top-start"
          :width="420"
          trigger="click"
        >
          <template #reference>
            <div
              @click="openPopover('adminApprove')"
              class="secondary-action-btn action-admin-approve admin-button"
            >
              <Icon :size="16" icon="ep:check" class="action-icon" />&nbsp; 管理员修改审批表单
            </div>
          </template>
          <!-- 审批表单 -->
          <div class="flex flex-col flex-1 pt-20px px-20px" v-loading="formLoading">
            <el-form
              label-position="top"
              class="mb-auto"
              ref="adminApproveFormRef"
              :model="adminApproveForm"
              :rules="adminApproveFormRule"
              label-width="100px"
            >
              <el-form-item label="当前节点" prop="currentTaskId">
                <el-select v-model="adminApproveForm.currentTaskId" clearable style="width: 100%">
                  <el-option
                    v-for="item in currentNodes"
                    :key="item.id"
                    :label="item.name + '-' + (item.assigneeUser?.nickname || '无审批人')"
                    :value="item.id"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="审批意见" prop="reason">
                <el-input
                  v-model="adminApproveForm.reason"
                  clearable
                  placeholder="请输入审批意见"
                  type="textarea"
                  :rows="3"
                />
              </el-form-item>
              <el-form-item>
                <el-button :disabled="formLoading" type="primary" @click="handleAdminApprove()">
                  确认审批通过
                </el-button>
                <el-button @click="closePropover('adminApprove', adminApproveFormRef)">
                  取消
                </el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-popover>

        <!-- 【管理员退回】按钮 -->
        <el-popover
          :visible="popOverVisible.adminReturn"
          placement="top-start"
          :width="420"
          trigger="click"
        >
          <template #reference>
            <div
              @click="openPopover('adminReturn')"
              class="secondary-action-btn action-return admin-button"
            >
              <Icon :size="16" icon="ep:warning" class="action-icon" />&nbsp; 管理员退回
            </div>
          </template>
          <!-- 审批表单 -->
          <div class="flex flex-col flex-1 pt-20px px-20px" v-loading="formLoading">
            <el-form
              label-position="top"
              class="mb-auto"
              ref="adminReturnFormRef"
              :model="adminReturnForm"
              :rules="adminReturnFormRule"
              label-width="100px"
            >
              <el-form-item label="当前节点" prop="currentTaskId">
                <el-select
                  v-model="adminReturnForm.currentTaskId"
                  clearable
                  style="width: 100%"
                  @change="handleCurrentNodeChange"
                >
                  <el-option
                    v-for="item in currentNodes"
                    :key="item.id"
                    :label="item.name + '-' + (item.assigneeUser?.nickname || '无审批人')"
                    :value="item.id"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="退回节点" prop="targetTaskDefinitionKey">
                <el-select
                  v-model="adminReturnForm.targetTaskDefinitionKey"
                  clearable
                  style="width: 100%"
                >
                  <el-option
                    v-for="item in returnList"
                    :key="item.taskDefinitionKey"
                    :label="item.name"
                    :value="item.taskDefinitionKey"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="退回理由" prop="reason">
                <el-input
                  v-model="adminReturnForm.reason"
                  clearable
                  placeholder="请输入退回理由"
                  type="textarea"
                  :rows="3"
                />
              </el-form-item>
              <el-form-item>
                <el-button :disabled="formLoading" type="primary" @click="handleAdminReturn()">
                  确认退回
                </el-button>
                <el-button @click="closePropover('adminReturn', adminReturnFormRef)">
                  取消
                </el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-popover>
      </div>

      <!-- 其他操作按钮组 - 在非管理员模式下显示 -->
      <template v-if="!shouldShowAdminButtons">
        <!-- 【抄送】按钮 -->
        <el-popover
          :visible="popOverVisible.copy"
          placement="top-start"
          :width="420"
          trigger="click"
          v-if="runningTask && isHandleTaskStatus() && isShowButton(OperationButtonType.COPY)"
        >
          <template #reference>
            <div @click="openPopover('copy')" class="secondary-action-btn">
              <Icon :size="16" icon="svg-icon:send" class="action-icon" />&nbsp;
              {{ getButtonDisplayName(OperationButtonType.COPY) }}
            </div>
          </template>
          <div class="flex flex-col flex-1 pt-20px px-20px" v-loading="formLoading">
            <el-form
              label-position="top"
              class="mb-auto"
              ref="copyFormRef"
              :model="copyForm"
              :rules="copyFormRule"
              label-width="100px"
            >
              <el-form-item label="抄送人" prop="copyUserIds">
                <el-select
                  v-model="copyForm.copyUserIds"
                  clearable
                  style="width: 100%"
                  multiple
                  placeholder="请选择抄送人"
                >
                  <el-option
                    v-for="item in userOptions"
                    :key="item.id"
                    :label="item.nickname"
                    :value="item.id"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="抄送意见" prop="copyReason">
                <el-input
                  v-model="copyForm.copyReason"
                  clearable
                  placeholder="请输入抄送意见"
                  type="textarea"
                  :rows="3"
                />
              </el-form-item>
              <el-form-item>
                <el-button :disabled="formLoading" type="primary" @click="handleCopy">
                  {{ getButtonDisplayName(OperationButtonType.COPY) }}
                </el-button>
                <el-button @click="closePropover('copy', copyFormRef)"> 取消 </el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-popover>

        <!-- 【转办】按钮 -->
        <el-popover
          :visible="popOverVisible.transfer"
          placement="top-start"
          :width="420"
          trigger="click"
          v-if="runningTask && isHandleTaskStatus() && isShowButton(OperationButtonType.TRANSFER)"
        >
          <template #reference>
            <div @click="openPopover('transfer')" class="secondary-action-btn">
              <Icon :size="16" icon="fa:share-square-o" class="action-icon" />&nbsp;
              {{ getButtonDisplayName(OperationButtonType.TRANSFER) }}
            </div>
          </template>
          <div class="flex flex-col flex-1 pt-20px px-20px" v-loading="formLoading">
            <el-form
              label-position="top"
              class="mb-auto"
              ref="transferFormRef"
              :model="transferForm"
              :rules="transferFormRule"
              label-width="100px"
            >
              <el-form-item label="新审批人" prop="assigneeUserId">
                <el-select
                  v-model="transferForm.assigneeUserId"
                  clearable
                  style="width: 100%"
                  filterable
                >
                  <el-option
                    v-for="item in userOptions"
                    :key="item.id"
                    :label="item.nickname"
                    :value="item.id"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="审批意见" prop="reason">
                <el-input
                  v-model="transferForm.reason"
                  clearable
                  placeholder="请输入审批意见"
                  type="textarea"
                  :rows="3"
                />
              </el-form-item>
              <el-form-item>
                <el-button :disabled="formLoading" type="primary" @click="handleTransfer()">
                  {{ getButtonDisplayName(OperationButtonType.TRANSFER) }}
                </el-button>
                <el-button @click="closePropover('transfer', transferFormRef)"> 取消 </el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-popover>

        <!-- 【委派】按钮 -->
        <el-popover
          :visible="popOverVisible.delegate"
          placement="top-start"
          :width="420"
          trigger="click"
          v-if="runningTask && isHandleTaskStatus() && isShowButton(OperationButtonType.DELEGATE)"
        >
          <template #reference>
            <div @click="openPopover('delegate')" class="secondary-action-btn">
              <Icon :size="16" icon="ep:position" class="action-icon" />&nbsp;
              {{ getButtonDisplayName(OperationButtonType.DELEGATE) }}
            </div>
          </template>
          <div class="flex flex-col flex-1 pt-20px px-20px" v-loading="formLoading">
            <el-form
              label-position="top"
              class="mb-auto"
              ref="delegateFormRef"
              :model="delegateForm"
              :rules="delegateFormRule"
              label-width="100px"
            >
              <el-form-item label="接收人" prop="delegateUserId">
                <el-select
                  v-model="delegateForm.delegateUserId"
                  clearable
                  filterable
                  style="width: 100%"
                >
                  <el-option
                    v-for="item in userOptions"
                    :key="item.id"
                    :label="item.nickname"
                    :value="item.id"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="审批意见" prop="reason">
                <el-input
                  v-model="delegateForm.reason"
                  clearable
                  placeholder="请输入审批意见"
                  type="textarea"
                  :rows="3"
                />
              </el-form-item>
              <el-form-item>
                <el-button :disabled="formLoading" type="primary" @click="handleDelegate()">
                  {{ getButtonDisplayName(OperationButtonType.DELEGATE) }}
                </el-button>
                <el-button @click="closePropover('delegate', delegateFormRef)"> 取消 </el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-popover>

        <!-- 【加签】按钮 当前任务审批人为A，向前加签选了一个C，则需要C先审批，然后再是A审批，向后加签B，A审批完，需要B再审批完，才算完成这个任务节点 -->
        <el-popover
          :visible="popOverVisible.addSign"
          placement="top-start"
          :width="420"
          trigger="click"
          v-if="runningTask && isHandleTaskStatus() && isShowButton(OperationButtonType.ADD_SIGN)"
        >
          <template #reference>
            <div @click="openPopover('addSign')" class="secondary-action-btn">
              <Icon :size="16" icon="ep:plus" class="action-icon" />&nbsp;
              {{ getButtonDisplayName(OperationButtonType.ADD_SIGN) }}
            </div>
          </template>
          <div class="flex flex-col flex-1 pt-20px px-20px" v-loading="formLoading">
            <el-form
              label-position="top"
              class="mb-auto"
              ref="addSignFormRef"
              :model="addSignForm"
              :rules="addSignFormRule"
              label-width="100px"
            >
              <el-form-item label="加签处理人" prop="addSignUserIds">
                <el-select
                  v-model="addSignForm.addSignUserIds"
                  multiple
                  clearable
                  style="width: 100%"
                >
                  <el-option
                    v-for="item in userOptions"
                    :key="item.id"
                    :label="item.nickname"
                    :value="item.id"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="审批意见" prop="reason">
                <el-input
                  v-model="addSignForm.reason"
                  clearable
                  placeholder="请输入审批意见"
                  type="textarea"
                  :rows="3"
                />
              </el-form-item>
              <el-form-item>
                <el-button :disabled="formLoading" type="primary" @click="handlerAddSign('before')">
                  向前{{ getButtonDisplayName(OperationButtonType.ADD_SIGN) }}
                </el-button>
                <el-button :disabled="formLoading" type="primary" @click="handlerAddSign('after')">
                  向后{{ getButtonDisplayName(OperationButtonType.ADD_SIGN) }}
                </el-button>
                <el-button @click="closePropover('addSign', addSignFormRef)"> 取消 </el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-popover>

        <!-- 【减签】按钮 -->
        <el-popover
          :visible="popOverVisible.deleteSign"
          placement="top-start"
          :width="420"
          trigger="click"
          v-if="runningTask?.children.length > 0"
        >
          <template #reference>
            <div @click="openPopover('deleteSign')" class="secondary-action-btn">
              <Icon :size="16" icon="ep:semi-select" class="action-icon" />&nbsp; 减签
            </div>
          </template>
          <div class="flex flex-col flex-1 pt-20px px-20px" v-loading="formLoading">
            <el-form
              label-position="top"
              class="mb-auto"
              ref="deleteSignFormRef"
              :model="deleteSignForm"
              :rules="deleteSignFormRule"
              label-width="100px"
            >
              <el-form-item label="减签人员" prop="deleteSignTaskId">
                <el-select v-model="deleteSignForm.deleteSignTaskId" clearable style="width: 100%">
                  <el-option
                    v-for="item in runningTask.children"
                    :key="item.id"
                    :label="getDeleteSignUserLabel(item)"
                    :value="item.id"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="审批意见" prop="reason">
                <el-input
                  v-model="deleteSignForm.reason"
                  clearable
                  placeholder="请输入审批意见"
                  type="textarea"
                  :rows="3"
                />
              </el-form-item>
              <el-form-item>
                <el-button :disabled="formLoading" type="primary" @click="handlerDeleteSign()">
                  减签
                </el-button>
                <el-button @click="closePropover('deleteSign', deleteSignFormRef)">
                  取消
                </el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-popover>

        <!-- 【退回】按钮 -->
        <el-popover
          :visible="popOverVisible.return"
          placement="top-start"
          :width="420"
          trigger="click"
          v-if="runningTask && isHandleTaskStatus() && isShowButton(OperationButtonType.RETURN)"
        >
          <template #reference>
            <div @click="openPopover('return')" class="secondary-action-btn action-return">
              <Icon :size="16" icon="ep:back" class="action-icon" />&nbsp;
              {{ getButtonDisplayName(OperationButtonType.RETURN) }}
            </div>
          </template>
          <div class="flex flex-col flex-1 pt-20px px-20px" v-loading="formLoading">
            <el-form
              label-position="top"
              class="mb-auto"
              ref="returnFormRef"
              :model="returnForm"
              :rules="returnFormRule"
              label-width="100px"
            >
              <el-form-item label="退回节点" prop="targetTaskDefinitionKey">
                <el-select
                  v-model="returnForm.targetTaskDefinitionKey"
                  clearable
                  style="width: 100%"
                >
                  <el-option
                    v-for="item in returnList"
                    :key="item.taskDefinitionKey"
                    :label="item.name"
                    :value="item.taskDefinitionKey"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="退回理由" prop="returnReason">
                <el-input
                  v-model="returnForm.returnReason"
                  clearable
                  placeholder="请输入退回理由"
                  type="textarea"
                  :rows="3"
                />
              </el-form-item>
              <el-form-item>
                <el-button :disabled="formLoading" type="primary" @click="handleReturn()">
                  {{ getButtonDisplayName(OperationButtonType.RETURN) }}
                </el-button>
                <el-button @click="closePropover('return', returnFormRef)"> 取消 </el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-popover>
      </template>

      <!--【取消】按钮 这个对应发起人的取消, 只有发起人可以取消 -->
      <el-popover
        :visible="popOverVisible.cancel"
        placement="top-start"
        :width="420"
        trigger="click"
        v-if="
          userId === processInstance?.startUser?.id && !isEndProcessStatus(processInstance?.status)
        "
      >
        <template #reference>
          <div @click="openPopover('cancel')" class="secondary-action-btn action-cancel">
            <Icon :size="16" icon="fa:mail-reply" class="action-icon" />&nbsp; 取消
          </div>
        </template>
        <div class="flex flex-col flex-1 pt-20px px-20px" v-loading="formLoading">
          <el-form
            label-position="top"
            class="mb-auto"
            ref="cancelFormRef"
            :model="cancelForm"
            :rules="cancelFormRule"
            label-width="100px"
          >
            <el-form-item label="取消理由" prop="cancelReason">
              <span class="text-#878c93 text-12px">&nbsp; 取消后，该审批流程将自动结束</span>
              <el-input
                v-model="cancelForm.cancelReason"
                clearable
                placeholder="请输入取消理由"
                type="textarea"
                :rows="3"
              />
            </el-form-item>
            <el-form-item>
              <el-button :disabled="formLoading" type="primary" @click="handleCancel()">
                确认
              </el-button>
              <el-button @click="closePropover('cancel', cancelFormRef)"> 取消 </el-button>
            </el-form-item>
          </el-form>
        </div>
      </el-popover>
      <!-- 【再次提交】 按钮-->
      <div
        @click="handleReCreate()"
        class="secondary-action-btn action-resubmit"
        v-if="
          !shouldShowAdminButtons &&
          userId === processInstance?.startUser?.id &&
          isEndProcessStatus(processInstance?.status) &&
          processDefinition?.formType === 10
        "
      >
        <Icon :size="16" icon="ep:refresh" class="action-icon" />&nbsp; 再次提交
      </div>
    </div>
  </div>

  <!-- 添加催办弹窗 -->
  <el-dialog
    v-model="urgeDialogVisible"
    title="催办处理"
    width="450px"
    :close-on-click-modal="false"
    append-to-body
  >
    <div v-loading="urgeLoading">
      <el-alert
        title="催办将向当前审批人发送消息提醒"
        type="info"
        :closable="false"
        class="mb-15px"
      />

      <div class="mb-15px">
        <div class="font-bold mb-5px">当前审批人：</div>
        <el-tag
          v-for="user in currentApprovers"
          :key="user.id"
          class="mr-5px mb-5px"
          closable
          :disable-transitions="false"
          @close="handleRemoveApprover(user)"
        >
          {{ user.nickname }}
        </el-tag>
        <el-empty
          v-if="!currentApprovers || currentApprovers.length === 0"
          description="暂无审批人"
        />
      </div>

      <el-form :model="urgeForm" label-position="top">
        <el-form-item label="催办消息" prop="urgeMessage">
          <el-input
            v-model="urgeForm.urgeMessage"
            placeholder="请输入催办消息"
            type="textarea"
            :rows="3"
          />
        </el-form-item>
      </el-form>
    </div>
    <template #footer>
      <el-button @click="urgeDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="handleUrge" :loading="urgeLoading">发送催办</el-button>
    </template>
  </el-dialog>

  <!-- 签名弹窗 -->
  <SignDialog ref="signRef" @success="handleSignFinish" />

  <!-- 评论弹窗 -->
  <CommentDialog ref="commentDialogRef" />
</template>
<script lang="ts" setup>
import { useUserStoreWithOut } from '@/store/modules/user'
import { setConfAndFields2 } from '@/utils/formCreate'
import * as TaskApi from '@/api/bpm/task'
import * as ProcessInstanceApi from '@/api/bpm/processInstance'
import * as UserApi from '@/api/system/user'
import * as ModelApi from '@/api/bpm/model'
import {
  NodeType,
  OPERATION_BUTTON_NAME,
  OperationButtonType
} from '@/components/SimpleProcessDesignerV2/src/consts'
import { BpmModelFormType, BpmProcessInstanceStatus } from '@/utils/constants'
import type { FormInstance, FormRules } from 'element-plus'
import SignDialog from './SignDialog.vue'
import CommentDialog from './CommentDialog.vue' // 引入评论弹窗组件
import { emitter, UPLOAD_STATUS_EVENT } from '@/utils/eventBus'

defineOptions({ name: 'ProcessInstanceBtnContainer' })

const router = useRouter() // 路由
const message = useMessage() // 消息弹窗

const userId = useUserStoreWithOut().getUser.id // 当前登录的编号
const emit = defineEmits(['success']) // 定义 success 事件，用于操作成功后的回调

const props = defineProps<{
  processInstance: any // 流程实例信息
  processDefinition: any // 流程定义信息
  userOptions: UserApi.UserVO[]
  normalForm: any // 流程表单 formCreate
  normalFormApi: any // 流程表单 formCreate Api
  writableFields: string[] // 流程表单可以编辑的字段
  isAdmin?: boolean // 是否管理员
}>()

const formLoading = ref(false) // 表单加载中
const fileUploading = ref(false) // 是否有文件正在上传
const popOverVisible = ref({
  approve: false,
  reject: false,
  transfer: false,
  delegate: false,
  addSign: false,
  return: false,
  copy: false,
  cancel: false,
  deleteSign: false,
  adminReturn: false, // 新增管理员退回的popover状态
  adminApprove: false, // 新增管理员审批通过的popover状态
  comment: false, // 新增评论弹窗状态
  urge: false, // 新增催办弹窗状态
  save: false // 新增暂存弹窗状态
}) // 气泡卡是否展示
const returnList = ref([] as any) // 退回节点
const adminStatus = ref(false) // 是否为管理员
const currentNodes = ref([] as any) // 当前运行中的节点列表

// ========== 审批信息 ==========
const runningTask = ref<any>() // 运行中的任务
const approveForm = ref<any>({}) // 审批通过时，额外的补充信息
const approveFormFApi = ref<any>({}) // approveForms 的 fAPi
const nodeTypeName = ref('审批') // 节点类型名称

// 审批通过意见表单
const reasonRequire = ref()
const approveFormRef = ref<FormInstance>()
const signRef = ref()
const approveSignFormRef = ref()
const approveReasonForm = reactive({
  reason: '',
  signPicUrl: ''
})
const approveReasonRule = computed(() => {
  return {
    reason: [
      { required: reasonRequire.value, message: nodeTypeName + '意见不能为空', trigger: 'blur' }
    ],
    signPicUrl: [{ required: true, message: '签名不能为空', trigger: 'change' }]
  }
})
// 拒绝表单
const rejectFormRef = ref<FormInstance>()
const rejectReasonForm = reactive({
  reason: ''
})
const rejectReasonRule = computed(() => {
  return {
    reason: [{ required: reasonRequire.value, message: '审批意见不能为空', trigger: 'blur' }]
  }
})

// 抄送表单
const copyFormRef = ref<FormInstance>()
const copyForm = reactive({
  copyUserIds: [],
  copyReason: ''
})
const copyFormRule = reactive<FormRules<typeof copyForm>>({
  copyUserIds: [{ required: true, message: '抄送人不能为空', trigger: 'change' }]
})

// 转办表单
const transferFormRef = ref<FormInstance>()
const transferForm = reactive({
  assigneeUserId: undefined,
  reason: ''
})
const transferFormRule = reactive<FormRules<typeof transferForm>>({
  assigneeUserId: [{ required: true, message: '新审批人不能为空', trigger: 'change' }],
  reason: [{ required: true, message: '审批意见不能为空', trigger: 'blur' }]
})

// 委派表单
const delegateFormRef = ref<FormInstance>()
const delegateForm = reactive({
  delegateUserId: undefined,
  reason: ''
})
const delegateFormRule = reactive<FormRules<typeof delegateForm>>({
  delegateUserId: [{ required: true, message: '接收人不能为空', trigger: 'change' }],
  reason: [{ required: true, message: '审批意见不能为空', trigger: 'blur' }]
})

// 加签表单
const addSignFormRef = ref<FormInstance>()
const addSignForm = reactive({
  addSignUserIds: undefined,
  reason: ''
})
const addSignFormRule = reactive<FormRules<typeof addSignForm>>({
  addSignUserIds: [{ required: true, message: '加签处理人不能为空', trigger: 'change' }],
  reason: [{ required: true, message: '审批意见不能为空', trigger: 'blur' }]
})

// 减签表单
const deleteSignFormRef = ref<FormInstance>()
const deleteSignForm = reactive({
  deleteSignTaskId: undefined,
  reason: ''
})
const deleteSignFormRule = reactive<FormRules<typeof deleteSignForm>>({
  deleteSignTaskId: [{ required: true, message: '减签人员不能为空', trigger: 'change' }],
  reason: [{ required: true, message: '审批意见不能为空', trigger: 'blur' }]
})

// 退回表单
const returnFormRef = ref<FormInstance>()
const returnForm = reactive({
  targetTaskDefinitionKey: undefined,
  returnReason: ''
})
const returnFormRule = reactive<FormRules<typeof returnForm>>({
  targetTaskDefinitionKey: [{ required: true, message: '退回节点不能为空', trigger: 'change' }],
  returnReason: [{ required: true, message: '退回理由不能为空', trigger: 'blur' }]
})

// 取消表单
const cancelFormRef = ref<FormInstance>()
const cancelForm = reactive({
  cancelReason: ''
})
const cancelFormRule = reactive<FormRules<typeof cancelForm>>({
  cancelReason: [{ required: true, message: '取消理由不能为空', trigger: 'blur' }]
})

// 管理员退回表单
const adminReturnFormRef = ref<FormInstance>()
const adminReturnForm = reactive({
  currentTaskId: undefined, // 当前节点ID
  targetTaskDefinitionKey: undefined, // 退回目标节点
  reason: '' // 退回理由
})
const adminReturnFormRule = reactive<FormRules<typeof adminReturnForm>>({
  currentTaskId: [{ required: true, message: '当前节点不能为空', trigger: 'change' }],
  targetTaskDefinitionKey: [{ required: true, message: '退回节点不能为空', trigger: 'change' }],
  reason: [{ required: true, message: '退回理由不能为空', trigger: 'blur' }]
})

// 管理员审批通过表单
const adminApproveFormRef = ref<FormInstance>()
const adminApproveForm = reactive({
  currentTaskId: undefined, // 当前节点ID
  reason: '' // 审批理由
})
const adminApproveFormRule = reactive<FormRules<typeof adminApproveForm>>({
  currentTaskId: [{ required: true, message: '当前节点不能为空', trigger: 'change' }],
  reason: [{ required: true, message: '审批理由不能为空', trigger: 'blur' }]
})

// 计算审批按钮禁用状态
const isApproveButtonDisabled = computed(() => {
  return fileUploading.value || formLoading.value
})

// 计算是否应该显示管理员按钮
const shouldShowAdminButtons = computed(() => {
  const hasAdminStatus = adminStatus.value
  const notEndProcess = !isEndProcessStatus(props.processInstance?.status)

  // 移除taskId限制，只要是管理员且流程未结束就显示管理员按钮
  const should = hasAdminStatus && notEndProcess

/*  console.log('计算是否显示管理员按钮:', {
    hasAdminStatus,
    notEndProcess,
    result: should
  })*/

  return should
})

/** 弹出气泡卡 */
const openPopover = async (type: string) => {
  // 检查文件是否正在上传
  if ((type === 'approve' || type === 'reject') && fileUploading.value) {
  //  console.log('尝试打开审批弹窗，但有文件正在上传')
    message.warning('有文件正在上传，请等待上传完成后再操作')
    return
  }

  if (type === 'approve') {
    // 校验流程表单
    const valid = await validateNormalForm()
    if (!valid) {
      message.warning('表单校验不通过，请先完善表单!!')
      return
    }
  }
  if (type === 'return') {
    // 获取退回节点
    returnList.value = await TaskApi.getTaskListByReturn(runningTask.value.id)
    if (returnList.value.length === 0) {
      message.warning('当前没有可退回的节点')
      return
    }
  }
  if (type === 'adminReturn' || type === 'adminApprove') {
    // 重新获取当前流程节点
    await fetchCurrentNodes()
    if (currentNodes.value.length === 0) {
      message.warning('当前流程没有运行中的节点')
      return
    }
    // 只有管理员退回才需要重置退回节点列表
    if (type === 'adminReturn') {
      returnList.value = []
      adminReturnForm.targetTaskDefinitionKey = undefined
    }
  }
  Object.keys(popOverVisible.value).forEach((item) => {
    popOverVisible.value[item] = item === type
  })
  // await nextTick()
  // formRef.value.resetFields()
}

/** 关闭气泡卡 */
const closePropover = (type: string, formRef?: FormInstance | undefined) => {
  if (formRef) {
    formRef.resetFields()
  }
  popOverVisible.value[type] = false
}

/** 添加一个获取任务ID的工具函数 */
const getTaskId = () => {
  // 直接从当前URL获取taskId，确保获取最新值
  const url = new URL(window.location.href)
  const urlTaskId = url.searchParams.get('taskId')

  // 如果URL中有taskId，则优先使用
  const taskId = urlTaskId || router.currentRoute.value.query.taskId || runningTask.value?.id

  if (!taskId) {
    message.error('未找到任务ID')
    return null
  }
/*  console.log(
    '获取任务ID:',
    taskId,
    '(来源:',
    urlTaskId ? 'URL' : router.currentRoute.value.query.taskId ? 'Router' : 'runningTask',
    ')'
  )*/
  return taskId
}

/** 处理审批通过和不通过的操作 */
const handleAudit = async (pass: boolean, formRef: FormInstance | undefined) => {
/*
  console.log('触发审批操作，文件上传状态:', fileUploading.value)
  console.log('审批操作前状态 - 当前任务:', runningTask.value?.id)
  console.log(
    '审批操作前状态 - URL中的taskId:',
    new URL(window.location.href).searchParams.get('taskId')
  )
  console.log('审批操作前状态 - 路由中的taskId:', router.currentRoute.value.query.taskId)
*/

  // 检查文件是否正在上传中
  if (fileUploading.value) {
    // console.log('文件正在上传，阻止审批操作')
    message.warning('请等待文件上传完成后再审批')
    return
  }

  formLoading.value = true
  try {
    if (pass) {
      // 校验表单
      if (!formRef) return
      await formRef.validate()
      // 校验流程表单必填字段
      const valid = await validateNormalForm()
      if (!valid) {
        message.warning('表单校验不通过，请先完善表单!!')
        return
      }
      // 获取修改的流程变量, 暂时只支持流程表单
      const variables = getUpdatedProcessInstanceVariables()
      // 优先使用路由中的 taskId
      const taskId = getTaskId()
      if (!taskId) {
        message.error('未找到任务ID')
        return
      }

      // 审批通过数据
      const data: {
        id: any
        reason: string
        variables: any
        signPicUrl?: string
        startUserSelectAssignees?: Record<string, number[]>
      } = {
        id: taskId,
        reason: approveReasonForm.reason,
        variables // 审批通过, 把修改的字段值赋于流程实例变量
      }
      // 签名
      if (runningTask.value.signEnable) {
        data.signPicUrl = approveReasonForm.signPicUrl
      }
      // 多表单处理，并且有额外的 approveForm 表单，需要校验 + 拼接到 data 表单里提交
      // TODO 芋艿 任务有多表单这里要如何处理，会和可编辑的字段冲突
      const formCreateApi = approveFormFApi.value
      if (Object.keys(formCreateApi)?.length > 0) {
        await formCreateApi.validate()
        // @ts-ignore
        data.variables = approveForm.value.value
      }
      // 添加用户选择的审批人
      if (Object.keys(startUserSelectAssignees.value).length > 0) {
        // console.log('添加自选审批人:', startUserSelectAssignees.value)
        data.startUserSelectAssignees = startUserSelectAssignees.value
      }
      //const response = await TaskApi.approveTask(data)
/*      console.log('审批通过API响应:', response)
      console.log('审批通过后状态 - 当前任务:', runningTask.value?.id)
      console.log(
        '审批通过后状态 - URL中的taskId:',
        new URL(window.location.href).searchParams.get('taskId')
      )
     // console.log('审批通过后状态 - 路由中的taskId:', router.currentRoute.value.query.taskId)*/
      popOverVisible.value.approve = false
      message.success('审批通过成功')
    } else {
      // 审批不通过数据
      const taskId = getTaskId()
      if (!taskId) return

      const data = {
        id: taskId,
        reason: rejectReasonForm.reason
      }
      await TaskApi.rejectTask(data)
      popOverVisible.value.reject = false
      message.success('审批不通过成功')
    }
    // 重置表单
    if (formRef) {
      formRef.resetFields()
    }
    // 加载最新数据
    reload()
    
    // 获取运行中的任务列表，判断是否有下一个待办任务
    const runningTasks = await TaskApi.getRunningTaskList(props.processInstance.id)
    const userStore = useUserStoreWithOut()
    const currentUser = userStore.getUser
    
    // 检查是否有当前用户的任务
    let hasUserTask = false
    if (runningTasks && runningTasks.length > 0) {
      for (const task of runningTasks) {
        if (task.nodes && task.nodes.length > 0) {
          for (const node of task.nodes) {
            if (node.users && node.users.length > 0) {
              for (const userTask of node.users) {
                if (userTask.user && userTask.user.id === currentUser.id) {
                  hasUserTask = true
                  break
                }
              }
            }
            if (hasUserTask) break
          }
        }
        if (hasUserTask) break
      }
    }
    
    // 如果没有下一个待办任务，根据环境判断是否跳转
    if (!hasUserTask) {
      // 检测是否在钉钉环境
      const isDingTalk = /DingTalk/.test(navigator.userAgent)
      
      // 如果不是钉钉环境，跳转到待办任务列表
      if (!isDingTalk) {
      //  console.log('非钉钉环境，跳转到待办任务列表')
        await router.push({ path: '/bpm/task/todo' })
      } else {
      //  console.log('钉钉环境，不进行跳转')
      }
    }
  } finally {
    formLoading.value = false
  }
}

/** 处理抄送 */
const handleCopy = async () => {
  formLoading.value = true
  try {
    // 1. 校验表单
    if (!copyFormRef.value) return
    await copyFormRef.value.validate()
    // 2. 提交抄送
    const taskId = getTaskId()
    const data = {
      id: taskId,
      reason: copyForm.copyReason,
      copyUserIds: copyForm.copyUserIds
    }
    await TaskApi.copyTask(data)
    copyFormRef.value.resetFields()
    popOverVisible.value.copy = false
    message.success('操作成功')
  } finally {
    formLoading.value = false
  }
}

/** 处理转交 */
const handleTransfer = async () => {
  formLoading.value = true
  try {
    // 1.1 校验表单
    if (!transferFormRef.value) return
    await transferFormRef.value.validate()

    const taskId = getTaskId()
    if (!taskId) return

    const data = {
      id: taskId,
      reason: transferForm.reason,
      assigneeUserId: transferForm.assigneeUserId
    }
    await TaskApi.transferTask(data)
    transferFormRef.value.resetFields()
    popOverVisible.value.transfer = false
    message.success('操作成功')
    // 2. 加载最新数据
    reload()
  } finally {
    formLoading.value = false
  }
}

/** 处理委派 */
const handleDelegate = async () => {
  formLoading.value = true
  try {
    // 1.1 校验表单
    if (!delegateFormRef.value) return
    await delegateFormRef.value.validate()

    const taskId = getTaskId()
    if (!taskId) return

    const data = {
      id: taskId,
      reason: delegateForm.reason,
      delegateUserId: delegateForm.delegateUserId
    }

    await TaskApi.delegateTask(data)
    popOverVisible.value.delegate = false
    delegateFormRef.value.resetFields()
    message.success('操作成功')
    // 2. 加载最新数据
    reload()
  } finally {
    formLoading.value = false
  }
}

/** 处理加签 */
const handlerAddSign = async (type: string) => {
  formLoading.value = true
  try {
    // 1.1 校验表单
    if (!addSignFormRef.value) return
    await addSignFormRef.value.validate()

    const taskId = getTaskId()
    if (!taskId) return

    const data = {
      id: taskId,
      type,
      reason: addSignForm.reason,
      userIds: addSignForm.addSignUserIds
    }
    await TaskApi.signCreateTask(data)
    message.success('操作成功')
    addSignFormRef.value.resetFields()
    popOverVisible.value.addSign = false
    // 2 加载最新数据
    reload()
  } finally {
    formLoading.value = false
  }
}

/** 处理退回 */
const handleReturn = async () => {
  formLoading.value = true
  try {
    // 1.1 校验表单
    if (!returnFormRef.value) return
    await returnFormRef.value.validate()

    const taskId = getTaskId()
    if (!taskId) return

    const data = {
      id: taskId,
      reason: returnForm.returnReason,
      targetTaskDefinitionKey: returnForm.targetTaskDefinitionKey
    }

    await TaskApi.returnTask(data)
    popOverVisible.value.return = false
    returnFormRef.value.resetFields()
    message.success('操作成功')
    // 重新加载数据
    reload()
  } finally {
    formLoading.value = false
  }
}

/** 处理取消 */
const handleCancel = async () => {
  formLoading.value = true
  try {
    // 1.1 校验表单
    if (!cancelFormRef.value) return
    await cancelFormRef.value.validate()
    // 1.2 提交取消
    await ProcessInstanceApi.cancelProcessInstanceByStartUser(
      props.processInstance.id,
      cancelForm.cancelReason
    )
    popOverVisible.value.return = false
    message.success('操作成功')
    cancelFormRef.value.resetFields()
    // 2 重新加载数据
    reload()
  } finally {
    formLoading.value = false
  }
}

/** 处理再次提交 */
const handleReCreate = async () => {
  // 跳转发起流程界面
  await router.push({
    name: 'BpmProcessInstanceCreate',
    query: { processInstanceId: props.processInstance?.id }
  })
}

/** 获取减签人员标签 */
const getDeleteSignUserLabel = (task: any): string => {
  const deptName = task?.assigneeUser?.deptName || task?.ownerUser?.deptName
  const nickname = task?.assigneeUser?.nickname || task?.ownerUser?.nickname
  return `${nickname} ( 所属部门：${deptName} )`
}
/** 处理减签 */
const handlerDeleteSign = async () => {
  formLoading.value = true
  try {
    // 1.1 校验表单
    if (!deleteSignFormRef.value) return
    await deleteSignFormRef.value.validate()
    // 1.2 提交减签
    const taskId = getTaskId()
    if (!taskId) return
    const data = {
      id: taskId,
      reason: deleteSignForm.reason
    }
    await TaskApi.signDeleteTask(data)
    message.success('减签成功')
    deleteSignFormRef.value.resetFields()
    popOverVisible.value.deleteSign = false
    // 2 加载最新数据
    reload()
  } finally {
    formLoading.value = false
  }
}
/** 重新加载数据 */
const reload = () => {
  emit('success')
}

/** 任务是否为处理中状态 */
const isHandleTaskStatus = () => {
  let canHandle = false
/*  console.log('检查任务状态:', {
    currentStatus: runningTask.value?.status,
    expectedStatus: TaskApi.TaskStatusEnum.RUNNING,
    runningTask: runningTask.value
  })*/
  // 支持待审批(WAIT)和审批中(RUNNING)两种状态
  if (
    runningTask.value?.status === TaskApi.TaskStatusEnum.WAIT ||
    runningTask.value?.status === TaskApi.TaskStatusEnum.RUNNING
  ) {
    canHandle = true
  }
  // console.log('任务是否可处理:', canHandle)
  return canHandle
}

/** 流程状态是否为结束状态 */
const isEndProcessStatus = (status: number) => {
  // console.log('检查流程是否结束 - 当前状态:', status)

  // 防止状态为undefined
  if (status === undefined || status === null) {
  //  console.log('流程状态为空，视为未结束')
    return false
  }

  let isEndStatus = false
  if (
    BpmProcessInstanceStatus.APPROVE === status ||
    BpmProcessInstanceStatus.REJECT === status ||
    BpmProcessInstanceStatus.CANCEL === status
  ) {
    isEndStatus = true
    // console.log('流程已结束: 状态为审批通过/拒绝/取消')
  }
  // console.log('isEndProcessStatus', isEndStatus)
  return isEndStatus
}

/** 是否显示按钮 */
const isShowButton = (btnType: OperationButtonType): boolean => {
  let isShow = true
/*  console.log('检查按钮显示权限:', {
    btnType,
    buttonsSetting: runningTask.value?.buttonsSetting,
    specificSetting: runningTask.value?.buttonsSetting?.[btnType]
  })*/
  if (runningTask.value?.buttonsSetting && runningTask.value?.buttonsSetting[btnType]) {
    isShow = runningTask.value.buttonsSetting[btnType].enable
  }
  // console.log('按钮是否显示:', isShow)
  return isShow
}

/** 获取按钮的显示名称 */
const getButtonDisplayName = (btnType: OperationButtonType) => {
  let displayName = OPERATION_BUTTON_NAME.get(btnType)
  if (runningTask.value?.buttonsSetting && runningTask.value?.buttonsSetting[btnType]) {
    displayName = runningTask.value.buttonsSetting[btnType].displayName
  }
  return displayName
}

const loadTodoTask = (task: any) => {
  approveForm.value = {}
  runningTask.value = task
  approveFormFApi.value = {}
  reasonRequire.value = task?.reasonRequire ?? false
  nodeTypeName.value = task?.nodeType === NodeType.TRANSACTOR_NODE ? '办理' : '审批'
  // 处理 approve 表单.
  if (task && task.formId && task.formConf) {
    const tempApproveForm = {}
    setConfAndFields2(tempApproveForm, task.formConf, task.formFields, task.formVariables)
    approveForm.value = tempApproveForm
  } else {
    approveForm.value = {} // 占位，避免为空
  }
}

/** 校验流程表单 */
const validateNormalForm = async () => {
  if (props.processDefinition?.formType === BpmModelFormType.NORMAL) {
    const formInstance = props.normalFormApi

    try {
      const rules = (formInstance as any).rule || []
      // 只保留必填且非隐藏字段的校验规则
      const validFields = rules
        .filter((rule: { field: string; $required: boolean; hidden: boolean }) => {
          //并且字段是否是在 writableFields 中
          return rule.$required && !rule.hidden && props.writableFields.includes(rule.field)
        })
        .map((rule: { field: string }) => rule.field)
      if (validFields.length > 0) {
        // 只校验必填字段
      //  console.log('validFields', validFields)
        // 对每个字段单独进行校验
        for (const field of validFields) {
          await formInstance.validateField(field)
        }
      }
    //  console.log('校验通过')
      debugger
      return true
    } catch {
      return false
    }
  } else {
    return true
  }
}

/** 从可以编辑的流程表单字段，获取需要修改的流程实例的变量 */
const getUpdatedProcessInstanceVariables = () => {
  const variables = {}
  props.writableFields.forEach((field) => {
    variables[field] = props.normalFormApi.getValue(field)
  })
  return variables
}

/** 处理签名完成 */
const handleSignFinish = (url: string) => {
  approveReasonForm.signPicUrl = url
  approveSignFormRef.value.validate('change')
}

/** 判断是否是管理员 */
const checkAdminStatus = async () => {
  try {
    // 调试信息：初始状态
/*
    console.log(
      'checkAdminStatus 开始: adminStatus =',
      adminStatus.value,
      'props.isAdmin =',
      props.isAdmin
    )
*/

    // 直接使用父组件传递的值，如果为undefined则设为false
    adminStatus.value = props.isAdmin || false

    // console.log('设置 adminStatus 为:', adminStatus.value)
  } catch (error) {
    console.error('获取管理员状态出错:', error)
    adminStatus.value = false
  }

  // 最终状态输出
  // console.log('checkAdminStatus 结束: adminStatus =', adminStatus.value)
}

// ========== 监听器集中管理区域 ==========

/** 监听 approveFormFApis，实现它对应的 form-create 初始化后，隐藏掉对应的表单提交按钮 */
watch(
  () => approveFormFApi.value,
  (val) => {
    val?.btn?.show(false)
    val?.resetBtn?.show(false)
  },
  {
    deep: true
  }
)

/** 监听流程实例属性变化，确保状态更新后重新检查管理员按钮显示条件 */
watch(
  () => props.processInstance,
  (newVal, oldVal) => {
/*    console.log('流程实例数据变化:', {
      old: oldVal?.status,
      new: newVal?.status
    })*/

    if (newVal) {
      // 流程状态变化时，刷新节点列表
      if (
        adminStatus.value &&
        !router.currentRoute.value.query.taskId &&
        oldVal?.status !== newVal?.status
      ) {
        // console.log('流程状态变化，重新获取节点列表')
        fetchCurrentNodes()
      }

/*      console.log('管理员按钮显示条件更新:', {
        adminStatus: adminStatus.value,
        noTaskId: !router.currentRoute.value.query.taskId,
        processInstanceStatus: newVal?.status,
        isEndProcess: isEndProcessStatus(newVal?.status),
        shouldShowAdminButtons: shouldShowAdminButtons.value
      })*/
    }
  },
  { deep: true, immediate: true }
)

/** 监听管理员状态相关变化（整合 props.isAdmin 和 adminStatus 的监听） */
watch(
  () => props.isAdmin,
  (newVal, oldVal) => {
 //   console.log('props.isAdmin变化:', oldVal, '->', newVal)
    
    // 只有当值不同时才更新，避免无限循环
    if (newVal !== adminStatus.value) {
   //   console.log('更新adminStatus值:', adminStatus.value, '->', newVal)
      adminStatus.value = newVal || false
      
      // 如果成为管理员且没有taskId，获取节点列表
      if (newVal && !router.currentRoute.value.query.taskId) {
       // console.log('成为管理员，获取节点列表')
        fetchCurrentNodes()
      }
    }
  },
  { immediate: true }
)

// ========== 监听器集中管理区域结束 ==========

/** 获取当前流程节点 */
const fetchCurrentNodes = async () => {
  try {
    const processInstanceId = router.currentRoute.value.query.id as string
    if (!processInstanceId) {
      console.error('获取当前流程节点失败：缺少processInstanceId')
      return
    }

  //  console.log('获取当前流程节点列表, processInstanceId:', processInstanceId)
    currentNodes.value = await ModelApi.currentNodeList(processInstanceId)
   // console.log('获取到节点列表:', currentNodes.value?.length || 0, '个节点')

    // 如果没有获取到节点，尝试再获取一次
    if (!currentNodes.value || currentNodes.value.length === 0) {
    //  console.log('未获取到节点，将在500ms后重试')
      setTimeout(async () => {
   //     console.log('重新获取节点列表')
        currentNodes.value = await ModelApi.currentNodeList(processInstanceId)
    //    console.log('重试后获取到节点列表:', currentNodes.value?.length || 0, '个节点')
      }, 500)
    }
  } catch (error) {
    console.error('获取当前流程节点出错:', error)
    currentNodes.value = []
  }
}



/** 当选择当前节点时联动更新退回节点 */
const handleCurrentNodeChange = async () => {
  if (!adminReturnForm.currentTaskId) {
    returnList.value = []
    adminReturnForm.targetTaskDefinitionKey = undefined
    return
  }

  try {
    // 根据选择的当前节点ID获取可退回的节点
    returnList.value = await TaskApi.getTaskListByReturn(adminReturnForm.currentTaskId)
    if (returnList.value.length === 0) {
      message.warning('当前选择的节点没有可退回的节点')
      adminReturnForm.targetTaskDefinitionKey = undefined
    }
  } catch (error) {
    console.error('获取退回节点列表出错:', error)
    returnList.value = []
    adminReturnForm.targetTaskDefinitionKey = undefined
  }
}

/** 处理管理员退回 */
const handleAdminReturn = async () => {
  formLoading.value = true
  try {
    // 1.1 校验表单
    if (!adminReturnFormRef.value) return
    await adminReturnFormRef.value.validate()
    const processInstanceId = router.currentRoute.value.query.id as string
    // 使用选中的当前节点ID作为要退回的任务ID
    const data = {
      id: adminReturnForm.currentTaskId,
      reason: adminReturnForm.reason,
      processInstanceId: processInstanceId,
      targetTaskDefinitionKey: adminReturnForm.targetTaskDefinitionKey
    }

    await TaskApi.returnTask(data)
    popOverVisible.value.adminReturn = false
    adminReturnFormRef.value.resetFields()
    message.success('管理员退回成功')
    // 重新加载数据
    reload()
  } finally {
    formLoading.value = false
  }
}

/** 处理管理员审批通过 */
const handleAdminApprove = async () => {
  formLoading.value = true
  try {
    // 1.1 校验表单
    if (!adminApproveFormRef.value) return
    await adminApproveFormRef.value.validate()

    // 获取修改的流程变量
    const variables = getUpdatedProcessInstanceVariables()
    const processInstanceId = router.currentRoute.value.query.id as string

    // 管理员审批通过数据
    const data = {
      id: adminApproveForm.currentTaskId,
      reason: adminApproveForm.reason,
      processInstanceId: processInstanceId,
      variables: variables // 包含表单变量
    }

    await TaskApi.wardenApproveTask(data)
    popOverVisible.value.adminApprove = false
    adminApproveFormRef.value.resetFields()
    message.success('管理员审批通过成功')
    // 重新加载数据
    reload()
  } finally {
    formLoading.value = false
  }
}

// 监听文件上传状态变化事件
onMounted(async () => {
  await checkAdminStatus();
  // console.log('审批组件挂载，开始监听文件上传状态事件')
  emitter.on(UPLOAD_STATUS_EVENT, (uploading: boolean) => {
/*    console.log(
      '审批页面接收到文件上传状态变化:',
      uploading,
      '当前时间:',
      new Date().toLocaleTimeString()
    )*/
    if (fileUploading.value !== uploading) {
     // console.log('文件上传状态实际发生变化:', fileUploading.value, '->', uploading)
      fileUploading.value = uploading

      // 强制UI更新
      nextTick(() => {
       // console.log('UI已更新，按钮禁用状态:', isApproveButtonDisabled.value ? '已禁用' : '未禁用')
      })
    }
  })

  // 添加调试日志
/*  console.log('组件初始化完成:', {
    isAdmin: props.isAdmin,
    adminStatus: adminStatus.value,
    processInstanceId: router.currentRoute.value.query.id,
    taskId: router.currentRoute.value.query.taskId,
    processInstanceStatus: props.processInstance?.status,
    currentNodesLength: currentNodes.value?.length,
    shouldShowAdminButtons: shouldShowAdminButtons.value
  })*/
})

// 组件卸载时清除事件监听
onUnmounted(() => {
  emitter.off(UPLOAD_STATUS_EVENT)
})

// 用户选择的审批人，格式与流程发起时的startUserSelectAssignees保持一致
const startUserSelectAssignees = ref<Record<string, number[]>>({})

/** 处理用户选择审批人 */
const selectUserConfirm = (activityId: string, userList: any[]) => {
 // console.log('选择审批人:', activityId, userList)
  // 将用户ID数组保存到startUserSelectAssignees
  startUserSelectAssignees.value[activityId] = userList?.map((item: any) => item.id)
}

// 评论弹窗的引用
const commentDialogRef = ref()

/** 打开评论弹窗 */
const openComment = () => {
  const processInstanceId = props.processInstance?.id
  if (!processInstanceId) {
    message.error('流程实例ID不存在')
    return
  }

  // 获取流程名称
  const processName = props.processInstance?.name

  // 打开评论弹窗，传递流程实例ID和流程名称
  commentDialogRef.value?.open(processInstanceId, processName)
}

// 催办相关状态和函数
const urgeDialogVisible = ref(false)
const urgeLoading = ref(false)
const urgeForm = reactive({
  urgeMessage: ''
})
const currentApprovers = ref<any[]>([])

/** 打开催办弹窗 */
const openUrge = async () => {
  const processInstanceId = props.processInstance?.id
  if (!processInstanceId) {
    message.error('流程实例ID不存在')
    return
  }

  urgeDialogVisible.value = true
  urgeLoading.value = true

  try {
    // 获取当前审批人列表
    currentApprovers.value = await fetchCurrentApprovers(processInstanceId)

    // 设置默认催办消息
    urgeForm.urgeMessage = `请尽快处理"${props.processInstance?.name}"流程，谢谢！`
  } catch (error) {
    console.error('获取审批人失败:', error)
    message.error('获取审批人信息失败')
  } finally {
    urgeLoading.value = false
  }
}

/** 获取当前审批人 */
const fetchCurrentApprovers = async (processInstanceId: string) => {
  try {
    // 如果已经有当前节点信息，从中提取审批人
    if (currentNodes.value && currentNodes.value.length > 0) {
      const approvers: any[] = []
      currentNodes.value.forEach((node) => {
        if (node.assigneeUser) {
          approvers.push(node.assigneeUser)
        }
      })

      if (approvers.length > 0) {
        return approvers
      }
    }

    // 否则重新获取当前节点信息
    const nodes = await ModelApi.currentNodeList(processInstanceId)
    const approvers: any[] = []

    nodes.forEach((node) => {
      if (node.assigneeUser) {
        approvers.push(node.assigneeUser)
      }
    })

    return approvers
  } catch (error) {
    console.error('获取当前审批人失败:', error)
    return []
  }
}

/** 处理催办 */
const handleUrge = async () => {
  if (!props.processInstance?.id) {
    message.error('流程实例ID不存在')
    return
  }

  if (currentApprovers.value.length === 0) {
    message.warning('当前没有审批人可以催办')
    return
  }

  urgeLoading.value = true

  try {
    // 当前URL
    const currentUrl = window.location.href

    // 构建催办请求参数
    const urgeRequests = currentApprovers.value.map((approver) => ({
      userId: approver.id,
      processName: props.processInstance?.name,
      url: currentUrl,
      message: urgeForm.urgeMessage
    }))

    // 发送催办请求
    await TaskApi.urgeTask({
      processInstanceId: props.processInstance.id,
      urgeList: urgeRequests
      // 发送的消息已包含在urgeList中的每个请求的message字段中
      // message字段内容: urgeForm.urgeMessage (用户在弹窗中输入的催办内容)
    })

    message.success('催办发送成功')
    urgeDialogVisible.value = false
    urgeForm.urgeMessage = ''
  } catch (error) {
    console.error('催办失败:', error)
    message.error('催办发送失败')
  } finally {
    urgeLoading.value = false
  }
}

/** 处理移除审批人 */
const handleRemoveApprover = (user) => {
  // 确保至少保留一个审批人
  if (currentApprovers.value.length <= 1) {
    message.warning('至少需要保留一个审批人')
    return
  }

  // 从当前审批人列表中移除该用户
  const index = currentApprovers.value.findIndex((item) => item.id === user.id)
  if (index !== -1) {
    currentApprovers.value.splice(index, 1)
  }
}

defineExpose({ loadTodoTask, selectUserConfirm })

/** 处理暂存任务表单 */
const handleSaveTaskForm = async () => {
  // 检查文件是否正在上传中
  if (fileUploading.value) {
    message.warning('请等待文件上传完成后再暂存')
    return
  }

  // 检查是否有可编辑字段
  if (!props.writableFields || props.writableFields.length === 0) {
    message.warning('当前表单没有可编辑字段，无需暂存')
    return
  }

  formLoading.value = true
  try {
    // 获取任务ID
    const taskId = getTaskId()
    if (!taskId) {
      message.error('未找到任务ID')
      return
    }

    // 获取修改的流程变量
    const variables = getUpdatedProcessInstanceVariables()
    
    // 如果没有变量需要保存，提示用户
    if (Object.keys(variables).length === 0) {
      message.info('表单未修改，无需暂存')
      formLoading.value = false
      return
    }

    // 构建暂存请求数据
    const data: TaskApi.BpmTaskSaveReqVO = {
      id: taskId,
      variables: variables
    }

    //console.log('暂存表单数据:', data)

    // 调用暂存API
    await TaskApi.saveTaskForm(data)
    message.success('表单暂存成功')
    // 关闭暂存对话框
    popOverVisible.value.save = false
  } catch (error) {
    //console.error('暂存表单失败:', error)
    message.error('表单暂存失败: ' + (error.message || '未知错误'))
  } finally {
    formLoading.value = false
  }
}
</script>

<style lang="scss" scoped>
:deep(.el-affix--fixed) {
  background-color: var(--el-bg-color);
}

/* 操作面板样式 */
.operations-panel {
  display: flex;
  flex-direction: row; /* 所有设备上都使用横向布局 */
  flex-wrap: wrap; /* 允许内容换行 */
  width: 100%;
  position: relative;
  padding: 10px 5px;
  gap: 12px; /* 组件间距 */
  min-height: auto !important; /* 移除固定高度限制 */
  height: auto !important; /* 允许高度自适应 */
  align-items: center;
}

/* 主要操作按钮行样式 */
.primary-actions-row {
  display: flex;
  flex-direction: row; /* 所有设备上都使用横向布局 */
  flex-wrap: wrap; /* 允许内容换行 */
  gap: 10px;
  align-items: center;
  margin-right: 10px;
}

/* 修复 el-button 样式以确保在移动端正确显示 */
:deep(.el-button) {
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  margin: 0;
  width: auto; /* 自适应宽度 */
  min-width: 80px; /* 确保按钮有最小宽度 */
  cursor: pointer; /* 添加小手样式 */
}

/* 为所有弹出框中的取消按钮添加左边距 */
:deep(.el-button + .el-button) {
  margin-left: 12px;
}

/* 主要操作按钮样式 */
.primary-action-btn {
  padding: 10px 16px !important;
  font-weight: 600;
  border-radius: 6px !important;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  text-align: center;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }

  &:active {
    transform: translateY(0);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }

  .action-icon {
    vertical-align: middle;
    margin-right: 2px;
    display: inline-block !important;
  }

  /* 添加禁用样式 */
  &.is-disabled,
  &[disabled] {
    opacity: 0.6;
    cursor: not-allowed;
    pointer-events: none;
  }
}

/* 文件上传状态指示器 */
.upload-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 13px;
  background-color: rgba(245, 108, 108, 0.1);
  box-shadow: 0 1px 3px rgba(245, 108, 108, 0.2);
  border: 1px solid rgba(245, 108, 108, 0.2);
  margin-right: 10px;
  white-space: nowrap;
}

/* 次要操作按钮组 */
.secondary-actions-group {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

/* 次要操作按钮 */
.secondary-action-btn {
  display: flex !important;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 20px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  background-color: transparent;
  transition: all 0.2s ease;
  white-space: nowrap;
  padding: 6px 12px;
  margin: 0 2px;

  .action-icon {
    margin-right: 4px;
    color: var(--el-color-primary);
    transition: transform 0.2s ease;
    font-size: 16px;
    display: inline-block !important;
  }

  &:hover {
    color: var(--el-color-primary);
    background-color: var(--el-color-primary-light-9);
    transform: translateY(-1px);

    .action-icon {
      transform: scale(1.15);
    }
  }

  &:active {
    transform: translateY(0);
  }

  /* 特殊操作样式 */
  &.action-return {
    color: #e6a23c;

    &:hover {
      background-color: rgba(230, 162, 60, 0.1);
    }
  }

  &.action-cancel {
    .action-icon {
      color: #f56c6c;
    }

    &:hover {
      color: #f56c6c;
      background-color: rgba(245, 108, 108, 0.1);
    }
  }

  &.action-resubmit {
    .action-icon {
      color: #67c23a;
    }

    &:hover {
      color: #67c23a;
      background-color: rgba(103, 194, 58, 0.1);
    }
  }

  &.action-admin-approve {
    .action-icon {
      color: #409eff;
    }

    &:hover {
      color: #409eff;
      background-color: rgba(64, 158, 255, 0.1);
    }
  }

  /* 评论按钮样式 */
  &.action-comment {
    .action-icon {
      color: #409eff;
    }

    &:hover {
      color: #409eff;
      background-color: rgba(64, 158, 255, 0.1);
    }
  }
}

/* 管理员按钮容器 */
.admin-buttons-container {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-right: 5px;
}

/* 管理员按钮样式 */
.admin-button {
  font-weight: 600;
  background-color: rgba(64, 158, 255, 0.1);
  border: 1px dashed var(--el-color-primary);

  &.action-admin-approve {
    color: var(--el-color-primary);
  }

  &.action-return {
    color: #e6a23c;
    border-color: #e6a23c;
    background-color: rgba(230, 162, 60, 0.1);
  }
}

/* 催办按钮样式 */
.action-urge {
  .action-icon {
    color: #ff9800;
  }

  &:hover {
    color: #ff9800;
    background-color: rgba(255, 152, 0, 0.1);
  }
}



/* 暗黑模式适配 */
.dark {
  .operations-panel {
    color: #fff;
  }

  .secondary-action-btn {
    &:hover {
      background-color: rgba(64, 158, 255, 0.15);
    }
  }

  .upload-indicator {
    background-color: rgba(245, 108, 108, 0.15);
  }
}

/* 禁用按钮通用样式 */
.btn-disabled,
.opacity-50.cursor-not-allowed {
  opacity: 0.5 !important;
  cursor: not-allowed !important;
  pointer-events: none !important;
}

/* 确保上传中状态显示良好 */
.position-relative {
  position: relative;
}

/* 移动端适配优化 */
@media (max-width: 576px) {
  .operations-panel {
    padding: 8px 4px;
    gap: 8px;
  }

  .primary-actions-row {
    margin-right: 5px;
  }

  .secondary-action-btn {
    padding: 5px 8px;
    font-size: 12px;

    .action-icon {
      font-size: 14px;
    }
  }

  .upload-indicator {
    padding: 5px 8px;
    font-size: 12px;
  }
}
</style>
