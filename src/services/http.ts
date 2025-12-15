import axios from 'axios'

type RequestConfig = {
  method?: 'get' | 'post' | 'put' | 'delete'
  url: string
  params?: any
  data?: any
  headers?: Record<string, string>
}

declare global {
  interface Window {
    api?: {
      request: (config: RequestConfig) => Promise<any>
    }
  }
}

export async function httpRequest<T>(config: RequestConfig): Promise<T> {
  const headers = Object.assign(
    { 'ngrok-skip-browser-warning': 'true' },
    config.headers || {}
  )
  if (window.api && typeof window.api.request === 'function') {
    const res = await window.api.request({ ...config, headers })
    if (res && 'error' in res) throw new Error(res.error)
    return res.data as T
  }
  const res = await axios.request<T>({ ...config, headers, withCredentials: true })
  return res.data as T
}
