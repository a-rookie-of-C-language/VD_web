<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { activityService } from '@/services/activityService'
import { userService } from '@/services/userService'
import type { Activity } from '@/entity/Activity'
import { ActivityStatus } from '@/entity/ActivityStatus'

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
    <el-card class="page-header">
      <div class="title">管理员审核</div>
      <div class="subtitle">审核项目列表</div>
    </el-card>

    <el-card>
      <el-tabs v-model="activeTab">
        <el-tab-pane label="普通活动审核" name="normal">
          <el-table :data="activities" v-loading="loading" style="width:100%">
            <el-table-column prop="name" label="名称" min-width="160" />
            <el-table-column label="负责人" width="120">
              <template #default="{ row }">
                <el-link type="primary" @click="showDetail(row)">
                  {{ row.functionary }}
                </el-link>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="描述" min-width="200" />
            <el-table-column label="操作" width="220">
              <template #default="{ row }">
                <el-button size="small" type="success" @click="approve(row)">通过</el-button>
                <el-button size="small" type="danger" @click="reject(row)">拒绝</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="导入活动审核" name="imported">
          <el-table :data="pendingActivities" v-loading="loading" style="width:100%">
            <el-table-column prop="name" label="名称" min-width="160" />
            <el-table-column label="提交人" width="120">
              <template #default="{ row }">
                <el-link type="primary" @click="showDetail(row)">
                  {{ row.submittedBy || row.functionary }}
                </el-link>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="描述" min-width="200" />
            <el-table-column label="操作" width="220">
              <template #default="{ row }">
                <el-button size="small" type="success" @click="approve(row)">通过</el-button>
                <el-button size="small" type="danger" @click="reject(row)">拒绝</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="个人申请审核" name="personal">
          <el-table :data="personalRequests" v-loading="loading" style="width:100%">
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
            <el-table-column prop="description" label="描述" min-width="200" />
            <el-table-column label="操作" width="220">
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
        <div v-if="(activeTab === 'normal' ? activities : (activeTab === 'imported' ? pendingActivities : personalRequests)).length === 0" style="text-align: center; padding: 20px; color: #909399;">
          暂无审核中的项目
        </div>
        <el-card
          v-for="item in (activeTab === 'normal' ? activities : (activeTab === 'imported' ? pendingActivities : personalRequests))"
          :key="item.id"
          class="activity-card"
          shadow="hover"
        >
          <div class="card-header">
            <div class="card-title">{{ item.name }}</div>
            <div class="card-functionary">
              <el-link type="primary" @click="showDetail(item)">
                {{ item.functionary }}
              </el-link>
            </div>
          </div>
          <div class="card-description">{{ item.description }}</div>
          <div class="card-actions">
            <el-button size="small" type="success" @click="approve(item)" block>通过</el-button>
            <el-button size="small" type="danger" @click="reject(item)" block>拒绝</el-button>
          </div>
        </el-card>
      </div>
    </el-card>

    <el-dialog v-model="detailVisible" title="活动详情" width="90%" class="review-dialog">
      <el-descriptions :column="1" border v-if="currentActivity">
        <el-descriptions-item label="名称">{{ currentActivity.name }}</el-descriptions-item>
        <el-descriptions-item label="负责人">
          {{ currentActivity.functionary }}
        </el-descriptions-item>
        <el-descriptions-item label="类型">{{ currentActivity.type }}</el-descriptions-item>
        <el-descriptions-item label="描述">{{ currentActivity.description }}</el-descriptions-item>
        <el-descriptions-item label="报名时间">
          {{ currentActivity.EnrollmentStartTime }} 至 {{ currentActivity.EnrollmentEndTime }}
        </el-descriptions-item>
        <el-descriptions-item label="活动时间">
          {{ currentActivity.startTime }} 至 {{ currentActivity.endTime }}
        </el-descriptions-item>
        <el-descriptions-item label="人数限制">{{ currentActivity.maxParticipants }}</el-descriptions-item>
        <el-descriptions-item label="时长">{{ currentActivity.duration }} 小时</el-descriptions-item>
        <el-descriptions-item label="封面">
          <img 
            v-if="currentActivity.CoverImage" 
            :src="currentActivity.CoverImage"
            alt="活动封面"
            style="max-width: 100%; max-height: 300px; object-fit: contain"
          />
          <span v-else>无封面</span>
        </el-descriptions-item>
        <el-descriptions-item label="附件" v-if="currentActivity.Attachment && currentActivity.Attachment.length">
          <div v-for="(file, index) in currentActivity.Attachment" :key="index" class="attachment-item">
            <template v-if="file.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)">
               <el-image 
                 :src="file" 
                 :preview-src-list="[file]" 
                 fit="cover" 
                 class="attachment-img"
                 hide-on-click-modal
               />
            </template>
            <template v-else>
               <el-link :href="file" target="_blank" type="primary">{{ file.split('/').pop() || '下载附件' }}</el-link>
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
.page-header { margin-bottom: 16px; }
.title { font-weight: 600; font-size: 18px; }
.subtitle { color: var(--el-text-color-secondary); font-size: 12px; }
.review-dialog { max-width: 700px; margin: 0 auto; }

