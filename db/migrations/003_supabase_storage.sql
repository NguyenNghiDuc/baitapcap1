BEGIN;

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES
 ('student-work','student-work',false,5242880,ARRAY['image/png','image/jpeg','application/pdf']),
 ('learning-materials','learning-materials',false,10485760,ARRAY['application/pdf','image/png','image/jpeg','audio/mpeg','audio/wav']),
 ('avatars','avatars',true,2097152,ARRAY['image/png','image/jpeg','image/webp'])
ON CONFLICT(id) DO NOTHING;

DROP POLICY IF EXISTS student_work_insert ON storage.objects;
CREATE POLICY student_work_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='student-work' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text);

DROP POLICY IF EXISTS student_work_read ON storage.objects;
CREATE POLICY student_work_read ON storage.objects FOR SELECT TO authenticated
USING (
 bucket_id='student-work'
 AND (
  owner_id=(SELECT auth.uid())::text
  OR public.current_app_role()='admin'
 )
);

DROP POLICY IF EXISTS student_work_delete ON storage.objects;
CREATE POLICY student_work_delete ON storage.objects FOR DELETE TO authenticated
USING (bucket_id='student-work' AND owner_id=(SELECT auth.uid())::text);

DROP POLICY IF EXISTS materials_read ON storage.objects;
CREATE POLICY materials_read ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='learning-materials');

DROP POLICY IF EXISTS materials_write_teacher ON storage.objects;
CREATE POLICY materials_write_teacher ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='learning-materials' AND public.current_app_role() IN ('teacher','admin'));

DROP POLICY IF EXISTS avatar_insert_self ON storage.objects;
CREATE POLICY avatar_insert_self ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='avatars' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text);

DROP POLICY IF EXISTS avatar_update_self ON storage.objects;
CREATE POLICY avatar_update_self ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id='avatars' AND owner_id=(SELECT auth.uid())::text)
WITH CHECK (bucket_id='avatars' AND owner_id=(SELECT auth.uid())::text);

COMMIT;
