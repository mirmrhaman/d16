-- D16 production schema
-- PostgreSQL 15+
-- Security goals:
-- 1) UUID (GUID) primary keys for all domain tables
-- 2) Correct foreign-key mapping
-- 3) Confidential fields stored as encrypted ciphertext (application-level envelope encryption)
-- 4) No plaintext passwords or OTP codes stored in DB

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- -----------------------------------------------------------------------------
-- Generic timestamp trigger
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- Auth and access control
-- -----------------------------------------------------------------------------
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key TEXT NOT NULL UNIQUE,
  role_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_roles_updated_at
BEFORE UPDATE ON roles
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Confidential (encrypted at app layer with KMS-managed key)
  email_ciphertext BYTEA NOT NULL,
  phone_ciphertext BYTEA,

  -- Deterministic, non-reversible hash indexes for lookup/uniqueness
  email_hash CHAR(64) NOT NULL UNIQUE,
  phone_hash CHAR(64),

  display_name TEXT,
  password_hash TEXT NOT NULL,

  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_users_phone_hash ON users(phone_hash);

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE user_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (user_id, role_id)
);

CREATE TABLE mfa_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  method_type TEXT NOT NULL CHECK (method_type IN ('sms', 'email', 'totp')),

  -- Destination is confidential and encrypted (phone/email)
  destination_ciphertext BYTEA,
  destination_hash CHAR(64),

  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mfa_destination_hash ON mfa_methods(destination_hash);

CREATE TRIGGER trg_mfa_methods_updated_at
BEFORE UPDATE ON mfa_methods
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE mfa_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mfa_method_id UUID REFERENCES mfa_methods(id) ON DELETE SET NULL,

  -- Never store OTP plaintext. Store one-way hash only.
  otp_hash TEXT NOT NULL,

  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mfa_challenges_user_created ON mfa_challenges(user_id, created_at DESC);

CREATE TABLE auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Store hash of refresh token or session token, not plaintext token.
  session_token_hash TEXT NOT NULL UNIQUE,

  user_agent TEXT,
  ip_address INET,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auth_sessions_user ON auth_sessions(user_id);
CREATE INDEX idx_auth_sessions_expires ON auth_sessions(expires_at);

-- -----------------------------------------------------------------------------
-- Shared media assets (images, logos, videos)
-- -----------------------------------------------------------------------------
CREATE TABLE media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_provider TEXT NOT NULL CHECK (storage_provider IN ('s3', 'supabase', 'azure_blob', 'gcs')),
  bucket_name TEXT NOT NULL,
  object_key TEXT NOT NULL,
  public_url TEXT,
  mime_type TEXT,
  size_bytes BIGINT,
  checksum_sha256 CHAR(64),
  uploaded_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (storage_provider, bucket_name, object_key)
);

CREATE TRIGGER trg_media_assets_updated_at
BEFORE UPDATE ON media_assets
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- Site branding / contact configuration
-- -----------------------------------------------------------------------------
CREATE TABLE organization_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name TEXT NOT NULL DEFAULT 'D16 Interior',

  -- Confidential contact fields encrypted
  contact_email_ciphertext BYTEA,
  contact_email_hash CHAR(64),
  contact_phone_ciphertext BYTEA,
  contact_phone_hash CHAR(64),

  address TEXT,
  working_hours TEXT,
  theme_color CHAR(7) CHECK (theme_color ~ '^#[0-9A-Fa-f]{6}$'),
  logo_asset_id UUID REFERENCES media_assets(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_org_contact_email_hash ON organization_profile(contact_email_hash);
CREATE INDEX idx_org_contact_phone_hash ON organization_profile(contact_phone_hash);

CREATE TRIGGER trg_organization_profile_updated_at
BEFORE UPDATE ON organization_profile
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE organization_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_profile_id UUID NOT NULL REFERENCES organization_profile(id) ON DELETE CASCADE,
  location_name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_profile_id, location_name)
);

-- -----------------------------------------------------------------------------
-- Home page entities
-- -----------------------------------------------------------------------------
CREATE TABLE hero_slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  image_asset_id UUID REFERENCES media_assets(id) ON DELETE SET NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hero_slides_order ON hero_slides(sort_order);

CREATE TRIGGER trg_hero_slides_updated_at
BEFORE UPDATE ON hero_slides
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  value_text TEXT NOT NULL,
  icon_key TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stats_order ON stats(sort_order);

CREATE TRIGGER trg_stats_updated_at
BEFORE UPDATE ON stats
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_asset_id UUID REFERENCES media_assets(id) ON DELETE SET NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_services_order ON services(sort_order);

CREATE TRIGGER trg_services_updated_at
BEFORE UPDATE ON services
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE service_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  feature_text TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (service_id, feature_text)
);

