import { run, get, all, insertAndGetId } from '../db/index.js'

const getAllKms = () => {
  const result = all('SELECT * FROM kms ORDER BY sort, id')
  console.log('[getAllKms] 结果:', result)
  return result
}

const getKmById = (id) => {
  const result = get('SELECT * FROM kms WHERE id = ?', [id])
  console.log('[getKmById] id:', id, '结果:', result)
  return result
}

const createKm = (name) => {
  const maxSortResult = get('SELECT MAX(sort) as max_sort FROM kms')
  const maxSort = maxSortResult?.max_sort ?? -1
  const sort = maxSort + 1
  const now = new Date().toISOString()
  
  console.log('[createKm] name:', name, 'sort:', sort)
  
  const newKm = insertAndGetId(
    'kms',
    'INSERT INTO kms (name, sort, created_at, updated_at) VALUES (?, ?, ?, ?)',
    [name, sort, now, now]
  )
  
  console.log('[createKm] 新创建的知识库:', newKm)
  return newKm
}

const updateKm = (id, updates) => {
  console.log('[updateKm] id:', id, 'updates:', updates)
  
  const allowedFields = ['name', 'sort']
  const setClauses = []
  const values = []
  
  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      setClauses.push(`${key} = ?`)
      values.push(value)
    }
  }
  
  if (setClauses.length === 0) {
    return getKmById(id)
  }
  
  const now = new Date().toISOString()
  setClauses.push('updated_at = ?')
  values.push(now)
  values.push(id)
  
  run(`UPDATE kms SET ${setClauses.join(', ')} WHERE id = ?`, values)
  
  return getKmById(id)
}

const deleteKm = (id) => {
  console.log('[deleteKm] id:', id)
  
  run('DELETE FROM documents WHERE km_id = ?', [id])
  run('DELETE FROM folders WHERE km_id = ?', [id])
  run('DELETE FROM kms WHERE id = ?', [id])
  
  return true
}

export const kmModel = {
  getAllKms,
  getKmById,
  createKm,
  updateKm,
  deleteKm,
}
