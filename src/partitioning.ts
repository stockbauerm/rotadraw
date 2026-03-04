import paper from "paper";
import { SegmentInfo, PartitionStrategy } from "./types";
import { getAngularMidpoint, getRadialMidpoint } from "./geometry";

/**
 * Assign each segment to a position based on the chosen strategy.
 */
export function partitionSegments(
  segments: SegmentInfo[],
  numPositions: number,
  strategy: PartitionStrategy,
  rotationOffsetRad: number
): void {
  switch (strategy) {
    case "angular":
      angularPartition(segments, numPositions, rotationOffsetRad);
      break;
    case "stripe":
      stripePartition(segments, numPositions);
      break;
    case "balanced":
      balancedPartition(segments, numPositions);
      break;
  }
}

/**
 * Angular sector partitioning.
 * Divides 2π into N equal sectors; assigns each segment to the sector
 * containing its angular midpoint.
 */
function angularPartition(
  segments: SegmentInfo[],
  N: number,
  offsetRad: number
): void {
  const sectorSize = (2 * Math.PI) / N;

  for (const seg of segments) {
    let angle = seg.angleMid - offsetRad;
    // Normalise to [0, 2π)
    angle = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    seg.positionIndex = Math.floor(angle / sectorSize) % N;
  }
}

/**
 * Spatial stripe partitioning.
 * Divides the bounding box into N horizontal stripes; assigns each segment
 * to the stripe containing its vertical midpoint.
 * Better for images concentrated in one angular region.
 */
function stripePartition(segments: SegmentInfo[], N: number): void {
  if (segments.length === 0) return;

  // Find vertical extent
  let yMin = Infinity;
  let yMax = -Infinity;
  for (const seg of segments) {
    const b = seg.path.bounds;
    if (b.top < yMin) yMin = b.top;
    if (b.bottom > yMax) yMax = b.bottom;
  }

  // Also check horizontal extent to decide stripe direction
  let xMin = Infinity;
  let xMax = -Infinity;
  for (const seg of segments) {
    const b = seg.path.bounds;
    if (b.left < xMin) xMin = b.left;
    if (b.right > xMax) xMax = b.right;
  }

  const yRange = yMax - yMin;
  const xRange = xMax - xMin;

  // Use the longer dimension for striping
  const useVertical = yRange >= xRange;
  const rangeMin = useVertical ? yMin : xMin;
  const rangeMax = useVertical ? yMax : xMax;
  const range = rangeMax - rangeMin;

  if (range < 0.001) {
    // All segments at same position
    segments.forEach((s, i) => (s.positionIndex = i % N));
    return;
  }

  const stripeSize = range / N;

  for (const seg of segments) {
    const mid = seg.path.getPointAt(seg.path.length / 2) || seg.path.bounds.center;
    const coord = useVertical ? mid.y : mid.x;
    let idx = Math.floor((coord - rangeMin) / stripeSize);
    idx = Math.max(0, Math.min(N - 1, idx));
    seg.positionIndex = idx;
  }
}

/**
 * Balanced graph-based partitioning.
 * Tries to distribute segments evenly by total path length across N groups,
 * while keeping spatially adjacent segments together.
 */
function balancedPartition(segments: SegmentInfo[], N: number): void {
  if (segments.length === 0) return;

  // Sort segments by angle for locality
  const sorted = [...segments].sort((a, b) => a.angleMid - b.angleMid);

  // Greedy assignment: assign each segment to the group with least total length
  const groupLengths = new Array(N).fill(0);

  for (const seg of sorted) {
    // Find the group with minimum total length
    let minGroup = 0;
    let minLen = groupLengths[0];
    for (let g = 1; g < N; g++) {
      if (groupLengths[g] < minLen) {
        minLen = groupLengths[g];
        minGroup = g;
      }
    }
    seg.positionIndex = minGroup;
    groupLengths[minGroup] += seg.path.length;
  }
}

/**
 * Compute partition statistics for display.
 */
export function getPartitionStats(
  segments: SegmentInfo[],
  N: number
): { counts: number[]; lengths: number[] } {
  const counts = new Array(N).fill(0);
  const lengths = new Array(N).fill(0);

  for (const seg of segments) {
    counts[seg.positionIndex]++;
    lengths[seg.positionIndex] += seg.path.length;
  }

  return { counts, lengths };
}
