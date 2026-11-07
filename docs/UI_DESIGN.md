# UI_DESIGN.md — Think Bee visual and interaction design

This document is for the Figma designer and for the frontend agent. It is binding. If you are about to deviate from it, stop and write the reason in `docs/DECISIONS.md` first.

Assets referenced here live in `assets/`:
- `assets/wordmark/` and `assets/short-form/` — the Think Bee product wordmark and short mark.
- `assets/app-icons/` — the Think Bee PWA, browser and notification icons.
- `assets/brand/macaney-logo.png` — the Macaney parent-brand mark, used only for creator attribution such as “by Macaney”.
- `assets/brand/macaney-website-palette-reference.png` — the Macaney website. **This is the colour source.** Palette is strict.
- `assets/inspiration/ref-01-assistant-light-soft-cards.png` — light assistant app.
- `assets/inspiration/ref-02-chat-list-and-room.png` — chat list and conversation.
- `assets/inspiration/ref-03-assistant-dark-voice-and-actions.png` — dark assistant app.

---

## 1. Design intent

Think Bee should feel like a warm, confident tool that a farmer trusts on a bright afternoon in the field, and that a younger member of the team is proud to show off. Three words: **grounded, warm, quick**.

- **Grounded**: deep forest greens and earthy browns carry the weight. Orange is used with purpose, to say "this is the thing to tap".
- **Warm**: a serif display face, generous radius, soft shadows tinted green, honeycomb geometry used with restraint.
- **Quick**: motion confirms every action inside a fraction of a second. Nothing blocks. Everything works offline or says why not.

The users include smallholders and people new to digital tools. Chat should feel as familiar as WhatsApp or Telegram. Every icon has a text label unless it is universal (back arrow, send, microphone, camera).

### What it must not look like

The design must not read as AI-generated or template-made. Avoid:

- Purple, blue or pink gradients. Rainbow mesh backgrounds. Any hue outside the palette.
- Sparkle or magic-wand icons, "AI" badges glowing with gradients, robot mascots.
- Emoji used as icons or decoration in the interface.
- Rows of three identical cards, each with a circle icon, a bold title and two lines of grey text.
- Glassmorphism on every surface. Blur is allowed on the bottom navigation and on sheets only.
- Stock-photo smiles, 3D renders unrelated to bees or farming, floating abstract blobs.
- Filler marketing copy ("Unlock the power of…", "Welcome back!", "Seamless experience").
- Perfectly symmetric layouts everywhere. Vary rhythm: a large hero next to a tight list, a full-bleed photo next to a narrow column.
- Default component-library looks. Every primitive is restyled to the tokens.

---

## 2. Colour (strict)

The palette was sampled from the Macaney website screenshot. Source of truth: `design/tokens.css` and `design/tokens.json`.

| Role | Token | Hex | Where it came from |
| --- | --- | --- | --- |
| Primary action | `honey-500` | `#FC9900` | "Get Started", "Join the network" buttons |
| Deep brand surface | `forest-900` | `#022C22` | dark leadership card |
| Band / secondary surface | `forest-700` | `#034E3B` | the green service band |
| Feature green | `forest-600` | `#006046` | "Featured on" accents |
| Pill surface | `forest-800` | `#034836` | the "High-level leadership" pill |
| Mint on dark | `forest-300` | `#65E8B6` | pill text on dark green |
| Comb yellow | `comb-400` | `#FFD144` | avatar chip, tagline |
| Bark | `bark-700` | `#4C3823` | top strip of the site |
| Page | `paper` | `#FAFAFA` | site page background |
| Nav | `bone` | `#F8F8F6` | site navigation |

Rules:

1. Only these hues. Tints and shades come from the scale in `tokens.css`. No new hues. The single exception is `danger` red for errors and destructive actions, because green and orange cannot signal "stop".
2. **Contrast**: orange text on white or paper fails accessibility. Orange is a fill. Text on orange is `forest-900`. Body text on light is `ink`. Links on light are `forest-600`. Text on dark is white or `forest-300`.
3. **Proportion** in light mode: roughly 70% paper and white, 20% forest, 8% honey, 2% comb and bark. In dark mode: 75% forest-950 and forest-900, 15% lighter forest, 8% honey, 2% comb.
4. Orange appears once or twice per screen: the main action and at most one highlight. If everything is orange, nothing is.
5. Chat bubbles: sent = `forest-700` with white text in light mode, `honey-500` with `forest-900` text in dark mode. Received = white in light mode, `#0F3328` in dark mode.
6. Honeycomb art uses `comb-400`, `honey-500` and `forest-700` only, with a flat or softly shaded look, never neon.
7. Shadows are green-tinted (`rgb(2 44 34 / x)`), never pure black.
8. Both light and dark themes are required. Dark follows the system setting and can be overridden in settings.

