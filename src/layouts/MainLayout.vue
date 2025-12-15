<script setup lang="ts">
import { onMounted } from 'vue'
import Sidebar from '../components/Sidebar.vue'
import { useUserStore } from '@/stores/useUserStore'

const userStore = useUserStore()

onMounted(async () => {
  const token = localStorage.getItem('token')
  // 有 token 时加载用户信息（loadUserInfo 内部会处理缓存）
  if (token) {
    console.log('[MainLayout] Loading user info...')
    await userStore.loadUserInfo()
    console.log('[MainLayout] User info loaded:', userStore.currentUser.value?.studentNo)
  }
})
</script>

<template>
  <el-container class="main-layout">
    <el-aside class="app-sidebar">
      <Sidebar />
    </el-aside>
    <el-main class="content-area">
      <router-view />
    </el-main>
  </el-container>
</template>

<style scoped>
.main-layout {
  height: 100vh;
}

.content-area {
  background-color: #f9fafb;
  overflow-y: auto;
}

.app-sidebar {
  width: 260px;
}

@media (max-width: 768px) {
  .main-layout {
    flex-direction: column;
  }

  .main-layout :deep(.el-aside) {
    width: 100% !important;
    height: auto !important;
    order: 2; /* Move to bottom */
    flex-shrink: 0;
    z-index: 1000;
  }

  .content-area {
    order: 1;
    flex: 1;
    overflow-y: auto;
    padding-bottom: 60px; /* Prevent content from being hidden behind nav if fixed, though flex shouldn't hide it */
  }
}
</style>
