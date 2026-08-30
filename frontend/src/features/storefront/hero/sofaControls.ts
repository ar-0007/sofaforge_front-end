/**
 * The handful of numbers the DOM and the 3D scene both need.
 *
 * The drag handler has to live on a plain DOM wrapper — it must keep working
 * while the canvas is still loading, and it has to share the element that owns
 * `touch-action` — but the rotation it produces is consumed inside a
 * `useFrame` loop. Passing a ref of this shape across that boundary keeps the
 * pointer maths out of React state, so dragging never re-renders the page.
 */
export type SofaControls = {
  /** Pointer position over the canvas, -1 to 1, left-to-right / top-to-bottom. */
  x: number;
  y: number;
  /** Radians accumulated by dragging. Never reset — the piece stays where it is left. */
  spin: number;
  /** False once the pointer leaves, so the piece drifts back to its rest angle. */
  engaged: boolean;
};

export function createSofaControls(): SofaControls {
  return { x: 0, y: 0, spin: 0, engaged: false };
}

/** Radians of yaw per pixel dragged. Tuned so a full turn is roughly one swipe. */
export const DRAG_SENSITIVITY = 0.0075;
