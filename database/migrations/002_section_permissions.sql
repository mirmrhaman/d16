-- Add Super User section controls. Rerunning does NOT restore revoked grants.
SET NAMES utf8mb4;
SET time_zone = '+00:00';
START TRANSACTION;
INSERT INTO permissions (id, permission_key, description) VALUES
 ('00000000-0000-4000-8000-000000000201','section.hero_slides.write','Edit hero slides'),
 ('00000000-0000-4000-8000-000000000202','section.stats.write','Edit statistics'),
 ('00000000-0000-4000-8000-000000000203','section.services.write','Edit services'),
 ('00000000-0000-4000-8000-000000000204','section.projects.write','Edit projects'),
 ('00000000-0000-4000-8000-000000000205','section.blog_posts.write','Edit blog posts'),
 ('00000000-0000-4000-8000-000000000206','section.gallery.write','Edit gallery'),
 ('00000000-0000-4000-8000-000000000207','section.pic_your_concept.write','Edit Pic Your Concept')
ON DUPLICATE KEY UPDATE permission_key=VALUES(permission_key);

INSERT IGNORE INTO role_permissions(id,role_id,permission_id)
SELECT UUID(),r.id,p.id FROM roles r CROSS JOIN permissions p
WHERE r.role_key IN ('admin','super') AND p.permission_key IN (
 'section.hero_slides.write','section.stats.write','section.services.write',
 'section.projects.write','section.blog_posts.write','section.gallery.write','section.pic_your_concept.write')
AND NOT EXISTS (SELECT 1 FROM app_schema_migrations WHERE version='002_section_permissions');
INSERT INTO app_schema_migrations(version) VALUES ('002_section_permissions') ON DUPLICATE KEY UPDATE version=VALUES(version);
COMMIT;
