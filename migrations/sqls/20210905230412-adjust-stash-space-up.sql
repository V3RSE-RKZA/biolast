ALTER TABLE users ALTER COLUMN stashSlots SET DEFAULT 15;
UPDATE users SET stashSlots = 15;
