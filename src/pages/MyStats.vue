<script setup lang="ts">
import {ref, onMounted, watch} from 'vue'
import { useRouter } from 'vue-router'
import {ElMessage, ElMessageBox} from 'element-plus'
import {activityService} from '@/services/activityService'
import {hourRequestService} from '@/services/hourRequestService'
import type {Activity} from '@/entity/Activity'
import {useUserStore} from '@/stores/useUserStore'
import {Timer, Trophy, Calendar, ArrowRight, User as UserIcon, SwitchButton} from '@element-plus/icons-vue'
import {ActivityStatus} from '@/entity/ActivityStatus'
import { getActivityTypeLabel, getActivityStatusLabel } from '@/util/util'
import PageHeader from '@/components/PageHeader.vue'
import { getStatusTagType, formatTimeRange } from '@/composables/useActivityHelpers'

type ActivityWithRequest = Activity & { isPersonalRequest?: boolean }

const userStore = useUserStore()
const router = useRouter()
const loading = ref(false)
const activities = ref<ActivityWithRequest[]>([])
const totalDuration = ref(0)
const totalActivities = ref(0)

const fetchParticipated = async () => {
  if (!userStore.studentNo.value) return
  loading.value = true
  try {
    const [res, requests] = await Promise.all([
      activityService.fetchMyStatus(),
      hourRequestService.getMyRequests()
    ])
    
    const markedRequests = requests.map(r => ({ ...r, isPersonalRequest: true }))

    const allActivities = [...(res.activities || []), ...markedRequests]
        .filter(act => act.status === ActivityStatus.ActivityEnded)
    allActivities.sort((a, b) => {
      const timeA = new Date(a.startTime).getTime()
      const timeB = new Date(b.startTime).getTime()
      return timeB - timeA
    })
    
    activities.value = allActivities
    
    const requestsDuration = requests
      .filter(r => r.status === ActivityStatus.ActivityEnded)
      .reduce((acc, curr) => acc + (curr.duration || 0), 0)

    totalDuration.value = (res.totalDuration || 0) + requestsDuration
    totalActivities.value = allActivities.length
  } catch (e) {
    console.error(e)
    ElMessage.error('加载我的志愿数据失败')
  } finally {
    loading.value = false
  }
}

const handleLogout = async () => {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    userStore.clearUser()
    ElMessage.success('已退出登录')
    await router.push('/')
  } catch (e) {
    // cancelled
  }
}

const getStatusType = (status: ActivityStatus) => {
  switch (status) {
    case ActivityStatus.EnrollmentStarted:
      return 'success'
    case ActivityStatus.ActivityStarted:
      return 'warning'
    case ActivityStatus.ActivityEnded:
      return 'info'
    case ActivityStatus.FailReview:
      return 'danger'
    default:
      return ''
  }
}

const getStatusText = getActivityStatusLabel

const getTypeText = getActivityTypeLabel

onMounted(() => {
  if (userStore.studentNo.value) {
    fetchParticipated()
  }
})

watch(() => userStore.studentNo.value, (newVal) => {
    if (newVal) {
        fetchParticipated()
    }
})
</script>

