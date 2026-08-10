export type Vec3Tuple = [number, number, number]

export function vec3(x: number, y: number, z: number): Vec3Tuple {
  return [x, y, z]
}

export function vec3XZ(x: number, z: number, y = 0): Vec3Tuple {
  return [x, y, z]
}

export function vec3FromArray(values: readonly number[]): Vec3Tuple {
  return [values[0] ?? 0, values[1] ?? 0, values[2] ?? 0]
}

export type Vec2Tuple = [number, number]

export function vec2(x: number, z: number): Vec2Tuple {
  return [x, z]
}
