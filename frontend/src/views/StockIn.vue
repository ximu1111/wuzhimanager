<template>
  <div>
    <div class="page-header">
      <h2>入库记录</h2>
      <el-button v-if="authStore.hasPermission('stock_in:add')" type="primary" @click="dialogVisible = true">
        <el-icon><Plus /></el-icon> 新增入库
      </el-button>
    </div>
    <div class="search-bar">
      <el-form :inline="true" :model="search">
        <el-form-item label="关键词"><el-input v-model="search.keyword" placeholder="物资名称/操作人" clearable @clear="loadData" @keyup.enter="loadData" /></el-form-item>
        <el-form-item><el-button type="primary" @click="loadData">搜索</el-button></el-form-item>
      </el-form>
    </div>
    <div class="table-container">
      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="goods_name" label="物资名称" min-width="140" />
        <el-table-column prop="spec" label="规格" width="120" show-overflow-tooltip />
        <el-table-column prop="quantity" label="入库数量" width="100" align="center">
          <template #default="{ row }"><el-tag type="success">+{{ row.quantity }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="operator_name" label="操作人" width="100" />
        <el-table-column prop="remark" label="备注" min-width="140" show-overflow-tooltip />
        <el-table-column prop="created_at" label="入库时间" width="170" />
      </el-table>
      <div class="pagination-wrap">
        <el-pagination background layout="total, sizes, prev, pager, next" :total="total" v-model:current-page="page" v-model:page-size="pageSize" :page-sizes="[10, 20, 50]" @change="loadData" />
      </div>
    </div>

    <el-dialog v-model="dialogVisible" title="新增入库" width="480px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="80px">
        <el-form-item label="物资" prop="goods_id">
          <el-select v-model="form.goods_id" filterable placeholder="请选择物资" style="width: 100%;">
            <el-option v-for="g in goodsList" :key="g.id" :label="`${g.name} (库存:${g.stock})`" :value="g.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="数量" prop="quantity"><el-input-number v-model="form.quantity" :min="1" style="width: 100%;" /></el-form-item>
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
import { ElMessage, type FormInstance } from 'element-plus'
import { stockInApi, goodsApi } from '@/api'
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
const form = reactive({ goods_id: '' as any, quantity: 1, remark: '' })
const formRules = {
  goods_id: [{ required: true, message: '请选择物资', trigger: 'change' }],
  quantity: [{ required: true, message: '请输入数量', trigger: 'blur' }],
}

async function loadData() {
  loading.value = true
  try {
    const res: any = await stockInApi.list({ page: page.value, pageSize: pageSize.value, ...search })
    tableData.value = res.data?.list || []
    total.value = res.data?.total || 0
  } finally { loading.value = false }
}

async function loadGoods() {
  const res: any = await goodsApi.list({ page: 1, pageSize: 200, status: 'normal' })
  goodsList.value = res.data?.list || []
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  submitting.value = true
  try {
    await stockInApi.create(form)
    ElMessage.success('入库成功')
    dialogVisible.value = false
    loadData()
  } finally { submitting.value = false }
}

onMounted(() => { loadData(); loadGoods() })
</script>
