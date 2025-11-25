<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Timer, User, Document, Download } from '@element-plus/icons-vue'
import { activityService } from '@/services/activityService'
import type { Activity } from '@/entity/Activity'
import { ActivityStatus } from '@/entity/ActivityStatus'
import { ActivityType } from '@/entity/ActivityType'
import { useUserStore } from '@/stores/useUserStore'
import { userService } from '@/services/userService'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const activity = ref<Activity | null>(null)
const loading = ref(true)
const enrolling = ref(false)
const functionaryName = ref<string>('')

// Fetch activity details
const fetchActivity = async () => {
  const id = route.params.id as string
  if (!id) return

  loading.value = true
  try {
    const data = await activityService.getActivityById(id)
    if (data) {
      activity.value = data
      if (data.functionary) {
        functionaryName.value = data.functionary
      }
    } else {
      ElMessage.error('未找到该活动')
      await router.push('/activities')
    }
  } catch (error) {
    console.error('Failed to fetch activity:', error)
    ElMessage.error('加载活动详情失败')
  } finally {
    loading.value = false
  }
}

// Handle enrollment
const handleEnroll = async () => {
  if (!activity.value) return

  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录')
    await router.push('/login')
    return
  }

  try {
    await ElMessageBox.confirm('确定要报名参加该活动吗？', '报名确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info'
    })

    enrolling.value = true
    const response = await activityService.enrollActivity(activity.value.id, userStore.studentNo)
    
    if (response.code === 200) {
      ElMessage.success('报名成功')
      await fetchActivity() // Refresh data
    } else {
      ElMessage.error(response.message || '报名失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Enrollment failed:', error)
      ElMessage.error('报名请求失败')
    }
  } finally {
    enrolling.value = false
  }
}

// Helpers
const formatDate = (dateString: string) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
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

const getStatusType = (status: ActivityStatus): 'success' | 'warning' | 'info' | 'danger' => {
  switch (status) {
    case ActivityStatus.EnrollmentStarted: return 'success'
    case ActivityStatus.EnrollmentNotStart: return 'info'
    case ActivityStatus.EnrollmentEnded:
    case ActivityStatus.ActivityStarted: return 'warning'
    case ActivityStatus.ActivityEnded: return 'info'
    case ActivityStatus.UnderReview: return 'info'
    case ActivityStatus.FailReview: return 'danger'
    default: return 'info'
  }
}

const canEnroll = computed(() => {
  if (!activity.value) return false
  return activity.value.status === ActivityStatus.EnrollmentStarted && !activity.value.isFull
})

onMounted(() => {
  fetchActivity()
})
</script>

