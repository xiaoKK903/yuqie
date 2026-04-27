<template>
  <div class="home-layout">
    <div class="home-header">
      <h1 class="home-title">知识库</h1>
      <el-button type="primary" :icon="Plus" @click="showCreateDialog = true">
        新建知识库
      </el-button>
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
            <el-button type="primary" @click="showCreateDialog = true">
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
      v-model="showCreateDialog"
      title="新建知识库"
      width="400px"
      :close-on-click-modal="false"
    >
      <el-form :model="createForm" label-width="80px">
        <el-form-item label="名称">
          <el-input
            v-model="createForm.name"
            placeholder="请输入知识库名称"
            @keyup.enter="handleCreate"
            autofocus
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="handleCreate" :loading="creating">
          创建
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Plus, FolderOpened, Loading } from '@element-plus/icons-vue'
import { kmApi } from '@/api'
import type { Km } from '@/types'

const router = useRouter()

const kms = ref<Km[]>([])
const loading = ref(false)
const creating = ref(false)
const showCreateDialog = ref(false)
const createForm = ref({
  name: '',
})

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

async function handleCreate() {
  if (!createForm.value.name.trim()) {
    ElMessage.warning('请输入知识库名称')
    return
  }
  
  creating.value = true
  try {
    const res = await kmApi.create({ name: createForm.value.name.trim() })
    ElMessage.success('知识库创建成功')
    showCreateDialog.value = false
    createForm.value.name = ''
    await loadKms()
  } catch (error) {
    console.error('创建知识库失败:', error)
    ElMessage.error('创建知识库失败')
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
</style>
