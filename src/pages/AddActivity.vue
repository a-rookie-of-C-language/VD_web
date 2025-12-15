<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { activityService } from '../services/activityService'
import { ActivityType } from '../entity/ActivityType'
import { getActivityTypeOptions } from '@/util/util'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import type { UploadProps, UploadFile } from 'element-plus'
import { useUserStore } from '@/stores/useUserStore'

const router = useRouter()
const userStore = useUserStore()
const role = userStore.role
const studentNo = userStore.studentNo
const formRef = ref()
const form = reactive({
  name: '',
  type: '' as ActivityType | '',
  description: '',
  enrollmentStartTime: '',
  enrollmentEndTime: '',
  startTime: '',
  extendEndTime: '',
  maxParticipants: 10,
  coverImage: null as File | null,
  duration: 0,
})

const loading = ref(false)
const imageUrl = ref('')

const activityTypes = getActivityTypeOptions()

const rules = {
  name: [{ required: true, message: '请输入活动名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择活动类型', trigger: 'change' }],
  description: [{ required: true, message: '请输入活动描述', trigger: 'blur' }],
  enrollmentStartTime: [{ required: true, message: '请选择报名开始时间', trigger: 'change' }],
  enrollmentEndTime: [{ required: true, message: '请选择报名结束时间', trigger: 'change' }],
  startTime: [{ required: true, message: '请选择活动开始时间', trigger: 'change' }],
  expectedEndTime: [{ required: true, message: '请选择活动结束时间', trigger: 'change' }],
  duration:[{required: true, message: '请输入志愿时长', trigger: 'change'}]
}

