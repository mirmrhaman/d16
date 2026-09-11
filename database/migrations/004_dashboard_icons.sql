-- Add dashboard order and website icon overrides after migrations 001 through 003.
-- Existing rows and edits win on sequential reruns. No permission grants change.
SET NAMES utf8mb4;
SET time_zone = '+00:00';
START TRANSACTION;

INSERT INTO app_content(entity_type,id,payload)
SELECT 'DashboardLayout','79310606-6485-4cc3-ab09-d99d08d67f5e',
 JSON_OBJECT('title','Admin dashboard layout','card_order',JSON_ARRAY())
WHERE NOT EXISTS (SELECT 1 FROM app_content WHERE entity_type='DashboardLayout')
ON DUPLICATE KEY UPDATE id=VALUES(id);

INSERT INTO app_content(entity_type,id,payload)
SELECT 'WebsiteIcons','fb68d11f-55bc-4e6b-942f-f784dcb0c912',
 JSON_OBJECT('title','Website icons','icons',JSON_OBJECT())
WHERE NOT EXISTS (SELECT 1 FROM app_content WHERE entity_type='WebsiteIcons')
ON DUPLICATE KEY UPDATE id=VALUES(id);

INSERT INTO app_schema_migrations(version) VALUES ('004_dashboard_icons')
ON DUPLICATE KEY UPDATE version=VALUES(version);
COMMIT;
