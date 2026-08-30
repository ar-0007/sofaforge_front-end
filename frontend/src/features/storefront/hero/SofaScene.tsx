"use client";

import { Suspense, useEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, useGLTF } from "@react-three/drei";
import {
  Color,
  MathUtils,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  type Group,
  type Mesh,
} from "three";
import { CONFIGURATOR } from "@/features/storefront/content";
import type { SofaControls } from "./sofaControls";

/**
 * The hero showpiece: a real sectional, rendered live, in the fabric the
 * visitor picked.
 *
 * This whole module is client-only and code-split (see `HeroSofa`), because
 * three.js is far larger than the rest of the storefront put together and no
 * other page needs it.
 *
 * Model: "Low Poly Sectional Couch" by Stephen White, CC BY — see
 * `public/models/LICENSE.md`. It arrives untextured and flat-shaded, which is
 * the trade that makes it worth having: 74 kB puts the piece on screen before
 * the doors finish opening, and the facets read as a considered illustration
 * once they are lit properly and dressed in the catalogue's own fabrics.
 */

const MODEL_URL = "/models/sectional-sofa.glb";

/**
 * The model's own bounding box, measured from the file: x -1.029→1.282,
 * y -0.280→0.287, z -0.616→1.200. These numbers put its centre on the origin
 * and its feet on y = 0, so nothing downstream has to know the author's pivot.
 */
const RECENTRE: [number, number, number] = [-0.127, 0.28, -0.292];

/** Floor height, shared by the piece and the shadow it casts. */
const FLOOR_Y = -0.32;

/** Three-quarter view: square-on hides the return that makes it a sectional. */
const REST_YAW = -0.62;

/** How far the piece leans toward the cursor before a drag takes over. */
const HOVER_YAW = 0.3;
const HOVER_PITCH = 0.07;

/**
 * The file ships exactly two materials: `mat5` covers the twenty upholstery
 * meshes, `mat18` the five legs. Both are replaced outright rather than tinted
 * — the originals are flat unlit blue and cream, and the upholstery needs a
 * sheen layer the source material has no way to express.
 */
const UPHOLSTERY = "mat5";

const FABRICS = CONFIGURATOR.materials;
type FabricId = (typeof FABRICS)[number]["id"];

function Sofa({
  fabricId,
  controls,
  onReady,
}: {
  fabricId: FabricId;
  controls: RefObject<SofaControls>;
  onReady: () => void;
}) {
  const { scene } = useGLTF(MODEL_URL);
  const pivot = useRef<Group>(null);

  // The loader caches one scene per URL, so it is cloned before anything is
  // mutated — otherwise re-mounting the hero would hand back a sofa still
  // wearing the last visitor's fabric.
  const { model, fabric } = useMemo(() => {
    const model = scene.clone(true);

    // Upholstery, essentially: rough and matte until the sheen layer catches
    // at a grazing angle, which is what separates cloth from plastic.
    const fabric = new MeshPhysicalMaterial({
      color: "#ffffff",
      roughness: 0.94,
      metalness: 0,
      sheen: 1,
      sheenRoughness: 0.6,
      sheenColor: new Color("#ffffff"),
      flatShading: true,
    });

    const legs = new MeshStandardMaterial({
      color: "#2A211A",
      roughness: 0.4,
      metalness: 0.2,
      flatShading: true,
    });

    model.traverse((node) => {
      const mesh = node as Mesh;
      if (!mesh.isMesh) return;
      const original = mesh.material as MeshStandardMaterial;
      mesh.material = original.name === UPHOLSTERY ? fabric : legs;
    });

    return { model, fabric };
  }, [scene]);

  const target = useMemo(() => {
    const choice = FABRICS.find((item) => item.id === fabricId) ?? FABRICS[0];
    return { color: new Color(choice.swatch), sheen: new Color(choice.sheen) };
  }, [fabricId]);

  // The first frame snaps; every frame after eases, so switching fabric reads
  // as the light moving across the cloth rather than a hard swap.
  const eased = useRef(false);

  useEffect(() => {
    onReady();
  }, [onReady]);

  useFrame((_, delta) => {
    const step = eased.current ? Math.min(1, delta * 4.5) : 1;
    eased.current = true;
    fabric.color.lerp(target.color, step);
    fabric.sheenColor.lerp(target.sheen, step);

    const group = pivot.current;
    const input = controls.current;
    if (!group || !input) return;

    // Rest angle + whatever the visitor dragged + a small lean toward the
    // cursor. Nothing here advances on its own: with the pointer away and no
    // drag every term is constant, and the piece simply holds still.
    const yaw = REST_YAW + input.spin + (input.engaged ? input.x * HOVER_YAW : 0);
    const pitch = input.engaged ? -input.y * HOVER_PITCH : 0;

    group.rotation.y = MathUtils.damp(group.rotation.y, yaw, 4.5, delta);
    group.rotation.x = MathUtils.damp(group.rotation.x, pitch, 4.5, delta);
  });

  return (
    <group ref={pivot} position={[0, FLOOR_Y, 0]}>
      <primitive object={model} position={RECENTRE} />
    </group>
  );
}

