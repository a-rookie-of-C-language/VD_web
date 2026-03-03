<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Timer, User, Document, Download } from '@element-plus/icons-vue'
import { activityService } from '@/services/activityService'
import type { Activity } from '@/entity/Activity'
import { ActivityStatus } from '@/entity/ActivityStatus'
import { useUserStore } from '@/stores/useUserStore'
import { getActivityTypeLabel, getActivityStatusLabel, getAttachmentUrl, getCoverImageUrl } from '@/util/util'
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

const currentAttachments = computed(() => {
  const act = activity.value as any
  if (!act) return []
  return act.Attachment || act.attachment || act.attachments || []
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
          :src="activity.CoverImage ? getCoverImageUrl(activity.CoverImage) : defaultActivityImage"
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
          <el-card class="info-card mt-4" shadow="hover" v-if="currentAttachments && currentAttachments.length > 0">
            <template #header>
              <div class="card-header">
                <span>附件下载</span>
              </div>
            </template>
            <div class="attachment-list">
              <div v-for="(file, index) in currentAttachments" :key="index" class="attachment-item">
                <el-icon><Document /></el-icon>
                <el-link :href="getAttachmentUrl(file)" target="_blank" type="primary" :underline="false" class="filename">
                  {{ file.split('/').pop() || `附件 ${index + 1}` }}
                </el-link>
                <el-link :href="getAttachmentUrl(file)" target="_blank" type="primary" :underline="false">
                  <el-button link type="primary" size="small">
                    <el-icon><Download /></el-icon> 下载
                  </el-button>
                </el-link>
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
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  padding: 30px 5%;
}
.page-header {
  max-width: 1200px;
  margin: 0 auto 24px;
  display: flex;
  align-items: center;
}
.back-btn {
  font-size: 16px;
  color: #64748b;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 20px;
  transition: all 0.3s ease;
}
.back-btn:hover {
  color: var(--brand-600);
  background: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}
.content-container { max-width: 1200px; margin: 0 auto; animation: fadeUp 0.5s ease; }
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
.banner-section {
  position: relative;
  height: 360px;
  border-radius: 24px;
  overflow: hidden;
  margin-bottom: 30px;
  box-shadow: 0 20px 40px -10px rgba(0,0,0,0.15);
}
.banner-image { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s ease; }
.banner-section:hover .banner-image { transform: scale(1.03); }
.banner-overlay {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  padding: 40px 30px 30px;
  background: linear-gradient(to top, rgba(15, 23, 42, 0.9) 0%, rgba(15, 23, 42, 0.4) 60%, transparent 100%);
  color: white;
  backdrop-filter: blur(4px);
}
.activity-title {
  font-size: 38px;
  margin: 0 0 16px 0;
  font-weight: 800;
  letter-spacing: -0.5px;
  text-shadow: 0 2px 8px rgba(0,0,0,0.4);
}
.activity-meta { display: flex; gap: 12px; align-items: center; }
.main-content {
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 30px;
}
.info-card {
  border-radius: 20px;
  border: none !important;
  box-shadow: 0 10px 30px -5px rgba(0,0,0,0.08);
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
}
.card-header { font-weight: 700; font-size: 18px; color: #1e293b; display: flex; align-items: center; gap: 8px; }
.info-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 24px;
  line-height: 1.6;
  padding: 12px;
  background: #f8fafc;
  border-radius: 12px;
  transition: background 0.3s;
}
.info-item:hover { background: #f1f5f9; }
.info-item .el-icon { margin-top: 2px; margin-right: 12px; color: var(--brand-500); font-size: 18px; }
.label { color: #64748b; margin-right: 8px; font-weight: 500; white-space: nowrap; }
.value { color: #0f172a; font-weight: 600; }
.time-block { display: flex; flex-direction: column; color: #0f172a; font-size: 14px; font-weight: 500; }
.to { color: #94a3b8; font-size: 12px; margin: 4px 0; font-weight: normal; }
.ml-2 { margin-left: 8px; }
.mt-4 { margin-top: 20px; }
.action-area { margin-top: 30px; }
.enroll-btn {
  width: 100%;
  height: 54px;
  border-radius: 16px;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 1px;
  background: linear-gradient(135deg, var(--brand-500), var(--brand-600));
  border: none;
  box-shadow: 0 8px 16px -4px rgba(var(--brand-500-rgb, 59, 130, 246), 0.4);
  transition: all 0.3s ease;
}
.enroll-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 12px 20px -4px rgba(var(--brand-500-rgb, 59, 130, 246), 0.5);
}
.enroll-btn:disabled { background: #cbd5e1; box-shadow: none; transform: none; }
.description-card {
  min-height: 400px;
  border-radius: 20px;
  border: none !important;
  box-shadow: 0 10px 30px -5px rgba(0,0,0,0.08);
  background: white;
  padding: 10px;
}
.section-title {
  font-size: 22px;
  margin: 0 0 24px 0;
  padding-bottom: 16px;
  border-bottom: 2px solid #f1f5f9;
  color: #1e293b;
  font-weight: 700;
}
.description-content {
  font-size: 16px;
  line-height: 1.8;
  color: #334155;
  white-space: pre-wrap;
}
.attachment-list { display: flex; flex-direction: column; gap: 12px; }
.attachment-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid transparent;
  transition: all 0.2s;
}
.attachment-item:hover { border-color: var(--brand-300); background: #f0f9ff; }
.attachment-item .el-icon { margin-right: 12px; color: var(--brand-500); font-size: 18px; }
.filename {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: #334155;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
@media (max-width: 900px) {
  .main-content { grid-template-columns: 1fr; gap: 24px; }
  .banner-section { height: 260px; margin-bottom: 24px; border-radius: 16px; }
  .activity-title { font-size: 28px; margin-bottom: 12px; }
  .banner-overlay { padding: 24px; }
}
@media (max-width: 600px) {
  .detail-page { padding: 16px; }
  .banner-section { height: 200px; }
  .activity-title { font-size: 22px; }
  .activity-meta { flex-wrap: wrap; gap: 8px; }
  .info-item { flex-direction: column; align-items: flex-start; }
  .info-item .el-icon { margin-bottom: 8px; }
}
</style>
