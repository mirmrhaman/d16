-- Apply to QA after migrations 001 through 004. Additive and idempotent.
-- Existing labels, visibility, ordering and an intentionally empty menu win.
-- Navigation visibility controls presentation only, not access to public routes.
SET NAMES utf8mb4;
SET time_zone = '+00:00';
START TRANSACTION;

INSERT INTO app_content(entity_type,id,payload)
SELECT 'NavigationMenu','a7bf2755-1d82-4c2e-9ad3-729f04c565d1',
 JSON_OBJECT('title','Website navigation','items',JSON_ARRAY(JSON_OBJECT('id','nav-home','page','Home','label','Home','visible',JSON_EXTRACT('true','$')),
 JSON_OBJECT('id','nav-about','page','About','label','About','visible',JSON_EXTRACT('true','$')),
 JSON_OBJECT('id','nav-services','page','Services','label','Services','visible',JSON_EXTRACT('true','$')),
 JSON_OBJECT('id','nav-portfolio','page','Portfolio','label','Portfolio','visible',JSON_EXTRACT('true','$')),
 JSON_OBJECT('id','nav-picyourconcept','page','PicYourConcept','label','Pic Your Concept','visible',JSON_EXTRACT('true','$')),
 JSON_OBJECT('id','nav-gallery','page','Gallery','label','Gallery','visible',JSON_EXTRACT('true','$')),
 JSON_OBJECT('id','nav-blog','page','Blog','label','Blog','visible',JSON_EXTRACT('true','$')),
 JSON_OBJECT('id','nav-contact','page','Contact','label','Contact','visible',JSON_EXTRACT('true','$'))))
WHERE NOT EXISTS (SELECT 1 FROM app_content WHERE entity_type='NavigationMenu')
ON DUPLICATE KEY UPDATE id=VALUES(id);

INSERT INTO app_schema_migrations(version) VALUES ('005_navigation')
ON DUPLICATE KEY UPDATE version=VALUES(version);
COMMIT;
