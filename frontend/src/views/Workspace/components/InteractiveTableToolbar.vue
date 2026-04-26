<template>
  <div class="table-toolbar">
    <div class="toolbar-left">
      <el-button text class="toolbar-btn" @click="$emit('drag')">
        <el-icon><Rank /></el-icon>
      </el-button>
      <el-button text class="toolbar-btn">
        <el-icon><Grid /></el-icon>
        <span>表格视图</span>
      </el-button>
      <el-button text class="toolbar-btn">
        <el-icon><Plus /></el-icon>
        <span>新建视图</span>
      </el-button>
    </div>
    
    <div class="toolbar-right">
      <el-tooltip content="设置" placement="bottom">
        <el-button text class="toolbar-btn" @click="$emit('settings')">
          <el-icon><Setting /></el-icon>
        </el-button>
      </el-tooltip>
      
      <el-tooltip content="视图切换" placement="bottom">
        <el-button text class="toolbar-btn" @click="$emit('viewSwitch')">
          <el-icon><List /></el-icon>
        </el-button>
      </el-tooltip>
      
      <el-tooltip content="排序" placement="bottom">
        <el-button text class="toolbar-btn" @click="$emit('sort')">
          <el-icon><Sort /></el-icon>
        </el-button>
      </el-tooltip>
      
      <el-tooltip content="筛选" placement="bottom">
        <el-button text class="toolbar-btn" @click="$emit('filter')">
          <el-icon><Filter /></el-icon>
        </el-button>
      </el-tooltip>
      
      <el-tooltip content="全部展开" placement="bottom">
        <el-button text class="toolbar-btn" @click="$emit('expandAll')">
          <el-icon><BottomRight /></el-icon>
        </el-button>
      </el-tooltip>
      
      <el-tooltip content="交换" placement="bottom">
        <el-button text class="toolbar-btn" @click="$emit('swap')">
          <el-icon><Share /></el-icon>
        </el-button>
      </el-tooltip>
      
      <el-tooltip content="搜索" placement="bottom">
        <el-button text class="toolbar-btn" @click="$emit('search')">
          <el-icon><Search /></el-icon>
        </el-button>
      </el-tooltip>
      
      <el-divider direction="vertical" />
      
      <el-button type="primary" text class="toolbar-btn add-btn" @click="$emit('addColumn')">
        <el-icon><Plus /></el-icon>
        <span>添加列</span>
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Rank,
  Grid,
  Plus,
  Setting,
  List,
  Sort,
  Filter,
  BottomRight,
  Share,
  Search,
} from '@element-plus/icons-vue'

defineEmits<{
  (e: 'drag'): void
  (e: 'settings'): void
  (e: 'viewSwitch'): void
  (e: 'sort'): void
  (e: 'filter'): void
  (e: 'expandAll'): void
  (e: 'swap'): void
  (e: 'search'): void
  (e: 'addColumn'): void
}>()
</script>

<style lang="scss" scoped>
.table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #e4e7ed;
  background: #fff;
  min-height: 40px;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.toolbar-btn {
  padding: 6px 10px;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #606266;
  border-radius: 4px;
  
  &:hover {
    background: #f5f7fa;
    color: #409eff;
  }
  
  .el-icon {
    font-size: 14px;
  }
}

.add-btn {
  color: #409eff;
  
  &:hover {
    background: #ecf5ff;
  }
}
</style>
