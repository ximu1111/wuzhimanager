<template>
  <div>
    <div class="page-header">
      <h2>
        <el-icon color="#f56c6c"><WarningFilled /></el-icon> 库存预警
      </h2>
      <el-tag type="danger" size="large">共 {{ total }} 项预警</el-tag>
    </div>
    <div class="table-container">
      <el-table :data="tableData" v-loading="loading" stripe :row-class-name="() => 'alert-row'">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="name" label="物资名称" min-width="140" />
        <el-table-column prop="category_name" label="分类" width="100" />
        <el-table-column prop="spec" label="规格型号" width="140" show-overflow-tooltip />
        <el-table-column prop="stock" label="当前库存" width="100" align="center">
          <template #default="{ row }">
            <span style="color: #f56c6c; font-weight: 700; font-size: 16px;">{{ row.stock }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="warning_threshold" label="预警阈值" width="100" align="center" />
        <el-table-column label="缺口" width="80" align="center">
          <template #default="{ row }">
            <el-tag type="danger" size="small">{{ row.warning_threshold - row.stock }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="supplier" label="供应商" width="120" show-overflow-tooltip />
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button v-if="authStore.hasPermission('stock_in:add')" type="primary" text size="small" @click="goStockIn(row)">去入库</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrap">
        <el-pagination background layout="total, sizes, prev, pager, next" :total="total" v-model:current-page="page" v-model:page-size="pageSize" :page-sizes="[10, 20, 50]" @change="loadData" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { reportApi } from '@/api'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()
const loading = ref(false)
const tableData = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

async function loadData() {
  loading.value = true
  try {
    const res: any = await reportApi.alerts({ page: page.value, pageSize: pageSize.value })
    tableData.value = res.data?.list || []
    total.value = res.data?.total || 0
  } finally { loading.value = false }
}

function goStockIn(row: any) {
  router.push({ path: '/stock-in', query: { goods_id: row.id } })
}

onMounted(() => { loadData() })
</script>
