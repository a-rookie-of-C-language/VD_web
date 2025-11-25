<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { computed, onMounted, watch } from 'vue'
import { Document, Plus, User as UserIcon, Loading, SwitchButton } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/useUserStore'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const currentPath = computed(() => route.path)

const handleSelect = (index: string) => {
  router.push(index)
}

const roleClean = userStore.role

const roleLabels: Record<string, string> = {
  user: '普通用户',
  admin: '管理员',
  functionary: '负责人',
  superAdmin: '超级管理员'
}

const handleLogout = async () => {
  try {
    await ElMessageBox.confirm('确定要退出登录吗?', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    userStore.clearUser()
    ElMessage.success('已退出登录')
    await router.push('/login')
  } catch {
    // User cancelled
  }
}

onMounted(() => {
  userStore.loadUserInfo()
})

// Watch for route changes to refresh user info (e.g., after login)
watch(() => route.path, () => {
  if (!userStore.currentUser) {
    userStore.loadUserInfo()
  }
})
</script>

<template>
  <el-menu
    :default-active="currentPath"
    class="sidebar-menu"
    @select="handleSelect"
  >
    <div class="logo-container">
      <h1 class="logo-text">志愿活动管理</h1>
    </div>
    
    <el-menu-item index="/activities">
      <el-icon><Document /></el-icon>
      <span>活动列表</span>
    </el-menu-item>
    
    <el-menu-item v-if="roleClean === 'functionary'" index="/add-activity">
      <el-icon><Plus /></el-icon>
      <span>发布活动</span>
    </el-menu-item>

    <el-menu-item v-if="roleClean === 'functionary'" index="/my-projects">
      <el-icon><Document /></el-icon>
      <span>我的项目</span>
    </el-menu-item>

    <el-menu-item v-if="roleClean === 'admin' || roleClean === 'superAdmin'" index="/admin-review">
      <el-icon><Document /></el-icon>
      <span>管理员审核</span>
    </el-menu-item>

    <!-- User Info Section at Bottom -->
    <div class="user-info-container">
      <el-divider />
      <div v-if="userStore.currentUser" class="user-info">
        <div class="user-avatar">
          <el-icon :size="24"><UserIcon /></el-icon>
        </div>
        <div class="user-details">
          <div class="user-name">{{ userStore.username.value }}</div>
          <div class="user-student-no">学号: {{ userStore.studentNo.value }}</div>
          <el-tag :type="roleClean === 'admin'
          || roleClean === 'superAdmin' ? 'danger'
          : roleClean === 'functionary' ? 'warning'
          : 'info'" size="small" class="user-role">
            {{ roleLabels[roleClean] || roleClean }}
          </el-tag>
        </div>
        <el-button 
          :icon="SwitchButton" 
          circle 
          size="small" 
          @click="handleLogout"
          title="退出登录"
          class="logout-btn"
        />
      </div>
      <div v-else-if="userStore.isLoading" class="user-info-loading">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>加载中...</span>
      </div>
      <div v-else class="user-info-placeholder">
        <el-icon :size="20"><UserIcon /></el-icon>
        <span>未登录</span>
      </div>
    </div>
  </el-menu>
</template>

<style scoped>
.sidebar-menu {
  height: 100vh;
  border-right: 1px solid var(--el-menu-border-color);
  display: flex;
  flex-direction: column;
}

.logo-container {
  padding: 1.5rem 1rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.logo-text {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--el-text-color-primary);
  letter-spacing: -0.025em;
  margin: 0;
}

.el-menu-item {
  font-size: 0.95rem;
}

.user-info-container {
  margin-top: auto;
  padding: 0 1rem 1rem;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background-color: var(--el-fill-color-light);
  border-radius: 8px;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: var(--el-color-primary-light-9);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-color-primary);
  flex-shrink: 0;
}

.user-details {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 0.25rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-student-no {
  font-size: 0.75rem;
  color: var(--el-text-color-secondary);
  margin-bottom: 0.25rem;
}

.user-role {
  margin-top: 0.25rem;
}

.user-info-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
  color: var(--el-text-color-secondary);
  font-size: 0.875rem;
}

.user-info-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
  color: var(--el-text-color-placeholder);
  font-size: 0.875rem;
}

.logout-btn {
  margin-left: auto;
  flex-shrink: 0;
}

.logout-btn:hover {
  color: var(--el-color-danger);
  border-color: var(--el-color-danger);
}
</style>
