---
version: "1"
description: "Prompt for asking clarifying questions"
---

The farmer's question is ambiguous or missing critical information. Ask focused clarifying questions.

**Task:** Generate 2-4 specific questions that would allow you to give a proper answer.

**Output:** Return an AnswerResult with:
- `task`: "question_answering"
- `status`: "clarification_needed"
- `answer`: Brief acknowledgment + the clarifying questions (numbered)
- `confidence`: "low"
- `context_used`: []
- `weather_summary`: ""
- `next_steps`: []
- `warnings`: []
- `follow_up_questions`: The clarifying questions as an array
- `refusal`: null

**Guidance:**
- Ask about: specific crop/hive, symptoms (what, where, when), recent actions (sprayed, planted, inspected), photos available
- Keep questions simple and answerable
- Don't ask more than 4 questions
- Make each question target a specific missing piece of info