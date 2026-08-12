-- Public-safe waitlist count (no PII). Callable by anon for live UI.
CREATE OR REPLACE FUNCTION public.get_waitlist_count()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::bigint FROM public.leads;
$$;

GRANT EXECUTE ON FUNCTION public.get_waitlist_count() TO anon;
GRANT EXECUTE ON FUNCTION public.get_waitlist_count() TO authenticated;

COMMENT ON FUNCTION public.get_waitlist_count() IS 'Returns total waitlist signups for public live counter. No personal data.';
