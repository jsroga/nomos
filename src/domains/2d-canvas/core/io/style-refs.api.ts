import { FormField, HttpMethod } from '@/shared/data/constants/protocol'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import { recordFromJson, readString } from '@/shared/data/json-guards'
import { StyleRefApiRoute } from '../../constants/mj-sref'

export async function uploadStyleRefFile(input: {
  projectId: string
  file: File
}): Promise<string> {
  const formData = new FormData()
  formData.append(FormField.File, input.file)
  formData.append(FormField.ProjectId, input.projectId)
  const response = await fetch(StyleRefApiRoute.Upload, {
    method: HttpMethod.Post,
    body: formData,
  })
  const data = recordFromJson(await response.json().catch(() => ({})))
  const url = readString(data.url)
  if (!response.ok || !url) {
    throw new Error(readString(data.error) ?? API_ERROR.STYLE_REF_UPLOAD_FAILED)
  }
  return url
}
