import paper from "paper";
import { SegmentInfo, GeneratorParams } from "./types";
import { POSITION_COLORS } from "./disc-generator";

/**
 * Manages the reveal animation — progressively shows segments
 * position by position, simulating the rotadraw experience.
 */
export class RevealAnimation {
  private segments: SegmentInfo[];
  private params: GeneratorParams;
  private scaleFactor: number;
  private currentPosition: number = -1;
  private displayedItems: paper.Item[] = [];
  private discOverlay: paper.Item | null = null;
  private animGroup: paper.Group;
  private isRunning: boolean = false;
  private timer: number | null = null;
  private onComplete: (() => void) | null = null;
  private onStep: ((position: number) => void) | null = null;

  constructor(
    segments: SegmentInfo[],
    params: GeneratorParams,
    scaleFactor: number
  ) {
    this.segments = segments;
    this.params = params;
    this.scaleFactor = scaleFactor;
    this.animGroup = new paper.Group({ insert: false });
  }

  getGroup(): paper.Group {
    return this.animGroup;
  }

  start(
    onStep?: (position: number) => void,
    onComplete?: () => void
  ): void {
    this.onStep = onStep || null;
    this.onComplete = onComplete || null;
    this.currentPosition = -1;
    this.isRunning = true;

    // Clear previous display
    this.animGroup.removeChildren();
    this.displayedItems = [];

    // Add faint disc circle
    const discRadius = (this.params.discDiameterMm / 2) * this.scaleFactor;
    const disc = new paper.Path.Circle({
      center: new paper.Point(0, 0),
      radius: discRadius,
      strokeColor: new paper.Color(1, 1, 1, 0.15),
      strokeWidth: 1,
      dashArray: [4, 4],
      insert: false,
    });
    this.animGroup.addChild(disc);

    // Add paper background
    const paper_bg = new paper.Path.Circle({
      center: new paper.Point(0, 0),
      radius: discRadius,
      fillColor: new paper.Color("#1a1a1a"),
      insert: false,
    });
    this.animGroup.insertChild(0, paper_bg);

    this.stepNext();
  }

  stop(): void {
    this.isRunning = false;
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private stepNext(): void {
    if (!this.isRunning) return;

    this.currentPosition++;

    if (this.currentPosition >= this.params.numPositions) {
      // Animation complete
      this.isRunning = false;

      // Flash effect — briefly highlight all
      if (this.onComplete) this.onComplete();
      return;
    }

    // Draw segments for this position
    const posSegs = this.segments.filter(
      (s) => s.positionIndex === this.currentPosition
    );

    const color = POSITION_COLORS[this.currentPosition % POSITION_COLORS.length];

    for (const seg of posSegs) {
      const display = seg.path.clone({ insert: false }) as paper.Path;
      display.strokeColor = new paper.Color(color);
      display.strokeWidth = 2.5;
      display.strokeCap = "round";
      // Fade-in effect: start slightly transparent
      display.opacity = 0.7;
      this.animGroup.addChild(display);
      this.displayedItems.push(display);
    }

    // Fade previous positions to white
    for (const item of this.displayedItems) {
      if (
        item instanceof paper.Path &&
        !posSegs.some((s) => {
          // Check if this item is from the current position (by color)
          return (
            item.strokeColor?.toCSS(true) === color
          );
        })
      ) {
        // Transition older strokes to white
        item.strokeColor = new paper.Color("#ddd");
        item.opacity = 1;
      }
    }

    // Notify step
    if (this.onStep) this.onStep(this.currentPosition);

    // Schedule next step
    this.timer = window.setTimeout(() => {
      this.stepNext();
    }, 1200);
  }

  /**
   * Show the final result — all segments in white.
   */
  showFinal(): void {
    this.stop();
    this.animGroup.removeChildren();

    const discRadius = (this.params.discDiameterMm / 2) * this.scaleFactor;
    const bg = new paper.Path.Circle({
      center: new paper.Point(0, 0),
      radius: discRadius,
      fillColor: new paper.Color("#f8f8f0"),
      insert: false,
    });
    this.animGroup.addChild(bg);

    for (const seg of this.segments) {
      const display = seg.path.clone({ insert: false }) as paper.Path;
      display.strokeColor = new paper.Color("#222");
      display.strokeWidth = 2;
      display.strokeCap = "round";
      this.animGroup.addChild(display);
    }
  }
}
