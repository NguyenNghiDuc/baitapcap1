BEGIN;
-- Supabase JWTs can remain cryptographically valid after an Admin lock.
-- These guards prevent locked actors from reading/writing shared Supabase tables directly.
CREATE OR REPLACE FUNCTION public.app_actor_active()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$ SELECT EXISTS(SELECT 1 FROM public.users WHERE auth_user_id=(SELECT auth.uid()) AND locked=false) $$;
REVOKE ALL ON FUNCTION public.app_actor_active() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_actor_active() TO authenticated;
CREATE OR REPLACE FUNCTION public.current_app_user_id()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$ SELECT id FROM public.users WHERE auth_user_id=(SELECT auth.uid()) AND locked=false LIMIT 1 $$;
CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$ SELECT role FROM public.users WHERE auth_user_id=(SELECT auth.uid()) AND locked=false LIMIT 1 $$;
-- Stop direct privilege escalation and forged graded results.
REVOKE UPDATE ON public.users FROM authenticated;
GRANT UPDATE(name,grade,avatar,student_sync,student_sync_updated_at) ON public.users TO authenticated;
REVOKE INSERT,UPDATE ON public.results FROM authenticated;
REVOKE INSERT,UPDATE ON public.notifications FROM authenticated;
GRANT UPDATE(read_at) ON public.notifications TO authenticated;
REVOKE INSERT,UPDATE ON public.submissions FROM authenticated;
-- User can submit answers, but cannot invent a teacher's score or feedback.
GRANT INSERT(id,assignment_id,student_id,answers,attempt) ON public.submissions TO authenticated;

DROP POLICY IF EXISTS materials_select ON public.materials;
CREATE POLICY materials_select ON public.materials FOR SELECT TO authenticated USING(public.app_actor_active());
DROP POLICY IF EXISTS question_bank_select ON public.question_bank;
CREATE POLICY question_bank_select ON public.question_bank FOR SELECT TO authenticated USING(public.app_actor_active());
DROP POLICY IF EXISTS exam_settings_select ON public.exam_settings;
CREATE POLICY exam_settings_select ON public.exam_settings FOR SELECT TO authenticated USING(public.app_actor_active());

DROP POLICY IF EXISTS materials_read ON storage.objects;
CREATE POLICY materials_read ON storage.objects FOR SELECT TO authenticated
USING(bucket_id='learning-materials' AND public.app_actor_active());
DROP POLICY IF EXISTS materials_write_teacher ON storage.objects;
CREATE POLICY materials_write_teacher ON storage.objects FOR INSERT TO authenticated
WITH CHECK(bucket_id='learning-materials' AND public.app_actor_active() AND public.current_app_role() IN ('teacher','admin'));
DROP POLICY IF EXISTS student_work_read ON storage.objects;
CREATE POLICY student_work_read ON storage.objects FOR SELECT TO authenticated
USING(bucket_id='student-work' AND public.app_actor_active() AND
 (owner_id=(SELECT auth.uid())::text OR public.current_app_role()='admin'
  OR EXISTS(SELECT 1 FROM public.users student WHERE student.auth_user_id::text=owner_id AND public.can_access_student(student.id))));
DROP POLICY IF EXISTS student_work_insert ON storage.objects;
CREATE POLICY student_work_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK(bucket_id='student-work' AND public.app_actor_active() AND (storage.foldername(name))[1]=(SELECT auth.uid())::text);
DROP POLICY IF EXISTS student_work_delete ON storage.objects;
CREATE POLICY student_work_delete ON storage.objects FOR DELETE TO authenticated
USING(bucket_id='student-work' AND public.app_actor_active() AND owner_id=(SELECT auth.uid())::text);
DROP POLICY IF EXISTS avatar_read_self ON storage.objects;
CREATE POLICY avatar_read_self ON storage.objects FOR SELECT TO authenticated
USING(bucket_id='avatars' AND public.app_actor_active() AND (storage.foldername(name))[1]=(SELECT auth.uid())::text);
DROP POLICY IF EXISTS avatar_insert_self ON storage.objects;
CREATE POLICY avatar_insert_self ON storage.objects FOR INSERT TO authenticated
WITH CHECK(bucket_id='avatars' AND public.app_actor_active() AND (storage.foldername(name))[1]=(SELECT auth.uid())::text);
DROP POLICY IF EXISTS avatar_update_self ON storage.objects;
CREATE POLICY avatar_update_self ON storage.objects FOR UPDATE TO authenticated
USING(bucket_id='avatars' AND public.app_actor_active() AND owner_id=(SELECT auth.uid())::text)
WITH CHECK(bucket_id='avatars' AND public.app_actor_active() AND owner_id=(SELECT auth.uid())::text);
DROP POLICY IF EXISTS avatar_delete_self ON storage.objects;
CREATE POLICY avatar_delete_self ON storage.objects FOR DELETE TO authenticated
USING(bucket_id='avatars' AND public.app_actor_active() AND owner_id=(SELECT auth.uid())::text);
COMMIT;
