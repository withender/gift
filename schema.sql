CREATE TABLE IF NOT EXISTS gift_rooms (
  room_id TEXT PRIMARY KEY,
  items TEXT NOT NULL DEFAULT '[]',
  drawn TEXT NOT NULL DEFAULT '[]',
  updated_at INTEGER NOT NULL
);
