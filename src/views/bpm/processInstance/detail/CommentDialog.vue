<template>
  <Dialog
    v-model="dialogVisible"
    title="流程评论"
    width="800px"
    top="50px"
    :destroy-on-close="false"
    :append-to-body="true"
    :modal-append-to-body="true"
    :z-index="2000"
    :close-on-click-modal="false"
    class="comment-dialog"
  >
    <div class="comment-dialog-content">
      <!-- 评论列表部分 -->

<!--      <div-->
<!--        class="comment-list"-->
<!--        v-loading="listLoading"-->
<!--        element-loading-text="评论加载中..."-->
<!--        element-loading-background="rgba(255, 255, 255, 0.8)"-->
<!--        element-loading-svg-view-box="-10, -10, 50, 50"-->
<!--        :element-loading-svg="loadingSvg">-->
<!--        <div v-if="!listLoading && commentList.length === 0" class="comment-empty">-->
<!--          <el-empty description="暂无评论" />-->
<!--        </div>-->
<!--        <div v-else-if="!listLoading" class="comment-list-content">-->
<!--          <div v-for="(item, index) in commentList" :key="index" class="comment-item">-->
<!--            <div class="comment-header">-->
<!--              <div class="comment-user">-->
<!--                <el-avatar :size="40" :src="item.userAvatar">-->
<!--                  {{ item.userNickname.substring(0, 1) }}-->
<!--                </el-avatar>-->
<!--                <div class="comment-user-info">-->
<!--                  <div class="comment-user-name">{{ item.userNickname }}</div>-->
<!--                  <div class="comment-time">{{ formatDateTime(item.createTime) }}</div>-->
<!--                </div>-->
<!--              </div>-->
<!--            </div>-->
<!--            <div class="comment-content">-->
              <!-- 调试输出 -->
<!--              <div v-if="false" class="debug-info">-->
<!--                内容类型: {{ isHtmlContent(item.content) ? 'HTML' : 'Markdown' }}-->
<!--                <br />-->
<!--                原始内容: {{ item.content }}-->
<!--              </div>-->

              <!-- 根据内容类型选择不同的渲染方式 -->
<!--              <template v-if="isHtmlContent(item.content)">-->
                <!-- HTML内容直接使用v-html渲染 -->
<!--                <div v-html="item.content"></div>-->
<!--              </template>-->
<!--              <template v-else>-->
                <!-- Markdown内容使用MarkdownView组件 -->
<!--                <MarkdownView :content="item.content" />-->
<!--              </template>-->

              <!-- 如果有图片，展示图片列表 -->
<!--              <div v-if="item.picUrls && item.picUrls.length > 0" class="comment-images">-->
<!--                <div class="images-container">-->
<!--                  <div v-for="(img, imgIndex) in item.picUrls" :key="imgIndex" class="image-card">-->
<!--                    <el-image-->
<!--                      :src="img"-->
<!--                      :preview-src-list="item.picUrls"-->
<!--                      :initial-index="imgIndex"-->
<!--                      fit="cover"-->
<!--                      class="comment-image"-->
<!--                    />-->
<!--                  </div>-->
<!--                </div>-->
<!--              </div>-->
<!--            </div>-->
<!--          </div>-->
<!--        </div>-->
<!--      </div>-->

      <!-- 评论编辑部分 - 简化结构 -->
      <div class="comment-editor-section" :class="{'fullscreen-mode': isFullscreen}">
        <div class="editor-divider">
          <el-divider content-position="left">
            添加评论
            <!-- 添加全屏按钮 -->
            <el-button
              type="text"
              class="fullscreen-btn"
              @click="toggleFullscreen"
              :icon="isFullscreen ? 'ep:close' : 'ep:full-screen'"
              title="切换全屏模式 (Esc退出)"
            />
          </el-divider>
        </div>

        <!-- 测试按钮 -->
        <div class="test-buttons" style="margin-bottom: 8px;">
          <el-button 
            size="small" 
            type="primary" 
            @click="handleShowMention"
            title="@用户"
          >
            @  用户
          </el-button>
        </div>

        <!-- 全屏模式下的提示信息 -->
        <div v-if="isFullscreen" class="fullscreen-tips">
          <el-alert
            type="info"
            :closable="false"
            show-icon
          >
            <template #title>
              <span>全屏编辑模式 (按 Esc 退出全屏，Ctrl+Enter 提交评论)</span>
            </template>
          </el-alert>
        </div>

        <!-- 附件预览区改为抽屉式设计 -->
        <div
          v-if="commentForm.picUrls && commentForm.picUrls.length > 0"
          class="attachment-drawer"
          :class="{'drawer-open': attachmentDrawerOpen, 'fullscreen-drawer': isFullscreen}"
        >
          <!-- 抽屉标题栏 -->
          <div class="drawer-header" @click="toggleAttachmentDrawer">
            <div class="drawer-title">
              <Icon icon="ep:picture" class="drawer-icon" />
              <span>已上传附件 ({{ commentForm.picUrls.length }}张)</span>
            </div>
            <el-button
              type="text"
              class="drawer-toggle"
              :icon="attachmentDrawerOpen ? 'ep:arrow-up' : 'ep:arrow-down'"
            />
          </div>

          <!-- 抽屉内容区，只在打开状态显示 -->
          <div v-show="attachmentDrawerOpen" class="drawer-content">
            <div class="preview-images">
              <div v-for="(img, imgIndex) in commentForm.picUrls" :key="imgIndex" class="image-wrapper">
                <div class="image-card">
                  <el-image
                    :src="img"
                    :preview-src-list="commentForm.picUrls"
                    :initial-index="imgIndex"
                    fit="cover"
                    class="preview-image"
                  />
                  <div class="image-delete" @click="removeImage(imgIndex)">
                    <Icon icon="ep:delete" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 简化的编辑器容器 -->
        <div class="editor-container" v-loading="submitLoading" @click.stop="handleEditorClick">
          <!-- 附件指示器 -->
          <div
            v-if="commentForm.picUrls && commentForm.picUrls.length > 0 && !attachmentDrawerOpen"
            class="attachment-indicator"
            @click.stop="toggleAttachmentDrawer"
          >
            <Icon icon="ep:picture" class="attachment-icon" />
            <span>{{ commentForm.picUrls.length }}张附件</span>
          </div>
          <Editor
            v-model="commentForm.content"
            :editor-config="editorConfig"
            :height="editorHeight"
            @change="handleEditorChange"
            @on-change="handleEditorChange"
            @on-created="handleEditorCreate"
            @on-destroyed="handleEditorDestroyed"
            @click.stop
            ref="editorComponentRef"
          />
        </div>

        <!-- 添加@用户列表显示 -->
        <div v-if="commentForm.atUsers && commentForm.atUsers.length > 0" class="at-users-container">
          <div class="at-users-header">
            <Icon icon="ep:user" class="at-icon" />
            <span>已@用户</span>
          </div>
          <div class="at-users-list">
            <el-tag
              v-for="(user, index) in commentForm.atUsers"
              :key="index"
              closable
              @close="removeAtUser(index)"
              type="info"
              effect="light"
              size="small"
              class="at-user-tag"
            >
              <span class="at-user-name">@{{ user.nickname }}</span>
            </el-tag>
          </div>
        </div>
      </div>
    </div>

    <!-- 将按钮移至对话框footer插槽 -->
    <template #footer>
      <div class="dialog-footer">
        <!-- 附件和@用户数量显示 -->
        <div class="footer-info">
          <div v-if="commentForm.picUrls && commentForm.picUrls.length > 0" class="attachment-count">
            <Icon icon="ep:picture" class="attachment-icon" />
            <span>{{ commentForm.picUrls.length }}张附件</span>
          </div>

          <div v-if="commentForm.atUsers && commentForm.atUsers.length > 0" class="at-users-count">
            <Icon icon="ep:user" class="at-icon" />
            <span>已@{{ commentForm.atUsers.length }}人</span>
          </div>
        </div>

        <el-button
          type="primary"
          size="large"
          @click="submitComment"
          :loading="submitLoading"
          :disabled="isContentEmpty"
        >
          <Icon icon="ep:position" class="mr-1" /> 提交评论
        </el-button>
      </div>
    </template>
  </Dialog>

  <!-- 添加用户提及弹窗组件 -->
  <Teleport to="body">
    <UserMentionModal
      v-if="showMentionModal"
      :position="mentionModalPosition"
      @select="handleUserSelect"
      @close="showMentionModal = false"
    />
  </Teleport>
</template>

