import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api'
import router from '@/router'

interface UserInfo {
  id: number
  username: string
  name: string
  roleId: number
  roleName: string
  permissions: string[]
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || '')
  const userInfo = ref<UserInfo | null>(
    localStorage.getItem('userInfo') ? JSON.parse(localStorage.getItem('userInfo')!) : null
  )

  const isLoggedIn = computed(() => !!token.value)
  const permissions = computed(() => userInfo.value?.permissions || [])
  const roleName = computed(() => userInfo.value?.roleName || '')
  const isSuperAdmin = computed(() => userInfo.value?.roleId === 1)
  const isAdmin = computed(() => userInfo.value?.roleId === 1 || userInfo.value?.roleId === 2)

  function hasPermission(perm: string): boolean {
    return permissions.value.includes(perm)
  }

  async function login(username: string, password: string) {
    const res: any = await authApi.login({ username, password })
    if (res.code === 200) {
      token.value = res.data.token
      userInfo.value = res.data.userInfo
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('userInfo', JSON.stringify(res.data.userInfo))
      return true
    }
    return false
  }

  function logout() {
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
    router.push('/login')
  }

  return { token, userInfo, isLoggedIn, permissions, roleName, isSuperAdmin, isAdmin, hasPermission, login, logout }
})
