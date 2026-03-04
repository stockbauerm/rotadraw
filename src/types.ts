export interface Point {
  x: number;
  y: number;
}

export type PartitionStrategy = "angular" | "stripe" | "balanced";

export interface GeneratorParams {
  numPositions: number;
  discDiameterMm: number;
  slotWidthMm: number;
  minBridgeWidthMm: number;
  strategy: PartitionStrategy;
  rotationOffsetDeg: number;
}

export interface SegmentInfo {
  /** Index into the flattened path segments array */
  index: number;
  /** The Paper.js Path item for this segment */
  path: paper.Path;
  /** Angular midpoint in radians relative to disc centre */
  angleMid: number;
  /** Radial midpoint distance from disc centre */
  radiusMid: number;
  /** Assigned position (0-based) */
  positionIndex: number;
}

export interface ValidationResult {
  ok: boolean;
  messages: ValidationMessage[];
}

export interface ValidationMessage {
  level: "ok" | "warn" | "error";
  text: string;
}

export type ViewMode = "input" | "partition" | "disc" | "animation";