<script lang="ts" setup>
import MarkdownView from '@/components/MarkdownView/index.vue'
import { IEditorConfig } from '@wangeditor/editor'
import { getRefreshToken, getTenantId } from '@/utils/auth'
import { getUploadUrl } from '@/components/UploadFile/src/useUpload'
import * as CommentApi from '@/api/bpm/comment'
import { emitter, UPLOAD_STATUS_EVENT } from '@/utils/eventBus'
import UserMentionModal from './UserMentionModal.vue'
import { Boot } from '@wangeditor/editor'
import { Editor } from '@/components/Editor'
// 使用修复版的mentionModule替代原始插件
import mentionModule from '@/components/Editor/src/mentionModule'
import { useAtUser } from '@/components/Editor/src/useAtUser'

// 注册插件
console.log('注册修复版mentionModule插件');
Boot.registerModule(mentionModule)


defineOptions({ name: 'CommentDialog' })

// 定义组件可触发的事件
const emit = defineEmits(['success'])

// 弹窗状态
const dialogVisible = ref(false)
const listLoading = ref(false)
const submitLoading = ref(false)
const processInstanceId = ref<string>('')
const processName = ref<string>('') // 新增流程名称变量
const commentList = ref<CommentApi.CommentVO[]>([])
const isUploading = ref(false)

// 附件抽屉控制
const attachmentDrawerOpen = ref(false)
const isFullscreen = ref(false)

// @用户弹窗控制
const showMentionModal = ref(false)
const mentionModalPosition = ref({ top: '0px', left: '0px' })
const editorComponentRef = ref(null) // 编辑器组件引用
const currentMentionRange = ref(null) // 保存当前@操作的光标位置
const isSelectingUser = ref(false) // 是否正在选择用户状态
const isAtting = ref(false) // 新增isAtting状态

// 评论表单
const commentForm = reactive({
  content: '',
  picUrls: [] as string[],
  atUsers: [] as Array<{id: number, nickname: string, avatar?: string}>
})

// 在文件顶部已有的变量声明中添加
const editorReady = ref(false);

/** 检查HTML内容是否实质为空 */
const isEmptyHtml = (html: string) => {
  if (!html) return true

  // 检查常见的空HTML模式
  const emptyHtmlPatterns = [
    /^<p><br\s*\/?><\/p>$/,     // <p><br></p>
    /^<p>\s*<\/p>$/,            // <p></p> 或 <p> </p>
    /^<div><br\s*\/?><\/div>$/, // <div><br></div>
    /^<div>\s*<\/div>$/         // <div></div> 或 <div> </div>
  ]

  // 移除所有HTML标签后检查是否为空
  const textContent = html.replace(/<[^>]+>/g, '').trim()
  const isEmpty = textContent === ''

  // 检查是否匹配任何空HTML模式
  const isEmptyPattern = emptyHtmlPatterns.some(pattern => pattern.test(html))

  console.log(`检查HTML内容是否为空: [${html.substring(0, 30)}...], 文本内容为空: ${isEmpty}, 匹配空模式: ${isEmptyPattern}`)

  return isEmpty || isEmptyPattern
}

// 判断内容是否为空的计算属性
const isContentEmpty = computed(() => {
  const content = commentForm.content
  if (!content) return true
  if (!content.trim()) return true
  return isEmptyHtml(content)
})

// 编辑器高度 - 根据附件动态调整
const editorHeight = computed(() => {
  // 基础高度 - 根据是否为移动设备
  const baseHeight = window.innerWidth <= 768 ? 120 : 180;

  // 全屏模式下使用更大的高度
  if (isFullscreen.value) {
    return window.innerHeight * 0.6;
  }

  // 正常模式下，如果附件抽屉打开，则减小编辑器高度
  return (attachmentDrawerOpen.value && commentForm.picUrls.length > 0)
    ? baseHeight - 40
    : baseHeight;
})

// 切换附件抽屉状态
const toggleAttachmentDrawer = () => {
  // 只有当有附件时才能打开抽屉
  if (commentForm.picUrls.length > 0 || attachmentDrawerOpen.value) {
    attachmentDrawerOpen.value = !attachmentDrawerOpen.value;
  }
}

// 切换全屏编辑模式
const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value;

  // 在进入全屏模式时，延迟聚焦到编辑器以改善用户体验
  if (isFullscreen.value) {
    nextTick(() => {
      const editorElement = document.querySelector('.w-e-text-container');
      if (editorElement) {
        (editorElement as HTMLElement).focus();
      }
    });
  }

  // 调整窗口大小事件会触发编辑器重新渲染
  window.dispatchEvent(new Event('resize'));
}

// 设置键盘快捷键
const setupKeyboardShortcuts = () => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Esc键退出全屏
    if (e.key === 'Escape' && isFullscreen.value) {
      toggleFullscreen();
    }

    // Ctrl+Enter 提交评论
    if (e.ctrlKey && e.key === 'Enter' && commentForm.content.trim()) {
      submitComment();
    }
  };

  window.addEventListener('keydown', handleKeyDown);

  // 组件卸载时移除事件监听
  onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleKeyDown);
  });
};

// 监听对话框打开状态，设置键盘快捷键
watch(() => dialogVisible.value, (val) => {
  if (val) {
    setupKeyboardShortcuts();
    console.log('对话框打开，初始化编辑器');
  }

  if (!val) {
    // 确保离开时所有上传操作都结束
    if (isUploading.value) {
      isUploading.value = false;
      emitter.emit(UPLOAD_STATUS_EVENT, false);
    }
    // 退出全屏模式
    if (isFullscreen.value) {
      isFullscreen.value = false;
    }
    // 关闭附件抽屉
    attachmentDrawerOpen.value = false;
    console.log('对话框关闭，清理资源');
    // 对话框关闭时重置编辑器状态
    editorReady.value = false;
    console.log('对话框关闭，重置编辑器状态');
  }
});

// 监听评论表单内容变化
watch(() => commentForm.content, (newContent) => {
  console.log('评论内容变化:', newContent ? newContent.substring(0, 20) + '...' : '空');
  console.log('评论内容是否为空:', !newContent || !newContent.trim());
  console.log('isContentEmpty计算结果:', isContentEmpty.value, '原因:', isEmptyHtml(newContent) ? '空HTML内容' : '');
}, { immediate: true });

/**
 * 显示@用户弹窗
 */
const handleShowMention = async () => {
  console.log('handleShowMention被调用');

  // 防止已有的弹窗关闭逻辑执行
  if (showMentionModal.value) {
    console.log('弹窗已经显示，不重复触发');
    return;
  }

  try {
    // 先获取真实编辑器实例
    const editor = await getEditor();
    if (!editor) {
      console.error('无法获取编辑器实例');
      return;
    }

    // 确保编辑器获得焦点
    if (typeof editor.focus === 'function') {
      editor.focus();
      console.log('编辑器获得焦点');
    }

    // 重要：先插入@符号，然后再显示选择用户弹窗
    if (typeof editor.insertText === 'function') {
      editor.insertText('@');
      console.log('插入@符号成功');
    }

    // 保存当前选区位置，以便后续恢复
    if (typeof editor.saveSelection === 'function') {
      editor.saveSelection();
      console.log('保存当前光标位置');
    }

    // 标记为正在@用户状态
    isAtting.value = true;
    console.log('设置isAtting为true');

    // 计算并设置弹窗位置
    calculateMentionPosition();
    console.log('计算弹窗位置结果:', mentionModalPosition.value);

    // 直接设置showMentionModal为true，不使用setTimeout
    console.log('准备设置showMentionModal为true');
    showMentionModal.value = true;
    console.log('showMentionModal设置为:', showMentionModal.value);
    
    // 确保弹窗显示后，用户能够看到它并且输入框获得焦点
    nextTick(() => {
      console.log('弹窗DOM应该已更新');
      const mentionModal = document.querySelector('.mention-modal');
      console.log('检查弹窗是否在DOM中:', !!mentionModal);
      
      if (mentionModal) {
        // 尝试聚焦搜索框
        const searchInput = mentionModal.querySelector('input');
        if (searchInput) {
          console.log('找到搜索输入框，尝试聚焦');
          // 使用多次尝试聚焦的策略
          setTimeout(() => {
            searchInput.focus();
            console.log('第一次尝试聚焦');
            
            // 再次尝试聚焦，以确保成功
            setTimeout(() => {
              searchInput.focus();
              console.log('第二次尝试聚焦');
            }, 50);
          }, 10);
        }
      } else {
        // 如果弹窗没有显示，尝试强制更新
        console.log('弹窗未在DOM中，尝试强制更新');
        showMentionModal.value = false;
        nextTick(() => {
          showMentionModal.value = true;
          console.log('强制更新后showMentionModal值:', showMentionModal.value);
          
          // 强制更新后再次尝试聚焦
          setTimeout(() => {
            const updatedModal = document.querySelector('.mention-modal');
            const updatedInput = updatedModal?.querySelector('input');
            if (updatedInput) {
              updatedInput.focus();
              console.log('强制更新后尝试聚焦');
            }
          }, 50);
        });
      }
    });
  } catch (error) {
    console.error('显示@用户弹窗时发生错误:', error);
  }
}

