<template>
  <div class="mention-modal" :style="{ top: position.top, left: position.left, right: position.right, bottom: position.bottom }" @click.stop="preventClose" @mousedown.stop="preventClose">
    <div class="mention-modal-header">
      <el-input
        v-model="searchText"
        placeholder="搜索用户"
        size="small"
        clearable
        prefix-icon="ep:search"
        @input="handleSearch"
        @keyup="handleKeyNavigation"
        @compositionstart="isComposing = true"
        @compositionend="isComposing = false"
        @click.stop
        @mousedown.stop.prevent
        @focus.stop
        ref="searchInputRef"
      />
    </div>
    <div class="mention-modal-body" @mousedown.stop>
      <el-scrollbar height="200px">
        <div v-if="loading" class="mention-loading">
          <el-skeleton :rows="3" animated />
        </div>
        <template v-else>
          <div v-if="filteredUsers.length === 0" class="mention-empty">
            <el-empty description="无匹配用户" :image-size="60" />
          </div>
          <ul v-else class="mention-list">
            <li
              v-for="user in filteredUsers"
              :key="user.id"
              class="mention-item"
              :class="{ 'highlighted': highlightedUser && highlightedUser.id === user.id }"
              @click.stop="selectUser(user)"
              @mousedown.stop="selectUser(user)"
              @mouseover.stop="highlightUser(user)"
            >
              <div class="user-avatar">
                <el-avatar :size="24" :src="user.avatar">
                  {{ user.nickname ? user.nickname.substring(0, 1) : '?' }}
                </el-avatar>
              </div>
              <span class="mention-item-name">{{ user.nickname }}({{ user.id }})</span>
            </li>
          </ul>
        </template>
      </el-scrollbar>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, computed, nextTick, onBeforeUnmount } from 'vue';
import { getSimpleUserList } from '@/api/system/user';

const props = defineProps({
  position: {
    type: Object,
    default: () => ({ top: '0px', left: '0px' })
  }
});

const emit = defineEmits(['select', 'close']);

const users = ref<any[]>([]);
const loading = ref(true);
const searchText = ref('');
const searchInputRef = ref(null);
const highlightedUser = ref(null);
const isComposing = ref(false); // 标记输入法组合状态

// 阻止事件冒泡，防止弹窗被关闭
const preventClose = (e) => {
  console.log('UserMentionModal内部点击，阻止事件冒泡');
  e.stopPropagation();
  // 不阻止默认行为，让输入框等元素正常工作
};

// 计算各个位置
const top = computed(() => {
  if (props.position && props.position.top) {
    return props.position.top;
  }
  return '0px';
});

const bottom = computed(() => {
  if (props.position && props.position.bottom) {
    return props.position.bottom;
  }
  return '';
});

const left = computed(() => {
  if (props.position && props.position.left) {
    return props.position.left;
  }
  return '0px';
});

const right = computed(() => {
  if (props.position && props.position.right) {
    const rightValue = parseInt(props.position.right);
    if (!isNaN(rightValue)) {
      const newRight = rightValue - 180;
      return newRight < 0 ? '0px' : (newRight + 'px');
    }
  }
  return '';
});

// 根据搜索文本过滤用户列表
const filteredUsers = computed(() => {
  if (!searchText.value) return users.value;
  const keyword = searchText.value.toLowerCase();
  return users.value.filter(user =>
    user.nickname.toLowerCase().includes(keyword)
  );
});

// 处理搜索输入
const handleSearch = () => {
  console.log('搜索文本:', searchText.value);

  // 重置高亮用户
  if (filteredUsers.value.length > 0) {
    highlightedUser.value = filteredUsers.value[0];
  } else {
    highlightedUser.value = null;
  }
};

// 选择用户
const selectUser = (user) => {
  console.log('选择用户:', user);
  // 发出选择事件
  emit('select', user);
  // 选择用户后不立即关闭弹窗，让父组件控制关闭时机
};

// 高亮用户
const highlightUser = (user) => {
  highlightedUser.value = user;
};

// 处理键盘导航
const handleKeyNavigation = (event) => {
  // 在输入法组合期间，不处理键盘导航，避免影响中文输入
  if (isComposing.value) return;

  if (!filteredUsers.value.length) return;

  const currentIndex = highlightedUser.value ?
    filteredUsers.value.findIndex(u => u.id === highlightedUser.value.id) : -1;

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      if (currentIndex < filteredUsers.value.length - 1) {
        highlightedUser.value = filteredUsers.value[currentIndex + 1];
      } else {
        highlightedUser.value = filteredUsers.value[0];
      }
      scrollToHighlighted();
      break;
    case 'ArrowUp':
      event.preventDefault();
      if (currentIndex > 0) {
        highlightedUser.value = filteredUsers.value[currentIndex - 1];
      } else {
        highlightedUser.value = filteredUsers.value[filteredUsers.value.length - 1];
      }
      scrollToHighlighted();
      break;
    case 'Enter':
      if (highlightedUser.value) {
        event.preventDefault();
        selectUser(highlightedUser.value);
      }
      break;
    case 'Escape':
      event.preventDefault();
      console.log('按ESC键关闭弹窗');
      emit('close');
      break;
  }
};

