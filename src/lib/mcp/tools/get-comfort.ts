import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

const MESSAGES = [
  "You don't have to have the words. Just being here is enough.",
  "Whatever you're carrying today, you don't have to carry it alone.",
  "Feelings are visitors. Let them sit with you; they will move on.",
  "You have survived every hard day so far. That is not nothing.",
  "Rest is not quitting. Slow is still forward.",
  "Someone would be glad you're still here. Including future you.",
  "It's okay if today was only about getting through it.",
  "Your pain is real, and it is not the whole of you.",
];

const BREATHING = [
  "Find a comfortable seat and let your shoulders drop.",
  "Breathe in through your nose for 4 counts.",
  "Hold gently for 7 counts.",
  "Breathe out slowly through your mouth for 8 counts.",
  "Repeat 4 times. Notice how your body feels afterwards.",
];

export default defineTool({
  name: "get_comfort",
  title: "Get a comforting message",
  description:
    "Return a gentle, grounding message from purelisten, optionally with a guided 4-7-8 breathing exercise. Use when someone feels sad, anxious, or hopeless.",
  inputSchema: {
    include_breathing: z
      .boolean()
      .default(false)
      .describe("Also include the 4-7-8 breathing exercise steps."),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: ({ include_breathing }) => {
    const message = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
    const text = include_breathing
      ? `${message}\n\nA breathing exercise you can try now:\n${BREATHING.map((s, i) => `${i + 1}. ${s}`).join("\n")}`
      : message;

    return {
      content: [{ type: "text", text }],
      structuredContent: {
        message,
        breathing: include_breathing ? BREATHING : null,
      },
    };
  },
});
