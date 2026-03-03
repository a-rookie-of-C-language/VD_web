<script setup lang="ts">
import {useRouter, useRoute} from 'vue-router'
import {computed, onMounted, watch, ref} from 'vue'
import {
  Document,
  Plus,
  User as UserIcon,
  Loading,
  SwitchButton,
  DataLine,
  Monitor,
  Files,
  Upload,
  ChatDotRound,
} from '@element-plus/icons-vue'
import {ElMessage, ElMessageBox} from 'element-plus'
import {useUserStore} from '@/stores/useUserStore'

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
  {index: '/app/activities', label: '活动列表', icon: Files},
  {index: '/app/add-activity', label: '发布活动', icon: Plus, roles: ['functionary']},
  {index: '/app/import-activity', label: '后台导入', icon: Upload, roles: ['functionary', 'admin']},
  {index: '/app/my-projects', label: '我的项目', icon: Document, roles: ['functionary','admin']},
  {index: '/app/request-hours', label: '申请时长', icon: Document, roles: ['user']},
  {index: '/app/suggestion-box', label: '意见反馈', icon: ChatDotRound},
  {index: '/app/admin-review', label: '管理员审核', icon: Document, roles: ['admin']},
  {index: '/app/system-monitor', label: '系统监控', icon: Monitor, roles: ['superAdmin']},
  {index: '/app/my-stats', label: '我的时长', icon: DataLine, roles: ['user']}
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
    // cancelled
  }
}

const isMobile = ref(false)
const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768
}

const showUserDrawer = ref(false)

onMounted(() => {
  const token = localStorage.getItem('token')
  if (token && !userStore.currentUser) {
    userStore.loadUserInfo()
  }
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

watch(() => route.path, () => {
  const token = localStorage.getItem('token')
  if (token && !userStore.currentUser) {
    userStore.loadUserInfo()
  }
})
</script>

<template>
  <!-- Desktop Sidebar -->
  <nav class="sidebar" v-if="!isMobile">
    <div class="sidebar-logo">
      <div class="logo-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor" opacity="0.9"/>
          <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>
      <span class="logo-label">志愿活动管理</span>
    </div>

    <div class="sidebar-nav">
      <button
        v-for="item in visibleMenuItems"
        :key="item.index"
        class="nav-item"
        :class="{ 'nav-item--active': currentPath === item.index }"
        @click="handleSelect(item.index)"
      >
        <span class="nav-icon">
          <el-icon><component :is="item.icon" /></el-icon>
        </span>
        <span class="nav-label">{{ item.label }}</span>
        <span v-if="currentPath === item.index" class="nav-active-bar" />
      </button>
    </div>

    <div class="sidebar-footer">
      <div class="user-card" v-if="userStore.currentUser">
        <div class="user-avatar">
          <el-icon :size="18"><UserIcon /></el-icon>
        </div>
        <div class="user-info">
          <div class="user-name">{{ userStore.username.value }}</div>
          <div class="user-meta">
            <el-tag
              :type="userStore.role.value === 'admin' || userStore.role.value === 'superAdmin' ? 'danger'
                : userStore.role.value === 'functionary' ? 'warning' : 'info'"
              size="small"
              effect="plain"
              class="role-tag"
            >
              {{ roleLabels[userStore.role.value || 'user'] || userStore.role.value }}
            </el-tag>
          </div>
        </div>
        <button class="logout-btn" @click.stop="handleLogout" title="退出登录">
          <el-icon :size="15"><SwitchButton /></el-icon>
        </button>
      </div>
      <div class="user-card-loading" v-else-if="userStore.isLoading">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>加载中...</span>
      </div>
      <div class="user-card-placeholder" v-else>
        <el-icon><UserIcon /></el-icon>
        <span>未登录</span>
      </div>
    </div>
  </nav>

  <!-- Mobile Bottom Nav -->
  <nav class="mobile-nav" v-else>
    <button
      v-for="item in visibleMenuItems"
      :key="item.index"
      class="mobile-nav-item"
      :class="{ 'mobile-nav-item--active': currentPath === item.index }"
      @click="handleSelect(item.index)"
    >
      <el-icon :size="22"><component :is="item.icon" /></el-icon>
      <span>{{ item.label }}</span>
    </button>
  </nav>

  <!-- Mobile User Drawer -->
  <el-drawer
    v-model="showUserDrawer"
    title="用户信息"
    direction="btt"
    size="50%"
    :with-header="true"
    append-to-body
  >
    <div class="drawer-content">
      <div v-if="userStore.currentUser" class="drawer-user">
        <div class="drawer-avatar">
          <el-icon :size="40"><UserIcon /></el-icon>
        </div>
        <h3>{{ userStore.username.value }}</h3>
        <p>学号: {{ userStore.studentNo.value }}</p>
        <el-tag
          :type="userStore.role.value === 'admin' || userStore.role.value === 'superAdmin' ? 'danger'
            : userStore.role.value === 'functionary' ? 'warning' : 'info'"
        >
          {{ roleLabels[userStore.role.value || 'user'] || userStore.role.value }}
        </el-tag>
        <el-button type="danger" plain @click="handleLogout" :icon="SwitchButton" style="margin-top:20px;width:80%">
          退出登录
        </el-button>
      </div>
      <div v-else class="drawer-login-prompt">
        <p>您尚未登录</p>
        <el-button type="primary" @click="$router.push('/')">去登录</el-button>
      </div>
    </div>
  </el-drawer>
</template>

<style scoped>
.sidebar {
  width: 240px;
  height: 100vh;
  background: var(--sidebar-bg);
  border-right: 1px solid var(--sidebar-border);
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 22px 20px 18px;
  border-bottom: 1px solid var(--sidebar-border);
  flex-shrink: 0;
}

.logo-icon {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, var(--brand-500) 0%, var(--brand-700) 100%);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(99,102,241,0.35);
}

.logo-label {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--sidebar-logo-text);
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.sidebar-nav {
  flex: 1;
  padding: 12px 10px;
  overflow-y: auto;
  overflow-x: hidden;
}

.sidebar-nav::-webkit-scrollbar {
  width: 3px;
}
.sidebar-nav::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.1);
  border-radius: 2px;
}

