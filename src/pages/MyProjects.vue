<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { activityService } from '@/services/activityService'
import type { Activity } from '@/entity/Activity'
import { ActivityStatus } from '@/entity/ActivityStatus'
import { ActivityType } from '@/entity/ActivityType'
import { useUserStore } from '@/stores/useUserStore'
import type { UploadProps, UploadFile } from 'element-plus'

const userStore = useUserStore()
const activities = ref<Activity[]>([])
const loading = ref(false)

const targetStatuses: ActivityStatus[] = [
  ActivityStatus.UnderReview,
  ActivityStatus.FailReview
]

const filtered = computed(() => activities.value.filter(a => targetStatuses.includes(a.status)))

const statusText = (s: ActivityStatus) => {
  switch (s) {
    case ActivityStatus.UnderReview: return '审核中'
    case ActivityStatus.FailReview: return '审核失败'
    default: return String(s)
  }
}

const statusType = (s: ActivityStatus): 'info'|'success'|'danger' => (
  s === ActivityStatus.UnderReview ? 'info' : 'danger'
)

const fetchMine = async () => {
  loading.value = true
  try {
    const res = await activityService.fetchMyActivities()
    activities.value = res.items || []
  } catch (e) {
    console.error(e)
    ElMessage.error('加载我的项目失败')
  } finally {
    loading.value = false
  }
}

const editDialogVisible = ref(false)
const editing = ref<Activity | null>(null)
const editForm = ref<Activity | null>(null)

const openEdit = (a: Activity) => {
  editing.value = a
  editForm.value = { ...a }
  editDialogVisible.value = true
}

const submitEdit = async () => {
  if (!editForm.value || !editing.value) return
  const next: any = { ...editForm.value }
  if (editing.value.status !== ActivityStatus.UnderReview
      && editing.value.status !== ActivityStatus.FailReview) {
    next.status = ActivityStatus.UnderReview
    next.reviewReason = ''
  }
  try {
    await activityService.updateActivity(editing.value.id, next)
    ElMessage.success('保存成功')
    editDialogVisible.value = false
    await fetchMine()
  } catch (e) {
    console.error(e)
    ElMessage.error('保存失败')
  }
}

const coverPreview = ref('')
const beforeImageUpload: UploadProps['beforeUpload'] = (rawFile) => {
  if (!rawFile.type.startsWith('image/')) {
    ElMessage.error('只能上传图片文件!')
    return false
  }
  if (rawFile.size / 1024 / 1024 > 20) {
    ElMessage.error('图片大小不能超过 20MB!')
    return false
  }
  return true
}
const handleEditCoverChange: UploadProps['onChange'] = (uploadFile: UploadFile) => {
  if (uploadFile.raw) {
    const reader = new FileReader()
    reader.onload = (e) => {
      coverPreview.value = String(e.target?.result || '')
    }
    reader.readAsDataURL(uploadFile.raw)
    if (editForm.value) {
      ;(editForm.value as any).coverFile = uploadFile.raw
    }
  }
}

const revoke = async (a: Activity) => {
  try {
    await ElMessageBox.confirm('确认撤销该项目的审核吗？','撤销确认',{ type: 'warning' })
    const next = { ...a, status: ActivityStatus.EnrollmentNotStart, reviewReason: '' }
    await activityService.updateActivity(a.id, next)
    ElMessage.success('已撤销审核')
    await fetchMine()
  } catch (e:any) {
    if (e !== 'cancel') {
      console.error(e)
      ElMessage.error('撤销失败')
    }
  }
}

const resubmit = async (a: Activity) => {
  try {
    const next = { ...a, status: ActivityStatus.UnderReview, reviewReason: '' }
    await activityService.updateActivity(a.id, next)
    ElMessage.success('已重新提交审核')
    await fetchMine()
  } catch (e) {
    console.error(e)
    ElMessage.error('提交失败')
  }
}

onMounted(
  fetchMine
)
</script>

<template>
  <div class="my-projects">
    <el-card class="page-header">
      <div class="title">我的项目</div>
      <div class="subtitle">仅显示审核相关的项目状态</div>
    </el-card>

    <el-card>
      <el-table :data="filtered" v-loading="loading" style="width: 100%">
        <el-table-column prop="name" label="名称" min-width="160" />
        <el-table-column label="负责人" width="120">
          <template #default>
            {{ userStore.username.value }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="260">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="openEdit(row)">修改</el-button>
            <el-button v-if="row.status === ActivityStatus.UnderReview" size="small" type="warning" @click="revoke(row)">撤销</el-button>
            <el-button v-if="row.status === ActivityStatus.FailReview" size="small" type="success" @click="resubmit(row)">重新提交审核</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="editDialogVisible" title="修改项目" width="740px">
      <div v-if="editForm">
        <el-form :model="editForm" label-width="110px">
          <el-form-item label="名称">
            <el-input v-model="editForm.name" />
          </el-form-item>
          <el-form-item label="类型">
            <el-select v-model="editForm.type" style="width:100%">
              <el-option :value="ActivityType.COMMUNITY_SERVICE" label="社区服务" />
              <el-option :value="ActivityType.CULTURE_SERVICE" label="文化服务" />
              <el-option :value="ActivityType.EMERGENCY_RESCUE" label="应急救援" />
              <el-option :value="ActivityType.ANIMAL_PROTECTION" label="动物保护" />
              <el-option :value="ActivityType.POVERTY_ASSISTANCE" label="扶贫助困" />
              <el-option :value="ActivityType.ELDERLY_DISABLED_ASSISTANCE" label="扶老助残" />
              <el-option :value="ActivityType.MEDICAL_ASSISTANCE" label="慰病助医" />
              <el-option :value="ActivityType.ORPHAN_EDUCATION_ASSISTANCE" label="救孤助学" />
            </el-select>
          </el-form-item>
          <el-form-item label="描述">
            <el-input type="textarea" v-model="editForm.description" />
          </el-form-item>
          <el-form-item label="封面">
            <el-upload :auto-upload="false" :show-file-list="false" :on-change="handleEditCoverChange" :before-upload="beforeImageUpload" accept="image/*">
              <img v-if="coverPreview || editForm.CoverImage" :src="coverPreview || editForm.CoverImage" style="width:120px;height:120px;object-fit:cover" />
              <el-button v-else type="primary" text>选择图片</el-button>
            </el-upload>
          </el-form-item>
          <el-form-item label="报名开始">
            <el-date-picker v-model="editForm.EnrollmentStartTime" type="datetime" style="width:100%" />
          </el-form-item>
          <el-form-item label="报名结束">
            <el-date-picker v-model="editForm.EnrollmentEndTime" type="datetime" style="width:100%" />
          </el-form-item>
          <el-form-item label="开始时间">
            <el-date-picker v-model="editForm.startTime" type="datetime" style="width:100%" />
          </el-form-item>
          <el-form-item label="结束时间">
            <el-date-picker v-model="editForm.endTime" type="datetime" style="width:100%" />
          </el-form-item>
          <el-form-item label="最大人数">
            <el-input-number v-model="editForm.maxParticipants" :min="1" />
          </el-form-item>
          <el-form-item label="志愿时长">
            <el-input-number v-model="editForm.duration" :min="0.5" />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="editDialogVisible=false">取消</el-button>
        <el-button type="primary" @click="submitEdit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page-header { margin-bottom: 16px; }
.title { font-weight: 600; font-size: 18px; }
.subtitle { color: var(--el-text-color-secondary); font-size: 12px; }
</style>
