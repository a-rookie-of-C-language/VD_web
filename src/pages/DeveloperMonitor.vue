<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { monitorService, type DeveloperMetrics } from '@/services/monitorService'
import { notifyRequestError } from '@/services/uiErrorService'

const loading = ref(false)
const connected = ref(false)
const wsError = ref('')
const reconnecting = ref(false)

const metrics = ref<DeveloperMetrics>({
  timestamp: '',
  backendStatus: 'UNKNOWN',
  systemCpuUsage: 0,
  processCpuUsage: 0,
  jvmMemoryUsage: 0,
  systemMemoryUsage: 0,
  heapUsedMb: 0,
  heapMaxMb: 0,
  qps: 0,
  totalRequests: 0,
  websocketClients: 0,
  mysql: { status: 'DOWN', detail: '-' },
  rabbitmq: { status: 'DOWN', detail: '-' },
  elasticsearch: { status: 'DOWN', detail: '-' }
})

let socket: WebSocket | null = null
let reconnectTimer: number | null = null

const middlewareRows = computed(() => [
  { name: 'MySQL', ...metrics.value.mysql },
  { name: 'RabbitMQ', ...metrics.value.rabbitmq },
  { name: 'Elasticsearch', ...metrics.value.elasticsearch }
])

const wsUrl = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  const host = import.meta.env.DEV ? 'localhost:8080' : window.location.host
  const token = localStorage.getItem('token') || ''
  const suffix = token ? `?token=${encodeURIComponent(token)}` : ''
  return `${protocol}://${host}/api/ws/system-metrics${suffix}`
}

const fetchSnapshot = async () => {
  loading.value = true
  try {
    metrics.value = await monitorService.getDeveloperMetrics()
  } catch (error) {
    notifyRequestError(error, '加载开发者监控快照失败')
  } finally {
    loading.value = false
  }
}

const connectWebSocket = () => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    return
  }
  if (!localStorage.getItem('token')) {
    wsError.value = '缺少登录凭证，无法建立监控连接'
    connected.value = false
    return
  }
  socket = new WebSocket(wsUrl())

  socket.onopen = () => {
    connected.value = true
    reconnecting.value = false
    wsError.value = ''
  }

  socket.onmessage = (event) => {
    try {
      metrics.value = JSON.parse(event.data) as DeveloperMetrics
    } catch (error) {
      console.warn('Invalid metrics payload', error)
    }
  }

  socket.onerror = () => {
    wsError.value = 'WebSocket 连接异常'
  }

  socket.onclose = () => {
    connected.value = false
    reconnecting.value = true
    if (reconnectTimer !== null) {
      window.clearTimeout(reconnectTimer)
    }
    reconnectTimer = window.setTimeout(() => connectWebSocket(), 3000)
  }
}

const disconnectWebSocket = () => {
  if (reconnectTimer !== null) {
    window.clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  if (socket) {
    socket.close()
    socket = null
  }
}

const formatTime = (value: string) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

onMounted(async () => {
  await fetchSnapshot()
  connectWebSocket()
})

onUnmounted(() => {
  disconnectWebSocket()
})
</script>

<template>
  <div class="dev-monitor-page">
    <PageHeader title="系统监控（开发者版）" subtitle="后端与中间件实时运行状态（WebSocket 推送）">
      <template #controls>
        <div class="header-controls">
          <el-tag :type="connected ? 'success' : 'danger'" effect="dark">
            {{ connected ? 'WebSocket 已连接' : (reconnecting ? '重连中' : '未连接') }}
          </el-tag>
          <el-button type="primary" @click="fetchSnapshot" :loading="loading">刷新快照</el-button>
        </div>
      </template>
    </PageHeader>

    <el-alert v-if="wsError" :title="wsError" type="warning" show-icon class="mb-4" />

    <el-row :gutter="20" class="mb-4">
      <el-col :span="6" :xs="12">
        <el-card class="data-card" shadow="hover">
          <div class="label">系统 CPU</div>
          <div class="value">{{ metrics.systemCpuUsage }}%</div>
        </el-card>
      </el-col>
      <el-col :span="6" :xs="12">
        <el-card class="data-card" shadow="hover">
          <div class="label">进程 CPU</div>
          <div class="value">{{ metrics.processCpuUsage }}%</div>
        </el-card>
      </el-col>
      <el-col :span="6" :xs="12">
        <el-card class="data-card" shadow="hover">
          <div class="label">JVM 内存</div>
          <div class="value">{{ metrics.jvmMemoryUsage }}%</div>
          <div class="sub">{{ metrics.heapUsedMb }}MB / {{ metrics.heapMaxMb }}MB</div>
        </el-card>
      </el-col>
      <el-col :span="6" :xs="12">
        <el-card class="data-card" shadow="hover">
          <div class="label">QPS</div>
          <div class="value">{{ metrics.qps }}</div>
          <div class="sub">累计请求 {{ metrics.totalRequests }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="mb-4" shadow="hover">
      <template #header>
        <span>中间件状态</span>
      </template>
      <el-table :data="middlewareRows" stripe>
        <el-table-column prop="name" label="组件" width="180" />
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="row.status === 'UP' ? 'success' : 'danger'">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="detail" label="详情" />
      </el-table>
    </el-card>

    <el-card shadow="hover">
      <div class="meta-row">
        <span>后端状态：<el-tag :type="metrics.backendStatus === 'UP' ? 'success' : 'danger'">{{ metrics.backendStatus }}</el-tag></span>
        <span>系统内存使用：{{ metrics.systemMemoryUsage }}%</span>
        <span>监控连接数：{{ metrics.websocketClients }}</span>
        <span>更新时间：{{ formatTime(metrics.timestamp) }}</span>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.dev-monitor-page { max-width: 1200px; margin: 0 auto; padding: 24px 28px; min-height: 80vh; background: var(--page-bg); }
.header-controls { display: flex; gap: 12px; flex-wrap: wrap; }
.data-card .label { color: #64748b; font-size: 13px; margin-bottom: 6px; }
.data-card .value { font-size: 26px; font-weight: 700; color: #0f172a; }
.data-card .sub { margin-top: 4px; color: #94a3b8; font-size: 12px; }
.meta-row { display: flex; flex-wrap: wrap; gap: 20px; color: #334155; }
.mb-4 { margin-bottom: 20px; }
@media (max-width: 768px) {
  .dev-monitor-page { padding: 16px; }
}
</style>
