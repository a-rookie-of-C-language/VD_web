<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { activityService } from '@/services/activityService'
import { userService } from '@/services/userService'
import type { Activity } from '@/entity/Activity'
import { ActivityStatus } from '@/entity/ActivityStatus'
import { getAttachmentUrl } from '@/util/util'

const activeTab = ref('normal')
const loading = ref(false)
const activities = ref<Activity[]>([])
const pendingActivities = ref<Activity[]>([])
const personalRequests = ref<Activity[]>([])

const fetchUnderReview = async () => {
  loading.value = true
  try {
    const res = await activityService.getActivities({ status: ActivityStatus.UnderReview })
    activities.value = res.items || []
  } catch (e) {
    console.error(e)
    ElMessage.error('加载审核列表失败')
  } finally {
    loading.value = false
  }
}

const fetchPendingActivities = async () => {
  loading.value = true
  try {
    const res = await activityService.getPendingActivities()
    pendingActivities.value = res.items || []
  } catch (e) {
    console.error(e)
    ElMessage.error('加载导入审核列表失败')
  } finally {
    loading.value = false
  }
}

const fetchPersonalRequests = async () => {
  loading.value = true
  try {
    personalRequests.value = await activityService.getPendingRequests()
  } catch (e) {
    console.error(e)
    ElMessage.error('加载个人申请失败')
  } finally {
    loading.value = false
  }
}

const fetchData = () => {
  if (activeTab.value === 'normal') {
    fetchUnderReview()
  } else if (activeTab.value === 'imported') {
    fetchPendingActivities()
  } else {
    fetchPersonalRequests()
  }
}

watch(activeTab, fetchData)

const detailVisible = ref(false)
const currentActivity = ref<Activity | null>(null)

const currentAttachments = computed(() => {
  const act = currentActivity.value as any
  if (!act) return []
  return act.Attachment || act.attachment || act.attachments || []
})

const nameMap = ref<Record<string, string>>({})

const showDetail = (a: Activity) => {
  currentActivity.value = a
  detailVisible.value = true
  const ids = a.participants || []
  Promise.all(ids.map(async (id) => {
    if (!nameMap.value[id]) {
      const user = await userService.getUserByStudentNo(id)
      nameMap.value[id] = user?.username || id
    }
  })).catch(() => {})
}

const approve = async (a: Activity) => {
  try {
    await ElMessageBox.confirm('确认通过该项目审核吗？','审核通过',{ type: 'success' })
    if (activeTab.value === 'normal') {
      await activityService.reviewActivity(a.id, true)
    } else if (activeTab.value === 'imported') {
      await activityService.approvePendingActivity(a.id)
    } else {
      await activityService.reviewRequest(a.id, true)
    }
    ElMessage.success('已通过审核')
    detailVisible.value = false
    fetchData()
  } catch (e:any) {
    if (e !== 'cancel') {
      ElMessage.error('操作失败')
    }
  }
}

const reject = async (a: Activity) => {
  try {
    const { value } = await ElMessageBox.prompt('请输入拒绝原因', '审核拒绝', {
      confirmButtonText: '确认拒绝',
      cancelButtonText: '取消',
      inputPattern: /\S+/,
      inputErrorMessage: '拒绝原因不能为空',
      type: 'warning'
    })
    
    if (activeTab.value === 'normal') {
      await activityService.reviewActivity(a.id, false, value)
    } else if (activeTab.value === 'imported') {
      await activityService.rejectPendingActivity(a.id, value)
    } else {
      await activityService.reviewRequest(a.id, false, value)
    }
    ElMessage.success('已拒绝')
    detailVisible.value = false
    fetchData()
  } catch (e:any) {
    if (e !== 'cancel') {
      console.error(e)
      ElMessage.error('操作失败')
    }
  }
}

onMounted(fetchData)
</script>

