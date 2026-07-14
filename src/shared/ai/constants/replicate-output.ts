export enum ReplicateImageOutputType {
  Url = 'url',
  Base64 = 'base64',
}

export enum ReplicateOutputField {
  Url = 'url',
  Href = 'href',
  Uri = 'uri',
  Output = 'output',
  Image = 'image',
}

export enum ReplicateOutputLogPrefix {
  UnexpectedFormat = 'Unexpected Replicate output format:',
}

export const REPLICATE_DATA_URL_BASE64_PREFIX = /^data:image\/\w+;base64,/
