import paper from "paper";

/**
 * Core geometric utilities for rotadraw generation.
 */

/** Rotate a point around the origin by angle (radians). */
export function rotatePoint(
  p: paper.Point,
  angle: number
): paper.Point {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return new paper.Point(
    p.x * cos - p.y * sin,
    p.x * sin + p.y * cos
  );
}

/** Rotate an entire path around the origin by angle (radians). */
export function rotatePath(path: paper.Path, angle: number): paper.Path {
  const clone = path.clone({ insert: false }) as paper.Path;
  const degrees = (angle * 180) / Math.PI;
  clone.rotate(degrees, new paper.Point(0, 0));
  return clone;
}

/** Get the angular midpoint (in radians, 0..2π) of a path relative to origin. */
export function getAngularMidpoint(path: paper.Path): number {
  const mid = path.getPointAt(path.length / 2) || path.bounds.center;
  let angle = Math.atan2(mid.y, mid.x);
  if (angle < 0) angle += 2 * Math.PI;
  return angle;
}

/** Get the radial midpoint (distance from origin) of a path. */
export function getRadialMidpoint(path: paper.Path): number {
  const mid = path.getPointAt(path.length / 2) || path.bounds.center;
  return Math.sqrt(mid.x * mid.x + mid.y * mid.y);
}

/**
 * Thicken a path into a closed slot outline by offsetting on both sides.
 * Returns a closed Path representing the slot polygon.
 */
export function thickenPath(
  path: paper.Path,
  width: number
): paper.Path {
  // Use Paper.js path offset via stroke expansion.
  // We create a stroked version and expand it to a filled outline.
  const clone = path.clone({ insert: false }) as paper.Path;
  clone.strokeWidth = width;
  clone.strokeCap = "round";
  clone.strokeJoin = "round";

  // PaperOffset isn't built-in; we approximate by creating an expanded shape.
  // Flatten the path for reliable offsetting.
  const flattened = clone.clone({ insert: false }) as paper.Path;
  if (flattened.curves.length > 0) {
    flattened.flatten(Math.max(0.5, width / 4));
  }

  // Build offset polygon by walking along normals on both sides
  const points: paper.Point[] = [];
  const halfW = width / 2;
  const len = flattened.length;
  if (len < 0.01) {
    // Degenerate path - make a small circle
    const c = flattened.firstSegment?.point || new paper.Point(0, 0);
    const circle = new paper.Path.Circle({
      center: c,
      radius: halfW,
      insert: false,
    });
    return circle;
  }

  const steps = Math.max(4, Math.ceil(len / Math.max(0.3, width / 3)));

  // Forward pass (left side)
  for (let i = 0; i <= steps; i++) {
    const offset = (i / steps) * len;
    const pt = flattened.getPointAt(offset);
    const normal = flattened.getNormalAt(offset);
    if (pt && normal) {
      points.push(pt.add(normal.multiply(halfW)));
    }
  }

  // Backward pass (right side)
  for (let i = steps; i >= 0; i--) {
    const offset = (i / steps) * len;
    const pt = flattened.getPointAt(offset);
    const normal = flattened.getNormalAt(offset);
    if (pt && normal) {
      points.push(pt.subtract(normal.multiply(halfW)));
    }
  }

  const slot = new paper.Path({
    segments: points,
    closed: true,
    insert: false,
  });
  slot.simplify(width / 6);
  return slot;
}

/**
 * Split a path into sub-segments of approximately maxLength.
 * Returns an array of new Path objects.
 */
export function splitPath(
  path: paper.Path,
  maxLength: number
): paper.Path[] {
  const totalLen = path.length;
  if (totalLen <= maxLength) {
    return [path.clone({ insert: false }) as paper.Path];
  }

  const numParts = Math.ceil(totalLen / maxLength);
  const partLen = totalLen / numParts;
  const parts: paper.Path[] = [];

  for (let i = 0; i < numParts; i++) {
    const startOffset = i * partLen;
    const endOffset = Math.min((i + 1) * partLen, totalLen);

    // Extract sub-path by sampling points
    const steps = Math.max(2, Math.ceil((endOffset - startOffset) / 0.5));
    const pts: paper.Point[] = [];
    for (let s = 0; s <= steps; s++) {
      const off = startOffset + (s / steps) * (endOffset - startOffset);
      const pt = path.getPointAt(off);
      if (pt) pts.push(pt);
    }

    if (pts.length >= 2) {
      const subPath = new paper.Path({
        segments: pts,
        insert: false,
      });
      subPath.simplify(0.5);
      parts.push(subPath);
    }
  }

  return parts;
}

/**
 * Check if two closed paths overlap (have intersecting area).
 */
export function pathsOverlap(a: paper.Path, b: paper.Path): boolean {
  // Quick bounding-box check first
  if (!a.bounds.intersects(b.bounds)) return false;

  // Check for intersections
  const intersections = a.getIntersections(b);
  if (intersections.length > 0) return true;

  // Check containment
  if (a.contains(b.firstSegment.point)) return true;
  if (b.contains(a.firstSegment.point)) return true;

  return false;
}

/**
 * Compute minimum distance between boundaries of two paths.
 * Uses sampling for efficiency.
 */
export function minPathDistance(
  a: paper.Path,
  b: paper.Path
): number {
  // Quick bounding box distance check
  const aB = a.bounds;
  const bB = b.bounds;

  let minDist = Infinity;
  const samplesA = Math.max(4, Math.ceil(a.length / 2));
  const samplesB = Math.max(4, Math.ceil(b.length / 2));

  for (let i = 0; i <= samplesA; i++) {
    const ptA = a.getPointAt((i / samplesA) * a.length);
    if (!ptA) continue;
    const nearest = b.getNearestPoint(ptA);
    const dist = ptA.getDistance(nearest);
    if (dist < minDist) minDist = dist;
    if (minDist < 0.01) return 0;
  }

  return minDist;
}
