# ThinkBee MVP – Product Requirements (v2, with Community Chat)

Nov 5, 2026 · @Samuel

## Overview

Think Bee is a mobile app where a farmer or beekeeper photographs a crop or a hive, gets plain-language advice from an AI assistant, and talks with other farmers in groups and communities. The app also keeps a history of what they have scanned and done, and reminds them of upcoming tasks.

New in this version: a Telegram-style chat system, so farmers can message each other, join groups and communities that admins create, send voice notes and photos, and have their own profiles. See "Community chat" below.

The first release (the MVP) connects to an existing AI service, Google Gemini. We will not build or train our own AI models. This keeps the first version fast to build and lets us learn from real farmers before investing in anything more advanced.

## Who it is for

The MVP is built for farmers and beekeepers, including smallholders and people who are new to digital tools. The app should be simple enough to use without training. Chat should feel familiar to anyone who has used WhatsApp or Telegram.

Extension officers and cooperatives are a later audience. The MVP does not include their dashboards or workflows. They can still join chat as ordinary farmers if they register with an email address.

## What the MVP does

The MVP now has eight features. Feature 5 is extended and feature 6 is new.

1. **Photo scan for crops and hives.** The farmer takes or uploads a photo, picks crop or hive, and receives a likely cause, how sure the AI is, and suggested next steps. The AI can ask follow-up questions or request a better photo.
2. **Ask the AI.** The farmer can type a farming or beekeeping question and get a clear answer, using their saved farm details, history, permitted location and available local weather for context.
3. **History and records.** Every scan the farmer chooses to save becomes an entry in a timeline for that farm or hive. The AI suggests a record (for example, "Possible aphid damage on Block B") and the farmer taps to confirm. Nothing is recorded as done unless the farmer says it was done.
4. **Reminders.** The farmer can set reminders for inspections, planting, treatments and harvests, and mark them done, postponed or dismissed.
5. **Farmer profile (extended).** Each farmer signs in through Supabase Auth with an email magic link and receives a unique Think Bee farmer ID. Optional OAuth providers may be enabled later. They add their farm or apiary details, such as location, crops, and number and type of hives, and can register more than one farm. Each farmer now also has a chat profile that other farmers can see, with a name, photo and short bio. The farmer controls what it shows.
6. **Community chat (new).** Farmers can message each other one to one, join groups and larger communities around a place, crop or topic. Admins create the groups and communities and assign roles. Farmers can share text, photos from the camera or gallery, voice notes and scan results.
7. **Location-aware weather and daily briefing.** With permission, the Home screen shows current local weather and a short daily briefing that explains how conditions affect scheduled farm tasks and hive inspections. A saved farm location works when live GPS is not available.
8. **Predictive weather and pest-risk alerts.** The app warns about unsafe spraying or hive-inspection weather and can flag weather patterns that may raise pest or fungal risk. These are risk indicators, never diagnoses, and always show the weather freshness and uncertainty.

## Community chat

Community chat lets farmers talk to each other inside Think Bee, the way they already do on Telegram, but with their farm profile, scans and reminders in the same app. Peer advice stays clearly separate from AI advice and from expert advice.

### Three ways to talk

| Space | Who is in it | How it works |
| --- | --- | --- |
| Direct chat | Two farmers | Private one-to-one messages. Any farmer can start one from a profile, a group member list, or by entering a farmer ID. |
| Group | A small circle, such as a village, a cooperative, or a hive-sharing team | Created by an admin, who names it, adds a photo and invites members. Private by default: people join by invite link or code, or are added by an admin. |
| Community | A larger space around a place, a crop or a topic, such as "Cocoa farmers in Ondo" or "Beekeeping beginners" | Created and run by admins. Members can read and post, or admins can limit posting to announcements. Can be public (anyone can find and join) or private. A community can hold several topic rooms, for example one for pests and one for market prices. |

### Admins and roles

Only admins create groups, communities and topic rooms. Admins also assign and change roles. Every role change appears in the chat as a short system message, so members can see who holds which role. A group or community cannot be left without an admin: the last admin must name a successor before leaving.

