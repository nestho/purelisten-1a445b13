import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getComfortTool from "./tools/get-comfort";
import leadStatsTool from "./tools/lead-stats";
import listLeadsTool from "./tools/list-leads";
import submitLeadTool from "./tools/submit-lead";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "purelisten",
  title: "purelisten",
  version: "0.1.0",
  instructions:
    "Tools for purelisten, a service connecting people who need to talk with empathetic listeners. Use `get_comfort` for a gentle grounding message or breathing exercise, `submit_lead` to join the waitlist, and `list_leads` / `lead_stats` for waitlist data (admin accounts only).",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getComfortTool, submitLeadTool, listLeadsTool, leadStatsTool],
});