---

## 3. Typography

| Use | Font | Notes |
| --- | --- | --- |
| Display and headlines | **Fraunces** (variable, soft, weights 500 to 700) | Echoes the serif headlines on the Macaney site and the serif style in reference 01. Used for screen titles, greetings, result headlines, empty states. |
| UI and body | **Inter** (400, 500, 600) | All labels, chat, forms, lists. |

Load with `next/font`, subset to Latin plus Latin Extended (for Yoruba and Igbo diacritics later), `display: swap`.

Scale (px / line height): caption 12/16, small 14/20, body 16/24, lead 18/26, h3 22/28, h2 28/34, h1 36/42, hero 48/52. Body never below 16px for reading content. Chat text 16px. Support the system "larger text" setting without breaking layouts.

Headlines use tight letter spacing (-0.01em). Numbers in timelines and reminders use tabular figures.

---

## 4. Shape, spacing, depth

- Radius: cards 24, buttons pill (999), inputs 16, sheets 32 on top corners, chat bubbles 20 with a 6px tail corner, avatars full circle.
- Spacing scale: 4, 8, 12, 16, 20, 24, 32, 40, 56. Screen side padding 20 on mobile, 32 on tablet, 40 on desktop.
- Depth comes from tone first (surface steps), shadow second. Max one floating layer type visible at once (nav pill or sheet).
- Hairlines use `--line`. Prefer spacing over dividers.
- Dark mode raises surfaces by lightening, not by shadow.

---

## 5. Iconography and illustration

- Icons: **Phosphor**, regular weight for inactive, fill for active tab, 24px, stroke consistent. Custom icons needed: hive, frame, queen cage (not used in MVP), smoker, comb cell, crop leaf, pest. Draw them in the same stroke style or use Phosphor equivalents.
- The **honeycomb** is the brand device. Build a hex grid component (`<CombField />`) that renders flat hexagons. Use it as: hero card texture at 6 to 10% opacity, loading state, empty-state illustration, avatar frame for groups, and the shape of the scan shutter button. Do not tile it across entire screens.
- The **bee** comes from the supplied Think Bee short-form SVG. Use it for loading, empty states and the assistant avatar; do not redraw it as a new mascot.
- Photography: real hives, real crops, real Nigerian farmers and beekeepers, supplied by Macaney. Never stock images of people. Rounded 24, subtle forest-tinted overlay where text sits on a photo.
- Reference 01 and 03 use glossy 3D forms. Take the *idea* (a bold, tactile hero object per screen) and express it with a layered honeycomb cluster and a bee, rendered in flat shapes with soft inner shading. Do not import blue or red 3D mascots.

---

## 6. How to use the inspiration screens

Each reference is here for specific lessons. Do not copy layouts one to one. Translate into Think Bee's palette and content.

**Reference 01, light assistant (soft cards, serif titles)**
- Greeting at top left in serif, with a one-line prompt beneath and a notification button on the right.
- A large promotional hero card with a bold shape on the right and one strong button. Think Bee equivalent: the "Scan a hive or crop" hero card on Home.
- A horizontal row of colourful category tiles that run off the screen edge to hint at scrolling. Think Bee: Scan hive, Scan crop, Ask Think Bee, Reminders, in tints of honey, comb and forest.
- History list with a title, a one-line preview and a small outlined category pill on the right.
- Floating bottom navigation as a rounded pill with a **centre dark button**. Think Bee: the centre button is Scan, in honey with a comb-shaped outline.
- Message bar with attach icon at left and a small counter at right. Think Bee: attach photo at left, nothing at right until typing, then Send.
- Assistant message layout: a small shaped avatar above each AI message, bubbles in soft neutral, a "Thinking…" state with an animated shape. Think Bee: the honeycomb loader.