| Role | Who holds it | What they can do |
| --- | --- | --- |
| Think Bee admin | The Macaney or Think Bee team | Create groups, communities and topic rooms. Assign any role in any space. Handle reports, suspend accounts and close groups. |
| Space admin | Appointed by a Think Bee admin or by another admin of that space | Run one group or community: create topic rooms, invite and remove members, assign moderators and members, pin messages, set rules and posting limits. |
| Moderator | Appointed by a space admin | Remove messages, photos and voice notes, mute members for a set time, and review reports in that space. Cannot change roles. |
| Member | Any farmer who joins | Read and post as the space allows, report content, mute the space, and leave. |

### What farmers can send

- **Text messages**, with reply and quote.
- **Photos from the camera or the gallery.** The camera opens inside chat, so a farmer can photograph a crop or hive and send it at once, or pick one or more existing images to upload. The farmer sees a preview, can add a caption, and can send several images in one message. Photos are compressed before upload so they work on weak signal.
- **Voice notes.** Press and hold to record, release to send, slide away to cancel. The receiver sees the length and can play and pause. Because a voice note is just audio between two people, it works in any language, including Igbo, Yoruba and Hausa. The AI does not listen to or transcribe voice notes in the MVP.
- **A scan result** shared from their history. The shared card keeps the AI's wording: likely cause, how sure it was, and the reminder to check labels and consult an expert. Farmers cannot edit it before sharing.
- **Delete their own messages.** Admins and moderators can remove anyone's message, photo or voice note in their space.

The app asks for camera, microphone and photo-gallery access only when the farmer first uses that feature. If they say no, the rest of the app still works.

### Profiles

Every farmer has a chat profile separate from their private farm records. It shows a display name, an optional photo, a short bio, and the general area (state or local government area, never exact farm coordinates). Farmers may choose to show crops or hive type. Their authentication email address is never part of the public profile. Farm records, scans, reminders and exact locations are never visible to other farmers unless the farmer shares a specific item.

A farmer can have one profile that works across all their farms. Farmers find each other by Think Bee farmer ID or through shared groups and communities.

### Safety and moderation

Chat adds risks that the rest of the app does not have: bad farming advice repeated as fact, scams, harassment and spam. The MVP includes:

- Report a message, person, group or community from a long-press menu.
- Block a person, so they cannot message the farmer or add them to groups.
- Mute a group or community without leaving it.
- Admin and moderator tools, by role (see above): remove a member, remove a message, photo or voice note, pin a message, and set community rules.
- A short rules screen shown when a farmer first joins a community.
- A standing notice in groups and communities that advice from other members is not expert advice, and that serious or uncertain cases need an extension officer or expert.
- A Think Bee review team that handles reports and can suspend an account or close a group. Who staffs this is a decision for Macaney (see below).

### Notifications and weak signal

Farmers get a push notification for new messages, with per-group mute. Chat needs a connection to send and receive. Without signal the farmer can still open the app and read messages already loaded, and can write messages that wait in the outbox and send automatically when the connection returns. Sent photos and voice notes show an upload status so the farmer knows whether they went. Voice notes are compressed to use little data.

### The AI in chat

In this MVP the AI does not read group conversations and does not post in groups on its own. A farmer can share a scan result into a chat, and can ask the AI a question from their own private screen. This keeps group chats from becoming a source of unreviewed AI answers. Photos sent in chat are not analysed by the AI unless the farmer runs a scan on them. An AI helper that members can summon inside a group is listed under "Not in the MVP".

### Starting limits

These are proposals for the pilot, to adjust after testing, not promises: a cap on members per group and per community, a cap on photo size and on the number of images per message, and a cap on voice note length. Macaney and the team will set the numbers before build.

## How the AI works

The app sends the farmer's photo or question, plus relevant farm details, past records and privacy-reduced weather context, to Google Gemini and shows the answer. Daily briefings use the same controlled prompt layer. No model training is needed for the MVP. The quality of the advice depends on the AI service, weather freshness and the instructions we give it.

Because wrong advice can harm crops and kill bee colonies, the AI follows these rules:

