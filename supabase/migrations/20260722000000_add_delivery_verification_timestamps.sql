ALTER TABLE public.delivery_verifications
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

UPDATE public.delivery_verifications
SET created_at = NOW()
WHERE created_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_delivery_verifications_delivery_created
ON public.delivery_verifications (delivery_id, created_at DESC);
