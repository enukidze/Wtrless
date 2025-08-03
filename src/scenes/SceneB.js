import * as THREE from 'three';

export function createSceneB() {
  const group = new THREE.Group();
  group.name = 'SceneB';

  // Camera positions for this scene
  const targetCameraPosition = new THREE.Vector3(10, 3, 8);
  const targetLookAt = new THREE.Vector3(0, 0, 0);

  // Attach camera positions to the group
  group.targetCameraPosition = targetCameraPosition;
  group.targetLookAt = targetLookAt;

  // Empty scene for now

  return group;
} 