- It presents results as likely causes, never as confirmed diagnoses.
- It states how sure it is and asks for more information or a clearer photo when the evidence is weak.
- It warns about risks to bees and other pollinators whenever it suggests a pest treatment.
- It reminds the farmer to check product labels and local rules before using any chemical, and to consult an extension officer or expert for serious or uncertain cases.
- It never claims to detect conditions that a photo cannot show reliably, such as queen status or swarming from sound.
- It treats weather as context, never proof of a disease or pest, and says when weather is stale or unavailable.
- It does not recommend opening a hive in rain, wind above 20 km/h or temperatures below 18°C, and it warns against spraying within four hours of rain or in high wind.

These rules also travel with any scan result a farmer shares in chat. The shared card cannot be stripped of its confidence level or its warnings.

The AI service is connected through a replaceable layer, so we can switch providers later without rebuilding the app. The app also keeps working for profiles, records, reminders and chat if the AI service is temporarily unavailable.

## Sign-up, login and offline use

**Sign-up and login.** The farmer enters an email address and Supabase Auth sends a magic link. Opening the link returns the farmer to Think Bee and starts the Supabase session. Optional OAuth providers may be enabled through configuration. The Think Bee API validates the Supabase access token, maps the Supabase user to a local account, and generates the unique farmer ID once. Supabase owns session persistence, refresh and authentication rate limits. An optional PIN or fingerprint lock protects the app if the device is shared or lost. The same account is used for chat, so the farmer's profile and groups follow them to another device after sign-in.

**Offline use.** The AI scan and the AI assistant need an internet connection, because the photo and question must reach the AI service. Chat also needs a connection to send and receive. Without signal, the farmer can still:

- open the app and view their saved history, reminders and messages already loaded
- write log entries as drafts, which sync automatically when the connection returns
- write chat messages, which wait in an outbox and send when the connection returns
- see a still-valid cached weather summary and briefing; otherwise the app clearly marks weather as unavailable offline

Full offline operation of the AI is not part of the MVP.

## Privacy and data

The app stores personal details, farm locations, photos and now messages, so it protects them from the start:

- Data is encrypted while traveling to and from the app and while stored.
- Location is captured only with the farmer's permission.
- Exact coordinates are used only for location-dependent features, are reduced to a two-decimal privacy cell before entering AI context or logs, and are never shown to other users.
- Farmer data is not shared with anyone else, including cooperatives and government bodies, without the farmer's consent.
- Farmers can correct their profile and request deletion of their account and data.
- Photos sent for analysis are handled under defined retention rules, and farmers are told how their photos are used.
- The product is reviewed against the Nigeria Data Protection Act 2023 before launch.
- The Think Bee farmer ID is an internal app identifier. It is not an official government registration number.

**Added for chat**

- Chat profiles show only what the farmer chooses. Authentication email addresses and exact farm locations are never shown.
- Messages are encrypted in transit and at rest. They are not end-to-end encrypted in the MVP, which means Think Bee's review team can look at reported messages. Farmers are told this plainly in the app.
- Farmers can delete their own messages. When an account is deleted, the profile is removed and the farmer's messages are removed or shown as from a deleted user, as decided in the review below.
- Photos and voice notes shared in chat follow their own retention rules, separate from scan photos, and farmers are told how long they are kept. Camera, microphone and gallery access is requested only when the farmer first uses it.
- Group admins can see who is in their group, but not members' private profile details or records.
- Blocking and reporting are available from day one, and reports are kept only as long as needed to act on them.
- The Nigeria Data Protection Act review covers chat, including how long messages are kept and what happens to a group when its owner leaves.

## Not in the MVP

These ideas are saved for later versions, once the core app has proven useful.

**From the original vision**

- Sound analysis of hives to detect queenlessness or swarming. This needs real recordings and validation, so it would require training our own model.
- Always-listening hands-free "Pocket Mode". Phones restrict background microphone use, so a start-and-stop voice mode comes first.
- Voice in Igbo, Yoruba, Hausa and French, each tested with real speakers before launch.
- The animated AI avatar and spoken onboarding.
- Flowering or nectar-flow calendars.
- Extension-officer and cooperative dashboards, and links to government registries.
- PDF and spreadsheet reports for lenders and extension officers.
- Running the AI fully offline on the phone.

**Chat features held back for later**

- Voice calls and video calls.
- End-to-end encryption.
- An AI helper that members can summon inside a group, and automatic AI summaries of conversations.
- Channels for one-way broadcasting to very large audiences, and verified badges for extension officers and cooperatives.
- Marketplace, buying and selling, and payments inside chat.
- Sending files other than photos, such as documents and spreadsheets.
- Message translation between languages, and turning voice notes into text.
- Message reactions, stickers, polls and status updates.

