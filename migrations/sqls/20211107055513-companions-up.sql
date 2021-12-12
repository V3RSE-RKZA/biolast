CREATE TABLE IF NOT EXISTS companions (
	ownerId VARCHAR(255) NOT NULL,
	type VARCHAR(255) NOT NULL,
	name VARCHAR(255) DEFAULT NULL,
	xp INTEGER DEFAULT 0,
	level INTEGER DEFAULT 1,
	stress INTEGER DEFAULT 0,
	hunger INTEGER DEFAULT 0,
	fetches INTEGER DEFAULT 0,
	fetching BOOLEAN NOT NULL DEFAULT 0,
	createdAt DATETIME NOT NULL DEFAULT NOW(),
	PRIMARY KEY (ownerId),
	FOREIGN KEY (ownerId) REFERENCES users (userId) ON DELETE CASCADE
) ENGINE = InnoDB;