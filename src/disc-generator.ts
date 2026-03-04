import paper from "paper";
import { SegmentInfo, GeneratorParams } from "./types";
import { rotatePath, thickenPath } from "./geometry";

/** Position colours for visual distinction. */
export const POSITION_COLORS = [
  "#e94560", "#f5a623", "#7ed321", "#4a90d9", "#9b59b6",
  "#1abc9c", "#e67e22", "#3498db", "#e74c3c", "#2ecc71",
  "#8e44ad", "#f39c12",
];

/**
 * Generate the complete disc geometry as a Paper.js Group.
 *
 * The group contains:
 * - Outer circle (cut line)
 * - Centre hole
 * - Position number labels on the rim
 * - Reference mark (notch at 12 o'clock)
 * - All cutout slots (one sub-group per position)
 */
export function generateDisc(
  segments: SegmentInfo[],
  params: GeneratorParams,
  scaleFactor: number
): paper.Group {
  const N = params.numPositions;
  const discRadius = (params.discDiameterMm / 2) * scaleFactor;
  const slotW = params.slotWidthMm * scaleFactor;
  const centreHoleRadius = 2 * scaleFactor; // 2mm pivot hole
  const sectorAngle = (2 * Math.PI) / N;
  const rimRadius = discRadius * 0.92;
  const labelRadius = discRadius * 0.95;

  const group = new paper.Group({ insert: false });

  // 1. Outer circle
  const outerCircle = new paper.Path.Circle({
    center: new paper.Point(0, 0),
    radius: discRadius,
    strokeColor: new paper.Color("#cc0000"),
    strokeWidth: 1,
    fillColor: new paper.Color("#f8f8f0"),
    insert: false,
  });
  group.addChild(outerCircle);

  // 2. Centre hole
  const centreHole = new paper.Path.Circle({
    center: new paper.Point(0, 0),
    radius: centreHoleRadius,
    strokeColor: new paper.Color("#cc0000"),
    strokeWidth: 1,
    fillColor: new paper.Color("#111"),
    insert: false,
  });
  group.addChild(centreHole);

  // 3. Reference mark (small triangle at 12 o'clock on the rim)
  const refMark = new paper.Path({
    segments: [
      new paper.Point(-3 * scaleFactor, -discRadius + 1 * scaleFactor),
      new paper.Point(0, -discRadius - 2 * scaleFactor),
      new paper.Point(3 * scaleFactor, -discRadius + 1 * scaleFactor),
    ],
    closed: true,
    fillColor: new paper.Color("#cc0000"),
    insert: false,
  });
  group.addChild(refMark);

  // 4. Position number labels
  for (let k = 0; k < N; k++) {
    const angle = -Math.PI / 2 + k * sectorAngle; // Start at 12 o'clock
    const x = labelRadius * Math.cos(angle);
    const y = labelRadius * Math.sin(angle);

    const label = new paper.PointText({
      point: new paper.Point(x, y + 2.5 * scaleFactor),
      content: String(k + 1),
      fontSize: 5 * scaleFactor,
      fontWeight: "bold",
      fillColor: new paper.Color("#333"),
      justification: "center",
      insert: false,
    });
    group.addChild(label);

    // Small tick mark
    const tickInner = rimRadius - 2 * scaleFactor;
    const tickOuter = rimRadius + 1 * scaleFactor;
    const tick = new paper.Path.Line({
      from: new paper.Point(
        tickInner * Math.cos(angle),
        tickInner * Math.sin(angle)
      ),
      to: new paper.Point(
        tickOuter * Math.cos(angle),
        tickOuter * Math.sin(angle)
      ),
      strokeColor: new paper.Color("#666"),
      strokeWidth: 0.5,
      insert: false,
    });
    group.addChild(tick);
  }

  // 5. Sector divider lines (faint, for visual reference)
  for (let k = 0; k < N; k++) {
    const angle = -Math.PI / 2 + k * sectorAngle + sectorAngle / 2;
    const line = new paper.Path.Line({
      from: new paper.Point(0, 0),
      to: new paper.Point(
        rimRadius * 0.85 * Math.cos(angle),
        rimRadius * 0.85 * Math.sin(angle)
      ),
      strokeColor: new paper.Color(0, 0, 0, 0.08),
      strokeWidth: 0.5,
      dashArray: [2 * scaleFactor, 2 * scaleFactor],
      insert: false,
    });
    group.addChild(line);
  }

  // 6. Cutout slots
  for (let k = 0; k < N; k++) {
    const posSegs = segments.filter((s) => s.positionIndex === k);
    const slotGroup = new paper.Group({ insert: false });

    for (const seg of posSegs) {
      // Rotate the segment back into disc frame: rotate by -θ_k
      const discAngle = -k * sectorAngle;
      const discPath = rotatePath(seg.path, discAngle);

      // Thicken into a slot
      const slot = thickenPath(discPath, slotW);
      slot.fillColor = new paper.Color("#222");
      slot.strokeColor = new paper.Color("#cc0000");
      slot.strokeWidth = 0.3;
      slotGroup.addChild(slot);

      discPath.remove();
    }

    group.addChild(slotGroup);
  }

  return group;
}

