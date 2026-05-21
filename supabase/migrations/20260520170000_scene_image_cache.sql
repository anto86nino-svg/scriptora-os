CREATE TABLE IF NOT EXISTS public.scene_image_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  chapter_index INTEGER NOT NULL,
  scene_hash TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'pro',
  provider TEXT NOT NULL DEFAULT 'fal',
  model TEXT NOT NULL DEFAULT 'fal-ai/flux/schnell',
  image_url TEXT NOT NULL,
  prompt TEXT NOT NULL,
  cost_usd NUMERIC(12, 8) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ready',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, project_id, chapter_index, scene_hash)
);

CREATE INDEX IF NOT EXISTS idx_scene_image_cache_user_created
  ON public.scene_image_cache(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scene_image_cache_project
  ON public.scene_image_cache(project_id, chapter_index);

ALTER TABLE public.scene_image_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scene images"
  ON public.scene_image_cache FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);

CREATE POLICY "Local dev read scene images"
  ON public.scene_image_cache FOR SELECT
  TO anon
  USING (user_id LIKE 'local-user-%' OR user_id = 'public-user');
