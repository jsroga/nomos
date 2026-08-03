'use client'

import React, { Suspense } from 'react'
import { Box } from '@react-three/drei'
import * as THREE from 'three'
import type { SceneObject } from '@/domains/3d-canvas'
import { DemoAssetId, PrimitiveAssetId } from '@/domains/3d-canvas/constants/asset-library'
import {
  DEFAULT_FRAME_COLOR,
  DEMO_BUILDING_COLOR,
  DEMO_BUILDING_ROOF_COLOR,
  DEMO_TREE_LEAF_COLOR,
  DEMO_TREE_TRUNK_COLOR,
  EXTERNAL_MODEL_ERROR_COLOR,
  OBJECT_SELECTION_COLOR,
  PRIMITIVE_CONE_COLOR,
  PRIMITIVE_CUBE_COLOR,
  PRIMITIVE_CYLINDER_COLOR,
  PRIMITIVE_SPHERE_COLOR,
} from '@/domains/3d-canvas/constants/mesh-colors'
import { WindowMesh } from './meshes/WindowMesh'
import { DoorMesh } from './meshes/DoorMesh'
import { isExternalModelUrl } from './utils/object-model-url'

type PrimitiveKind =
  | PrimitiveAssetId.Cube
  | PrimitiveAssetId.Sphere
  | PrimitiveAssetId.Cylinder
  | PrimitiveAssetId.Cone

function isPrimitiveKind(url: string): url is PrimitiveKind {
  return (
    url === PrimitiveAssetId.Cube ||
    url === PrimitiveAssetId.Sphere ||
    url === PrimitiveAssetId.Cylinder ||
    url === PrimitiveAssetId.Cone
  )
}

const PrimitiveMesh: React.FC<{ kind: PrimitiveKind; isSelected: boolean }> = ({
  kind,
  isSelected,
}) => {
  const colors: Record<PrimitiveKind, string> = {
    [PrimitiveAssetId.Cube]: PRIMITIVE_CUBE_COLOR,
    [PrimitiveAssetId.Sphere]: PRIMITIVE_SPHERE_COLOR,
    [PrimitiveAssetId.Cylinder]: PRIMITIVE_CYLINDER_COLOR,
    [PrimitiveAssetId.Cone]: PRIMITIVE_CONE_COLOR,
  }

  const geometry =
    kind === PrimitiveAssetId.Cube ? (
      <boxGeometry args={[1, 1, 1]} />
    ) : kind === PrimitiveAssetId.Sphere ? (
      <sphereGeometry args={[0.5, 32, 32]} />
    ) : kind === PrimitiveAssetId.Cylinder ? (
      <cylinderGeometry args={[0.5, 0.5, 1]} />
    ) : (
      <coneGeometry args={[0.5, 1]} />
    )

  return (
    <mesh position={[0, 0.5, 0]}>
      {geometry}
      <meshStandardMaterial
        color={isSelected ? OBJECT_SELECTION_COLOR : colors[kind]}
      />
    </mesh>
  )
}

const BuildingDemo: React.FC<{ isSelected: boolean }> = ({ isSelected }) => (
  <group>
    <Box args={[2, 4, 2]} position={[0, 2, 0]}>
      <meshStandardMaterial
        color={isSelected ? OBJECT_SELECTION_COLOR : DEMO_BUILDING_COLOR}
      />
    </Box>
    <mesh position={[0, 4.5, 0]} rotation={[0, Math.PI / 4, 0]}>
      <coneGeometry args={[1.5, 1, 4]} />
      <meshStandardMaterial color={DEMO_BUILDING_ROOF_COLOR} />
    </mesh>
  </group>
)

