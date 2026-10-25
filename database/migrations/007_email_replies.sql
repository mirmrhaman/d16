-- Store real SMTP reply outcomes in the encrypted consultation conversation.
-- Existing notes and manually logged replies are retained unchanged.
SET NAMES utf8mb4;
SET time_zone = '+00:00';

ALTER TABLE consultation_messages
  MODIFY delivery_status ENUM('internal', 'logged_manual', 'sending', 'accepted', 'failed') NOT NULL;

INSERT INTO app_schema_migrations(version) VALUES ('007_email_replies')
ON DUPLICATE KEY UPDATE version=VALUES(version);