<template>
  <div class="admin-review">
    <div class="page-header">
      <div class="header-content">
        <h1 class="title">管理员审核</h1>
        <p class="subtitle">审核项目列表，管理志愿活动申请</p>
      </div>
      <div class="header-decoration">
        <div class="circle circle-1"></div>
        <div class="circle circle-2"></div>
      </div>
    </div>

    <el-card class="list-card" shadow="hover">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="普通活动审核" name="normal">
          <el-table :data="activities" v-loading="loading" style="width:100%" class="hidden-xs-only">
            <el-table-column prop="name" label="名称" min-width="160" />
            <el-table-column label="负责人" width="120">
              <template #default="{ row }">
                <el-link type="primary" @click="showDetail(row)">
                  {{ row.functionary }}
                </el-link>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
            <el-table-column label="操作" width="220" fixed="right">
              <template #default="{ row }">
                <el-button size="small" type="success" @click="approve(row)">通过</el-button>
                <el-button size="small" type="danger" @click="reject(row)">拒绝</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="导入活动审核" name="imported">
          <el-table :data="pendingActivities" v-loading="loading" style="width:100%" class="hidden-xs-only">
            <el-table-column prop="name" label="名称" min-width="160" />
            <el-table-column label="提交人" width="120">
              <template #default="{ row }">
                <el-link type="primary" @click="showDetail(row)">
                  {{ row.submittedBy || row.functionary }}
                </el-link>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
            <el-table-column label="操作" width="220" fixed="right">
              <template #default="{ row }">
                <el-button size="small" type="success" @click="approve(row)">通过</el-button>
                <el-button size="small" type="danger" @click="reject(row)">拒绝</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="个人申请审核" name="personal">
          <el-table :data="personalRequests" v-loading="loading" style="width:100%" class="hidden-xs-only">
            <el-table-column prop="name" label="名称" min-width="160" />
            <el-table-column label="申请人" width="120">
              <template #default="{ row }">
                <el-link type="primary" @click="showDetail(row)">
                  {{ row.functionary }}
                </el-link>
              </template>
            </el-table-column>
            <el-table-column label="时长" width="100">
               <template #default="{ row }">
                   {{ row.duration }} 小时
               </template>
            </el-table-column>
            <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
            <el-table-column label="操作" width="220" fixed="right">
              <template #default="{ row }">
                <el-button size="small" type="success" @click="approve(row)">通过</el-button>
                <el-button size="small" type="danger" @click="reject(row)">拒绝</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>

      <!-- 移动端卡片列表 (共享) -->
      <div class="activity-card-list" v-loading="loading">
        <div v-if="(activeTab === 'normal' ? activities : (activeTab === 'imported' ? pendingActivities : personalRequests)).length === 0" class="empty-text">
          暂无审核中的项目
        </div>
        <div
          v-for="item in (activeTab === 'normal' ? activities : (activeTab === 'imported' ? pendingActivities : personalRequests))"
          :key="item.id"
          class="activity-card-item"
        >
          <div class="card-header">
            <div class="card-title">{{ item.name }}</div>
            <el-tag size="small" effect="dark" type="warning">审核中</el-tag>
          </div>
          <div class="card-body">
             <div class="info-row">
               <span class="label">负责人:</span>
               <span class="value">{{ item.functionary }}</span>
             </div>
             <div class="info-row">
               <span class="label">描述:</span>
               <span class="value">{{ item.description }}</span>
             </div>
          </div>
          <div class="card-actions">
            <el-button size="small" type="success" @click="approve(item)" plain>通过</el-button>
            <el-button size="small" type="primary" @click="showDetail(item)" plain>详情</el-button>
            <el-button size="small" type="danger" @click="reject(item)" plain>拒绝</el-button>
          </div>
        </div>
      </div>
    </el-card>

    <el-dialog v-model="detailVisible" title="活动详情" width="90%" class="review-dialog custom-dialog">
      <el-descriptions :column="1" border v-if="currentActivity">
        <el-descriptions-item label="名称">{{ currentActivity.name }}</el-descriptions-item>
        <el-descriptions-item label="负责人">
          {{ currentActivity.functionary }}
        </el-descriptions-item>
        <el-descriptions-item label="类型">{{ currentActivity.type }}</el-descriptions-item>
        <el-descriptions-item label="描述">{{ currentActivity.description }}</el-descriptions-item>
        <el-descriptions-item v-if="currentActivity.EnrollmentStartTime" label="报名时间">
          {{ currentActivity.EnrollmentStartTime }} 至 {{ currentActivity.EnrollmentEndTime }}
        </el-descriptions-item>
        <el-descriptions-item label="活动时间">
          {{ currentActivity.startTime }} 至 {{ currentActivity.endTime }}
        </el-descriptions-item>
        <el-descriptions-item v-if="currentActivity.maxParticipants" label="人数限制">{{ currentActivity.maxParticipants }}</el-descriptions-item>
        <el-descriptions-item label="时长">{{ currentActivity.duration }} 小时</el-descriptions-item>
        <el-descriptions-item label="封面">
          <el-image
            v-if="currentActivity.CoverImage"
            :src="currentActivity.CoverImage"
            :preview-src-list="[currentActivity.CoverImage]"
            fit="contain"
            style="max-width: 100%; max-height: 300px"
          >
            <template #placeholder>
              <div style="width: 100%; height: 200px; background: #f5f5f5" />
            </template>
          </el-image>
          <span v-else>无封面</span>
        </el-descriptions-item>
        <el-descriptions-item label="附件" v-if="currentAttachments.length">
          <div v-for="(file, index) in currentAttachments" :key="index" class="attachment-item">
            <template v-if="file.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)">
               <el-image 
                 :src="getAttachmentUrl(file, 'preview')" 
                 :preview-src-list="[getAttachmentUrl(file, 'preview')]" 
                 fit="cover" 
                 class="attachment-img"
                 hide-on-click-modal
               />
            </template>
            <template v-else>
               <el-link :href="getAttachmentUrl(file)" target="_blank" type="primary">{{ file.split('/').pop() || '下载附件' }}</el-link>
            </template>
          </div>
        </el-descriptions-item>
      </el-descriptions>
      
      <div v-if="currentActivity && currentActivity.participants && currentActivity.participants.length > 0" class="participants-section">
        <h3>导入/报名名单 (共 {{ currentActivity.participants.length }} 人)</h3>
        <el-table :data="currentActivity.participants.map(id => ({ id, username: nameMap[id] || id }))" height="250" stripe style="width: 100%" border>
            <el-table-column type="index" width="60" label="序号" />
            <el-table-column prop="id" label="学号" />
            <el-table-column prop="username" label="姓名" />
        </el-table>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="detailVisible = false">关闭</el-button>
          <el-button type="success" @click="approve(currentActivity!)">通过</el-button>
          <el-button type="danger" @click="reject(currentActivity!)">拒绝</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.admin-review {
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
  color: white;
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

.list-card {
  border-radius: 12px;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.attachment-item {
  margin-bottom: 10px;
}

.attachment-img {
  max-width: 100px;
  max-height: 100px;
  border-radius: 4px;
  border: 1px solid #eee;
  display: block;
}

.img-wrapper {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.file-name {
  font-size: 12px;
  color: #606266;
  margin-top: 4px;
  word-break: break-all;
}

.review-dialog { max-width: 700px; margin: 0 auto; }

/* Mobile Card List */
.activity-card-list {
  display: none;
}

.activity-card-item {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  background: #fff;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f2f5;
}

.card-title {
  font-weight: 600;
  font-size: 16px;
  color: #303133;
}

.info-row {
  font-size: 14px;
  color: #606266;
  margin-bottom: 6px;
  display: flex;
}

.info-row .label {
  color: #909399;
  margin-right: 8px;
  min-width: 50px;
}

.info-row .value {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-actions {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}

.card-actions :deep(.el-button) {
  flex: 1;
}

.empty-text {
  text-align: center;
  padding: 30px 0;
  color: #909399;
}

/* Responsive */
@media (max-width: 768px) {
  .admin-review { padding: 10px; }
  
  .page-header {
    padding: 24px;
    border-radius: 8px;
  }
  
  .header-decoration {
    display: none;
  }
  
  .title {
    font-size: 24px;
  }
  
  .subtitle {
    font-size: 14px;
  }
  
  /* Hide table, show list */
  .hidden-xs-only { display: none !important; }
  .activity-card-list { display: block; }

  :deep(.el-dialog) {
    width: 95% !important;
    margin: 0 auto !important;
  }

  :deep(.el-descriptions__cell) {
    display: block;
    padding: 8px !important;
  }

  :deep(.el-descriptions__item) {
    display: flex;
    flex-direction: column;
  }

  :deep(.el-descriptions__label) {
    font-weight: 600;
    margin-bottom: 4px;
  }
}
</style>
