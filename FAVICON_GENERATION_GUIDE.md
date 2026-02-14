# Favicon and Metadata Image Generation Guide

This guide will help you generate all the necessary favicon and metadata images for the Randi platform.

## Required Files

The following files need to be generated from `public/randi.png`:

### Favicons
- `public/favicon.ico` - Standard favicon (16x16, 32x32, 48x48 multi-size)
- `public/icon-192.png` - Android icon (192x192)
- `public/icon-512.png` - Android icon (512x512)
- `public/apple-touch-icon.png` - Apple touch icon (180x180)

### Social Media
- `public/og-image.png` - Open Graph image (1200x630)

## Method 1: Using RealFaviconGenerator (Recommended)

1. Visit https://realfavicongenerator.net/
2. Click "Select your Favicon image"
3. Upload `public/randi.png`
4. Customize settings:
   - **iOS**: Use the original image
   - **Android**: Use the original image with no background color change
   - **Windows**: Use the original image
   - **macOS Safari**: Use the original image
5. Click "Generate your Favicons and HTML code"
6. Download the generated package
7. Extract and copy the following files to your `public/` folder:
   - `favicon.ico`
   - `android-chrome-192x192.png` → rename to `icon-192.png`
   - `android-chrome-512x512.png` → rename to `icon-512.png`
   - `apple-touch-icon.png`

## Method 2: Using Online Tools

### For Favicons
- Use https://favicon.io/favicon-converter/
  - Upload `public/randi.png`
  - Download and extract to `public/`

### For OG Image
- Use Canva or Figma to create a 1200x630 image
- Place the Randi logo centrally
- Add tagline: "Launch AI Agents Instantly"
- Export as `og-image.png` to `public/`

## Method 3: Using ImageMagick (Command Line)

If you have ImageMagick installed:

```bash
# Navigate to public folder
cd public

# Generate favicons
magick randi.png -resize 180x180 apple-touch-icon.png
magick randi.png -resize 192x192 icon-192.png
magick randi.png -resize 512x512 icon-512.png
magick randi.png -define icon:auto-resize=16,32,48 favicon.ico

# Generate OG image (1200x630 with centered logo)
magick -size 1200x630 xc:"#0a0a0a" \
  randi.png -resize 400x400 -gravity center -composite \
  og-image.png
```

## Verification

After generating the files, verify:

1. All files exist in `public/` folder
2. Favicon appears in browser tab
3. Social media preview looks correct (use https://www.opengraph.xyz/)

## Next Steps

Once all files are generated, the metadata in `src/app/layout.tsx` will automatically reference them.
