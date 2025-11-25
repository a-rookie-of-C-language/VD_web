<script setup lang="ts">
import Sidebar from '../components/Sidebar.vue'
</script>

<template>
  <el-container class="main-layout">
    <el-aside width="260px">
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
</style>
