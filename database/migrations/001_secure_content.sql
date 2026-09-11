-- Apply to dinterio_d16_qa after schema.mysql.sql and optional QA seed.
-- Additive only: no source tables/rows are deleted or rebuilt.
SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET SESSION group_concat_max_len = 1048576;

CREATE TABLE IF NOT EXISTS app_content (
  entity_type VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  payload JSON NOT NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (entity_type, id),
  KEY idx_app_content_updated (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS app_private_details (
  entity_type VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  entity_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  payload_ciphertext MEDIUMBLOB NOT NULL,
  PRIMARY KEY (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS app_schema_migrations (
  version VARCHAR(64) CHARACTER SET ascii NOT NULL PRIMARY KEY,
  applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Bootstrap public records into the richer public content store. Existing app
-- records win on reruns so later edits are never overwritten by native seeds.
START TRANSACTION;

INSERT INTO app_content (entity_type,id,payload,created_at,updated_at)
SELECT 'HeroSlide', h.id, JSON_OBJECT('title',h.title,'subtitle',h.subtitle,'image',COALESCE(m.public_url,''),'order',h.sort_order,'active',JSON_EXTRACT(IF(h.is_active,'true','false'),'$')),h.created_at,h.updated_at
FROM hero_slides h LEFT JOIN media_assets m ON m.id=h.image_asset_id
ON DUPLICATE KEY UPDATE id=VALUES(id);

INSERT INTO app_content (entity_type,id,payload,created_at,updated_at)
SELECT 'Stat',s.id,JSON_OBJECT('label',s.label,'value',s.value_text,'icon',COALESCE(s.icon_key,''),'order',s.sort_order),s.created_at,s.updated_at FROM stats s
ON DUPLICATE KEY UPDATE id=VALUES(id);

INSERT INTO app_content (entity_type,id,payload,created_at,updated_at)
SELECT 'Service',s.id,JSON_OBJECT('title',s.title,'description',s.description,'image',COALESCE(m.public_url,''),'order',s.sort_order,
 'features',JSON_EXTRACT(CONCAT('[',COALESCE((SELECT GROUP_CONCAT(JSON_QUOTE(f.feature_text) ORDER BY f.sort_order,f.created_at SEPARATOR ',') FROM service_features f WHERE f.service_id=s.id),''),']'),'$'),'sub_services',JSON_ARRAY()),s.created_at,s.updated_at
FROM services s LEFT JOIN media_assets m ON m.id=s.image_asset_id
ON DUPLICATE KEY UPDATE id=VALUES(id);

INSERT INTO app_content (entity_type,id,payload,created_at,updated_at)
SELECT 'Project',p.id,JSON_OBJECT('title',p.title,'location',p.location,'project_type',COALESCE(p.project_type,''),'style',COALESCE(p.style,''),'area',COALESCE(p.area_text,''),'category',p.category,'featured_image',COALESCE(m.public_url,''),'description',COALESCE(p.description,''),'featured',JSON_EXTRACT(IF(p.is_featured,'true','false'),'$'),
 'gallery_images',JSON_EXTRACT(CONCAT('[',COALESCE((SELECT GROUP_CONCAT(JSON_QUOTE(COALESCE(gm.public_url,'')) ORDER BY g.sort_order,g.created_at SEPARATOR ',') FROM project_gallery_images g JOIN media_assets gm ON gm.id=g.image_asset_id WHERE g.project_id=p.id),''),']'),'$')),p.created_at,p.updated_at
FROM projects p LEFT JOIN media_assets m ON m.id=p.featured_image_asset_id
ON DUPLICATE KEY UPDATE id=VALUES(id);

INSERT INTO app_content (entity_type,id,payload,created_at,updated_at)
SELECT 'BlogPost',b.id,JSON_OBJECT('title',b.title,'excerpt',COALESCE(b.excerpt,''),'content',COALESCE(b.content,''),'category',COALESCE(b.category,''),'featured_image',COALESCE(m.public_url,''),'author',COALESCE(b.author_display_name,''),'published_date',DATE_FORMAT(b.published_at,'%Y-%m-%dT%H:%i:%sZ')),b.created_at,b.updated_at
FROM blog_posts b LEFT JOIN media_assets m ON m.id=b.featured_image_asset_id
ON DUPLICATE KEY UPDATE id=VALUES(id);

INSERT INTO app_content (entity_type,id,payload,created_at,updated_at)
SELECT 'GalleryVideo',v.id,JSON_OBJECT('title',v.title,'thumbnail',COALESCE(t.public_url,''),'video_url',COALESCE(m.public_url,v.external_video_url,''),'duration',COALESCE(v.duration_label,''),'category',COALESCE(v.category,''),'order',v.sort_order),v.created_at,v.updated_at
FROM gallery_videos v LEFT JOIN media_assets t ON t.id=v.thumbnail_asset_id LEFT JOIN media_assets m ON m.id=v.video_asset_id
ON DUPLICATE KEY UPDATE id=VALUES(id);

INSERT INTO app_content (entity_type,id,payload,created_at,updated_at)
SELECT 'GalleryConcept',g.id,JSON_OBJECT('title',g.title,'slug',g.slug,'description',COALESCE(g.description,''),'image',COALESCE(m.public_url,''),'order',g.sort_order,
 'features',JSON_EXTRACT(CONCAT('[',COALESCE((SELECT GROUP_CONCAT(JSON_QUOTE(f.feature_text) ORDER BY f.sort_order,f.created_at SEPARATOR ',') FROM gallery_concept_features f WHERE f.gallery_concept_id=g.id),''),']'),'$')),g.created_at,g.updated_at
FROM gallery_concepts g LEFT JOIN media_assets m ON m.id=g.image_asset_id
ON DUPLICATE KEY UPDATE id=VALUES(id);

-- Business profile metadata is public; email/phone ciphertext NEVER enters JSON.
INSERT INTO app_content (entity_type,id,payload,created_at,updated_at)
SELECT 'ContactInfo',p.id,JSON_OBJECT('organization_name',p.organization_name,'address',COALESCE(p.address,''),'working_hours',COALESCE(p.working_hours,''),'theme_color',COALESCE(p.theme_color,''),'logo_url',COALESCE(m.public_url,''),'social_links',JSON_OBJECT(),
 'locations',JSON_EXTRACT(CONCAT('[',COALESCE((SELECT GROUP_CONCAT(JSON_QUOTE(l.location_name) ORDER BY l.sort_order,l.created_at SEPARATOR ',') FROM organization_locations l WHERE l.organization_profile_id=p.id),''),']'),'$')),p.created_at,p.updated_at
FROM organization_profile p LEFT JOIN media_assets m ON m.id=p.logo_asset_id
ON DUPLICATE KEY UPDATE id=VALUES(id);

INSERT INTO app_schema_migrations(version) VALUES ('001_secure_content') ON DUPLICATE KEY UPDATE version=VALUES(version);
COMMIT;

-- The previous QA placeholder contact values may be raw UTF-8, not encryption.
-- Do not copy them into this migration. An administrator must inventory/re-encrypt
-- legacy confidential records through a controlled, backed-up migration before
-- encrypted reads can work. The API deliberately rejects legacy plaintext.
