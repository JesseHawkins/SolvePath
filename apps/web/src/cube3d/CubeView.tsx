/**
 * The 3D cube.
 *
 * Draws a cube from a store (store.ts), plays each turn as a short
 * animation, and can highlight a face and show a "turn this way" arrow.
 * When `interactive`, you can turn it by swiping (swipe.ts) or with the
 * keyboard (keys.ts).
 *
 * Drawing is done straight on three.js objects inside one react-three-fiber
 * canvas, so a turn never makes React redraw the page. The canvas only
 * draws when something changes, to save battery.
 */
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "zustand";
import * as THREE from "three";
import {
  applyMove,
  CUBE_BODY_COLOR,
  colorAt,
  DEFAULT_PROFILE,
  faceletString,
  moveTurn,
  STICKERS,
  stickerIndexAt,
  type CubeProfile,
  type CubeState,
  type Face,
  type Move,
  type Vec3,
} from "@solvepath/cube-core";
import { useThemeTokens } from "../theme/useThemeTokens";
import { arrowFor } from "./arrow";
import { loadKeyMoves } from "./keys";
import type { CubeStore } from "./store";
import { moveForSwipe } from "./swipe";

const QUARTER_TURN_MS = 150;
const HALF_TURN_MS = 230;
const SWIPE_PX = 14;
const DIM = 0.4;

export interface CubeViewProps {
  store: CubeStore;
  /** Text for screen readers, like "Virtual cube". */
  label: string;
  /** Id of an element that explains how to use the cube. */
  describedBy?: string;
  profile?: CubeProfile;
  /** Makes one face (and the layer behind it) stand out by dimming the rest. */
  highlightFace?: Face | null;
  /** Shows an arrow for this move. */
  arrow?: Move | null;
  /** Lets the user turn the cube by swiping or with the keyboard. */
  interactive?: boolean;
}

interface Bridge {
  pick: (clientX: number, clientY: number) => number | null;
  project: (point: Vec3) => { x: number; y: number };
}

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function CubeView({
  store,
  label,
  describedBy,
  profile = DEFAULT_PROFILE,
  highlightFace = null,
  arrow = null,
  interactive = false,
}: CubeViewProps) {
  const [webgl] = useState(hasWebGL);
  const bridge = useRef<Bridge | null>(null);
  const swipe = useRef<{ id: number; x: number; y: number; sticker: number | null; done: boolean }>(
    null,
  );
  const [keyMoves, setKeyMoves] = useState<ReadonlyMap<string, Move> | null>(null);
  const facelets = useStore(store, (s) => faceletString(s.state));

  useEffect(() => {
    if (!interactive) return;
    let live = true;
    void loadKeyMoves().then((moves) => live && setKeyMoves(moves));
    return () => {
      live = false;
    };
  }, [interactive]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!interactive || !keyMoves || e.ctrlKey || e.metaKey || e.altKey) return;
    const move = keyMoves.get(e.code);
    if (!move) return;
    e.preventDefault();
    store.getState().doMoves([move]);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!interactive || !bridge.current || !e.isPrimary) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    swipe.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      sticker: bridge.current.pick(e.clientX, e.clientY),
      done: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const s = swipe.current;
    if (!s || s.done || s.id !== e.pointerId || !bridge.current) return;
    const drag = { x: e.clientX - s.x, y: e.clientY - s.y };
    if (Math.hypot(drag.x, drag.y) < SWIPE_PX) return;
    s.done = true;
    store.getState().doMoves([moveForSwipe(s.sticker, drag, bridge.current.project)]);
  };

  const endSwipe = () => {
    swipe.current = null;
  };

  return (
    // role="application" is the ARIA role for a custom widget that handles its own keys
    // and pointer gestures. jsx-a11y doesn't count it as interactive, so we tell it.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      role="application"
      aria-label={label}
      aria-describedby={describedBy}
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={interactive ? 0 : -1}
      data-testid="cube-view"
      data-facelets={facelets}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endSwipe}
      onPointerCancel={endSwipe}
      className="aspect-square w-full touch-none select-none rounded-3xl outline-none focus-visible:ring-4 focus-visible:ring-focus"
    >
      {webgl ? (
        <Canvas
          frameloop="demand"
          dpr={[1, 2]}
          camera={{ position: [4.1, 5.0, 7.4], fov: 32 }}
          gl={{ antialias: true, powerPreference: "high-performance" }}
        >
          <CubeScene
            store={store}
            profile={profile}
            highlightFace={highlightFace}
            arrow={arrow}
            bridgeRef={bridge}
          />
        </Canvas>
      ) : (
        <NoWebGL />
      )}
    </div>
  );
}

function NoWebGL() {
  const { t } = useTranslation();
  return (
    <p data-testid="cube-no-webgl" className="grid h-full place-items-center p-6 text-center">
      {t("cube.noWebgl")}
    </p>
  );
}

interface SceneProps {
  store: CubeStore;
  profile: CubeProfile;
  highlightFace: Face | null;
  arrow: Move | null;
  bridgeRef: RefObject<Bridge | null>;
}

