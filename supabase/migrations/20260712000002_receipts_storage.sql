-- Create a storage bucket for receipts if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for the storage bucket
-- For simplicity, since it's private, we'll use signed URLs or just allow authenticated users to read.
-- Actually, we'll allow authenticated users to read and the server (service role) to upload.
CREATE POLICY "Authenticated users can read receipts" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'receipts' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload receipts" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'receipts' AND auth.role() = 'authenticated');