**Reference 02, chat list and room**
- Segmented tabs at top of the chat list (All Chats, Groups, Contacts). Think Bee: All, Direct, Groups, Communities.
- Rows: avatar, name, last message preview, time, pinned icon, unread count badge, "typing…" in accent colour, voice message preview with a small mic icon, sticker or file preview labels.
- A round floating button at bottom right to start a new chat.
- The conversation screen uses a **tinted full-bleed background** with a curved notch in the header holding the avatar, name, "Online" and action buttons. Think Bee: forest-700 conversation background in light mode with the curved header notch in paper. Sent bubbles light, received bubbles slightly lighter than background. Action buttons in the notch are Search and Info (calls are not in the MVP).
- A file attachment card inside a bubble with icon, name, size and a circular download button. Think Bee uses this pattern for **scan result cards** and for photo/voice upload progress.
- Composer: rounded white field, mic at left inside the field, attach icon at right, and a separate round Send button. Think Bee: hold-to-record on the mic, camera and gallery in the attach icon.

**Reference 03, dark assistant**
- Dark mode hero upgrade card with a character and one button. Think Bee has no upgrade card in the MVP. Use the same slot for a "Today" card: next reminder and a Scan shortcut.
- Two large rounded action tiles side by side with a line icon and a two-line label. Think Bee: Scan a hive, Scan a crop.
- History rows with a document icon, truncated title and an arrow.
- A full-screen voice state with a large central character and live text where spoken words light up as they are recognised. Think Bee uses this only as inspiration for the **voice note recording overlay** in chat (the AI does not transcribe voice in the MVP, so show a live waveform instead of text).
- AI answer card with image on top, text below, and three small actions at the bottom: thumbs up, thumbs down, copy. Think Bee: AI answer cards carry these same actions plus "Save to records" and "Share to chat".

**Macaney website screenshot (colour and tone)**
- Orange pill buttons with bold uppercase tracking on dark photo. Primary CTA style.
- Dark forest content card with a mint-outlined pill label above a bold serif headline. Use for featured content, announcements and onboarding cards.
- Green marquee band for short value statements. Think Bee equivalent: a slim forest band for offline and sync status.
- Avatar cluster chips with initials in orange, green and yellow. Use for group member stacks.

---

## 7. Layout and navigation

### Mobile (390 x 844 base, support 360 to 430)

Bottom navigation is a floating pill, 64px tall, 16px from the screen bottom, blur allowed, five slots:

1. **Home**
2. **Chats** (unread dot or count)
3. **Scan** (centre, raised 12px, honey fill, comb-shaped outline, always the same position)
4. **Records** (history and reminders)
5. **Me** (profile and settings)

An animated indicator slides between tabs using a spring. The active tab icon switches to its filled version and shows its label; inactive tabs show labels too (low digital literacy). Hide the pill inside chat rooms, scan flow and full-screen viewers.

### Tablet (768 to 1023)
Two columns: a collapsible rail on the left, content on the right. Chat shows list and room side by side.

### Desktop (1024 and up, design at 1440)
This is a real layout. Do not stretch the phone.

- **Left rail** (88px, expands to 264px on hover or pin): logo, the five destinations, theme toggle, profile.
- **Home**: bento layout. A wide "Scan" hero spanning two columns, a weather/briefing area, a Today card, recent history list and community highlights, all with different heights.
- **Chats**: three panes. Chat list (360px), conversation (flex), details panel (320px, collapsible) showing members, shared photos, pinned messages, rules.
- **Scan**: left is photo drop zone or webcam viewfinder, right is the result. File upload is the primary path on desktop.
- **Records**: master-detail table. Timeline list left, entry detail right. Keyboard friendly.
- **Admin console** (`/admin`, Think Bee admins only, desktop-first): reports queue, spaces, users, suspensions. Dense tables, filters, bulk actions, audit trail.
- Max content width 1200 on non-chat pages. Hover states, keyboard shortcuts (`/` to search, `n` new chat, `Esc` close), right-click context menus in chat.

---

## 8. Screen inventory

Design every screen below in light and dark, mobile and desktop where noted (M = mobile, D = desktop). Each needs loading, empty, error and offline variants. Frame names: `Area / Screen / State / Theme / Device`.

