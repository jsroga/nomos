/** StorageService wire values — buckets, paths, MIME types, and log messages. */

import { ContentType, FormField, HttpMethod } from '@/shared/data/constants/protocol'

export enum StorageBucket {
  Projects = 'projects',
}

export enum StoragePathPrefix {
  Temp = 'temp/',
}

export enum StorageApiRoute {
  SaveImage = '/api/save-image',
}

export enum StorageFileExtension {
  Glb = 'glb',
  Gltf = 'gltf',
  Png = 'png',
  Jpg = 'jpg',
  Jpeg = 'jpeg',
  Webp = 'webp',
  Svg = 'svg',
}

export enum StorageMimeType {
  GltfBinary = ContentType.GltfBinary,
  GltfJson = 'model/gltf+json',
  Png = ContentType.Png,
  Jpeg = 'image/jpeg',
  Webp = 'image/webp',
  SvgXml = 'image/svg+xml',
  OctetStream = ContentType.OctetStream,
}

export enum StorageEncoding {
  Base64 = 'base64',
}

export enum StorageBlobAccess {
  Public = 'public',
}

export enum StorageFormField {
  File = FormField.File,
}

export enum StorageHttpMethod {
  Post = HttpMethod.Post,
  Head = HttpMethod.Head,
}

export enum TmpFilesApi {
  UploadUrl = 'https://tmpfiles.org/api/v1/upload',
  ViewPathSegment = 'tmpfiles.org/',
  DownloadPathSegment = 'tmpfiles.org/dl/',
}

export enum TmpFilesResponseStatus {
  Success = 'success',
}

export enum StorageClientError {
  FailedSaveImageLocally = 'Failed to save image locally',
}

export enum StorageLogMessage {
  VercelBlobTokenMissing = 'Vercel Blob token not found (BLOB_READ_WRITE_TOKEN), falling back...',
  SupabaseUploadFailed = 'Supabase upload failed:',
  TmpFilesNonImage = 'TmpFiles does not support non-image content types',
  PublicFileUploadFailed = 'Public file upload failed:',
  VercelBlobTokenPresent = '[Vercel Blob] Token present?',
  VercelBlobUploading = '[Vercel Blob] Uploading:',
  VercelBlobUploadResponse = '[Vercel Blob] Upload response:',
  VercelBlobVerificationHead = '[Vercel Blob] Verification HEAD request:',
  VercelBlobUrlNotAccessible = '[Vercel Blob] URL not accessible yet - falling back to Supabase',
  VercelBlobVerificationFailed = '[Vercel Blob] Verification failed:',
  VercelBlobUploadFailed = 'Vercel Blob upload failed:',
  TempHostUploadFailed = 'Temp host upload failed:',
}

export enum StorageLogField {
  Size = 'size:',
  ContentType = 'contentType:',
}
