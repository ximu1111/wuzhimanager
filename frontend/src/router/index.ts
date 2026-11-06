import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { public: true },
  },
  {
    path: '/403',
    name: 'Forbidden',
    component: () => import('@/views/Forbidden.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    component: () => import('@/components/layout/Layout.vue'),
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', name: 'Dashboard', component: () => import('@/views/Dashboard.vue'), meta: { title: '首页', perm: 'dashboard' } },
      { path: 'goods', name: 'Goods', component: () => import('@/views/GoodsManage.vue'), meta: { title: '物资管理', perm: 'goods:view' } },
      { path: 'stock-in', name: 'StockIn', component: () => import('@/views/StockIn.vue'), meta: { title: '入库记录', perm: 'stock_in:view' } },
      { path: 'borrow', name: 'Borrow', component: () => import('@/views/BorrowManage.vue'), meta: { title: '领用管理', perm: 'borrow:view' } },
      { path: 'repair', name: 'Repair', component: () => import('@/views/RepairManage.vue'), meta: { title: '维修记录', perm: 'repair:view' } },
      { path: 'scrap', name: 'Scrap', component: () => import('@/views/ScrapManage.vue'), meta: { title: '报废记录', perm: 'scrap:view' } },
      { path: 'alert', name: 'Alert', component: () => import('@/views/AlertManage.vue'), meta: { title: '库存预警', perm: 'alert:view' } },
      { path: 'users', name: 'Users', component: () => import('@/views/UserManage.vue'), meta: { title: '用户管理', perm: 'user:view' } },
      { path: 'roles', name: 'Roles', component: () => import('@/views/RoleManage.vue'), meta: { title: '角色管理', perm: 'role:view' } },
      { path: 'logs', name: 'Logs', component: () => import('@/views/OperationLog.vue'), meta: { title: '操作日志', perm: 'log:view' } },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Navigation guard
router.beforeEach((to, _from, next) => {
  if (to.meta.public) {
    return next()
  }
  const authStore = useAuthStore()
  if (!authStore.isLoggedIn) {
    return next('/login')
  }
  // Check permission
  const requiredPerm = to.meta.perm as string
  if (requiredPerm && !authStore.hasPermission(requiredPerm)) {
    return next('/403')
  }
  next()
})

export default router