interface Turn {
  move: Move;
  axis: THREE.Vector3;
  members: THREE.Object3D[];
  angle: number;
  elapsed: number;
  duration: number;
}

function roundedSquare(size: number, radius: number): THREE.ShapeGeometry {
  const h = size / 2;
  const r = radius;
  const shape = new THREE.Shape();
  shape.moveTo(-h + r, -h);
  shape.lineTo(h - r, -h);
  shape.quadraticCurveTo(h, -h, h, -h + r);
  shape.lineTo(h, h - r);
  shape.quadraticCurveTo(h, h, h - r, h);
  shape.lineTo(-h + r, h);
  shape.quadraticCurveTo(-h, h, -h, h - r);
  shape.lineTo(-h, -h + r);
  shape.quadraticCurveTo(-h, -h, -h + r, -h);
  return new THREE.ShapeGeometry(shape, 4);
}

const Z = new THREE.Vector3(0, 0, 1);
const AXES = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];

function CubeScene({ store, profile, highlightFace, arrow, bridgeRef }: SceneProps) {
  const { camera, gl, invalidate } = useThree();
  const tokens = useThemeTokens();

  // Build the cube once: 26 dark plastic bodies and 54 stickers, each with a home transform.
  const cube = useMemo(() => {
    const group = new THREE.Group();
    const bodyGeometry = new THREE.BoxGeometry(0.97, 0.97, 0.97);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: CUBE_BODY_COLOR, roughness: 0.7 });
    const bodies: THREE.Mesh[] = [];
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          if (x === 0 && y === 0 && z === 0) continue;
          const mesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
          mesh.position.set(x, y, z);
          mesh.userData = {
            cubie: [x, y, z],
            home: mesh.position.clone(),
            homeQ: new THREE.Quaternion(),
          };
          bodies.push(mesh);
          group.add(mesh);
        }
      }
    }
    const stickerGeometry = roundedSquare(0.86, 0.13);
    const stickers = STICKERS.map((s) => {
      const material = new THREE.MeshStandardMaterial({ roughness: 0.45 });
      const mesh = new THREE.Mesh(stickerGeometry, material);
      const n = new THREE.Vector3(...s.normal);
      mesh.position.set(...s.cubie).addScaledVector(n, 0.488);
      mesh.quaternion.setFromUnitVectors(Z, n);
      mesh.userData = {
        sticker: s.index,
        cubie: s.cubie,
        home: mesh.position.clone(),
        homeQ: mesh.quaternion.clone(),
      };
      group.add(mesh);
      return mesh;
    });
    return { group, bodies, stickers, bodyGeometry, bodyMaterial, stickerGeometry };
  }, []);

  useEffect(
    () => () => {
      cube.bodyGeometry.dispose();
      cube.bodyMaterial.dispose();
      cube.stickerGeometry.dispose();
      for (const s of cube.stickers) (s.material as THREE.Material).dispose();
    },
    [cube],
  );

  const displayed = useRef<CubeState>(store.getState().state);
  const turn = useRef<Turn | null>(null);
  // Anything already queued is already part of the starting state.
  useEffect(() => {
    store.setState({ queue: [] });
  }, [store]);

  const highlighted = useMemo(() => {
    if (!highlightFace) return null;
    const t = moveTurn({ family: highlightFace, amount: 1 });
    return (cubie: Vec3) => t.layers.includes(cubie[t.axis]);
  }, [highlightFace]);

  const recolor = useMemo(
    () => () => {
      const color = new THREE.Color();
      for (const mesh of cube.stickers) {
        const { sticker, cubie } = mesh.userData as { sticker: number; cubie: Vec3 };
        const face = colorAt(displayed.current, sticker);
        color.set(profile.displayColors[profile.scheme[face]]);
        if (highlighted && !highlighted(cubie)) color.multiplyScalar(DIM);
        mesh.material.color.copy(color);
      }
      invalidate();
    },
    [cube, profile, highlighted, invalidate],
  );
  useEffect(recolor, [recolor]);

  useEffect(() => store.subscribe(() => invalidate()), [store, invalidate]);

  useEffect(() => {
    const raycaster = new THREE.Raycaster();
    const targets = [...cube.stickers, ...cube.bodies];
    bridgeRef.current = {
      pick: (clientX, clientY) => {
        const rect = gl.domElement.getBoundingClientRect();
        const ndc = new THREE.Vector2(
          ((clientX - rect.left) / rect.width) * 2 - 1,
          -((clientY - rect.top) / rect.height) * 2 + 1,
        );
        raycaster.setFromCamera(ndc, camera);
        const hit = raycaster.intersectObjects(targets, false)[0];
        if (!hit) return null;
        const data = hit.object.userData as { sticker?: number; cubie: Vec3 };
        if (data.sticker !== undefined) return data.sticker;
        // Hit the plastic between stickers: use the sticker on that side of the cubie.
        const p = hit.point;
        const abs = [Math.abs(p.x), Math.abs(p.y), Math.abs(p.z)];
        const axis = abs.indexOf(Math.max(...abs));
        const normal: [number, number, number] = [0, 0, 0];
        normal[axis] = Math.sign([p.x, p.y, p.z][axis]!);
        try {
          return stickerIndexAt(data.cubie, normal);
        } catch {
          return null;
        }
      },
      project: (point) => {
        const rect = gl.domElement.getBoundingClientRect();
        const v = new THREE.Vector3(...point).project(camera);
        return { x: ((v.x + 1) / 2) * rect.width, y: ((1 - v.y) / 2) * rect.height };
      },
    };
    return () => {
      bridgeRef.current = null;
    };
  }, [bridgeRef, camera, gl, cube]);

  useEffect(() => {
    camera.lookAt(0, 0, 0);
    invalidate();
  }, [camera, invalidate]);

  useFrame((_, delta) => {
    let t = turn.current;
    if (!t) {
      const next = store.getState().takeNext();
      if (!next) return;
      if (next.kind === "set") {
        displayed.current = next.state;
        recolor();
        return;
      }
      const info = moveTurn(next.move);
      const waiting = store.getState().queue.length;
      const speedUp = Math.min(4, 1 + waiting * 0.75);
      const base = info.quarterTurnsCcw === 2 ? HALF_TURN_MS : QUARTER_TURN_MS;
      t = {
        move: next.move,
        axis: AXES[info.axis]!,
        members: [...cube.stickers, ...cube.bodies].filter((m) =>
          info.layers.includes((m.userData as { cubie: Vec3 }).cubie[info.axis]),
        ),
        angle: (info.quarterTurnsCcw === 3 ? -1 : info.quarterTurnsCcw) * (Math.PI / 2),
        elapsed: 0,
        duration: prefersReducedMotion() ? 0 : base / speedUp,
      };
      turn.current = t;
    }

    t.elapsed += delta * 1000;
    const progress = t.duration === 0 ? 1 : Math.min(1, t.elapsed / t.duration);
    if (progress < 1) {
      const eased = 1 - (1 - progress) ** 3;
      const q = new THREE.Quaternion().setFromAxisAngle(t.axis, t.angle * eased);
      for (const m of t.members) {
        const { home, homeQ } = m.userData as { home: THREE.Vector3; homeQ: THREE.Quaternion };
        m.position.copy(home).applyQuaternion(q);
        m.quaternion.copy(q).multiply(homeQ);
      }
    } else {
      // Done: put every piece back home and repaint, in the same frame, so nothing flickers.
      for (const m of t.members) {
        const { home, homeQ } = m.userData as { home: THREE.Vector3; homeQ: THREE.Quaternion };
        m.position.copy(home);
        m.quaternion.copy(homeQ);
      }
      displayed.current = applyMove(displayed.current, t.move);
      turn.current = null;
      recolor();
    }
    invalidate();
  });

  return (
    <>
      <ambientLight intensity={1.4} />
      <directionalLight position={[3, 6, 5]} intensity={1.6} />
      <directionalLight position={[-4, -2, -3]} intensity={0.5} />
      <primitive object={cube.group} />
      {arrow && <TurnArrow move={arrow} color={tokens.accent} outline={tokens.bg} />}
    </>
  );
}

