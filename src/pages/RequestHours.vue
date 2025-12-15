<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { activityService } from '../services/activityService'
import { ActivityType } from '../entity/ActivityType'
import { getActivityTypeOptions } from '@/util/util'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import type { UploadProps, UploadUserFile, FormInstance } from 'element-plus'
import type { Activity } from '@/entity/Activity'
import { ActivityStatus } from '@/entity/ActivityStatus'

const activeTab = ref('submit')
const loading = ref(false)
const myRequests = ref<Activity[]>([])

// Form
const formRef = ref<FormInstance>()
const labelPosition = ref('right')
const form = reactive({
  name: '',
  functionary: '', // 证明人
  type: '' as ActivityType | '',
  description: '',
  startTime: '',
  endTime: '',
  duration: 0,
  files: [] as UploadUserFile[]
})

const activityTypes = getActivityTypeOptions()

const rules = {
  name: [{ required: true, message: '请输入活动名称', trigger: 'blur' }],
  functionary: [{ required: true, message: '请输入证明人/负责人', trigger: 'blur' }],
  type: [{ required: true, message: '请选择活动类型', trigger: 'change' }],
  description: [{ required: true, message: '请输入活动简述', trigger: 'blur' }],
  startTime: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
  endTime: [{ required: true, message: '请选择结束时间', trigger: 'change' }],
  duration: [{ required: true, message: '请输入志愿时长', trigger: 'change' }]
}

const handleFileChange: UploadProps['onChange'] = (file, fileList) => {
  void file
  form.files = fileList
}

const handleRemove: UploadProps['onRemove'] = (file, fileList) => {
  void file
  form.files = fileList
}

const submitForm = async (formEl: FormInstance | undefined) => {
  if (!formEl) return
  await formEl.validate(async (valid) => {
    if (valid) {
      if (form.files.length === 0) {
        ElMessage.warning('请至少上传一份证明材料')
        return
      }
      loading.value = true
      try {
        await activityService.requestHours({
          ...form,
          files: form.files.map(f => f.raw)
        })
        ElMessage.success('申请提交成功，请等待审核')
        formEl.resetFields()
        form.files = []
        activeTab.value = 'list'
        fetchMyRequests()
      } catch (e) {
        console.error(e)
        ElMessage.error('提交失败')
      } finally {
        loading.value = false
      }
    }
  })
}

