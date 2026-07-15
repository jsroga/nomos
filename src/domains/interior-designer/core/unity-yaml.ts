import {
  UNITY_DEFAULT_MATERIAL_REF,
  UNITY_GUID_TEMPLATE,
} from '@/domains/interior-designer/constants/unity-yaml'

// ------------------------------------------------------------------
// UNITY YAML GENERATION HELPER
// ------------------------------------------------------------------

export const UnityYAML = {
  // Generate a random 32-character hex GUID
  generateGUID: (): string => {
    return UNITY_GUID_TEMPLATE.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  },

  // Basic .meta file content
  generateMeta: (guid: string): string => {
    return `fileFormatVersion: 2
guid: ${guid}
DefaultImporter:
  externalObjects: {}
  userData: 
  assetBundleName: 
  assetBundleVariant: 
`
  },

  // Scene Header
  generateSceneHeader: (): string => {
    return `%YAML 1.1
%TAG !u! tag:unity3d.com,2011:
--- !u!29 &1
OcclusionCullingSettings:
  m_ObjectHideFlags: 0
  serializedVersion: 2
  m_OcclusionBakeSettings:
    smallestOccluder: 5
    smallestHole: 0.25
    backfaceThreshold: 100
  m_SceneGUID: 00000000000000000000000000000000
  m_OcclusionCullingData: {fileID: 0}
--- !u!104 &2
RenderSettings:
  m_ObjectHideFlags: 0
  serializedVersion: 9
  m_Fog: 0
  m_FogColor: {r: 0.5, g: 0.5, b: 0.5, a: 1}
  m_FogMode: 3
  m_FogDensity: 0.01
  m_LinearFogStart: 0
  m_LinearFogEnd: 300
  m_AmbientSkyColor: {r: 0.212, g: 0.227, b: 0.259, a: 1}
  m_AmbientEquatorColor: {r: 0.114, g: 0.125, b: 0.133, a: 1}
  m_AmbientGroundColor: {r: 0.047, g: 0.043, b: 0.035, a: 1}
  m_AmbientIntensity: 1
  m_AmbientMode: 0
  m_SkyboxMaterial: {fileID: 10304, guid: 0000000000000000f000000000000000, type: 0}
  m_HaloStrength: 0.5
  m_FlareStrength: 1
  m_FlareFadeSpeed: 3
  m_HaloTexture: {fileID: 0}
  m_SpotCookie: {fileID: 10001, guid: 0000000000000000e000000000000000, type: 0}
  m_DefaultReflectionMode: 0
  m_DefaultReflectionResolution: 128
  m_ReflectionBounces: 1
  m_ReflectionIntensity: 1
  m_CustomReflection: {fileID: 0}
  m_Sun: {fileID: 0}
  m_IndirectSpecularColor: {r: 0, g: 0, b: 0, a: 1}
  m_UseRadianceAmbientProbe: 0
--- !u!157 &3
LightmapSettings:
  m_ObjectHideFlags: 0
  serializedVersion: 12
  m_GIWorkflowMode: 1
  m_GISettings:
    serializedVersion: 2
    m_BounceScale: 1
    m_IndirectOutputScale: 1
    m_AlbedoBoost: 1
    m_EnvironmentLightingMode: 0
    m_EnableBakedLightmaps: 1
    m_EnableRealtimeLightmaps: 0
  m_LightmapEditorSettings:
    serializedVersion: 12
    m_Resolution: 2
    m_BakeResolution: 40
    m_AtlasSize: 1024
    m_AO: 0
    m_AOMaxDistance: 1
    m_Compaction: 1
    m_MoveTransparency: 1
    m_ShadowmaskMode: 1
    m_Padding: 2
    m_LightmapParameters: {fileID: 0}
    m_LightmapsBakeMode: 1
    m_TextureCompression: 1
    m_FinalGather: 0
    m_FinalGatherRayCount: 256
    m_ReflectionCompression: 2
    m_MixedBakeMode: 2
    m_BakeBackend: 1
    m_PVRSampling: 1
    m_PVRDirectSampleCount: 32
    m_PVRSampleCount: 500
    m_PVRBounces: 2
    m_PVREnvironmentSampleCount: 500
    m_PVREnvironmentReferencePointCount: 2048
    m_PVRFilteringMode: 2
    m_PVRDenoiserTypeDirect: 0
    m_PVRDenoiserTypeIndirect: 0
    m_PVRDenoiserTypeAO: 0
    m_PVRFilterTypeDirect: 0
    m_PVRFilterTypeIndirect: 0
    m_PVRFilterTypeAO: 0
    m_PVREnvironmentMIS: 0
    m_PVRCulling: 1
    m_PVRFilteringGaussRadiusDirect: 1
    m_PVRFilteringGaussRadiusIndirect: 5
    m_PVRFilteringGaussRadiusAO: 2
    m_PVRFilteringAtrousPositionSigmaDirect: 0.5
    m_PVRFilteringAtrousPositionSigmaIndirect: 2
    m_PVRFilteringAtrousPositionSigmaAO: 1
    m_ExportTrainingData: 0
    m_TrainingDataDestination: TrainingData
    m_LightProbeSampleCountMultiplier: 4
  m_LightingDataAsset: {fileID: 0}
  m_LightingSettings: {fileID: 0}
--- !u!196 &4
NavMeshSettings:
  serializedVersion: 2
  m_ObjectHideFlags: 0
  m_BuildSettings:
    serializedVersion: 2
    agentTypeID: 0
    agentRadius: 0.5
    agentHeight: 2
    agentSlope: 45
    agentClimb: 0.4
    ledgeDropHeight: 0
    maxJumpAcrossDistance: 0
    minRegionArea: 2
    manualCellSize: 0
    cellSize: 0.16666667
    manualTileSize: 0
    tileSize: 256
    accuratePlacement: 0
    maxJobWorkers: 0
    preserveTilesOutsideBounds: 0
    debug:
      m_Flags: 0
  m_NavMeshData: {fileID: 0}
`
  },

  // -------------------------------------------------------
  // COMPONENT GENERATORS
  // -------------------------------------------------------

  // GameObject
  gameObject: (id: number, name: string, components: { type: number; id: number }[]): string => {
    const componentList = components.map(c => `  - component: {fileID: ${c.id}}`).join('\n')
    return `--- !u!1 &${id}
GameObject:
  m_ObjectHideFlags: 0
  m_CorrespondingSourceObject: {fileID: 0}
  m_PrefabInstance: {fileID: 0}
  m_PrefabAsset: {fileID: 0}
  serializedVersion: 6
  m_Component:
${componentList}
  m_Layer: 0
  m_Name: ${name}
  m_TagString: Untagged
  m_Icon: {fileID: 0}
  m_NavMeshLayer: 0
  m_StaticEditorFlags: 0
  m_IsActive: 1
`
  },

  // Transform
  transform: (
    id: number,
    gameObject: number,
    pos: { x: number; y: number; z: number },
    rot: { x: number; y: number; z: number; w: number },
    scale: { x: number; y: number; z: number }
  ): string => {
    return `--- !u!4 &${id}
Transform:
  m_ObjectHideFlags: 0
  m_CorrespondingSourceObject: {fileID: 0}
  m_PrefabInstance: {fileID: 0}
  m_PrefabAsset: {fileID: 0}
  m_GameObject: {fileID: ${gameObject}}
  m_LocalRotation: {x: ${rot.x}, y: ${rot.y}, z: ${rot.z}, w: ${rot.w}} 
  m_LocalPosition: {x: ${pos.x}, y: ${pos.y}, z: ${pos.z}}
  m_LocalScale: {x: ${scale.x}, y: ${scale.y}, z: ${scale.z}}
  m_Children: []
  m_Father: {fileID: 0}
  m_RootOrder: 0
  m_LocalEulerAnglesHint: {x: 0, y: 0, z: 0}
`
    // NOTE: Rotation is Quat in YAML. For simplicity we might need to convert Euler to Quat if we use rotational layouts.
    // Ideally we output Euler hint but unity reconstructs Quat
  },

  // MeshFilter (Cube)
  cubeMeshFilter: (id: number, gameObject: number): string => {
    return `--- !u!33 &${id}
MeshFilter:
  m_ObjectHideFlags: 0
  m_CorrespondingSourceObject: {fileID: 0}
  m_PrefabInstance: {fileID: 0}
  m_PrefabAsset: {fileID: 0}
  m_GameObject: {fileID: ${gameObject}}
  m_Mesh: {fileID: 10202, guid: 0000000000000000e000000000000000, type: 0}
`
  },

  // MeshRenderer
  meshRenderer: (id: number, gameObject: number, materialGuid?: string): string => {
    // Default Material: {fileID: 10303, guid: 0000000000000000f000000000000000, type: 0}
    // If we have a custom material/texture, referencing it is harder without generating a Material Asset (.mat).
    // For now, we will use Default Material for untextured walls.
    // TODO: If we want textures, we strictly need to generate a .mat file per texture and reference it here.
    const matRef = materialGuid
      ? `{fileID: 2100000, guid: ${materialGuid}, type: 2}`
      : UNITY_DEFAULT_MATERIAL_REF

    return `--- !u!23 &${id}
MeshRenderer:
  m_ObjectHideFlags: 0
  m_CorrespondingSourceObject: {fileID: 0}
  m_PrefabInstance: {fileID: 0}
  m_PrefabAsset: {fileID: 0}
  m_GameObject: {fileID: ${gameObject}}
  m_Enabled: 1
  m_CastShadows: 1
  m_ReceiveShadows: 1
  m_DynamicOccludee: 1
  m_MotionVectors: 1
  m_LightProbeUsage: 1
  m_ReflectionProbeUsage: 1
  m_RayTracingMode: 2
  m_RayTraceProcedural: 0
  m_RenderingLayerMask: 1
  m_RendererPriority: 0
  m_Materials:
  - ${matRef}
  m_StaticBatchInfo:
    firstSubMesh: 0
    subMeshCount: 0
  m_StaticBatchRoot: {fileID: 0}
  m_ProbeAnchor: {fileID: 0}
  m_LightProbeVolumeOverride: {fileID: 0}
  m_ScaleInLightmap: 1
  m_ReceiveGI: 1
  m_PreserveUVs: 0
  m_IgnoreNormalsForChartDetection: 0
  m_ImportantGI: 0
  m_StitchLightmapSeams: 1
  m_SelectedEditorRenderState: 3
  m_MinimumChartSize: 4
  m_AutoUVMaxDistance: 0.5
  m_AutoUVMaxAngle: 89
  m_LightmapParameters: {fileID: 0}
  m_SortingLayerID: 0
  m_SortingLayer: 0
  m_SortingOrder: 0
  m_AdditionalVertexStreams: {fileID: 0}
`
  },

  // Prefab Instance (for GLB Models)
  // This is tricky. Import a GLB creates a model, not a prefab in the traditional .prefab sense,
  // but it can be instantiated as a PrefabInstance referencing the Model Importer GUID.
  prefabInstance: (
    id: number,
    assetGuid: string,
    pos: { x: number; y: number; z: number },
    rot: { x: number; y: number; z: number; w: number },
    scale: { x: number; y: number; z: number }
  ): string => {
    // A PrefabInstance in scene does NOT have a GameObject block.
    // It has a PrefabInstance block which overrides properties of the Source Asset.
    // However, for minimal complexity, we just want to "spawn" the default view of the model.

    // Structure of a scene entry for a prefab:
    // 1. PrefabInstance (!u!1001) pointing to Source Prefab
    // 2. Transform/GameObject overrides (optional, but usually unity generates many modification entries).

    // Strategy: It's actually remarkably hard to write a valid PrefabInstance manually without knowing the internal fileIDs of the source GLB's nodes (which we don't know until import).
    // ALTERNATIVE: Create a "Dummy" GameObject and script the loading? No, user wants NO scripts.

    // BACKUP STRATEGY:
    // Just create a GameObject with NO MeshFilter/Renderer, but maybe a script? No.
    // WAIT. If we just output a GameObject !u!1 and !u!4 Transform, it's just an empty object.

    // For "Copy Paste" to work with Models, we really need the Prefab reference.
    // But referencing a Model (GLB) as a Prefab requires knowing the FileID of the root GameObject inside the GLB.
    // Standard GLB import usually assigns FileID 100100000 to the root. Let's try guessing it.

    return `--- !u!1001 &${id}
PrefabInstance:
  m_ObjectHideFlags: 0
  serializedVersion: 2
  m_Modification:
    m_TransformParent: {fileID: 0}
    m_Modifications:
    - target: {fileID: 400000, guid: ${assetGuid}, type: 3}
      propertyPath: m_LocalPosition.x
      value: ${pos.x}
      objectReference: {fileID: 0}
    - target: {fileID: 400000, guid: ${assetGuid}, type: 3}
      propertyPath: m_LocalPosition.y
      value: ${pos.y}
      objectReference: {fileID: 0}
    - target: {fileID: 400000, guid: ${assetGuid}, type: 3}
      propertyPath: m_LocalPosition.z
      value: ${pos.z}
      objectReference: {fileID: 0}
    - target: {fileID: 400000, guid: ${assetGuid}, type: 3}
      propertyPath: m_LocalRotation.x
      value: ${rot.x} 
      objectReference: {fileID: 0}
    - target: {fileID: 400000, guid: ${assetGuid}, type: 3}
      propertyPath: m_LocalRotation.y
      value: ${rot.y}
      objectReference: {fileID: 0}
    - target: {fileID: 400000, guid: ${assetGuid}, type: 3}
      propertyPath: m_LocalRotation.z
      value: ${rot.z}
      objectReference: {fileID: 0}
    - target: {fileID: 400000, guid: ${assetGuid}, type: 3}
      propertyPath: m_LocalRotation.w
      value: ${rot.w}
      objectReference: {fileID: 0}
    - target: {fileID: 400000, guid: ${assetGuid}, type: 3}
      propertyPath: m_LocalScale.x
      value: ${scale.x}
      objectReference: {fileID: 0}
    - target: {fileID: 400000, guid: ${assetGuid}, type: 3}
      propertyPath: m_LocalScale.y
      value: ${scale.y}
      objectReference: {fileID: 0}
    - target: {fileID: 400000, guid: ${assetGuid}, type: 3}
      propertyPath: m_LocalScale.z
      value: ${scale.z}
      objectReference: {fileID: 0}
    m_RemovedComponents: []
  m_SourcePrefab: {fileID: 100100000, guid: ${assetGuid}, type: 3}
`
    // Note: fileID 400000 is usually the Transform of the root object in the .glb prefab.
    // This is a risky guess, but standard for Unity's default importer.
  },
}
