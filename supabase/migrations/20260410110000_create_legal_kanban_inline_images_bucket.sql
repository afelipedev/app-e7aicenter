INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'legal-kanban-inline-images',
    'legal-kanban-inline-images',
    true,
    5242880,
    ARRAY[
        'image/png',
        'image/jpeg',
        'image/webp',
        'image/gif',
        'image/svg+xml',
        'image/avif'
    ]
)
ON CONFLICT (id) DO UPDATE
SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Legal kanban inline images select" ON storage.objects;
CREATE POLICY "Legal kanban inline images select"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'legal-kanban-inline-images'
        AND public.is_legal_kanban_member()
    );

DROP POLICY IF EXISTS "Legal kanban inline images insert" ON storage.objects;
CREATE POLICY "Legal kanban inline images insert"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'legal-kanban-inline-images'
        AND public.is_legal_kanban_member()
    );

DROP POLICY IF EXISTS "Legal kanban inline images update" ON storage.objects;
CREATE POLICY "Legal kanban inline images update"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'legal-kanban-inline-images'
        AND public.is_legal_kanban_member()
    )
    WITH CHECK (
        bucket_id = 'legal-kanban-inline-images'
        AND public.is_legal_kanban_member()
    );

DROP POLICY IF EXISTS "Legal kanban inline images delete" ON storage.objects;
CREATE POLICY "Legal kanban inline images delete"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'legal-kanban-inline-images'
        AND public.is_legal_kanban_member()
    );
