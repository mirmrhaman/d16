-- Add About-page editing after 001_secure_content.sql and 002_section_permissions.sql.
-- Additive and safe to rerun sequentially: existing content and revoked grants win.
-- Starting content matches the former public page. Team profiles are samples and
-- must be replaced with client-approved public names and photographs before release.
SET NAMES utf8mb4;
SET time_zone = '+00:00';
START TRANSACTION;

INSERT INTO permissions (id, permission_key, description) VALUES
 ('00000000-0000-4000-8000-000000000208','section.about.write','Edit About page, mission, vision and public team')
ON DUPLICATE KEY UPDATE permission_key=VALUES(permission_key);

INSERT IGNORE INTO role_permissions(id,role_id,permission_id)
SELECT UUID(),r.id,p.id FROM roles r CROSS JOIN permissions p
WHERE r.role_key IN ('admin','super') AND p.permission_key='section.about.write'
AND NOT EXISTS (SELECT 1 FROM app_schema_migrations WHERE version='003_about_page');

-- Fixed UUID makes API creation a singleton even when two editors save at once.
INSERT INTO app_content(entity_type,id,payload)
SELECT 'AboutPage','8c3de170-4be7-4e45-9f3d-618d0b20c613',
 JSON_OBJECT('title','About Us',
 'subtitle','Space meets Style',
 'hero_image','https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1600&q=80',
 'philosophy_title','Our Philosophy',
 'philosophy_text','D16 Interior is an architect-led, design-driven studio focused on personality, comfort, functionality, and timeless aesthetics. At D16 Interior, your space and style come together effortlessly, forming a truly unique environment.',
 'philosophy_detail','From concept to completion, we deliver end-to-end interior design services with modern, functional, and breathtaking solutions that keep every corner practical, comfortable, and beautiful.',
 'mission_summary','We turn every space into a statement of elegance, functionality, and your unique taste.',
 'philosophy_image','https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&q=80',
 'approach_title','Our Approach',
 'approach_subtitle','A proven process that delivers exceptional results',
 'approach_steps',JSON_ARRAY(JSON_OBJECT('id','discovery',
 'icon','Lightbulb',
 'title','Discovery & Planning',
 'description','We start by exploring your goals, style, and lifestyle—shaping a clear direction for a design that fits you perfectly.'),
 JSON_OBJECT('id','design',
 'icon','Rocket',
 'title','Design Development',
 'description','Our architects and designers craft detailed concepts, select materials, refine layouts, and create realistic 3D visuals to bring your ideas to life.'),
 JSON_OBJECT('id','execution',
 'icon','Award',
 'title','Execution & Coordination',
 'description','From material sourcing to site supervision, we handle every stage of implementation to ensure a smooth, timely, and quality-driven execution.'),
 JSON_OBJECT('id','handover',
 'icon','Sparkles',
 'title','Finishing & Handover',
 'description','We refine the final details, style the space, and deliver a complete, polished interior that matches your vision and expectations.')),
 'principles_title','Our Vision & Mission',
 'principles_subtitle','Guiding principles that drive everything we do',
 'vision_title','Our Vision',
 'vision_text','Creating Spaces That Inspire - At D16 Interior, we envision a world where every space is more than just walls and furniture—it''s an experience. We design interiors that seamlessly blend style, functionality, and personality, transforming how people live, work, and feel within their environments.',
 'mission_title','Our Mission',
 'mission_text','Transforming Dreams into Reality - Our mission is to bring every idea to life through innovative, sustainable, and personalized design solutions. We are committed to exceptional craftsmanship, attention to detail, and seamless project execution, ensuring every space we create reflects the unique style and lifestyle of our clients.',
 'team_title','Meet Our Skilled Team',
 'team_subtitle','The talented professionals behind your dream spaces',
 'team_members',JSON_ARRAY(JSON_OBJECT('id','ahmed-khan',
 'name','Ahmed Khan',
 'role','Lead Interior Designer',
 'image','https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80'),
 JSON_OBJECT('id','sarah-rahman',
 'name','Sarah Rahman',
 'role','Senior Architect',
 'image','https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80'),
 JSON_OBJECT('id','michael-chen',
 'name','Michael Chen',
 'role','Project Manager',
 'image','https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80'),
 JSON_OBJECT('id','fatima-islam',
 'name','Fatima Islam',
 'role','Design Consultant',
 'image','https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80')))
WHERE NOT EXISTS (SELECT 1 FROM app_content WHERE entity_type='AboutPage')
ON DUPLICATE KEY UPDATE id=VALUES(id);

INSERT INTO app_schema_migrations(version) VALUES ('003_about_page')
ON DUPLICATE KEY UPDATE version=VALUES(version);
COMMIT;