const fetchMyRequests = async () => {
  loading.value = true
  try {
    myRequests.value = await activityService.getMyRequests()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const getStatusType = (status: ActivityStatus) => {
    // Reuse logic or map specifically for requests
    // Usually 'UnderReview' -> warning, 'ActivityEnded' (Approved?) -> success? 
    // Assuming backend returns standard statuses.
    // If approved, maybe it gets a specific status or just added to hours. 
    // Let's assume 'ActivityEnded' means Approved for these requests, or use custom logic.
    // But usually "FailReview" is danger.
    if (status === ActivityStatus.FailReview) return 'danger'
    if (status === ActivityStatus.UnderReview) return 'warning'
    return 'success' // Default to success for others (Approved)
}

const getStatusText = (status: ActivityStatus) => {
    if (status === ActivityStatus.FailReview) return '审核未通过'
    if (status === ActivityStatus.UnderReview) return '审核中'
    return '已通过'
}

const checkScreenSize = () => {
  labelPosition.value = window.innerWidth <= 768 ? 'top' : 'right'
}

onMounted(() => {
  checkScreenSize()
  window.addEventListener('resize', checkScreenSize)
  fetchMyRequests()
})

onUnmounted(() => {
  window.removeEventListener('resize', checkScreenSize)
})
</script>

<template>
  <div class="request-hours-page">
    <el-card class="page-header">
      <h1 class="page-title">志愿时长申请</h1>
      <p class="subtitle">提交校外或其他志愿活动证明，申请增加志愿时长</p>
    </el-card>

    <div class="content-container">
      <el-tabs v-model="activeTab" class="custom-tabs">
        <el-tab-pane label="提交申请" name="submit">
          <el-card>
            <el-form
              ref="formRef"
              :model="form"
              :rules="rules"
              label-width="100px"
              :label-position="labelPosition"
            >
              <el-form-item label="活动名称" prop="name">
                <el-input v-model="form.name" placeholder="请输入活动名称" />
              </el-form-item>

              <el-form-item label="负责人" prop="functionary">
                <el-input v-model="form.functionary" placeholder="证明人或负责人姓名" />
              </el-form-item>

              <el-form-item label="活动类型" prop="type">
                <el-select v-model="form.type" placeholder="请选择类型" style="width: 100%">
                  <el-option
                    v-for="item in activityTypes"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </el-form-item>

              <el-form-item label="活动时间" required>
                <el-col :span="11">
                  <el-form-item prop="startTime">
                    <el-date-picker
                      v-model="form.startTime"
                      type="datetime"
                      placeholder="开始时间"
                      style="width: 100%"
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="2" class="text-center">
                  <span class="text-gray-500">-</span>
                </el-col>
                <el-col :span="11">
                  <el-form-item prop="endTime">
                    <el-date-picker
                      v-model="form.endTime"
                      type="datetime"
                      placeholder="结束时间"
                      style="width: 100%"
                    />
                  </el-form-item>
                </el-col>
              </el-form-item>

              <el-form-item label="申请时长" prop="duration">
                <el-input-number v-model="form.duration" :min="0.5" :step="0.5" />
                <span class="ml-2">小时</span>
              </el-form-item>

              <el-form-item label="活动简述" prop="description">
                <el-input type="textarea" v-model="form.description" :rows="3" />
              </el-form-item>

              <el-form-item label="证明材料">
                <el-upload
                  v-model:file-list="form.files"
                  action="#"
                  list-type="picture-card"
                  :auto-upload="false"
                  :on-change="handleFileChange"
                  :on-remove="handleRemove"
                  multiple
                >
                  <el-icon><Plus /></el-icon>
                </el-upload>
                <div class="upload-tip">请上传活动照片或相关证明文件</div>
              </el-form-item>

              <el-form-item>
                <el-button type="primary" @click="submitForm(formRef)" :loading="loading" class="submit-btn">提交申请</el-button>
              </el-form-item>
            </el-form>
          </el-card>
        </el-tab-pane>

        <el-tab-pane label="申请记录" name="list">
          <div class="request-list" v-loading="loading">
             <el-empty v-if="myRequests.length === 0" description="暂无申请记录" />
             <div v-else class="card-list">
                <el-card v-for="req in myRequests" :key="req.id" class="request-card" shadow="hover">
                    <div class="card-header">
                        <span class="req-name">{{ req.name }}</span>
                        <el-tag :type="getStatusType(req.status)" effect="dark" size="small">{{ getStatusText(req.status) }}</el-tag>
                    </div>
                    <div class="card-body">
                        <div class="info-row"><span class="label">时间:</span> {{ new Date(req.startTime).toLocaleDateString() }}</div>
                        <div class="info-row"><span class="label">时长:</span> {{ req.duration }} 小时</div>
                        <div class="info-row"><span class="label">类型:</span> {{ req.type }}</div>
                        <div class="info-row desc"><span class="label">描述:</span> {{ req.description }}</div>
                        <div v-if="req.status === ActivityStatus.FailReview && req.rejectedReason" class="reject-reason">
                            <span class="label">拒绝原因:</span> {{ req.rejectedReason }}
                        </div>
                    </div>
                </el-card>
             </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<style scoped>
.request-hours-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
}

.subtitle {
  color: #909399;
  font-size: 14px;
  margin-top: 8px;
}

.upload-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 8px;
}

.submit-btn {
    width: 100%;
}

.request-card {
    margin-bottom: 16px;
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid #ebeef5;
}

.req-name {
    font-weight: 600;
    font-size: 16px;
}

.info-row {
    margin-bottom: 6px;
    font-size: 14px;
    color: #606266;
}

.info-row .label {
    color: #909399;
    margin-right: 8px;
}

.desc {
    white-space: pre-wrap;
}

.reject-reason {
    margin-top: 10px;
    padding: 8px;
    background-color: #fef0f0;
    border-radius: 4px;
    color: #f56c6c;
    font-size: 14px;
}

.text-center {
    text-align: center;
}

.ml-2 {
    margin-left: 8px;
}

@media (max-width: 768px) {
  .request-hours-page {
    padding: 10px;
  }
  
  /* Adjust date picker layout on mobile */
  :deep(.el-col-11), :deep(.el-col-2) {
      width: 100%;
      max-width: 100%;
      flex: 0 0 100%;
      margin-bottom: 10px;
  }
  
  :deep(.el-col-2) {
      display: none; /* Hide the dash separator on mobile */
  }
}
</style>
