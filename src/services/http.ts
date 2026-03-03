import axios from 'axios'

type RequestConfig = {
  method?: 'get' | 'post' | 'put' | 'delete'
  url: string
  params?: Record<string, unknown>
  data?: unknown
  headers?: Record<string, string>
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

export async function httpRequest<T>(config: RequestConfig): Promise<T> {
  const headers = { ...getAuthHeaders(), ...(config.headers || {}) }
  const isFormData = config.data instanceof FormData

  if (!isFormData && window.api && typeof window.api.request === 'function') {
    const res = await window.api.request({ ...config, headers })
    if (res && 'error' in res) throw new Error(res.error)
    if (res.status && res.status >= 400) {
      const errorMessage = res.data?.message || `Request failed with status ${res.status}`
      throw new Error(errorMessage)
    }
    return res.data as T
  }

  const res = await axios.request<T>({ ...config, headers, withCredentials: true })
  return res.data as T
}