/**
 * 隐藏@用户弹窗
 */
const handleHideMention = () => {
  console.log('handleHideMention被调用');
  // 只有在非选择用户状态下才关闭弹窗
  if (!isSelectingUser.value && !isAtting.value) {
    showMentionModal.value = false;
    console.log('关闭弹窗');
  } else {
    console.log('正在选择用户或@用户，不关闭弹窗');
  }
}

/**
 * 处理用户选择
 */
const handleUserSelect = async (user) => {
  console.log('handleUserSelect被调用，选中用户:', user);
  
  try {
    // 标记为正在选择用户状态，防止弹窗被意外关闭
    isSelectingUser.value = true;
    
    // 先关闭弹窗，避免干扰后续操作
    showMentionModal.value = false;
    console.log('关闭用户选择弹窗');

    // 等待DOM更新完成
    await nextTick();

    // 获取真实编辑器实例
    const editor = await getEditor();
    if (!editor) {
      console.error('无法获取真实编辑器实例');
      message.error('无法获取编辑器实例');
      return;
    }

    // 确保编辑器获得焦点
    if (typeof editor.focus === 'function') {
      editor.focus();
    }

    // 使用简化后的insertUserMention函数插入@用户
    const success = await insertUserMention(user.id, user.nickname, user.avatar);

    if (success) {
      console.log('@用户插入成功');
      message.success(`已添加@${user.nickname}`);
    } else {
      console.error('@用户插入失败');
      message.error('插入@用户失败');
    }
  } catch (error) {
    console.error('处理用户选择时发生错误:', error);
    message.error('处理用户选择失败');
  } finally {
    // 确保状态被重置
    setTimeout(() => {
      isSelectingUser.value = false;
      isAtting.value = false; // 清除@用户状态
      console.log('用户选择状态重置');
    }, 300);
  }
}

/**
 * 在编辑器中插入@用户
 */
const insertUserMention = async (id, nickname, avatar) => {
  try {
    console.log('开始插入@用户标记，用户ID:', id, '昵称:', nickname);

    // 获取真实编辑器实例
    const editor = await getEditor();
    if (!editor) {
      console.warn('无法获取真实编辑器实例，无法插入@用户');
      return false;
    }

    console.log('获取到编辑器实例:', editor);

    // 恢复之前保存的选区位置
    if (typeof editor.restoreSelection === 'function') {
      editor.restoreSelection();
      console.log('恢复选区成功');
    }

    // 优先使用HTML替换方式插入带样式的@用户标记
    if (typeof editor.getHtml === 'function' && typeof editor.setHtml === 'function') {
      // 获取当前HTML
      const currentHtml = editor.getHtml();
      console.log('当前HTML:', currentHtml);
      
      // 寻找最后一个@符号并替换
      let replacedHtml = currentHtml;
      
      // 尝试定位@符号
      try {
        // 先尝试使用选区位置精确定位@符号
        if (typeof editor.getSelectionDetail === 'function') {
          const selection = editor.getSelectionDetail();
          console.log('当前选区详情:', selection);
          
          if (selection) {
            // 获取当前文本内容
            let currentText = '';
            if (typeof editor.getText === 'function') {
              currentText = editor.getText();
              console.log('当前文本内容:', currentText);
            }
            
            // 获取光标位置
            let cursorIndex = 0;
            if (selection.anchor && selection.anchor.offset !== undefined) {
              cursorIndex = selection.anchor.offset;
            }
            
            // 估算@符号在HTML中的位置
            const textBeforeCursor = currentText.substring(0, cursorIndex);
            const htmlLength = currentHtml.length;
            const htmlText = currentHtml.replace(/<[^>]+>/g, '');
            const htmlTextLength = htmlText.length || 1;
            
            const htmlCursorPos = Math.min(
              Math.floor((textBeforeCursor.length / htmlTextLength) * htmlLength),
              htmlLength - 1
            );
            
            // 从光标位置向前查找@符号
            const searchRange = 20; // 搜索范围
            const startPos = Math.max(0, htmlCursorPos - searchRange);
            const searchText = currentHtml.substring(startPos, htmlCursorPos + 1);
            const atPos = searchText.lastIndexOf('@');
            
            if (atPos !== -1) {
              // 找到@符号，计算其在原HTML中的位置
              const actualAtPos = startPos + atPos;
              console.log('找到@符号位置:', actualAtPos);
              
              // 分割HTML并替换@符号
              const beforeAt = currentHtml.substring(0, actualAtPos);
              const afterAt = currentHtml.substring(actualAtPos + 1); // 跳过@符号
              
              // 创建带样式的@用户标记
              const mentionHtml = `<span class="user-mention" data-id="${id}" style="display: inline-block; background-color: rgba(64, 158, 255, 0.1); color: #409EFF; padding: 0 3px; margin: 0 1px; border-radius: 3px; font-weight: bold;">@${nickname}</span>&nbsp;`;
              
              // 替换HTML
              replacedHtml = beforeAt + mentionHtml + afterAt;
              console.log('替换后HTML:', replacedHtml.substring(0, 100) + '...');
            } else {
              // 未找到@符号，使用简单方法
              console.warn('未在光标附近找到@符号，尝试查找最后一个@');
              const lastAtPos = currentHtml.lastIndexOf('@');
              if (lastAtPos !== -1) {
                const beforeAt = currentHtml.substring(0, lastAtPos);
                const afterAt = currentHtml.substring(lastAtPos + 1);
                
                // 创建带样式的@用户标记
                const mentionHtml = `<span class="user-mention" data-id="${id}" style="display: inline-block; background-color: rgba(64, 158, 255, 0.1); color: #409EFF; padding: 0 3px; margin: 0 1px; border-radius: 3px; font-weight: bold;">@${nickname}</span>&nbsp;`;
                
                replacedHtml = beforeAt + mentionHtml + afterAt;
              }
            }
          }
        } else {
          // 编辑器不支持getSelectionDetail方法，使用简单查找
          console.warn('编辑器不支持getSelectionDetail方法，使用简单查找');
          const lastAtPos = currentHtml.lastIndexOf('@');
          if (lastAtPos !== -1) {
            const beforeAt = currentHtml.substring(0, lastAtPos);
            const afterAt = currentHtml.substring(lastAtPos + 1);
            
            // 创建带样式的@用户标记
            const mentionHtml = `<span class="user-mention" data-id="${id}" style="display: inline-block; background-color: rgba(64, 158, 255, 0.1); color: #409EFF; padding: 0 3px; margin: 0 1px; border-radius: 3px; font-weight: bold;">@${nickname}</span>&nbsp;`;
            
            replacedHtml = beforeAt + mentionHtml + afterAt;
          }
        }
      } catch (error) {
        console.error('定位@符号时出错:', error);
        // 出错时使用简单方法
        const lastAtPos = currentHtml.lastIndexOf('@');
        if (lastAtPos !== -1) {
          const beforeAt = currentHtml.substring(0, lastAtPos);
          const afterAt = currentHtml.substring(lastAtPos + 1);
          
          // 创建带样式的@用户标记
          const mentionHtml = `<span class="user-mention" data-id="${id}" style="display: inline-block; background-color: rgba(64, 158, 255, 0.1); color: #409EFF; padding: 0 3px; margin: 0 1px; border-radius: 3px; font-weight: bold;">@${nickname}</span>&nbsp;`;
          
          replacedHtml = beforeAt + mentionHtml + afterAt;
        }
      }
      
      // 如果成功替换了HTML，设置回编辑器
      if (replacedHtml !== currentHtml) {
        editor.setHtml(replacedHtml);
        console.log('使用HTML替换方式成功插入@用户');
        
        // 添加到@用户列表
        if (!commentForm.atUsers.some(u => u.id === id)) {
          commentForm.atUsers.push({
            id: id,
            nickname: nickname,
            avatar: avatar
          });
          console.log('用户已添加到@用户列表');
        }
        
        // 更新表单内容
        commentForm.content = replacedHtml;
        return true;
      }
    }

    // 备用方法1: 使用insertText方法
    if (typeof editor.insertText === 'function') {
      // 先删除已有的@符号
      if (typeof editor.deleteBackward === 'function') {
        editor.deleteBackward('character');
        console.log('删除已有的@符号');
      }
      
      // 插入@用户文本
      const mentionText = `@${nickname} `;
      editor.insertText(mentionText);
      console.log('插入@用户文本成功:', mentionText);

      // 添加到@用户列表
      if (!commentForm.atUsers.some(u => u.id === id)) {
        commentForm.atUsers.push({
          id: id,
          nickname: nickname,
          avatar: avatar
        });
        console.log('用户已添加到@用户列表');
      }

      // 更新表单内容
      if (typeof editor.getHtml === 'function') {
        commentForm.content = editor.getHtml();
      }

      return true;
    }

    // 备用方法2: 使用useAtUser中的insertMention方法
    console.log('尝试使用useAtUser.insertMention方法');
    const success = insertMention(editor, {
      id,
      nickname,
      avatar: avatar || ''
    });

    if (success) {
      // 添加到@用户列表
      if (!commentForm.atUsers.some(u => u.id === id)) {
        commentForm.atUsers.push({
          id: id,
          nickname: nickname,
          avatar: avatar
        });
      }

      // 确保表单数据同步
      if (typeof editor.getHtml === 'function') {
        commentForm.content = editor.getHtml();
      }
      return true;
    }

    return false;
  } catch (error) {
    console.error('插入@用户时发生错误:', error);
    message.error('插入@用户失败');
    return false;
  }
}

