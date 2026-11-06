<template>
  <div>
    <div class="page-header"><h2>数据大盘</h2></div>
    <!-- Overview Cards -->
    <el-row :gutter="16" style="margin-bottom: 16px;">
      <el-col :span="4" v-for="item in statCards" :key="item.label">
        <div class="stat-card" style="text-align: center;">
          <div class="stat-value" :style="{ color: item.color }">{{ item.value }}</div>
          <div class="stat-label">{{ item.label }}</div>
        </div>
      </el-col>
    </el-row>

    <!-- Charts Row -->
    <el-row :gutter="16" style="margin-bottom: 16px;">
      <el-col :span="12">
        <div class="chart-container">
          <h3>月度领用趋势</h3>
          <div ref="lineChartRef" style="height: 300px;"></div>
        </div>
      </el-col>
      <el-col :span="12">
        <div class="chart-container">
          <h3>物资分类占比</h3>
          <div ref="pieChartRef" style="height: 300px;"></div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-bottom: 16px;">
      <el-col :span="12">
        <div class="chart-container">
          <h3>维修次数统计</h3>
          <div ref="barChartRef" style="height: 300px;"></div>
        </div>
      </el-col>
      <el-col :span="12">
        <div class="chart-container">
          <h3 style="color: #f56c6c;">
            <el-icon><WarningFilled /></el-icon> 预警物资
          </h3>
          <el-table :data="alertGoods" size="small" max-height="280" :row-class-name="alertRowClass">
            <el-table-column prop="name" label="物资名称" />
            <el-table-column prop="category_name" label="分类" width="100" />
            <el-table-column prop="stock" label="当前库存" width="90" align="center" />
            <el-table-column prop="warning_threshold" label="预警阈值" width="90" align="center" />
            <el-table-column label="状态" width="80" align="center">
              <template #default>
                <el-tag type="danger" size="small">预警</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'
import { reportApi } from '@/api'

const data = ref<any>({ overview: {}, monthlyBorrows: [], categoryDist: [], repairStats: [], alertGoods: [] })
const lineChartRef = ref<HTMLElement>()
const pieChartRef = ref<HTMLElement>()
const barChartRef = ref<HTMLElement>()
let charts: echarts.ECharts[] = []

const statCards = computed(() => [
  { label: '物资总数', value: data.value.overview.totalGoods || 0, color: '#409eff' },
  { label: '在库数量', value: data.value.overview.totalStock || 0, color: '#67c23a' },
  { label: '已领出', value: data.value.overview.borrowedCount || 0, color: '#e6a23c' },
  { label: '维修中', value: data.value.overview.repairingCount || 0, color: '#f56c6c' },
  { label: '已报废', value: data.value.overview.scrappedCount || 0, color: '#909399' },
  { label: '库存预警', value: data.value.overview.alertCount || 0, color: '#ff4d4f' },
])

const alertGoods = computed(() => data.value.alertGoods || [])

function alertRowClass() { return 'alert-row' }

function initLineChart() {
  if (!lineChartRef.value) return
  const chart = echarts.init(lineChartRef.value)
  charts.push(chart)
  const months = (data.value.monthlyBorrows || []).map((i: any) => i.month)
  const counts = (data.value.monthlyBorrows || []).map((i: any) => i.quantity)
  chart.setOption({
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: months, axisLabel: { rotate: 30 } },
    yAxis: { type: 'value', name: '领用数量' },
    series: [{ data: counts, type: 'line', smooth: true, areaStyle: { opacity: 0.3 }, itemStyle: { color: '#409eff' } }],
    grid: { left: 50, right: 20, top: 30, bottom: 50 },
  })
}

function initPieChart() {
  if (!pieChartRef.value) return
  const chart = echarts.init(pieChartRef.value)
  charts.push(chart)
  const pieData = (data.value.categoryDist || []).map((i: any) => ({ name: i.name, value: i.stock }))
  chart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { orient: 'vertical', right: 10, top: 'center' },
    series: [{
      type: 'pie', radius: ['40%', '70%'], center: ['40%', '50%'],
      data: pieData, emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.5)' } },
      label: { show: false },
    }],
  })
}

function initBarChart() {
  if (!barChartRef.value) return
  const chart = echarts.init(barChartRef.value)
  charts.push(chart)
  const months = (data.value.repairStats || []).map((i: any) => i.month)
  const counts = (data.value.repairStats || []).map((i: any) => i.count)
  chart.setOption({
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: months, axisLabel: { rotate: 30 } },
    yAxis: { type: 'value', name: '维修次数' },
    series: [{ data: counts, type: 'bar', itemStyle: { color: '#e6a23c', borderRadius: [4, 4, 0, 0] } }],
    grid: { left: 50, right: 20, top: 30, bottom: 50 },
  })
}

function handleResize() { charts.forEach(c => c.resize()) }

onMounted(async () => {
  try {
    const res: any = await reportApi.dashboard()
    data.value = res.data || {}
  } catch (e) { /* handled */ }
  setTimeout(() => {
    initLineChart()
    initPieChart()
    initBarChart()
    window.addEventListener('resize', handleResize)
  }, 100)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  charts.forEach(c => c.dispose())
})
</script>