-- -----------------------------------------------------------------------------
-- Projects and portfolio
-- -----------------------------------------------------------------------------
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  location TEXT NOT NULL,
  project_type TEXT,
  style TEXT,
  area_text TEXT,
  category TEXT NOT NULL CHECK (category IN ('residential', 'commercial', 'restaurant_cafe', 'other')),
  featured_image_asset_id UUID REFERENCES media_assets(id) ON DELETE SET NULL,
  description TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_category ON projects(category);
CREATE INDEX idx_projects_featured ON projects(is_featured);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);

CREATE TRIGGER trg_projects_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE project_gallery_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  image_asset_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, image_asset_id)
);

-- -----------------------------------------------------------------------------
-- Blog
-- -----------------------------------------------------------------------------
CREATE TABLE blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT,
  category TEXT CHECK (category IN ('interior_design', 'kitchen_design', 'office_design', 'furniture', 'tips')),
  featured_image_asset_id UUID REFERENCES media_assets(id) ON DELETE SET NULL,
  author_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  author_display_name TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_blog_posts_published_at ON blog_posts(published_at DESC);
CREATE INDEX idx_blog_posts_category ON blog_posts(category);

CREATE TRIGGER trg_blog_posts_updated_at
BEFORE UPDATE ON blog_posts
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- Consultations (confidential)
-- -----------------------------------------------------------------------------
CREATE TABLE consultation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Confidential identity/contact
  full_name_ciphertext BYTEA NOT NULL,
  email_ciphertext BYTEA NOT NULL,
  phone_ciphertext BYTEA NOT NULL,

  -- Hash index for secure dedupe/search
  email_hash CHAR(64),
  phone_hash CHAR(64),

  project_type TEXT CHECK (project_type IN ('residential', 'commercial', 'restaurant', 'office', 'other')),
  location TEXT,
  budget TEXT,
  message TEXT,
  preferred_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'in_progress', 'completed')),

  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_consultation_status ON consultation_requests(status);
CREATE INDEX idx_consultation_created_at ON consultation_requests(created_at DESC);
CREATE INDEX idx_consultation_email_hash ON consultation_requests(email_hash);
CREATE INDEX idx_consultation_phone_hash ON consultation_requests(phone_hash);

CREATE TRIGGER trg_consultation_requests_updated_at
BEFORE UPDATE ON consultation_requests
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- Gallery
-- -----------------------------------------------------------------------------
CREATE TABLE gallery_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  thumbnail_asset_id UUID REFERENCES media_assets(id) ON DELETE SET NULL,
  video_asset_id UUID REFERENCES media_assets(id) ON DELETE SET NULL,
  external_video_url TEXT,
  duration_label TEXT,
  category TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gallery_videos_order ON gallery_videos(sort_order);

CREATE TRIGGER trg_gallery_videos_updated_at
BEFORE UPDATE ON gallery_videos
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE gallery_concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  image_asset_id UUID REFERENCES media_assets(id) ON DELETE SET NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gallery_concepts_order ON gallery_concepts(sort_order);

CREATE TRIGGER trg_gallery_concepts_updated_at
BEFORE UPDATE ON gallery_concepts
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE gallery_concept_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_concept_id UUID NOT NULL REFERENCES gallery_concepts(id) ON DELETE CASCADE,
  feature_text TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (gallery_concept_id, feature_text)
);

-- -----------------------------------------------------------------------------
-- Fine-grained access control (optional extension to role system)
-- -----------------------------------------------------------------------------
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_key TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  UNIQUE (role_id, permission_id)
);

-- -----------------------------------------------------------------------------
-- Auditing
-- -----------------------------------------------------------------------------
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_name TEXT NOT NULL,
  entity_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_name, entity_id);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_user_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- Seed baseline roles and permissions
-- -----------------------------------------------------------------------------
INSERT INTO roles (role_key, role_name) VALUES
  ('admin', 'Administrator'),
  ('super', 'Super User'),
  ('viewer', 'Viewer')
ON CONFLICT (role_key) DO NOTHING;

INSERT INTO permissions (permission_key, description) VALUES
  ('content.read', 'Read content data'),
  ('content.write', 'Create/update/delete content'),
  ('users.manage', 'Manage users and roles'),
  ('consultations.read', 'Read consultation requests'),
  ('consultations.write', 'Update consultation status'),
  ('branding.write', 'Update logo/theme/contact branding')
ON CONFLICT (permission_key) DO NOTHING;

-- Admin -> all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.role_key = 'admin'
ON CONFLICT DO NOTHING;

-- Super -> content + branding + consultations
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.permission_key IN ('content.read', 'content.write', 'consultations.read', 'consultations.write', 'branding.write')
WHERE r.role_key = 'super'
ON CONFLICT DO NOTHING;

-- Viewer -> read only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.permission_key IN ('content.read')
WHERE r.role_key = 'viewer'
ON CONFLICT DO NOTHING;

COMMIT;