<template>
  <div class="my-stats-page">
    <PageHeader title="我的志愿概览" subtitle="每一份奉献都值得被铭记，感谢您的付出！" />

    <el-card class="user-info-card mb-4" shadow="hover" v-if="userStore.isLoggedIn">
      <div class="user-info-content">
        <div class="user-avatar">
          <el-avatar :size="60" :icon="UserIcon" class="avatar-icon" />
        </div>
        <div class="user-details">
          <div class="user-name">{{ userStore.username }}</div>
          <div class="user-id">学号: {{ userStore.studentNo }}</div>
        </div>
        <div class="user-actions">
           <el-button type="danger" plain round :icon="SwitchButton" @click="handleLogout" size="small">退出登录</el-button>
        </div>
      </div>
    </el-card>

    <div class="stats-container">
      <el-row :gutter="24">
        <el-col :span="12" :xs="24">
          <div class="stat-card duration-card">
            <div class="stat-icon">
              <el-icon>
                <Timer/>
              </el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ totalDuration }} <span class="unit">小时</span></div>
              <div class="stat-label">累计志愿时长</div>
            </div>
          </div>
        </el-col>
        <el-col :span="12" :xs="24">
          <div class="stat-card activity-card">
            <div class="stat-icon">
              <el-icon>
                <Trophy/>
              </el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ totalActivities }} <span class="unit">次</span></div>
              <div class="stat-label">参与活动总数</div>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>

    <el-card class="list-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <div class="header-title">
            <el-icon>
              <Calendar/>
            </el-icon>
            <span>近期参与记录</span>
          </div>
        </div>
      </template>

      <div class="hidden-xs-only">
        <el-table
            :data="activities"
            v-loading="loading"
            style="width: 100%"
            :header-cell-style="{ background: '#f5f7fa', color: '#606266' }"
            stripe
        >
          <el-table-column prop="name" label="活动名称" min-width="200">
            <template #default="{ row }">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="activity-name">{{ row.name }}</span>
                <el-tag v-if="row.isPersonalRequest" type="warning" size="small" effect="plain">个人申请</el-tag>
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="type" label="类型" width="140">
            <template #default="{ row }">
              <el-tag effect="plain" round>{{ getTypeText(row.type) }}</el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="duration" label="时长" width="120">
            <template #default="{ row }">
              <span class="duration-text">{{ row.duration }} 小时</span>
            </template>
          </el-table-column>

          <el-table-column label="活动时间" min-width="320">
            <template #default="{ row }">
              <div class="time-cell">
                <span>{{ formatTimeRange(row.startTime, row.expectedEndTime || row.endTime) }}</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="status" label="状态" width="120">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)" effect="dark" size="small">
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column fixed="right" label="操作" width="100">
            <template #default="{ row }">
              <el-button v-if="!row.isPersonalRequest" link type="primary" @click="$router.push(`/app/activity/${row.id}`)">
                查看
                <el-icon class="el-icon--right">
                  <ArrowRight/>
                </el-icon>
              </el-button>
              <span v-else class="personal-request-text">个人申请</span>
            </template>
          </el-table-column>

          <template #empty>
            <div class="empty-state">
              <el-empty description="暂无参与记录，快去报名活动吧！"/>
            </div>
          </template>
        </el-table>
      </div>

      <div class="visible-xs-only mobile-activity-list">
          <div v-for="item in activities" :key="item.id" class="mobile-activity-item">
              <div class="item-header">
                  <div class="item-title-wrapper">
                      <span class="item-title">{{ item.name }}</span>
                      <el-tag v-if="item.isPersonalRequest" type="warning" size="small" effect="plain" class="ml-1">个人申请</el-tag>
                  </div>
                  <el-button v-if="!item.isPersonalRequest" link type="primary" size="small" @click="$router.push(`/app/activity/${item.id}`)">查看</el-button>
                  <span v-else class="personal-request-text-mobile">个人申请</span>
              </div>
              <div class="item-body">
                  <div class="item-row">
                      <el-tag size="small" effect="plain">{{ getTypeText(item.type) }}</el-tag>
                      <el-tag :type="getStatusType(item.status)" size="small" class="ml-2" effect="dark">{{ getStatusText(item.status) }}</el-tag>
                  </div>
                  <div class="item-row highlight-text">
                      <el-icon><Timer /></el-icon>
                      <span class="ml-1">{{ item.duration }} 小时</span>
                  </div>
                  <div class="item-row time-text">
                      {{ formatTimeRange(item.startTime, item.expectedEndTime || item.endTime) }}
                  </div>
              </div>
          </div>
          <div v-if="activities.length === 0" class="empty-mobile-text">
             <el-empty description="暂无参与记录" />
          </div>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.my-stats-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 30px 5%;
  min-height: 80vh;
  animation: fadeUp 0.5s ease;
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.stats-container {
  margin-bottom: 30px;
}

.stat-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  padding: 30px;
  display: flex;
  align-items: center;
  gap: 24px;
  transition: all 0.3s ease;
  border: none !important;
  box-shadow: 0 10px 30px -5px rgba(0,0,0,0.08);
  cursor: default;
  position: relative;
  overflow: hidden;
}

.stat-card::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 150px;
  height: 150px;
  background: radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 70%);
  transform: translate(30%, -30%);
  border-radius: 50%;
  pointer-events: none;
}
.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 35px -5px rgba(0,0,0,0.12);
}

