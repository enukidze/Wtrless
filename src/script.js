import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { createSceneA, sceneAState } from './scenes/SceneA.js'
import { createSceneB } from './scenes/SceneB.js'
import { createSceneWithModels } from './scenes/SceneWithModels.js'
import { switchTo } from './SceneManager.js'
import { gsap } from 'gsap';
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { AnimationClip } from 'three';

gsap.registerPlugin(ScrollTrigger);


const loadingScreen = document.querySelector('.loading-screen');
const loadingPercentage = document.querySelector('.loading-percentage');
const loaderContainer = document.getElementById('loader-container');

// --- Loader Scene ---
const loaderScene = new THREE.Scene();
const loaderCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
const loaderRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
loaderRenderer.setSize(150, 150);
loaderContainer.appendChild(loaderRenderer.domElement);

const uniforms = {
    u_time: { value: 0.0 },
    u_progress: { value: 0.0 },
    u_resolution: { value: new THREE.Vector2(150, 150) }
};

const loaderGeometry = new THREE.PlaneGeometry(2, 2);
const loaderMaterial = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: `
        void main() {
            gl_Position = vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform float u_time;
        uniform float u_progress;
        uniform vec2 u_resolution;

        void main() {
            vec2 st = gl_FragCoord.xy / u_resolution.xy;
            st.x *= u_resolution.x / u_resolution.y;

            float d = distance(st, vec2(0.5, 0.5));
            float ring = smoothstep(0.40, 0.41, d) - smoothstep(0.43, 0.44, d);
            
            float angle = atan(st.y - 0.5, st.x - 0.5);
            float pulse = sin(angle * 12.0 + u_time * 8.0) * 0.5 + 0.5;
            
            float progressRing = smoothstep(0.0, 1.0, u_progress);
            float angleProgress = mix(-3.14159, 3.14159, progressRing);
            
            float loader = step(angle, angleProgress);
            
            vec3 color = vec3(0.0, 0.8, 1.0) * ring * loader * pulse;

            gl_FragColor = vec4(color, ring * loader);
        }
    `,
    transparent: true
});

const loaderMesh = new THREE.Mesh(loaderGeometry, loaderMaterial);
loaderScene.add(loaderMesh);

// Initial state
uniforms.u_progress.value = 0;
loadingPercentage.textContent = '0%';

const loadingState = {
    realProgress: 0,
    targetProgress: 0,
    visualProgress: 0
};
let allAssetsLoaded = false;
let loadingAnimationFinished = false;
let fakeInitialPhase = true;

const assets = {
    'moon_lab': { loaded: 0, total: 97517568 }, // 93 MB
    'liquidAndPill': { loaded: 0, total: 3145728 }, // 3 MB
    'modularParts': { loaded: 0, total: 582656 } // 569 KB
};
const totalAssets = Object.keys(assets).length;
let loadedAssets = 0;

function updateGlobalProgress() {
    let totalLoaded = 0;
    let totalSize = 0;
    for (const key in assets) {
        totalLoaded += assets[key].loaded;
        totalSize += assets[key].total;
    }
    loadingState.realProgress = totalLoaded / totalSize;
}

function onAssetLoad(assetKey) {
    assets[assetKey].loaded = assets[assetKey].total;
    updateGlobalProgress();
    loadedAssets++;
    if (loadedAssets === totalAssets) {
        allAssetsLoaded = true;
    }
}

