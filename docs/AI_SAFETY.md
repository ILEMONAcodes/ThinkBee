# AI_SAFETY.md

Wrong advice can harm crops and kill bee colonies. These rules apply to every AI output in scans, in Ask Think Bee, and in any scan card shared to chat.

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
```
`GeminiProvider` implements it with the Google GenAI SDK, structured JSON output for scans, and the system prompt in `prompts/ai_system_prompt.md`. Providers can be swapped by config.

## Post-check (server side, after every AI response)
- Scan result must validate against the schema. One retry on invalid output, then return a "could not analyse" result with a reason.
- `overall_confidence` and `label_notice` must be present.
- If `next_steps` or free text mentions treatment words (treat, spray, apply, acaricide, pesticide, fungicide, insecticide, oxalic, formic, and similar), `pollinator_warning` and `expert_referral` must be non-empty. If not, the server adds the fixed copy.
- Block phrases such as "confirmed", "definitely", "diagnosis is" in likely cause text (replace with hedged wording or reject and retry).
- Reject and log any claim about queen status or swarming from a photo.
- Save `prompt_version` and `model` with each result for audit.

## Prompt versioning
`prompts/ai_system_prompt.md` carries a version and `reviewed_by` line. A prompt change requires re-running `api/tests/ai_evals/` and, before public launch, expert sign-off.

## Cost and limits
Daily per-user limits from settings. Downscale images before sending. Cache nothing that contains personal data. If the provider is down, return a clear message and keep queued scans for retry.
