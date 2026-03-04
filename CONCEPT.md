# Rotadraw Generator — Technical Concept

## 1. What Is a Rotadraw?

A **Rotadraw** is a drawing toy based on a rotating stencil disc. A circular disc with
oddly-shaped cutout slots is pinned at its centre to a sheet of paper. The disc has
numbered positions along its rim (typically 6–12). The user rotates the disc to each
numbered position in sequence and traces or fills in the visible cutout at that position.
After all positions have been completed, the disc is lifted to reveal a complete line
drawing — an animal, a vehicle, a symbol — that was invisible during the process.

### 1.1 The Core Insight

A conventional stencil must keep its frame connected, which forces gaps in the traced
image (e.g. the island inside the letter "O" must be attached to the frame by bridges).
Rotadraw solves this by splitting the image across multiple angular positions of the same
disc. No single position needs to carry the full image; the frame can interrupt any part
of the drawing as long as a *different* rotational position covers that part instead.

### 1.2 Physical Construction

| Component         | Description                                                |
|-------------------|------------------------------------------------------------|
| **Disc**          | Circular sheet (plastic, cardboard, or 3D-printed) with cutout slots and a centre pivot hole. |
| **Pivot pin**     | A pin or push-pin that goes through the disc centre into the paper, allowing rotation while preventing translation. |
| **Position marks**| Numbers (1 … N) printed along the rim of the disc, each corresponding to a fixed angular offset from a reference mark on the paper. |
| **Paper + marker**| The drawing surface and a pen or marker for tracing.        |

### 1.3 How It Works Step by Step

1. Pin the disc to the paper through the centre hole.
2. Place a reference mark on the paper at the disc rim.
3. Rotate the disc so position mark **1** aligns with the reference mark.
4. Trace the cutout slot(s) visible at position 1.
5. Rotate to position **2**, trace again.
6. Repeat for all N positions.
7. Remove the disc — the complete image is revealed.


## 2. Geometric Model

### 2.1 Coordinate System

- **Origin**: centre of the disc (= pivot point on the paper).
- **Disc frame**: a coordinate system that rotates with the disc.
- **Paper frame**: a fixed coordinate system on the paper.
- **Rotation angle for position k**: θ_k = k × (2π / N), where N is the number of
  positions and k ∈ {0, 1, …, N−1}.

When the disc is at position k, a point at disc-frame coordinates (r, φ) maps to
paper-frame coordinates (r, φ + θ_k). Equivalently, a paper-frame point (r, α) is
visible through a cutout at disc-frame location (r, α − θ_k).

### 2.2 Image-to-Disc Mapping

Let **I** be the target image, defined as a set of curves (line segments, arcs, Bezier
splines, etc.) in the paper frame, all fitting within a circle of radius R centred on
the origin.

For each curve segment **s** ∈ I, we must assign it to exactly one position k. The
corresponding cutout in the disc is the segment **s** rotated by −θ_k around the origin
(i.e. transformed back into the disc frame for that position).

The union of all cutouts, each traced at its assigned position, reconstructs I:

    I = ⋃ₖ Rotate(cutout_k, θ_k)

### 2.3 The Partitioning Problem

The central algorithmic challenge is: **partition the set of curve segments of the input
image into N groups (one per position) such that no two cutouts from different groups
overlap or structurally weaken the disc.**

Constraints:
1. **Coverage**: every part of the image must be assigned to exactly one position.
2. **Frame connectivity**: the solid (non-cutout) area of the disc must remain a single
   connected piece — the disc cannot fall apart.
3. **Minimum bridge width**: the material between any two cutouts must be at least some
   minimum width w_min, to ensure structural integrity.
4. **Non-interference**: when the cutout for position k is rotated to the angular
   position of any *other* position j ≠ k, it should not overlap with cutout j's
   location. (Otherwise the user would see misleading shapes at wrong positions.)


## 3. Algorithm Overview

The generation process can be decomposed into a pipeline of well-defined stages.

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│  1. Import   │────▸│  2. Prepare  │────▸│  3. Partition    │
│  Vector      │     │  Geometry    │     │  into Sectors    │
│  Input       │     │              │     │                  │
└──────────────┘     └──────────────┘     └──────────────────┘
                                                   │
                                                   ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│  6. Export   │◂────│  5. Generate │◂────│  4. Validate &   │
