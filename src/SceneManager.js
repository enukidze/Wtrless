import { gsap } from 'gsap';
import * as THREE from 'three';

/**
 * Scene Manager with Camera Transitions
 * Handles switching between different scene groups with smooth camera movement
 */

// 🔁 Transition Function with Camera Tween
export function switchTo(targetSection, allGroups, camera, scene) {
  // Hide all groups
  allGroups.forEach(group => {
    group.visible = false;
  });
  
  // Show the target group
  if (targetSection) {
    targetSection.visible = true;
    console.log(`Switched to: ${targetSection.name || 'Unknown Scene'}`);

    // Apply environment from target scene to main scene
    if (targetSection.environment) {
      scene.environment = targetSection.environment;
      scene.environmentRotation = targetSection.environmentRotation || new THREE.Euler(0, 0, 0);
    } else {
      scene.environment = null;
    }

    // Animate camera to target position
    gsap.to(camera.position, {
      x: targetSection.targetCameraPosition.x,
      y: targetSection.targetCameraPosition.y,
      z: targetSection.targetCameraPosition.z,
      duration: 1.5,
      ease: 'power2.inOut',
      onUpdate: () => {
        camera.lookAt(targetSection.targetLookAt);
      }
    });
  }
}

export function showAll(allGroups) {
  allGroups.forEach(group => {
    group.visible = true;
  });
}

export function hideAll(allGroups) {
  allGroups.forEach(group => {
    group.visible = false;
  });
} 