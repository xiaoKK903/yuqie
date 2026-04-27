<template>
  <div class="canvas-wrapper">
    <div class="canvas-toolbar">
      <div class="tool-group">
        <el-button
          text
          class="tool-btn"
          :class="{ 'is-active': currentTool === 'select' }"
          @click="currentTool = 'select'"
          title="选择"
        >
          <span class="tool-icon">⊶</span>
        </el-button>
        <el-button
          text
          class="tool-btn"
          :class="{ 'is-active': currentTool === 'pen' }"
          @click="currentTool = 'pen'"
          title="画笔"
        >
          <span class="tool-icon">✎</span>
        </el-button>
        <el-button
          text
          class="tool-btn"
          :class="{ 'is-active': currentTool === 'rectangle' }"
          @click="currentTool = 'rectangle'"
          title="矩形"
        >
          <span class="tool-icon">□</span>
        </el-button>
        <el-button
          text
          class="tool-btn"
          :class="{ 'is-active': currentTool === 'circle' }"
          @click="currentTool = 'circle'"
          title="圆形"
        >
          <span class="tool-icon">○</span>
        </el-button>
        <el-button
          text
          class="tool-btn"
          :class="{ 'is-active': currentTool === 'line' }"
          @click="currentTool = 'line'"
          title="线条"
        >
          <span class="tool-icon">／</span>
        </el-button>
        <el-button
          text
          class="tool-btn"
          :class="{ 'is-active': currentTool === 'arrow' }"
          @click="currentTool = 'arrow'"
          title="箭头"
        >
          <span class="tool-icon">→</span>
        </el-button>
        <el-button
          text
          class="tool-btn"
          :class="{ 'is-active': currentTool === 'text' }"
          @click="currentTool = 'text'"
          title="文字"
        >
          <span class="tool-icon">T</span>
        </el-button>
        <el-button
          text
          class="tool-btn"
          :class="{ 'is-active': currentTool === 'eraser' }"
          @click="currentTool = 'eraser'"
          title="橡皮"
        >
          <span class="tool-icon">✕</span>
        </el-button>
      </div>

      <div class="separator"></div>

      <div class="tool-group">
        <el-button
          text
          class="tool-btn"
          @click="handleUndo"
          :disabled="historyIndex <= 0"
          title="撤销"
        >
          <span class="tool-icon">↶</span>
        </el-button>
        <el-button
          text
          class="tool-btn"
          @click="handleRedo"
          :disabled="historyIndex >= history.length - 1"
          title="重做"
        >
          <span class="tool-icon">↷</span>
        </el-button>
      </div>

      <div class="separator"></div>

      <div class="tool-group" v-if="currentTool !== 'select' && currentTool !== 'eraser'">
        <div class="color-picker">
          <span class="label">描边:</span>
          <input
            type="color"
            v-model="strokeColor"
            class="color-input"
            @change="saveToHistory"
          />
        </div>
        <div class="color-picker" v-if="currentTool === 'rectangle' || currentTool === 'circle'">
          <span class="label">填充:</span>
          <input
            type="color"
            v-model="fillColor"
            class="color-input"
            @change="saveToHistory"
          />
        </div>
        <div class="stroke-width">
          <span class="label">线宽:</span>
          <el-slider
            v-model="strokeWidth"
            :min="1"
            :max="20"
            :step="1"
            class="width-slider"
            @change="saveToHistory"
          />
          <span class="value">{{ strokeWidth }}</span>
        </div>
      </div>

      <div class="tool-group" v-if="currentTool === 'text'">
        <div class="font-size">
          <span class="label">字号:</span>
          <el-select v-model="fontSize" size="small" @change="saveToHistory">
            <el-option :value="12" label="12px" />
            <el-option :value="14" label="14px" />
            <el-option :value="16" label="16px" />
            <el-option :value="18" label="18px" />
            <el-option :value="24" label="24px" />
            <el-option :value="32" label="32px" />
            <el-option :value="48" label="48px" />
          </el-select>
        </div>
      </div>
    </div>

    <div class="canvas-container" ref="canvasContainerRef">
      <svg
        ref="canvasRef"
        :width="canvasData.width"
        :height="canvasData.height"
        class="canvas-svg"
        @mousedown="handleMouseDown"
        @mousemove="handleMouseMove"
        @mouseup="handleMouseUp"
        @mouseleave="handleMouseUp"
      >
        <rect
          :width="canvasData.width"
          :height="canvasData.height"
          :fill="canvasData.backgroundColor"
        />

        <template v-for="element in canvasData.elements" :key="element.id">
          <g
            v-if="element.type === 'pen' && element.points && element.points.length > 0"
            @mousedown.stop="handleElementClick(element, $event)"
          >
            <path
              :d="getPathD(element.points)"
              :fill="'none'"
              :stroke="element.strokeColor"
              :stroke-width="element.strokeWidth"
              :stroke-linecap="'round'"
              :stroke-linejoin="'round'"
              :class="{ 'element-selected': element.isSelected }"
            />
          </g>

          <rect
            v-else-if="element.type === 'rectangle'"
            :x="element.x"
            :y="element.y"
            :width="element.width"
            :height="element.height"
            :fill="element.fillColor || 'transparent'"
            :stroke="element.strokeColor"
            :stroke-width="element.strokeWidth"
            :class="{ 'element-selected': element.isSelected }"
            @mousedown.stop="handleElementClick(element, $event)"
          />

          <ellipse
            v-else-if="element.type === 'circle'"
            :cx="(element.x || 0) + (element.width || 0) / 2"
            :cy="(element.y || 0) + (element.height || 0) / 2"
            :rx="Math.abs((element.width || 0) / 2)"
            :ry="Math.abs((element.height || 0) / 2)"
            :fill="element.fillColor || 'transparent'"
            :stroke="element.strokeColor"
            :stroke-width="element.strokeWidth"
            :class="{ 'element-selected': element.isSelected }"
            @mousedown.stop="handleElementClick(element, $event)"
          />

          <line
            v-else-if="element.type === 'line'"
            :x1="element.startX"
            :y1="element.startY"
            :x2="element.endX"
            :y2="element.endY"
            :stroke="element.strokeColor"
            :stroke-width="element.strokeWidth"
            :stroke-linecap="'round'"
            :class="{ 'element-selected': element.isSelected }"
            @mousedown.stop="handleElementClick(element, $event)"
          />

          <g
            v-else-if="element.type === 'arrow'"
            @mousedown.stop="handleElementClick(element, $event)"
          >
            <line
              :x1="element.startX"
              :y1="element.startY"
              :x2="element.endX"
              :y2="element.endY"
              :stroke="element.strokeColor"
              :stroke-width="element.strokeWidth"
              :stroke-linecap="'round'"
            />
            <path
              :d="getArrowPath(element)"
              :fill="element.strokeColor"
            />
          </g>

          <text
            v-else-if="element.type === 'text'"
            :x="element.x"
            :y="element.y"
            :fill="element.strokeColor"
            :font-size="element.fontSize || 16"
            :class="{ 'element-selected': element.isSelected }"
            @mousedown.stop="handleElementClick(element, $event)"
            :contenteditable="false"
          >
            {{ element.text }}
          </text>
        </template>

        <rect
          v-if="isDrawing && currentTool === 'rectangle' && drawStartX !== null && drawStartY !== null"
          :x="Math.min(drawStartX, currentX)"
          :y="Math.min(drawStartY, currentY)"
          :width="Math.abs(currentX - drawStartX)"
          :height="Math.abs(currentY - drawStartY)"
          :fill="fillColor || 'transparent'"
          :stroke="strokeColor"
          :stroke-width="strokeWidth"
          :stroke-dasharray="'5,5'"
        />

        <ellipse
          v-else-if="isDrawing && currentTool === 'circle' && drawStartX !== null && drawStartY !== null"
          :cx="drawStartX + (currentX - drawStartX) / 2"
          :cy="drawStartY + (currentY - drawStartY) / 2"
          :rx="Math.abs((currentX - drawStartX) / 2)"
          :ry="Math.abs((currentY - drawStartY) / 2)"
          :fill="fillColor || 'transparent'"
          :stroke="strokeColor"
          :stroke-width="strokeWidth"
          :stroke-dasharray="'5,5'"
        />

        <line
          v-else-if="isDrawing && (currentTool === 'line' || currentTool === 'arrow') && drawStartX !== null && drawStartY !== null"
          :x1="drawStartX"
          :y1="drawStartY"
          :x2="currentX"
          :y2="currentY"
          :stroke="strokeColor"
          :stroke-width="strokeWidth"
          :stroke-dasharray="'5,5'"
        />

        <path
          v-if="isDrawing && currentTool === 'pen' && drawingPoints.length > 1"
          :d="getPathD(drawingPoints)"
          :fill="'none'"
          :stroke="strokeColor"
          :stroke-width="strokeWidth"
          :stroke-linecap="'round'"
          :stroke-linejoin="'round'"
        />

        <rect
          v-if="isSelecting && drawStartX !== null && drawStartY !== null"
          :x="Math.min(drawStartX, currentX)"
          :y="Math.min(drawStartY, currentY)"
          :width="Math.abs(currentX - drawStartX)"
          :height="Math.abs(currentY - drawStartY)"
          :fill="'rgba(64, 158, 255, 0.1)'"
          :stroke="'#409EFF'"
          :stroke-width="1"
          :stroke-dasharray="'3,3'"
        />

        <foreignObject
          v-if="isEditingText && editingTextElement"
          :x="editingTextElement.x"
          :y="(editingTextElement.y || 0) - (editingTextElement.fontSize || 16)"
          :width="300"
          :height="100"
        >
          <input
            ref="textInputRef"
            v-model="editingText"
            class="text-input"
            :style="{
              fontSize: (editingTextElement.fontSize || 16) + 'px',
              color: editingTextElement.strokeColor
            }"
            @blur="handleTextEditBlur"
            @keydown.enter="handleTextEditBlur"
          />
        </foreignObject>
      </svg>

      <div class="canvas-delete-btn" v-if="hasSelectedElements" @click="deleteSelectedElements">
        <el-button type="danger" size="small">删除选中</el-button>
      </div>
    </div>

    <div class="canvas-footer">
      <span class="footer-info">工具: {{ getToolLabel(currentTool) }}</span>
      <span class="footer-info">元素数量: {{ canvasData.elements.length }}</span>
      <span class="footer-info">选中: {{ selectedElementIds.length }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import type { InteractiveCanvasData, CanvasElement, CanvasTool, CanvasShapeType } from '@/types'

interface Props {
  modelValue: InteractiveCanvasData
}

interface Emits {
  (e: 'update:modelValue', data: InteractiveCanvasData): void
  (e: 'delete'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const canvasRef = ref<SVGSVGElement | null>(null)
const canvasContainerRef = ref<HTMLDivElement | null>(null)
const textInputRef = ref<HTMLInputElement | null>(null)

const currentTool = ref<CanvasTool>('pen')
const strokeColor = ref('#333333')
const fillColor = ref('transparent')
const strokeWidth = ref(2)
const fontSize = ref(16)

const isDrawing = ref(false)
const isSelecting = ref(false)
const drawStartX = ref<number | null>(null)
const drawStartY = ref<number | null>(null)
const currentX = ref(0)
const currentY = ref(0)
const drawingPoints = ref<{ x: number; y: number }[]>([])

const selectedElementIds = ref<Set<string>>(new Set())
const hasSelectedElements = computed(() => selectedElementIds.value.size > 0)

const isEditingText = ref(false)
const editingTextElement = ref<CanvasElement | null>(null)
const editingText = ref('')

const history = ref<InteractiveCanvasData[]>([])
const historyIndex = ref(-1)

const canvasData = ref<InteractiveCanvasData>(JSON.parse(JSON.stringify(props.modelValue)))

watch(() => props.modelValue, (newVal) => {
  canvasData.value = JSON.parse(JSON.stringify(newVal))
}, { deep: true })

onMounted(() => {
  initHistory()
})

function initHistory() {
  history.value = [JSON.parse(JSON.stringify(canvasData.value))]
  historyIndex.value = 0
}

function saveToHistory() {
  const newData = JSON.parse(JSON.stringify(canvasData.value))
  
  if (historyIndex.value < history.value.length - 1) {
    history.value = history.value.slice(0, historyIndex.value + 1)
  }
  
  history.value.push(newData)
  historyIndex.value = history.value.length - 1
  
  emit('update:modelValue', JSON.parse(JSON.stringify(canvasData.value)))
}

function handleUndo() {
  if (historyIndex.value > 0) {
    historyIndex.value--
    canvasData.value = JSON.parse(JSON.stringify(history.value[historyIndex.value]))
    emit('update:modelValue', JSON.parse(JSON.stringify(canvasData.value)))
  }
}

function handleRedo() {
  if (historyIndex.value < history.value.length - 1) {
    historyIndex.value++
    canvasData.value = JSON.parse(JSON.stringify(history.value[historyIndex.value]))
    emit('update:modelValue', JSON.parse(JSON.stringify(canvasData.value)))
  }
}

function generateId(): string {
  return 'el_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
}

function getMousePos(e: MouseEvent): { x: number; y: number } {
  if (!canvasRef.value) return { x: 0, y: 0 }
  const rect = canvasRef.value.getBoundingClientRect()
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  }
}

function getPathD(points: { x: number; y: number }[]): string {
  if (points.length < 2) return ''
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x} ${points[i].y}`
  }
  return d
}

function getArrowPath(element: CanvasElement): string {
  if (element.startX === undefined || element.startY === undefined ||
      element.endX === undefined || element.endY === undefined) {
    return ''
  }
  
  const angle = Math.atan2(element.endY - element.startY, element.endX - element.startX)
  const arrowLength = 10 + (element.strokeWidth || 2) * 2
  const arrowAngle = Math.PI / 6
  
  const x1 = element.endX - arrowLength * Math.cos(angle - arrowAngle)
  const y1 = element.endY - arrowLength * Math.sin(angle - arrowAngle)
  const x2 = element.endX - arrowLength * Math.cos(angle + arrowAngle)
  const y2 = element.endY - arrowLength * Math.sin(angle + arrowAngle)
  
  return `M ${element.endX} ${element.endY} L ${x1} ${y1} L ${x2} ${y2} Z`
}

function handleMouseDown(e: MouseEvent) {
  const pos = getMousePos(e)
  
  if (isEditingText.value) {
    const clickedOnEditingText = editingTextElement.value && 
      isPointInElement(pos, editingTextElement.value)
    
    if (!clickedOnEditingText) {
      handleTextEditBlur()
    }
    return
  }
  
  if (currentTool.value === 'text') {
    const clickedOnExistingText = canvasData.value.elements.some(el => 
      el.type === 'text' && isPointInElement(pos, el)
    )
    
    if (clickedOnExistingText) {
      return
    }
    
    const newElement: CanvasElement = {
      id: generateId(),
      type: 'text',
      x: pos.x,
      y: pos.y,
      text: '',
      strokeColor: strokeColor.value,
      strokeWidth: strokeWidth.value,
      fontSize: fontSize.value
    }
    
    canvasData.value.elements.push(newElement)
    saveToHistory()
    
    editingTextElement.value = newElement
    editingText.value = newElement.text || ''
    isEditingText.value = true
    
    nextTick(() => {
      textInputRef.value?.focus()
      textInputRef.value?.select()
    })
    return
  }
  
  if (currentTool.value === 'eraser') {
    return
  }
  
  drawStartX.value = pos.x
  drawStartY.value = pos.y
  currentX.value = pos.x
  currentY.value = pos.y
  
  if (currentTool.value === 'select') {
    isSelecting.value = true
  } else if (currentTool.value === 'pen') {
    isDrawing.value = true
    drawingPoints.value = [pos]
  } else {
    isDrawing.value = true
  }
}

function handleMouseMove(e: MouseEvent) {
  const pos = getMousePos(e)
  
  if (currentTool.value === 'eraser' && e.buttons === 1) {
    const elementIndex = canvasData.value.elements.findIndex(el => isPointInElement(pos, el))
    if (elementIndex !== -1) {
      canvasData.value.elements.splice(elementIndex, 1)
      saveToHistory()
    }
    return
  }
  
  if (!isDrawing.value && !isSelecting.value) return
  
  currentX.value = pos.x
  currentY.value = pos.y
  
  if (currentTool.value === 'pen' && drawingPoints.value.length > 0) {
    const lastPoint = drawingPoints.value[drawingPoints.value.length - 1]
    const dist = Math.sqrt(Math.pow(pos.x - lastPoint.x, 2) + Math.pow(pos.y - lastPoint.y, 2))
    if (dist > 2) {
      drawingPoints.value.push(pos)
    }
  }
}

function handleMouseUp() {
  if (isSelecting.value && drawStartX.value !== null && drawStartY.value !== null) {
    const selectionRect = {
      x1: Math.min(drawStartX.value, currentX.value),
      y1: Math.min(drawStartY.value, currentY.value),
      x2: Math.max(drawStartX.value, currentX.value),
      y2: Math.max(drawStartY.value, currentY.value)
    }
    
    selectedElementIds.value = new Set()
    canvasData.value.elements.forEach(el => {
      if (isElementInRect(el, selectionRect)) {
        selectedElementIds.value.add(el.id)
        el.isSelected = true
      } else {
        el.isSelected = false
      }
    })
    
    isSelecting.value = false
  }
  
  if (!isDrawing.value) return
  
  if (currentTool.value === 'pen' && drawingPoints.value.length > 1) {
    const newElement: CanvasElement = {
      id: generateId(),
      type: 'pen',
      points: [...drawingPoints.value],
      strokeColor: strokeColor.value,
      strokeWidth: strokeWidth.value
    }
    canvasData.value.elements.push(newElement)
    saveToHistory()
  } else if (drawStartX.value !== null && drawStartY.value !== null) {
    const tool = currentTool.value as CanvasShapeType
    
    if (tool === 'rectangle') {
      const newElement: CanvasElement = {
        id: generateId(),
        type: 'rectangle',
        x: Math.min(drawStartX.value, currentX.value),
        y: Math.min(drawStartY.value, currentY.value),
        width: Math.abs(currentX.value - drawStartX.value),
        height: Math.abs(currentY.value - drawStartY.value),
        strokeColor: strokeColor.value,
        strokeWidth: strokeWidth.value,
        fillColor: fillColor.value
      }
      canvasData.value.elements.push(newElement)
      saveToHistory()
    } else if (tool === 'circle') {
      const newElement: CanvasElement = {
        id: generateId(),
        type: 'circle',
        x: Math.min(drawStartX.value, currentX.value),
        y: Math.min(drawStartY.value, currentY.value),
        width: Math.abs(currentX.value - drawStartX.value),
        height: Math.abs(currentY.value - drawStartY.value),
        strokeColor: strokeColor.value,
        strokeWidth: strokeWidth.value,
        fillColor: fillColor.value
      }
      canvasData.value.elements.push(newElement)
      saveToHistory()
    } else if (tool === 'line' || tool === 'arrow') {
      const newElement: CanvasElement = {
        id: generateId(),
        type: tool,
        startX: drawStartX.value,
        startY: drawStartY.value,
        endX: currentX.value,
        endY: currentY.value,
        strokeColor: strokeColor.value,
        strokeWidth: strokeWidth.value
      }
      canvasData.value.elements.push(newElement)
      saveToHistory()
    }
  }
  
  isDrawing.value = false
  drawStartX.value = null
  drawStartY.value = null
  drawingPoints.value = []
}

function handleElementClick(element: CanvasElement, e: MouseEvent) {
  e.stopPropagation()
  
  if (currentTool.value === 'eraser') {
    const index = canvasData.value.elements.findIndex(el => el.id === element.id)
    if (index !== -1) {
      canvasData.value.elements.splice(index, 1)
      saveToHistory()
    }
    return
  }
  
  if (currentTool.value === 'select') {
    if (e.shiftKey) {
      if (selectedElementIds.value.has(element.id)) {
        selectedElementIds.value.delete(element.id)
        element.isSelected = false
      } else {
        selectedElementIds.value.add(element.id)
        element.isSelected = true
      }
    } else {
      canvasData.value.elements.forEach(el => {
        el.isSelected = el.id === element.id
      })
      selectedElementIds.value = new Set([element.id])
    }
  }
  
  if (element.type === 'text') {
    editingTextElement.value = element
    editingText.value = element.text || ''
    isEditingText.value = true
    
    nextTick(() => {
      textInputRef.value?.focus()
      textInputRef.value?.select()
    })
  }
}

function isPointInElement(point: { x: number; y: number }, element: CanvasElement): boolean {
  if (element.type === 'pen' && element.points) {
    for (const p of element.points) {
      const dist = Math.sqrt(Math.pow(point.x - p.x, 2) + Math.pow(point.y - p.y, 2))
      if (dist < (element.strokeWidth || 2) + 5) {
        return true
      }
    }
    return false
  } else if (element.type === 'rectangle') {
    return point.x >= (element.x || 0) &&
           point.x <= (element.x || 0) + (element.width || 0) &&
           point.y >= (element.y || 0) &&
           point.y <= (element.y || 0) + (element.height || 0)
  } else if (element.type === 'circle') {
    const cx = (element.x || 0) + (element.width || 0) / 2
    const cy = (element.y || 0) + (element.height || 0) / 2
    const rx = Math.abs((element.width || 0) / 2)
    const ry = Math.abs((element.height || 0) / 2)
    const distX = Math.pow(point.x - cx, 2) / Math.pow(rx + 5, 2)
    const distY = Math.pow(point.y - cy, 2) / Math.pow(ry + 5, 2)
    return distX + distY <= 1
  } else if (element.type === 'line' || element.type === 'arrow') {
    const dist = pointToLineDistance(
      point,
      { x: element.startX || 0, y: element.startY || 0 },
      { x: element.endX || 0, y: element.endY || 0 }
    )
    return dist < (element.strokeWidth || 2) + 5
  } else if (element.type === 'text') {
    const minWidth = 100
    const textWidth = Math.max(
      minWidth,
      (element.text?.length || 0) * (element.fontSize || 16) * 0.6
    )
    return point.x >= (element.x || 0) &&
           point.x <= (element.x || 0) + textWidth &&
           point.y >= (element.y || 0) - (element.fontSize || 16) &&
           point.y <= (element.y || 0)
  }
  return false
}

function pointToLineDistance(
  point: { x: number; y: number },
  lineStart: { x: number; y: number },
  lineEnd: { x: number; y: number }
): number {
  const A = point.x - lineStart.x
  const B = point.y - lineStart.y
  const C = lineEnd.x - lineStart.x
  const D = lineEnd.y - lineStart.y
  
  const dot = A * C + B * D
  const lenSq = C * C + D * D
  let param = -1
  
  if (lenSq !== 0) param = dot / lenSq
  
  let xx, yy
  
  if (param < 0) {
    xx = lineStart.x
    yy = lineStart.y
  } else if (param > 1) {
    xx = lineEnd.x
    yy = lineEnd.y
  } else {
    xx = lineStart.x + param * C
    yy = lineStart.y + param * D
  }
  
  const dx = point.x - xx
  const dy = point.y - yy
  return Math.sqrt(dx * dx + dy * dy)
}

function isElementInRect(
  element: CanvasElement,
  rect: { x1: number; y1: number; x2: number; y2: number }
): boolean {
  if (element.type === 'pen' && element.points) {
    return element.points.every(p => 
      p.x >= rect.x1 && p.x <= rect.x2 &&
      p.y >= rect.y1 && p.y <= rect.y2
    )
  } else if (element.type === 'rectangle') {
    return (element.x || 0) >= rect.x1 &&
           (element.x || 0) + (element.width || 0) <= rect.x2 &&
           (element.y || 0) >= rect.y1 &&
           (element.y || 0) + (element.height || 0) <= rect.y2
  } else if (element.type === 'circle') {
    const cx = (element.x || 0) + (element.width || 0) / 2
    const cy = (element.y || 0) + (element.height || 0) / 2
    return cx >= rect.x1 && cx <= rect.x2 &&
           cy >= rect.y1 && cy <= rect.y2
  } else if (element.type === 'line' || element.type === 'arrow') {
    return (element.startX || 0) >= rect.x1 &&
           (element.startX || 0) <= rect.x2 &&
           (element.startY || 0) >= rect.y1 &&
           (element.startY || 0) <= rect.y2 &&
           (element.endX || 0) >= rect.x1 &&
           (element.endX || 0) <= rect.x2 &&
           (element.endY || 0) >= rect.y1 &&
           (element.endY || 0) <= rect.y2
  } else if (element.type === 'text') {
    return (element.x || 0) >= rect.x1 &&
           (element.x || 0) <= rect.x2 &&
           (element.y || 0) >= rect.y1 &&
           (element.y || 0) <= rect.y2
  }
  return false
}

function handleTextEditBlur() {
  if (editingTextElement.value) {
    if (editingTextElement.value.text !== editingText.value) {
      editingTextElement.value.text = editingText.value
      saveToHistory()
    }
  }
  isEditingText.value = false
  editingTextElement.value = null
}

function deleteSelectedElements() {
  canvasData.value.elements = canvasData.value.elements.filter(el => !el.isSelected)
  selectedElementIds.value.clear()
  saveToHistory()
}

function getToolLabel(tool: CanvasTool): string {
  const labels: Record<CanvasTool, string> = {
    select: '选择',
    pen: '画笔',
    rectangle: '矩形',
    circle: '圆形',
    line: '线条',
    arrow: '箭头',
    text: '文字',
    eraser: '橡皮'
  }
  return labels[tool] || tool
}
</script>

<style lang="scss" scoped>
.canvas-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: #f5f7fa;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  overflow: hidden;
}

.canvas-toolbar {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  flex-wrap: wrap;
  gap: 8px;

  .tool-group {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .separator {
    width: 1px;
    height: 24px;
    background: #e4e7ed;
    margin: 0 8px;
  }

  .tool-btn {
    width: 32px;
    height: 32px;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    color: #606266;

    &.is-active {
      background: #ecf5ff;
      color: #409EFF;
    }

    &:hover {
      background: #f5f7fa;
    }
  }

  .tool-icon {
    font-size: 18px;
    font-weight: bold;
  }

  .color-picker {
    display: flex;
    align-items: center;
    gap: 4px;

    .label {
      font-size: 12px;
      color: #606266;
    }

    .color-input {
      width: 28px;
      height: 28px;
      border: 1px solid #dcdfe6;
      border-radius: 4px;
      cursor: pointer;
      padding: 0;
    }
  }

  .stroke-width {
    display: flex;
    align-items: center;
    gap: 4px;

    .label {
      font-size: 12px;
      color: #606266;
    }

    .width-slider {
      width: 80px;
    }

    .value {
      font-size: 12px;
      color: #606266;
      min-width: 20px;
    }
  }

  .font-size {
    display: flex;
    align-items: center;
    gap: 4px;

    .label {
      font-size: 12px;
      color: #606266;
    }
  }
}

.canvas-container {
  flex: 1;
  overflow: auto;
  position: relative;
  padding: 16px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.canvas-svg {
  background: #fff;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  cursor: crosshair;

  &.tool-select {
    cursor: default;
  }

  &.tool-eraser {
    cursor: not-allowed;
  }
}

.element-selected {
  outline: 2px solid #409EFF;
  outline-offset: 2px;
}

.canvas-delete-btn {
  position: absolute;
  top: 24px;
  right: 24px;
  z-index: 10;
}

.text-input {
  width: 100%;
  height: 100%;
  border: 1px solid #409EFF;
  border-radius: 4px;
  padding: 4px 8px;
  outline: none;
  background: #fff;
}

.canvas-footer {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  background: #fff;
  border-top: 1px solid #e4e7ed;
  gap: 24px;

  .footer-info {
    font-size: 12px;
    color: #909399;
  }
}
</style>
