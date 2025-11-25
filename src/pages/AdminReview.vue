<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { activityService } from '@/services/activityService'
import { userService } from '@/services/userService'
import type { Activity } from '@/entity/Activity'
import { ActivityStatus } from '@/entity/ActivityStatus'

const loading = ref(false)
const activities = ref<Activity[]>([])
const nameMap = ref<Record<string, string>>({})

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

const detailVisible = ref(false)
const currentActivity = ref<Activity | null>(null)

const showDetail = (a: Activity) => {
  currentActivity.value = a
  detailVisible.value = true
}

const approve = async (a: Activity) => {
  try {
    await ElMessageBox.confirm('确认通过该项目审核吗？','审核通过',{ type: 'success' })
    await activityService.reviewActivity(a.id, true)
    ElMessage.success('已通过审核')
    detailVisible.value = false
    await fetchUnderReview()
  } catch (e:any) {
    if (e !== 'cancel') {
      console.error(e)
      ElMessage.error('操作失败')
    }
  }
}

const reject = async (a: Activity) => {
  let reason = ''
  try {
    await ElMessageBox.confirm('确认拒绝该项目审核吗？','审核拒绝',{ type: 'warning' })
    await activityService.reviewActivity(a.id, false)
    ElMessage.success('已拒绝')
    detailVisible.value = false
    await fetchUnderReview()
  } catch (e:any) {
    if (e !== 'cancel') {
      console.error(e)
      ElMessage.error('操作失败')
    }
  }
}

onMounted(fetchUnderReview)
</script>

<template>
  <div class="admin-review">
    <el-card class="page-header">
      <div class="title">管理员审核</div>
      <div class="subtitle">审核中的项目列表</div>
    </el-card>

    <el-card>
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
    </el-card>

    <el-dialog v-model="detailVisible" title="活动详情" width="700px">
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
            style="max-width: 100%; max-height: 300px; object-fit: contain" 
          />
          <span v-else>无封面</span>
        </el-descriptions-item>
        <el-descriptions-item label="附件" v-if="currentActivity.Attachment && currentActivity.Attachment.length">
          <div v-for="(file, index) in currentActivity.Attachment" :key="index">
            {{ file }}
          </div>
        </el-descriptions-item>
      </el-descriptions>
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
</style>

