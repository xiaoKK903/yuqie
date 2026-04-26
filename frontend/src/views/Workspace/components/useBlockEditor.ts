import { ref, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import type { Block, BlockType, InteractiveTableData } from '@/types'

export function useBlockEditor(modelValue: Block[]) {
  const blocks = ref<Block[]>(JSON.parse(JSON.stringify(modelValue || [])))
  const activeBlockId = ref<string | null>(null)
  const slashMenuVisible = ref(false)
  const slashMenuPosition = ref({ x: 0, y: 0 })
  const slashMenuTargetBlockId = ref<string | null>(null)
  const uploadDialogVisible = ref(false)
  const uploadType = ref<'image' | 'attachment'>('image')
  const isSyncingFromProps = ref(false)

  function generateId(): string {
    return 'block_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }

  function syncBlockContentToDOM() {
    if (isSyncingFromProps.value) {
      nextTick(() => {
        blocks.value.forEach((block) => {
          if (block.type !== 'table' && block.type !== 'code' && block.type !== 'divider') {
            const el = document.querySelector(`[data-block-id="${block.id}"]`) as HTMLElement
            if (el && el.textContent !== block.content) {
              el.textContent = block.content || ''
            }
          }
        })
      })
    }
  }

  function createDefaultTable(cols: number = 3, rows: number = 3): InteractiveTableData {
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
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        cells.push({
          rowId: 'row_' + (i + 1),
          colId: 'col_' + (j + 1),
          value: '',
        })
      }
    }

    return {
      id: 'table_' + Date.now(),
      columns,
      rows: tableRows,
      cells,
      mergeCells: [],
    }
  }

  function createBlock(type: BlockType, content: string = ''): Block {
    return {
      id: generateId(),
      type,
      content,
      meta: type === 'table'
        ? { tableData: createDefaultTable() }
        : type === 'code'
          ? { language: 'javascript' }
          : type === 'todo'
            ? { checked: false }
            : undefined,
    }
  }

  function getPlaceholder(type: BlockType): string {
    const placeholders: Record<BlockType, string> = {
      text: '输入内容...',
      h1: '一级标题',
      h2: '二级标题',
      h3: '三级标题',
      h4: '四级标题',
      h5: '五级标题',
      h6: '六级标题',
      bullet: '列表项',
      numbered: '列表项',
      todo: '待办事项',
      quote: '引用内容',
      code: '',
      table: '',
      divider: '',
    }
    return placeholders[type] || '输入内容...'
  }

  function addFirstBlock() {
    const newBlock = createBlock('text')
    blocks.value.push(newBlock)
    activeBlockId.value = newBlock.id

    nextTick(() => {
      const contentEl = document.querySelector(`.block-active .editable-content`)
      if (contentEl) {
        (contentEl as HTMLElement).focus()
      }
    })
  }

  function handleContentInput(blockId: string, e: Event) {
    const target = e.target as HTMLElement
    const blockIndex = blocks.value.findIndex(b => b.id === blockId)

    if (blockIndex >= 0) {
      const newContent = target.textContent || ''
      if (newContent !== blocks.value[blockIndex].content) {
        blocks.value[blockIndex].content = newContent
      }
    }
  }

  function getCursorOffsetInElement(element: HTMLElement): number {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return 0

    const range = selection.getRangeAt(0)
    const preRange = document.createRange()
    preRange.selectNodeContents(element)
    preRange.setEnd(range.startContainer, range.startOffset)
    return preRange.toString().length
  }

  function handleKeyDown(blockId: string, e: KeyboardEvent) {
    const blockIndex = blocks.value.findIndex(b => b.id === blockId)
    if (blockIndex < 0) return

    const target = e.target as HTMLElement

    if (e.key === '/') {
      const rect = target.getBoundingClientRect()
      slashMenuPosition.value = {
        x: rect.left,
        y: rect.bottom + 5,
      }
      slashMenuTargetBlockId.value = blockId
      slashMenuVisible.value = true
      return
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()

      const cursorOffset = getCursorOffsetInElement(target)
      const fullText = target.textContent || ''
      const beforeText = fullText.substring(0, cursorOffset)
      const afterText = fullText.substring(cursorOffset)

      blocks.value[blockIndex].content = beforeText
      target.textContent = beforeText

      const newBlock = createBlock('text', afterText)
      const newBlockId = newBlock.id
      blocks.value.splice(blockIndex + 1, 0, newBlock)
      activeBlockId.value = newBlock.id

      setTimeout(() => {
        const newBlockEl = document.querySelector(`[data-block-id="${newBlockId}"]`) as HTMLElement

        if (newBlockEl) {
          if (afterText) {
            newBlockEl.textContent = afterText
          }
          newBlockEl.focus()

          const selection = window.getSelection()
          if (selection) {
            const range = document.createRange()
            if (newBlockEl.firstChild) {
              range.setStart(newBlockEl.firstChild, 0)
            } else {
              range.setStart(newBlockEl, 0)
            }
            range.collapse(true)
            selection.removeAllRanges()
            selection.addRange(range)
          }
        }
      }, 100)
      return
    }

    if (e.key === 'Backspace') {
      const selection = window.getSelection()
      const isAtStart = selection && selection.anchorOffset === 0
      const block = blocks.value[blockIndex]

      if (isAtStart && block.content === '' && blocks.value.length > 1) {
        e.preventDefault()
        deleteBlock(blockId)

        if (blockIndex > 0) {
          activeBlockId.value = blocks.value[blockIndex - 1].id
          nextTick(() => {
            const prevBlockEl = document.querySelectorAll('.editable-content')[blockIndex - 1]
            if (prevBlockEl) {
              const el = prevBlockEl as HTMLElement
              el.focus()
              const range = document.createRange()
              range.selectNodeContents(el)
              range.collapse(false)
              selection?.removeAllRanges()
              selection?.addRange(range)
            }
          })
        }
      }
      return
    }

    if (e.key === 'ArrowUp') {
      if (blockIndex > 0) {
        const selection = window.getSelection()
        const isAtStart = selection && selection.anchorOffset === 0

        if (isAtStart) {
          e.preventDefault()
          activeBlockId.value = blocks.value[blockIndex - 1].id
          nextTick(() => {
            const prevBlockEl = document.querySelectorAll('.editable-content')[blockIndex - 1]
            if (prevBlockEl) {
              (prevBlockEl as HTMLElement).focus()
            }
          })
        }
      }
      return
    }

    if (e.key === 'ArrowDown') {
      if (blockIndex < blocks.value.length - 1) {
        const selection = window.getSelection()
        const isAtEnd = selection && selection.anchorOffset === target.textContent!.length

        if (isAtEnd) {
          e.preventDefault()
          activeBlockId.value = blocks.value[blockIndex + 1].id
          nextTick(() => {
            const nextBlockEl = document.querySelectorAll('.editable-content')[blockIndex + 1]
            if (nextBlockEl) {
              (nextBlockEl as HTMLElement).focus()
            }
          })
        }
      }
      return
    }
  }

  function handleTodoCheck(blockId: string, checked: boolean) {
    const blockIndex = blocks.value.findIndex(b => b.id === blockId)
    if (blockIndex >= 0) {
      if (!blocks.value[blockIndex].meta) {
        blocks.value[blockIndex].meta = {}
      }
      blocks.value[blockIndex].meta!.checked = checked
    }
  }

  function updateBlockTable(blockId: string, data: InteractiveTableData) {
    const blockIndex = blocks.value.findIndex(b => b.id === blockId)
    if (blockIndex >= 0) {
      if (!blocks.value[blockIndex].meta) {
        blocks.value[blockIndex].meta = {}
      }
      blocks.value[blockIndex].meta!.tableData = data
    }
  }

  function deleteBlock(blockId: string) {
    const blockIndex = blocks.value.findIndex(b => b.id === blockId)
    if (blockIndex >= 0 && blocks.value.length > 1) {
      blocks.value.splice(blockIndex, 1)

      if (activeBlockId.value === blockId) {
        activeBlockId.value = blocks.value[Math.max(0, blockIndex - 1)]?.id || null
      }
    }
  }

  function showSlashMenu(blockId: string, e: MouseEvent) {
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    slashMenuPosition.value = {
      x: rect.left,
      y: rect.bottom + 5,
    }
    slashMenuTargetBlockId.value = blockId
    slashMenuVisible.value = true
  }

  function hideSlashMenu() {
    slashMenuVisible.value = false
    slashMenuTargetBlockId.value = null
  }

  function handleSlashMenuInsert(type: string, content: string, cursorOffset: number) {
    if (!slashMenuTargetBlockId.value) {
      addFirstBlock()
      return
    }

    const blockIndex = blocks.value.findIndex(b => b.id === slashMenuTargetBlockId.value)
    if (blockIndex < 0) return

    const blockType = type as BlockType

    if (type === 'divider' || type === 'table' || type === 'code') {
      const newBlock = createBlock(type)
      blocks.value.splice(blockIndex + 1, 0, newBlock)
    } else {
      blocks.value[blockIndex].type = blockType
    }

    hideSlashMenu()
  }

  function handleTableSelect(rows: number, cols: number) {
    const tableData = createDefaultTable(cols, rows)

    if (!slashMenuTargetBlockId.value) {
      const newBlock = createBlock('table')
      newBlock.meta = { tableData }
      blocks.value.push(newBlock)
    } else {
      const blockIndex = blocks.value.findIndex(b => b.id === slashMenuTargetBlockId.value)
      if (blockIndex >= 0) {
        const newBlock = createBlock('table')
        newBlock.meta = { tableData }
        blocks.value.splice(blockIndex + 1, 0, newBlock)
      }
    }

    hideSlashMenu()
  }

  function handleSlashMenuUpload(type: 'image' | 'attachment') {
    uploadType.value = type
    uploadDialogVisible.value = true
    hideSlashMenu()
  }

  function handleFileUpload(file: any) {
    if (!file || !file.raw) return

    const rawFile = file.raw as File

    if (uploadType.value === 'image') {
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = reader.result as string

        if (!slashMenuTargetBlockId.value) {
          addFirstBlock()
          return
        }

        const blockIndex = blocks.value.findIndex(b => b.id === slashMenuTargetBlockId.value)
        if (blockIndex >= 0) {
          blocks.value[blockIndex].content += `\n![${rawFile.name}](${base64})`
        }

        uploadDialogVisible.value = false
        ElMessage.success('图片已添加')
      }
      reader.readAsDataURL(rawFile)
    }
  }

  function getActiveBlockIndex(): number {
    if (!activeBlockId.value) {
      if (blocks.value.length > 0) {
        activeBlockId.value = blocks.value[blocks.value.length - 1].id
        return blocks.value.length - 1
      }
      return -1
    }
    return blocks.value.findIndex(b => b.id === activeBlockId.value)
  }

  function setCurrentBlockType(type: BlockType) {
    const index = getActiveBlockIndex()
    if (index < 0) {
      addFirstBlock()
      return
    }

    if (type === 'divider' || type === 'table' || type === 'code') {
      const newBlock = createBlock(type)
      blocks.value.splice(index + 1, 0, newBlock)
      activeBlockId.value = newBlock.id
    } else {
      blocks.value[index].type = type
    }
  }

  function addBlockAfterActive(type: BlockType) {
    const index = getActiveBlockIndex()
    const newBlock = createBlock(type)

    if (index < 0) {
      blocks.value.push(newBlock)
    } else {
      blocks.value.splice(index + 1, 0, newBlock)
    }

    activeBlockId.value = newBlock.id

    nextTick(() => {
      const elements = document.querySelectorAll('.editable-content')
      const targetIndex = index < 0 ? 0 : index + 1
      if (elements[targetIndex]) {
        (elements[targetIndex] as HTMLElement).focus()
      }
    })
  }

  function insertTableWithSize(rows: number, cols: number) {
    const index = getActiveBlockIndex()
    const tableData = createDefaultTable(cols, rows)
    const newBlock = createBlock('table')
    newBlock.meta = { tableData }

    if (index < 0) {
      blocks.value.push(newBlock)
    } else {
      blocks.value.splice(index + 1, 0, newBlock)
    }

    activeBlockId.value = newBlock.id
  }

  function applyInlineStyle(command: string) {
    try {
      document.execCommand(command, false)
    } catch (e) {
      console.warn('execCommand not supported:', command)
    }
  }

  function handleEditorClick() {
    if (blocks.value.length === 0) {
      addFirstBlock()
    }
  }

  function handleBlockClick(blockId: string, e: MouseEvent) {
    e.stopPropagation()
    activeBlockId.value = blockId
  }

  function handleBlockFocus(blockId: string) {
    activeBlockId.value = blockId
  }

  return {
    blocks,
    activeBlockId,
    slashMenuVisible,
    slashMenuPosition,
    slashMenuTargetBlockId,
    uploadDialogVisible,
    uploadType,
    isSyncingFromProps,
    syncBlockContentToDOM,
    getPlaceholder,
    createBlock,
    createDefaultTable,
    addFirstBlock,
    handleContentInput,
    handleKeyDown,
    handleTodoCheck,
    updateBlockTable,
    deleteBlock,
    showSlashMenu,
    hideSlashMenu,
    handleSlashMenuInsert,
    handleTableSelect,
    handleSlashMenuUpload,
    handleFileUpload,
    getActiveBlockIndex,
    setCurrentBlockType,
    addBlockAfterActive,
    insertTableWithSize,
    applyInlineStyle,
    handleEditorClick,
    handleBlockClick,
    handleBlockFocus,
  }
}
