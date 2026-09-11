# Implemented data mapping — 2026-09-08

## Public CMS

After migration 001, `app_content` is the authoritative runtime store for HeroSlide, Stat/Stats, Service, Project, BlogPost, GalleryVideo, GalleryConcept and PicYourConcept. Each item has a server-generated UUID, allowlisted JSON payload, timestamps and an edit version. Nested service/concept sections and project image URL arrays round-trip without losing the published UI additions.

Native legacy content tables are preserved, not kept in two-way sync. Migration 001 copies initial public rows; later app edits update app_content. Internal identifiers in demo content are not database UUIDs.

Migration 003 adds AboutPage content (including approved public team profiles). Migration 004 adds separate singleton WebsiteIcons and DashboardLayout records in app_content. WebsiteIcons contains only approved built-in names/public image URLs; it is publicly readable. DashboardLayout contains ordered dashboard route names and is readable only by administrators. Both may be changed only by administrators, require edit versions, and record actual changed fields in attributed audit history.

ContactInfo uses `organization_profile` and `organization_locations`, with public branding/social metadata in app_content. Email and phone are encrypted in native ciphertext columns but intentionally decrypted for public business contact display.

## Confidential data

- Users: email/phone encrypted; passwords salted and hashed using scrypt; session tokens stored only as SHA-256 hashes.
- Consultations: name/email/phone encrypted in their native columns. Location, budget, message, preferred date and project type encrypted together in app_private_details; plaintext legacy columns are NULL for new writes.
- Only operational status, assignments, timestamps and record identifiers remain unencrypted for consultations.
- Team display names are visible to administrators and stored as display_name; do not put private biographical information there. Public business addresses, portfolio locations, service descriptions and published media URLs are intentionally public. Never paste client confidential information into public CMS fields.
- MFA provider enrollment/challenges are not implemented. Existing MFA-enabled accounts fail closed.

Encryption is backend-only AES-256-GCM envelope encryption: random data key per value, wrapped by the server master key, authenticated with entity/record/field context. A separate secret HMAC-SHA256 key supports normalized email/phone lookups. Keys currently come from server environment variables; cloud KMS/rotation is not implemented.

The browser never receives keys, password hashes or session tokens in JSON. Authorized admin responses do contain the minimum decrypted contact/consultation data needed to operate the site.

## Identity and change history

Server session identity supplies actor_user_id; browser-supplied actor identities are ignored. Authentication and mutations record audit entries in the same database transaction as their related writes. Audit failure rolls back those writes.

Audit records contain action, entity name/UUID, UTC timestamp, actor UUID, changed field NAMES, and request metadata. They do not contain before/after confidential values. Admin History resolves known actor UUIDs to current account display names; former users remain identifiable by UUID.

This is an attributed activity log, not full content version restoration, cryptographically tamper-proof logging or database-wide trigger auditing. Direct phpMyAdmin/DBA changes are not automatically logged by the application. Restrict direct edits and configure append-only runtime audit grants before release.

## Migration and deployment boundaries

- Public CMS extra fields are allowlisted; encrypted private fields are not copied into public JSON.
- Legacy raw-byte ciphertext is rejected. A backed-up, approved re-encryption migration is required before using those records.
- No remote schema, stored data, credentials, grants or encryption keys were modified by the synchronization task.
- Read QA_SETUP.md before operating the real hosted database.