### 8.1 Onboarding (M, D)
1. **Splash**: logo on forest-900, comb cells assemble into the bee mark, then fade to Welcome.
2. **Welcome**: 3 swipeable panels in Fraunces headlines with real photography (scan, records, community). Skip always visible. Orange "Get started".
3. **Email sign-in**: large email field, plain sentence explaining that Think Bee will send a secure sign-in link, and one orange "Email me a sign-in link" button. Optional OAuth buttons appear only for providers enabled in configuration.
4. **Check your email**: show the submitted address, a clear instruction to open the magic link on this device, resend cooldown, "Use a different email" action, expired-link error and a returning-from-link loading state.
5. **Create profile**: display name, optional photo (camera or gallery), short bio. Shows exactly what others will see in a live preview card.
6. **Add your farm or apiary**: type (crops, bees, both), name, general location (state, LGA), number and type of hives or crops. Skippable, can add later.
7. **Permissions primer**: shown only when a feature first needs camera, microphone, gallery, notifications or location. One sentence on why, a clear "Not now" that keeps the rest of the app working.
8. **App lock** (optional): PIN or fingerprint.

### 8.2 Home (M, D)
- Greeting in Fraunces with the farmer's name and the date. One line of context under it, written plainly (for example "2 reminders today").
- **Scan hero card**: forest-900 card with `CombField` texture, serif headline "Check a hive or a crop", honey button, bee mark partially cropped at the right edge.
- Quick tiles (horizontal scroll on mobile): Scan hive, Scan crop, Ask Think Bee, New reminder. Tinted honey-100, comb-100, forest-100, bone, each with a different shape cut so they do not look like a template.
- **Current weather widget**: temperature, humidity, rain chance, wind and a freshness label. It uses the selected farm or permitted live location, never exposes coordinates, and has distinct loading, cached, stale, unavailable, permission-denied and offline states. Stale weather shows “Updated at…” instead of looking current.
- **Location permission sheet**: shown when weather first needs live location. Explain the benefit in one sentence, then offer “Use my location”, “Use saved farm location” and “Not now”. Denial keeps the rest of Home usable.
- **Daily briefing card**: a short weather impact summary, up to three top actions and the strongest current warning. Expand to the full briefing with priorities, risk indicators, hive advice, postponed tasks, source time and limitations. Risk indicators never use diagnosis language.
- **Today** card: next reminder with mark done, postpone, dismiss.
- **Recent** list: scans and questions with outlined category pills (Hive, Crop, Question), time, and a one-line preview.
- **From your communities**: up to three latest posts, avatar stack, unread count.
- Slim sync band when offline or syncing.

### 8.3 Scan flow (M, D)
1. **Pick subject**: Hive or Crop, two big tiles with photography. Select farm and hive or block if the farmer has several.
2. **Capture**: full-screen viewfinder, guide frame with corner marks, a tip line ("Fill the frame with the frames or the leaf"), flash toggle, gallery shortcut, and a **hexagonal shutter**. On desktop: webcam or file drop.
3. **Review**: photo preview, retake, add up to 4 photos, optional note.
4. **Analysing**: honeycomb cells fill in sequence over the photo, with plain status lines that change every few seconds. Cancel is available. If offline: "Saved. We will analyse it when you have signal." with the queued state in the Records tab.
5. **Result**: serif headline with the likely cause; **confidence meter** (low, medium, high) as a three-segment comb bar that fills with animation; "Why we think this" short paragraph; **Next steps** as a numbered list; **Pollinator warning** block in comb-100 with a bee icon whenever treatment is mentioned; **Check the label and your local rules** notice; **Talk to an expert** block for serious or uncertain cases; follow-up question chips and a "Take a clearer photo" button when the AI needs more evidence. Actions: Save to records (confirm sheet shows the suggested record title, editable), Share to chat, Set reminder, thumbs up and down, copy.
6. **Confirm record sheet**: "Nothing is saved as done until you confirm." Two buttons: Save, Not now.

### 8.4 Ask Think Bee (M, D)
- Chat-style screen following reference 01's assistant thread: avatar mark above each answer, neutral bubbles, farmer messages in forest-700.
- Composer with attach photo, text field, send. No voice in the MVP.
- Thinking state: honeycomb loader and "Thinking…".
- Answer cards: the same safety blocks as scan results when advice involves treatment; thumbs up, thumbs down, copy, save to records, share to chat.
- Suggested starters on an empty thread, written like questions a farmer asks ("Why are my bees leaving the hive in the evening?").
- Context chip at the top showing which farm or hive the answer will use, tappable to change.

