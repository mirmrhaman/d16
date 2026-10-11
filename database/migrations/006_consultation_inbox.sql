-- Add encrypted, append-only internal notes and manually logged replies.
-- Safe to run against an existing QA/production schema; it does not alter or
-- delete consultation requests. Outbound delivery is not configured here.
SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS consultation_messages (
  id CHAR(36) CHARACTER SET ascii NOT NULL,
  consultation_id CHAR(36) CHARACTER SET ascii NOT NULL,
  actor_user_id CHAR(36) CHARACTER SET ascii NULL,
  message_kind ENUM('note', 'reply') NOT NULL,
  channel ENUM('internal', 'email', 'sms', 'whatsapp', 'social') NOT NULL,
  delivery_status ENUM('internal', 'logged_manual') NOT NULL,
  body_ciphertext MEDIUMBLOB NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_consultation_messages_thread (consultation_id, created_at, id),
  CONSTRAINT fk_consultation_messages_request FOREIGN KEY (consultation_id) REFERENCES consultation_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_consultation_messages_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO app_schema_migrations(version) VALUES ('006_consultation_inbox')
ON DUPLICATE KEY UPDATE version=VALUES(version);
