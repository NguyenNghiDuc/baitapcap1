BEGIN;

DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') THEN
   CREATE PUBLICATION supabase_realtime;
 END IF;
END $$;

ALTER TABLE classes REPLICA IDENTITY FULL;
ALTER TABLE assignments REPLICA IDENTITY FULL;
ALTER TABLE submissions REPLICA IDENTITY FULL;
ALTER TABLE exam_rooms REPLICA IDENTITY FULL;
ALTER TABLE notifications REPLICA IDENTITY FULL;

DO $$
DECLARE t TEXT;
BEGIN
 FOREACH t IN ARRAY ARRAY['classes','assignments','submissions','exam_rooms','notifications']
 LOOP
   IF NOT EXISTS (
     SELECT 1 FROM pg_publication_tables
     WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t
   ) THEN
     EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',t);
   END IF;
 END LOOP;
END $$;

COMMIT;
