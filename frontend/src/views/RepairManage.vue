<template>
  <div>
    <div class="page-header">
      <h2>维修记录</h2>
      <el-button v-if="authStore.hasPermission('repair:add')" type="primary" @click="openDialog">
        <el-icon><Plus /></el-icon> 新增维修
      </el-button>
    </div>
    <div class="search-bar">
      <el-form :inline="true" :model="search">
        <el-form-item label="关键词"><el-input v-model="search.keyword" placeholder="物资名称/故障描述" clearable @clear="loadData" @keyup.enter="loadData" /></el-form-item>
        <el-form-item label="状态">
          <el-select v-model="search.status" placeholder="全部" clearable @change="loadData">
            <el-option label="维修中" value="repairing" />
            <el-option label="已修复" value="repaired" />
            <el-option label="已报废" value="scrapped" />
          </el-select>
        </el-form-item>
        <el-form-item><el-button type="primary" @click="loadData">搜索</el-button></el-form-item>
      </el-form>
    </div>
    <div class="table-container">
      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="goods_name" label="物资名称" min-width="120" />
        <el-table-column prop="fault_desc" label="故障描述" min-width="180" show-overflow-tooltip />
        <el-table-column prop="cost" label="维修费用" width="100" align="right">
          <template #default="{ row }">¥{{ row.cost?.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="repairStatusType(row.status)" size="small">{{ repairStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="operator_name" label="操作人" width="90" />
        <el-table-column prop="remark" label="备注" width="140" show-overflow-tooltip />
        <el-table-column prop="repair_date" label="送修时间" width="170" />
        <el-table-column label="操作" width="180" fixed="right" v-if="authStore.hasPermission('repair:edit')">
          <template #default="{ row }">
            <template v-if="row.status === 'repairing'">
              <el-button type="success" text size="small" @click="handleUpdateStatus(row, 'repaired')">修复</el-button>
              <el-button type="danger" text size="small" @click="handleScrapFromRepair(row)">报废</el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrap">
        <el-pagination background layout="total, sizes, prev, pager, next" :total="total" v-model:current-page="page" v-model:page-size="pageSize" :page-sizes="[10, 20, 50]" @change="loadData" />
      </div>
    </div>

    <el-dialog v-model="dialogVisible" title="新增维修登记" width="500px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="80px">
        <el-form-item label="物资" prop="goods_id">
          <el-select v-model="form.goods_id" filterable placeholder="请选择" style="width: 100%;">
            <el-option v-for="g in goodsList" :key="g.id" :label="g.name" :value="g.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="故障描述" prop="fault_desc"><el-input v-model="form.fault_desc" type="textarea" :rows="3" /></el-form-item>
        <el-form-item label="维修费用"><el-input-number v-model="form.cost" :min="0" :precision="2" style="width: 100%;" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" /></el-form-item>
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
import { repairApi, goodsApi } from '@/api'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const loading = ref(false)
const submitting = ref(false)
const tableData = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const search = reactive({ keyword: '', status: '' })
const dialogVisible = ref(false)
const formRef = ref<FormInstance>()
const goodsList = ref<any[]>([])
const form = reactive({ goods_id: '' as any, fault_desc: '', cost: 0, remark: '' })
const formRules = {
  goods_id: [{ required: true, message: '请选择物资', trigger: 'change' }],
  fault_desc: [{ required: true, message: '请描述故障', trigger: 'blur' }],
}

const repairStatusText = (s: string) => ({ repairing: '维修中', repaired: '已修复', scrapped: '已报废' }[s] || s)
const repairStatusType = (s: string) => ({ repairing: 'warning', repaired: 'success', scrapped: 'danger' }[s] || 'info') as any

async function loadData() {
  loading.value = true
  try {
    const res: any = await repairApi.list({ page: page.value, pageSize: pageSize.value, ...search })
    tableData.value = res.data?.list || []
    total.value = res.data?.total || 0
  } finally { loading.value = false }
}

async function loadGoods() {
  const res: any = await goodsApi.list({ page: 1, pageSize: 200 })
  goodsList.value = (res.data?.list || []).filter((g: any) => g.status !== 'scrapped')
}

function openDialog() {
  Object.assign(form, { goods_id: '', fault_desc: '', cost: 0, remark: '' })
  dialogVisible.value = true
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  submitting.value = true
  try {
    await repairApi.create(form)
    ElMessage.success('维修登记成功')
    dialogVisible.value = false
    loadData()
  } finally { submitting.value = false }
}

async function handleUpdateStatus(row: any, status: string) {
  await ElMessageBox.confirm('确认该物资已修复？', '确认修复', { type: 'info' })
  await repairApi.update(row.id, { status })
  ElMessage.success('已标记修复')
  loadData()
}

async function handleScrapFromRepair(row: any) {
  await ElMessageBox.confirm('确认该物资无法修复，转为报废？', '确认报废', { type: 'warning' })
  await repairApi.update(row.id, { status: 'scrapped' })
  ElMessage.success('已转为报废')
  loadData()
}

onMounted(() => { loadData(); loadGoods() })
</script>
