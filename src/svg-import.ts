import paper from "paper";
import { SegmentInfo } from "./types";
import {
  splitPath,
  getAngularMidpoint,
  getRadialMidpoint,
} from "./geometry";

/**
 * Import an SVG string into the Paper.js project and return normalised path segments.
 *
 * - Parses the SVG
 * - Centres and scales the drawing to fit within the given radius
 * - Flattens compound paths into individual paths
 * - Splits long paths into sub-segments
 * - Computes polar coordinates for each segment
 */
export function importSVG(
  svgString: string,
  fitRadius: number,
  maxSegmentLength: number
): { segments: SegmentInfo[]; originalGroup: paper.Group } {
  // Import SVG into a temporary group
  const imported = paper.project.importSVG(svgString, {
    insert: false,
    expandShapes: true,
  }) as paper.Item;

  // Collect all paths from the imported item tree
  const allPaths: paper.Path[] = [];
  collectPaths(imported, allPaths);

  if (allPaths.length === 0) {
    throw new Error("No drawable paths found in the SVG.");
  }

  // Compute bounding box of all paths
  let bounds: paper.Rectangle | null = null;
  for (const p of allPaths) {
    if (!bounds) {
      bounds = p.bounds.clone();
    } else {
      bounds = bounds.unite(p.bounds);
    }
  }

  if (!bounds || bounds.width < 0.01 || bounds.height < 0.01) {
    throw new Error("SVG has no drawable extent.");
  }

  // Centre the drawing on origin
  const centre = bounds.center;
  const translation = new paper.Point(-centre.x, -centre.y);

  // Scale to fit within fitRadius (with 10% margin)
  const maxExtent = Math.max(bounds.width, bounds.height) / 2;
  const scale = (fitRadius * 0.9) / maxExtent;

  // Apply transform to all paths
  const normalised: paper.Path[] = [];
  for (const p of allPaths) {
    const clone = p.clone({ insert: false }) as paper.Path;
    clone.translate(translation);
    clone.scale(scale, new paper.Point(0, 0));
    // Remove styling — we just want the geometry
    clone.strokeColor = new paper.Color("#fff");
    clone.strokeWidth = 1.5;
    clone.fillColor = null;
    normalised.push(clone);
  }

  // Split long paths into sub-segments
  const splitSegments: paper.Path[] = [];
  for (const p of normalised) {
    const parts = splitPath(p, maxSegmentLength);
    splitSegments.push(...parts);
  }

  // Build SegmentInfo array
  const segments: SegmentInfo[] = splitSegments.map((path, index) => ({
    index,
    path,
    angleMid: getAngularMidpoint(path),
    radiusMid: getRadialMidpoint(path),
    positionIndex: 0,
  }));

  // Build a display group with the normalised paths
  const displayGroup = new paper.Group({
    children: normalised.map((p) => p.clone({ insert: false }) as paper.Item),
    insert: false,
  });

  return { segments, originalGroup: displayGroup };
}

/**
 * Recursively collect all Path items from a Paper.js item tree.
 */
function collectPaths(item: paper.Item, paths: paper.Path[]): void {
  if (item instanceof paper.Path) {
    if (item.segments.length >= 2 || item.closed) {
      paths.push(item);
    }
  } else if (item instanceof paper.CompoundPath) {
    for (const child of (item.children as paper.Item[])) {
      collectPaths(child, paths);
    }
  } else if (item instanceof paper.Group || item instanceof paper.Layer) {
    for (const child of (item.children as paper.Item[])) {
      collectPaths(child, paths);
    }
  } else if ((item as any).children) {
    for (const child of ((item as any).children as paper.Item[])) {
      collectPaths(child, paths);
    }
  }
}
