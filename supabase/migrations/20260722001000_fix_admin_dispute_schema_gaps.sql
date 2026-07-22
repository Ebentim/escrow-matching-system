ALTER TYPE public.product_status ADD VALUE IF NOT EXISTS 'rejected';

ALTER TABLE public.disputes
ADD COLUMN IF NOT EXISTS description TEXT;
