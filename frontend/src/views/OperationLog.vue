<template>
  <div>
    <div class="page-header"><h2>操作日志</h2></div>
    <div class="search-bar">
      <el-form :inline="true" :model="search">
        <el-form-item label="关键词"><el-input v-model="search.keyword" placeholder="操作人/操作内容" clearable @clear="loadData" @keyup.enter="loadData" /></el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker v-model="search.dateRange" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始日期" end-placeholder="结束日期" @change="handleDateChange" />
        </el-form-item>
        <el-form-item><el-button type="primary" @click="loadData">搜索</el-button></el-form-item>
      </el-form>
    </div>
    <div class="table-container">
      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="username" label="操作人" width="100" />
        <el-table-column prop="action" label="操作内容" min-width="280" show-overflow-tooltip />
        <el-table-column prop="ip" label="IP地址" width="140" />
        <el-table-column prop="created_at" label="操作时间" width="170" />
      </el-table>
      <div class="pagination-wrap">
        <el-pagination background layout="total, sizes, prev, pager, next" :total="total" v-model:current-page="page" v-model:page-size="pageSize" :page-sizes="[20, 50, 100]" @change="loadData" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { logApi } from '@/api'

const loading = ref(false)
const tableData = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const search = reactive({ keyword: '', dateRange: null as any, start_date: '', end_date: '' })

function handleDateChange(val: any) {
  if (val) {
    search.start_date = val[0]
    search.end_date = val[1]
  } else {
    search.start_date = ''
    search.end_date = ''
  }
  loadData()
}

async function loadData() {
  loading.value = true
  try {
    const res: any = await logApi.list({ page: page.value, pageSize: pageSize.value, keyword: search.keyword, start_date: search.start_date, end_date: search.end_date })
    tableData.value = res.data?.list || []
    total.value = res.data?.total || 0
  } finally { loading.value = false }
}

onMounted(() => { loadData() })
</script>
