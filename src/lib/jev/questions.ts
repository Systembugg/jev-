/**
 * The Jev question schema — evaluated in parallel, one call, one forward pass.
 *
 * Rules (matching TypeSafe's guidance):
 *  - criteria self-contained and non-overlapping
 *  - every signal has an escape option ("unspecified" / none)
 *  - NEVER ask Jev to extract values, count, or do date math — code does that
 */

export type QuestionDef =
  | { type: "choice"; question: string; options: Record<string, string> }
  | { type: "score"; question: string; scale: string[] }
  | { type: "noul"; question: string };

export const questions: Record<string, QuestionDef> = {
  intent: {
    type: "choice",
    question: "What is the person trying to do with this text",
    options: {
      event:
        "Scheduling a meeting, meal, call or gathering at a time, usually with other people",
      reminder: "Asking to be reminded to do a single task themselves",
      todo: "Listing several separate things to do or buy",
      timer: "Starting a timer, countdown, focus session or stopwatch for a duration",
      habit: "Something they want to do repeatedly as a routine",
      weather: "Asking about the weather, temperature or forecast for a place",
      split: "Dividing an amount of money between several people",
      convert: "Converting a value from one unit or currency to another",
      calc: "A math calculation or percentage that is not splitting money",
      poll: "Asking a group or themselves to choose between two or more options",
      music: "Wanting to play or listen to a song, artist or music",
      search: "Looking for information on the web, a lookup or research request",
      note: "Writing a thought, idea or note that is none of the above",
      none: "Too short, unclear or unfinished to tell yet",
    },
  },
  readiness: {
    type: "score",
    question: "How complete is this input for what the person is trying to do",
    scale: [
      "Just started, key details missing",
      "Partially specified, some details present",
      "Fully specified, ready to act on",
    ],
  },
  isQuestion: {
    type: "noul",
    question: "The text is a question rather than an instruction or statement",
  },
  recurring: {
    type: "noul",
    question: "The text describes something that repeats on a schedule",
  },
  urgency: {
    type: "score",
    question: "How urgent or time-sensitive the text sounds",
    scale: [
      "Not urgent at all",
      "Somewhat time-sensitive",
      "Urgent, needs attention immediately",
    ],
  },
  musicVague: {
    type: "noul",
    question:
      "The music request is vague (e.g. 'play something chill') and not a specific song or artist",
  },
};

export const QUESTION_COUNT = Object.keys(questions).length;
