<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { computed, onMounted, watch, ref } from 'vue'
import { 
  Document, 
  Plus, 
  User as UserIcon, 
  Loading, 
  SwitchButton,
  DataLine,
  Monitor,
  Files,
  Upload
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/useUserStore'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const currentPath = computed(() => route.path)


const handleSelect = (index: string) => {
  router.push(index)
}


const roleLabels: Record<string, string> = {
  user: '普通用户',
  admin: '管理员',
  functionary: '负责人',
  superAdmin: '超级管理员'
}

interface MenuItem {
  index: string
  label: string
  icon: any
  roles?: string[]
}

const allMenuItems: MenuItem[] = [
  { index: '/app/activities', label: '活动列表', icon: Files ,roles:['user','functionary','admin','superAdmin'] },
  { index: '/app/add-activity', label: '发布活动', icon: Plus, roles: ['functionary'] },
  { index: '/app/import-activity', label: '后台导入', icon: Upload, roles: ['functionary', 'admin', 'superAdmin'] },
  { index: '/app/my-projects', label: '我的项目', icon: Document, roles: ['functionary','superAdmin'] },
  { index: '/app/my-stats', label: '我的时长', icon: DataLine },
  { index: '/app/admin-review', label: '管理员审核', icon: Document, roles: ['admin', 'superAdmin'] },
  { index: '/app/system-monitor', label: '系统监控', icon: Monitor, roles: ['superAdmin'] }
]

const visibleMenuItems = computed(() => {
  const currentRole = userStore.role.value || 'user'
  return allMenuItems.filter(item => {
    if (!item.roles) return true
    return item.roles.includes(currentRole)
  })
})

const handleLogout = async () => {
  try {
    await ElMessageBox.confirm('确定要退出登录吗?', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    userStore.clearUser()
    ElMessage.success('已退出登录')
    await router.push('/')
  } catch {
    // User cancelled
  }
}

const isMobile = ref(false)

const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768
}

const showUserDrawer = ref(false)

onMounted(() => {
  // Only load user info if token exists
  const token = localStorage.getItem('token')
  if (token && !userStore.currentUser) {
    userStore.loadUserInfo()
  }
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

// Watch for route changes to refresh user info (e.g., after login)
watch(() => route.path, () => {
  const token = localStorage.getItem('token')
  if (token && !userStore.currentUser) {
    userStore.loadUserInfo()
  }
})
</script>

<template>
  <el-menu
    :default-active="currentPath"
    class="sidebar-menu"
    :mode="isMobile ? 'horizontal' : 'vertical'"
    :ellipsis="false"
    @select="handleSelect"
  >
    <div class="logo-container" v-if="!isMobile">
      <h1 class="logo-text">志愿活动管理</h1>
    </div>
    
    <div class="menu-items-wrapper">
      <el-menu-item 
        v-for="item in visibleMenuItems" 
        :key="item.index" 
        :index="item.index"
        class="custom-menu-item"
      >
        <div class="menu-item-content">
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </div>
      </el-menu-item>

    </div>
    
    <!-- User Info Section at Bottom (Desktop) -->
    <div class="user-info-container" v-if="!isMobile">
      <el-divider />
      <div v-if="userStore.currentUser" class="user-info">
        <div class="user-avatar">
          <el-icon :size="24"><UserIcon /></el-icon>
        </div>
        <div class="user-details">
          <div class="user-name">{{ userStore.username.value }}</div>
          <div class="user-student-no">学号: {{ userStore.studentNo.value }}</div>
          <el-tag :type="userStore.role.value === 'admin'
          || userStore.role.value === 'superAdmin' ? 'danger'
          : userStore.role.value === 'functionary' ? 'warning'
          : 'info'" size="small" class="user-role">
            {{ roleLabels[userStore.role.value || 'user'] || userStore.role.value }}
          </el-tag>
        </div>
        <el-button 
          :icon="SwitchButton" 
          circle 
          size="small" 
          @click.stop="handleLogout"
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
    
    <!-- Mobile User Drawer -->
    <el-drawer
      v-model="showUserDrawer"
      title="用户信息"
      direction="btt"
      size="50%"
      :with-header="true"
      append-to-body
      class="mobile-user-drawer"
    >
      <div class="drawer-user-content">
         <div v-if="userStore.currentUser" class="mobile-user-info">
            <div class="mobile-avatar">
              <el-icon :size="50"><UserIcon /></el-icon>
            </div>
            <h3 class="mobile-username">{{ userStore.username.value }}</h3>
            <p class="mobile-student-no">学号: {{ userStore.studentNo.value }}</p>
            <el-tag :type="userStore.role.value === 'admin'
            || userStore.role.value === 'superAdmin' ? 'danger'
            : userStore.role.value === 'functionary' ? 'warning'
            : 'info'" class="mobile-role">
              {{ roleLabels[userStore.role.value || 'user'] || userStore.role.value }}
            </el-tag>
            
            <el-button type="danger" plain class="mobile-logout-btn" @click="handleLogout" :icon="SwitchButton">
              退出登录
            </el-button>
         </div>
          <div v-else class="mobile-login-prompt">
            <p>您尚未登录</p>
            <el-button type="primary" @click="$router.push('/')">去登录</el-button>
          </div>
      </div>
    </el-drawer>
  </el-menu>
</template>

<style scoped>

.sidebar-menu {
  height: 100vh;
  border-right: 1px solid var(--el-menu-border-color);
  display: flex;
  flex-direction: column;
}

.menu-items-wrapper {
  display: flex;
  flex-direction: column;
  flex: 1; /* Take up available space */
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

@media (max-width: 768px) {
  .sidebar-menu {
    flex-direction: row;
    height: auto;
    min-height: 60px;
    border-right: none;
    border-top: 1px solid var(--el-menu-border-color);
    width: 100%;
    background: #fff;
    padding: 0;
  }

  .menu-items-wrapper {
    flex-direction: row;
    width: 100%;
    justify-content: space-between;
  }

  /* Force override Element Plus menu item styles */
  :deep(.el-menu-item) {
    height: 60px !important;
    line-height: normal !important;
    padding: 0 4px !important;
    flex: 1;
    display: flex;
    justify-content: center;
    border-bottom: none !important;
  }
  
  :deep(.el-menu-item.is-active) {
    border-bottom: 2px solid var(--el-color-primary) !important; 
    /* Or top border if preferred since it's bottom nav */
  }

  .menu-item-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    height: 100%;
  }

  :deep(.el-menu-item) .el-icon {
    margin: 0 !important;
    font-size: 24px;
  }
  

  :deep(.el-menu-item) span {
    font-size: 10px;
    line-height: 1;
  }
}

.mobile-user-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0;
}

.mobile-avatar {
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.mobile-username {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 600;
}

.mobile-student-no {
  color: var(--el-text-color-secondary);
  margin: 0 0 16px 0;
}

.mobile-role {
  margin-bottom: 24px;
}

.mobile-logout-btn {
  width: 80%;
}

.mobile-login-prompt {
  text-align: center;
  padding: 40px;
}
</style>
