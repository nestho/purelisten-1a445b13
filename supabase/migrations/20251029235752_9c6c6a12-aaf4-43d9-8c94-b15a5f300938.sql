-- Create leads table to capture interested users
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure at least one contact method is provided
  CONSTRAINT contact_method_check CHECK (
    email IS NOT NULL OR phone IS NOT NULL
  )
);

-- Enable Row Level Security
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert leads (public signup)
CREATE POLICY "Anyone can submit leads"
ON public.leads
FOR INSERT
TO anon
WITH CHECK (true);

-- Only authenticated users can view leads (for admin purposes later)
CREATE POLICY "Only authenticated users can view leads"
ON public.leads
FOR SELECT
TO authenticated
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX idx_leads_email ON public.leads(email) WHERE email IS NOT NULL;

-- Add comment for documentation
COMMENT ON TABLE public.leads IS 'Stores lead information from users interested in the Listener service';