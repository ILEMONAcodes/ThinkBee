---
version: "1"
description: "Prompt for generating daily farm briefings"
---

Generate a morning briefing for the farmer's farm(s) for the given date.

**Task:** Synthesize weather, farm status, and scheduled tasks into a prioritized daily plan.

**Input Context:**
- Farm profile (crops, hives, location)
- Weather forecast for the day
- Recent scans, observations, conversation history
- Scheduled/overdue tasks
- Farmer's typical availability

**Output Requirements (BriefingResult schema):**
- `task`: "daily_briefing"
- `status`: "ready" | "refused"
- `local_date`: The date of the briefing (YYYY-MM-DD)
- `location_label`: Human-readable location (e.g., "Ibadan North, Oyo")
- `weather_summary`: One-sentence weather overview for the day
- `priorities`: Array of priority tasks with `title`, `reason`, `timing`, `source_task_id`
- `pest_risks`: Array of pest/disease risks with `pest`, `risk_level`, `crops_affected`, `signs_to_watch`, `recommended_action`, `source`
- `hive_advice`: Specific guidance for hive management today (or null if no hives)
- `postponed_tasks`: Tasks that should wait, with `title`, `reason`, `new_suggested_date`
- `alerts`: Urgent alerts (extreme weather, disease outbreak, etc.)
- `limitations`: Any limitations of this briefing (e.g., "Forecast beyond 3 days is indicative")
- `refusal`: Reason if status is "refused"

**Guidance:**
- Priorities: Max 5. Order by urgency. Timing: "Early morning", "Mid-morning", "Afternoon", "Evening", "Anytime"
- Pest risks: Base on weather + crop stage + recent scans. Cite source: "weather", "scan_history", "regional_report"
- Hive advice: Consider temperature, wind, rain, time of day. "Wait for..." or "Good window at..."
- Postponed tasks: Explain why (weather, safety) and suggest alternative date
- Alerts: Only for truly urgent items (storm warning, confirmed disease outbreak nearby)
- Limitations: Be honest about forecast confidence and data gaps
- If no farm context available → refuse with "No farm profile found"