# Rotadraw Generator

A web application that transforms vector line drawings into printable/cuttable rotadraw discs. Upload an SVG, configure parameters, and export a ready-to-use rotating stencil disc.

## What is a Rotadraw?

A rotadraw is a drawing toy based on a rotating stencil disc. A circular disc with cutout slots is pinned at its centre to a sheet of paper. The disc has numbered positions around its rim (typically 6–12). The user rotates the disc to each position in sequence and traces the visible cutout. After all positions are completed, the disc is lifted to reveal a complete image that was invisible during the process.

The clever trick: by splitting the image across multiple rotational positions, the stencil frame can interrupt any part of the drawing — a different position always covers that part instead. This solves the classic stencil problem (e.g. the island inside the letter "O").

## Features

- **SVG import** with automatic centering, scaling, and path segmentation
- **Three partitioning strategies**:
  - Angular sectors — divides the image by angle around the centre
  - Spatial stripes — divides by horizontal/vertical bands (better for asymmetric images)
  - Balanced graph — distributes segments evenly by total path length
- **Disc generation** with cutout slots, numbered position labels, centre pivot hole, and reference mark
- **Validation engine** checking non-interference between positions, minimum bridge width, fit constraints, and partition balance
- **Reveal animation** simulating the rotadraw drawing experience step-by-step
- **SVG export** of the generated disc, ready for printing or laser cutting
- **Interactive UI** with parameter controls, four view modes, pan/zoom, and real-time feedback
- **Material presets** for cardboard, laser-cut plastic, 3D print, and paper
- **Built-in sample drawings** (star, cat, flower) for quick testing

## Prerequisites

- [Node.js](https://nodejs.org/) version 18 or later
- npm (included with Node.js)

## Installation

Clone the repository:

```bash
git clone https://github.com/stockbauerm/rotadraw.git
cd rotadraw
```

Install dependencies:

```bash
npm install
```

## Usage

### Development server

Start the local development server with hot-reload:

```bash
npm run dev
```

Open the URL shown in the terminal (typically `http://localhost:5173`).

### Production build

Build an optimised bundle for deployment:

```bash
npm run build
```

The output is written to the `dist/` directory. Serve it with any static file server:

```bash
npm run preview
```

## Workflow

1. **Upload an SVG** — drag-and-drop or click the upload area. Alternatively, click one of the sample drawing buttons (Star, Cat, Flower).
2. **Adjust parameters**:
   - **Positions (N)** — number of rotational steps (3–12). More positions allow finer detail but produce a more complex disc.
   - **Disc diameter** — physical size in mm (80–300).
   - **Slot width** — width of cutout slots in mm. Wider slots are easier to trace but limit fine detail.
   - **Min bridge width** — minimum solid material between cutouts in mm. Ensures the disc doesn't fall apart.
   - **Material preset** — sets slot and bridge widths to sensible defaults for cardboard, plastic, 3D print, or paper.
3. **Choose a partitioning strategy** — angular sectors, spatial stripes, or balanced.
4. **Click "Generate Disc"** — the engine partitions the drawing, validates the result, and generates the disc geometry.
5. **Review the result** using the four view tabs:
   - **Input Drawing** — the original SVG centred on the disc area.
   - **Partition View** — colour-coded overlay showing which segments belong to which position.
   - **Disc Preview** — the physical disc with all cutout slots.
   - **Animation** — step-by-step reveal simulation.
6. **Export** — click "Export SVG" to download the disc as a vector file for printing or laser cutting.

## Canvas Controls

| Action | Input |
|--------|-------|
| Zoom in/out | Mouse scroll wheel |
| Pan | Alt + click and drag, or middle-click and drag |

## Project Structure

```
rotadraw/
├── index.html              # Application shell
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite build configuration
├── CONCEPT.md              # Detailed technical concept document
└── src/
    ├── main.ts             # Application entry point, UI wiring
    ├── types.ts            # Shared type definitions
    ├── geometry.ts         # Core math: rotation, splitting, thickening, overlap detection
    ├── svg-import.ts       # SVG parsing, normalisation, segmentation
    ├── partitioning.ts     # Angular, stripe, and balanced partitioning strategies
    ├── validation.ts       # Non-interference, bridge width, fit, and balance checks
    ├── disc-generator.ts   # Disc geometry: circle, slots, labels, reference mark
    ├── animation.ts        # Reveal animation (position-by-position)
    ├── samples.ts          # Built-in sample SVG drawings
    └── style.css           # Application styles
```

## Technology Stack

| Component | Technology |
|-----------|-----------|
| Build tool | [Vite](https://vite.dev/) |
| Language | [TypeScript](https://www.typescriptlang.org/) |
| Vector graphics engine | [Paper.js](http://paperjs.org/) — path boolean ops, offset curves, SVG I/O, canvas rendering |
| UI | Vanilla HTML/CSS (no framework) |

## Input Requirements

- **Format**: SVG files with stroke-based paths
- **Content**: Line drawings only — fills are ignored, only stroke paths are processed
- **Complexity**: Works best with drawings containing up to ~500 path segments
- **Size**: Arbitrary — the drawing is automatically scaled to fit the disc

## Tips for Best Results

- **Centred, radially distributed drawings** work best with angular sector partitioning (animals from the front, flowers, stars).
- **Asymmetric or side-profile images** benefit from spatial stripe or balanced partitioning.
- **Simplify complex drawings** before importing — fewer paths produce cleaner, sturdier discs.
- **Start with N=6** and adjust up or down based on image complexity.
- **Check the validation panel** after generating — it flags interference, thin bridges, and uneven distributions.
- For **laser cutting**, use the plastic preset (1.5mm slot/bridge) and export at 1:1 scale.
- For **hand cutting from cardboard**, use the cardboard preset (3mm) and consider N=4–6 for manageable cutouts.

## License

MIT
