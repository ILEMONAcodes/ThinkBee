# Think Bee logo kit

Two logos that belong together, plus the app icons made from them. Colours are only the brand palette: honey `#FC9900`, deep forest `#022C22`, mint `#65E8B6`, comb yellow `#FFD144`.

## The logos

**Text logo (wordmark)**: "Thinkbee" in a chunky rounded face with the bee sitting on the stem of the "b": head and antennae on top, wings behind. This is the main logo. Use it where the name must be read: splash screen, website header, onboarding, marketing.

**Short form**: the "b" with the bee, cut from the text logo. Use it where space is small: app icon, favicon, notification badge, chat and profile pictures, social profile picture.

## Folders

```
wordmark/     text logo
short-form/   the "b" with the bee
app-icons/    PWA, Android, iPhone, browser tab, notification badge
preview-sheet.png
```

Every logo file comes as SVG (master) and PNG.

### wordmark/
| File | Use |
| --- | --- |
| `thinkbee-wordmark` | light surfaces, transparent |
| `thinkbee-wordmark-dark` | dark surfaces, transparent |
| `thinkbee-wordmark-bg-paper` | on paper white |
| `thinkbee-wordmark-bg-forest` | on deep green |
| `thinkbee-wordmark-bg-comb` | on soft yellow |

### short-form/
| File | Use |
| --- | --- |
| `thinkbee-short` | light surfaces, transparent |
| `thinkbee-short-dark` | dark surfaces, transparent |
| `thinkbee-short-bg-paper`, `-bg-forest`, `-bg-comb` | with background |

### app-icons/
| File | Use |
| --- | --- |
| `icon-512.png`, `icon-192.png`, `icon.svg` | PWA and Android install icon |
| `maskable-512.png`, `maskable-192.png` | Android adaptive icon (logo kept inside the safe zone) |
| `apple-touch-icon-180.png` | iPhone home screen |
| `favicon.svg`, `favicon-16/32/48.png` | browser tab |
| `badge-monochrome-96.png` | notification badge (white shape on transparent) |

PNG sizes: wordmark 2000 px wide, short form 1024 px, icons as named. The lettering is converted to outlines, so no font is needed to use the files. It is based on Fredoka (open font licence) and is used only inside the logo, not as the app's interface font.

## Rules
- Use the dark versions on forest, black or photo surfaces. The head and antennae change colour there so the bee stays visible.
- Clear space: at least the width of the "b" stem on every side.
- Minimum size: text logo 96 px wide, short form 24 px tall. Below that use the favicon.
- Do not recolour, outline, add shadows, stretch, rotate, or move the bee off the "b". Do not put the orange wings on an orange background or on a busy photo without a forest overlay.
- Do not set the name in another font. "Think" and "bee" stay joined as one word.
- For the Macaney parent brand use the Macaney logo separately. A co-brand line reads "by Macaney", small, in Inter, beside or below the text logo.

## PWA manifest
```json
"icons": [
  {"src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png"},
  {"src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png"},
  {"src": "/icons/maskable-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable"},
  {"src": "/icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}
]
```
```html
<link rel="icon" href="/icons/favicon.svg">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon-180.png">
```