const TreeDemo: React.FC<{ isSelected: boolean }> = ({ isSelected }) => {
  const leafColor = isSelected ? OBJECT_SELECTION_COLOR : DEMO_TREE_LEAF_COLOR

  return (
    <group>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.2, 0.3, 1]} />
        <meshStandardMaterial color={DEMO_TREE_TRUNK_COLOR} />
      </mesh>
      <mesh position={[0, 1.5, 0]}>
        <coneGeometry args={[1, 2]} />
        <meshStandardMaterial color={leafColor} />
      </mesh>
      <mesh position={[0, 2.5, 0]}>
        <coneGeometry args={[0.8, 1.5]} />
        <meshStandardMaterial color={leafColor} />
      </mesh>
      <mesh position={[0, 2.5, 0]}>
        <coneGeometry args={[0.8, 1.5]} />
        <meshStandardMaterial color={leafColor} />
      </mesh>
    </group>
  )
}

const ExternalModelSection: React.FC<{
  url: string
  onLoaded: () => void
  onDimensionsCalculated?: (dimensions: THREE.Vector3) => void
  LoadingPlaceholder: React.FC
  GLBModel: React.FC<{
    url: string
    onLoaded: () => void
    onDimensionsCalculated?: (dimensions: THREE.Vector3) => void
  }>
  ModelErrorBoundary: React.ComponentType<{
    children: React.ReactNode
    fallback: React.ReactNode
  }>
}> = ({
  url,
  onLoaded,
  onDimensionsCalculated,
  LoadingPlaceholder,
  GLBModel,
  ModelErrorBoundary,
}) => (
  <ModelErrorBoundary
    fallback={
      <Box args={[1, 1, 1]}>
        <meshStandardMaterial color={EXTERNAL_MODEL_ERROR_COLOR} />
      </Box>
    }
  >
    <Suspense fallback={<LoadingPlaceholder />}>
      <GLBModel
        url={url}
        onLoaded={onLoaded}
        onDimensionsCalculated={onDimensionsCalculated}
      />
    </Suspense>
  </ModelErrorBoundary>
)

export const ObjectRendererContent: React.FC<{
  obj: SceneObject
  effectiveModelUrl: string
  isSelected: boolean
  opacity: number
  onLoaded: () => void
  onDimensionsCalculated?: (dimensions: THREE.Vector3) => void
  LoadingPlaceholder: React.FC
  GLBModel: React.FC<{
    url: string
    onLoaded: () => void
    onDimensionsCalculated?: (dimensions: THREE.Vector3) => void
  }>
  ModelErrorBoundary: React.ComponentType<{
    children: React.ReactNode
    fallback: React.ReactNode
  }>
}> = ({
  obj,
  effectiveModelUrl,
  isSelected,
  opacity,
  onLoaded,
  onDimensionsCalculated,
  LoadingPlaceholder,
  GLBModel,
  ModelErrorBoundary,
}) => {
  if (isPrimitiveKind(effectiveModelUrl)) {
    return <PrimitiveMesh kind={effectiveModelUrl} isSelected={isSelected} />
  }

  if (effectiveModelUrl === DemoAssetId.Building) {
    return <BuildingDemo isSelected={isSelected} />
  }

  if (effectiveModelUrl === DemoAssetId.Tree) {
    return <TreeDemo isSelected={isSelected} />
  }

  if (effectiveModelUrl === PrimitiveAssetId.Window) {
    return (
      <WindowMesh
        color={obj.color || DEFAULT_FRAME_COLOR}
        isSelected={isSelected}
        opacity={opacity}
      />
    )
  }

  if (effectiveModelUrl === PrimitiveAssetId.Door) {
    return (
      <DoorMesh
        color={obj.color || DEFAULT_FRAME_COLOR}
        isSelected={isSelected}
        opacity={opacity}
      />
    )
  }

  if (isExternalModelUrl(effectiveModelUrl)) {
    return (
      <ExternalModelSection
        url={effectiveModelUrl}
        onLoaded={onLoaded}
        onDimensionsCalculated={onDimensionsCalculated}
        LoadingPlaceholder={LoadingPlaceholder}
        GLBModel={GLBModel}
        ModelErrorBoundary={ModelErrorBoundary}
      />
    )
  }

  return null
}
