<template>
  <div class="version-history-dialog">
    <el-dialog
      v-model="visible"
      title="版本历史"
      width="800px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <div class="version-history-content">
        <div class="version-list" v-if="versions.length > 0">
          <div
            v-for="version in versions"
            :key="version.id"
            class="version-item"
            :class="{ 'version-item-active': selectedVersion?.id === version.id }"
            @click="selectVersion(version)"
          >
            <div class="version-header">
              <span class="version-badge">v{{ version.version }}</span>
              <span class="version-time">{{ formatTime(version.createdAt) }}</span>
            </div>
            <div class="version-summary" v-if="version.changeSummary">
              {{ version.changeSummary }}
            </div>
            <div class="version-actions" v-if="selectedVersion?.id === version.id">
              <el-button type="primary" size="small" @click.stop="compareWithCurrent(version)">
                与当前版本对比
              </el-button>
              <el-button type="warning" size="small" @click.stop="confirmRestore(version)">
                恢复到此版本
              </el-button>
              <el-button type="info" size="small" @click.stop="viewFullVersion(version)">
                查看内容
              </el-button>
            </div>
          </div>
        </div>
        <el-empty v-else description="暂无版本历史" />
      </div>

      <el-dialog
        v-model="compareDialogVisible"
        title="版本对比"
        width="900px"
        :close-on-click-modal="false"
      >
        <div class="compare-container">
          <div class="compare-header">
            <span class="compare-label">历史版本 v{{ selectedVersion?.version }}</span>
            <span class="compare-label">当前版本</span>
          </div>
          <div class="compare-content">
            <div class="compare-panel">
              <pre class="compare-text">{{ selectedVersion?.content || '' }}</pre>
            </div>
            <div class="compare-panel">
              <pre class="compare-text">{{ currentContent || '' }}</pre>
            </div>
          </div>
        </div>
      </el-dialog>

      <el-dialog
        v-model="viewDialogVisible"
        :title="`版本 v${selectedVersion?.version} 内容`"
        width="700px"
        :close-on-click-modal="false"
      >
        <div class="view-content">
          <pre class="view-text">{{ selectedVersion?.content || '' }}</pre>
        </div>
      </el-dialog>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { versionApi } from '@/api'
import type { DocumentVersion } from '@/types'

interface Props {
  modelValue: boolean
  documentId: number | null
  currentContent: string
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'restore', version: DocumentVersion): void
}

const props = withDefaults(defineProps<Props>(), {
  documentId: null,
  currentContent: '',
})

const emit = defineEmits<Emits>()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const versions = ref<DocumentVersion[]>([])
const selectedVersion = ref<DocumentVersion | null>(null)
const compareDialogVisible = ref(false)
const viewDialogVisible = ref(false)
const loading = ref(false)

watch(visible, async (val) => {
  if (val && props.documentId) {
    await loadVersions()
  }
})

async function loadVersions() {
  if (!props.documentId) return
  
  loading.value = true
  try {
    const res = await versionApi.getByDocumentId(props.documentId)
    versions.value = res.data.data || []
  } catch (error) {
    console.error('加载版本历史失败:', error)
    ElMessage.error('加载版本历史失败')
  } finally {
    loading.value = false
  }
}

function selectVersion(version: DocumentVersion) {
  if (selectedVersion.value?.id === version.id) {
    selectedVersion.value = null
  } else {
    selectedVersion.value = version
  }
}

function formatTime(time: string) {
  return new Date(time).toLocaleString('zh-CN')
}

function compareWithCurrent(version: DocumentVersion) {
  selectedVersion.value = version
  compareDialogVisible.value = true
}

function viewFullVersion(version: DocumentVersion) {
  selectedVersion.value = version
  viewDialogVisible.value = true
}

async function confirmRestore(version: DocumentVersion) {
  try {
    await ElMessageBox.confirm(
      `确定要恢复到版本 v${version.version} 吗？当前未保存的内容将被覆盖。`,
      '恢复版本确认',
      {
        confirmButtonText: '确定恢复',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    
    await versionApi.restore(version.id)
    
    emit('restore', version)
    ElMessage.success('版本恢复成功')
    visible.value = false
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('恢复版本失败:', error)
      ElMessage.error('恢复版本失败')
    }
  }
}

defineExpose({
  loadVersions,
})
</script>

<style lang="scss" scoped>
.version-history-dialog {
}

.version-history-content {
  max-height: 500px;
  overflow-y: auto;
}

.version-item {
  padding: 16px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #409eff;
    background-color: #f5f7fa;
  }

  &.version-item-active {
    border-color: #409eff;
    background-color: #ecf5ff;
  }
}

.version-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.version-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 12px;
  background-color: #409eff;
  color: #fff;
  border-radius: 4px;
  font-size: 14px;
  font-weight: bold;
}

.version-time {
  font-size: 13px;
  color: #909399;
}

.version-summary {
  font-size: 14px;
  color: #606266;
  margin-bottom: 12px;
}

.version-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #dcdfe6;
}

.compare-container {
}

.compare-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}

.compare-label {
  font-size: 14px;
  font-weight: bold;
  color: #606266;
  flex: 1;
  text-align: center;
}

.compare-content {
  display: flex;
  gap: 16px;
  max-height: 400px;
}

.compare-panel {
  flex: 1;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  overflow: hidden;
}

.compare-text {
  padding: 12px;
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 380px;
  overflow-y: auto;
}

.view-content {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
}

.view-text {
  padding: 16px;
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
