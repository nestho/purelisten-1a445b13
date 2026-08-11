import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_leads",
  title: "List waitlist leads",
  description:
    "List the most recent waitlist leads (email/phone) captured on purelisten. Requires an admin account.",
  inputSchema: {
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .default(20)
      .describe("How many recent leads to return (1-100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("leads")
      .select("id, email, phone, created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);

    if (error) throw new ToolError(error.message);
    if (!data || data.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No leads visible. Lead access is restricted to admin accounts.",
          },
        ],
        structuredContent: { leads: [] },
      };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { leads: data },
    };
  },
});