function initScrollAnimations() {
    if (!sceneAState.modularPartsMixer || !sceneAState.modularPartsActions || sceneAState.modularPartsActions.length === 0) {
        return;
    }

    window.scrollTo(0, 0); // Ensure we start at the top

    const scrollAnimationState = { time: 0 };

    const tl = gsap.timeline({
        scrollTrigger: {
            trigger: ".scroll-container",
            scrub: true, // direct map to scroll
            start: "top top",
            end: "bottom bottom",
            onEnter: () => controls.enabled = false,
            onLeaveBack: () => controls.enabled = true,
        }
    });

    // 1. Animate camera to be looking down from above.
    tl.to(camera.position, {
        duration: 4,
        x: 0,
        y: 5,
        z: 0.1, // Use a small z-offset for a better perspective
        ease: "none"
    });
    tl.to(camera.rotation, {
        duration: 4,
        x: -Math.PI / 2, // Look straight down
        y: 0,
        z: 0,
        ease: "none"
    }, "<"); // Animate rotation at the same time as position

    // 2. Play the modular parts animation while camera is stationary
    const firstAction = sceneAState.modularPartsActions[0];
    firstAction.paused = false; // ensure action is active
    const clipDuration = sceneAState.modularPartsTotalDuration || 0;
   
    tl.fromTo(scrollAnimationState,
        { time: 0 },
        {
            duration: 4,
            time: clipDuration,
            ease: "none",
            onUpdate: () => {
                if (sceneAState.modularPartsMixer) {
                    sceneAState.modularPartsMixer.setTime(scrollAnimationState.time);
                    // force evaluation so pose updates even when scrubbing backwards
                    sceneAState.modularPartsMixer.update(0);
                }
            }
        });

    // 3. Move camera inside the pill (starts simultaneously with part animation)
    tl.to(camera.position, {
        duration: 4,
        x: 0,
        y: 0,
        z: 0,
        ease: "none"
    }, "<");

}

// --- FAKE INITIAL PROGRESS ---
// This guarantees a smooth start, regardless of network speed
gsap.to(loadingState, {
    targetProgress: 0.15, // Animate to 15% to start
    duration: 1.5,
    ease: "power2.inOut", // Use a slower, more graceful start
    onComplete: () => {
        fakeInitialPhase = false;
    }
});

// Add the 'loading' class to the body to prevent scrolling
document.body.classList.add('loading');


/**
 * Base
 */
// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x000000); // Set background to black
scene.fog = new THREE.Fog(0x000000, 1, 4000); // Add fog for atmospheric effect

// Starfield
const starsGeometry = new THREE.BufferGeometry();
const starsCount = 20000;
const starPositions = new Float32Array(starsCount * 3);
const starColors = new Float32Array(starsCount * 3);
const starSizes = new Float32Array(starsCount);

const color = new THREE.Color();

for(let i = 0; i < starsCount; i++) {
    starPositions[i * 3 + 0] = (Math.random() - 0.5) * 2000;
    starPositions[i * 3 + 1] = (Math.random() - 0.5) * 2000;
    starPositions[i * 3 + 2] = (Math.random() - 0.5) * 2000;

    const brightness = Math.random() * 0.5 + 0.5;
    color.setRGB(brightness, brightness, brightness);
    starColors[i * 3 + 0] = color.r;
    starColors[i * 3 + 1] = color.g;
    starColors[i * 3 + 2] = color.b;

    starSizes[i] = Math.random() * 1.5 + 0.5;
}

starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
starsGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
starsGeometry.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));

const starsMaterial = new THREE.PointsMaterial({
    size: 0.05,
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
    depthWrite: false
});

const starField = new THREE.Points(starsGeometry, starsMaterial);
scene.add(starField);

// Second layer of stars for depth
const starsGeometry2 = new THREE.BufferGeometry();
const starsCount2 = 5000;
const starPositions2 = new Float32Array(starsCount2 * 3);
const starColors2 = new Float32Array(starsCount2 * 3);
const starSizes2 = new Float32Array(starsCount2);

for(let i = 0; i < starsCount2; i++) {
    starPositions2[i * 3 + 0] = (Math.random() - 0.5) * 2000;
    starPositions2[i * 3 + 1] = (Math.random() - 0.5) * 2000;
    starPositions2[i * 3 + 2] = (Math.random() - 0.5) * 2000;
    
    const brightness = Math.random() * 0.4 + 0.2; // Dimmer stars
    color.setRGB(brightness, brightness, brightness);
    starColors2[i * 3 + 0] = color.r;
    starColors2[i * 3 + 1] = color.g;
    starColors2[i * 3 + 2] = color.b;

    starSizes2[i] = Math.random() * 2 + 1; // Bigger stars
}

