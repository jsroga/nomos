export function enumArgType(values: Record<string, string>) {
  return {
    control: { type: 'select' as const },
    options: Object.values(values),
  }
}
