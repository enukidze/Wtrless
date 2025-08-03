import * as THREE from 'three';

export const sceneAState = {
  modularPartsMixer: null,
  pillLeft: null,
  pillRight: null,
  modularPartsActions: [],
  modularPartsScene: null
};

export function createSceneA(renderer, scene) {
  const group = new THREE.Group();
  group.name = 'SceneA';

  // New group to hold both models
  const pillAndModularGroup = new THREE.Group();
  pillAndModularGroup.name = 'pillAndModularGroup';
  group.add(pillAndModularGroup);

  const targetCameraPosition = new THREE.Vector3(10, 3, 8);
  const targetLookAt = new THREE.Vector3(0, 0, 0);
  group.targetCameraPosition = targetCameraPosition;
  group.targetLookAt = targetLookAt;

  return group;
} 