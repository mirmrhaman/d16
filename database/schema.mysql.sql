-- D16 production schema for cPanel MySQL / MariaDB
-- Compatible target: MariaDB 10.5+ or MySQL 8.0+
--
-- Important:
-- * Generate UUIDs in the application (standard lowercase UUID strings).
-- * Store all DATETIME values in UTC; this replaces PostgreSQL TIMESTAMPTZ.
-- * Encrypt *_ciphertext values in the application with a KMS-managed key.
-- * Do not store plaintext passwords, session tokens, or OTP codes.
-- * For a fresh installation, apply database/migrations/001 through 005 after
--   this native schema. The CMS navigation lives in app_content, initialized by
--   001_secure_content.sql and seeded by 005_navigation.sql; no duplicate table
--   is needed. Existing installations should apply only pending migrations.

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS roles (
  id CHAR(36) CHARACTER SET ascii NOT NULL,
  role_key VARCHAR(64) NOT NULL,
  role_name VARCHAR(128) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_role_key (role_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) CHARACTER SET ascii NOT NULL,
  email_ciphertext MEDIUMBLOB NOT NULL,
  phone_ciphertext MEDIUMBLOB NULL,
  email_hash CHAR(64) CHARACTER SET ascii NOT NULL,
  phone_hash CHAR(64) CHARACTER SET ascii NULL,
  display_name VARCHAR(255) NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_verified TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email_hash (email_hash),
  KEY idx_users_phone_hash (phone_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_role_assignments (
  id CHAR(36) CHARACTER SET ascii NOT NULL,
  user_id CHAR(36) CHARACTER SET ascii NOT NULL,
  role_id CHAR(36) CHARACTER SET ascii NOT NULL,
  assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  assigned_by_user_id CHAR(36) CHARACTER SET ascii NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_role_assignments_user_role (user_id, role_id),
  KEY idx_user_role_assignments_role (role_id),
  KEY idx_user_role_assignments_assigned_by (assigned_by_user_id),
  CONSTRAINT fk_ura_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_ura_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT,
  CONSTRAINT fk_ura_assigned_by FOREIGN KEY (assigned_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mfa_methods (
  id CHAR(36) CHARACTER SET ascii NOT NULL,
  user_id CHAR(36) CHARACTER SET ascii NOT NULL,
  method_type ENUM('sms', 'email', 'totp') NOT NULL,
  destination_ciphertext MEDIUMBLOB NULL,
  destination_hash CHAR(64) CHARACTER SET ascii NULL,
  is_enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_mfa_methods_user (user_id),
  KEY idx_mfa_destination_hash (destination_hash),
  CONSTRAINT fk_mfa_methods_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mfa_challenges (
  id CHAR(36) CHARACTER SET ascii NOT NULL,
  user_id CHAR(36) CHARACTER SET ascii NOT NULL,
  mfa_method_id CHAR(36) CHARACTER SET ascii NULL,
  otp_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  consumed_at DATETIME NULL,
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_mfa_challenges_user_created (user_id, created_at),
  KEY idx_mfa_challenges_expires (expires_at),
  KEY idx_mfa_challenges_method (mfa_method_id),
  CONSTRAINT fk_mfa_challenges_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_mfa_challenges_method FOREIGN KEY (mfa_method_id) REFERENCES mfa_methods(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS auth_sessions (
  id CHAR(36) CHARACTER SET ascii NOT NULL,
  user_id CHAR(36) CHARACTER SET ascii NOT NULL,
  session_token_hash CHAR(64) CHARACTER SET ascii NOT NULL,
  user_agent TEXT NULL,
  ip_address VARCHAR(45) CHARACTER SET ascii NULL,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_auth_sessions_token_hash (session_token_hash),
  KEY idx_auth_sessions_user (user_id),
  KEY idx_auth_sessions_expires (expires_at),
  CONSTRAINT fk_auth_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS media_assets (
  id CHAR(36) CHARACTER SET ascii NOT NULL,
  storage_provider ENUM('s3', 'supabase', 'azure_blob', 'gcs') NOT NULL,
  bucket_name VARCHAR(255) NOT NULL,
  object_key VARCHAR(1024) NOT NULL,
  -- Fixed-size, case-sensitive identity avoids MySQL's 3072-byte index limit.
  object_location_hash BINARY(32) GENERATED ALWAYS AS (
    UNHEX(SHA2(CONCAT(LENGTH(storage_provider), ':', storage_provider,
                      LENGTH(bucket_name), ':', bucket_name,
                      LENGTH(object_key), ':', object_key), 256))
  ) STORED,
  public_url TEXT NULL,
  mime_type VARCHAR(255) NULL,
  size_bytes BIGINT NULL,
  checksum_sha256 CHAR(64) CHARACTER SET ascii NULL,
  uploaded_by_user_id CHAR(36) CHARACTER SET ascii NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_media_assets_location (object_location_hash),
  KEY idx_media_assets_uploaded_by (uploaded_by_user_id),
  CONSTRAINT fk_media_assets_uploaded_by FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS organization_profile (
  id CHAR(36) CHARACTER SET ascii NOT NULL,
  organization_name VARCHAR(255) NOT NULL DEFAULT 'D16 Interior',
  contact_email_ciphertext MEDIUMBLOB NULL,
  contact_email_hash CHAR(64) CHARACTER SET ascii NULL,
  contact_phone_ciphertext MEDIUMBLOB NULL,
  contact_phone_hash CHAR(64) CHARACTER SET ascii NULL,
  address TEXT NULL,
  working_hours TEXT NULL,
  theme_color CHAR(7) CHARACTER SET ascii NULL,
  logo_asset_id CHAR(36) CHARACTER SET ascii NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_org_contact_email_hash (contact_email_hash),
  KEY idx_org_contact_phone_hash (contact_phone_hash),
  KEY idx_org_logo_asset (logo_asset_id),
  CONSTRAINT chk_org_theme_color CHECK (theme_color IS NULL OR theme_color REGEXP '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT fk_org_logo_asset FOREIGN KEY (logo_asset_id) REFERENCES media_assets(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS organization_locations (
  id CHAR(36) CHARACTER SET ascii NOT NULL,
  organization_profile_id CHAR(36) CHARACTER SET ascii NOT NULL,
  location_name VARCHAR(255) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_organization_location (organization_profile_id, location_name),
  CONSTRAINT fk_organization_locations_profile FOREIGN KEY (organization_profile_id) REFERENCES organization_profile(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hero_slides (
  id CHAR(36) CHARACTER SET ascii NOT NULL,
  title VARCHAR(255) NOT NULL,
  subtitle TEXT NOT NULL,
  image_asset_id CHAR(36) CHARACTER SET ascii NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_hero_slides_order (sort_order),
  KEY idx_hero_slides_image_asset (image_asset_id),
  CONSTRAINT fk_hero_slides_image_asset FOREIGN KEY (image_asset_id) REFERENCES media_assets(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stats (
  id CHAR(36) CHARACTER SET ascii NOT NULL,
  label VARCHAR(255) NOT NULL,
  value_text VARCHAR(255) NOT NULL,
  icon_key VARCHAR(100) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_stats_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS services (
  id CHAR(36) CHARACTER SET ascii NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  image_asset_id CHAR(36) CHARACTER SET ascii NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_services_order (sort_order),
  KEY idx_services_image_asset (image_asset_id),
  CONSTRAINT fk_services_image_asset FOREIGN KEY (image_asset_id) REFERENCES media_assets(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS service_features (
  id CHAR(36) CHARACTER SET ascii NOT NULL,
  service_id CHAR(36) CHARACTER SET ascii NOT NULL,
  feature_text VARCHAR(500) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_service_feature (service_id, feature_text),
  CONSTRAINT fk_service_features_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS projects (
  id CHAR(36) CHARACTER SET ascii NOT NULL,
  title VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  project_type VARCHAR(100) NULL,
  style VARCHAR(100) NULL,
  area_text VARCHAR(100) NULL,
  category ENUM('residential', 'commercial', 'restaurant_cafe', 'other') NOT NULL,
  featured_image_asset_id CHAR(36) CHARACTER SET ascii NULL,
  description TEXT NULL,
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_projects_category (category),
  KEY idx_projects_featured (is_featured),
  KEY idx_projects_created_at (created_at),
  KEY idx_projects_featured_image (featured_image_asset_id),
  CONSTRAINT fk_projects_featured_image FOREIGN KEY (featured_image_asset_id) REFERENCES media_assets(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS project_gallery_images (
  id CHAR(36) CHARACTER SET ascii NOT NULL,
  project_id CHAR(36) CHARACTER SET ascii NOT NULL,
  image_asset_id CHAR(36) CHARACTER SET ascii NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_project_gallery_image (project_id, image_asset_id),
  KEY idx_project_gallery_image_asset (image_asset_id),
  CONSTRAINT fk_project_gallery_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_project_gallery_image FOREIGN KEY (image_asset_id) REFERENCES media_assets(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS blog_posts (
  id CHAR(36) CHARACTER SET ascii NOT NULL,
  title VARCHAR(255) NOT NULL,
  excerpt TEXT NULL,
  content LONGTEXT NULL,
  category ENUM('interior_design', 'kitchen_design', 'office_design', 'furniture', 'tips') NULL,
  featured_image_asset_id CHAR(36) CHARACTER SET ascii NULL,
  author_user_id CHAR(36) CHARACTER SET ascii NULL,
  author_display_name VARCHAR(255) NULL,
  published_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_blog_posts_published_at (published_at),
  KEY idx_blog_posts_category (category),
  KEY idx_blog_posts_featured_image (featured_image_asset_id),
  KEY idx_blog_posts_author (author_user_id),
  CONSTRAINT fk_blog_posts_featured_image FOREIGN KEY (featured_image_asset_id) REFERENCES media_assets(id) ON DELETE SET NULL,
  CONSTRAINT fk_blog_posts_author FOREIGN KEY (author_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS consultation_requests (
  id CHAR(36) CHARACTER SET ascii NOT NULL,
  full_name_ciphertext MEDIUMBLOB NOT NULL,
  email_ciphertext MEDIUMBLOB NOT NULL,
  phone_ciphertext MEDIUMBLOB NOT NULL,
  email_hash CHAR(64) CHARACTER SET ascii NULL,
  phone_hash CHAR(64) CHARACTER SET ascii NULL,
  project_type ENUM('residential', 'commercial', 'restaurant', 'office', 'other') NULL,
  location VARCHAR(255) NULL,
  budget VARCHAR(100) NULL,
  message TEXT NULL,
  preferred_date DATE NULL,
  status ENUM('pending', 'contacted', 'in_progress', 'completed') NOT NULL DEFAULT 'pending',
  created_by_user_id CHAR(36) CHARACTER SET ascii NULL,
  assigned_to_user_id CHAR(36) CHARACTER SET ascii NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_consultation_status (status),
  KEY idx_consultation_created_at (created_at),
  KEY idx_consultation_email_hash (email_hash),
  KEY idx_consultation_phone_hash (phone_hash),
  KEY idx_consultation_created_by (created_by_user_id),
  KEY idx_consultation_assigned_to (assigned_to_user_id),
  CONSTRAINT fk_consultations_created_by FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_consultations_assigned_to FOREIGN KEY (assigned_to_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gallery_videos (
  id CHAR(36) CHARACTER SET ascii NOT NULL,
  title VARCHAR(255) NOT NULL,
  thumbnail_asset_id CHAR(36) CHARACTER SET ascii NULL,
  video_asset_id CHAR(36) CHARACTER SET ascii NULL,
  external_video_url TEXT NULL,
  duration_label VARCHAR(50) NULL,
  category VARCHAR(100) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_gallery_videos_order (sort_order),
  KEY idx_gallery_videos_thumbnail (thumbnail_asset_id),
  KEY idx_gallery_videos_video (video_asset_id),
  CONSTRAINT fk_gallery_videos_thumbnail FOREIGN KEY (thumbnail_asset_id) REFERENCES media_assets(id) ON DELETE SET NULL,
  CONSTRAINT fk_gallery_videos_video FOREIGN KEY (video_asset_id) REFERENCES media_assets(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gallery_concepts (
  id CHAR(36) CHARACTER SET ascii NOT NULL,
  slug VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  image_asset_id CHAR(36) CHARACTER SET ascii NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_gallery_concepts_slug (slug),
  KEY idx_gallery_concepts_order (sort_order),
  KEY idx_gallery_concepts_image_asset (image_asset_id),
  CONSTRAINT fk_gallery_concepts_image FOREIGN KEY (image_asset_id) REFERENCES media_assets(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gallery_concept_features (
  id CHAR(36) CHARACTER SET ascii NOT NULL,
  gallery_concept_id CHAR(36) CHARACTER SET ascii NOT NULL,
  feature_text VARCHAR(500) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_gallery_concept_feature (gallery_concept_id, feature_text),
  CONSTRAINT fk_gallery_concept_features_concept FOREIGN KEY (gallery_concept_id) REFERENCES gallery_concepts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS permissions (
  id CHAR(36) CHARACTER SET ascii NOT NULL,
  permission_key VARCHAR(100) NOT NULL,
  description TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_permissions_permission_key (permission_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS role_permissions (
  id CHAR(36) CHARACTER SET ascii NOT NULL,
  role_id CHAR(36) CHARACTER SET ascii NOT NULL,
  permission_id CHAR(36) CHARACTER SET ascii NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_role_permission (role_id, permission_id),
  KEY idx_role_permissions_permission (permission_id),
  CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id CHAR(36) CHARACTER SET ascii NOT NULL,
  actor_user_id CHAR(36) CHARACTER SET ascii NULL,
  action VARCHAR(100) NOT NULL,
  entity_name VARCHAR(100) NOT NULL,
  entity_id CHAR(36) CHARACTER SET ascii NULL,
  old_data JSON NULL,
  new_data JSON NULL,
  ip_address VARCHAR(45) CHARACTER SET ascii NULL,
  user_agent TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_logs_entity (entity_name, entity_id),
  KEY idx_audit_logs_actor_created (actor_user_id, created_at),
  CONSTRAINT fk_audit_logs_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Fixed UUIDs make this baseline idempotent and allow the role/permission links
-- to be seeded without relying on a database-specific UUID default.
INSERT IGNORE INTO roles (id, role_key, role_name) VALUES
  ('00000000-0000-4000-8000-000000000001', 'admin', 'Administrator'),
  ('00000000-0000-4000-8000-000000000002', 'super', 'Super User'),
  ('00000000-0000-4000-8000-000000000003', 'viewer', 'Viewer');

INSERT IGNORE INTO permissions (id, permission_key, description) VALUES
  ('00000000-0000-4000-8000-000000000101', 'content.read', 'Read content data'),
  ('00000000-0000-4000-8000-000000000102', 'content.write', 'Create/update/delete content'),
  ('00000000-0000-4000-8000-000000000103', 'users.manage', 'Manage users and roles'),
  ('00000000-0000-4000-8000-000000000104', 'consultations.read', 'Read consultation requests'),
  ('00000000-0000-4000-8000-000000000105', 'consultations.write', 'Update consultation status'),
  ('00000000-0000-4000-8000-000000000106', 'branding.write', 'Update logo/theme/contact branding');

-- Admin receives all permissions.
INSERT IGNORE INTO role_permissions (id, role_id, permission_id)
SELECT UUID(), r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.role_key = 'admin';

-- Super receives content, branding, and consultation permissions.
INSERT IGNORE INTO role_permissions (id, role_id, permission_id)
SELECT UUID(), r.id, p.id
FROM roles r JOIN permissions p
  ON p.permission_key IN ('content.read', 'content.write', 'consultations.read', 'consultations.write', 'branding.write')
WHERE r.role_key = 'super';

-- Viewer is read-only.
INSERT IGNORE INTO role_permissions (id, role_id, permission_id)
SELECT UUID(), r.id, p.id
FROM roles r JOIN permissions p ON p.permission_key = 'content.read'
WHERE r.role_key = 'viewer';

SET FOREIGN_KEY_CHECKS = 1;