/**
 * Generate the paper template (reference mark + guide circle).
 */
export function generatePaperTemplate(
  params: GeneratorParams,
  scaleFactor: number
): paper.Group {
  const discRadius = (params.discDiameterMm / 2) * scaleFactor;
  const group = new paper.Group({ insert: false });

  // Guide circle showing disc placement
  const guide = new paper.Path.Circle({
    center: new paper.Point(0, 0),
    radius: discRadius,
    strokeColor: new paper.Color(0, 0, 0, 0.3),
    strokeWidth: 0.5,
    dashArray: [4, 4],
    insert: false,
  });
  group.addChild(guide);

  // Centre mark (crosshair)
  const cross1 = new paper.Path.Line({
    from: new paper.Point(-5 * scaleFactor, 0),
    to: new paper.Point(5 * scaleFactor, 0),
    strokeColor: new paper.Color("#333"),
    strokeWidth: 0.5,
    insert: false,
  });
  const cross2 = new paper.Path.Line({
    from: new paper.Point(0, -5 * scaleFactor),
    to: new paper.Point(0, 5 * scaleFactor),
    strokeColor: new paper.Color("#333"),
    strokeWidth: 0.5,
    insert: false,
  });
  group.addChild(cross1);
  group.addChild(cross2);

  // Reference mark at 12 o'clock
  const ref = new paper.Path.Circle({
    center: new paper.Point(0, -discRadius),
    radius: 2 * scaleFactor,
    fillColor: new paper.Color("#cc0000"),
    insert: false,
  });
  group.addChild(ref);

  // "START" label
  const startLabel = new paper.PointText({
    point: new paper.Point(6 * scaleFactor, -discRadius + 2 * scaleFactor),
    content: "START ●",
    fontSize: 4 * scaleFactor,
    fillColor: new paper.Color("#cc0000"),
    insert: false,
  });
  group.addChild(startLabel);

  return group;
}

/**
 * Render a coloured partition overlay showing which segments belong to which position.
 */
export function renderPartitionOverlay(
  segments: SegmentInfo[],
  params: GeneratorParams,
  scaleFactor: number
): paper.Group {
  const N = params.numPositions;
  const discRadius = (params.discDiameterMm / 2) * scaleFactor;
  const group = new paper.Group({ insert: false });

  // Faint disc boundary
  const disc = new paper.Path.Circle({
    center: new paper.Point(0, 0),
    radius: discRadius,
    strokeColor: new paper.Color(1, 1, 1, 0.2),
    strokeWidth: 1,
    dashArray: [4, 4],
    insert: false,
  });
  group.addChild(disc);

  // Draw sector boundaries (for angular strategy visual reference)
  const sectorAngle = (2 * Math.PI) / N;
  for (let k = 0; k < N; k++) {
    const angle = k * sectorAngle;
    const line = new paper.Path.Line({
      from: new paper.Point(0, 0),
      to: new paper.Point(
        discRadius * Math.cos(angle),
        discRadius * Math.sin(angle)
      ),
      strokeColor: new paper.Color(1, 1, 1, 0.1),
      strokeWidth: 0.5,
      insert: false,
    });
    group.addChild(line);
  }

  // Draw each segment coloured by position
  for (const seg of segments) {
    const colorStr = POSITION_COLORS[seg.positionIndex % POSITION_COLORS.length];
    const display = seg.path.clone({ insert: false }) as paper.Path;
    display.strokeColor = new paper.Color(colorStr);
    display.strokeWidth = 2;
    display.strokeCap = "round";
    group.addChild(display);
  }

  // Legend
  for (let k = 0; k < N; k++) {
    const y = -discRadius - 15 * scaleFactor + k * 8 * scaleFactor;
    const x = discRadius + 10 * scaleFactor;
    const swatch = new paper.Path.Circle({
      center: new paper.Point(x, y),
      radius: 3 * scaleFactor,
      fillColor: new paper.Color(POSITION_COLORS[k % POSITION_COLORS.length]),
      insert: false,
    });
    group.addChild(swatch);

    const label = new paper.PointText({
      point: new paper.Point(x + 6 * scaleFactor, y + 2 * scaleFactor),
      content: `Position ${k + 1}`,
      fontSize: 4 * scaleFactor,
      fillColor: new paper.Color("#ccc"),
      insert: false,
    });
    group.addChild(label);
  }

  return group;
}
