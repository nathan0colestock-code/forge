App icons live here, generated from `public/brand/logo.svg`.

Required files (produced by `npm run icons:generate`):

- `icon-180.png` (180×180 — apple-touch-icon)
- `icon-192.png` (192×192 — PWA)
- `icon-512.png` (512×512 — PWA)
- `icon-maskable-512.png` (512×512, 10% safe-area padding — PWA maskable)

Plus, in `public/`:

- `apple-touch-icon.png` (copy of icon-180)
- `favicon-32.png`

The designer agent overwrites `public/brand/logo.svg` with the chosen brand mark before generating. To verify icons exist before deploy:

    npm run icons:check

Goal: when the user adds the deployed app to an iPhone home screen, the icon must look like a first-party Apple app, not a default Next.js placeholder.
