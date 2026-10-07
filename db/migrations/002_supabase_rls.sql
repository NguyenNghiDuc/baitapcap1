BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE;
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);

CREATE OR REPLACE FUNCTION public.current_app_user_id()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$ SELECT id FROM users WHERE auth_user_id=(SELECT auth.uid()) LIMIT 1 $$;

CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$ SELECT role FROM users WHERE auth_user_id=(SELECT auth.uid()) LIMIT 1 $$;

CREATE OR REPLACE FUNCTION public.can_access_student(target_student TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$
  SELECT
    target_student = public.current_app_user_id()
    OR EXISTS (
      SELECT 1 FROM users p
      WHERE p.id=public.current_app_user_id()
        AND p.role='parent'
        AND p.children ? target_student
    )
    OR EXISTS (
      SELECT 1 FROM classes c
      JOIN class_students cs ON cs.class_id=c.id
      WHERE c.teacher_id=public.current_app_user_id()
        AND cs.student_id=target_student
    )
    OR public.current_app_role()='admin'
$$;

REVOKE ALL ON FUNCTION public.current_app_user_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_app_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_student(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_app_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_app_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_student(TEXT) TO authenticated;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','classes','class_students','assignments','submissions','results','notifications','materials','question_bank','exam_rooms','exam_settings','push_subscriptions','feedback','student_works']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('REVOKE ALL ON TABLE %I FROM anon, authenticated',t);
  END LOOP;
END $$;

GRANT SELECT,UPDATE ON users TO authenticated;
GRANT SELECT ON classes,class_students,assignments,materials,question_bank,exam_rooms,exam_settings TO authenticated;
GRANT SELECT,INSERT,UPDATE ON submissions,results,notifications,push_subscriptions,feedback,student_works TO authenticated;

DROP POLICY IF EXISTS users_select ON users;
CREATE POLICY users_select ON users FOR SELECT TO authenticated
USING (
 id=public.current_app_user_id()
 OR public.current_app_role()='admin'
 OR public.can_access_student(id)
);

DROP POLICY IF EXISTS users_update_self ON users;
CREATE POLICY users_update_self ON users FOR UPDATE TO authenticated
USING (id=public.current_app_user_id())
WITH CHECK (id=public.current_app_user_id());

DROP POLICY IF EXISTS classes_select ON classes;
CREATE POLICY classes_select ON classes FOR SELECT TO authenticated
USING (
 teacher_id=public.current_app_user_id()
 OR public.current_app_role()='admin'
 OR EXISTS(SELECT 1 FROM class_students cs WHERE cs.class_id=classes.id AND cs.student_id=public.current_app_user_id())
);

DROP POLICY IF EXISTS class_students_select ON class_students;
CREATE POLICY class_students_select ON class_students FOR SELECT TO authenticated
USING (
 student_id=public.current_app_user_id()
 OR EXISTS(SELECT 1 FROM classes c WHERE c.id=class_students.class_id AND c.teacher_id=public.current_app_user_id())
 OR public.current_app_role()='admin'
);

DROP POLICY IF EXISTS assignments_select ON assignments;
CREATE POLICY assignments_select ON assignments FOR SELECT TO authenticated
USING (
 teacher_id=public.current_app_user_id()
 OR public.current_app_role()='admin'
 OR EXISTS(SELECT 1 FROM class_students cs WHERE cs.class_id=assignments.class_id AND cs.student_id=public.current_app_user_id())
);

DROP POLICY IF EXISTS submissions_select ON submissions;
CREATE POLICY submissions_select ON submissions FOR SELECT TO authenticated
USING (
 public.can_access_student(student_id)
 OR public.current_app_role()='admin'
);

DROP POLICY IF EXISTS submissions_insert_self ON submissions;
CREATE POLICY submissions_insert_self ON submissions FOR INSERT TO authenticated
WITH CHECK (student_id=public.current_app_user_id());

DROP POLICY IF EXISTS submissions_update_teacher ON submissions;
CREATE POLICY submissions_update_teacher ON submissions FOR UPDATE TO authenticated
USING (
 public.current_app_role()='admin'
 OR EXISTS(
  SELECT 1 FROM assignments a
  WHERE a.id=submissions.assignment_id
    AND a.teacher_id=public.current_app_user_id()
 )
);

DROP POLICY IF EXISTS results_select ON results;
CREATE POLICY results_select ON results FOR SELECT TO authenticated
USING (public.can_access_student(user_id));

DROP POLICY IF EXISTS results_insert_self ON results;
CREATE POLICY results_insert_self ON results FOR INSERT TO authenticated
WITH CHECK (user_id=public.current_app_user_id());

DROP POLICY IF EXISTS notifications_select ON notifications;
CREATE POLICY notifications_select ON notifications FOR SELECT TO authenticated
USING (user_id=public.current_app_user_id() OR public.current_app_role()='admin');

DROP POLICY IF EXISTS notifications_update_self ON notifications;
CREATE POLICY notifications_update_self ON notifications FOR UPDATE TO authenticated
USING (user_id=public.current_app_user_id())
WITH CHECK (user_id=public.current_app_user_id());

DROP POLICY IF EXISTS materials_select ON materials;
CREATE POLICY materials_select ON materials FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS question_bank_select ON question_bank;
CREATE POLICY question_bank_select ON question_bank FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS exam_rooms_select ON exam_rooms;
CREATE POLICY exam_rooms_select ON exam_rooms FOR SELECT TO authenticated
USING (
 teacher_id=public.current_app_user_id()
 OR public.current_app_role()='admin'
 OR participants ? public.current_app_user_id()
);

DROP POLICY IF EXISTS exam_settings_select ON exam_settings;
CREATE POLICY exam_settings_select ON exam_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS push_subscriptions_self ON push_subscriptions;
CREATE POLICY push_subscriptions_self ON push_subscriptions FOR ALL TO authenticated
USING (user_id=public.current_app_user_id())
WITH CHECK (user_id=public.current_app_user_id());

DROP POLICY IF EXISTS feedback_insert_self ON feedback;
CREATE POLICY feedback_insert_self ON feedback FOR INSERT TO authenticated
WITH CHECK (user_id=public.current_app_user_id());

DROP POLICY IF EXISTS feedback_select_admin ON feedback;
CREATE POLICY feedback_select_admin ON feedback FOR SELECT TO authenticated
USING (public.current_app_role()='admin');

DROP POLICY IF EXISTS student_works_self ON student_works;
CREATE POLICY student_works_self ON student_works FOR SELECT TO authenticated
USING (public.can_access_student(user_id));

DROP POLICY IF EXISTS student_works_insert_self ON student_works;
CREATE POLICY student_works_insert_self ON student_works FOR INSERT TO authenticated
WITH CHECK (user_id=public.current_app_user_id());

COMMIT;
