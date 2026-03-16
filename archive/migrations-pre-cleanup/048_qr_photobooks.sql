-- ============================================================================
-- Migration: QR-Linked Photobooks
-- Created: 2026-02-23
-- Description: Photobook creation with QR codes linking to memories/wisdom
-- ============================================================================

-- ============================================
-- PHOTOBOOK PROJECTS (main photobook container)
-- ============================================
CREATE TABLE IF NOT EXISTS photobook_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Basic Info
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'draft' 
        CHECK (status IN ('draft', 'published', 'ordered', 'delivered')),
    
    -- Cover & Preview
    cover_image_url TEXT,
    cover_memory_id UUID REFERENCES memories(id) ON DELETE SET NULL,
    
    -- Page Count (calculated from pages)
    page_count INTEGER DEFAULT 0,
    
    -- Prodigi Order Info
    prodigi_order_id TEXT,
    prodigi_status TEXT,
    tracking_number TEXT,
    
    -- Print Configuration
    print_config JSONB DEFAULT '{
        "size": "8x8",
        "paper": "matte",
        "binding": "hardcover",
        "copies": 1
    }'::jsonb,
    
    -- Delivery
    delivery_address JSONB,
    
    -- Pricing
    estimated_price DECIMAL(10,2),
    final_price DECIMAL(10,2),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    ordered_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ
);

-- ============================================
-- PHOTOBOOK PAGES (individual pages)
-- ============================================
CREATE TABLE IF NOT EXISTS photobook_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES photobook_projects(id) ON DELETE CASCADE,
    
    -- Page Ordering
    page_number INTEGER NOT NULL,
    page_type TEXT NOT NULL DEFAULT 'content'
        CHECK (page_type IN ('cover', 'content', 'back_cover')),
    
    -- Layout Configuration
    layout_type TEXT NOT NULL DEFAULT 'single'
        CHECK (layout_type IN (
            'single',           -- One photo full page
            'double',           -- Two photos side by side
            'triple',           -- Three photos
            'quad',             -- Four photo grid
            'with_text',        -- Photo(s) with text area
            'full_bleed',       -- Photo bleeds to edges
            'qr_only',          -- QR code centered (for linking)
            'qr_with_photo',    -- Photo with QR code overlay
            'text_only'         -- Text/dedication page
        )),
    
    -- Page Content (JSON structure for flexibility)
    content_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    /*
    content_json structure:
    {
        "photos": [
            {
                "memory_id": "uuid",
                "media_id": "uuid",
                "file_url": "...",
                "crop": {"x": 0, "y": 0, "width": 100, "height": 100},
                "position": {"x": 0, "y": 0},
                "scale": 1.0
            }
        ],
        "text": {
            "title": "Page Title",
            "body": "Page description...",
            "position": "bottom",
            "font": "serif"
        },
        "qr_code": {
            "token": "uuid",
            "position": "bottom-right",
            "size": "medium"
        },
        "background": {
            "color": "#ffffff",
            "image_url": "..."
        }
    }
    */
    
    -- Linked Memory (for QR code)
    linked_memory_id UUID REFERENCES memories(id) ON DELETE SET NULL,
    linked_wisdom_id UUID, -- No FK - wisdom table may not exist yet
    
    -- QR Token (auto-generated)
    qr_token_id UUID,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(project_id, page_number)
);

-- ============================================
-- QR ACCESS TOKENS (for memory access via QR)
-- ============================================
CREATE TABLE IF NOT EXISTS qr_access_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- What is being shared
    memory_id UUID REFERENCES memories(id) ON DELETE CASCADE,
    wisdom_id UUID, -- No FK - wisdom table may not exist yet
    photobook_page_id UUID REFERENCES photobook_pages(id) ON DELETE CASCADE,
    
    -- Token (used in URL)
    token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    
    -- Access Control
    created_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    allowed_contact_ids UUID[] DEFAULT '{}'::UUID[], -- Contacts who can view
    allowed_user_ids UUID[] DEFAULT '{}'::UUID[],    -- Registered users who can view
    
    -- Access tracking
    is_public BOOLEAN DEFAULT FALSE, -- If true, anyone can view
    view_count INTEGER DEFAULT 0,
    max_views INTEGER, -- NULL = unlimited
    
    -- Expiration
    expires_at TIMESTAMPTZ,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    revoked_at TIMESTAMPTZ,
    revoked_reason TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure at least one content type is set
    CONSTRAINT qr_token_content_required CHECK (
        memory_id IS NOT NULL OR 
        wisdom_id IS NOT NULL OR 
        photobook_page_id IS NOT NULL
    )
);

