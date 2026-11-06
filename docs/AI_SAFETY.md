# AI_SAFETY.md

Wrong advice can harm crops and kill bee colonies. These rules apply to every AI output in scans, Ask Think Bee, daily briefings, predictive alerts and any scan card shared to chat. Prompt contracts and examples are in `docs/AI_PROMPTS.md`; weather rules are in `docs/AI_WEATHER_INTEGRATION.md`.

## Rules
1. Present likely causes, never confirmed diagnoses.
2. State confidence (low, medium, high). Ask for more information or a clearer photo when evidence is weak.
3. Whenever a pest or disease treatment is suggested, include a pollinator warning.
4. Always remind the farmer to check product labels and local rules before using any chemical, and to consult an extension officer or expert for serious or uncertain cases.
5. Never claim to detect what a photo cannot show reliably: queen status, swarming from sound, internal colony state without frames visible.
6. Use the farmer's saved farm details and history for context, and say when context was used.
7. Do not give dosage, mixing ratios or application rates for chemicals. Point to the product label and an expert.
8. If the question is outside farming and beekeeping, say so briefly and decline.
9. The AI does not read group chats, post in chats, or listen to voice notes.
10. Nothing is recorded as done without the farmer's confirmation.
11. Weather changes timing and risk guidance but never proves a diagnosis. State when weather is stale, missing or forecast-only.
12. Do not recommend hive inspection during rain, wind above 20 km/h or temperature below 18°C. Do not recommend spraying within four hours before rain or during high wind.
13. A fungal-risk alert requires humidity above 80% and temperature above 25°C across consecutive days, and must be described as elevated risk rather than disease.

## Fixed copy (do not rewrite)
- Label notice: "Check the product label and your local rules before using any chemical."
- Expert notice: "For serious or uncertain cases, speak to an extension officer or a beekeeping or crop expert."
- Pollinator warning: "This treatment can harm bees and other pollinators. Apply only when bees are not foraging, away from flowering plants, and follow the label."
- Peer advice notice (chat): "Advice from other members is not expert advice. For serious or uncertain cases, speak to an extension officer or an expert."
- Share notice on scan cards: "AI result. A likely cause, not a diagnosis."

## Provider layer
```python
class AIProvider(Protocol):
    async def analyze_scan(self, req: ScanRequest) -> ScanResult: ...
    async def answer_question(self, req: QuestionRequest) -> AnswerResult: ...
    def stream_answer(self, req: QuestionRequest) -> AsyncIterator[str]: ...
    async def generate_daily_briefing(self, req: BriefingRequest) -> BriefingResult: ...
```
`GeminiProvider` implements it with the Google GenAI SDK and structured JSON output for every task. The server combines `prompts/ai_system_prompt.md` with exactly one versioned task prompt. Providers can be swapped by config.

## Post-check (server side, after every AI response)
- Every result must validate against its schema in `docs/AI_PROMPTS.md`. One retry on invalid output, then return a safe fallback with a reason.
- `overall_confidence` and `label_notice` must be present.
- If `next_steps` or free text mentions treatment words (treat, spray, apply, acaricide, pesticide, fungicide, insecticide, oxalic, formic, and similar), the response must contain the fixed label, pollinator and expert notices in its task-specific safety fields. If not, the server adds them before delivery.
- Block phrases such as "confirmed", "definitely", "diagnosis is" in likely cause text (replace with hedged wording or reject and retry).
- Reject and log any claim about queen status or swarming from a photo.
- Save `prompt_version` and `model` with each result for audit.
- Reject advice that violates deterministic weather thresholds or turns a forecast into a diagnosis.
- Do not allow stale or unavailable weather to produce precise timing or predictive alerts.

## Prompt versioning
Every prompt Markdown file in `prompts/` carries a version and `reviewed_by` line. A prompt or schema change requires re-running `api/tests/ai_evals/` and, before public launch, expert sign-off.

## Cost and limits
Daily per-user limits from settings. Downscale images before sending. Cache nothing that contains personal data. If the provider is down, return a clear message and keep queued scans for retry.
