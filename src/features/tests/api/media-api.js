import { apiClient } from '@/lib/http/api-client'

const MAX_COVER_BYTES = 5 * 1024 * 1024

/** @param {import('axios').AxiosResponse} res */
function unwrap(res) {
  const body = res.data
  if (!body?.success) {
    const err = new Error(typeof body?.message === 'string' ? body.message : 'Request failed')
    err.response = { data: body }
    throw err
  }
  return body.data
}

/**
 * @param {{
 *   mimeType: string,
 *   fileName: string,
 *   byteSize: number,
 *   purpose?: string,
 *   scope?: string,
 *   entityType?: string,
 *   entityUuid?: string | null,
 *   ownerUserUuid?: string | null,
 * }} payload
 */
export async function presignMediaUpload(payload) {
  const res = await apiClient.post('/media/uploads/presign', payload)
  return unwrap(res)
}

/** @param {string} uuid */
export async function confirmMediaUpload(uuid) {
  const res = await apiClient.post(`/media/uploads/${encodeURIComponent(uuid)}/confirm`)
  return unwrap(res)
}

/**
 * Presign → PUT to Azure → confirm. Returns public URL and asset UUID for package save.
 *
 * @param {File} file
 * @param {{
 *   purpose?: 'test_series_cover' | 'quiz_cover',
 *   entityUuid?: string | null,
 *   entityType?: 'test-series' | 'quiz',
 * }} [options]
 */
export async function uploadCoverImage(file, options = {}) {
  const purpose = options.purpose ?? 'test_series_cover'
  const entityType =
    options.entityType ?? (purpose === 'quiz_cover' ? 'quiz' : 'test-series')

  if (file.size > MAX_COVER_BYTES) {
    throw new Error('Image must be 5 MB or smaller.')
  }

  const presign = await presignMediaUpload({
    mimeType: file.type,
    fileName: file.name,
    byteSize: file.size,
    purpose,
    scope: 'admin',
    entityType,
    entityUuid: options.entityUuid ?? null,
  })

  const uploadRes = await fetch(presign.uploadUrl, {
    method: 'PUT',
    headers: presign.requiredHeaders ?? {
      'x-ms-blob-type': 'BlockBlob',
      'Content-Type': file.type,
    },
    body: file,
  })

  if (!uploadRes.ok) {
    throw new Error('Upload to storage failed. Check Azure CORS and try again.')
  }

  const confirmed = await confirmMediaUpload(presign.asset.uuid)
  const asset = confirmed?.asset ?? confirmed

  return {
    coverImageUrl: asset.publicUrl,
    coverMediaUuid: asset.uuid,
  }
}
