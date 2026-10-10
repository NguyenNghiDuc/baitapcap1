-- Avatar photos of children must not be publicly readable.
-- All image paths are stored under the authenticated Supabase UID.
BEGIN;
UPDATE storage.buckets SET public=false WHERE id='avatars';
DROP POLICY IF EXISTS avatar_read_self ON storage.objects;
CREATE POLICY avatar_read_self ON storage.objects FOR SELECT TO authenticated
 USING (bucket_id='avatars' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text);
DROP POLICY IF EXISTS avatar_insert_self ON storage.objects;
CREATE POLICY avatar_insert_self ON storage.objects FOR INSERT TO authenticated
 WITH CHECK (bucket_id='avatars' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text);
DROP POLICY IF EXISTS avatar_update_self ON storage.objects;
CREATE POLICY avatar_update_self ON storage.objects FOR UPDATE TO authenticated
 USING (bucket_id='avatars' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text)
 WITH CHECK (bucket_id='avatars' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text);
DROP POLICY IF EXISTS avatar_delete_self ON storage.objects;
CREATE POLICY avatar_delete_self ON storage.objects FOR DELETE TO authenticated
 USING (bucket_id='avatars' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text);
COMMIT;
