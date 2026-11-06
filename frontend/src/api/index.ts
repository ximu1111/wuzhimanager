import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'

const request = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

// Request interceptor - attach token
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor
request.interceptors.response.use(
  (response) => {
    const res = response.data
    // Handle blob responses (file downloads)
    if (response.config.responseType === 'blob') {
      return response
    }
    if (res.code && res.code !== 200) {
      ElMessage.error(res.message || '请求失败')
      if (res.code === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('userInfo')
        router.push('/login')
      }
      return Promise.reject(new Error(res.message))
    }
    return res
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('userInfo')
      router.push('/login')
      ElMessage.error('登录已过期，请重新登录')
    } else {
      ElMessage.error(error.response?.data?.message || '网络错误')
    }
    return Promise.reject(error)
  }
)

export default request

// Auth APIs
export const authApi = {
  login: (data: { username: string; password: string }) => request.post('/auth/login', data),
  getUserInfo: () => request.get('/auth/userinfo'),
}

// User APIs
export const userApi = {
  list: (params: any) => request.get('/users', { params }),
  create: (data: any) => request.post('/users', data),
  update: (id: number, data: any) => request.put(`/users/${id}`, data),
  delete: (id: number) => request.delete(`/users/${id}`),
}

// Role APIs
export const roleApi = {
  list: () => request.get('/roles'),
  create: (data: any) => request.post('/roles', data),
  update: (id: number, data: any) => request.put(`/roles/${id}`, data),
  delete: (id: number) => request.delete(`/roles/${id}`),
}

// Category APIs
export const categoryApi = {
  list: () => request.get('/categories'),
  create: (data: any) => request.post('/categories', data),
  update: (id: number, data: any) => request.put(`/categories/${id}`, data),
  delete: (id: number) => request.delete(`/categories/${id}`),
}

// Goods APIs
export const goodsApi = {
  list: (params: any) => request.get('/goods', { params }),
  detail: (id: number) => request.get(`/goods/${id}`),
  create: (data: any) => request.post('/goods', data),
  update: (id: number, data: any) => request.put(`/goods/${id}`, data),
  delete: (id: number) => request.delete(`/goods/${id}`),
  importBatch: (items: any[]) => request.post('/goods/import', { items }),
  exportExcel: () => request.get('/goods/export/excel', { responseType: 'blob' }),
}

// Stock In APIs
export const stockInApi = {
  list: (params: any) => request.get('/stock-in', { params }),
  create: (data: any) => request.post('/stock-in', data),
}

// Borrow APIs
export const borrowApi = {
  list: (params: any) => request.get('/borrow', { params }),
  create: (data: any) => request.post('/borrow', data),
  audit: (id: number, data: { action: string; remark?: string }) => request.put(`/borrow/${id}/audit`, data),
  returnGoods: (id: number) => request.put(`/borrow/${id}/return`),
}

// Repair APIs
export const repairApi = {
  list: (params: any) => request.get('/repair', { params }),
  create: (data: any) => request.post('/repair', data),
  update: (id: number, data: any) => request.put(`/repair/${id}`, data),
}

// Scrap APIs
export const scrapApi = {
  list: (params: any) => request.get('/scrap', { params }),
  create: (data: { goods_id: number; reason: string }) => request.post('/scrap', data),
}

// Log APIs
export const logApi = {
  list: (params: any) => request.get('/logs', { params }),
}

// Report APIs
export const reportApi = {
  dashboard: () => request.get('/report/dashboard'),
  alerts: (params: any) => request.get('/report/alerts', { params }),
}