function TurnArrow({ move, color, outline }: { move: Move; color: string; outline: string }) {
  const placement = arrowFor(move);
  const shapes = useMemo(() => {
    const width = placement.wide ? 0.5 : 0.2;
    const head = placement.wide ? 0.62 : 0.4;
    const make = (grow: number) => {
      const s = new THREE.Shape();
      const w = width / 2 + grow;
      s.moveTo(-1.05 - grow, -w);
      s.lineTo(0.55, -w);
      s.lineTo(0.55, -head - grow);
      s.lineTo(1.2 + grow * 1.6, 0);
      s.lineTo(0.55, head + grow);
      s.lineTo(0.55, w);
      s.lineTo(-1.05 - grow, w);
      s.closePath();
      if (placement.double) {
        const s2 = new THREE.Shape();
        s2.moveTo(0, -head - grow);
        s2.lineTo(0.65 + grow * 1.6, 0);
        s2.lineTo(0, head + grow);
        s2.closePath();
        return new THREE.ShapeGeometry([s, s2]);
      }
      return new THREE.ShapeGeometry(s);
    };
    return { fill: make(0), edge: make(0.06) };
  }, [placement.wide, placement.double]);
  useEffect(
    () => () => {
      shapes.fill.dispose();
      shapes.edge.dispose();
    },
    [shapes],
  );

  const quaternion = useMemo(() => {
    const x = new THREE.Vector3(...placement.direction);
    const z = new THREE.Vector3(...placement.normal);
    const y = new THREE.Vector3().crossVectors(z, x);
    return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
  }, [placement.direction, placement.normal]);

  return (
    <group position={placement.center} quaternion={quaternion}>
      <mesh geometry={shapes.edge}>
        <meshBasicMaterial color={outline} />
      </mesh>
      <mesh geometry={shapes.fill} position={[0, 0, 0.01]}>
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}
