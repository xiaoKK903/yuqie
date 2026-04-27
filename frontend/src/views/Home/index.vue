<template>
  <div class="home-layout">
    <div class="home-header">
      <h1 class="home-title">知识库</h1>
      <el-dropdown @command="handleNewCommand" trigger="click">
        <el-button type="primary" :icon="Plus">
          新建
          <el-icon class="el-icon--right"><ArrowDown /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="document">
              <el-icon><Document /></el-icon>
              新建文档
            </el-dropdown-item>
            <el-dropdown-item command="table">
              <el-icon><Grid /></el-icon>
              新建表格
            </el-dropdown-item>
            <el-dropdown-item command="km">
              <el-icon><FolderOpened /></el-icon>
              新建知识库
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
    
    <div class="home-content">
      <div class="km-list">
        <div
          v-for="km in kms"
          :key="km.id"
          class="km-card"
          @click="enterKm(km.id)"
        >
          <div class="km-card-icon">
            <el-icon :size="32"><FolderOpened /></el-icon>
          </div>
          <div class="km-card-info">
            <h3 class="km-card-title">{{ km.name }}</h3>
            <p class="km-card-time">
              更新于 {{ formatTime(km.updatedAt) }}
            </p>
          </div>
        </div>
        
        <div
          v-if="kms.length === 0 && !loading"
          class="empty-state"
        >
          <el-empty description="暂无知识库，点击上方按钮创建">
            <el-button type="primary" @click="handleNewCommand('km')">
              新建知识库
            </el-button>
          </el-empty>
        </div>
        
        <div v-else-if="loading" class="loading-state">
          <el-icon class="is-loading" size="32"><Loading /></el-icon>
        </div>
      </div>
    </div>
    
    <el-dialog
      v-model="showCreateKmDialog"
      title="新建知识库"
      width="400px"
      :close-on-click-modal="false"
    >
      <el-form :model="createKmForm" label-width="80px">
        <el-form-item label="名称">
          <el-input
            v-model="createKmForm.name"
            placeholder="请输入知识库名称"
            @keyup.enter="handleCreateKm"
            autofocus
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateKmDialog = false">取消</el-button>
        <el-button type="primary" @click="handleCreateKm" :loading="creating">
          创建
        </el-button>
      </template>
    </el-dialog>
    
    <el-dialog
      v-model="showSelectKmDialog"
      title="选择知识库"
      width="500px"
      :close-on-click-modal="false"
    >
      <div class="km-select-list">
        <div
          v-if="kms.length === 0"
          class="km-select-empty"
        >
          <el-empty description="暂无知识库，请先创建知识库">
            <el-button type="primary" @click="showCreateKmDialog = true; showSelectKmDialog = false">
              新建知识库
            </el-button>
          </el-empty>
        </div>
        <template v-else>
          <div
            v-for="km in kms"
            :key="km.id"
            class="km-select-item"
            :class="{ 'is-active': selectedKmId === km.id }"
            @click="selectedKmId = km.id"
          >
            <el-icon class="km-select-icon"><FolderOpened /></el-icon>
            <span class="km-select-name">{{ km.name }}</span>
            <el-icon v-if="selectedKmId === km.id" class="km-select-check"><Check /></el-icon>
          </div>
        </template>
      </div>
      <template #footer>
        <el-button @click="showSelectKmDialog = false">取消</el-button>
        <el-button 
          type="primary" 
          @click="handleCreateDocument" 
          :loading="creating"
          :disabled="!selectedKmId"
        >
          创建{{ newType === 'document' ? '文档' : '表格' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { 
  Plus, 
  ArrowDown, 
  Document, 
  Grid, 
  FolderOpened, 
  Loading,
  Check
} from '@element-plus/icons-vue'
import { kmApi, documentApi } from '@/api'
import type { Km, InteractiveTableData } from '@/types'

const router = useRouter()

const kms = ref<Km[]>([])
const loading = ref(false)
const creating = ref(false)

const showCreateKmDialog = ref(false)
const createKmForm = ref({
  name: '',
})

const showSelectKmDialog = ref(false)
const selectedKmId = ref<number | null>(null)
const newType = ref<'document' | 'table'>('document')

function createDefaultTableData(): InteractiveTableData {
  const cols = 3
  const rows = 3
  
  const columns = []
  for (let i = 0; i < cols; i++) {
    columns.push({
      id: 'col_' + (i + 1),
      width: 150,
      fieldType: 'text',
      title: `字段${i + 1}`,
    })
  }
  
  const tableRows = []
  for (let i = 0; i < rows; i++) {
    tableRows.push({
      id: 'row_' + (i + 1),
      height: 40,
    })
  }
  
  const cells = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({
        rowId: 'row_' + (r + 1),
        colId: 'col_' + (c + 1),
        value: '',
      })
    }
  }
  
  return {
    id: `table_${Date.now()}`,
    columns,
    rows: tableRows,
    cells,
    mergeCells: [],
  }
}

