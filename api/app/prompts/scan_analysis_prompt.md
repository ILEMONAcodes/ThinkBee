---
version: "1"
description: "Prompt for analyzing crop/hive photos"
---

Analyze the provided photo(s) of a crop or beehive. The farmer may have added a note.

**Task:** Identify likely causes of any visible issues, assess confidence, and give practical next steps.

**Input Context:**
- Farm profile (state, LGA, crops, hive count/types)
- Location (privacy-preserving)
- Current and recent weather
- Recent scans and observations
- Farmer's note

**Output Requirements (ScanResult schema):**
- `task`: "scan_analysis"
- `status`: "completed" | "needs_better_photo" | "refused"
- `likely_causes`: Array of objects with `name`, `confidence` (high/medium/low), `reasoning`
- `overall_confidence`: high/medium/low
- `observations`: Array of factual observations from the photo
- `weather_relevance`: How current weather relates to the issue
- `needs_better_photo`: true if photo quality is insufficient
- `better_photo_hint`: Specific guidance for a better photo (angle, lighting, distance, part of plant/hive)
- `follow_up_questions`: Questions to narrow down diagnosis
- `next_steps`: Practical actions the farmer can take today/tomorrow
- `protective_gear_warning`: Required if next steps involve hive opening or chemicals
- `pollinator_warning`: Required if advice could harm bees
- `label_notice`: Standard reminder to check product labels and local rules
- `expert_referral`: When to consult an extension agent or vet
- `suggested_record`: Suggested log entry for the farmer's records
- `refusal`: Reason if status is "refused"
- `disclaimer_version`: "1"

**Guidance:**
- Look for: leaf discoloration, spots, holes, wilting, pests, disease signs, hive entrance activity, comb condition, brood pattern
- Consider weather: humidity favors fungal diseases; heat stresses crops; rain washes off treatments
- If photo is blurry, too dark, too far, or wrong angle → set `needs_better_photo: true` and give specific `better_photo_hint`
- Maximum 3 likely causes. Order by confidence.
- Confidence reflects visual evidence strength, not certainty.
- Always include `label_notice` and `disclaimer_version`.