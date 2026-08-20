export enum ThreeDRunKind {
  Generation = 'generation',
  Remesh = 'remesh',
}

export enum ThreeDOperationIdPrefix {
  Generation = '3d-',
  Remesh = '3d-remesh-',
}

export enum ThreeDOperationType {
  Generation = '3d-gen',
  Remesh = '3d-remesh',
}

export enum ThreeDOperationLabel {
  Generating = 'Generating 3D Model',
  Remeshing = 'Remeshing 3D Model',
}

export enum ThreeDOperationDetails {
  MeshyResuming = 'Meshy - Resuming...',
}

export enum ThreeDProviderFallback {
  Meshy = 'Meshy',
}

export enum TriggerCompletedStatus {
  Completed = 'COMPLETED',
}

export enum TriggerRunOutputKey {
  ModelUrl = 'modelUrl',
}

export enum ModelFormatKey {
  Glb = 'glb',
  Fbx = 'fbx',
  Obj = 'obj',
  Usdz = 'usdz',
}

export enum ModelFormatLabel {
  Glb = 'GLB',
  Fbx = 'FBX',
  Obj = 'OBJ',
  Usdz = 'USDZ',
}