starsGeometry2.setAttribute('position', new THREE.BufferAttribute(starPositions2, 3));
starsGeometry2.setAttribute('color', new THREE.BufferAttribute(starColors2, 3));
starsGeometry2.setAttribute('size', new THREE.BufferAttribute(starSizes2, 1));

const starsMaterial2 = new THREE.PointsMaterial({
    size: 0.1,
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
    depthWrite: false
});

const starField2 = new THREE.Points(starsGeometry2, starsMaterial2);
scene.add(starField2);

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: true
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setClearColor('black')
renderer.outputEncoding = THREE.sRGBEncoding
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Loaders
const gltfLoader = new GLTFLoader();
const exrLoader = new EXRLoader();

// Load EXR environment from local textures folder
const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

exrLoader
  .setDataType(THREE.FloatType)
  .load(
    '/textures/moon_lab_4k.exr',
    (texture) => {
      const envMap = pmremGenerator.fromEquirectangular(texture).texture;
      scene.environment = envMap;
      texture.dispose();
      pmremGenerator.dispose();
      onAssetLoad('moon_lab');
    },
    (event) => {
        assets.moon_lab.loaded = event.loaded;
        updateGlobalProgress();
    }
  );

// Load models
gltfLoader.load(
    'models/liquidAndPill.glb', 
    (gltf) => {
        scene.add(gltf.scene);
        // Store references to pill halves and hide orbs005
        gltf.scene.traverse((child) => {
            if (child.isMesh) {
            if (child.name === 'v1_pill_left') sceneAState.pillLeft = child;
            if (child.name === 'right_pill') sceneAState.pillRight = child;
            if (child.name === 'orbs005') child.visible = false;
            }
        });
        onAssetLoad('liquidAndPill');
    },
    (event) => {
        assets.liquidAndPill.loaded = event.loaded;
        updateGlobalProgress();
    }
);

gltfLoader.load(
    'models/modularParts.glb',
    (gltf) => {
        scene.add(gltf.scene);
        sceneAState.modularPartsScene = gltf.scene;

        console.log(gltf.animations);
        
        if (gltf.animations && gltf.animations.length > 0) {
            sceneAState.modularPartsMixer = new THREE.AnimationMixer(gltf.scene);
            let maxDur = 0;
            const allTracks = [];
            gltf.animations.forEach((clip) => {
                if (clip.duration > maxDur) maxDur = clip.duration;
                clip.tracks.forEach((t) => allTracks.push(t.clone()));
            });

            const mergedClip = new AnimationClip('AllPartsSimul', maxDur, allTracks);
            const action = sceneAState.modularPartsMixer.clipAction(mergedClip);
            action.setLoop(THREE.LoopOnce);
            action.clampWhenFinished = true;
            action.enabled = true;
            action.play();
            action.paused = true;

            sceneAState.modularPartsActions = [action];
            sceneAState.modularPartsMixer.time = 0;
            sceneAState.modularPartsTotalDuration = maxDur;
        }
        onAssetLoad('modularParts');
    },
    (event) => {
        assets.modularParts.loaded = event.loaded;
        updateGlobalProgress();
    }
);


window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 3000)
camera.position.set(0, 0, 10) // Initial camera position
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true
controls.enabled = false; // Disable controls until loading is finished

/**
 * Scene Groups
 */
// Create scene groups
const sceneA = createSceneA(renderer, scene)
const sceneB = createSceneB()
const sceneWithModels = createSceneWithModels()

// Add all scenes to main scene
scene.add(sceneA)
scene.add(sceneB)
scene.add(sceneWithModels)

// Array of all scene groups for management
const allScenes = [sceneA, sceneB, sceneWithModels]

// Start with Scene A visible
switchTo(sceneA, allScenes, camera, scene)

