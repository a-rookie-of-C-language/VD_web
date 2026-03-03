<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { ElMessage} from 'element-plus'
import { ChatDotRound, RefreshLeft } from '@element-plus/icons-vue'
import { suggestionService, type Suggestion } from '@/services/suggestionService'
import { useUserStore } from '@/stores/useUserStore'
import PageHeader from '@/components/PageHeader.vue'

const userStore = useUserStore()
const isAdmin = computed(() => ['admin', 'superAdmin'].includes(userStore.role.value || ''))

const suggestions = ref<Suggestion[]>([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const activeTab = ref('list')

const statusFilter = ref('')

const createForm = ref({
  title: '',
  content: ''
})
const submitting = ref(false)

const replyDialogVisible = ref(false)
const currentSuggestion = ref<Suggestion | null>(null)
const replyContent = ref('')
const replying = ref(false)

const fetchData = async () => {
  loading.value = true
  try {
    const res = isAdmin.value 
      ? await suggestionService.getAllSuggestions(currentPage.value, pageSize.value, statusFilter.value)
      : await suggestionService.getMySuggestions(currentPage.value, pageSize.value)
    
    suggestions.value = res?.items || []
    total.value = res?.total || 0
  } catch (e) {
    console.error(e)
    ElMessage.error('加载意见列表失败')
  } finally {
    loading.value = false
  }
}

const handleCreate = async () => {
  if (!createForm.value.title || !createForm.value.content) {
    ElMessage.warning('请填写完整信息')
    return
  }
  submitting.value = true
  try {
    await suggestionService.createSuggestion(createForm.value)
    ElMessage.success('提交成功')
    createForm.value = { title: '', content: '' }
    activeTab.value = 'list'
    await fetchData()
  } catch (e) {
    console.error(e)
    ElMessage.error('提交失败')
  } finally {
    submitting.value = false
  }
}

const openReply = (item: Suggestion) => {
  currentSuggestion.value = item
  replyContent.value = ''
  replyDialogVisible.value = true
}

const handleReply = async () => {
  if (!replyContent.value || !currentSuggestion.value) return
  replying.value = true
  try {
    await suggestionService.replySuggestion(currentSuggestion.value.id, replyContent.value)
    ElMessage.success('回复成功')
    replyDialogVisible.value = false
    await fetchData()
  } catch (e) {
    console.error(e)
    ElMessage.error('回复失败')
  } finally {
    replying.value = false
  }
}

const formatTime = (time: string) => {
  if (!time) return ''
  return new Date(time).toLocaleString()
}

const getStatusType = (status: string) => {
  return status === 'REPLIED' ? 'success' : 'warning'
}

const getStatusText = (status: string) => {
  return status === 'REPLIED' ? '已回复' : '待回复'
}

const handlePageChange = (page: number) => {
  currentPage.value = page
  fetchData()
}

watch(isAdmin, () => {
  fetchData()
})

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="suggestion-box-page">
    <PageHeader
      title="意见反馈箱"
      subtitle="您的建议是我们进步的动力"
      gradient="linear-gradient(135deg, #67c23a 0%, #42b983 100%)"
    />

    <div class="content-container">
      <el-card shadow="hover" class="main-card">
        <template #header>
          <div class="card-header">
            <div class="left">
              <el-radio-group v-model="activeTab" v-if="!isAdmin">
                <el-radio-button label="list">我的反馈</el-radio-button>
                <el-radio-button label="create">提交新意见</el-radio-button>
              </el-radio-group>
              <span v-else class="admin-title">反馈管理</span>
            </div>
            <div class="right">
              <el-select v-if="isAdmin" v-model="statusFilter" placeholder="状态筛选" clearable @change="fetchData" style="width: 120px; margin-right: 10px;">
                <el-option label="待回复" value="PENDING" />
                <el-option label="已回复" value="REPLIED" />
              </el-select>
              <el-button :icon="RefreshLeft" circle @click="fetchData" />
            </div>
          </div>
        </template>

        <div v-if="activeTab === 'list'">
          <el-empty v-if="!loading && suggestions.length === 0" description="暂无反馈记录" />
          
          <div v-else class="suggestion-list" v-loading="loading">
            <div v-for="item in suggestions" :key="item.id" class="suggestion-item">
              <div class="item-header">
                <span class="item-title">{{ item.title }}</span>
                <el-tag :type="getStatusType(item.status)" size="small" effect="dark">{{ getStatusText(item.status) }}</el-tag>
              </div>
              
              <div class="item-meta">
                <span v-if="isAdmin && item.username" class="author">提交人: {{ item.username }} ({{ item.studentNo }})</span>
                <span class="time">{{ formatTime(item.createTime) }}</span>
              </div>
              
              <div class="item-content">
                {{ item.content }}
              </div>

              <div v-if="item.status === 'REPLIED'" class="reply-section">
                <div class="reply-header">
                  <el-icon><ChatDotRound /></el-icon> 管理员回复:
                  <span class="reply-time">{{ formatTime(item.replyTime!) }}</span>
                </div>
                <div class="reply-content">{{ item.replyContent }}</div>
              </div>

              <div v-if="isAdmin && item.status === 'PENDING'" class="admin-actions">
                <el-button type="primary" size="small" @click="openReply(item)">回复</el-button>
              </div>
            </div>
          </div>

          <div class="pagination-container" v-if="total > 0">
            <el-pagination
              v-model:current-page="currentPage"
              v-model:page-size="pageSize"
              :total="total"
              layout="prev, pager, next"
              @current-change="handlePageChange"
            />
          </div>
        </div>

        <div v-else class="create-form">
          <el-form :model="createForm" label-position="top">
            <el-form-item label="标题">
              <el-input v-model="createForm.title" placeholder="请输入简短的标题" />
            </el-form-item>
            <el-form-item label="内容">
              <el-input 
                v-model="createForm.content" 
                type="textarea" 
                :rows="6" 
                placeholder="请详细描述您的建议或遇到的问题..." 
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleCreate" :loading="submitting" style="width: 100%">提交反馈</el-button>
            </el-form-item>
          </el-form>
        </div>
      </el-card>
    </div>

    <el-dialog v-model="replyDialogVisible" title="回复反馈" width="500px">
      <div v-if="currentSuggestion" class="reply-dialog-content">
        <div class="original-content">
          <h4>{{ currentSuggestion.title }}</h4>
          <p>{{ currentSuggestion.content }}</p>
        </div>
        <el-input
          v-model="replyContent"
          type="textarea"
          :rows="4"
          placeholder="请输入回复内容"
        />
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="replyDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleReply" :loading="replying">发送回复</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.suggestion-box-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 30px 5%;
  min-height: 80vh;
  animation: fadeUp 0.5s ease;
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
.main-card {
  border-radius: 20px;
  border: none !important;
  box-shadow: 0 10px 30px -5px rgba(0,0,0,0.08);
  min-height: 600px;
  background: rgba(255, 255, 255, 0.95);
}
.card-header { display: flex; justify-content: space-between; align-items: center; }
.admin-title { font-size: 20px; font-weight: 700; color: #1e293b; }
.suggestion-list { display: grid; gap: 20px; grid-template-columns: 1fr; }
.suggestion-item {
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 24px;
  background: #ffffff;
  transition: all 0.3s ease;
  position: relative;
}
.suggestion-item:hover { 
  box-shadow: 0 12px 24px -8px rgba(0,0,0,0.1); 
  transform: translateY(-2px);
  border-color: #cbd5e1;
}
.item-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
.item-title { font-size: 18px; font-weight: 700; color: #0f172a; margin-right: 16px; }
.item-meta { font-size: 13px; color: #64748b; margin-bottom: 16px; display: flex; gap: 16px; align-items: center; }
.item-meta .author { display: flex; align-items: center; gap: 6px; background: #f1f5f9; padding: 4px 10px; border-radius: 20px; }
.item-content {
  font-size: 15px;
  color: #334155;
  line-height: 1.7;
  white-space: pre-wrap;
  margin-bottom: 20px;
  background: #f8fafc;
  padding: 16px;
  border-radius: 12px;
}
.reply-section {
  background: linear-gradient(145deg, #f0fdf4, #ecfdf5);
  padding: 20px;
  border-radius: 12px;
  border-left: 4px solid var(--accent-500);
  margin-top: 16px;
}
.reply-header {
  display: flex;
  align-items: center;
  font-size: 15px;
  font-weight: 700;
  color: var(--accent-600);
  margin-bottom: 10px;
  gap: 8px;
}
.reply-time { font-weight: 500; color: #64748b; margin-left: auto; font-size: 13px; }
.reply-content { font-size: 15px; color: #1e293b; line-height: 1.6; }
.admin-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f1f5f9;
}
.pagination-container { display: flex; justify-content: center; margin-top: 30px; }
.create-form { max-width: 650px; margin: 40px auto; background: #f8fafc; padding: 40px; border-radius: 20px; border: 1px solid #e2e8f0; }
.original-content {
  background: #f8fafc;
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 20px;
  border-left: 4px solid #cbd5e1;
}
.original-content h4 { margin: 0 0 8px 0; font-size: 16px; color: #1e293b; }
.original-content p { margin: 0; font-size: 14px; color: #475569; line-height: 1.6; }
@media (max-width: 768px) {
  .suggestion-box-page { padding: 16px; }
  .create-form { padding: 20px; margin: 20px auto; }
}
</style>
