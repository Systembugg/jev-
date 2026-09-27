/** Prompt + JSON grammar for the tiny translator model (0.6B-class). */

export const SYSTEM_PROMPT = `You convert a plain-English description of a decision task into a "System One" question schema for the Jev model.

Jev answers typed questions about a piece of text:
- choice: pick exactly one of a fixed option list (each option needs a short criterion)
- score:  rate on an ordered rubric (2-7 steps)
- noul:   a yes/no probability

Rules:
- Criteria must be self-contained and non-overlapping.
- Every choice list must include an escape option like "unspecified" or "other".
- NEVER ask the model to extract values, count, or do date math — code handles that.
- Write 3 to 8 questions. Skip questions the task does not need.
- Use short snake_case ids.

Output ONLY JSON with this exact shape:
{"name":"...","description":"...","questions":[{"id":"...","type":"choice|score|noul","question":"...","options":{"option_id":"criterion"},"scale":["..."]}]}
- "options" only for choice, "scale" only for score. Omit both for noul.

Example task: "triage customer support tickets"
Example output:
{"name":"Support ticket triage","description":"Route tickets by topic and urgency.","questions":[{"id":"topic","type":"choice","question":"What is this ticket mainly about","options":{"billing":"Payments, invoices or refunds","bug":"Something is broken or erroring","account":"Login or account access","other":"Something else"}},{"id":"urgency","type":"score","question":"How urgent is this for the customer","scale":["Can wait","Soon","Immediately"]},{"id":"needs_human","type":"noul","question":"This ticket needs a human agent"}]}`;

export function buildUserPrompt(goal: string, sample?: string): string {
  const lines = [`Task: ${goal.trim()}`];
  if (sample?.trim()) lines.push(`Example input text: ${sample.trim()}`);
  lines.push("JSON:");
  return lines.join("\n");
}

export function buildRepairPrompt(prevUser: string, badOutput: string, error: string): string {
  return `${prevUser}

Your previous output was rejected (${error.slice(0, 160)}).
Fix it and output ONLY the corrected JSON. Previous output:
${badOutput.slice(0, 800)}`;
}

/** JSON-Schema grammar — enforced at decode time by Ollama (llama.cpp),
 *  so even a 0.6B model cannot emit structurally invalid JSON. */
export const GRAMMAR = {
  type: "object",
  properties: {
    name: { type: "string" },
    description: { type: "string" },
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          type: { type: "string", enum: ["choice", "score", "noul"] },
          question: { type: "string" },
          options: { type: "object", additionalProperties: { type: "string" } },
          scale: { type: "array", items: { type: "string" } },
        },
        required: ["id", "type", "question"],
      },
    },
  },
  required: ["name", "questions"],
};