│  Final       │     │  Disc        │     │  Resolve         │
│  Output      │     │  Geometry    │     │  Conflicts       │
└──────────────┘     └──────────────┘     └──────────────────┘
```

### 3.1 Stage 1 — Import Vector Input

**Input**: a vector image file (SVG, DXF, or similar) containing a line drawing.

**Operations**:
- Parse the file into a normalised internal representation of geometric primitives:
  line segments, polylines, arcs, quadratic/cubic Bezier curves.
- Discard fills, colours, and metadata — only stroke paths matter.
- Translate the drawing so its bounding-box centre coincides with the origin.
- Scale uniformly so the drawing fits within a usable disc radius R_usable < R_disc
  (leaving a rim for position numbers and structural frame).

### 3.2 Stage 2 — Prepare Geometry

**Goal**: convert the imported paths into a form suitable for partitioning.

**Operations**:

1. **Flatten curves** (optional, configurable): approximate all curves as polylines
   with a configurable chord tolerance ε. This simplifies downstream geometry but is
   not strictly required if the engine supports curved primitives natively.

2. **Segment splitting**: break long path segments into shorter sub-segments. Each
   sub-segment should be short enough to be assigned independently to a position.
   The maximum sub-segment arc length L_max is a user-tunable parameter — shorter
   segments give finer partitioning control but increase complexity.

3. **Convert to polar representation**: for each sub-segment, compute its angular
   span [α_min, α_max] and radial span [r_min, r_max] relative to the origin.
   This representation is essential for the sector-based partitioning in Stage 3.

4. **Thicken strokes**: since physical cutouts have finite width, expand each
   zero-width curve into a narrow slot of width w_slot (user-configurable, e.g.
   2–4 mm). This is done by offsetting the curve on both sides by w_slot/2 and
   connecting the endpoints to form a closed slot outline.

### 3.3 Stage 3 — Partition into Sectors

This is the core of the algorithm. The image segments must be distributed across the N
rotational positions.

#### 3.3.1 Default Strategy — Angular Sector Assignment

The simplest and most intuitive approach:

1. Divide the full 2π angular range into N equal sectors:
   Sector k spans [ k×2π/N , (k+1)×2π/N ).

2. Assign each sub-segment to the sector that contains its angular midpoint.

3. Segments that straddle a sector boundary are split at the boundary and the parts
   assigned to their respective sectors.

This works well for images whose strokes are fairly evenly distributed around the
centre — which is common for radially balanced subjects (animals viewed from the front,
flowers, symmetrical objects).

#### 3.3.2 Alternative Strategy — Spatial Stripe Assignment

For images that are heavily concentrated in one angular region (e.g. a side profile),
angular sectors may produce very uneven partitions. An alternative:

1. Divide the bounding box into N horizontal (or vertical) stripes.
2. Assign each sub-segment to the stripe that contains its midpoint.
3. Split straddling segments at stripe boundaries.

The stripe direction can be chosen to maximise balance (the direction along which the
image's extent is greatest).

#### 3.3.3 Alternative Strategy — Graph-Based Balanced Assignment

For maximum flexibility and user control:

1. Build a graph where each sub-segment is a node.
2. Add edges between sub-segments that are spatially adjacent (within some proximity
   threshold).
3. Use a balanced graph partitioning algorithm (e.g. recursive bisection, spectral
   partitioning, or a simple greedy balancer) to split the graph into N groups of
   roughly equal total arc length.
4. Constraint: segments in the same connected stroke are preferably kept together
   or split at natural breakpoints (corners, endpoints) to produce clean cutouts.

#### 3.3.4 User Influence on Partitioning

The application should expose the following controls to the user:

| Parameter             | Effect                                                      |
|-----------------------|-------------------------------------------------------------|
| **Number of positions (N)** | Fewer positions → larger, simpler cutouts. More positions → finer detail, but more rotation steps and a more complex disc. Typical range: 4–12. |
| **Partitioning strategy** | Angular sectors, spatial stripes, or graph-based (see above). |
| **Manual sector boundaries** | Let the user drag angular sector boundaries or stripe boundaries in a visual editor to adjust how the image is split. |
| **Manual segment reassignment** | Let the user click individual curve segments and move them to a different position group, with real-time validation. |
| **Minimum bridge width (w_min)** | Controls how much material is left between cutouts. Larger values = sturdier disc, but may require repartitioning if segments are too close. |
| **Slot width (w_slot)** | Width of the cutout slots. Wider = easier to trace, but limits fine detail. |
| **Preview** | Show a simulated "tracing" animation: step through positions 1…N, progressively drawing the assigned segments, so the user sees the reveal effect. |

### 3.4 Stage 4 — Validate and Resolve Conflicts

After partitioning, the disc geometry must be validated.

#### 3.4.1 Non-Interference Check

For each pair of positions (j, k) where j ≠ k:
- Take the cutout set for position k.
- Rotate it by (θ_j − θ_k) to see where it would appear when the disc is at position j.
- Check that it does not overlap with the cutout set for position j.

If overlaps are found, the conflicting segments must be reassigned or the user must be
warned that the image will have ghost lines at certain positions.

**Resolution strategies**:
- Shrink the overlapping cutout slightly (trim the ends).
- Move the segment to a different position.
- Increase N to spread segments more thinly.

#### 3.4.2 Structural Integrity Check

- Compute the disc solid region: start with a full circle of radius R_disc, then
  subtract all cutout slot polygons (for all positions simultaneously, since all
  cutouts exist on the same disc).
- Verify that the remaining solid region is a single connected component.
- Verify that the minimum width of any "bridge" (narrow strip of material between
  cutouts) is ≥ w_min.

If the disc would fall apart or bridges are too thin:
- Merge nearby cutouts that belong to the same position into a single cutout
  (reduces bridge pressure).
- Add small connecting bridges through cutouts (the user will have to draw tiny
  extra lines, but the disc stays intact).
- Suggest increasing w_min or reducing detail.

#### 3.4.3 Fit Check

- Verify that no cutout extends beyond R_usable or inside a minimum inner radius
  R_inner (the area around the pivot hole must remain solid).
- Verify that the position number labels on the rim do not collide with cutouts.

### 3.5 Stage 5 — Generate Disc Geometry

Compose the final disc as a single vector drawing:

1. **Outer circle**: radius R_disc.
2. **Centre hole**: small circle at the origin (radius ~ 1–2 mm for the pivot pin).
3. **Position marks**: N numbered labels evenly spaced around the rim, outside R_usable.
4. **Cutout slots**: for each position k, take the assigned image segments, rotate them
   by −θ_k, and thicken them into slot polygons. These are drawn as closed paths
   (to be cut out).
5. **Reference mark**: a notch or arrow at the rim at angle 0 (the alignment point on
   the paper).
6. **Registration guide** (optional): a separate small template showing where to place
   the reference mark on the paper.

### 3.6 Stage 6 — Export Final Output

**Output**: a vector file (SVG, DXF, PDF) containing:

- The disc with all cutouts, ready for printing or laser cutting.
- Cut lines vs. score/fold lines differentiated by colour or layer:
  - **Cut lines** (e.g. red): outer circle, centre hole, cutout slot outlines.
  - **Annotation lines** (e.g. blue): position numbers, reference mark.
- Optionally: a separate "paper template" page with the reference mark and
  instructions.

The output should be to scale (1:1) with configurable disc diameter (e.g. 100–300 mm).


## 4. Detailed Algorithmic Considerations

### 4.1 Coordinate Transforms

All operations revolve around rotation about the origin:

```
Rotate(point, θ):
    x' = x·cos(θ) − y·sin(θ)
    y' = x·sin(θ) + y·cos(θ)
    return (x', y')

