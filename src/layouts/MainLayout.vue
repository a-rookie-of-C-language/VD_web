<script setup lang="ts">
import { onMounted } from 'vue'
import Sidebar from '../components/Sidebar.vue'
import { useUserStore } from '@/stores/useUserStore'

const userStore = useUserStore()

onMounted(async () => {
  const token = localStorage.getItem('token')
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
      <router-view v-slot="{ Component }">
        <transition name="fade-slide" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </el-main>
  </el-container>
</template>

<style scoped>
.main-layout {
  height: 100vh;
  width: 100%;
  overflow: hidden;
}

.content-area {
  background-color: var(--page-bg);
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0;
}

.app-sidebar {
  width: 240px;
  flex-shrink: 0;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

@media (max-width: 768px) {
  .main-layout {
    flex-direction: column;
  }

  .main-layout :deep(.el-aside) {
    width: 100% !important;
    height: auto !important;
    order: 2;
    flex-shrink: 0;
    z-index: 1000;
  }

  .content-area {
    order: 1;
    flex: 1;
    overflow-y: auto;
    padding-bottom: 60px;
  }
}
</style>
