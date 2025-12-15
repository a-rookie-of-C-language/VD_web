<script setup lang="ts">
import Sidebar from '../components/Sidebar.vue'
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
