-- Quick fix for 035 - drop existing indexes first
DROP INDEX IF EXISTS idx_knowledge_shares_knowledge;
DROP INDEX IF EXISTS idx_knowledge_shares_contact;
DROP INDEX IF EXISTS idx_knowledge_shares_owner;
DROP INDEX IF EXISTS idx_knowledge_shares_token;
DROP INDEX IF EXISTS idx_knowledge_comments_knowledge;
DROP INDEX IF EXISTS idx_knowledge_comments_contact;
DROP INDEX IF EXISTS idx_knowledge_comments_visible;

-- Now create them
CREATE INDEX idx_knowledge_shares_knowledge ON knowledge_shares(knowledge_id);
CREATE INDEX idx_knowledge_shares_contact ON knowledge_shares(contact_id);
CREATE INDEX idx_knowledge_shares_owner ON knowledge_shares(owner_id);
CREATE INDEX idx_knowledge_shares_token ON knowledge_shares(share_token);
CREATE INDEX idx_knowledge_comments_knowledge ON knowledge_comments(knowledge_id);
CREATE INDEX idx_knowledge_comments_contact ON knowledge_comments(contact_id);
CREATE INDEX idx_knowledge_comments_visible ON knowledge_comments(knowledge_id, created_at DESC) WHERE is_hidden = FALSE;
