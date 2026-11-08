# FIGMA_PROMPT.md

Paste everything below the line into your Figma AI tool (Figma Make or similar). Attach the Think Bee files in `assets/wordmark/`, `assets/short-form/` and `assets/app-icons/`, plus `assets/brand/macaney-website-palette-reference.png` and the three files in `assets/inspiration/`. Keep `assets/brand/macaney-logo.png` separate for “by Macaney” attribution. Also give it `docs/UI_DESIGN.md` and `design/tokens.json`.

---

Design Think Bee, a Progressive Web App for farmers and beekeepers in Nigeria, built by Macaney. Users photograph a hive or crop, get AI advice, keep records and reminders, and chat with other farmers in direct chats, groups and communities.

**Deliverables**: mobile frames at 390x844 and desktop frames at 1440x900 for every screen in `UI_DESIGN.md` section 8, in light and dark mode, with components, variables, and a clickable prototype with the motion described in section 10.

**Colours (strict, from the Macaney website screenshot)**: honey orange #FC9900 for primary actions; deep green #022C22 and band green #034E3B for surfaces; feature green #006046; mint #65E8B6 on dark; comb yellow #FFD144; bark brown #4C3823; page #FAFAFA; nav #F8F8F6. Use only tints and shades of these. Orange is a fill with dark green text, never body text on white. Red only for errors.

**Type**: Fraunces for headlines and greetings, Inter for everything else.

**Inspiration**: follow the three reference screens for structure and feel, not for colours. Soft rounded cards and a serif greeting (reference 1), a floating pill bottom nav with a raised centre Scan button, category tiles that run off the edge, a history list with outlined category pills, chat list with segmented tabs, pinned and unread states, a conversation with a curved header notch and file-style cards (reference 2), dark mode with two large action tiles, AI answer cards with thumbs up, thumbs down and copy, and a recording overlay (reference 3).

**Brand device**: honeycomb geometry from the logo. Use it for hero textures, loaders, group avatar frames, empty states and the hexagonal scan shutter. Use the bee from the logo as the assistant avatar and loader. No new mascot.

**It must not look AI-made**: no purple or blue gradients, no sparkle icons, no emoji as icons, no rows of identical icon-in-circle cards, no glass everywhere, no stock smiles, no filler copy. Vary layout rhythm. Write plain, kind copy for people new to digital tools.

**Screens**: onboarding (splash, welcome, email magic-link sign-in, check-email and link-return states, profile, add farm, permission primers, app lock); Home; Scan flow (pick, capture, review, analysing, result with confidence meter, pollinator warning, label notice, expert block, confirm record); Ask Think Bee; Chats (list, direct room, group and community room with topic rooms, voice recording overlay, attach sheet, long-press menu, space info, admin tools, rules, report, block); Records (timeline, entry detail, new entry, reminders); Me (chat profile editor with visibility toggles, farms, settings, privacy and data, blocked, install card); system states (offline, syncing, upload progress, AI unavailable, errors); desktop layouts with left rail, three-pane chat, bento Home, master-detail Records, and the admin console.

**Photography**: use clearly marked placeholders labelled "replace with supplied photo". Do not use stock photos of people.

**Motion** (annotate on prototype): shared-axis screen transitions, spring nav indicator, bubble rise on send with tick animation, voice recording pulse and slide to cancel, hexagon shutter, honeycomb fill during analysis, confidence meter fill, sync band slide, comb-cell skeleton shimmer.
