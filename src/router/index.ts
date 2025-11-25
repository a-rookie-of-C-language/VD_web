import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import LoginPage from '../pages/LoginPage.vue'
import AllActivities from '../pages/AllActivities.vue'
import MainLayout from '../layouts/MainLayout.vue'

const routes: Array<RouteRecordRaw> = [
    {
        path: '/login',
        name: 'Login',
        component: LoginPage
    },
    {
        path: '/',
        component: MainLayout,
        children: [
            {
                path: '',
                redirect: '/activities'
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
                path: 'my-projects',
                name: 'MyProjects',
                component: () => import('../pages/MyProjects.vue')
            },
            {
                path: 'admin-review',
                name: 'AdminReview',
                component: () => import('../pages/AdminReview.vue')
            },
            {
                path: 'activity/:id',
                name: 'ActivityDetail',
                component: () => import('../pages/detail.vue')
            }
        ]
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router
