import { run, get, all } from '../db/index.js'

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
  const maxSortResult = get(
    'SELECT MAX(sort) as max_sort FROM documents WHERE folder_id IS ?',
    [folderId === null ? null : folderId]
  )
  
  const maxSort = maxSortResult?.max_sort ?? -1
  const sort = maxSort + 1
  
  const now = new Date().toISOString()
  
  run(
    'INSERT INTO documents (title, folder_id, content, sort, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [title, folderId, content, sort, now, now]
  )
  
  const lastIdResult = get('SELECT last_insert_rowid() as id')
  const lastId = lastIdResult?.id
  
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
  values.push(now, id)
  
  run(`UPDATE documents SET ${setClauses.join(', ')} WHERE id = ?`, values)
  
  return getDocumentById(id)
}

const deleteDocument = (id) => {
  const result = run('DELETE FROM documents WHERE id = ?', [id])
  return result
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
