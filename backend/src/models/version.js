import { run, get, all, insertAndGetId } from '../db/index.js'

const getVersionsByDocumentId = (documentId) => {
  const result = all(
    'SELECT * FROM document_versions WHERE document_id = ? ORDER BY version DESC',
    [documentId]
  )
  console.log('[getVersionsByDocumentId] documentId:', documentId, '结果数量:', result.length)
  return result
}

const getVersionById = (id) => {
  const result = get('SELECT * FROM document_versions WHERE id = ?', [id])
  console.log('[getVersionById] id:', id, '结果:', result)
  return result
}

const getLatestVersion = (documentId) => {
  const result = get(
    'SELECT * FROM document_versions WHERE document_id = ? ORDER BY version DESC LIMIT 1',
    [documentId]
  )
  console.log('[getLatestVersion] documentId:', documentId, '结果:', result)
  return result
}

const getNextVersionNumber = (documentId) => {
  const latest = getLatestVersion(documentId)
  return latest ? latest.version + 1 : 1
}

const createVersion = (documentId, title, content, changeSummary = null) => {
  const version = getNextVersionNumber(documentId)
  const now = new Date().toISOString()
  
  console.log('[createVersion] 创建版本, documentId:', documentId, 'version:', version)
  
  const newVersion = insertAndGetId(
    'document_versions',
    'INSERT INTO document_versions (document_id, title, content, version, change_summary, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [documentId, title, content, version, changeSummary, now]
  )
  
  console.log('[createVersion] 新创建的版本:', newVersion)
  return newVersion
}

const deleteVersionsByDocumentId = (documentId) => {
  console.log('[deleteVersionsByDocumentId] documentId:', documentId)
  run('DELETE FROM document_versions WHERE document_id = ?', [documentId])
  return true
}

export const versionModel = {
  getVersionsByDocumentId,
  getVersionById,
  getLatestVersion,
  getNextVersionNumber,
  createVersion,
  deleteVersionsByDocumentId,
}
