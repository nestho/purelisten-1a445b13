import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import AmbientBackground from "@/components/AmbientBackground";

type OAuthResult = {
  redirect_url?: string;
  redirect_to?: string;
  client?: { name?: string; client_id?: string; redirect_uris?: string[] };
  scope?: string;
  scopes?: string[];
};

type OAuthApi = {
  getAuthorizationDetails: (
    id: string,
  ) => Promise<{ data: OAuthResult | null; error: { message: string } | null }>;
  approveAuthorization: (
    id: string,
  ) => Promise<{ data: OAuthResult | null; error: { message: string } | null }>;
  denyAuthorization: (
    id: string,
  ) => Promise<{ data: OAuthResult | null; error: { message: string } | null }>;
};

const oauth = () =>
  (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

const SCOPE_LABELS: Record<string, string> = {
  openid: "Confirm your identity",
  email: "Share your email address",
  profile: "Share your basic profile",
};

const OAuthConsent = () => {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<OAuthResult | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Missing authorization_id");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      if (!active) return;
      setAccount(sess.session.user.email ?? null);

      const { data, error: detailsError } =
        await oauth().getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (detailsError) {
        setError(detailsError.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  const decide = async (approve: boolean) => {
    setBusy(true);
    const { data, error: decisionError } = approve
      ? await oauth().approveAuthorization(authorizationId)
      : await oauth().denyAuthorization(authorizationId);
    if (decisionError) {
      setBusy(false);
      setError(decisionError.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  };

  const clientName = details?.client?.name ?? "this app";
  const scopes =
    details?.scopes ?? (details?.scope ? details.scope.split(" ").filter(Boolean) : []);
  const redirectUri = details?.client?.redirect_uris?.[0];

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4">
      <AmbientBackground />
      <Card className="relative w-full max-w-md p-8 space-y-6 backdrop-blur-sm bg-card/90">
        {error ? (
          <>
            <h1 className="font-serif text-2xl">Could not load this request</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
          </>
        ) : !details ? (
          <p className="text-sm text-muted-foreground text-center">Loading…</p>
        ) : (
          <>
            <div className="space-y-2">
              <h1 className="font-serif text-2xl">
                Connect {clientName} to purelisten
              </h1>
              <p className="text-sm text-muted-foreground">
                {clientName} will be able to call purelisten's enabled tools while you are
                signed in.
              </p>
            </div>

            {account && (
              <p className="text-sm">
                Signed in as <span className="font-medium">{account}</span>
              </p>
            )}
            {redirectUri && (
              <p className="text-xs text-muted-foreground break-all">
                Redirects to {redirectUri}
              </p>
            )}

            {scopes.length > 0 && (
              <ul className="space-y-1 text-sm text-muted-foreground">
                {scopes.map((scope) => (
                  <li key={scope}>
                    • {SCOPE_LABELS[scope] ?? `Additional permission requested: ${scope}`}
                  </li>
                ))}
              </ul>
            )}

            <p className="text-xs text-muted-foreground">
              This does not bypass purelisten's permissions or backend policies.
            </p>

            <div className="flex gap-3">
              <Button className="flex-1" disabled={busy} onClick={() => decide(true)}>
                Approve
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                disabled={busy}
                onClick={() => decide(false)}
              >
                Cancel connection
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default OAuthConsent;
