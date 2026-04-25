import { run, get, all, getDb } from '../db/index.js'

const getAllDocuments = () => {
  return all('SELECT * FROM documents ORDER BY sort, id')
}

const getDocumentById = (id) => {
  return get('SELECT * FROM documents WHERE id = ?', [id])
}

const getDocumentsByFolderId = (folderId) => {
  if (folderId === null || folderId === undefined) {
    return all('SELECT * FROM documents WHERE folder_id IS NULL ORDER BY sort, id')
  }
  return all('SELECT * FROM documents WHERE folder_id = ? ORDER BY sort, id', [folderId])
}

const createDocument = (title, folderId, content = '') => {
  const folderIdValue = folderId === null || folderId === undefined ? null : folderId
  
  let maxSort = -1
  if (folderIdValue === null) {
    const maxSortResult = get('SELECT MAX(sort) as max_sort FROM documents WHERE folder_id IS NULL')
    maxSort = maxSortResult?.max_sort ?? -1
  } else {
    const maxSortResult = get('SELECT MAX(sort) as max_sort FROM documents WHERE folder_id = ?', [folderIdValue])
    maxSort = maxSortResult?.max_sort ?? -1
  }
  
  const sort = maxSort + 1
  const now = new Date().toISOString()
  
  run(
    'INSERT INTO documents (title, folder_id, content, sort, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [title, folderIdValue, content, sort, now, now]
  )
  
  const db = getDb()
  const result = db.exec('SELECT last_insert_rowid() as id')
  let lastId = null
  if (result && result.length > 0 && result[0].values && result[0].values.length > 0) {
    lastId = result[0].values[0][0]
  }
  
  if (!lastId) {
    const allDocs = getAllDocuments()
    const created = allDocs.find(d => d.title === title && d.sort === sort)
    if (created) {
      lastId = created.id
    }
  }
  
  return getDocumentById(lastId)
}

const updateDocument = (id, updates) => {
  const allowedFields = ['title', 'content', 'folder_id', 'sort']
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
  getDocumentById,
  getDocumentsByFolderId,
  createDocument,
  updateDocument,
  deleteDocument,
  updateSortValues,
}