/** 关闭用户选择弹窗 */
const closeMentionModal = () => {
  showMentionModal.value = false;
  currentMentionRange.value = null;
}

// 编辑器配置
const editorConfig = computed((): IEditorConfig => {
  console.log('初始化编辑器配置，包含mention功能');
  return {
    placeholder: '请输入评论内容，支持Markdown格式...',
    // 注册mention配置
    EXTEND_CONF: {
      mentionConfig: {
        showModal: () => {
          console.log('EXTEND_CONF.mentionConfig.showModal被调用');
          // 防止已有的弹窗关闭逻辑执行
          if (showMentionModal.value) {
            console.log('弹窗已经显示，阻止重复触发');
            return;
          }

          // 标记为正在@用户状态
          isAtting.value = true;

          // 获取编辑器实例
          const editor = editorComponentRef.value;
          
          // 保存当前光标位置
          try {
            if (editor && typeof editor.saveSelection === 'function') {
              editor.saveSelection();
              console.log('成功保存光标位置');
            }
          } catch (e) {
            console.error('保存光标位置失败', e);
          }

          // 先计算位置，再显示弹窗
          calculateMentionPosition();

          // 使用短延迟显示弹窗，确保位置计算完成且不干扰焦点操作
          setTimeout(() => {
            showMentionModal.value = true;
            console.log('显示@用户弹窗，位置:', mentionModalPosition.value);
            
            // 设置一个标志，阻止编辑器获取焦点
            isSelectingUser.value = true;
            
            // 短暂延迟后重置标志，避免长时间阻止焦点
            setTimeout(() => {
              isSelectingUser.value = false;
            }, 500);
          }, 50);
        },
        hideModal: () => {
          console.log('EXTEND_CONF.mentionConfig.hideModal被调用');

          // 如果正在选择用户或正在@用户，则不关闭弹窗
          if (isSelectingUser.value || isAtting.value) {
            console.log('正在选择用户或@用户过程中，阻止弹窗关闭');
            return;
          }

          // 增加延迟，防止意外的快速关闭
          setTimeout(() => {
            showMentionModal.value = false;
            console.log('关闭弹窗');
          }, 300);
        },
      },
    },
    MENU_CONF: {
      ['uploadImage']: {
        server: getUploadUrl(),
        // 单个文件的最大体积限制，默认为 5M
        maxFileSize: 5 * 1024 * 1024,
        // 最多可上传几个文件，默认为 10
        maxNumberOfFiles: 10,
        // 选择文件时的类型限制
        allowedFileTypes: ['image/*'],

        // 自定义增加 http header
        headers: {
          Accept: '*',
          Authorization: 'Bearer ' + getRefreshToken(),
          'tenant-id': getTenantId()
        },

        // 超时时间，默认为 10 秒
        timeout: 10 * 1000,

        // form-data fieldName
        fieldName: 'file',

        // 上传之前触发
        onBeforeUpload(file: File) {
          // 发送上传开始事件
          isUploading.value = true
          emitter.emit(UPLOAD_STATUS_EVENT, true)
          return file
        },

        // 上传进度的回调函数
        onProgress(progress: number) {
          console.log('上传进度', progress)
        },

        // 上传成功
        onSuccess(file: File, res: any) {
          console.log('上传成功', file, res)
          // 将上传的图片URL添加到picUrls中
          if (res && res.data) {
            // 防止重复添加同一图片
            if (!commentForm.picUrls.includes(res.data)) {
              commentForm.picUrls.push(res.data)
              console.log('图片已添加到评论附件列表', commentForm.picUrls)

              // 上传成功后，显示消息提示用户
              message.success('图片上传成功')

              // 自动打开附件抽屉
              attachmentDrawerOpen.value = true;

              // 添加图片后，确保预览区域可见（使用nextTick确保DOM已更新）
              nextTick(() => {
                // 查找预览区域
                const previewArea = document.querySelector('.upload-preview')
                if (previewArea) {
                  // 滚动到可见位置
                  previewArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                }
              })
            }
          }

          // 发送上传结束事件
          isUploading.value = false
          emitter.emit(UPLOAD_STATUS_EVENT, false)
        },

        // 上传失败
        onFailed(file: File, res: any) {
          console.error('上传失败', file, res)
          // 发送上传结束事件
          isUploading.value = false
          emitter.emit(UPLOAD_STATUS_EVENT, false)
        },

        // 上传错误
        onError(file: File, err: any, res: any) {
          console.error('上传错误', file, err, res)
          // 发送上传结束事件
          isUploading.value = false
          emitter.emit(UPLOAD_STATUS_EVENT, false)
        },

        // 自定义插入图片 - 阻止图片插入到编辑器内容中
        customInsert(res: any, insertFn: any) {
          // 禁止图片插入到编辑器内容，仅作为附件处理
          // 不调用insertFn，图片就不会插入到编辑器内容中
          console.log('阻止图片插入到编辑器内容，仅显示在预览区域')
        }
      },
      // 配置mention按钮行为
      ['mention']: {
        // 使用@符号触发
        selector: '@',
        // 关闭默认下拉列表，使用自定义弹窗
        hideMenuOnBlur: false,
        // 允许无匹配结果的输入
        allowNoMatchingValue: true,
        // 空的options，因为我们使用自定义弹窗
        options: [],
        // 触发器，当输入@时被调用
        triggerHandler: (text, editor) => {
          console.log('触发@功能，text:', text, '编辑器实例:', editor);
          console.log('当前编辑器HTML:', editor.getHtml ? editor.getHtml() : '无法获取HTML');
          console.log('当前编辑器文本:', editor.getText ? editor.getText() : '无法获取文本');
          
          // 记录当前光标位置
          if (editor.getSelectionDetail) {
            const selection = editor.getSelectionDetail();
            console.log('当前选区详情:', selection);
          }
          
          // 保存编辑器实例
          editorComponentRef.value = editor;

          // 标记为正在@用户状态
          isAtting.value = true;

          // 保存选区前确保光标位置正确
          try {
            // 这里不删除@符号，而是保留它，等选择用户后再处理
            if (typeof editor.getSelectionDetail === 'function' && typeof editor.saveSelection === 'function') {
              // 先获取当前选区
              const currentSelection = editor.getSelectionDetail();
              console.log('当前选区:', currentSelection);

              // 恢复正确的选区保存，不使用focus(true)
              editor.saveSelection();
              console.log('triggerHandler保存选区位置成功');
            } else if (typeof editor.saveSelection === 'function') {
              editor.saveSelection();
              console.log('triggerHandler保存选区位置成功(无选区详情)');
            }
          } catch (e) {
            console.error('triggerHandler保存选区位置失败', e);
          }

          // 显示弹窗
          console.log('准备调用handleShowMention显示@用户弹窗');
          handleShowMention();
          console.log('handleShowMention调用完成');

          // 返回null防止默认行为
          return null;
        },
        // 选择后处理（不会被调用，我们使用自定义处理）
        onSelect: () => {
          console.log('默认onSelect被调用');
          return '';
        }
      }
    }
    // 移除这里的onDestroyed回调，改为使用@onDestroyed事件
  }
})

// 消息提示
const message = useMessage()

