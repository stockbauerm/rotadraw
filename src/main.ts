import paper from "paper";
import { GeneratorParams, SegmentInfo, ViewMode } from "./types";
import { importSVG } from "./svg-import";
import { partitionSegments } from "./partitioning";
import { validatePartition } from "./validation";
import {
  generateDisc,
  renderPartitionOverlay,
  generatePaperTemplate,
  POSITION_COLORS,
} from "./disc-generator";
import { RevealAnimation } from "./animation";
import { SAMPLE_STAR, SAMPLE_CAT, SAMPLE_FLOWER } from "./samples";

// ── State ──────────────────────────────────────────────

let segments: SegmentInfo[] = [];
let originalGroup: paper.Group | null = null;
let currentView: ViewMode = "input";
let discGroup: paper.Group | null = null;
let partitionGroup: paper.Group | null = null;
let animation: RevealAnimation | null = null;

// Scale factor: Paper.js units per mm (at default zoom)
const SCALE = 2;

function getParams(): GeneratorParams {
  return {
    numPositions: parseInt(el<HTMLInputElement>("num-positions").value),
    discDiameterMm: parseInt(el<HTMLInputElement>("disc-diameter").value),
    slotWidthMm: parseFloat(el<HTMLInputElement>("slot-width").value),
    minBridgeWidthMm: parseFloat(el<HTMLInputElement>("min-bridge").value),
    strategy: (
      document.querySelector(
        'input[name="strategy"]:checked'
      ) as HTMLInputElement
    ).value as GeneratorParams["strategy"],
    rotationOffsetDeg: parseInt(
      el<HTMLInputElement>("rotation-offset").value
    ),
  };
}

function el<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

// ── Initialise Paper.js ────────────────────────────────

const canvas = el<HTMLCanvasElement>("main-canvas");
paper.setup(canvas);

// Set up dark background
paper.project.activeLayer.name = "main";

function centreView() {
  paper.view.center = new paper.Point(0, 0);
  const params = getParams();
  const discRadius = (params.discDiameterMm / 2) * SCALE;
  // Zoom to fit disc with some margin
  const viewSize = paper.view.size;
  const fitZoom = Math.min(
    viewSize.width / (discRadius * 2.8),
    viewSize.height / (discRadius * 2.8)
  );
  paper.view.zoom = fitZoom;
}

centreView();

// ── SVG Loading ────────────────────────────────────────

function loadSVG(svgString: string) {
  const params = getParams();
  const fitRadius = (params.discDiameterMm / 2) * SCALE * 0.85;
  const maxSegLen = fitRadius * 0.3; // segments ≈ 30% of radius max

  try {
    clearAll();
    const result = importSVG(svgString, fitRadius, maxSegLen);
    segments = result.segments;
    originalGroup = result.originalGroup;

    setStatus(`Loaded ${segments.length} segments. Click "Generate Disc" to proceed.`);
    el<HTMLButtonElement>("btn-generate").disabled = false;

    showView("input");
  } catch (err: any) {
    setStatus(`Error: ${err.message}`);
  }
}

// File input
el<HTMLInputElement>("svg-input").addEventListener("change", (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => loadSVG(reader.result as string);
  reader.readAsText(file);
});

// Drag and drop
const uploadArea = el("upload-area");
uploadArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadArea.style.borderColor = "#e94560";
});
uploadArea.addEventListener("dragleave", () => {
  uploadArea.style.borderColor = "";
});
uploadArea.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadArea.style.borderColor = "";
  const file = e.dataTransfer?.files[0];
  if (file && file.name.endsWith(".svg")) {
    const reader = new FileReader();
    reader.onload = () => loadSVG(reader.result as string);
    reader.readAsText(file);
  }
});

// Sample buttons
el("load-sample-star").addEventListener("click", () => loadSVG(SAMPLE_STAR));
el("load-sample-cat").addEventListener("click", () => loadSVG(SAMPLE_CAT));
el("load-sample-flower").addEventListener("click", () => loadSVG(SAMPLE_FLOWER));

// ── Generation ─────────────────────────────────────────

