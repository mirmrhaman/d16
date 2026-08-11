# Secure Data Mapping for D16

This document maps the current app data model to the production MySQL/MariaDB schema in database/schema.mysql.sql.

## 1) Entity Mapping (Current -> Target)

- HeroSlide -> hero_slides
  - image URL -> media_assets + hero_slides.image_asset_id
- Stats -> stats
- Service -> services + service_features
  - image URL -> media_assets + services.image_asset_id
  - features[] -> service_features rows
- Project -> projects + project_gallery_images
  - featured_image URL -> media_assets + projects.featured_image_asset_id
  - gallery_images[] -> project_gallery_images
- BlogPost -> blog_posts
  - featured_image URL -> media_assets + blog_posts.featured_image_asset_id
  - author -> users relation via author_user_id (and optional author_display_name)
- Consultation -> consultation_requests
  - full_name/email/phone -> encrypted ciphertext columns
  - searchable fields -> email_hash / phone_hash
- ContactInfo -> organization_profile + organization_locations
  - logo_url -> media_assets + organization_profile.logo_asset_id
  - theme_color -> organization_profile.theme_color
  - locations[] -> organization_locations rows
- AccessControl -> roles / permissions / role_permissions
- GalleryVideo -> gallery_videos
  - thumbnail/video URLs -> media_assets references
- GalleryConcept -> gallery_concepts + gallery_concept_features
  - id values like modern/classic become slug values
- User -> users + user_role_assignments + mfa_methods + mfa_challenges + auth_sessions

## 2) GUID and Foreign Key Rules

- Every domain table uses GUID stored as CHAR(36). Generate UUID in the application before insert.
- Child collections are normalized and linked by FK:
  - service_features.service_id -> services.id
  - project_gallery_images.project_id -> projects.id
  - gallery_concept_features.gallery_concept_id -> gallery_concepts.id
  - organization_locations.organization_profile_id -> organization_profile.id
- All media references are foreign keys to media_assets instead of raw URL strings.

## 3) Confidential Data Encryption

Encrypt at application layer using envelope encryption (recommended):

1. Generate one-time data key per record via cloud KMS.
2. Encrypt plaintext using AES-256-GCM in backend.
3. Store ciphertext + iv + auth_tag packed into MEDIUMBLOB columns (or structured binary format).
4. Store non-reversible SHA-256/HMAC hash for lookup/uniqueness when needed.

Fields that must be encrypted:
- users.email_ciphertext
- users.phone_ciphertext
- mfa_methods.destination_ciphertext
- organization_profile.contact_email_ciphertext
- organization_profile.contact_phone_ciphertext
- consultation_requests.full_name_ciphertext
- consultation_requests.email_ciphertext
- consultation_requests.phone_ciphertext

Never store plaintext for:
- password
- otp
- access token
- refresh token

Store instead:
- password_hash (Argon2id preferred)
- otp_hash + expiration
- session_token_hash

## 4) Decryption Rules (Correct and Safe)

- Decrypt only in backend service layer.
- Never decrypt in browser/client.
- Never log plaintext after decryption.
- Use least-privilege access for KMS keys.
- Return only minimum fields needed for UI.

## 5) Migration Sequence

1. Deploy schema.mysql.sql to cPanel MySQL/MariaDB.
2. Build backend API with:
  - auth endpoints
  - content CRUD endpoints
  - upload endpoints to object storage
3. Migrate seed/mock data from src/api/base44Client.js into new tables.
4. Replace base44 client calls with secure API calls.
5. Remove localStorage auth/session usage from frontend.

## 6) Connection and Secret Handling

- Keep DB credentials in server environment variables only.
- Never hardcode credentials in frontend code, SQL files, or committed config files.
- Rotate credentials immediately if they were shared in chat, screenshots, or commits.
- Restrict DB user grants to this app database only (no global privileges).

## 7) Immediate Security Fixes Required in Current App

Current frontend mock keeps sensitive values in code/localStorage and must not be used in production:
- Plain credentials and OTP values in src/api/base44Client.js
- Password validation in frontend code
- authUser session in localStorage

These are acceptable only for local mock development, not real deployment.
