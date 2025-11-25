import { ref, computed } from 'vue'
import type { User } from '@/entity/User'
import { userService } from '@/services/userService'

// Global user state
const currentUser = ref<User | null>(null)
const isLoading = ref(false)

export function useUserStore() {
    const strip = (v: any): any => {
        if (v == null) return ''
        if (typeof v !== 'string') return v
        const trimmed = v.replace(/^["']+|["']+$/g, '')
        try {
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) return JSON.parse(trimmed)
        } catch {}
        return trimmed
    }
    // Load user info from cache or API
    const loadUserInfo = async () => {
        // Try to get cached user info first
        currentUser.value = userService.getCachedUserInfo()

        // If no cached info, try to fetch from API
        if (!currentUser.value) {
            const token = localStorage.getItem('token')
            // Only try to fetch if token exists
            if (token) {
                isLoading.value = true
                try {
                    currentUser.value = await userService.getUserInfo()
                } catch (error) {
                    console.debug('User info not available:', error)
                } finally {
                    isLoading.value = false
                }
            }
        }
    }

    // Set user info (called after login)
    const setUser = (user: User) => {
        currentUser.value = user
    }

    // Clear user info (called on logout)
    const clearUser = () => {
        userService.logout() // Clear localStorage
        currentUser.value = null
    }

    // Computed properties
    const isLoggedIn = computed(() => !!currentUser.value)
    const studentNo = computed(() => strip(currentUser.value?.studentNo || ''))
    const username = computed(() => strip(currentUser.value?.username || ''))
    const role = computed(() => strip(currentUser.value?.role || 'user') as User['role'])

    return {
        // State
        currentUser,
        isLoading,

        // Computed
        isLoggedIn,
        studentNo,
        username,
        role,

        // Actions
        loadUserInfo,
        setUser,
        clearUser
    }
}