.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  margin-bottom: 3px;
  border: none;
  border-radius: 9px;
  background: transparent;
  color: var(--sidebar-text);
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  transition: background var(--transition-base), color var(--transition-base);
  outline: none;
}

.nav-item:hover {
  background: var(--sidebar-item-hover);
  color: #cbd5e1;
}

.nav-item--active {
  background: rgba(99,102,241,0.18);
  color: #a5b4fc;
}

.nav-item--active:hover {
  background: rgba(99,102,241,0.22);
}

.nav-active-bar {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 20px;
  background: var(--brand-400);
  border-radius: 3px 0 0 3px;
}

.nav-icon {
  display: flex;
  align-items: center;
  font-size: 16px;
  flex-shrink: 0;
  opacity: 0.85;
}

.nav-item--active .nav-icon {
  opacity: 1;
}

.nav-label {
  font-family: var(--el-font-family);
}

.sidebar-footer {
  padding: 12px 10px 16px;
  border-top: 1px solid var(--sidebar-border);
  flex-shrink: 0;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 10px;
  transition: background var(--transition-base);
}

.user-card:hover {
  background: rgba(255,255,255,0.07);
}

.user-avatar {
  width: 34px;
  height: 34px;
  background: linear-gradient(135deg, var(--brand-600) 0%, var(--brand-800) 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c7d2fe;
  flex-shrink: 0;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 12.5px;
  font-weight: 600;
  color: #e2e8f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 3px;
}

.role-tag {
  font-size: 10px;
}

.logout-btn {
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  transition: color var(--transition-base), background var(--transition-base);
  flex-shrink: 0;
}

.logout-btn:hover {
  color: #f87171;
  background: rgba(239,68,68,0.1);
}

.user-card-loading,
.user-card-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  color: #64748b;
  font-size: 13px;
}

/* Mobile Bottom Nav */
.mobile-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: rgba(15,17,23,0.95);
  backdrop-filter: blur(12px);
  border-top: 1px solid var(--sidebar-border);
  display: flex;
  align-items: stretch;
  z-index: 1000;
  padding: 0 4px;
}

.mobile-nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 10px;
  cursor: pointer;
  transition: color var(--transition-base);
  padding: 0 2px;
}

.mobile-nav-item--active {
  color: var(--brand-400);
}

.mobile-nav-item:hover {
  color: #94a3b8;
}

.drawer-content {
  padding: 10px 0;
}

.drawer-user {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0;
  gap: 10px;
}

.drawer-avatar {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--brand-600), var(--brand-800));
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c7d2fe;
  margin-bottom: 6px;
}

.drawer-login-prompt {
  text-align: center;
  padding: 40px;
}
</style>
