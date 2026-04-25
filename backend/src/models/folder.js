import { run, get, all, getDb } from '../db/index.js'

const getAllFolders = () => {
  return all('SELECT * FROM folders ORDER BY sort, id')
}

const getFolderById = (id) => {
  return get('SELECT * FROM folders WHERE id = ?', [id])
}

const getFoldersByParentId = (parentId) => {
  if (parentId === null || parentId === undefined) {
    return all('SELECT * FROM folders WHERE parent_id IS NULL ORDER BY sort, id')
  }
  return all('SELECT * FROM folders WHERE parent_id = ? ORDER BY sort, id', [parentId])
}

const createFolder = (name, parentId) => {
  const parentIdValue = parentId === null || parentId === undefined ? null : parentId
  
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
  
  run(
    'INSERT INTO folders (name, parent_id, sort, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    [name, parentIdValue, sort, now, now]
  )
  
  const db = getDb()
  const result = db.exec('SELECT last_insert_rowid() as id')
  let lastId = null
  if (result && result.length > 0 && result[0].values && result[0].values.length > 0) {
    lastId = result[0].values[0][0]
  }
  
  if (!lastId) {
    const allFolders = getAllFolders()
    const created = allFolders.find(f => f.name === name && f.sort === sort)
    if (created) {
      lastId = created.id
    }
  }
  
  return getFolderById(lastId)
}

const updateFolder = (id, updates) => {
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
  
  if (allFolderIds.length === 0) {
    return true
  }
  
  const placeholders = allFolderIds.map(() => '?').join(',')
  
  run(`DELETE FROM documents WHERE folder_id IN (${placeholders})`, allFolderIds)
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