<template>
  <div class="detail-page">
    <!-- Header -->
    <div class="page-header">
      <el-button link @click="router.back()" class="back-btn">
        <el-icon><ArrowLeft /></el-icon> 返回列表
      </el-button>
    </div>

    <div v-if="loading" class="loading-state">
      <el-skeleton :rows="10" animated />
    </div>

    <div v-else-if="activity" class="content-container">
      <!-- Banner -->
      <div class="banner-section">
        <img 
          :src="activity.CoverImage || '/src/image/activity-card-bg.png'"
          class="banner-image"
          @error="(e) => (e.target as HTMLImageElement).src = '/src/image/activity-card-bg.png'"
         />
        <div class="banner-overlay">
          <h1 class="activity-title">{{ activity.name }}</h1>
          <div class="activity-meta">
            <el-tag :type="getStatusType(activity.status)" effect="dark" size="large">
              {{ getStatusText(activity.status) }}
            </el-tag>
            <el-tag effect="plain" type="info" size="large">
              {{ getTypeText(activity.type) }}
            </el-tag>
          </div>
        </div>
      </div>

      <div class="main-content">
        <!-- Left Column: Info -->
        <div class="info-column">
          <el-card class="info-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <span>活动信息</span>
              </div>
            </template>
            
            <div class="info-item">
              <el-icon><User /></el-icon>
              <span class="label">负责人:</span>
              <span class="value">{{ functionaryName || activity.functionary }}</span>
            </div>

            <div class="info-item">
              <el-icon><Timer /></el-icon>
              <span class="label">报名时间:</span>
              <div class="time-block">
                <div>{{ formatDate(activity.EnrollmentStartTime) }}</div>
                <div class="to">至</div>
                <div>{{ formatDate(activity.EnrollmentEndTime) }}</div>
              </div>
            </div>

            <div class="info-item">
              <el-icon><Timer /></el-icon>
              <span class="label">活动时间:</span>
              <div class="time-block">
                <div>{{ formatDate(activity.startTime) }}</div>
                <div class="to">至</div>
                <div>{{ formatDate(activity.endTime) }}</div>
              </div>
            </div>

            <div class="info-item">
              <el-icon><User /></el-icon>
              <span class="label">参与人数:</span>
              <span class="value">
                {{ activity.participants?.length || 0 }} / {{ activity.maxParticipants }}
                <el-tag size="small" :type="activity.isFull ? 'danger' : 'success'" class="ml-2">
                  {{ activity.isFull ? '已满员' : '未满员' }}
                </el-tag>
              </span>
            </div>

            <div class="action-area">
              <el-button 
                type="primary" 
                size="large" 
                class="enroll-btn"
                :disabled="!canEnroll"
                :loading="enrolling"
                @click="handleEnroll"
              >
                {{ canEnroll ? '立即报名' : getStatusText(activity.status) }}
              </el-button>
            </div>
          </el-card>

          <!-- Attachments -->
          <el-card class="info-card mt-4" shadow="hover" v-if="activity.Attachment && activity.Attachment.length > 0">
            <template #header>
              <div class="card-header">
                <span>附件下载</span>
              </div>
            </template>
            <div class="attachment-list">
              <div v-for="(_, index) in activity.Attachment" :key="index" class="attachment-item">
                <el-icon><Document /></el-icon>
                <span class="filename">附件 {{ index + 1 }}</span>
                <el-button link type="primary" size="small">
                  <el-icon><Download /></el-icon> 下载
                </el-button>
              </div>
            </div>
          </el-card>
        </div>

        <!-- Right Column: Description -->
        <div class="description-column">
          <el-card class="description-card" shadow="never">
            <h2 class="section-title">活动详情</h2>
            <div class="description-content">
              {{ activity.description || '暂无详细描述' }}
            </div>
          </el-card>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.detail-page {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding: 20px;
}

.page-header {
  max-width: 1200px;
  margin: 0 auto 20px;
}

.back-btn {
  font-size: 16px;
  color: #606266;
}

.back-btn:hover {
  color: #409eff;
}

.content-container {
  max-width: 1200px;
  margin: 0 auto;
}

.banner-section {
  position: relative;
  height: 300px;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.banner-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.banner-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 30px;
  background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
  color: white;
}

.activity-title {
  font-size: 32px;
  margin: 0 0 16px 0;
  font-weight: 600;
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

.activity-meta {
  display: flex;
  gap: 12px;
}

.main-content {
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 24px;
}

.info-card {
  border-radius: 8px;
  border: none;
}

.card-header {
  font-weight: 600;
  font-size: 16px;
}

.info-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 20px;
  line-height: 1.5;
}

.info-item .el-icon {
  margin-top: 3px;
  margin-right: 8px;
  color: #909399;
}

.label {
  color: #606266;
  margin-right: 8px;
  white-space: nowrap;
}

.value {
  color: #303133;
  font-weight: 500;
}

.time-block {
  display: flex;
  flex-direction: column;
  color: #303133;
  font-size: 14px;
}

.to {
  color: #909399;
  font-size: 12px;
  margin: 2px 0;
}

.ml-2 {
  margin-left: 8px;
}

.mt-4 {
  margin-top: 16px;
}

.action-area {
  margin-top: 30px;
}

.enroll-btn {
  width: 100%;
  font-weight: 600;
  letter-spacing: 1px;
}

.description-card {
  min-height: 400px;
  border-radius: 8px;
  border: none;
  background: white;
}

.section-title {
  font-size: 20px;
  margin: 0 0 20px 0;
  padding-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
  color: #303133;
}

.description-content {
  font-size: 16px;
  line-height: 1.8;
  color: #606266;
  white-space: pre-wrap;
}

.attachment-item {
  display: flex;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #ebeef5;
}

.attachment-item:last-child {
  border-bottom: none;
}

.attachment-item .el-icon {
  margin-right: 8px;
  color: #909399;
}

.filename {
  flex: 1;
  font-size: 14px;
  color: #606266;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 900px) {
  .main-content {
    grid-template-columns: 1fr;
  }
  
  .banner-section {
    height: 200px;
  }
  
  .activity-title {
    font-size: 24px;
  }
}
</style>
