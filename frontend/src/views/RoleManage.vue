<template>
  <div>
    <div class="page-header">
      <h2>角色权限管理</h2>
      <el-button v-if="authStore.hasPermission('role:add')" type="primary" @click="openDialog">
        <el-icon><Plus /></el-icon> 新增角色
      </el-button>
    </div>
    <div class="table-container">
      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="name" label="角色名称" width="140" />
        <el-table-column prop="permissions" label="权限列表" min-width="300">
          <template #default="{ row }">
            <el-tag v-for="p in row.permissions" :key="p" size="small" style="margin: 2px;">{{ permLabel(p) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="170" />
        <el-table-column label="操作" width="180" fixed="right" v-if="authStore.hasPermission('role:edit') || authStore.hasPermission('role:delete')">
          <template #default="{ row }">
            <el-button v-if="authStore.hasPermission('role:edit')" type="primary" text size="small" @click="openDialog(row)">编辑</el-button>
            <el-button v-if="authStore.hasPermission('role:delete') && row.id > 3" type="danger" text size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="dialogVisible" :title="editId ? '编辑角色' : '新增角色'" width="600px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="80px">
        <el-form-item label="角色名称" prop="name"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="权限配置">
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            <el-checkbox v-for="p in allPerms" :key="p.value" :value="p.value" v-model="form.permissions">{{ p.label }}</el-checkbox>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import { roleApi } from '@/api'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const loading = ref(false)
const submitting = ref(false)
const tableData = ref<any[]>([])
const dialogVisible = ref(false)
const editId = ref<number | null>(null)
const formRef = ref<FormInstance>()

const allPerms = [
  { value: 'dashboard', label: '首页大盘' },
  { value: 'goods:view', label: '查看物资' }, { value: 'goods:add', label: '新增物资' },
  { value: 'goods:edit', label: '编辑物资' }, { value: 'goods:delete', label: '删除物资' },
  { value: 'goods:import', label: '导入物资' }, { value: 'goods:export', label: '导出台账' },
  { value: 'stock_in:view', label: '查看入库' }, { value: 'stock_in:add', label: '新增入库' },
  { value: 'borrow:view', label: '查看领用' }, { value: 'borrow:add', label: '申请领用' },
  { value: 'borrow:audit', label: '审核领用' }, { value: 'borrow:return', label: '确认归还' },
  { value: 'repair:view', label: '查看维修' }, { value: 'repair:add', label: '新增维修' },
  { value: 'repair:edit', label: '编辑维修' },
  { value: 'scrap:view', label: '查看报废' }, { value: 'scrap:add', label: '登记报废' },
  { value: 'alert:view', label: '库存预警' },
  { value: 'user:view', label: '查看用户' }, { value: 'user:add', label: '新增用户' },
  { value: 'user:edit', label: '编辑用户' }, { value: 'user:delete', label: '删除用户' },
  { value: 'role:view', label: '查看角色' }, { value: 'role:add', label: '新增角色' },
  { value: 'role:edit', label: '编辑角色' }, { value: 'role:delete', label: '删除角色' },
  { value: 'log:view', label: '查看日志' },
]

const permMap: Record<string, string> = {}
allPerms.forEach(p => { permMap[p.value] = p.label })
const permLabel = (v: string) => permMap[v] || v

const form = reactive({ name: '', permissions: [] as string[] })
const formRules = { name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }] }

async function loadData() {
  loading.value = true
  try {
    const res: any = await roleApi.list()
    tableData.value = res.data || []
  } finally { loading.value = false }
}

function openDialog(row?: any) {
  editId.value = row ? row.id : null
  if (row) {
    Object.assign(form, { name: row.name, permissions: [...row.permissions] })
  } else {
    Object.assign(form, { name: '', permissions: [] })
  }
  dialogVisible.value = true
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  submitting.value = true
  try {
    if (editId.value) {
      await roleApi.update(editId.value, form)
      ElMessage.success('更新成功')
    } else {
      await roleApi.create(form)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    loadData()
  } finally { submitting.value = false }
}

async function handleDelete(row: any) {
  await ElMessageBox.confirm(`确定删除角色「${row.name}」吗？`, '确认删除', { type: 'warning' })
  await roleApi.delete(row.id)
  ElMessage.success('删除成功')
  loadData()
}

onMounted(() => { loadData() })
</script>
