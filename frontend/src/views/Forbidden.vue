<template>
  <div style="height: 100vh; display: flex; align-items: center; justify-content: center; background: #f0f2f5;">
    <div style="text-align: center;">
      <el-icon :size="80" color="#f56c6c"><WarningFilled /></el-icon>
      <h1 style="margin: 20px 0; color: #303133;">403</h1>
      <p style="color: #909399; margin-bottom: 24px;">抱歉，您没有权限访问此页面</p>
      <el-button type="primary" @click="$router.push('/dashboard')">返回首页</el-button>
    </div>
  </div>
</template>
