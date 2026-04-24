import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export type HumanoidOrbitViewportOptions = {
  /** `title` no canvas (acessibilidade / tooltip nativo). */
  canvasTitle?: string;
};

/**
 * Orbit + zoom + pan no canvas WebGL; resize mantém aspecto.
 * Deve ser libertado antes de `renderer.dispose()`.
 */
export function attachHumanoidOrbitViewport(
  container: HTMLElement,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer,
  lookTargetY: number,
  options?: HumanoidOrbitViewportOptions,
): () => void {
  const canvas = renderer.domElement;
  canvas.style.touchAction = "none";
  canvas.style.cursor = "grab";
  if (options?.canvasTitle?.trim()) {
    canvas.title = options.canvasTitle.trim();
  }

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, lookTargetY, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.085;
  controls.screenSpacePanning = true;
  controls.rotateSpeed = 0.72;
  controls.zoomSpeed = 0.62;
  controls.panSpeed = 0.55;
  controls.minDistance = 0.82;
  controls.maxDistance = 6.2;
  controls.maxPolarAngle = Math.PI * 0.52;
  controls.minPolarAngle = 0.26;
  controls.update();

  let rafId = 0;
  const loop = () => {
    rafId = requestAnimationFrame(loop);
    controls.update();
    renderer.render(scene, camera);
  };
  rafId = requestAnimationFrame(loop);

  const setSize = () => {
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.2));
    renderer.setSize(w, h, false);
  };

  setSize();
  const ro = new ResizeObserver(() => setSize());
  ro.observe(container);

  return () => {
    cancelAnimationFrame(rafId);
    ro.disconnect();
    controls.dispose();
    canvas.title = "";
    canvas.style.touchAction = "";
    canvas.style.cursor = "";
  };
}