-- ============================================
-- QR ACCESS LOGS (track who scanned what)
-- ============================================
CREATE TABLE IF NOT EXISTS qr_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_id UUID NOT NULL REFERENCES qr_access_tokens(id) ON DELETE CASCADE,
    
    -- Who accessed (may be anonymous)
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    
    -- Anonymous access info
    ip_address INET,
    user_agent TEXT,
    
    -- Access details
    accessed_at TIMESTAMPTZ DEFAULT NOW(),
    was_granted BOOLEAN DEFAULT FALSE,
    denial_reason TEXT,
    
    -- Location info (if available)
    geo_country TEXT,
    geo_city TEXT,
    geo_lat DECIMAL(10, 8),
    geo_lng DECIMAL(11, 8)
);

-- ============================================
-- PHOTOBOOK MEMORY SELECTIONS (intermediate table)
-- ============================================
CREATE TABLE IF NOT EXISTS photobook_memory_selections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES photobook_projects(id) ON DELETE CASCADE,
    memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
    
    -- Selection metadata
    selected_at TIMESTAMPTZ DEFAULT NOW(),
    sort_order INTEGER DEFAULT 0,
    
    -- QR Token for this specific memory
    qr_token_id UUID REFERENCES qr_access_tokens(id) ON DELETE SET NULL,
    
    UNIQUE(project_id, memory_id)
);

-- ============================================
-- INDEXES
-- ============================================

-- Photobook projects
CREATE INDEX IF NOT EXISTS idx_photobook_projects_user ON photobook_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_photobook_projects_status ON photobook_projects(status);
CREATE INDEX IF NOT EXISTS idx_photobook_projects_created ON photobook_projects(created_at DESC);

-- Photobook pages
CREATE INDEX IF NOT EXISTS idx_photobook_pages_project ON photobook_pages(project_id);
CREATE INDEX IF NOT EXISTS idx_photobook_pages_number ON photobook_pages(project_id, page_number);
CREATE INDEX IF NOT EXISTS idx_photobook_pages_memory ON photobook_pages(linked_memory_id);
CREATE INDEX IF NOT EXISTS idx_photobook_pages_wisdom ON photobook_pages(linked_wisdom_id);

-- QR access tokens
CREATE INDEX IF NOT EXISTS idx_qr_tokens_token ON qr_access_tokens(token);
CREATE INDEX IF NOT EXISTS idx_qr_tokens_memory ON qr_access_tokens(memory_id);
CREATE INDEX IF NOT EXISTS idx_qr_tokens_wisdom ON qr_access_tokens(wisdom_id);
CREATE INDEX IF NOT EXISTS idx_qr_tokens_active ON qr_access_tokens(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_qr_tokens_created_by ON qr_access_tokens(created_by_user_id);

-- QR access logs
CREATE INDEX IF NOT EXISTS idx_qr_access_logs_token ON qr_access_logs(token_id);
CREATE INDEX IF NOT EXISTS idx_qr_access_logs_user ON qr_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_qr_access_logs_accessed ON qr_access_logs(accessed_at DESC);

-- Photobook memory selections
CREATE INDEX IF NOT EXISTS idx_photobook_selections_project ON photobook_memory_selections(project_id);
CREATE INDEX IF NOT EXISTS idx_photobook_selections_memory ON photobook_memory_selections(memory_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE photobook_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE photobook_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE photobook_memory_selections ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------
-- PHOTOBOOK PROJECTS POLICIES
-- --------------------------------------------

DROP POLICY IF EXISTS "Users can view own photobook projects" ON photobook_projects;
CREATE POLICY "Users can view own photobook projects" ON photobook_projects
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create photobook projects" ON photobook_projects;
CREATE POLICY "Users can create photobook projects" ON photobook_projects
    FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own photobook projects" ON photobook_projects;
CREATE POLICY "Users can update own photobook projects" ON photobook_projects
    FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own photobook projects" ON photobook_projects;
CREATE POLICY "Users can delete own photobook projects" ON photobook_projects
    FOR DELETE USING (user_id = auth.uid());

-- --------------------------------------------
-- PHOTOBOOK PAGES POLICIES
-- --------------------------------------------

DROP POLICY IF EXISTS "Users can view pages in own projects" ON photobook_pages;
CREATE POLICY "Users can view pages in own projects" ON photobook_pages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM photobook_projects 
            WHERE id = project_id AND user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can manage pages in own projects" ON photobook_pages;
CREATE POLICY "Users can manage pages in own projects" ON photobook_pages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM photobook_projects 
            WHERE id = project_id AND user_id = auth.uid()
        )
    );

-- --------------------------------------------
-- QR ACCESS TOKENS POLICIES
-- --------------------------------------------