/* 卡片列表样式 */
.activity-card-list {
  display: none;
}

.activity-card {
  margin-bottom: 12px;
}

.card-header {
  margin-bottom: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-weight: 600;
  font-size: 16px;
  flex: 1;
}

.card-functionary {
  margin-left: 12px;
  white-space: nowrap;
}

.card-description {
  color: var(--el-text-color-secondary);
  font-size: 14px;
  margin-bottom: 12px;
  line-height: 1.5;
}

.card-actions {
  display: flex;
  gap: 8px;
}

.card-actions :deep(.el-button) {
  flex: 1;
}

/* 平板及小屏幕适配 */
@media (max-width: 768px) {
  .admin-review { padding: 12px; }

  .page-header { margin-bottom: 12px; }
  .title { font-size: 16px; }
  .subtitle { font-size: 11px; }

  /* 隐藏表格，显示卡片列表 */
  :deep(.el-table) { display: none; }

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

/* 手机屏幕适配 */
@media (max-width: 480px) {
  .admin-review { padding: 8px; }

  .page-header { margin-bottom: 10px; }
  .title { font-size: 14px; }
  .subtitle { font-size: 10px; }

  :deep(.el-card) {
    border-radius: 4px;
  }

  :deep(.el-button) {
    font-size: 12px !important;
    padding: 6px 12px !important;
  }

  :deep(.el-button.is-small) {
    font-size: 11px !important;
    padding: 4px 8px !important;
  }

  :deep(.el-descriptions__cell) {
    padding: 6px 8px !important;
  }

  :deep(.el-dialog) {
    width: 98% !important;
    margin: 0 auto !important;
    max-height: 90vh;
  }

  :deep(.el-dialog__body) {
    max-height: calc(90vh - 110px);
    overflow-y: auto;
    padding: 12px;
  }

  :deep(.el-descriptions) {
    font-size: 12px;
  }

  :deep(.el-descriptions__label) {
    font-size: 12px;
  }

  :deep(.el-descriptions__content) {
    font-size: 12px;
  }

  .card-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .card-title {
    font-size: 15px;
    margin-bottom: 8px;
  }

  .card-functionary {
    margin-left: 0;
  }

  .card-description {
    font-size: 13px;
  }
}

/* PC屏幕隐藏卡片列表 */
@media (min-width: 769px) {
  .activity-card-list { display: none; }
  :deep(.el-table) { display: table; }
}

.participants-section {
  margin-top: 20px;
  border-top: 1px solid #ebeef5;
  padding-top: 10px;
}
.participants-section h3 {
  font-size: 16px;
  margin-bottom: 10px;
  color: #303133;
}

.attachment-item {
  margin-bottom: 8px;
}

.attachment-img {
  width: 100px;
  height: 100px;
  border-radius: 4px;
  border: 1px solid #ebeef5;
}
</style>