/**
 * A window, a ceiling bounce and a warm wall, built as geometry rather than
 * fetched as an HDRI — the storefront should not depend on a third-party CDN
 * to light its own hero, and `frames={1}` bakes it once instead of every frame.
 */
function Room() {
  return (
    <Environment resolution={256} frames={1}>
      <Lightformer
        form="rect"
        intensity={3}
        color="#FFF6E8"
        position={[-3, 2.4, 2.6]}
        rotation={[0, Math.PI / 2.6, 0]}
        scale={[7, 5, 1]}
      />
      <Lightformer
        form="rect"
        intensity={1.2}
        color="#F7F1E7"
        position={[0, 4.5, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[9, 9, 1]}
      />
      <Lightformer
        form="rect"
        intensity={1}
        color="#D9622B"
        position={[3.6, 1.2, -2.4]}
        rotation={[0, -Math.PI / 2.2, 0]}
        scale={[5, 5, 1]}
      />
    </Environment>
  );
}

export default function SofaScene({
  fabricId,
  controls,
  onReady,
}: {
  fabricId: FabricId;
  controls: RefObject<SofaControls>;
  onReady: () => void;
}) {
  return (
    <Canvas
      // Transparent so the room gradient behind the canvas is the backdrop —
      // one less surface for the renderer to paint.
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 1.75]}
      camera={{ position: [0.1, 1.05, 3.9], fov: 32 }}
      onCreated={({ camera }) => camera.lookAt(0, -0.12, 0)}
      // Pointer handling lives on the DOM wrapper, so the canvas itself never
      // needs to hit-test.
      style={{ pointerEvents: "none" }}
    >
      {/* Low fill and a hard key: on a 510-triangle model the only thing
          separating one plane from the next is how differently they are lit. */}
      <ambientLight intensity={0.22} />
      <directionalLight position={[4, 5.5, 3.5]} intensity={2.4} color="#FFF3E2" />
      <directionalLight position={[-4.5, 2.4, -1.5]} intensity={0.8} color="#E8834F" />
      {/* Rim along the back edge, so the returns separate from the backdrop. */}
      <directionalLight position={[-1.5, 3, -4]} intensity={1.1} color="#FFFDF8" />

      <Suspense fallback={null}>
        <Sofa fabricId={fabricId} controls={controls} onReady={onReady} />
        <Room />
      </Suspense>

      {/* Grounds the piece. Kept outside the rotating group so the floor stays
          put while the sofa turns on it. */}
      <ContactShadows
        position={[0, FLOOR_Y + 0.002, 0]}
        opacity={0.5}
        scale={9}
        blur={2.6}
        far={2.6}
        resolution={512}
        color="#2A1F16"
      />
    </Canvas>
  );
}

useGLTF.preload(MODEL_URL);