// Listen for the 'finished' event from the animation mixer
if (sceneAState.modularPartsMixer) {
    sceneAState.modularPartsMixer.addEventListener('finished', (e) => {
        // When an animation finishes (in either direction), pause it.
        e.action.paused = true;
    });
}

/**
 * Scene Switching Controls
 */
// Keyboard controls for scene switching
document.addEventListener('keydown', (e) => {
    if (e.key === '1') {
        switchTo(sceneA, allScenes, camera, scene)
    }
    if (e.key === '2') {
        switchTo(sceneB, allScenes, camera, scene)
    }
    if (e.key === '3') {
        switchTo(sceneWithModels, allScenes, camera, scene)
    }
})

// Remove raycaster and mouse move listeners
// let INTERSECTED;
// const raycaster = new THREE.Raycaster();
// const mouse = new THREE.Vector2();
// let capsuleAnimation;
// function onMouseMove(event) {
//     mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
//     mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
// }
// window.addEventListener('mousemove', onMouseMove, false);
// window.addEventListener('click', onPillClick, false);

function onPillClick() {
    // This logic will be replaced by scroll animations
}


/**
 * Animate
 */
const clock = new THREE.Clock()
let lastElapsedTime = 0

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()
    const deltaTime = elapsedTime - lastElapsedTime
    lastElapsedTime = elapsedTime
    if (deltaTime < 0) deltaTime = 0; // Ensure positive deltaTime

    if (!loadingAnimationFinished) {
        if (!fakeInitialPhase) {
            // After the fake phase, the target smoothly follows the real progress
            const oldTarget = loadingState.targetProgress;
            loadingState.targetProgress = gsap.utils.interpolate(
                oldTarget,
                loadingState.realProgress,
                0.05 // Smoothing factor for the target
            );

            // If the target isn't moving, give it a small nudge
            if (!allAssetsLoaded && loadingState.targetProgress <= oldTarget) {
                loadingState.targetProgress = oldTarget + 0.0002;
            }
        }
        
        // Visual progress smoothly follows the target progress in all phases
        loadingState.visualProgress = gsap.utils.interpolate(
            loadingState.visualProgress,
            loadingState.targetProgress,
            0.1 // Visual smoothing
        );

        if (!allAssetsLoaded) {
            loadingState.visualProgress = Math.min(loadingState.visualProgress, 0.999);
        }
        
        uniforms.u_progress.value = loadingState.visualProgress;
        loadingPercentage.textContent = `${Math.round(loadingState.visualProgress * 100)}%`;

        if (allAssetsLoaded && !loadingAnimationFinished && loadingState.visualProgress > 0.99) {
            loadingAnimationFinished = true; // Prevent this block from running again
            
            const tl = gsap.timeline();

            // Animate the loader to 100%
            tl.to(loadingState, {
                visualProgress: 1,
                duration: 0.5,
                ease: 'power2.out',
                onUpdate: () => {
                    uniforms.u_progress.value = loadingState.visualProgress;
                    loadingPercentage.textContent = `100%`;
                }
            });
        
            // Fade out the whole loading screen
            tl.to(loadingScreen, {
                opacity: 0,
                duration: 1.5, // Longer duration for a smoother fade
                ease: 'power3.out',
                onComplete: () => {
                    loadingScreen.style.display = 'none';
                    controls.enabled = true;
                    document.body.classList.remove('loading');
                    initScrollAnimations();
                }
            }, ">-0.4"); // Start fading slightly before the loader finishes filling up
        }
    }

    uniforms.u_time.value = elapsedTime;
    loaderRenderer.render(loaderScene, loaderCamera);

    // The animation mixer is now updated by the gsap timeline, so we don't need to update it here.
    /* if(sceneAState.modularPartsMixer) {
        sceneAState.modularPartsMixer.update(deltaTime);
    } */

    // Update starfield
    starField.rotation.y = elapsedTime * 0.01;
    starField2.rotation.y = elapsedTime * 0.005;

    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()