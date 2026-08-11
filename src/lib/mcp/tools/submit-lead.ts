import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

const emailSchema = z.string().trim().email().max(255);
const phoneSchema = z.string().trim().regex(/^\+?[1-9]\d{7,14}$/);

export default defineTool({
  name: "submit_lead",
  title: "Join the waitlist",
  description:
    "Add an email address and/or phone number to the purelisten waitlist. At least one contact method is required.",
  inputSchema: {
    email: z.string().nullable().describe("Email address, or null."),
    phone: z
      .string()
      .nullable()
      .describe("Phone number in E.164-ish format (e.g. +14155551234), or null."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ email, phone }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");

    const cleanEmail = email?.trim() ? emailSchema.safeParse(email) : null;
    const cleanPhone = phone?.trim() ? phoneSchema.safeParse(phone) : null;

    if (cleanEmail && !cleanEmail.success) throw new ToolError("Invalid email address.");
    if (cleanPhone && !cleanPhone.success) throw new ToolError("Invalid phone number.");
    if (!cleanEmail && !cleanPhone) {
      throw new ToolError("Provide at least an email address or a phone number.");
    }

    const supabase = supabaseForUser(ctx);
    const { error } = await supabase.from("leads").insert({
      email: cleanEmail?.success ? cleanEmail.data : null,
      phone: cleanPhone?.success ? cleanPhone.data : null,
    });

    if (error) {
      if (error.code === "23505") {
        return {
          content: [{ type: "text", text: "That contact is already on the waitlist." }],
        };
      }
      throw new ToolError(error.message);
    }

    return { content: [{ type: "text", text: "Added to the purelisten waitlist." }] };
  },
});
