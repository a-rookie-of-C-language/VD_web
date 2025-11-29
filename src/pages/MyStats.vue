<script setup lang="ts">
import {ref, onMounted} from 'vue'
import {ElMessage} from 'element-plus'
import {activityService} from '@/services/activityService'
import type {Activity} from '@/entity/Activity'
import {useUserStore} from '@/stores/useUserStore'
import {Timer, Trophy, Calendar, ArrowRight} from '@element-plus/icons-vue'
import {ActivityStatus} from '@/entity/ActivityStatus'
import {ActivityType} from '@/entity/ActivityType'

const userStore = useUserStore()
const loading = ref(false)
const activities = ref<Activity[]>([])
const totalDuration = ref(0)
const totalActivities = ref(0)

const fetchParticipated = async () => {
  if (!userStore.studentNo.value) return
  loading.value = true
  try {
    const res = await activityService.fetchMyStatus()
    activities.value = res.activities || []
    totalDuration.value = res.totalDuration || 0
    totalActivities.value = res.totalActivities || 0
  } catch (e) {
    console.error(e)
    ElMessage.error('加载我的志愿数据失败')
  } finally {
    loading.value = false
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

const getStatusText = (status: ActivityStatus): string => {
  const statusMap: Record<ActivityStatus, string> = {
    [ActivityStatus.EnrollmentNotStart]: '未开始报名',
    [ActivityStatus.EnrollmentStarted]: '报名中',
    [ActivityStatus.EnrollmentEnded]: '报名结束',
    [ActivityStatus.ActivityStarted]: '活动进行中',
    [ActivityStatus.ActivityEnded]: '活动已结束',
    [ActivityStatus.UnderReview]: '审核中',
    [ActivityStatus.FailReview]: '审核失败'
  }
  return statusMap[status] || String(status)
}

const getTypeText = (type: ActivityType): string => {
  const typeMap: Record<ActivityType, string> = {
    [ActivityType.COMMUNITY_SERVICE]: '社区服务',
    [ActivityType.CULTURE_SERVICE]: '文化服务',
    [ActivityType.EMERGENCY_RESCUE]: '应急救援',
    [ActivityType.ANIMAL_PROTECTION]: '动物保护',
    [ActivityType.POVERTY_ASSISTANCE]: '扶贫助困',
    [ActivityType.ELDERLY_DISABLED_ASSISTANCE]: '扶老助残',
    [ActivityType.MEDICAL_ASSISTANCE]: '慰病助医',
    [ActivityType.ORPHAN_EDUCATION_ASSISTANCE]: '救孤助学'
  }
  return typeMap[type] || type
}

const formatTimeRange = (start: string, end: string) => {
  const startDate = new Date(start)
  const endDate = new Date(end)

  const startStr = startDate.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).replace(/\//g, '-')

  const endStr = endDate.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).replace(/\//g, '-')

  return `${startStr} ~ ${endStr}`
}

onMounted(() => {
  if (userStore.studentNo.value) {
    fetchParticipated()
  }
})
</script>

<template>
  <div class="my-stats-page">
    <!-- Header Section -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="title">我的志愿概览</h1>
        <p class="subtitle">每一份奉献都值得被铭记，感谢您的付出！</p>
      </div>
      <div class="header-decoration">
        <!-- Abstract decoration circles -->
        <div class="circle circle-1"></div>
        <div class="circle circle-2"></div>
      </div>
    </div>

    <!-- Stats Cards -->
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

    <!-- Activities List -->
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

      <el-table
          :data="activities"
          v-loading="loading"
          style="width: 100%"
          :header-cell-style="{ background: '#f5f7fa', color: '#606266' }"
          stripe
      >
        <el-table-column prop="name" label="活动名称" min-width="200">
          <template #default="{ row }">
            <span class="activity-name">{{ row.name }}</span>
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
              <span>{{ formatTimeRange(row.startTime, row.expectedEndTime) }}</span>
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
            <el-button link type="primary" @click="$router.push(`/activity/${row.id}`)">
              查看
              <el-icon class="el-icon--right">
                <ArrowRight/>
              </el-icon>
            </el-button>
          </template>
        </el-table-column>

        <template #empty>
          <div class="empty-state">
            <el-empty description="暂无参与记录，快去报名活动吧！"/>
          </div>
        </template>
      </el-table>
    </el-card>
  </div>
</template>

<style scoped>
.my-stats-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  min-height: 80vh;
}

/* Header */
.page-header {
  background: linear-gradient(135deg, #409eff 0%, #3a8ee6 100%);
  border-radius: 16px;
  padding: 40px;
  margin-bottom: 30px;
  color: white;
  position: relative;
  overflow: hidden;
  box-shadow: 0 10px 20px rgba(64, 158, 255, 0.2);
}

.header-content {
  position: relative;
  z-index: 2;
}

.title {
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 10px 0;
  letter-spacing: 1px;
}

.subtitle {
  font-size: 16px;
  opacity: 0.9;
  margin: 0;
}

.header-decoration .circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
}

.circle-1 {
  width: 200px;
  height: 200px;
  top: -50px;
  right: -50px;
}

.circle-2 {
  width: 100px;
  height: 100px;
  bottom: -20px;
  right: 100px;
}

/* Stats Cards */
.stats-container {
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 30px;
  display: flex;
  align-items: center;
  gap: 24px;
  transition: all 0.3s ease;
  border: 1px solid #ebeef5;
  cursor: default;
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
}

.stat-icon {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
}

.duration-card .stat-icon {
  background: #ecf5ff;
  color: #409eff;
}

.activity-card .stat-icon {
  background: #f0f9eb;
  color: #67c23a;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 36px;
  font-weight: 700;
  color: #303133;
  line-height: 1.2;
}

.unit {
  font-size: 14px;
  color: #909399;
  font-weight: 400;
  margin-left: 4px;
}

.stat-label {
  font-size: 14px;
  color: #606266;
  margin-top: 4px;
}

/* List Card */
.list-card {
  border-radius: 12px;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.activity-name {
  font-weight: 500;
  color: #303133;
}

.duration-text {
  font-family: monospace;
  font-weight: 600;
  color: #606266;
}

.time-cell {
  display: flex;
  flex-direction: column;
  line-height: 1.4;
}

.time-sub {
  font-size: 12px;
  color: #909399;
}

.empty-state {
  padding: 40px 0;
}

/* Responsive */
@media (max-width: 768px) {
  .page-header {
    padding: 24px;
  }

  .title {
    font-size: 24px;
  }

  .stat-card {
    margin-bottom: 16px;
    padding: 20px;
  }
}
</style>