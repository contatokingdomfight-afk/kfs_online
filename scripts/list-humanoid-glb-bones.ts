/**
 * Lista nomes de ossos de um GLB (útil para alinhar heurísticas em `lib/humanoid-gltf-scene.ts`).
 * Uso: npx tsx scripts/list-humanoid-glb-bones.ts [caminho.glb]
 * Predefinição: public/models/human-base-male.glb
 */
/* GLTFLoader usa `self` para texturas — no Node não existe. */
(globalThis as typeof globalThis & { self?: unknown }).self = globalThis;

import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const def = join(process.cwd(), "public", "models", "human-base-male.glb");
const arg = process.argv[2];
const glbPath = arg ? (isAbsolute(arg) ? arg : join(process.cwd(), arg)) : def;

if (!existsSync(glbPath)) {
  console.error("Ficheiro não encontrado:", glbPath);
  console.error("Coloca o GLB em public/models/ ou passa o caminho relativo à raiz do repo.");
  process.exit(1);
}

const buf = readFileSync(glbPath);
const loader = new GLTFLoader();
loader.parse(
  buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
  "",
  (gltf) => {
    const names = new Set<string>();
    gltf.scene.traverse((o) => {
      if (o instanceof THREE.SkinnedMesh && o.skeleton) {
        for (const b of o.skeleton.bones) names.add(b.name);
      }
    });
    const sorted = [...names].sort();
    console.log(`Ossos (${sorted.length}) em ${glbPath}:\n`);
    console.log(sorted.join("\n"));
  },
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
