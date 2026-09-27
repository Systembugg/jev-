import type { GenSchema } from "./types";

export type TaskPack = {
  id: string;
  name: string;
  blurb: string;
  keywords: RegExp[];
  schema: GenSchema;
};

/**
 * Pre-made question libraries — regular users never write a single question.
 * The router maps an English goal to one of these in O(1) with zero models.
 */
export const PACKS: TaskPack[] = [
  {
    id: "support-triage",
    name: "Support ticket triage",
    blurb: "Sort customer tickets by topic, urgency and who should handle them.",
    keywords: [/support|ticket|complaint|help ?desk|customer service/i],
    schema: {
      name: "Support ticket triage",
      description: "Classify incoming support tickets for routing and prioritisation.",
      questions: [
        {
          id: "topic",
          type: "choice",
          question: "What is this support ticket mainly about",
          options: {
            billing: "Payments, invoices, refunds or subscription charges",
            bug: "Something is broken, erroring or not working as expected",
            account: "Login, password, profile or account access issues",
            feature_request: "Asking for new functionality or an improvement",
            how_to: "Asking how to do something with the product",
            praise: "Positive feedback with nothing to fix",
            unspecified: "Unclear or none of the above",
          },
        },
        {
          id: "urgency",
          type: "score",
          question: "How urgent is this ticket for the customer",
          scale: ["Can wait days", "Should be handled soon", "Blocking, needs immediate attention"],
        },
        { id: "needs_human", type: "noul", question: "This ticket needs a human support agent rather than an automated reply" },
        {
          id: "sentiment",
          type: "choice",
          question: "The emotional tone of the ticket",
          options: {
            calm: "Polite and matter-of-fact",
            frustrated: "Annoyed or impatient",
            angry: "Hostile or threatening to leave",
            happy: "Positive and friendly",
            unspecified: "Neutral or unclear",
          },
        },
      ],
    },
  },
  {
    id: "email-triage",
    name: "Email triage",
    blurb: "Decide what to do with each email: reply, later, archive or spam.",
    keywords: [/e-?mail|inbox|gmail|newsletter/i],
    schema: {
      name: "Email triage",
      description: "Choose the right folder/action for an email.",
      questions: [
        {
          id: "action",
          type: "choice",
          question: "The best action for this email",
          options: {
            reply_now: "Needs a reply soon",
            reply_later: "Needs a reply but not urgent",
            read_later: "Worth reading when there is time",
            archive: "No action needed, just keep",
            spam: "Unwanted marketing or junk",
            unspecified: "Cannot tell from the text",
          },
        },
        { id: "is_personal", type: "noul", question: "This email is from a real person rather than automated or bulk mail" },
        {
          id: "urgency",
          type: "score",
          question: "How time-sensitive this email is",
          scale: ["Not at all", "Mildly", "Very time-sensitive"],
        },
      ],
    },
  },
  {
    id: "expense",
    name: "Expense sorting",
    blurb: "Categorise spending entries for budgeting.",
    keywords: [/expense|spend|budget|money|receipts|finance/i],
    schema: {
      name: "Expense sorting",
      questions: [
        {
          id: "category",
          type: "choice",
          question: "What the money was spent on",
          options: {
            food: "Food, groceries, restaurants or drinks",
            transport: "Cabs, fuel, tickets or commuting",
            shopping: "Clothes, gadgets or other purchases",
            bills: "Rent, utilities, subscriptions or recharges",
            entertainment: "Movies, events, games or outings",
            health: "Medicine, doctor or fitness",
            other: "Something else or not about spending",
          },
        },
        { id: "is_shared", type: "noul", question: "The expense is shared with or split between other people" },
        {
          id: "size",
          type: "score",
          question: "How big this expense sounds relative to everyday spending",
          scale: ["Small everyday amount", "Noticeable", "Large purchase"],
        },
      ],
    },
  },
  {
    id: "habit",
    name: "Habit coach",
    blurb: "Turn routine goals into a trackable habit plan.",
    keywords: [/habit|routine|streak|daily|gym|journal/i],
    schema: {
      name: "Habit coach",
      questions: [
        {
          id: "frequency",
          type: "choice",
          question: "How often the habit should happen",
          options: {
            daily: "Every day",
            weekdays: "On weekdays or workdays",
            weekly: "Some times per week",
            monthly: "Monthly or less often",
            unspecified: "Not mentioned",
          },
        },
        {
          id: "time_of_day",
          type: "choice",
          question: "The time of day the habit should happen",
          options: {
            morning: "Morning",
            afternoon: "Afternoon",
            evening: "Evening or night",
            flexible: "Any time of day",
            unspecified: "Not mentioned",
          },
        },
        {
          id: "difficulty",
          type: "score",
          question: "How hard this habit sounds to maintain",
          scale: ["Very easy", "Moderate", "Hard to keep up"],
        },
      ],
    },
  },
  {
    id: "moderation",
    name: "Content moderation",
    blurb: "Flag unsafe or off-topic posts in a community.",
    keywords: [/moderat|community|comments|forum|unsafe|flag posts/i],
    schema: {
      name: "Content moderation",
      questions: [
        { id: "is_safe", type: "noul", question: "This content is safe to publish as-is" },
        {
          id: "violation",
          type: "choice",
          question: "The main rule this content breaks, if any",
          options: {
            spam: "Spam, ads or self-promotion",
            abuse: "Harassment, hate or personal attacks",
            nsfw: "Sexual or graphic content",
            misinformation: "Clearly false or misleading claims",
            fine: "Breaks no rules",
            unspecified: "Cannot tell",
          },
        },
        {
          id: "severity",
          type: "score",
          question: "How severe the violation is",
          scale: ["None or trivial", "Moderate", "Severe, remove immediately"],
        },
      ],
    },
  },
  {
    id: "mood-journal",
    name: "Mood journal",
    blurb: "Read the emotional weather from a journal entry.",
    keywords: [/mood|journal|diary|feelings|mental/i],
    schema: {
      name: "Mood journal",
      questions: [
        {
          id: "valence",
          type: "choice",
          question: "The overall mood of this entry",
          options: {
            very_low: "Clearly unhappy or distressed",
            low: "Somewhat down or tired",
            neutral: "Even, neither up nor down",
            good: "Content or positive",
            great: "Joyful or excited",
            unspecified: "Cannot tell",
          },
        },
        { id: "energy", type: "score", question: "How much energy the writer seems to have", scale: ["Drained", "Normal", "Energised"] },
        { id: "stress", type: "score", question: "How stressed the writer sounds", scale: ["Relaxed", "Mild tension", "Very stressed"] },
      ],
    },
  },
  {
    id: "music-mood",
    name: "Music picker",
    blurb: 'Understand "play something chill" — vibe, language and era from a vague ask.',
    keywords: [/music|song|playlist|vibe|dj|listen/i],
    schema: {
      name: "Music picker",
      description: "Turn a vague music request into searchable constraints.",
      questions: [
        {
          id: "vibe",
          type: "choice",
          question: "The vibe the person wants",
          options: {
            chill: "Relaxed, calm, lo-fi or acoustic",
            energetic: "Upbeat, gym, high energy",
            focus: "Instrumental or minimal, for concentration",
            party: "Danceable, loud, celebratory",
            sad: "Melancholy or emotional",
            happy: "Feel-good and cheerful",
            unspecified: "No clear vibe mentioned",
          },
        },
        {
          id: "language",
          type: "choice",
          question: "The language of the music",
          options: {
            english: "English-language songs",
            hindi: "Hindi or Bollywood songs",
            punjabi: "Punjabi songs",
            instrumental: "No lyrics",
            any: "Language does not matter or not mentioned",
          },
        },
        {
          id: "era",
          type: "choice",
          question: "The era the person wants",
          options: {
            latest: "Recent releases",
            throwback: "Older classics",
            any: "Any era or not mentioned",
          },
        },
        { id: "specific_named", type: "noul", question: "The request names a specific song, artist or album" },
      ],
    },
  },
];
