import axios from 'axios'

type RequestConfig = {
  method?: 'get' | 'post' | 'put' | 'delete'
  url: string
  params?: Record<string, unknown>
  data?: unknown
  headers?: Record<string, string>
}

type ApiLikeResponse = {
  code?: number
  message?: string
}

type RetryOptions = {
  retries?: number
  delayMs?: number
  shouldRetry?: (error: Error) => boolean
}

function isApiLikeResponse(payload: unknown): payload is ApiLikeResponse {
  return typeof payload === 'object' && payload !== null
}

declare global {
  interface Window {
    api?: {
      request: (config: RequestConfig) => Promise<any>
    }
  }
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'ngrok-skip-browser-warning': 'true',
    'Accept': 'application/json'
  }
  const token = localStorage.getItem('token')
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

function clearAuthCache(): void {
  localStorage.removeItem('token')
  localStorage.removeItem('userInfo')
}

function maybeHandleUnauthorized(status?: number, payload?: ApiLikeResponse): void {
  if (status === 401 || payload?.code === 401) {
    clearAuthCache()
  }
}

function extractErrorMessage(status?: number, payload?: ApiLikeResponse): string {
  if (payload?.message && payload.message.trim().length > 0) {
    return payload.message
  }
  if (status) {
    return `Request failed with status ${status}`
  }
  return 'Network request failed'
}

function toError(input: unknown): Error {
  return input instanceof Error ? input : new Error(String(input))
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, ms))
}

function defaultRetryPredicate(error: Error): boolean {
  const msg = error.message || ''
  if (msg.includes('Network request failed')) return true
  const statusMatch = msg.match(/status\s+(\d{3})/i)
  if (!statusMatch) return false
  const statusCode = Number(statusMatch[1])
  return statusCode >= 500
}

export function getErrorMessage(error: unknown, fallback = '请求失败'): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }
  return fallback
}

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const retries = options.retries ?? 1
  const delayMs = options.delayMs ?? 250
  const shouldRetry = options.shouldRetry ?? defaultRetryPredicate
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      const normalizedError = toError(err)
      lastError = normalizedError
      if (attempt >= retries || !shouldRetry(normalizedError)) {
        throw normalizedError
      }
      await sleep(delayMs * (attempt + 1))
    }
  }

  throw lastError ?? new Error('Request failed')
}

function assertBusinessSuccess(payload: unknown): void {
  if (!isApiLikeResponse(payload) || typeof payload.code !== 'number') {
    return
  }
  if (payload.code !== 200) {
    maybeHandleUnauthorized(undefined, payload)
    throw new Error(extractErrorMessage(undefined, payload))
  }
}

export async function httpRequest<T>(config: RequestConfig): Promise<T> {
  const headers = { ...getAuthHeaders(), ...(config.headers || {}) }
  const isFormData = config.data instanceof FormData

  if (!isFormData && window.api && typeof window.api.request === 'function') {
    // Electron main process 的 axios 需要完整 URL，相对路径无法解析
    const absoluteUrl = config.url.startsWith('http')
      ? config.url
      : `http://localhost:8080/api${config.url}`
    const res = await window.api.request({ ...config, url: absoluteUrl, headers })
    if (res && 'error' in res) throw new Error(res.error)
    maybeHandleUnauthorized(res?.status, res?.data)
    if (res.status && res.status >= 400) {
      const errorMessage = extractErrorMessage(res.status, res.data)
      throw new Error(errorMessage)
    }
    assertBusinessSuccess(res?.data)
    return res.data as T
  }

  try {
    const res = await axios.request<T>({ ...config, headers, withCredentials: true })
    assertBusinessSuccess(res.data)
    return res.data as T
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status
      const payload = error.response?.data as ApiLikeResponse | undefined
      maybeHandleUnauthorized(status, payload)
      throw new Error(extractErrorMessage(status, payload))
    }
    throw error
  }
}