Rotate(segment, θ):
    Apply Rotate to every control point of the segment.
```

For Bezier curves, rotating all control points correctly rotates the curve (rotation
is an affine transformation).

### 4.2 Cutout Slot Construction (Stroke Thickening)

Given a path P (a polyline or Bezier curve) and a slot width w:

1. Compute the **offset curves** P_left and P_right at distance w/2 on each side.
   - For polylines: offset each segment, compute intersections at corners.
   - For Bezier curves: approximate the offset curve (exact Bezier offsets are not
     Bezier curves; use degree elevation or polyline approximation).
2. Connect the endpoints: join the start of P_left to the start of P_right with a
   semicircle or straight cap; similarly at the end.
3. The resulting closed polygon is the slot outline.

### 4.3 Overlap Detection (Non-Interference)

For each pair of positions (j, k):
1. Compute the relative rotation: Δθ = θ_j − θ_k.
2. For each cutout polygon C in position k's set, compute C' = Rotate(C, Δθ).
3. For each cutout polygon D in position j's set, test whether C' ∩ D ≠ ∅.
   - Use polygon intersection algorithms (Sutherland-Hodgman, Weiler-Atherton, or
     a computational geometry library).
4. If overlap area > tolerance, flag a conflict.

Since there are N positions and potentially many cutout polygons, the total number of
pair checks is O(N² × M²) where M is the average number of cutout polygons per
position. For typical N ≤ 12 and M ≤ 50, this is tractable.

### 4.4 Connectivity Check

1. Represent the disc solid region as a polygon-with-holes (the outer boundary is the
   disc circle; the holes are all cutout polygons).
2. To check connectivity, compute the arrangement of the boundary and hole edges, then
   do a flood fill or connected-component labelling on the solid cells.
3. Alternatively, use a computational geometry library's Boolean operations:
   Solid = Circle − ⋃ Cutouts, then check that Solid has exactly one connected
   component.

### 4.5 Bridge Width Estimation

The minimum bridge width is the minimum distance between any two cutout polygons (or
between a cutout and the disc boundary/centre hole):

1. For each pair of cutout polygons, compute the minimum distance between their
   boundaries.
2. This can be accelerated with a spatial index (R-tree or grid) to prune distant pairs.
3. Report any pair whose distance < w_min.


## 5. User Interaction Model

### 5.1 Workflow

```
 ┌─────────────────────────────────────────────────┐
 │                   User Workflow                  │
 │                                                  │
 │  1. Upload / draw a line drawing (vector)        │
 │                     │                            │
 │                     ▼                            │
 │  2. Set parameters:                              │
 │     • N (number of positions)                    │
 │     • Disc diameter                              │
 │     • Slot width                                 │
 │     • Min bridge width                           │
 │                     │                            │
 │                     ▼                            │
 │  3. Choose partitioning strategy                 │
 │     (angular / stripe / graph-based)             │
 │                     │                            │
 │                     ▼                            │
 │  4. Preview & adjust:                            │
 │     • See colour-coded partition overlay         │
 │     • Drag sector boundaries                     │
 │     • Reassign individual segments               │
 │     • See validation warnings in real time       │
 │                     │                            │
 │                     ▼                            │
 │  5. Simulate the reveal animation                │
 │                     │                            │
 │                     ▼                            │
 │  6. Export disc vector file                      │
 │     (SVG / DXF / PDF)                            │
 └─────────────────────────────────────────────────┘
