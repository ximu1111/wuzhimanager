<template>
  <div>
    <div class="page-header">
      <h2>报废记录</h2>
      <el-button v-if="authStore.hasPermission('scrap:add')" type="danger" @click="dialogVisible = true">
        <el-icon><Delete /></el-icon> 登记报废
      </el-button>
    </div>
    <div class="search-bar">
      <el-form :inline="true" :model="search">
        <el-form-item label="关键词"><el-input v-model="search.keyword" placeholder="物资名称/规格" clearable @clear="loadData" @keyup.enter="loadData" /></el-form-item>
        <el-form-item><el-button type="primary" @click="loadData">搜索</el-button></el-form-item>
      </el-form>
    </div>
    <div class="table-container">
      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="name" label="物资名称" min-width="140" />
        <el-table-column prop="category_name" label="分类" width="100" />
        <el-table-column prop="spec" label="规格型号" width="140" show-overflow-tooltip />
        <el-table-column prop="purchase_price" label="采购单价" width="100" align="right">
          <template #default="{ row }">¥{{ row.purchase_price?.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="remark" label="报废原因" min-width="180" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="90" align="center">
          <template #default><el-tag type="danger" size="small">已报废</el-tag></template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrap">
        <el-pagination background layout="total, sizes, prev, pager, next" :total="total" v-model:current-page="page" v-model:page-size="pageSize" :page-sizes="[10, 20, 50]" @change="loadData" />
      </div>
    </div>

    <el-dialog v-model="dialogVisible" title="登记报废" width="480px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="80px">
        <el-form-item label="物资" prop="goods_id">
          <el-select v-model="form.goods_id" filterable placeholder="请选择物资" style="width: 100%;">
            <el-option v-for="g in goodsList" :key="g.id" :label="`${g.name} (库存:${g.stock})`" :value="g.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="报废原因" prop="reason"><el-input v-model="form.reason" type="textarea" :rows="3" placeholder="请填写报废原因" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="danger" :loading="submitting" @click="handleSubmit">确认报废</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import { scrapApi, goodsApi } from '@/api'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const loading = ref(false)
const submitting = ref(false)
const tableData = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const search = reactive({ keyword: '' })
const dialogVisible = ref(false)
const formRef = ref<FormInstance>()
const goodsList = ref<any[]>([])
const form = reactive({ goods_id: '' as any, reason: '' })
const formRules = {
  goods_id: [{ required: true, message: '请选择物资', trigger: 'change' }],
  reason: [{ required: true, message: '请填写报废原因', trigger: 'blur' }],
}

async function loadData() {
  loading.value = true
  try {
    const res: any = await scrapApi.list({ page: page.value, pageSize: pageSize.value, ...search })
    tableData.value = res.data?.list || []
    total.value = res.data?.total || 0
  } finally { loading.value = false }
}

async function loadGoods() {
  const res: any = await goodsApi.list({ page: 1, pageSize: 200 })
  goodsList.value = (res.data?.list || []).filter((g: any) => g.status !== 'scrapped' && g.stock > 0)
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  await ElMessageBox.confirm('报废后物资库存将清零且不可恢复，确认报废？', '确认报废', { type: 'warning' })
  submitting.value = true
  try {
    await scrapApi.create(form)
    ElMessage.success('报废成功')
    dialogVisible.value = false
    loadData()
  } finally { submitting.value = false }
}

onMounted(() => { loadData(); loadGoods() })
</script>
