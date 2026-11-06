<template>
  <div>
    <div class="page-header">
      <h2>物资管理</h2>
      <div>
        <el-button v-if="authStore.hasPermission('goods:import')" @click="showImport = true">
          <el-icon><Upload /></el-icon> 批量导入
        </el-button>
        <el-button v-if="authStore.hasPermission('goods:export')" @click="handleExport">
          <el-icon><Download /></el-icon> 导出Excel
        </el-button>
        <el-button v-if="authStore.hasPermission('goods:add')" type="primary" @click="openDialog()">
          <el-icon><Plus /></el-icon> 新增物资
        </el-button>
      </div>
    </div>

    <!-- Search -->
    <div class="search-bar">
      <el-form :inline="true" :model="search">
        <el-form-item label="关键词">
          <el-input v-model="search.keyword" placeholder="名称/规格/供应商" clearable @clear="loadData" @keyup.enter="loadData" />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="search.category_id" placeholder="全部分类" clearable @change="loadData">
            <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="search.status" placeholder="全部状态" clearable @change="loadData">
            <el-option label="正常" value="normal" />
            <el-option label="维修中" value="repairing" />
            <el-option label="已报废" value="scrapped" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">搜索</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- Table -->
    <div class="table-container">
      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="name" label="物资名称" min-width="120" />
        <el-table-column prop="category_name" label="分类" width="100" />
        <el-table-column prop="spec" label="规格型号" width="140" show-overflow-tooltip />
        <el-table-column prop="supplier" label="供应商" width="100" show-overflow-tooltip />
        <el-table-column prop="stock" label="库存" width="80" align="center">
          <template #default="{ row }">
            <span :style="{ color: row.stock <= row.warning_threshold ? '#f56c6c' : '' }">{{ row.stock }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="warning_threshold" label="预警值" width="80" align="center" />
        <el-table-column prop="purchase_price" label="单价" width="90" align="right">
          <template #default="{ row }">¥{{ row.purchase_price?.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right" v-if="authStore.hasPermission('goods:edit') || authStore.hasPermission('goods:delete')">
          <template #default="{ row }">
            <el-button v-if="authStore.hasPermission('goods:edit')" type="primary" text size="small" @click="openDialog(row)">编辑</el-button>
            <el-button v-if="authStore.hasPermission('goods:delete')" type="danger" text size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrap">
        <el-pagination background layout="total, sizes, prev, pager, next" :total="total" v-model:current-page="page" v-model:page-size="pageSize" :page-sizes="[10, 20, 50]" @change="loadData" />
      </div>
    </div>

    <!-- Add/Edit Dialog -->
    <el-dialog v-model="dialogVisible" :title="editId ? '编辑物资' : '新增物资'" width="560px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="90px">
        <el-form-item label="物资名称" prop="name"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="分类" prop="category_id">
          <el-select v-model="form.category_id" placeholder="请选择" style="width: 100%;">
            <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="规格型号"><el-input v-model="form.spec" /></el-form-item>
        <el-form-item label="供应商"><el-input v-model="form.supplier" /></el-form-item>
        <el-form-item label="采购日期"><el-date-picker v-model="form.purchase_date" type="date" value-format="YYYY-MM-DD" style="width: 100%;" /></el-form-item>
        <el-form-item label="采购单价"><el-input-number v-model="form.purchase_price" :min="0" :precision="2" style="width: 100%;" /></el-form-item>
        <el-form-item label="库存数量" v-if="!editId"><el-input-number v-model="form.stock" :min="0" style="width: 100%;" /></el-form-item>
        <el-form-item label="预警阈值"><el-input-number v-model="form.warning_threshold" :min="0" style="width: 100%;" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- Import Dialog -->
    <el-dialog v-model="showImport" title="批量导入物资" width="600px">
      <p style="margin-bottom: 12px; color: #909399;">请粘贴JSON数组格式数据，或手动添加：</p>
      <el-input v-model="importText" type="textarea" :rows="8" placeholder='[{"name":"测试物资","category_id":1,"spec":"规格","stock":10,"purchase_price":99}]' />
      <template #footer>
        <el-button @click="showImport = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleImport">导入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import { goodsApi, categoryApi } from '@/api'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const loading = ref(false)
const submitting = ref(false)
const tableData = ref<any[]>([])
const categories = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const search = reactive({ keyword: '', category_id: '' as any, status: '' })
const dialogVisible = ref(false)
const showImport = ref(false)
const importText = ref('')
const editId = ref<number | null>(null)
const formRef = ref<FormInstance>()

const form = reactive({ name: '', category_id: '' as any, spec: '', supplier: '', purchase_date: '', purchase_price: 0, stock: 0, warning_threshold: 5, remark: '' })
const formRules = {
  name: [{ required: true, message: '请输入物资名称', trigger: 'blur' }],
  category_id: [{ required: true, message: '请选择分类', trigger: 'change' }],
}

const statusText = (s: string) => ({ normal: '正常', repairing: '维修中', scrapped: '已报废' }[s] || s)
const statusType = (s: string) => ({ normal: 'success', repairing: 'warning', scrapped: 'danger' }[s] || 'info') as any

async function loadData() {
  loading.value = true
  try {
    const res: any = await goodsApi.list({ page: page.value, pageSize: pageSize.value, ...search })
    tableData.value = res.data?.list || []
    total.value = res.data?.total || 0
  } finally { loading.value = false }
}

async function loadCategories() {
  const res: any = await categoryApi.list()
  categories.value = res.data || []
}

function resetSearch() {
  search.keyword = ''
  search.category_id = ''
  search.status = ''
  page.value = 1
  loadData()
}

function openDialog(row?: any) {
  editId.value = row ? row.id : null
  if (row) {
    Object.assign(form, { name: row.name, category_id: row.category_id, spec: row.spec, supplier: row.supplier, purchase_date: row.purchase_date, purchase_price: row.purchase_price, stock: row.stock, warning_threshold: row.warning_threshold, remark: row.remark })
  } else {
    Object.assign(form, { name: '', category_id: '', spec: '', supplier: '', purchase_date: '', purchase_price: 0, stock: 0, warning_threshold: 5, remark: '' })
  }
  dialogVisible.value = true
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  submitting.value = true
  try {
    if (editId.value) {
      await goodsApi.update(editId.value, form)
      ElMessage.success('更新成功')
    } else {
      await goodsApi.create(form)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    loadData()
  } finally { submitting.value = false }
}

async function handleDelete(row: any) {
  await ElMessageBox.confirm(`确定删除物资「${row.name}」吗？`, '确认删除', { type: 'warning' })
  await goodsApi.delete(row.id)
  ElMessage.success('删除成功')
  loadData()
}

async function handleImport() {
  try {
    const items = JSON.parse(importText.value)
    if (!Array.isArray(items)) throw new Error()
    submitting.value = true
    await goodsApi.importBatch(items)
    ElMessage.success('导入成功')
    showImport.value = false
    importText.value = ''
    loadData()
  } catch (e: any) {
    ElMessage.error('JSON格式错误，请检查')
  } finally { submitting.value = false }
}

async function handleExport() {
  try {
    const res = await goodsApi.exportExcel()
    const blob = new Blob([res.data as any], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '物资列表.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) { ElMessage.error('导出失败') }
}

onMounted(() => { loadData(); loadCategories() })
</script>