/** 打开弹窗 */
const open = async (id: string, name?: string) => {
  try {
    // 先设置ID和流程名称
    processInstanceId.value = id
    processName.value = name || '' // 设置流程名称，如果未提供则为空字符串
    
    // 打开对话框（使组件可见）
    dialogVisible.value = true
    
    // 使用Promise链确保顺序执行
    await new Promise<void>((resolve) => {
      // 等待DOM更新完成
      nextTick(() => {
        console.log('对话框DOM已更新');
        
        // 使用Promise.race实现超时控制
        const editorReadyPromise = new Promise<void>((readyResolve) => {
          // 如果编辑器已经准备好，直接解析
          if (editorComponentRef.value && editorReady.value) {
            console.log('编辑器已准备就绪');
            readyResolve();
            return;
          }
          
          // 否则，设置一个观察器来监听editorReady状态
          const unwatch = watch(() => editorReady.value, (ready) => {
            if (ready && editorComponentRef.value) {
              console.log('编辑器准备完成');
              unwatch(); // 停止监听
              readyResolve();
            }
          });
        });
        
        // 设置超时保障，最多等待1秒
        const timeoutPromise = new Promise<void>((_, reject) => {
          setTimeout(() => {
            console.warn('等待编辑器准备超时');
            resolve(); // 超时后仍然继续流程，不阻塞
          }, 1000);
        });
        
        // 等待编辑器准备好或超时
        Promise.race([editorReadyPromise, timeoutPromise]).then(() => {
          // 重置表单
          resetForm();
          console.log('表单已重置');
          resolve();
        });
      });
    });
    
    // 先解析重置表单的Promise再加载评论
    await loadComments();
    console.log('对话框打开完成');
  } catch (error) {
    console.error('打开对话框出错:', error);
  }
}

// 生成模拟评论数据
const getSimulatedComments = (instanceId: string) => {
  console.log('使用模拟数据')
  return [
    {
      id: 1,
      processInstanceId: instanceId,
      userId: 1,
      userNickname: '张三',
      userAvatar: 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png',
      content: '这个流程需要进一步审核，请相关部门注意以下几点：\n\n## 注意事项\n1. 检查合同条款是否完整\n2. 确认金额计算无误\n3. 确保所有附件已上传',
      picUrls: [],
      createTime: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1天前
    },
    {
      id: 2,
      processInstanceId: instanceId,
      userId: 2,
      userNickname: '李四',
      userAvatar: 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png',
      content: '已检查完毕，合同条款没有问题。\n\n```js\n// 金额计算代码\nconst total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);\n```\n\n请各位审批人注意查看附件中的计算明细。',
      picUrls: [
        'https://fuss10.elemecdn.com/e/5d/4a731a90594a4af544c0c25941171jpeg.jpeg'
      ],
      createTime: new Date(Date.now() - 12 * 60 * 60 * 1000) // 12小时前
    },
    {
      id: 3,
      processInstanceId: instanceId,
      userId: 3,
      userNickname: '王五',
      userAvatar: 'https://cube.elemecdn.com/9/c2/f0ee8a3c7c9638a54940382568c9cpng.png',
      content: '我这边已经审核通过了，请下一环节的同事尽快处理。',
      picUrls: [
        'https://fuss10.elemecdn.com/a/3f/3302e58f9a181d2509f3dc0fa68b0jpeg.jpeg',
        'https://fuss10.elemecdn.com/1/34/19aa98b1fcb2781c4fba33d850549jpeg.jpeg'
      ],
      createTime: new Date(Date.now() - 3 * 60 * 60 * 1000) // 3小时前
    }
  ]
}

/** 加载评论列表 */
const loadComments = async () => {
  if (!processInstanceId.value) return

  // 开始loading
  listLoading.value = true
  
  // 记录开始时间，确保loading至少显示500ms
  const startTime = Date.now()
  
  try {
    // 尝试从API获取评论数据
    try {
      console.log('正在加载评论，流程实例ID:', processInstanceId.value)
      const res = await CommentApi.getCommentList(processInstanceId.value)
      console.log('API原始返回数据:', res)

      // 处理API返回结果
      let hasComments = false

      // 直接处理API返回结果，跳过中间判断
      if (res && res.id && res.content) {
        // 如果直接返回了单个评论对象
        console.log('收到单个评论对象:', res)
        commentList.value = [res]
        hasComments = true
      } else if (res && res.code === 0) {
        // 标准封装结构
        if (Array.isArray(res.data) && res.data.length > 0) {
          commentList.value = res.data
          hasComments = true
        } else if (res.data && res.data.id) {
          // data是单个对象
          commentList.value = [res.data]
          hasComments = true
        } else {
          // 空数组或null
          console.log('API返回空数据')
          hasComments = false
        }
      } else if (Array.isArray(res) && res.length > 0) {
        // 直接返回数组
        commentList.value = res
        hasComments = true
      } else {
        // 防止意外情况，置为空数组
        console.log('API返回格式不符合预期或为空')
        hasComments = false
      }

      // 如果没有评论数据，使用模拟数据
      if (!hasComments) {
        console.log('没有评论数据，使用模拟数据')
        commentList.value = getSimulatedComments(processInstanceId.value)
      }

      console.log('处理后的评论列表:', commentList.value)
      console.log('评论条数:', commentList.value.length)

    } catch (error) {
      console.warn('API尚未实现或发生错误，使用模拟数据', error)

      // 使用模拟数据
      commentList.value = getSimulatedComments(processInstanceId.value)
    }
  } catch (error) {
    console.error('加载评论失败', error)
    message.error('加载评论失败')
  } finally {
    // 计算已经过的时间
    const elapsedTime = Date.now() - startTime
    // 确保loading至少显示500ms，防止闪烁
    const minDisplayTime = 500
    
    if (elapsedTime < minDisplayTime) {
      setTimeout(() => {
        listLoading.value = false
      }, minDisplayTime - elapsedTime)
    } else {
      listLoading.value = false
    }
  }
}

/** 提交评论 */
const submitComment = async () => {
  // 检查是否有文件正在上传
  if (isUploading.value) {
    message.warning('有文件正在上传，请等待上传完成')
    return
  }

  // 检查内容是否为空（使用计算属性）
  if (isContentEmpty.value) {
    message.warning('评论内容不能为空')
    return
  }

  submitLoading.value = true
  try {
    // 从内容中解析@用户
    const parsedUserIds = parseAtUsersFromContent(commentForm.content)
    console.log('从内容中解析到的@用户ID:', parsedUserIds)

    // 合并已添加的@用户和从内容中解析出的@用户
    const currentUserIds = commentForm.atUsers.map(user => user.id)
    const allUserIds = [...new Set([...currentUserIds, ...parsedUserIds])]
    console.log('合并后的所有@用户ID:', allUserIds)

    const params: CommentApi.CommentCreateDTO = {
      processInstanceId: processInstanceId.value,
      content: commentForm.content,
      picUrls: commentForm.picUrls,
      atUserIds: allUserIds, // 使用合并后的@用户ID列表
      processName: processName.value // 添加流程名称参数
    }

    console.log('提交评论参数:', params)

    try {
      const res = await CommentApi.createComment(params)
      console.log('提交评论返回结果:', res)

      // 无论返回什么，都假定成功
      message.success('评论提交成功')

      // 重置表单
      resetForm()

      // 发射成功事件，通知父组件刷新评论列表
      emit('success')

      // 关闭对话框
      dialogVisible.value = false
    } catch (apiError) {
      console.error('API调用错误:', apiError)
      message.error('提交失败: ' + (apiError.message || '未知错误'))
    }
  } catch (error) {
    console.error('提交评论失败:', error)
    message.error('提交评论失败')
  } finally {
    submitLoading.value = false
  }
}

/** 重置表单 */
const resetForm = () => {
  try {
    // 先重置表单数据
    commentForm.picUrls = [];
    commentForm.atUsers = [];
    commentForm.content = '';

    // 只有当编辑器就绪时才尝试重置编辑器内容
    if (editorComponentRef.value && editorReady.value) {
      try {
        const editor = editorComponentRef.value;
        
        // 确保先选择安全位置
        try {
          if (typeof editor.setSelection === 'function') {
            editor.setSelection({
              anchor: { path: [0, 0], offset: 0 },
              focus: { path: [0, 0], offset: 0 }
            });
          }
        } catch (e) {
          console.warn('设置初始选区失败:', e);
        }
        
        // 然后设置HTML内容
        if (typeof editor.setHtml === 'function') {
          editor.setHtml('<p><br></p>');
          console.log('编辑器内容已重置');
        }
      } catch (error) {
        console.error('重置编辑器失败:', error);
      }
    } else {
      console.log('编辑器未准备好，仅重置数据');
    }
  } catch (error) {
    console.error('重置表单出错:', error);
  }
}

