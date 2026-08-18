import { describe, expect, it } from 'vitest'
import {
  FileUploaderItemStatus,
  canFileUploaderAdd,
  formatFileUploaderPercent,
  isFileUploaderUploading,
} from '../constants/file-uploader'

describe('isFileUploaderUploading', () => {
  it('treats uploading flag as in-flight', () => {
    expect(isFileUploaderUploading({ uploading: true })).toBe(true)
  })

  it('treats uploading status as in-flight', () => {
    expect(isFileUploaderUploading({ status: FileUploaderItemStatus.Uploading })).toBe(true)
  })

  it('leaves queued and ready cells idle', () => {
    expect(isFileUploaderUploading({ status: FileUploaderItemStatus.Queued })).toBe(false)
    expect(isFileUploaderUploading({ status: FileUploaderItemStatus.Failed })).toBe(false)
    expect(isFileUploaderUploading({})).toBe(false)
  })
})

describe('formatFileUploaderPercent', () => {
  it('formats the uploading cell label', () => {
    expect(formatFileUploaderPercent(68)).toBe('68%')
  })
})

describe('canFileUploaderAdd', () => {
  it('allows add when upload is enabled and under cap', () => {
    expect(
      canFileUploaderAdd({
        allowUpload: true,
        disabled: false,
        addDisabled: false,
        underCap: true,
      }),
    ).toBe(true)
  })

  it('blocks add in preview-only mode', () => {
    expect(
      canFileUploaderAdd({
        allowUpload: false,
        disabled: false,
        addDisabled: false,
        underCap: true,
      }),
    ).toBe(false)
  })
})
