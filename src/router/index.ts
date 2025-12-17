import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import LoginPage from '../pages/LoginPage.vue'
import AllActivities from '../pages/AllActivities.vue'
import MainLayout from '../layouts/MainLayout.vue'
import { userService } from '@/services/userService'

const routes: Array<RouteRecordRaw> = [
    {
        path: '/',
        name: 'Login',
        component: LoginPage
    },
    {
        path: '/login',
        redirect: '/'
    },
    {
        path: '/app',
        component: MainLayout,
        meta: { requiresAuth: true },
        children: [
            {
                path: '',
                redirect: '/app/activities'
            },
            {
                path: 'activities',
                name: 'AllActivities',
                component: AllActivities
            },
            {
                path: 'add-activity',
                name: 'AddActivity',
                component: () => import('../pages/AddActivity.vue')
            },
            {
                path: 'import-activity',
                name: 'ImportActivity',
                component: () => import('../pages/ImportActivity.vue')
            },
            {
                path: 'my-projects',
                name: 'MyProjects',
                component: () => import('../pages/MyProjects.vue')
            },
            {
                path: 'my-stats',
                name: 'MyStats',
                component: () => import('../pages/MyStats.vue')
            },
            {
                path: 'request-hours',
                name: 'RequestHours',
                component: () => import('../pages/RequestHours.vue')
            },
            {
                path: 'admin-review',
                name: 'AdminReview',
                component: () => import('../pages/AdminReview.vue')
            },
            {
                path: 'system-monitor',
                name: 'SystemMonitor',
                component: () => import('../pages/SystemMonitor.vue')
            },
            {
                path: 'suggestion-box',
                name: 'SuggestionBox',
                component: () => import('../pages/SuggestionBox.vue')
            },
            {
                path: 'activity/:id',
                name: 'ActivityDetail',
                component: () => import('../pages/detail.vue')
            }
        ]
    },
    // 兼容旧路径，重定向到新路径
    { path: '/activities', redirect: '/app/activities' },
    { path: '/add-activity', redirect: '/app/add-activity' },
    { path: '/import-activity', redirect: '/app/import-activity' },
    { path: '/my-projects', redirect: '/app/my-projects' },
    { path: '/my-stats', redirect: '/app/my-stats' },
    { path: '/request-hours', redirect: '/app/request-hours' },
    { path: '/admin-review', redirect: '/app/admin-review' },
    { path: '/system-monitor', redirect: '/app/system-monitor' },
    { path: '/suggestion-box', redirect: '/app/suggestion-box' },
    { path: '/activity/:id', redirect: to => `/app/activity/${to.params.id}` }
]

const router = createRouter({
    history: createWebHashHistory(),
    routes
})

router.beforeEach(async (to, _from, next) => {
    const userInfoStr = localStorage.getItem('userInfo')
    const token = localStorage.getItem('token')

    // Check if any matched route requires authentication
    const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
    const requiresSuperAdmin = to.matched.some(record => record.meta.requiresSuperAdmin)

    console.log('[Router Guard]', {
        to: to.path,
        requiresAuth,
        token: token ? 'exists' : 'missing'
    })

    // 访问登录页时，检查是否有有效 token，有则跳转到活动列表
    if (to.path === '/' || to.path === '/login') {
        if (token && userInfoStr) {
            try {
                const verifyResult = await userService.verifyToken()
                if (verifyResult === "Pass") {
                    console.log('[Router Guard] Token valid, redirecting to /app/activities')
                    next('/app/activities')
                    return
                } else {
                    // Token 无效，清除并停留在登录页
                    console.log('[Router Guard] Token invalid, staying on login')
                    localStorage.removeItem('token')
                    localStorage.removeItem('userInfo')
                }
            } catch (error) {
                console.error('[Router Guard] Token verification failed:', error)
                localStorage.removeItem('token')
                localStorage.removeItem('userInfo')
            }
        }
        next()
        return
    }

    // 访问需要认证的页面
    if (requiresAuth) {
        if (!token || !userInfoStr) {
            console.log('[Router Guard] No token, redirecting to login')
            next('/')
            return
        }

        // 验证 token 有效性
        try {
            const verifyResult = await userService.verifyToken()
            if (verifyResult !== "Pass") {
                console.log('[Router Guard] Token invalid, redirecting to login')
                localStorage.removeItem('token')
                localStorage.removeItem('userInfo')
                next('/')
                return
            }
        } catch (error) {
            console.error('[Router Guard] Token verification failed:', error)
            localStorage.removeItem('token')
            localStorage.removeItem('userInfo')
            next('/')
            return
        }
    }

    // Check if route requires super admin
    if (requiresSuperAdmin) {
        try {
            const user = JSON.parse(userInfoStr!)
            if (user.role !== 'superAdmin') {
                console.log('[Router Guard] Super admin required but user is not super admin')
                next('/app/activities')
                return
            }
        } catch (error) {
            console.error('[Router Guard] Failed to parse user info:', error)
            next('/')
            return
        }
    }

    console.log('[Router Guard] Allowing navigation to', to.path)
    next()
})

export default router
