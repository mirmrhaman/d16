-- Safe synthetic QA data for d16_qa.
-- No production or real-person data is included.
-- Confidential columns are deliberately not populated. Test encrypted fields
-- through the application using its QA-only encryption key.

SET NAMES utf8mb4;
SET time_zone = '+00:00';

INSERT IGNORE INTO media_assets (
  id, storage_provider, bucket_name, object_key, public_url, mime_type, size_bytes, checksum_sha256
) VALUES
  ('10000000-0000-4000-8000-000000000001', 's3', 'd16-qa-assets', 'images/qa-hero.jpg', 'https://example.invalid/qa-hero.jpg', 'image/jpeg', 120000, REPEAT('a', 64)),
  ('10000000-0000-4000-8000-000000000002', 's3', 'd16-qa-assets', 'images/qa-project.jpg', 'https://example.invalid/qa-project.jpg', 'image/jpeg', 180000, REPEAT('b', 64));

INSERT IGNORE INTO organization_profile (
  id, organization_name, address, working_hours, theme_color, logo_asset_id
) VALUES
  ('20000000-0000-4000-8000-000000000001', 'D16 Interior QA', 'QA environment - synthetic data only', 'Mon-Fri, 09:00-17:00 UTC', '#1F2937', '10000000-0000-4000-8000-000000000001');

INSERT IGNORE INTO organization_locations (id, organization_profile_id, location_name, sort_order) VALUES
  ('21000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'QA Demo Studio', 1);

INSERT IGNORE INTO hero_slides (id, title, subtitle, image_asset_id, sort_order, is_active) VALUES
  ('30000000-0000-4000-8000-000000000001', 'QA Interior Design', 'Synthetic content for quality assurance.', '10000000-0000-4000-8000-000000000001', 1, 1);

INSERT IGNORE INTO stats (id, label, value_text, icon_key, sort_order) VALUES
  ('31000000-0000-4000-8000-000000000001', 'QA Projects', '12', 'briefcase', 1),
  ('31000000-0000-4000-8000-000000000002', 'QA Team Members', '4', 'users', 2);

INSERT IGNORE INTO services (id, title, description, image_asset_id, sort_order) VALUES
  ('32000000-0000-4000-8000-000000000001', 'QA Space Planning', 'Synthetic service for UI and API testing.', '10000000-0000-4000-8000-000000000001', 1);

INSERT IGNORE INTO service_features (id, service_id, feature_text, sort_order) VALUES
  ('32100000-0000-4000-8000-000000000001', '32000000-0000-4000-8000-000000000001', 'Synthetic feature A', 1),
  ('32100000-0000-4000-8000-000000000002', '32000000-0000-4000-8000-000000000001', 'Synthetic feature B', 2);

INSERT IGNORE INTO projects (
  id, title, location, project_type, style, area_text, category, featured_image_asset_id, description, is_featured
) VALUES
  ('40000000-0000-4000-8000-000000000001', 'QA Demo Residence', 'Test City', 'Residential', 'Modern', '1200 sq ft', 'residential', '10000000-0000-4000-8000-000000000002', 'Synthetic project for testing.', 1);

INSERT IGNORE INTO project_gallery_images (id, project_id, image_asset_id, sort_order) VALUES
  ('41000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 1);

INSERT IGNORE INTO blog_posts (
  id, title, excerpt, content, category, featured_image_asset_id, author_display_name, published_at
) VALUES
  ('50000000-0000-4000-8000-000000000001', 'QA Design Notes', 'A synthetic blog post.', 'This content exists only to test the blog workflow.', 'tips', '10000000-0000-4000-8000-000000000001', 'QA Editor', UTC_TIMESTAMP());

INSERT IGNORE INTO gallery_videos (id, title, thumbnail_asset_id, external_video_url, duration_label, category, sort_order) VALUES
  ('60000000-0000-4000-8000-000000000001', 'QA Walkthrough', '10000000-0000-4000-8000-000000000001', 'https://example.invalid/qa-video', '00:30', 'demo', 1);

INSERT IGNORE INTO gallery_concepts (id, slug, title, description, image_asset_id, sort_order) VALUES
  ('61000000-0000-4000-8000-000000000001', 'qa-modern', 'QA Modern Concept', 'Synthetic gallery concept.', '10000000-0000-4000-8000-000000000002', 1);

INSERT IGNORE INTO gallery_concept_features (id, gallery_concept_id, feature_text, sort_order) VALUES
  ('61100000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000001', 'Synthetic lighting plan', 1);

INSERT IGNORE INTO audit_logs (id, actor_user_id, action, entity_name, entity_id, old_data, new_data, ip_address, user_agent) VALUES
  ('70000000-0000-4000-8000-000000000001', NULL, 'seed.created', 'projects', '40000000-0000-4000-8000-000000000001', NULL, JSON_OBJECT('environment', 'qa', 'source', 'synthetic'), '127.0.0.1', 'D16 QA seed');