.stat-icon {
  width: 72px;
  height: 72px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  flex-shrink: 0;
  box-shadow: inset 0 2px 4px rgba(255,255,255,0.5);
}
.duration-card .stat-icon {
  background: linear-gradient(135deg, var(--brand-400), var(--brand-600));
  color: white;
  box-shadow: 0 8px 16px -4px rgba(var(--brand-500-rgb, 59, 130, 246), 0.4);
}
.activity-card .stat-icon {
  background: linear-gradient(135deg, var(--accent-400), var(--accent-600));
  color: white;
  box-shadow: 0 8px 16px -4px rgba(var(--accent-500-rgb, 16, 185, 129), 0.4);
}
.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 42px;
  font-weight: 800;
  color: #1e293b;
  line-height: 1.1;
  letter-spacing: -1px;
}
.unit {
  font-size: 16px;
  color: #64748b;
  font-weight: 500;
  margin-left: 6px;
  letter-spacing: 0;
}
.stat-label {
  font-size: 15px;
  color: #64748b;
  margin-top: 8px;
  font-weight: 500;
}
.user-info-card {
  border-radius: 20px;
  border: none !important;
  box-shadow: 0 10px 30px -5px rgba(0,0,0,0.08);
  margin-bottom: 30px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
}

.user-info-content {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 10px;
}

.user-avatar :deep(.el-avatar) {
  border: 4px solid #f8fafc;
  box-shadow: 0 4px 10px rgba(0,0,0,0.1);
  background: linear-gradient(135deg, var(--brand-400), var(--brand-600));
  color: white;
}
.user-details {
  flex: 1;
}
.user-name {
  font-size: 24px;
  font-weight: 800;
  color: #1e293b;
  margin-bottom: 6px;
  letter-spacing: -0.5px;
}
.user-id {
  font-size: 15px;
  color: #64748b;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  background: #f1f5f9;
  padding: 4px 12px;
  border-radius: 20px;
}

.user-actions .el-button {
  border-radius: 20px;
  padding: 10px 20px;
  font-weight: 600;
}

.list-card {
  border-radius: 20px;
  border: none !important;
  box-shadow: 0 10px 30px -5px rgba(0,0,0,0.08);
  background: rgba(255, 255, 255, 0.95);
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.header-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
}

.header-title .el-icon {
  color: var(--brand-500);
  font-size: 20px;
}
.activity-name {
  font-weight: 600;
  color: #1e293b;
  font-size: 15px;
}
.duration-text {
  font-family: 'Inter', monospace;
  font-weight: 700;
  color: var(--brand-600);
  background: #f0f9ff;
  padding: 4px 10px;
  border-radius: 8px;
  display: inline-block;
}
.time-cell {
  display: flex;
  flex-direction: column;
  line-height: 1.5;
  color: #475569;
  font-size: 14px;
}
.empty-state {
  padding: 60px 0;
}
.personal-request-text {
  color: #94a3b8;
  font-size: 13px;
  font-weight: 500;
  background: #f8fafc;
  padding: 4px 10px;
  border-radius: 20px;
}
@media (max-width: 768px) {
  .my-stats-page {
    padding: 16px;
  }

  .stats-container {
    margin-bottom: 20px;
  }

  .stat-card {
    margin-bottom: 16px;
    padding: 24px;
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .stat-icon {
    width: 56px;
    height: 56px;
    font-size: 28px;
    border-radius: 16px;
  }
  
  .stat-value {
    font-size: 32px;
  }
  
  .user-info-content {
    flex-direction: column;
    text-align: center;
    gap: 16px;
    padding: 16px 0;
  }
  .user-actions {
    width: 100%;
    margin-top: 10px;
  }

  .list-card {
    border-radius: 16px;
  }
  .mobile-activity-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .mobile-activity-item {
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    padding: 20px;
    background: #ffffff;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
    transition: all 0.3s ease;
  }
  
  .mobile-activity-item:active {
    transform: scale(0.98);
  }
  .item-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 16px;
    border-bottom: 1px solid #f1f5f9;
    padding-bottom: 12px;
  }
  .item-title-wrapper {
    display: flex;
    align-items: flex-start;
    flex-direction: column;
    gap: 6px;
    flex: 1;
    padding-right: 12px;
  }
  .item-title {
    font-weight: 700;
    font-size: 16px;
    color: #1e293b;
    line-height: 1.4;
  }
  .personal-request-text-mobile {
    color: #64748b;
    font-size: 12px;
    white-space: nowrap;
    background: #f1f5f9;
    padding: 4px 10px;
    border-radius: 20px;
  }
  .item-body {
    font-size: 14px;
    color: #475569;
  }
  .item-row {
    margin-bottom: 10px;
    display: flex;
    align-items: center;
  }
  .highlight-text {
    color: var(--brand-600);
    font-weight: 600;
    background: #f0f9ff;
    padding: 6px 12px;
    border-radius: 8px;
    display: inline-flex;
  }
  .time-text {
    font-size: 13px;
    color: #64748b;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px dashed #e2e8f0;
  }
  .empty-mobile-text {
    text-align: center;
    color: #94a3b8;
    padding: 60px 0;
  }
}
</style>