```

### 5.2 Visual Editor Features

- **Colour-coded overlay**: each position's segments shown in a distinct colour on top
  of the original image.
- **Disc preview**: real-time rendering of the disc with cutouts as they would appear
  physically.
- **Sector boundary handles**: draggable lines radiating from the centre (for angular
  mode) or parallel lines (for stripe mode).
- **Segment selection**: click a segment to highlight it; drag it to a different
  position group in a sidebar or directly on the colour-coded overlay.
- **Validation indicators**: segments causing overlap or structural issues are
  highlighted in red with explanatory tooltips.
- **Reveal simulation**: an animation that steps through positions 1…N, draws the
  corresponding strokes on a virtual paper, showing the progressive reveal.


## 6. Input and Output Specifications

### 6.1 Input Requirements

| Aspect            | Specification                                              |
|-------------------|------------------------------------------------------------|
| **Format**        | SVG (preferred), DXF, or any vector format with path data  |
| **Content**       | Stroke-only line drawing; fills ignored                    |
| **Complexity**    | Recommended: ≤ 500 path segments after preparation         |
| **Size**          | Arbitrary; will be scaled to fit the disc                  |
| **Colour**        | Ignored (all strokes treated equally)                      |
| **Centre of rotation** | Can be auto-detected (bounding box centre) or user-specified |

### 6.2 Output Deliverables

| Deliverable           | Content                                                |
|-----------------------|--------------------------------------------------------|
| **Disc file**         | Vector file with cut lines for the disc, cutout slots, centre hole, position labels, and reference mark |
| **Paper template**    | Vector file with the reference mark indicator and optional guide circle showing disc placement |
| **Assembly instructions** | Brief text/diagram explaining how to pin the disc, align positions, and trace |
| **Preview image**     | Raster or vector rendering of the completed drawing for verification |


## 7. Design Constraints and Trade-offs

### 7.1 Number of Positions (N)

| N   | Pros                                         | Cons                                          |
|-----|----------------------------------------------|-----------------------------------------------|
| 4   | Simple disc, few cutouts, sturdy             | Large cutout regions, limited detail           |
| 6   | Good balance for most images                 | —                                              |
| 8   | Fine detail, good for complex images         | More rotation steps for the user               |
| 12  | Very fine detail possible                    | Complex disc, thin bridges, fragile            |

**Recommendation**: default to N = 6, allow range 4–12.

### 7.2 Image Suitability

Not all images work equally well:
- **Best**: images with strokes distributed across the full disc area — animals,
  flowers, stars, faces viewed from front.
- **Challenging**: images concentrated in one region — side profiles, text, images
  with large empty areas. These require stripe-based or graph-based partitioning
  and may need higher N.
- **Problematic**: images with very dense detail in small areas — the cutouts become
  too close together, violating w_min. The application should warn the user and
  suggest simplifying the drawing.

### 7.3 Physical Material Constraints

The disc material affects feasible parameters:

| Material          | w_min (approx.) | w_slot (approx.) | Notes                    |
|-------------------|-----------------|-------------------|--------------------------|
| Cardboard         | 3–5 mm          | 3–5 mm            | Easy to cut by hand      |
| Plastic (laser)   | 1–2 mm          | 1–2 mm            | Precise, durable         |
| 3D printed        | 1–2 mm          | 2–3 mm            | Layer lines may snag pen |
| Paper (craft)     | 5–8 mm          | 4–6 mm            | Fragile, child-friendly  |

The application should offer material presets that set w_min and w_slot appropriately.


## 8. Extension Ideas

These are out of scope for an initial version but represent natural extensions:

- **Multi-colour rotadraws**: assign a different colour to each position. The user uses
  a different coloured pen at each step, producing a multi-coloured final image.
- **Double-sided discs**: cutouts on both sides of the disc, doubling the image
  capacity.
- **Progressive difficulty**: generate multiple discs for the same image at different N
  values (a 4-position "easy" version and a 10-position "detailed" version).
- **Arbitrary rotation angles**: non-uniform angular steps (θ_k not equally spaced)
  could allow more creative partitioning, at the cost of more complex position marks.
- **Built-in vector drawing editor**: let users draw directly in the application rather
  than importing.
- **Batch generation**: process multiple images and combine several small rotadraws onto
  a single sheet for efficient cutting.


## 9. Glossary

| Term                | Definition                                                  |
|---------------------|-------------------------------------------------------------|
| **Disc**            | The circular stencil with cutout slots that rotates on the paper. |
| **Position**        | One of N indexed angular orientations of the disc. Each position reveals a subset of the image. |
| **Cutout / Slot**   | An opening in the disc through which the user traces lines.  |
| **Bridge**          | A strip of solid disc material between two cutouts.          |
| **Pivot**           | The centre point around which the disc rotates.              |
| **Paper frame**     | The fixed coordinate system of the paper.                    |
| **Disc frame**      | The coordinate system that rotates with the disc.            |
| **Partitioning**    | The assignment of image segments to positions.               |
| **Non-interference**| The requirement that cutouts for one position do not accidentally create marks at other positions. |
| **Reference mark**  | A mark on the paper and disc rim used to align each numbered position correctly. |


## 10. Summary

The Rotadraw Generator automates the traditionally manual process of designing a
rotadraw disc. Given a user-supplied vector line drawing, it:

1. **Normalises** the geometry to fit a circular disc.
2. **Partitions** the drawing's strokes into N groups using a configurable strategy
   (angular sectors, spatial stripes, or graph-based balancing).
3. **Transforms** each group into physical cutout slots on the disc by reverse-rotating
   and thickening the strokes.
4. **Validates** structural integrity (connected disc, minimum bridge width) and
   non-interference (no ghost lines at wrong positions).
5. **Exports** a print-ready / cut-ready vector file of the disc.

The user can influence the process at every stage — from choosing N and the partitioning
strategy, to manually adjusting sector boundaries and reassigning individual segments —
while the application handles the geometric complexity and ensures a physically viable
disc.