### 8.5 Chats (M, D)
- **Chat list** following reference 02: segmented control All, Direct, Groups, Communities. Search. Rows with avatar (comb-shaped frame for groups and communities, circle for people), name, preview, time, unread badge in honey, pin icon, mute icon, typing state, voice note preview, photo preview label. Swipe left: mute and more. Swipe right: pin. Long press: report, mute, leave. Floating "New chat" button.
- **New chat sheet**: search by farmer ID, recent contacts, join with code.
- **Direct chat room**: curved header notch, forest-700 background in light mode, bubbles with reply quote, photo grid (1 to 6), voice note bubble (play, waveform, duration), scan result card, system messages, delivery states (clock, sent, delivered, read), outbox state with retry. Composer as in section 6. Date separators sticky.
- **Group and community room**: same plus sender name and colour per member (derived from the palette scale), role tag next to name (Admin, Mod), pinned message bar, standing notice banner ("Advice from members is not expert advice. For serious cases, see an extension officer."), and in communities a **topic room switcher** as a horizontal chip row.
- **Voice note recording overlay**: hold mic, composer transforms: pulsing honey ring, live waveform, timer, "slide to cancel" with a left arrow, "slide up to lock". Release sends. Haptic on start and send.
- **Attach sheet**: Camera, Gallery, Share a scan. Camera opens in-app with preview and caption before sending.
- **Message long-press menu**: reply, copy, delete (own), report, and for moderators remove and mute member.
- **Space info**: photo, name, description, rules, members list with roles, shared photos, mute, leave, invite link or code (admin).
- **Admin tools** (space admin and moderator): change roles (confirm sheet), remove member, mute for a set time, pin, posting limit (everyone or announcements only), rules editor, reports for that space.
- **Rules screen** on first join to a community: short list, "I understand" button.
- **Report flow**: reason list, optional note, confirmation.
- **Block person** confirmation.

### 8.6 Records (M, D)
- Segmented: Timeline, Reminders.
- **Timeline**: grouped by month, per farm or hive filter chips. Entry card: type icon, title, date, small photo thumbnail, status (Draft, Saved). Drafts show a dashed outline and a "waiting to sync" marker.
- **Entry detail**: photo, AI result summary (read-only), the farmer's notes (editable), related reminders.
- **New entry** (manual log): type, date, note, photos.
- **Reminders**: grouped Today, Upcoming, Done. Swipe actions: done, postpone (quick picks: tomorrow, next week, pick date), dismiss. Create sheet: type (inspection, planting, treatment, harvest), farm or hive, date and time, repeat.

### 8.7 Me (M, D)
- Profile header: photo, name, farmer ID with copy button, bio.
- **Chat profile** editor with live preview and visibility toggles: show crops or hive type and show general area. Authentication email is never public.
- **My farms**: list, add, edit.
- **Settings**: language (English at launch), theme, notifications (per category), app lock, storage and data usage, low data mode.
- **Privacy and data**: plain-language page on how photos and messages are used and kept, messages are not end-to-end encrypted in the MVP, request deletion.
- **Blocked people** list.
- **About**: version, Macaney, expert advice notice.
- **Install app** prompt card for PWA (shown after meaningful use, never on first launch).

### 8.8 System states (M, D)
- Offline banner and Sync band, queue counter, "will send when you have signal".
- Upload progress ring in photo and voice bubbles.
- Session expired, maintenance, AI temporarily unavailable (the rest of the app keeps working), weather stale or unavailable, location permission denied, storage full, update available toast.
- 404 and generic error pages with the bee mark.

---

## 9. Components to build (Figma components and React primitives)

Buttons (primary honey, secondary forest outline, tertiary text, destructive, icon, round send; sizes 48 and 56; states default, pressed, loading, disabled). Inputs (text, email, search, textarea, select). Chips and pills (filter, status, role). Avatars (circle, comb frame, stack). Cards (hero, tile, list row, result, scan result share). Bubbles (text, photo grid, voice, scan card, system, reply quote). Composer. Bottom pill nav and desktop rail. Sheets (bottom sheet, modal, menu). Toast. Segmented control. Switch. List row with swipe actions. Skeletons. Empty state. Confidence meter. Waveform. CombField. Loader. Banner (offline, notice).

Variants must cover light and dark. Build with auto layout and Figma variables bound to `design/tokens.json`.

---

## 10. Motion

