ALTER TABLE companions ADD COLUMN skillPoints INTEGER DEFAULT 0 AFTER fetching;
ALTER TABLE companions ADD COLUMN agility INTEGER DEFAULT 0 AFTER skillPoints;
ALTER TABLE companions ADD COLUMN strength INTEGER DEFAULT 0 AFTER agility;
ALTER TABLE companions ADD COLUMN perception INTEGER DEFAULT 0 AFTER strength;
ALTER TABLE companions ADD COLUMN courage INTEGER DEFAULT 0 AFTER perception;