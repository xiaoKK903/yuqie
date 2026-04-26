<template>
  <div class="table-selector">
    <div class="table-grid" @mouseleave="resetPreview">
      <div
        v-for="row in 10"
        :key="row"
        class="table-row"
      >
        <div
          v-for="col in 10"
          :key="col"
          class="table-cell"
          :class="{ active: isCellActive(row, col), preview: isCellPreview(row, col) }"
          @mouseenter="handleCellHover(row, col)"
          @click="handleCellClick(row, col)"
        >
          <span v-if="row === 1 && col === 1" class="first-cell-marker"></span>
        </div>
      </div>
    </div>
    <div class="table-size-info">
      {{ previewRows }} × {{ previewCols }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  (e: 'select', rows: number, cols: number): void
}>()

const previewRows = ref(1)
const previewCols = ref(1)

function handleCellHover(row: number, col: number) {
  previewRows.value = row
  previewCols.value = col
}

function resetPreview() {
  previewRows.value = 1
  previewCols.value = 1
}

function isCellPreview(row: number, col: number): boolean {
  return row <= previewRows.value && col <= previewCols.value
}

function isCellActive(row: number, col: number): boolean {
  return row === 1 && col === 1
}

function handleCellClick(row: number, col: number) {
  emit('select', row, col)
}
</script>

<style lang="scss" scoped>
.table-selector {
  padding: 12px;
  background: #fff;
  border-radius: 4px;
  width: 220px;
}

.table-grid {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 8px;
}

.table-row {
  display: flex;
  gap: 2px;
}

.table-cell {
  width: 18px;
  height: 18px;
  border: 1px solid #dcdfe6;
  border-radius: 2px;
  background: #fff;
  cursor: pointer;
  transition: all 0.15s;
  position: relative;
  
  &:hover {
    border-color: #409eff;
  }
  
  &.preview {
    background: #ecf5ff;
    border-color: #409eff;
  }
  
  &.active {
    background: #409eff;
    border-color: #409eff;
  }
  
  .first-cell-marker {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 6px;
    height: 6px;
    background: #409eff;
    border-radius: 50%;
    
    .table-cell.active & {
      background: #fff;
    }
  }
}

.table-size-info {
  text-align: center;
  font-size: 13px;
  color: #606266;
  padding-top: 4px;
  border-top: 1px solid #ebeef5;
}
</style>