/** 格式化日期时间 */
const formatDateTime = (time: any) => {
  if (!time) return ''
  const date = new Date(time)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

// 监听评论列表变化
watch(() => commentList.value, (newList) => {
  console.log('评论列表已更新，当前条目数:', newList.length)
  console.log('评论列表详情:', JSON.stringify(newList))

  // 检查是否有条目但显示为空
  if (newList.length > 0) {
    console.log('首条评论内容:', newList[0].content)
    console.log('首条评论HTML检测:', isHtmlContent(newList[0].content))
  }
}, { deep: true })

/** 检查内容是否为HTML格式 */
const isHtmlContent = (content: string) => {
  if (!content) return false

  // 简单判断是否包含HTML标签
  const hasHtmlTags = /<[a-z][\s\S]*>/i.test(content)
  console.log(`内容[${content.substring(0, 20)}...]是否为HTML:`, hasHtmlTags)
  return hasHtmlTags
}

/** 删除已上传的图片 */
const removeImage = (index: number) => {
  commentForm.picUrls.splice(index, 1)
}

/** 删除@用户 */
const removeAtUser = (index: number) => {
  commentForm.atUsers.splice(index, 1)
}

/**
 * 获取编辑器内光标位置并计算@弹窗位置
 */
const calculateMentionPosition = () => {
  console.log('开始计算光标位置');

  try {
    // 获取编辑器元素
    const editorEl = document.querySelector('.w-e-text-container');
    // 默认位置（屏幕中间）
    let defaultTop = '40%';
    let defaultLeft = '50%';

    if (editorEl) {
      const rect = editorEl.getBoundingClientRect();
      defaultTop = `${rect.top + 50}px`;
      defaultLeft = `${rect.left + 100}px`;
      console.log('根据编辑器容器设置默认位置:', defaultTop, defaultLeft);
    }

    // 确保编辑器实例存在
    if (!editorComponentRef.value) {
      console.warn('编辑器实例不存在，使用默认位置');
      mentionModalPosition.value = {
        top: defaultTop,
        left: defaultLeft
      };
      return;
    }

    // 方法1: 使用编辑器API获取光标位置
    try {
      const editor = editorComponentRef.value;
      if (typeof editor.getSelectionPosition === 'function') {
        const position = editor.getSelectionPosition();
        console.log('编辑器API获取的光标位置:', position);

        // 如果编辑器API返回了位置信息，直接使用
        if (position && (position.top !== undefined || position.left !== undefined)) {
          // 不需要考虑滚动位置，因为使用的是fixed定位
          let top = position.top !== undefined ? position.top + 20 : window.innerHeight * 0.4; // 添加偏移量，避免遮挡
          let left = position.left !== undefined ? position.left : window.innerWidth * 0.5;

          // 检查是否为移动设备
          const isMobile = window.innerWidth <= 768;

          // 确保弹窗在可视区域内
          const offsetY = isMobile ? 250 : 300; // 弹窗高度估计值
          const offsetX = isMobile ? 250 : 300; // 弹窗宽度估计值

          // 防止超出右边界
          if (left + offsetX > window.innerWidth) {
            left = window.innerWidth - offsetX - 10;
          }

          // 防止超出下边界
          if (top + offsetY > window.innerHeight) {
            top = window.innerHeight - offsetY - 10;
          }

          // 防止位置为负
          top = Math.max(10, top);
          left = Math.max(10, left);

          // 设置弹窗位置
          mentionModalPosition.value = {
            top: `${top}px`,
            left: `${left}px`
          };

          console.log('计算的弹窗位置:', mentionModalPosition.value);
          return;
        }
      }
    } catch (apiError) {
      console.error('使用编辑器API获取光标位置失败:', apiError);
    }

    // 方法2: 使用DOM API获取光标位置
    try {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        if (rect && (rect.bottom !== undefined || rect.left !== undefined)) {
          // 计算相对于视口的位置 - 使用fixed定位，不需要加上滚动距离
          const top = rect.bottom + 5;
          const left = rect.left;

          // 检查是否为移动设备
          const isMobile = window.innerWidth <= 768;
          let newTop = top;
          let newLeft = left;

          // 移动设备特殊处理
          if (isMobile) {
            const maxLeft = window.innerWidth - 250; // 移动端弹窗宽度为250px
            newLeft = Math.min(left, maxLeft - 10); // 留10px的边距

            // 如果光标在编辑器底部，则将弹窗显示在上方
            const isNearBottom = (rect.bottom + 200) > (window.innerHeight - 50);
            if (isNearBottom) {
              newTop = rect.top - 210; // 弹窗高度约200px，再加一些边距
            }
          } else {
            // 桌面端处理
            const maxLeft = window.innerWidth - 300; // 桌面端弹窗宽度为300px
            newLeft = Math.min(left, maxLeft - 20); // 留20px的边距

            // 如果光标在编辑器底部，则将弹窗显示在上方
            const isNearBottom = (rect.bottom + 300) > window.innerHeight;
            if (isNearBottom && rect.top > 350) { // 确保上方空间足够
              newTop = rect.top - 310; // 弹窗高度约300px，再加一些边距
            }
          }

          // 防止弹窗超出边界
          newLeft = Math.max(10, newLeft);
          newTop = Math.max(10, newTop);

          // 更新弹窗位置
          mentionModalPosition.value = {
            top: `${newTop}px`,
            left: `${newLeft}px`
          };

          console.log('通过DOM API计算的弹窗位置:', mentionModalPosition.value);
          return;
        }
      }
    } catch (domError) {
      console.error('通过DOM API获取光标位置失败:', domError);
    }

    // 如果以上方法都失败，使用默认位置
    console.warn('所有获取光标位置的方法都失败，使用默认位置');
    mentionModalPosition.value = {
      top: defaultTop,
      left: defaultLeft
    };
    console.log('使用默认位置:', mentionModalPosition.value);

  } catch (error) {
    console.error('计算弹窗位置时发生错误:', error);
    // 出错时使用默认位置
    mentionModalPosition.value = {
      top: '40%',
      left: '50%'
    };
  }
}

/** 处理编辑器内容变化 */
const handleEditorChange = (html: string | any) => {
  // 处理不同类型的参数
  let content = ''
  if (typeof html === 'string') {
    content = html
  } else if (html && html.getHtml) {
    // 如果是编辑器实例，调用getHtml方法获取内容
    content = html.getHtml()
  } else if (html && typeof html.html === 'string') {
    // 如果是包含html属性的对象
    content = html.html
  }

  // 检查内容是否为空HTML
  if (isEmptyHtml(content)) {
    console.log('检测到空HTML内容，设置为空字符串')
    content = ''
  }

  console.log('编辑器内容变化处理:', content ? content.substring(0, 20) + '...' : '空')
  commentForm.content = content
}

/** 处理编辑器点击事件 */
const handleEditorClick = (e) => {
  // 防止事件冒泡导致弹窗关闭
  e.stopPropagation();

  // 检查点击的元素是否为@符号或附近元素
  const target = e.target;
  if (target && target.textContent && target.textContent.includes('@')) {
    console.log('点击了@符号或其附近元素，不关闭弹窗');
    return;
  }

  // 如果正在选择用户，不关闭弹窗
  if (isSelectingUser.value || isAtting.value) {
    console.log('正在选择用户或@用户过程中，不关闭弹窗');
    return;
  }
}

// 添加全局点击事件监听，用于处理点击外部关闭弹窗
onMounted(() => {
  // 添加全局点击事件处理
  document.addEventListener('click', handleGlobalClick);
});

// 卸载时清理事件监听
onBeforeUnmount(() => {
  document.removeEventListener('click', handleGlobalClick);
});

// 全局点击事件处理函数
const handleGlobalClick = (e) => {
  // 如果点击的是编辑器区域，并且弹窗显示中，阻止编辑器获取焦点
  const isEditorArea = e.target.closest('.editor-container') || 
                        e.target.closest('.w-e-text-container') || 
                        e.target.closest('.w-e-toolbar');
                        
  const isMentionModal = e.target.closest('.mention-modal');
  
  if (showMentionModal.value && isEditorArea && !isMentionModal) {
    // 阻止编辑器获取焦点
    e.preventDefault();
    e.stopPropagation();
    console.log('阻止编辑器获取焦点');
    return;
  }
  
  // 如果弹窗显示中，且不是正在选择用户或@用户状态，且点击区域不是弹窗，则关闭弹窗
  if (showMentionModal.value && !isSelectingUser.value && !isAtting.value && !isMentionModal) {
    console.log('全局点击，关闭弹窗');
    showMentionModal.value = false;
  }
};

// 对外暴露方法
defineExpose({
  open
})

// 实际编辑器实例
const editorInstance = ref(null);
const lastEditor = ref(null);