el("btn-generate").addEventListener("click", () => {
  if (segments.length === 0) return;

  const params = getParams();
  const offsetRad = (params.rotationOffsetDeg * Math.PI) / 180;

  // Partition
  partitionSegments(segments, params.numPositions, params.strategy, offsetRad);

  // Validate
  const validation = validatePartition(segments, params, SCALE);
  showValidation(validation.messages);

  // Generate disc
  if (discGroup) {
    discGroup.remove();
    discGroup = null;
  }
  discGroup = generateDisc(segments, params, SCALE);

  // Generate partition overlay
  if (partitionGroup) {
    partitionGroup.remove();
    partitionGroup = null;
  }
  partitionGroup = renderPartitionOverlay(segments, params, SCALE);

  // Enable buttons
  el<HTMLButtonElement>("btn-animate").disabled = false;
  el<HTMLButtonElement>("btn-export").disabled = false;

  setStatus(
    `Disc generated with ${params.numPositions} positions. ` +
      `${segments.length} segments distributed.`
  );

  showView("partition");
});

// ── Animation ──────────────────────────────────────────

el("btn-animate").addEventListener("click", () => {
  if (segments.length === 0) return;

  const params = getParams();

  if (animation) {
    animation.stop();
  }
  animation = new RevealAnimation(segments, params, SCALE);

  showView("animation");

  // Small delay to allow view to switch
  setTimeout(() => {
    animation!.start(
      (pos) => {
        setStatus(
          `Revealing position ${pos + 1} of ${params.numPositions}...`
        );
      },
      () => {
        setStatus("Reveal complete! Removing disc...");
        setTimeout(() => {
          animation!.showFinal();
          renderActiveView();
          setStatus("Done — the complete drawing is revealed.");
        }, 800);
      }
    );
  }, 100);
});

// ── Export ──────────────────────────────────────────────

el("btn-export").addEventListener("click", () => {
  if (!discGroup) return;

  const params = getParams();

  // Create a temporary project for clean SVG export
  const exportGroup = discGroup.clone({ insert: false }) as paper.Group;

  // Add to active layer temporarily for export
  paper.project.activeLayer.addChild(exportGroup);

  const svg = exportGroup.exportSVG({ asString: true }) as string;

  exportGroup.remove();

  // Add SVG header with correct dimensions
  const discDiamPx = params.discDiameterMm * SCALE;
  const fullSvg = svg
    .replace(
      "<svg ",
      `<svg xmlns="http://www.w3.org/2000/svg" width="${params.discDiameterMm}mm" height="${params.discDiameterMm}mm" viewBox="${-discDiamPx / 2} ${-discDiamPx / 2} ${discDiamPx} ${discDiamPx}" `
    );

  // Download
  const blob = new Blob([fullSvg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "rotadraw-disc.svg";
  a.click();
  URL.revokeObjectURL(url);

  setStatus("Disc SVG exported.");
});

// ── View Management ────────────────────────────────────

function showView(view: ViewMode) {
  currentView = view;

  // Update tab buttons
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle(
      "active",
      (tab as HTMLElement).dataset.view === view
    );
  });

  renderActiveView();
}

function renderActiveView() {
  paper.project.activeLayer.removeChildren();
  centreView();

  switch (currentView) {
    case "input":
      renderInputView();
      break;
    case "partition":
      renderPartitionView();
      break;
    case "disc":
      renderDiscView();
      break;
    case "animation":
      renderAnimationView();
      break;
  }
}

function renderInputView() {
  if (!originalGroup) {
    // Show placeholder text
    const text = new paper.PointText({
      point: new paper.Point(0, 0),
      content: "Upload an SVG to begin",
      fontSize: 14,
      fillColor: new paper.Color("#666"),
      justification: "center",
    });
    return;
  }

  // Show the original drawing
  const display = originalGroup.clone() as paper.Group;
  paper.project.activeLayer.addChild(display);

  // Show disc boundary for reference
  const params = getParams();
  const discRadius = (params.discDiameterMm / 2) * SCALE;
  const guide = new paper.Path.Circle({
    center: new paper.Point(0, 0),
    radius: discRadius,
    strokeColor: new paper.Color(1, 1, 1, 0.15),
    strokeWidth: 1,
    dashArray: [4, 4],
  });
}

function renderPartitionView() {
  if (!partitionGroup) {
    renderInputView();
    return;
  }

  const display = partitionGroup.clone() as paper.Group;
  paper.project.activeLayer.addChild(display);
}

function renderDiscView() {
  if (!discGroup) {
    renderInputView();
    return;
  }

  const display = discGroup.clone() as paper.Group;
  paper.project.activeLayer.addChild(display);
}

