<template>
  <div>
    <div class="page-header">
      <h2>领用管理</h2>
      <el-button v-if="authStore.hasPermission('borrow:add')" type="primary" @click="openApplyDialog">
        <el-icon><Plus /></el-icon> 申请领用
      </el-button>
    </div>
    <div class="search-bar">
      <el-form :inline="true" :model="search">
        <el-form-item label="关键词"><el-input v-model="search.keyword" placeholder="物资名称/领用人" clearable @clear="loadData" @keyup.enter="loadData" /></el-form-item>
        <el-form-item label="状态">
          <el-select v-model="search.status" placeholder="全部" clearable @change="loadData">
            <el-option label="待审核" value="pending" />
            <el-option label="已领用" value="borrowed" />
            <el-option label="已归还" value="returned" />
            <el-option label="已驳回" value="rejected" />
          </el-select>
        </el-form-item>
        <el-form-item><el-button type="primary" @click="loadData">搜索</el-button></el-form-item>
      </el-form>
    </div>
    <div class="table-container">
      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="goods_name" label="物资名称" min-width="120" />
        <el-table-column prop="user_name" label="领用人" width="90" />
        <el-table-column prop="quantity" label="数量" width="70" align="center" />
        <el-table-column prop="purpose" label="用途" min-width="120" show-overflow-tooltip />
        <el-table-column prop="expected_return_date" label="预计归还" width="110" />
        <el-table-column prop="actual_return_date" label="实际归还" width="110" />
        <el-table-column prop="status" label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="borrowStatusType(row.status)" size="small">{{ borrowStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" width="120" show-overflow-tooltip />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <template v-if="row.status === 'pending' && authStore.hasPermission('borrow:audit')">
              <el-button type="success" text size="small" @click="handleAudit(row, 'approve')">通过</el-button>
              <el-button type="danger" text size="small" @click="handleAudit(row, 'reject')">驳回</el-button>
            </template>
            <el-button v-if="row.status === 'borrowed' && authStore.hasPermission('borrow:return')" type="primary" text size="small" @click="handleReturn(row)">归还</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrap">
        <el-pagination background layout="total, sizes, prev, pager, next" :total="total" v-model:current-page="page" v-model:page-size="pageSize" :page-sizes="[10, 20, 50]" @change="loadData" />
      </div>
    </div>

    <!-- Apply Dialog -->
    <el-dialog v-model="applyVisible" title="申请领用" width="480px" destroy-on-close>
      <el-form ref="applyFormRef" :model="applyForm" :rules="applyRules" label-width="90px">
        <el-form-item label="物资" prop="goods_id">
          <el-select v-model="applyForm.goods_id" filterable placeholder="请选择" style="width: 100%;">
            <el-option v-for="g in availableGoods" :key="g.id" :label="`${g.name} (库存:${g.stock})`" :value="g.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="数量" prop="quantity"><el-input-number v-model="applyForm.quantity" :min="1" style="width: 100%;" /></el-form-item>
        <el-form-item label="用途"><el-input v-model="applyForm.purpose" /></el-form-item>
        <el-form-item label="预计归还"><el-date-picker v-model="applyForm.expected_return_date" type="date" value-format="YYYY-MM-DD" style="width: 100%;" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="applyVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleApply">提交</el-button>
      </template>
    </el-dialog>

    <!-- Audit Dialog -->
    <el-dialog v-model="auditVisible" :title="auditAction === 'approve' ? '审核通过' : '驳回申请'" width="400px">
      <el-form label-width="60px">
        <el-form-item label="备注"><el-input v-model="auditRemark" type="textarea" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="auditVisible = false">取消</el-button>
        <el-button :type="auditAction === 'approve' ? 'success' : 'danger'" :loading="submitting" @click="confirmAudit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import { borrowApi, goodsApi } from '@/api'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const loading = ref(false)
const submitting = ref(false)
const tableData = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const search = reactive({ keyword: '', status: '' })
const applyVisible = ref(false)
const auditVisible = ref(false)
const auditAction = ref('approve')
const auditRemark = ref('')
const auditRow = ref<any>(null)
const applyFormRef = ref<FormInstance>()
const availableGoods = ref<any[]>([])

const applyForm = reactive({ goods_id: '' as any, quantity: 1, purpose: '', expected_return_date: '' })
const applyRules = {
  goods_id: [{ required: true, message: '请选择物资', trigger: 'change' }],
  quantity: [{ required: true, message: '请输入数量', trigger: 'blur' }],
}

const borrowStatusText = (s: string) => ({ pending: '待审核', borrowed: '已领用', returned: '已归还', rejected: '已驳回' }[s] || s)
const borrowStatusType = (s: string) => ({ pending: 'warning', borrowed: '', returned: 'success', rejected: 'danger' }[s] || 'info') as any

async function loadData() {
  loading.value = true
  try {
    const res: any = await borrowApi.list({ page: page.value, pageSize: pageSize.value, ...search })
    tableData.value = res.data?.list || []
    total.value = res.data?.total || 0
  } finally { loading.value = false }
}

async function openApplyDialog() {
  const res: any = await goodsApi.list({ page: 1, pageSize: 200, status: 'normal' })
  availableGoods.value = (res.data?.list || []).filter((g: any) => g.stock > 0)
  Object.assign(applyForm, { goods_id: '', quantity: 1, purpose: '', expected_return_date: '' })
  applyVisible.value = true
}

async function handleApply() {
  const valid = await applyFormRef.value?.validate().catch(() => false)
  if (!valid) return
  submitting.value = true
  try {
    await borrowApi.create(applyForm)
    ElMessage.success('申请已提交')
    applyVisible.value = false
    loadData()
  } finally { submitting.value = false }
}

function handleAudit(row: any, action: string) {
  auditRow.value = row
  auditAction.value = action
  auditRemark.value = ''
  auditVisible.value = true
}

async function confirmAudit() {
  submitting.value = true
  try {
    await borrowApi.audit(auditRow.value.id, { action: auditAction.value, remark: auditRemark.value })
    ElMessage.success(auditAction.value === 'approve' ? '审核通过' : '已驳回')
    auditVisible.value = false
    loadData()
  } finally { submitting.value = false }
}

async function handleReturn(row: any) {
  await ElMessageBox.confirm('确认归还该物资？', '确认归还', { type: 'info' })
  await borrowApi.returnGoods(row.id)
  ElMessage.success('归还成功')
  loadData()
}

onMounted(() => { loadData() })
</script>
