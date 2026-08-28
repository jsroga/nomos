/** Meshy's remesh request field names. Their spelling, named once. */
export enum MeshyRemeshField {
  InputTaskId = 'input_task_id',
  TargetFormats = 'target_formats',
  Topology = 'topology',
  TargetPolycount = 'target_polycount',
  OriginAt = 'origin_at',
  ResizeHeight = 'resize_height',
}

export const MESHY_REMESH_TARGET_FORMATS = ['glb', 'fbx', 'obj', 'usdz'] as const

/** Meshy places the model's origin at its base so it sits on a ground plane. */
export const MESHY_REMESH_ORIGIN_AT = 'bottom'