function createTableContent(): string {
  const tableData = createDefaultTableData()
  return `:::table
${JSON.stringify(tableData, null, 2)}
:::`
}

async function loadKms() {
  loading.value = true
  try {
    const res = await kmApi.getAll()
    kms.value = res.data.data || []
  } catch (error) {
    console.error('加载知识库列表失败:', error)
    ElMessage.error('加载知识库列表失败')
  } finally {
    loading.value = false
  }
}

function handleNewCommand(command: string) {
  if (command === 'km') {
    createKmForm.value.name = ''
    showCreateKmDialog.value = true
  } else {
    newType.value = command as 'document' | 'table'
    selectedKmId.value = kms.value.length === 1 ? kms.value[0].id : null
    showSelectKmDialog.value = true
  }
}

async function handleCreateKm() {
  if (!createKmForm.value.name.trim()) {
    ElMessage.warning('请输入知识库名称')
    return
  }
  
  creating.value = true
  try {
    await kmApi.create({ name: createKmForm.value.name.trim() })
    ElMessage.success('知识库创建成功')
    showCreateKmDialog.value = false
    createKmForm.value.name = ''
    await loadKms()
  } catch (error) {
    console.error('创建知识库失败:', error)
    ElMessage.error('创建知识库失败')
  } finally {
    creating.value = false
  }
}

async function handleCreateDocument() {
  if (!selectedKmId.value) {
    ElMessage.warning('请选择知识库')
    return
  }
  
  const timestamp = Date.now()
  const title = newType.value === 'document' 
    ? `新建文档_${timestamp}`
    : `新建表格_${timestamp}`
  
  const content = newType.value === 'table' ? createTableContent() : ''
  
  creating.value = true
  try {
    const res = await documentApi.create({
      title,
      folderId: null,
      kmId: selectedKmId.value,
      content,
    })
    
    ElMessage.success(`${newType.value === 'document' ? '文档' : '表格'}创建成功`)
    showSelectKmDialog.value = false
    
    router.push(`/workspace?kmId=${selectedKmId.value}&docId=${res.data.data.id}`)
  } catch (error) {
    console.error('创建文档失败:', error)
    ElMessage.error('创建文档失败')
  } finally {
    creating.value = false
  }
}

function enterKm(kmId: number) {
  router.push(`/workspace?kmId=${kmId}`)
}

function formatTime(time: string) {
  if (!time) return ''
  const date = new Date(time)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

onMounted(() => {
  loadKms()
})
</script>

<style lang="scss" scoped>
.home-layout {
  width: 100%;
  height: 100%;
  background: #f5f7fa;
  padding: 40px;
  box-sizing: border-box;
}

.home-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
}

.home-title {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.home-content {
  max-width: 1200px;
}

.km-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.km-card {
  display: flex;
  align-items: center;
  padding: 20px;
  background: #fff;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  }
}

.km-card-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: linear-gradient(135deg, #409eff 0%, #67c23a 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  margin-right: 16px;
}

.km-card-info {
  flex: 1;
  min-width: 0;
}

.km-card-title {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
  margin: 0 0 6px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.km-card-time {
  font-size: 13px;
  color: #909399;
  margin: 0;
}

.empty-state,
.loading-state {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
}

.loading-state {
  .el-icon {
    animation: rotate 1s linear infinite;
  }
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.km-select-list {
  max-height: 400px;
  overflow-y: auto;
}

.km-select-empty {
  padding: 40px 0;
}

.km-select-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: #f5f7fa;
  }
  
  &.is-active {
    background: #ecf5ff;
  }
}

.km-select-icon {
  font-size: 20px;
  color: #409eff;
  margin-right: 12px;
}

.km-select-name {
  flex: 1;
  font-size: 14px;
  color: #303133;
}

.km-select-check {
  font-size: 18px;
  color: #409eff;
}
</style>
