-- Fix missing RLS policies and WITH CHECK clauses

-- ============================================================================
-- Fix Storyteller tables - Add WITH CHECK for INSERT operations
-- ============================================================================

-- Characters: Drop and recreate with WITH CHECK
DROP POLICY IF EXISTS "Users can manage characters in their projects" ON public.characters;
CREATE POLICY "Users can manage characters in their projects" ON public.characters
    FOR ALL 
    USING (
        EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
    );

-- Episodes: Drop and recreate with WITH CHECK
DROP POLICY IF EXISTS "Users can manage episodes in their projects" ON public.episodes;
CREATE POLICY "Users can manage episodes in their projects" ON public.episodes
    FOR ALL 
    USING (
        EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
    );

-- Beats: Drop and recreate with WITH CHECK
DROP POLICY IF EXISTS "Users can manage beats in their episodes" ON public.beats;
CREATE POLICY "Users can manage beats in their episodes" ON public.beats
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.episodes e
            JOIN public.projects p ON e.project_id = p.id
            WHERE e.id = episode_id AND p.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.episodes e
            JOIN public.projects p ON e.project_id = p.id
            WHERE e.id = episode_id AND p.user_id = auth.uid()
        )
    );

-- Setups: Drop and recreate with WITH CHECK
DROP POLICY IF EXISTS "Users can manage setups in their projects" ON public.setups;
CREATE POLICY "Users can manage setups in their projects" ON public.setups
    FOR ALL 
    USING (
        EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
    );

-- Document Embeddings: Drop and recreate with WITH CHECK
DROP POLICY IF EXISTS "Users can manage embeddings in their projects" ON public.document_embeddings;
CREATE POLICY "Users can manage embeddings in their projects" ON public.document_embeddings
    FOR ALL 
    USING (
        EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
    );

-- ============================================================================
-- Fix Character State Snapshots - Add WITH CHECK
-- ============================================================================

DROP POLICY IF EXISTS "Users can manage character snapshots" ON public.character_state_snapshots;
CREATE POLICY "Users can manage character snapshots" ON public.character_state_snapshots
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.characters c
            JOIN public.projects p ON c.project_id = p.id
            WHERE c.id = character_id AND p.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.characters c
            JOIN public.projects p ON c.project_id = p.id
            WHERE c.id = character_id AND p.user_id = auth.uid()
        )
    );

-- ============================================================================
-- Fix Market Analysis sub-tables - Add missing DELETE policies
-- ============================================================================

-- market_analysis_reference_scores DELETE
CREATE POLICY "Users can delete own reference scores"
  ON market_analysis_reference_scores FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM market_analyses ma 
    WHERE ma.id = market_analysis_id AND ma.user_id = auth.uid()
  ));

-- market_analysis_market_size DELETE
CREATE POLICY "Users can delete own market size"
  ON market_analysis_market_size FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM market_analyses ma 
    WHERE ma.id = market_analysis_id AND ma.user_id = auth.uid()
  ));

-- market_analysis_audience_fit DELETE
CREATE POLICY "Users can delete own audience fit"
  ON market_analysis_audience_fit FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM market_analyses ma 
    WHERE ma.id = market_analysis_id AND ma.user_id = auth.uid()
  ));

-- market_analysis_competitors DELETE
CREATE POLICY "Users can delete own competitors"
  ON market_analysis_competitors FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM market_analyses ma 
    WHERE ma.id = market_analysis_id AND ma.user_id = auth.uid()
  ));

-- market_analysis_trends DELETE
CREATE POLICY "Users can delete own trends"
  ON market_analysis_trends FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM market_analyses ma 
    WHERE ma.id = market_analysis_id AND ma.user_id = auth.uid()
  ));

-- market_analysis_patterns DELETE
CREATE POLICY "Users can delete own patterns"
  ON market_analysis_patterns FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM market_analyses ma 
    WHERE ma.id = market_analysis_id AND ma.user_id = auth.uid()
  ));