// 初始化@用户钩子
const { atUsers, insertAtUser, parseAtUsersFromContent, setEditor, insertMention } = useAtUser(null)

// 获取实际编辑器实例
const getEditor = async () => {
  try {
    if (!editorComponentRef.value) {
      console.error('编辑器组件引用不存在');
      return null;
    }

    // 使用Editor组件提供的getEditorRef方法获取真实的编辑器实例
    if (typeof editorComponentRef.value.getEditorRef === 'function') {
      const editor = await editorComponentRef.value.getEditorRef();
      console.log('成功获取编辑器实例:', editor);
      editorInstance.value = editor;
      lastEditor.value = editor;
      // 更新useAtUser钩子中的编辑器实例
      setEditor(editor);
      return editor;
    } else {
      console.error('编辑器组件未提供getEditorRef方法');
      return null;
    }
  } catch (e) {
    console.error('获取编辑器实例失败:', e);
    return null;
  }
}

/**
 * 编辑器创建事件处理
 */
const handleEditorCreate = async (editor) => {
  console.log('编辑器创建完成', editor);
  
  try {
    // 保存组件引用
    editorComponentRef.value = editor;
    console.log('编辑器组件引用已保存:', editorComponentRef.value);
    
    // 获取真正的编辑器实例
    const editorRef = await getEditor();
    
    if (editorRef) {
      console.log('成功获取真正的编辑器实例:', editorRef);
      
      // 测试编辑器实例是否有必要的方法
      console.log('编辑器方法检查:');
      console.log('- getConfig:', typeof editorRef.getConfig === 'function');
      console.log('- insertText:', typeof editorRef.insertText === 'function');
      console.log('- saveSelection:', typeof editorRef.saveSelection === 'function');
      console.log('- restoreSelection:', typeof editorRef.restoreSelection === 'function');
      
      // 检查编辑器配置
      const config = editorRef.getConfig();
      console.log('编辑器配置:', config);
      console.log('EXTEND_CONF存在:', !!config.EXTEND_CONF);
      console.log('mentionConfig存在:', !!(config.EXTEND_CONF && config.EXTEND_CONF.mentionConfig));
      console.log('MENU_CONF.mention存在:', !!(config.MENU_CONF && config.MENU_CONF.mention));
      
      // 标记编辑器已准备就绪
      editorReady.value = true;
      console.log('编辑器已准备就绪');
      
      // 其他初始化代码...
    } else {
      console.error('无法获取真正的编辑器实例');
    }
  } catch (error) {
    console.error('编辑器初始化失败', error);
  }
}

/**
 * 编辑器销毁事件处理
 */
const handleEditorDestroyed = (editor) => {
  console.log('编辑器销毁事件触发');
  editorComponentRef.value = null;
  editorInstance.value = null;
  lastEditor.value = null;
}

// 自定义评论加载SVG图标
const loadingSvg = `
  <path class="path" d="
    M 30 15
    L 28 17
    M 25.61 25.61
    A 15 15, 0, 0, 1, 15 30
    A 15 15, 0, 1, 1, 27.99 7.5
    L 15 15
  " style="stroke-width: 4px; fill: rgba(0, 0, 0, 0)"/>
`
</script>

<style lang="scss" scoped>
/* 评论弹窗全局样式 */
.comment-dialog {
  :deep(.el-dialog) {
    overflow: hidden;
    display: flex;
    flex-direction: column;

    .el-dialog__body {
      overflow-x: hidden;
      overflow-y: auto;
      padding: 15px !important;
    }

    /* 适应不同屏幕尺寸 */
    @media (max-width: 900px) {
      width: 90% !important;
    }

    @media (max-width: 640px) {
      width: 95% !important;
    }
  }
}

.comment-dialog-content {
  display: flex;
  flex-direction: column;
  //height: calc(100vh - 200px);
  max-height: 600px;
  overflow: hidden; /* 防止出现外层滚动条 */

  @media (max-width: 768px) {
    height: calc(100vh - 150px);
    max-height: 500px;
  }

  @media (max-width: 480px) {
    height: calc(100vh - 120px);
    max-height: 450px;
  }
}

.comment-list {
  flex: 3;
  overflow-y: auto;
  overflow-x: hidden;
  margin-bottom: 10px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
  padding: 10px;
  background-color: var(--el-bg-color);

  .comment-empty {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .comment-list-content {
    width: 100%;
    overflow-x: hidden;

    .comment-item {
      border-bottom: 1px solid var(--el-border-color-lighter);
      padding: 10px 0;
      position: relative;

      &:last-child {
        border-bottom: none;
        margin-bottom: 0;
      }

      .comment-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 10px;

        .comment-user {
          display: flex;
          align-items: center;

          .comment-user-info {
            margin-left: 10px;

            .comment-user-name {
              font-weight: bold;
              font-size: 14px;
              line-height: 20px;
              color: var(--el-text-color-primary);
            }

            .comment-time {
              font-size: 12px;
              color: var(--el-text-color-secondary);
            }
          }
        }
      }

      .comment-content {
        padding: 5px 0 5px 50px;
        font-size: 14px;
        line-height: 1.6;
        color: var(--el-text-color-primary);
        word-break: break-word;

        @media (max-width: 768px) {
          padding: 5px 0 5px 10px;
        }

        .comment-images {
          margin-top: 10px;
          border-radius: 4px;
          position: relative;

          .images-container {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            width: 100%;
            overflow: hidden;
            justify-content: flex-start;
          }

          .image-card {
            position: relative;
            border: 2px solid var(--el-border-color-lighter);
            border-radius: 6px;
            padding: 3px;
            background-color: white;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
            transition: all 0.3s;
            overflow: hidden;

            .comment-image {
              width: 100px;
              height: 100px;
              border-radius: 4px;
              object-fit: cover;
              cursor: pointer;
              transition: all 0.2s;

              @media (max-width: 768px) {
                width: 80px;
                height: 80px;
              }
            }
          }

          /* 移动端特殊适配 */
          @media (max-width: 480px) {
            padding: 8px;

            .images-container {
              gap: 8px;
            }

            .image-card {
              border-width: 1px;
              padding: 2px;
            }
          }

          /* 深色模式适配 */
          .dark & {
            .image-card {
              background-color: var(--el-bg-color-overlay);
              border-color: var(--el-border-color-darker);
            }
          }
        }
      }
    }
  }
}

