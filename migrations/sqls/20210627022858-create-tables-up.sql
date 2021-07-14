CREATE TABLE IF NOT EXISTS items (
	id BIGINT AUTO_INCREMENT,
	item VARCHAR(255) NOT NULL,
	durability INT DEFAULT NULL,
	PRIMARY KEY (id)
) ENGINE = InnoDB;

ALTER TABLE items AUTO_INCREMENT = 10000;

CREATE TABLE IF NOT EXISTS users (
	userId VARCHAR(255) NOT NULL,
	money INT NOT NULL DEFAULT 100,
	health INT NOT NULL DEFAULT 100,
	stashSlots INT NOT NULL DEFAULT 100,
	createdAt DATETIME NOT NULL DEFAULT NOW(),
	PRIMARY KEY (userId)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS cooldowns (
	id VARCHAR(255) NOT NULL,
	type VARCHAR(255) NOT NULL,
	length INT NOT NULL,
	createdAt DATETIME NOT NULL DEFAULT NOW(),
	PRIMARY KEY (id, type)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS backpack_items (
	itemId BIGINT NOT NULL,
	userId VARCHAR(255) NOT NULL,
	equipped BOOLEAN NOT NULL DEFAULT 0,
	KEY (userId),
	PRIMARY KEY (itemId),
	FOREIGN KEY (itemId) REFERENCES items (id)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS stash_items (
	itemId BIGINT NOT NULL,
	userId VARCHAR(255) NOT NULL,
	KEY (userId),
	PRIMARY KEY (itemId),
	FOREIGN KEY (itemId) REFERENCES items (id)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS ground_items (
	itemId BIGINT NOT NULL,
	channelId VARCHAR(255) NOT NULL,
	createdAt DATETIME NOT NULL DEFAULT NOW(),
	KEY (channelId),
	PRIMARY KEY (itemId),
	FOREIGN KEY (itemId) REFERENCES items (id)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS active_raids (
	userId VARCHAR(255) NOT NULL,
	guildId VARCHAR(255) NOT NULL,
	length INT NOT NULL,
	startedAt DATETIME NOT NULL DEFAULT NOW(),
	PRIMARY KEY (userId),
	KEY(userId, guildId)
) ENGINE = InnoDB;
