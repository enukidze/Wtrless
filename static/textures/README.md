# HDR Environment Textures

Place your HDR environment files in this directory.

## Quick Setup - Free HDR Downloads:

### Option 1: Courtyard (Recommended for courts)
- **Download**: [Poly Haven - Courtyard](https://polyhaven.com/a/courtyard)
- **File**: Download 2K HDR format
- **Rename to**: `footprint_court_2k.hdr`

### Option 2: Urban/Parking Environment
- **Download**: [HDRI Hub - Parking Lot (Free)](https://www.hdri-hub.com/hdrishop/freesamples/freehdri/item/113-hdr-111-parking-space-free)
- **File**: Download the HDR file
- **Rename to**: `footprint_court_2k.hdr`

### Option 3: Use Different HDR
If you have any other HDR file, simply:
1. Place it in this `static/textures/` folder
2. Update the path in `src/scenes/SceneA.js` line 18

## Current Setup:
- **Scene A**: `footprint_court_2k.hdr` (with fallback lighting if file missing)
- **Scene B**: No environment (empty)
- **Scene C**: No environment (empty)

## File Requirements:
- Format: `.hdr` files
- Resolution: 1K-4K recommended
- Naming: Any name (just update the path in SceneA.js)

## More Free HDR Sources:
- [Poly Haven](https://polyhaven.com/hdris) - 100% free HDRs
- [HDRI Hub Free Samples](https://www.hdri-hub.com/hdrishop/freesamples/freehdri) - Free HDR collection
- [OpenFootage](https://www.openfootage.net/) - Various HDR environments

## No HDR? No Problem!
The scene now has fallback lighting that activates automatically if the HDR file is missing. 