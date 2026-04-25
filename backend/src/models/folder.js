import { run, get, all, insertAndGetId, saveDb } from '../db/index.js'

const getAllFolders = () => {
  const result = all('SELECT * FROM folders ORDER BY sort, id')
  console.log('[getAllFolders] 结果:', result)
  return result
}

const getFolderById = (id) => {
  const result = get('SELECT * FROM folders WHERE id = ?', [id])
  console.log('[getFolderById] id:', id, '结果:', result)
  return result
}

const getFoldersByParentId = (parentId) => {
  if (parentId === null || parentId === undefined) {
    const result = all('SELECT * FROM folders WHERE parent_id IS NULL ORDER BY sort, id')
    console.log('[getFoldersByParentId] parentId: null, 结果:', result)
    return result
  }
  const result = all('SELECT * FROM folders WHERE parent_id = ? ORDER BY sort, id', [parentId])
  console.log('[getFoldersByParentId] parentId:', parentId, '结果:', result)
  return result
}

const createFolder = (name, parentId) => {
  const parentIdValue = parentId === null || parentId === undefined ? null : parentId
  
  console.log('[createFolder] name:', name, 'parentId:', parentIdValue)
  
  let maxSort = -1
  if (parentIdValue === null) {
    const maxSortResult = get('SELECT MAX(sort) as max_sort FROM folders WHERE parent_id IS NULL')
    maxSort = maxSortResult?.max_sort ?? -1
  } else {
    const maxSortResult = get('SELECT MAX(sort) as max_sort FROM folders WHERE parent_id = ?', [parentIdValue])
    maxSort = maxSortResult?.max_sort ?? -1
  }
  
  const sort = maxSort + 1
  const now = new Date().toISOString()
  
  console.log('[createFolder] 执行 INSERT, sort:', sort)
  
  const newFolder = insertAndGetId(
    'folders',
    'INSERT INTO folders (name, parent_id, sort, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    [name, parentIdValue, sort, now, now]
  )
  
  console.log('[createFolder] 新创建的文件夹:', newFolder)
  return newFolder
}

const updateFolder = (id, updates) => {
  console.log('[updateFolder] id:', id, 'updates:', updates)
  
  const allowedFields = ['name', 'parent_id', 'sort']
  const setClauses = []
  const values = []
  
  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      setClauses.push(`${key} = ?`)
      values.push(value)
    }
  }
  
  if (setClauses.length === 0) {
    return getFolderById(id)
  }
  
  const now = new Date().toISOString()
  setClauses.push('updated_at = ?')
  values.push(now)
  values.push(id)
  
  run(`UPDATE folders SET ${setClauses.join(', ')} WHERE id = ?`, values)
  
  return getFolderById(id)
}

const deleteFolder = (id) => {
  console.log('[deleteFolder] id:', id)
  
  const getAllDescendantFolderIds = (folderId) => {
    const ids = []
    const children = getFoldersByParentId(folderId)
    for (const child of children) {
      ids.push(child.id)
      ids.push(...getAllDescendantFolderIds(child.id))
    }
    return ids
  }
  
  const allFolderIds = [id, ...getAllDescendantFolderIds(id)]
  console.log('[deleteFolder] 所有要删除的文件夹 ID:', allFolderIds)
  
  if (allFolderIds.length === 0) {
    return true
  }
  
  const placeholders = allFolderIds.map(() => '?').join(',')
  
  console.log('[deleteFolder] 删除相关文档...')
  run(`DELETE FROM documents WHERE folder_id IN (${placeholders})`, allFolderIds)
  
  console.log('[deleteFolder] 删除文件夹...')
  run(`DELETE FROM folders WHERE id IN (${placeholders})`, allFolderIds)
  
  return true
}

const isDescendantOf = (folderId, ancestorId) => {
  if (folderId === ancestorId) return true
  
  const folder = getFolderById(folderId)
  if (!folder) return false
  
  if (folder.parent_id === ancestorId) return true
  
  return folder.parent_id ? isDescendantOf(folder.parent_id, ancestorId) : false
}

const updateSortValues = (parentId) => {
  const folders = getFoldersByParentId(parentId)
  folders.forEach((folder, index) => {
    run('UPDATE folders SET sort = ? WHERE id = ?', [index, folder.id])
  })
}

export const folderModel = {
  getAllFolders,
  getFolderById,
  getFoldersByParentId,
  createFolder,
  updateFolder,
  deleteFolder,
  isDescendantOf,
  updateSortValues,
}
