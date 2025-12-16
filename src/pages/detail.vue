<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Timer, User, Document, Download } from '@element-plus/icons-vue'
import { activityService } from '@/services/activityService'
import type { Activity } from '@/entity/Activity'
import { ActivityStatus } from '@/entity/ActivityStatus'
import { useUserStore } from '@/stores/useUserStore'
import { getActivityTypeLabel, getActivityStatusLabel } from '@/util/util'
import defaultActivityImage from '@/image/activity-card-bg.png'


const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const activity = ref<Activity | null>(null)
const loading = ref(true)
const enrolling = ref(false)
const isEnrolled = computed(() => {
  const sn = userStore.studentNo.value
  return !!activity.value?.participants?.includes(sn)
})
const canUnenroll = computed(() => {
  if (!activity.value) return false
  const endTs = activity.value.EnrollmentEndTime ? new Date(activity.value.EnrollmentEndTime).getTime() : 0
  const nowTs = Date.now()
  const notFunctionary = activity.value.functionary !== userStore.studentNo.value
  return isEnrolled.value && notFunctionary && nowTs <= endTs
})
const functionaryName = ref<string>('')

// Fetch activity details
const fetchActivity = async () => {
  const id = route.params.id as string
  if (!id) {
    ElMessage.error('未找到活动ID')
    return
  }

  loading.value = true
  try {
    const data = await activityService.getActivityById(id)
    if (data) {
      activity.value = data
      if (data.functionary) {
        functionaryName.value = data.functionary
      }
    } else {
      console.warn(`Activity with id ${id} not found`)
      ElMessage.error({
        message: '未找到该活动',
        duration: 3000
      })
      // Wait a moment before redirecting so user can see the message
      setTimeout(() => {
        router.push('/app/activities')
      }, 1500)
    }
  } catch (error) {
    console.error('Failed to fetch activity:', error)
    ElMessage.error({
      message: '加载活动详情失败，请检查网络连接后重试',
      duration: 3000
    })
  } finally {
    loading.value = false
  }
}

// Handle enrollment
const handleToggleEnroll = async () => {
  if (!activity.value) return

  if (!userStore.isLoggedIn.value) {
    ElMessage.warning('请先登录')
    await router.push('/')
    return
  }

  // Prevent functionary from unenrolling
  if (isEnrolled.value && activity.value.functionary === userStore.studentNo.value) {
    ElMessage.warning('负责人无法退出自己负责的项目')
    return
  }

  try {
    if (!isEnrolled.value) {
      await ElMessageBox.confirm('确定要报名参加该活动吗？', '报名确认', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      })
      enrolling.value = true
      const response = await activityService.enrollActivity(activity.value.id)
      if (response.code === 200) {
        ElMessage.success('报名成功')
        await fetchActivity()
      } else {
        ElMessage.error(response.message || '报名失败')
      }
    } else {
      if (!canUnenroll.value) {
        ElMessage.warning('报名已结束或负责人账号，无法取消报名')
        return
      }
      await ElMessageBox.confirm('确定要取消报名吗？', '取消确认', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
      enrolling.value = true
      const response = await activityService.unenrollActivity(activity.value.id)
      if (response.code === 200) {
        ElMessage.success('已取消报名')
        await fetchActivity()
      } else {
        ElMessage.error(response.message || '取消报名失败')
      }
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Enrollment toggle failed:', error)
      ElMessage.error('操作失败')
    }
  } finally {
    enrolling.value = false
  }
}

// Helpers
const formatDate = (dateString: string | undefined) => {
  if (!dateString) return '暂无'
  return new Date(dateString).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getStatusText = getActivityStatusLabel

const getTypeText = getActivityTypeLabel

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
  if (isEnrolled.value) return canUnenroll.value
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
        <el-image
          :src="activity.CoverImage || defaultActivityImage"
          class="banner-image"
          fit="cover"
          :alt="activity.name"
          lazy
        >
          <template #placeholder>
            <div class="banner-image" />
          </template>
          <template #error>
            <img :src="defaultActivityImage" class="banner-image" alt="" />
          </template>
        </el-image>
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
                <div>开始: {{ formatDate(activity.startTime) }}</div>
                <div>预计结束: {{ formatDate(activity.expectedEndTime) }}</div>
                <div>实际结束: {{ activity.endTime ? formatDate(activity.endTime) : '活动未结束' }}</div>
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
                :disabled="!canEnroll && !canUnenroll"
                :loading="enrolling"
                @click="handleToggleEnroll"
              >
                {{ isEnrolled 
                  ? (activity.functionary === userStore.studentNo.value 
                    ? '负责人(不可退出)' 
                    : (canUnenroll ? '取消报名' : '报名结束(不可取消)')) 
                  : (canEnroll ? '立即报名' : getStatusText(activity.status)) }}
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
    gap: 16px;
  }
  
  .banner-section {
    height: 200px;
    margin-bottom: 20px;
  }
  
  .activity-title {
    font-size: 24px;
    margin-bottom: 10px;
  }
  
  .banner-overlay {
    padding: 20px;
  }
}

@media (max-width: 600px) {
  .detail-page {
    padding: 10px;
  }

  .banner-section {
    height: 180px;
    border-radius: 8px;
  }

  .activity-title {
    font-size: 20px;
  }
  
  .activity-meta {
    flex-wrap: wrap;
    gap: 8px;
  }
  
  /* Make tags smaller */
  .activity-meta .el-tag {
    height: 24px;
    padding: 0 8px;
    font-size: 12px;
  }

  .info-column {
    order: 2; /* Put info after description if desired, or keep as is. Usually info is important so keep it top */
  }

  .action-area {
    margin-top: 20px;
  }
  
  .enroll-btn {
    height: 40px;
    font-size: 14px;
  }
  
  .description-card {
    min-height: auto;
  }
}
</style>
