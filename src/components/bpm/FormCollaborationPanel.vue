<template>
  <div class="collaboration-panel" v-if="onlineUsers.length">
    <div class="online-count">在线人数：{{ onlineUsers.length }}</div>
    <ul class="user-list">
      <li v-for="user in onlineUsers" :key="user.id">{{ user.nickname }}</li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  processUsers: any[]
  confirmedOnlineUsers: Set<number>
}

const props = defineProps<Props>()

const onlineUsers = computed(() =>
  props.processUsers.filter((u) => props.confirmedOnlineUsers.has(u.id))
)
</script>

<style scoped>
.collaboration-panel {
  padding: 8px;
  background-color: #f5f5f5;
  border-radius: 4px;
  font-size: 14px;
}
.user-list {
  margin-top: 4px;
  padding-left: 16px;
}
</style>