function renderAnimationView() {
  if (!animation) {
    renderInputView();
    return;
  }

  const display = animation.getGroup().clone() as paper.Group;
  paper.project.activeLayer.addChild(display);
}

// Tab click handlers
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    const view = (tab as HTMLElement).dataset.view as ViewMode;
    if (view) showView(view);
  });
});

// ── Parameter Controls ─────────────────────────────────

function setupSlider(id: string, valId: string, suffix: string = "") {
  const slider = el<HTMLInputElement>(id);
  const valSpan = el(valId);
  slider.addEventListener("input", () => {
    valSpan.textContent = slider.value + suffix;
  });
}

setupSlider("num-positions", "num-positions-val");
setupSlider("disc-diameter", "disc-diameter-val");
setupSlider("slot-width", "slot-width-val");
setupSlider("min-bridge", "min-bridge-val");
setupSlider("rotation-offset", "rotation-offset-val", "\u00B0");

// Material preset
el<HTMLSelectElement>("material-preset").addEventListener("change", (e) => {
  const preset = (e.target as HTMLSelectElement).value;
  const slotSlider = el<HTMLInputElement>("slot-width");
  const bridgeSlider = el<HTMLInputElement>("min-bridge");

  const presets: Record<string, [number, number]> = {
    cardboard: [3, 3],
    plastic: [1.5, 1.5],
    "3dprint": [2, 2],
    paper: [5, 5],
  };

  if (presets[preset]) {
    const [slot, bridge] = presets[preset];
    slotSlider.value = String(slot);
    bridgeSlider.value = String(bridge);
    el("slot-width-val").textContent = String(slot);
    el("min-bridge-val").textContent = String(bridge);
  }
});

// ── Validation Display ─────────────────────────────────

function showValidation(
  messages: { level: "ok" | "warn" | "error"; text: string }[]
) {
  const panel = el("validation-panel");
  const list = el("validation-messages");
  panel.style.display = "block";
  list.innerHTML = "";

  for (const msg of messages) {
    const li = document.createElement("li");
    li.className = msg.level;
    const icon = msg.level === "ok" ? "\u2713" : msg.level === "warn" ? "\u26A0" : "\u2717";
    li.textContent = `${icon} ${msg.text}`;
    list.appendChild(li);
  }
}

// ── Utilities ──────────────────────────────────────────

function clearAll() {
  paper.project.activeLayer.removeChildren();
  segments = [];
  if (originalGroup) {
    originalGroup.remove();
    originalGroup = null;
  }
  if (discGroup) {
    discGroup.remove();
    discGroup = null;
  }
  if (partitionGroup) {
    partitionGroup.remove();
    partitionGroup = null;
  }
  if (animation) {
    animation.stop();
    animation = null;
  }
  el<HTMLButtonElement>("btn-generate").disabled = true;
  el<HTMLButtonElement>("btn-animate").disabled = true;
  el<HTMLButtonElement>("btn-export").disabled = true;
  el("validation-panel").style.display = "none";
}

function setStatus(msg: string) {
  el("status-bar").textContent = msg;
}

// ── Resize handling ────────────────────────────────────

window.addEventListener("resize", () => {
  centreView();
});

// ── Canvas interaction (pan & zoom) ────────────────────

let isPanning = false;
let panStart: paper.Point | null = null;

canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  const newZoom = paper.view.zoom * delta;
  if (newZoom > 0.1 && newZoom < 50) {
    paper.view.zoom = newZoom;
  }
});

canvas.addEventListener("mousedown", (e) => {
  if (e.button === 1 || (e.button === 0 && e.altKey)) {
    isPanning = true;
    panStart = new paper.Point(e.clientX, e.clientY);
    canvas.style.cursor = "grabbing";
  }
});

canvas.addEventListener("mousemove", (e) => {
  if (isPanning && panStart) {
    const current = new paper.Point(e.clientX, e.clientY);
    const delta = current.subtract(panStart).divide(paper.view.zoom);
    paper.view.center = paper.view.center.subtract(delta);
    panStart = current;
  }
});

canvas.addEventListener("mouseup", () => {
  isPanning = false;
  panStart = null;
  canvas.style.cursor = "";
});

// ── Initial state ──────────────────────────────────────

setStatus("Ready — upload an SVG or load a sample drawing to begin");
