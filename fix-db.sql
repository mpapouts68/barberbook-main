CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

ALTER TABLE appointments ADD COLUMN is_recurring INTEGER NOT NULL DEFAULT 0;
ALTER TABLE appointments ADD COLUMN recurring_pattern TEXT;
ALTER TABLE appointments ADD COLUMN recurring_interval INTEGER DEFAULT 1;
ALTER TABLE appointments ADD COLUMN recurring_end_date TEXT;
ALTER TABLE appointments ADD COLUMN parent_appointment_id TEXT;
ALTER TABLE appointments ADD COLUMN next_appointment_id TEXT;
ALTER TABLE appointments ADD COLUMN reminder_sent_24h INTEGER DEFAULT 0;
ALTER TABLE appointments ADD COLUMN reminder_sent_2h INTEGER DEFAULT 0;
ALTER TABLE appointments ADD COLUMN reminder_sent_same_day INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_appointments_date_time ON appointments(date, time);
CREATE INDEX IF NOT EXISTS idx_appointments_status_date ON appointments(status, date);