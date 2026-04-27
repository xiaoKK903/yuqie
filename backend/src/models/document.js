import { run, get, all, insertAndGetId, saveDb } from '../db/index.js'

const getAllDocuments = () => {
  const result = all('SELECT * FROM documents ORDER BY sort, id')
  console.log('[getAllDocuments] 结果:', result)
  return result
}

const getDocumentsByKmId = (kmId) => {
  if (kmId === null || kmId === undefined) {
    const result = all('SELECT * FROM documents WHERE km_id IS NULL ORDER BY sort, id')
    console.log('[getDocumentsByKmId] kmId: null, 结果:', result)
    return result
  }
  const result = all('SELECT * FROM documents WHERE km_id = ? ORDER BY sort, id', [kmId])
  console.log('[getDocumentsByKmId] kmId:', kmId, '结果:', result)
  return result
}

const getDocumentById = (id) => {
  const result = get('SELECT * FROM documents WHERE id = ?', [id])
  console.log('[getDocumentById] id:', id, '结果:', result)
  return result
}

const getDocumentsByFolderId = (folderId) => {
  if (folderId === null || folderId === undefined) {
    const result = all('SELECT * FROM documents WHERE folder_id IS NULL ORDER BY sort, id')
    console.log('[getDocumentsByFolderId] folderId: null, 结果:', result)
    return result
  }
  const result = all('SELECT * FROM documents WHERE folder_id = ? ORDER BY sort, id', [folderId])
  console.log('[getDocumentsByFolderId] folderId:', folderId, '结果:', result)
  return result
}

const createDocument = (title, folderId, content = '', kmId) => {
  const folderIdValue = folderId === null || folderId === undefined ? null : folderId
  const kmIdValue = kmId === null || kmId === undefined ? null : kmId
  
  console.log('[createDocument] title:', title, 'folderId:', folderIdValue, 'kmId:', kmIdValue, 'content:', content.substring(0, 50))
  
  let maxSort = -1
  if (folderIdValue === null) {
    if (kmIdValue === null) {
      const maxSortResult = get('SELECT MAX(sort) as max_sort FROM documents WHERE folder_id IS NULL AND km_id IS NULL')
      maxSort = maxSortResult?.max_sort ?? -1
    } else {
      const maxSortResult = get('SELECT MAX(sort) as max_sort FROM documents WHERE folder_id IS NULL AND km_id = ?', [kmIdValue])
      maxSort = maxSortResult?.max_sort ?? -1
    }
  } else {
    const maxSortResult = get('SELECT MAX(sort) as max_sort FROM documents WHERE folder_id = ?', [folderIdValue])
    maxSort = maxSortResult?.max_sort ?? -1
  }
  
  const sort = maxSort + 1
  const now = new Date().toISOString()
  
  console.log('[createDocument] 执行 INSERT, sort:', sort)
  
  const newDoc = insertAndGetId(
    'documents',
    'INSERT INTO documents (title, folder_id, km_id, content, sort, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [title, folderIdValue, kmIdValue, content, sort, now, now]
  )
  
  console.log('[createDocument] 新创建的文档:', newDoc)
  return newDoc
}

const updateDocument = (id, updates) => {
  console.log('[updateDocument] id:', id, 'updates:', updates)
  
  const allowedFields = ['title', 'content', 'folder_id', 'km_id', 'sort']
  const setClauses = []
  const values = []
  
  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      setClauses.push(`${key} = ?`)
      values.push(value)
    }
  }
  
  if (setClauses.length === 0) {
    return getDocumentById(id)
  }
  
  const now = new Date().toISOString()
  setClauses.push('updated_at = ?')
  values.push(now)
  values.push(id)
  
  run(`UPDATE documents SET ${setClauses.join(', ')} WHERE id = ?`, values)
  
  return getDocumentById(id)
}

const deleteDocument = (id) => {
  console.log('[deleteDocument] id:', id)
  run('DELETE FROM documents WHERE id = ?', [id])
  return true
}

const updateSortValues = (folderId) => {
  const documents = getDocumentsByFolderId(folderId)
  documents.forEach((doc, index) => {
    run('UPDATE documents SET sort = ? WHERE id = ?', [index, doc.id])
  })
}

export const documentModel = {
  getAllDocuments,
  getDocumentsByKmId,
  getDocumentById,
  getDocumentsByFolderId,
  createDocument,
  updateDocument,
  deleteDocument,
  updateSortValues,
}
