const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined

export const API_BASE_URL = configuredBaseUrl && configuredBaseUrl.trim().length > 0
    ? configuredBaseUrl.trim()
    : import.meta.env.DEV
        ? '/api'
        : (typeof window !== 'undefined' && (window as any).api)
            ? 'http://localhost:8080/api'
            : '/api'
