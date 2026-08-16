export async function mapLinkedValue(
  value: unknown,
  linkText: (text: string) => Promise<string>,
  minStringLength: number
): Promise<unknown> {
  if (typeof value === 'string') {
    if (value.length <= minStringLength) return value
    return linkText(value)
  }

  if (Array.isArray(value)) {
    return Promise.all(value.map(item => mapLinkedValue(item, linkText, minStringLength)))
  }

  if (typeof value === 'object' && value !== null) {
    const result: Record<string, unknown> = {}
    for (const [key, field] of Object.entries(value)) {
      result[key] = await mapLinkedValue(field, linkText, minStringLength)
    }
    return result
  }

  return value
}
