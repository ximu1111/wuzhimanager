<template>
  <div class="layout-container">
    <header class="layout-header">
      <div style="display: flex; align-items: center; gap: 16px;">
        <el-icon style="cursor: pointer; font-size: 20px;" @click="collapsed = !collapsed">
          <Fold v-if="!collapsed" />
          <Expand v-else />
        </el-icon>
        <span class="logo">物资管理系统</span>
      </div>
      <div class="user-info">
        <el-tag size="small" type="info">{{ authStore.roleName }}</el-tag>
        <span>{{ authStore.userInfo?.name }}</span>
        <el-button type="danger" text size="small" @click="handleLogout">
          <el-icon><SwitchButton /></el-icon> 退出
        </el-button>
      </div>
    </header>
    <div class="layout-body">
      <aside class="layout-sidebar" :class="{ collapsed }">
        <el-menu
          :default-active="currentRoute"
          :collapse="collapsed"
          background-color="#304156"
          text-color="#bfcbd9"
          active-text-color="#409eff"
          router
          :collapse-transition="false"
        >
          <template v-for="item in menuItems" :key="item.path">
            <el-menu-item :index="item.path">
              <el-icon><component :is="item.icon" /></el-icon>
              <template #title>{{ item.title }}</template>
            </el-menu-item>
          </template>
        </el-menu>
      </aside>
      <main class="layout-main">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const route = useRoute()
const collapsed = ref(false)
const currentRoute = computed(() => '/' + (route.path.split('/')[1] || 'dashboard'))

const allMenuItems = [
  { path: '/dashboard', title: '首页', icon: 'Odometer', perm: 'dashboard' },
  { path: '/goods', title: '物资管理', icon: 'Box', perm: 'goods:view' },
  { path: '/stock-in', title: '入库记录', icon: 'Download', perm: 'stock_in:view' },
  { path: '/borrow', title: '领用管理', icon: 'Ticket', perm: 'borrow:view' },
  { path: '/repair', title: '维修记录', icon: 'SetUp', perm: 'repair:view' },
  { path: '/scrap', title: '报废记录', icon: 'Delete', perm: 'scrap:view' },
  { path: '/alert', title: '库存预警', icon: 'WarningFilled', perm: 'alert:view' },
  { path: '/users', title: '用户管理', icon: 'User', perm: 'user:view' },
  { path: '/roles', title: '角色管理', icon: 'Lock', perm: 'role:view' },
  { path: '/logs', title: '操作日志', icon: 'Document', perm: 'log:view' },
]

const menuItems = computed(() =>
  allMenuItems.filter(item => authStore.hasPermission(item.perm))
)

function handleLogout() {
  authStore.logout()
}
</script>
