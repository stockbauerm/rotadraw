import paper from "paper";
import {
  SegmentInfo,
  GeneratorParams,
  ValidationResult,
  ValidationMessage,
} from "./types";
import { rotatePath, thickenPath, pathsOverlap, minPathDistance } from "./geometry";

/**
 * Run all validation checks on the partitioned segments.
 */
export function validatePartition(
  segments: SegmentInfo[],
  params: GeneratorParams,
  scaleFactor: number
): ValidationResult {
  const messages: ValidationMessage[] = [];
  const N = params.numPositions;
  const slotW = params.slotWidthMm * scaleFactor;
  const bridgeW = params.minBridgeWidthMm * scaleFactor;
  const discRadius = (params.discDiameterMm / 2) * scaleFactor;
  const usableRadius = discRadius * 0.85;
  const innerRadius = discRadius * 0.05;

  // 1. Check segment distribution balance
  const counts = new Array(N).fill(0);
  for (const seg of segments) {
    counts[seg.positionIndex]++;
  }
  const maxCount = Math.max(...counts);
  const minCount = Math.min(...counts);
  if (minCount === 0) {
    messages.push({
      level: "warn",
      text: `Position ${counts.indexOf(0) + 1} has no segments assigned. Consider adjusting partitioning.`,
    });
  } else if (maxCount > minCount * 3) {
    messages.push({
      level: "warn",
      text: `Uneven distribution: position sizes range from ${minCount} to ${maxCount} segments.`,
    });
  } else {
    messages.push({
      level: "ok",
      text: `Segment distribution is balanced (${minCount}–${maxCount} per position).`,
    });
  }

  // 2. Fit check — verify all segments fit within usable radius
  let fitOk = true;
  for (const seg of segments) {
    const b = seg.path.bounds;
    const corners = [
      new paper.Point(b.left, b.top),
      new paper.Point(b.right, b.top),
      new paper.Point(b.left, b.bottom),
      new paper.Point(b.right, b.bottom),
    ];
    for (const c of corners) {
      const dist = Math.sqrt(c.x * c.x + c.y * c.y);
      if (dist > usableRadius) {
        fitOk = false;
        break;
      }
      if (dist < innerRadius) {
        fitOk = false;
        break;
      }
    }
    if (!fitOk) break;
  }

  if (fitOk) {
    messages.push({ level: "ok", text: "All segments fit within usable disc area." });
  } else {
    messages.push({
      level: "warn",
      text: "Some segments extend beyond usable area or into pivot zone. Image will be clipped.",
    });
  }

  // 3. Non-interference check (sampling-based for performance)
  const sectorAngle = (2 * Math.PI) / N;
  let interferenceCount = 0;

  // Build thickened slot outlines per position
  const slotsByPosition: paper.Path[][] = [];
  for (let k = 0; k < N; k++) {
    const posSegs = segments.filter((s) => s.positionIndex === k);
    const slots = posSegs.map((s) => thickenPath(s.path, slotW));
    slotsByPosition.push(slots);
  }

  // Check pairs of positions
  for (let j = 0; j < N && interferenceCount < 5; j++) {
    for (let k = j + 1; k < N && interferenceCount < 5; k++) {
      const deltaAngle = (j - k) * sectorAngle;

      // Rotate position k's slots to position j's angle
      for (const slotK of slotsByPosition[k]) {
        const rotated = rotatePath(slotK, deltaAngle);

        for (const slotJ of slotsByPosition[j]) {
          if (pathsOverlap(rotated, slotJ)) {
            interferenceCount++;
            if (interferenceCount === 1) {
              messages.push({
                level: "warn",
                text: `Slot interference detected between positions ${j + 1} and ${k + 1}. Ghost lines may appear.`,
              });
            }
            break;
          }
        }
        rotated.remove();
        if (interferenceCount >= 5) break;
      }
    }
  }

  if (interferenceCount === 0) {
    messages.push({ level: "ok", text: "No slot interference detected between positions." });
  } else if (interferenceCount > 1) {
    messages.push({
      level: "warn",
      text: `${interferenceCount} total interference zones found. Consider increasing N or adjusting partitioning.`,
    });
  }

  // 4. Bridge width check (sampling-based)
  let minBridge = Infinity;
  const allSlots = slotsByPosition.flat();

  // Sample pairs for bridge width (limit checks for performance)
  const maxChecks = 200;
  let checks = 0;
  for (let i = 0; i < allSlots.length && checks < maxChecks; i++) {
    for (let j = i + 1; j < allSlots.length && checks < maxChecks; j++) {
      // Quick bounds check
      const dist = allSlots[i].bounds.center.getDistance(allSlots[j].bounds.center);
      const maxDim = Math.max(
        allSlots[i].bounds.width + allSlots[j].bounds.width,
        allSlots[i].bounds.height + allSlots[j].bounds.height
      );
      if (dist > maxDim) continue;

      const d = minPathDistance(allSlots[i], allSlots[j]);
      if (d < minBridge) minBridge = d;
      checks++;
    }
  }

  if (minBridge === Infinity) {
    messages.push({ level: "ok", text: "No adjacent slots to check bridge width." });
  } else if (minBridge >= bridgeW) {
    messages.push({
      level: "ok",
      text: `Minimum bridge width: ${(minBridge / scaleFactor).toFixed(1)}mm (≥ ${params.minBridgeWidthMm}mm threshold).`,
    });
  } else {
    messages.push({
      level: "warn",
      text: `Minimum bridge width: ${(minBridge / scaleFactor).toFixed(1)}mm — below ${params.minBridgeWidthMm}mm threshold. Disc may be fragile.`,
    });
  }

  // Clean up thickened slots
  for (const slots of slotsByPosition) {
    for (const s of slots) s.remove();
  }

  const ok =
    messages.every((m) => m.level !== "error") &&
    messages.filter((m) => m.level === "warn").length <= 2;

  return { ok, messages };
}