// 滚动到高亮项
const scrollToHighlighted = () => {
  nextTick(() => {
    if (highlightedUser.value) {
      // 找到当前高亮元素
      const items = document.querySelectorAll('.mention-item');
      if (!items.length) return;

      const currentIndex = filteredUsers.value.findIndex(u => u.id === highlightedUser.value.id);
      if (currentIndex < 0 || currentIndex >= items.length) return;

      const highlightedElement = items[currentIndex] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  });
};

// 加载用户列表
const loadUsers = async () => {
  loading.value = true;
  try {
    // 先尝试从API获取数据
    const res = await getSimpleUserList();
    console.log('用户列表API返回:', res);

    // 处理不同格式的API返回
    if (res && Array.isArray(res)) {
      users.value = res.map(user => ({
        id: user.id,
        nickname: user.nickname || '未命名用户',
        avatar: user.avatar || '',
      }));
    } else if (res && res.code === 0 && Array.isArray(res.data)) {
      users.value = res.data.map(user => ({
        id: user.id,
        nickname: user.nickname || '未命名用户',
        avatar: user.avatar || '',
      }));
    } else {
      // 模拟数据
      console.warn('使用模拟数据');
      initMockUsers();
    }
  } catch (error) {
    console.error('加载用户列表失败:', error);
    // 模拟数据
    initMockUsers();
  } finally {
    loading.value = false;

    // 设置第一个用户为默认高亮
    if (users.value.length > 0) {
      highlightedUser.value = users.value[0];
    }
  }
};

// 初始化模拟用户数据
const initMockUsers = () => {
  users.value = Array.from({ length: 20 }).map((_, index) => {
    return {
      id: index,
      nickname: '张三' + index,
      avatar: '',
      account: 'user' + index
    };
  });
};

// Focus the search input with retries
const focusSearchInput = () => {
  if (!searchInputRef.value) return;

  // First attempt
  searchInputRef.value.focus();
  console.log('第一次尝试聚焦搜索框');

  // 直接尝试聚焦内部input元素
  const inputEl = searchInputRef.value.$el?.querySelector('input');
  if (inputEl) {
    inputEl.focus();
    console.log('直接聚焦内部input元素');
  }

  // Second attempt with delay to ensure component is fully rendered
  setTimeout(() => {
    if (searchInputRef.value) {
      searchInputRef.value.focus();
      console.log('第二次尝试聚焦搜索框');
      
      // 再次尝试聚焦内部input元素
      const inputEl = searchInputRef.value.$el?.querySelector('input');
      if (inputEl) {
        inputEl.focus();
        console.log('第二次尝试聚焦内部input元素');
      }
    }
  }, 50);

  // Third attempt with longer delay (backup)
  setTimeout(() => {
    if (searchInputRef.value) {
      searchInputRef.value.focus();
      console.log('第三次尝试聚焦搜索框');

      // 再次尝试聚焦内部input元素
      const inputEl = searchInputRef.value.$el?.querySelector('input');
      if (inputEl) {
        inputEl.focus();
        // 使用更直接的方法强制聚焦
        try {
          inputEl.click();
          console.log('尝试点击input元素');
          // 模拟用户点击，可能会更有效
          const event = new MouseEvent('mousedown', {
            bubbles: true,
            cancelable: true,
            view: window
          });
          inputEl.dispatchEvent(event);
          console.log('模拟mousedown事件');
        } catch (e) {
          console.error('模拟点击失败:', e);
        }
      }
    }
  }, 150);
  
  // 最后一次尝试，使用更长的延迟
  setTimeout(() => {
    if (searchInputRef.value) {
      const inputEl = searchInputRef.value.$el?.querySelector('input');
      if (inputEl) {
        // 尝试使用更激进的方法
        inputEl.focus();
        inputEl.click();
        console.log('最后一次尝试聚焦');
      }
    }
  }, 300);
};

onMounted(() => {
  // 加载用户列表
  loadUsers();

  // 聚焦到搜索框 - with improved focus handling
  nextTick(() => {
    focusSearchInput();
  });

  // Add an event listener to ensure the modal doesn't lose focus
  document.addEventListener('focusin', preventEditorFocus);
});

// Prevent editor from stealing focus while modal is open
const preventEditorFocus = (e) => {
  if (!searchInputRef.value) return;

  // Check if focus is moving to editor while modal is open
  const target = e.target;
  const isEditorElement = target.closest('.w-e-text-container') ||
    target.closest('.w-e-toolbar');

  if (isEditorElement) {
    e.preventDefault();
    e.stopPropagation();
    // Refocus our search input
    focusSearchInput();
  }
};

// 组件卸载时移除事件监听
onBeforeUnmount(() => {
  console.log('UserMentionModal组件卸载');
  document.removeEventListener('focusin', preventEditorFocus);
});
</script>

<style scoped lang="scss">
.mention-modal {
  position: fixed;
  z-index: 9999999;
  background-color: var(--el-bg-color);
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  width: 250px;
  overflow: hidden;
  border: 1px solid var(--el-border-color-light);
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.mention-modal-header {
  padding: 8px 10px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background-color: var(--el-bg-color);
  position: sticky;
  top: 0;
  z-index: 2;
}

.mention-modal-body {
  padding: 0;
}

.mention-item {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover, &.highlighted {
    background-color: var(--el-fill-color-light);
  }

  .user-avatar {
    margin-right: 8px;
    flex-shrink: 0;
  }

  .mention-item-name {
    font-size: 14px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.mention-empty {
  padding: 20px;
  text-align: center;
  color: var(--el-text-color-secondary);
}

.mention-loading {
  padding: 10px;
}

/* 深色模式适配 */
:global(.dark) {
  .mention-modal {
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.3);
  }
}
</style> 