DROP POLICY IF EXISTS "Users can view own QR tokens" ON qr_access_tokens;
CREATE POLICY "Users can view own QR tokens" ON qr_access_tokens
    FOR SELECT USING (created_by_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create QR tokens" ON qr_access_tokens;
CREATE POLICY "Users can create QR tokens" ON qr_access_tokens
    FOR INSERT WITH CHECK (created_by_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own QR tokens" ON qr_access_tokens;
CREATE POLICY "Users can update own QR tokens" ON qr_access_tokens
    FOR UPDATE USING (created_by_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own QR tokens" ON qr_access_tokens;
CREATE POLICY "Users can delete own QR tokens" ON qr_access_tokens
    FOR DELETE USING (created_by_user_id = auth.uid());

-- Service role can view all tokens (for QR validation)
DROP POLICY IF EXISTS "Service role can view all QR tokens" ON qr_access_tokens;
CREATE POLICY "Service role can view all QR tokens" ON qr_access_tokens
    FOR SELECT USING (true);

-- --------------------------------------------
-- QR ACCESS LOGS POLICIES
-- --------------------------------------------

DROP POLICY IF EXISTS "Users can view logs for own tokens" ON qr_access_logs;
CREATE POLICY "Users can view logs for own tokens" ON qr_access_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM qr_access_tokens 
            WHERE id = token_id AND created_by_user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Service role can create access logs" ON qr_access_logs;
CREATE POLICY "Service role can create access logs" ON qr_access_logs
    FOR INSERT WITH CHECK (true);

-- --------------------------------------------
-- PHOTOBOOK MEMORY SELECTIONS POLICIES
-- --------------------------------------------

DROP POLICY IF EXISTS "Users can view own photobook selections" ON photobook_memory_selections;
CREATE POLICY "Users can view own photobook selections" ON photobook_memory_selections
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM photobook_projects 
            WHERE id = project_id AND user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can manage own photobook selections" ON photobook_memory_selections;
CREATE POLICY "Users can manage own photobook selections" ON photobook_memory_selections
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM photobook_projects 
            WHERE id = project_id AND user_id = auth.uid()
        )
    );

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update updated_at timestamps
DROP TRIGGER IF EXISTS photobook_projects_updated_at ON photobook_projects;
CREATE TRIGGER photobook_projects_updated_at
    BEFORE UPDATE ON photobook_projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS photobook_pages_updated_at ON photobook_pages;
CREATE TRIGGER photobook_pages_updated_at
    BEFORE UPDATE ON photobook_pages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS qr_access_tokens_updated_at ON qr_access_tokens;
CREATE TRIGGER qr_access_tokens_updated_at
    BEFORE UPDATE ON qr_access_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Update page count on photobook_pages changes
CREATE OR REPLACE FUNCTION update_photobook_page_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'DELETE' THEN
        UPDATE photobook_projects 
        SET page_count = (
            SELECT COUNT(*) FROM photobook_pages 
            WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
        ),
        updated_at = NOW()
        WHERE id = COALESCE(NEW.project_id, OLD.project_id);
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_photobook_page_count_trigger ON photobook_pages;
CREATE TRIGGER update_photobook_page_count_trigger
    AFTER INSERT OR DELETE ON photobook_pages
    FOR EACH ROW EXECUTE FUNCTION update_photobook_page_count();

-- Auto-create QR token when memory is added to photobook
CREATE OR REPLACE FUNCTION auto_create_qr_token_for_memory()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_token_id UUID;
    v_contact_ids UUID[];
BEGIN
    -- Get the user_id from the project
    SELECT user_id INTO v_user_id 
    FROM photobook_projects 
    WHERE id = NEW.project_id;
    
    -- Get contact IDs tagged in this memory
    SELECT array_agg(DISTINCT mft.contact_id)
    INTO v_contact_ids
    FROM memory_face_tags mft
    JOIN memory_media mm ON mm.id = mft.media_id
    WHERE mm.memory_id = NEW.memory_id
    AND mft.contact_id IS NOT NULL;
    
    -- Create QR access token
    INSERT INTO qr_access_tokens (
        memory_id,
        created_by_user_id,
        allowed_contact_ids,
        is_public,
        expires_at
    ) VALUES (
        NEW.memory_id,
        v_user_id,
        COALESCE(v_contact_ids, '{}'::UUID[]),
        false,
        NOW() + INTERVAL '1 year'
    )
    RETURNING id INTO v_token_id;
    
    -- Update the selection with the token
    NEW.qr_token_id := v_token_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_create_qr_token_trigger ON photobook_memory_selections;
CREATE TRIGGER auto_create_qr_token_trigger
    BEFORE INSERT ON photobook_memory_selections
    FOR EACH ROW EXECUTE FUNCTION auto_create_qr_token_for_memory();

-- Update QR token view count on access
CREATE OR REPLACE FUNCTION increment_qr_token_view_count(p_token UUID)
RETURNS VOID AS $$
    UPDATE qr_access_tokens 
    SET view_count = view_count + 1,
        updated_at = NOW()
    WHERE token = p_token;
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper: Check if user can access QR token content
CREATE OR REPLACE FUNCTION can_access_qr_token(
    p_token UUID,
    p_user_id UUID DEFAULT NULL,
    p_contact_email TEXT DEFAULT NULL
)
RETURNS TABLE (
    can_access BOOLEAN,
    token_id UUID,
    memory_id UUID,
    wisdom_id UUID,
    denial_reason TEXT
) AS $$
DECLARE
    v_token_record qr_access_tokens%ROWTYPE;
    v_contact_id UUID;
BEGIN
    -- Get token record
    SELECT * INTO v_token_record
    FROM qr_access_tokens
    WHERE token = p_token;
    
    IF v_token_record IS NULL THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, NULL::UUID, 'Token not found'::TEXT;
        RETURN;
    END IF;
    
    -- Check if token is active
    IF NOT v_token_record.is_active THEN
        RETURN QUERY SELECT false, v_token_record.id, v_token_record.memory_id, v_token_record.wisdom_id, 'Token revoked'::TEXT;
        RETURN;
    END IF;
    
    -- Check expiration
    IF v_token_record.expires_at IS NOT NULL AND v_token_record.expires_at < NOW() THEN
        RETURN QUERY SELECT false, v_token_record.id, v_token_record.memory_id, v_token_record.wisdom_id, 'Token expired'::TEXT;
        RETURN;
    END IF;
    
    -- Check max views
    IF v_token_record.max_views IS NOT NULL AND v_token_record.view_count >= v_token_record.max_views THEN
        RETURN QUERY SELECT false, v_token_record.id, v_token_record.memory_id, v_token_record.wisdom_id, 'Max views reached'::TEXT;
        RETURN;
    END IF;
    
    -- If public, grant access
    IF v_token_record.is_public THEN
        RETURN QUERY SELECT true, v_token_record.id, v_token_record.memory_id, v_token_record.wisdom_id, NULL::TEXT;
        RETURN;
    END IF;
    
    -- Check if user is in allowed_user_ids
    IF p_user_id IS NOT NULL AND p_user_id = ANY(v_token_record.allowed_user_ids) THEN
        RETURN QUERY SELECT true, v_token_record.id, v_token_record.memory_id, v_token_record.wisdom_id, NULL::TEXT;
        RETURN;
    END IF;
    
    -- Check if user is the creator
    IF p_user_id IS NOT NULL AND p_user_id = v_token_record.created_by_user_id THEN
        RETURN QUERY SELECT true, v_token_record.id, v_token_record.memory_id, v_token_record.wisdom_id, NULL::TEXT;
        RETURN;
    END IF;
    
    -- Check contact email
    IF p_contact_email IS NOT NULL THEN
        SELECT c.id INTO v_contact_id
        FROM contacts c
        WHERE c.email = p_contact_email
        AND c.id = ANY(v_token_record.allowed_contact_ids);
        
        IF v_contact_id IS NOT NULL THEN
            RETURN QUERY SELECT true, v_token_record.id, v_token_record.memory_id, v_token_record.wisdom_id, NULL::TEXT;
            RETURN;
        END IF;
    END IF;
    
    -- Access denied
    RETURN QUERY SELECT false, v_token_record.id, v_token_record.memory_id, v_token_record.wisdom_id, 'Not authorized'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE photobook_projects IS 'Photobook projects created by users';
COMMENT ON TABLE photobook_pages IS 'Individual pages within a photobook';
COMMENT ON TABLE qr_access_tokens IS 'Tokens for QR code access to memories/wisdom';
COMMENT ON TABLE qr_access_logs IS 'Audit log for QR code scans';
COMMENT ON TABLE photobook_memory_selections IS 'Memories selected for inclusion in a photobook';

COMMENT ON COLUMN photobook_pages.content_json IS 'JSON structure containing photos, text, QR code position, and layout data';
COMMENT ON COLUMN qr_access_tokens.allowed_contact_ids IS 'Array of contact IDs who can view via QR';
COMMENT ON COLUMN qr_access_tokens.allowed_user_ids IS 'Array of registered user IDs who can view';
COMMENT ON COLUMN qr_access_tokens.token IS 'UUID used in QR code URLs (https://app.yourstruly.love/m/{token})';