Motion is how the app feels fast and alive. All presets are in `design/motion.ts`. Rules: animate only `transform` and `opacity`; keep micro interactions under 200ms, transitions 260 to 420ms, scene changes up to 640ms; use spring easing for things that are physical (sheets, pop-ins, nav), ease-out for entrances; always honour `prefers-reduced-motion` by replacing movement with a quick fade.

| Moment | Behaviour |
| --- | --- |
| Screen change | Shared-axis slide: new screen in from right by 24px with fade, old out left by 16px. Use the View Transitions API where supported, `motion` otherwise. |
| Bottom nav | Active indicator slides between tabs on a spring. Icon swaps to fill with a 1.1 pop. Centre Scan button breathes (scale 1.0 to 1.03) once when the app opens, then stays still. |
| Buttons | Press scale 0.96, release spring. Primary button shows a loading ring in place of the label, width does not jump. |
| Lists | Stagger in 45ms per item on first load only, not on every refresh. |
| Sheets | Rise on a spring, drag to dismiss with rubber-band, backdrop fades. |
| Chat send | Bubble rises from the composer position, scales from 0.96, tick state animates clock to single tick to double tick. Failed messages shake once and show Retry. |
| Chat receive | Soft slide from side 14px, pinned to bottom only if the reader is at the bottom. A "new messages" pill appears otherwise. |
| Voice recording | Ring pulses with input level, waveform bars grow from centre, slide-to-cancel turns the bar red-tinted as the finger crosses the threshold, release plays a small crumple-out when cancelled. |
| Scan shutter | Hexagon pulses, brief frame flash at 80ms, captured photo shrinks into the preview thumbnail with a shared-element transition. |
| Analysis | Honeycomb cells fill one after another across the photo, each with a small scale pop, over a dimmed photo. Status text cross-fades. |
| Result reveal | Headline fades up, confidence comb bar fills segment by segment, next steps stagger in. |
| Pull to refresh | Hex cell rotates and fills as you pull. |
| Offline to online | Sync band slides down, counts the queue to zero, then collapses with a check. |
| Skeletons | Comb-cell shimmer in honey-100 to bone, never a grey gradient. |
| Tab change within Records | Content cross-slides in the direction of the tab order. |
| Haptics | `navigator.vibrate(8)` on send, voice start and successful scan where supported. |

Performance budget for motion: no layout-thrashing properties, 60fps on a mid-range Android phone, lazy-load heavy animation code, cap simultaneous animated elements at about 20.

---

## 11. Content and tone

- Plain, direct, kind. Short sentences. Grade 6 reading level. No jargon without a one-line explanation.
- Say what happened and what to do. Example error: "We could not send the photo. It is saved on your phone and will go when you have signal."
- AI voice: "This looks like…", "I am not sure because…", "A clearer photo of the brood frame would help." Never "I diagnose".
- Avoid exclamation marks, emoji and puns in the interface.
- Chat standing notice, pollinator warning and label notice texts are fixed copy and live in `docs/AI_SAFETY.md`. Do not rewrite them.
- All strings go through the i18n layer (`next-intl`), English first, structured so Yoruba, Igbo, Hausa and French can follow.

---

## 12. Accessibility and low-end devices

- WCAG 2.2 AA. Contrast checked per theme. Focus rings 2px `focus` colour with 2px offset.
- Touch targets 48px minimum, 8px between them.
- Every icon-only button has an accessible name. Voice notes show duration as text.
- Do not rely on colour alone: confidence also shows the word Low, Medium or High.
- Support screen readers, Dynamic Type and Android font scaling up to 200%.
- Low data mode: no autoplay animations beyond essentials, images at lower quality, no prefetch of chat media.
- Target devices: Android Go class phones with 2GB RAM. Test on throttled 3G and CPU 4x slowdown.

---

## 13. Handoff checklist for Figma

1. Variables set up from `design/tokens.json` (colour, radius, spacing, type) with Light and Dark modes.
2. Components built per section 9 with all variants.
3. Frames for every screen in section 8 at 390x844 and, where marked D, at 1440x900. Tablet 834 for chat and home.
4. Prototype flows: onboarding, first scan to saved record, share scan to a group, voice note send and cancel, offline send and sync, admin changes a role.
5. Motion annotations on the prototype using the table in section 10.
6. Dev mode ready: naming matches `Area / Screen / State / Theme / Device`; assets exported as SVG; photography placeholders clearly marked "replace with supplied photo".
7. A one-page style sheet frame summarising palette, type, radius, icons and the do-not list from section 1.
