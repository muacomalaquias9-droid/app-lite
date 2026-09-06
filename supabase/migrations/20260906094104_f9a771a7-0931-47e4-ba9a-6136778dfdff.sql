CREATE POLICY "Users upload own identity files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'identity-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users read own identity files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'identity-docs' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY "Users delete own identity files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'identity-docs' AND (storage.foldername(name))[1] = auth.uid()::text);