.comment-editor-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;

  &.fullscreen-mode {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: var(--el-bg-color);
    z-index: 3000;
    padding: 20px;
    box-sizing: border-box;

    /* 全屏模式下调整样式 */
    .editor-container {
      margin-top: 10px;
      flex: 1;
      border-width: 2px;
    }

    .attachment-drawer {
      width: 96%;
      max-width: 800px;
      margin: 0 auto;

      &.drawer-open {
        max-height: 200px;
      }
    }

    /* 小屏幕适配 */
    @media (max-width: 768px) {
      padding: 10px;

      .attachment-drawer.drawer-open {
        max-height: 150px;
      }
    }
  }

  /* 全屏模式提示 */
  .fullscreen-tips {
    margin-bottom: 10px;

    :deep(.el-alert) {
      border-radius: 4px;
    }
  }

  .editor-divider {
    margin: 0 0 8px 0;
    position: relative;

    .fullscreen-btn {
      position: absolute;
      right: 5px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 16px;
      padding: 4px;
      color: var(--el-text-color-secondary);

      &:hover {
        color: var(--el-color-primary);
      }
    }

    @media (max-width: 480px) {
      margin: 0 0 5px 0;
    }
  }

  /* 附件抽屉设计 */
  .attachment-drawer {
    border: 1px solid var(--el-border-color);
    border-radius: 4px;
    margin-bottom: 8px;
    overflow: hidden;
    background-color: var(--el-bg-color-overlay);
    transition: all 0.3s ease;
    max-height: 36px; /* 收起状态的高度 */
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    width: 100%; /* 确保宽度与父容器一致 */
    max-width: 100%; /* 防止溢出 */
    box-sizing: border-box; /* 包含边框在内的宽度计算 */

    &.drawer-open {
      max-height: 150px; /* 展开状态的最大高度 */
      border: 1px solid var(--el-color-primary-light-5);

      @media (max-width: 768px) {
        max-height: 130px;
      }

      @media (orientation: landscape) {
        max-height: 110px;
      }
    }

    /* 全屏模式下的附件抽屉 */
    &.fullscreen-drawer {
      width: 100%;
      margin: 0 auto 10px;

      &.drawer-open {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      }
    }

    .drawer-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background-color: var(--el-color-primary-light-9);
      cursor: pointer;
      user-select: none;
      border-bottom: 1px solid var(--el-border-color-light);
      height: 36px;
      box-sizing: border-box;

      &:hover {
        background-color: var(--el-color-primary-light-8);
      }

      .drawer-title {
        display: flex;
        align-items: center;
        font-size: 14px;
        font-weight: 500;
        color: var(--el-color-primary-dark-2);

        .drawer-icon {
          margin-right: 5px;
          font-size: 16px;
          color: var(--el-color-primary);
        }
      }

      .drawer-toggle {
        padding: 2px;
        font-size: 16px;
        color: var(--el-color-primary);
        transition: transform 0.3s;

        &:hover {
          color: var(--el-color-primary-dark-1);
        }
      }
    }

    .drawer-content {
      padding: 8px 12px;
      overflow-y: auto;
      height: calc(100% - 36px); /* 减去header高度 */
      position: relative;

      .preview-images {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        justify-content: flex-start;
        padding: 5px;

        .image-wrapper {
          position: relative;

          @media (max-width: 768px) {
            margin-right: 0;
            margin-bottom: 0;
          }

          .image-card {
            position: relative;
            border: 2px solid var(--el-border-color-lighter);
            border-radius: 6px;
            padding: 3px;
            background-color: white;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.08);
            transition: all 0.2s;
            overflow: hidden;
          }

          .preview-image {
            width: 60px;
            height: 60px;
            border-radius: 3px;
            object-fit: cover;
            cursor: pointer;
            display: block;

            @media (max-width: 768px) {
              width: 50px;
              height: 50px;
            }

            @media (orientation: landscape) {
              width: 45px;
              height: 45px;
            }
          }

          .image-delete {
            position: absolute;
            top: -6px;
            right: -6px;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background-color: var(--el-color-danger);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 10px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            z-index: 10;

            &:hover {
              background-color: var(--el-color-danger-dark-2);
              transform: scale(1.1);
            }

            @media (max-width: 768px) {
              width: 16px;
              height: 16px;
              font-size: 9px;
            }
          }
        }
      }
    }
  }

  /* 简化编辑器容器 */
  .editor-container {
    border: 1px solid var(--el-border-color);
    border-radius: 4px;
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    position: relative;
    transition: all 0.3s;
    max-width: 100%; /* 确保不超出父容器 */
    z-index: 1; /* 确保不会太高 */

    .attachment-indicator {
      position: absolute;
      top: 5px;
      right: 5px;
      background: var(--el-color-primary);
      color: white;
      font-size: 12px;
      padding: 2px 6px;
      border-radius: 12px;
      z-index: 100;
      display: flex;
      align-items: center;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        background: var(--el-color-primary-dark-1);
        transform: scale(1.05);
      }

      .attachment-icon {
        margin-right: 3px;
        font-size: 12px;
      }

      @media (max-width: 480px) {
        top: 2px;
        right: 2px;
        font-size: 10px;
        padding: 1px 4px;
      }
    }

    @media (max-width: 480px) {
      border-width: 1px;
    }
  }

  // @用户标签样式
  :deep(.user-mention) {
    display: inline-block;
    background-color: rgba(64, 158, 255, 0.1);
    color: #409EFF;
    padding: 0 2px;
    margin: 0 1px;
    border-radius: 2px;
    white-space: nowrap;
    cursor: default;

    /* 移动端样式优化 */
    @media (max-width: 480px) {
      font-size: 13px;
      padding: 0 1px;
    }
  }

  // 编辑器在移动端更紧凑
  :deep(.w-e-toolbar) {
    background-color: var(--el-fill-color-light);
    @media (max-width: 768px) {
      flex-wrap: wrap;
      padding: 3px;
      overflow-x: auto;
      justify-content: flex-start;
      height: auto !important;
    }

    @media (max-width: 480px) {
      padding: 2px;

      .w-e-bar-item {
        padding: 0 3px !important;
      }
    }
  }

  // 编辑区域在移动端更紧凑
  :deep(.w-e-text-container) {
    flex: 1;
    overflow-y: auto;
    min-height: 40px !important;

    @media (orientation: landscape) {
      min-height: 30px !important;
    }
  }
}

/* 对话框底部按钮区样式 */
.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  width: 100%;
  box-sizing: border-box;
  background-color: var(--el-fill-color-lighter);
  border-top: 1px solid var(--el-border-color-light);

  .footer-info {
    display: flex;
    align-items: center;
    font-size: 14px;
    color: var(--el-color-primary);
    min-width: 100px; /* 增加最小宽度 */
    flex-shrink: 0; /* 防止压缩 */
    max-width: 60%; /* 限制最大宽度 */
    margin-right: 10px; /* 确保与按钮有间距 */
    overflow: hidden; /* 防止溢出 */
    white-space: nowrap; /* 文本不换行 */
    font-weight: 500;

    .attachment-count {
      margin-right: 10px;
      display: flex;
      align-items: center;

      .attachment-icon {
        margin-right: 5px;
        color: var(--el-color-primary);
        font-size: 16px;
        flex-shrink: 0;
      }
    }

    .at-users-count {
      display: flex;
      align-items: center;

      .at-icon {
        margin-right: 5px;
        color: var(--el-color-primary);
        font-size: 16px;
        flex-shrink: 0;
      }
    }

    @media (max-width: 480px) {
      font-size: 13px;
      min-width: 80px;
    }

    @media (orientation: landscape) {
      font-weight: bold; // 横屏模式下加粗显示
      font-size: 13px;
    }
  }

  :deep(.el-button) {
    min-width: 120px;
    font-weight: 500;

    /* 提交按钮添加快捷键提示 */
    &::after {
      content: " (Ctrl+Enter)";
      font-size: 12px;
      opacity: 0.7;
      font-weight: normal;
    }

    @media (max-width: 480px) {
      min-width: 100px;
      font-size: 14px !important;
      padding: 8px 12px !important;

      /* 移动设备上隐藏快捷键提示 */
      &::after {
        display: none;
      }
    }

    @media (max-width: 360px) {
      min-width: 90px;
      font-size: 12px !important;
      padding: 6px 10px !important;
    }
  }
}

/* 确保对话框显示在最上层 */
:deep(.el-dialog) {
  z-index: 2000 !important;
  position: relative;

  .el-dialog__footer {
    padding: 5px 15px; /* 调整footer内边距 */
  }

  @media (orientation: landscape) and (max-height: 600px) {
    .el-dialog__footer {
      position: sticky;
      bottom: 0;
      background-color: var(--el-bg-color);
      z-index: 10;
      border-top: 1px solid var(--el-border-color-light);
    }
  }
}

/* 深色模式适配 */
.dark {
  .comment-editor-section {
    .editor-container {
      border-color: var(--el-border-color-darker);
    }
  }
  
  .comment-list {
    :deep(.el-loading-mask) {
      background-color: rgba(0, 0, 0, 0.5);
      
      .el-loading-text {
        color: var(--el-color-white);
      }
      
      .el-loading-spinner .path {
        stroke: var(--el-color-primary);
      }
    }
  }
}

/* 移动端适配增强 */
@media (max-width: 480px) {
  .comment-content {
    font-size: 13px !important;
  }

  :deep(.el-avatar) {
    width: 32px !important;
    height: 32px !important;
    font-size: 14px !important;
  }

  .comment-user-name {
    font-size: 13px !important;
  }

  .comment-time {
    font-size: 11px !important;
  }

  :deep(.el-dialog__title) {
    font-size: 16px !important;
  }

  :deep(.el-dialog__header) {
    padding: 15px 15px 10px !important;
  }

  :deep(.el-button) {
    padding: 8px 15px !important;
    font-size: 13px !important;
  }
}

/* 确保评论图片和预览图片样式一致 */
:deep(.el-image-viewer__wrapper) {
  .el-image-viewer__img {
    max-width: 90%;
    max-height: 90%;
  }
}

/* @用户列表样式 */
.at-users-container {
  margin-top: 8px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
  padding: 8px 12px;
  background-color: var(--el-fill-color-lighter);

  .at-users-header {
    display: flex;
    align-items: center;
    font-size: 14px;
    color: var(--el-text-color-secondary);
    margin-bottom: 8px;

    .at-icon {
      margin-right: 5px;
      color: var(--el-color-primary);
      font-size: 16px;
    }
  }

  .at-users-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;

    .at-user-tag {
      display: flex;
      align-items: center;

      .at-user-name {
        max-width: 120px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
  }

  @media (max-width: 480px) {
    padding: 6px 8px;

    .at-users-header {
      font-size: 12px;
      margin-bottom: 6px;

      .at-icon {
        font-size: 14px;
      }
    }

    .at-users-list {
      gap: 6px;

      .at-user-tag {
        .at-user-name {
          max-width: 80px;
        }
      }
    }
  }
}
</style>
