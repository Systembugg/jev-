import type { GenSchema } from "./types";

/** Last-resort generic schema when no task pack and no LLM provider is available. */
export function templateSchema(goal: string): GenSchema {
  return {
    name: `Generic classifier`,
    description: `Auto-generated fallback for: ${goal.slice(0, 80)}. Start the translator (Ollama or a free API key) to get a task-specific schema.`,
    questions: [
      {
        id: "topic",
        type: "choice",
        question: `Which of these best matches the text's topic (task: ${goal.slice(0, 60)})`,
        options: {
          directly_relevant: "Clearly about the main subject of the task",
          loosely_related: "Touches the subject but is not really about it",
          unrelated: "About something completely different",
          unspecified: "Cannot tell from the text",
        },
      },
      {
        id: "clarity",
        type: "score",
        question: "How clear and well-specified is this text",
        scale: ["Vague or ambiguous", "Somewhat clear", "Very clear"],
      },
      { id: "actionable", type: "noul", question: "This text can be acted on right away" },
    ],
  };
}