onMounted(async () => {
  if (!userStore.currentUser) {
    await userStore.loadUserInfo()
  }
  if (role.value !== 'functionary') {
    ElMessage.warning('仅负责人可以发布活动')
    await router.push('/activities')
  }
})

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const pad = (n: number) => n.toString().padStart(2, '0')
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  const seconds = pad(date.getSeconds())
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+08:00`
}

const handleImageChange: UploadProps['onChange'] = (uploadFile: UploadFile) => {
  if (uploadFile.raw) {
    const reader = new FileReader()
    reader.onload = (e) => {
      imageUrl.value = String(e.target?.result || '')
    }
    reader.readAsDataURL(uploadFile.raw)
    form.coverImage = uploadFile.raw
  }
}

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

const handleSubmit = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid: boolean) => {
    if (!valid) return

    loading.value = true

    try {
      const activityData = {
        functionary: studentNo.value,
        name: form.name,
        type: form.type as ActivityType,
        description: form.description,
        enrollmentStartTime: formatDateTime(form.enrollmentStartTime),
        enrollmentEndTime: formatDateTime(form.enrollmentEndTime),
        startTime: formatDateTime(form.startTime),
        expectedEndTime: formatDateTime(form.extendEndTime),
        maxParticipants: form.maxParticipants,
        attachment: [],
        participants: [],
        duration: form.duration,
        coverFile: form.coverImage
      }

      await activityService.createActivity(activityData)
      ElMessage.success('活动创建成功!')
      await router.push('/activities')
    } catch (err: any) {
      console.error('Failed to create activity:', err)
      ElMessage.error(err.message || '创建活动失败')
    } finally {
      loading.value = false
    }
  })
}

const handleCancel = () => {
  router.back()
}
</script>

<template>
  <div class="add-activity-page">
    <el-card class="page-header">
      <h1 class="page-title">发布新活动</h1>
    </el-card>

    <el-card class="form-container">
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="120px"
        label-position="right"
      >
        <!-- Basic Info Section -->
        <el-divider content-position="left">
          <span class="section-title">基本信息</span>
        </el-divider>
        
        <el-form-item label="活动名称" prop="name">
          <el-input 
            v-model="form.name" 
            placeholder="请输入活动名称"
            clearable
          />
        </el-form-item>

        <el-form-item label="活动类型" prop="type">
          <el-select 
            v-model="form.type" 
            placeholder="请选择活动类型"
            clearable
            style="width: 100%"
          >
            <el-option
              v-for="type in activityTypes"
              :key="type.value"
              :label="type.label"
              :value="type.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="负责人(学号)">
          <el-input :model-value="studentNo" disabled />
        </el-form-item>

        <el-form-item label="活动描述" prop="description">
          <el-input 
            v-model="form.description" 
            type="textarea"
            :rows="4"
            placeholder="请输入活动详细描述"
          />
        </el-form-item>
        
        <el-form-item label="封面图片">
          <el-upload
            class="cover-uploader"
            :auto-upload="false"
            :show-file-list="false"
            :on-change="handleImageChange"
            :before-upload="beforeImageUpload"
            accept="image/*"
          >
            <img v-if="imageUrl" :src="imageUrl" class="cover-image"  alt=""/>
            <el-icon v-else class="cover-uploader-icon"><Plus /></el-icon>
          </el-upload>
          <div class="upload-tip">支持 jpg、png 格式,大小不超过 20MB</div>
        </el-form-item>

        <!-- Time & Capacity Section -->
        <el-divider content-position="left">
          <span class="section-title">时间与名额</span>
        </el-divider>
        
        <el-row :gutter="20">
          <el-col :span="12" :xs="24">
            <el-form-item label="报名开始时间" prop="enrollmentStartTime">
              <el-date-picker
                v-model="form.enrollmentStartTime"
                type="datetime"
                placeholder="选择报名开始时间"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12" :xs="24">
            <el-form-item label="报名结束时间" prop="enrollmentEndTime">
              <el-date-picker
                v-model="form.enrollmentEndTime"
                type="datetime"
                placeholder="选择报名结束时间"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12" :xs="24">
            <el-form-item label="活动开始时间" prop="startTime">
              <el-date-picker
                v-model="form.startTime"
                type="datetime"
                placeholder="选择活动开始时间"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12" :xs="24">
            <el-form-item label="活动结束时间" prop="endTime">
              <el-date-picker
                v-model="form.extendEndTime"
                type="datetime"
                placeholder="选择预期活动结束时间"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="最大参与人数" prop="maxParticipants" class="responsive-form-item">
          <div class="input-wrapper">
             <el-input-number
               v-model="form.maxParticipants" 
               :min="1"
               style="width: 100%; max-width: 200px"
             />
             <span class="hint-text"> 为0表示不限制人数</span>
          </div>
        </el-form-item>

        <el-form-item label="志愿时长" prop="duration">
          <el-input-number
              v-model="form.duration"
              :min="0.5"
              style="width: 100%; max-width: 200px"
          />
        </el-form-item>

        <el-form-item class="form-actions">
          <el-button type="primary" :loading="loading" @click="handleSubmit" class="action-btn">
            {{ loading ? '发布中...' : '发布活动' }}
          </el-button>
          <el-button @click="handleCancel" class="action-btn">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.add-activity-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
  color: var(--el-text-color-primary);
}

.form-container {
  padding: 20px;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--el-text-color-regular);
}

.cover-uploader {
  display: inline-block;
}

.cover-uploader :deep(.el-upload) {
  border: 1px dashed var(--el-border-color);
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: var(--el-transition-duration-fast);
  width: 178px;
  height: 178px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-uploader :deep(.el-upload:hover) {
  border-color: var(--el-color-primary);
}

.cover-uploader-icon {
  font-size: 28px;
  color: var(--el-text-color-placeholder);
}

.cover-image {
  width: 178px;
  height: 178px;
  object-fit: cover;
  display: block;
}

.upload-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 8px;
}

@media (max-width: 768px) {
  .add-activity-page {
    padding: 10px;
  }
  
  .form-container {
    padding: 10px;
  }
  
  .cover-uploader :deep(.el-upload) {
    width: 100%;
    max-width: 300px;
  }
  
  .cover-image {
    width: 100%;
    height: auto;
  }
  
  .input-wrapper {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }
  
  .hint-text {
    margin-top: 5px;
    font-size: 12px;
  }
  
  .form-actions {
    display: flex;
    flex-direction: column; 
  }
  
  .action-btn {
    width: 100%;
    margin: 5px 0 !important;
  }
}
</style>
