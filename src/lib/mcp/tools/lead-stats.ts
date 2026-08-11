import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "lead_stats",
  title: "Waitlist stats",
  description:
    "Summarize purelisten waitlist signups: total leads, and how many arrived in the last 7 days. Requires an admin account.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const supabase = supabaseForUser(ctx);

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [totalRes, weekRes] = await Promise.all([
      supabase.from("leads").select("id", { count: "exact", head: true }),
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since),
    ]);

    if (totalRes.error) throw new ToolError(totalRes.error.message);
    if (weekRes.error) throw new ToolError(weekRes.error.message);

    const stats = {
      total: totalRes.count ?? 0,
      last7Days: weekRes.count ?? 0,
    };

    return {
      content: [
        {
          type: "text",
          text: `Total leads: ${stats.total}\nLast 7 days: ${stats.last7Days}`,
        },
      ],
      structuredContent: stats,
    };
  },
});