## Build phases

Timelines will be set once the decisions below are confirmed. Community chat is added as its own phase because it is the largest new piece of work and needs real-time messaging, moderation tools and safety review.

1. **Foundation.** Supabase email magic-link sign-in, farmer ID, farmer and farm profiles, and the app's basic structure and security.
2. **AI core.** The AI assistant, photo scans, location-aware weather context, daily briefings, predictive weather/pest-risk alerts, and the safety rules for AI answers.
3. **Records and reminders.** Saved scans, history timeline, draft entries that sync, and reminders.
4. **Community chat (new).** Chat profiles, direct chats, admin-created groups and communities, roles and admin tools, camera and image upload, voice notes, scan sharing, notifications, outbox for weak signal, reporting and blocking.
5. **Testing with real farmers.** A small pilot to check that advice is useful, that photos work in field conditions, that sign-up is smooth, and that chat groups stay useful and safe. Fixes from the pilot come before launch.

The AI advice should be reviewed by a beekeeping or agricultural expert before the app goes to the public. Moderation rules and the reporting process should be reviewed before chat opens to the public.

If the budget or timeline is tight, phase 4 can ship to the pilot in a lighter form (direct chats and private groups only) while public communities wait for the full moderation tools.

## How we will know it works

These are starting targets for the pilot, not promises, and will be adjusted after testing. A "useful" rating is not proof that the advice is correct. Advice quality will also be checked by an expert reviewing a sample of scans.

| Measure | Starting target |
| --- | --- |
| Farmers who finish registration after starting it | At least 70% |
| Pilot farmers who rate the advice as useful | At least 80% |
| Photo scans that return an answer or a clear explanation of why not | At least 95% |
| Saved records that sync without loss after being offline | At least 99% |
| Chat messages that arrive after being written offline | At least 99% |
| Crash-free sessions during the pilot | At least 99% |
| Farmers who return after 7 days and after 30 days | Tracked from launch |
| Pilot farmers who send a message in a group within 7 days of joining one | Tracked from pilot |
| Reports that are reviewed and answered | Tracked from pilot; the time limit is a decision for the review team |

## Decisions needed from Macaney

These answers will set the timeline and cost. The chat questions at the end are new.

- **Phone platform:** Android only, iPhone only, or both?
- **Launch market:** Nigeria only, or more countries?
- **Languages:** Is English enough for the MVP, or is one local language needed at launch?
- **Offline use:** Are saved drafts and an outbox enough, or must more work without signal?
- **Shared devices:** Can two farmers share one browser profile, or must they sign out to switch accounts?
- **Starting scope:** Which crops and which bee problems should the pilot focus on first?
- **Expert review:** Who will check the AI's advice for safety before public launch?
- **Pilot:** Where and with which farmers will the first testing happen?
- **Business model:** Free, subscription, or organisation-funded?
- **Budget:** Expected number of farmers and the monthly budget for AI usage and hosting.

**Chat decisions (new)**

- **First admins:** Who on the Macaney team will be Think Bee admins, and may space admins appoint further admins and moderators themselves?
- **Roles:** Are Think Bee admin, space admin, moderator and member enough, or do you need more, for example a verified badge for extension officers?
- **Public or private:** Should public, searchable communities exist at launch, or invite-only groups first?
- **Moderation:** Who will staff reports and suspensions during the pilot and after launch, and how fast must they respond?
- **Community structure:** Are communities organised by place, by crop or hive topic, or both?
- **Finding people:** Farmer ID is the launch default. Should public display-name search be added later?
- **Voice notes and images:** What is the longest voice note, how many images per message, and how long should both be kept?
- **Extension officers and cooperatives:** May they host communities in the MVP as ordinary members, or wait for the later dashboards?
- **Message retention:** How long should messages be kept, and what happens to a farmer's messages when they delete their account?
- **Under-18 users:** Is there a minimum age for chat?
- **Budget impact:** Chat, voice notes and image storage add real-time messaging, storage and moderation work to the budget and timeline. How should that be balanced against the AI core?
