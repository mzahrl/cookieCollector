CREATE DATABASE IF NOT EXISTS `punishmentbot_data`;
GRANT ALL ON `punishmentbot_data`.* TO 'punishmentbot'@'localhost';

CREATE TABLE IF NOT EXISTS `punishmentbot_data`.`Inactive` (
   `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
   `username` VARCHAR(255) NOT NULL UNIQUE COMMENT 'The user who\'s inactive status is being tracked',
   `started` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
   `text` VARCHAR(2000) DEFAULT NULL,
   `reason` VARCHAR(2000) DEFAULT NULL,
   `active` BOOLEAN NOT NULL,
   PRIMARY KEY (`ID`)
);

CREATE TABLE IF NOT EXISTS `punishmentbot_data`.`Reminders` (
   `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
   `sender` VARCHAR(255) NOT NULL COMMENT 'The user who set the reminder',
   `recipient` VARCHAR(255) NOT NULL COMMENT 'The user the reminder was directed to',
   `text` VARCHAR(2000) DEFAULT NULL,
   PRIMARY KEY (`ID`)
);

CREATE TABLE IF NOT EXISTS `punishmentbot_data`.`Last_Messages` (
    `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(255) NOT NULL UNIQUE COMMENT 'The user of the last message',
    `channel` VARCHAR(255) NOT NULL COMMENT 'The channel the message was typed into',
    `sentAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `text` VARCHAR(2000) DEFAULT NULL,
    PRIMARY KEY (`ID`)
);

CREATE TABLE IF NOT EXISTS `punishmentbot_data`.`Channels` (
    `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL UNIQUE COMMENT 'The user of the last message',
    `bId` INT(10) UNSIGNED DEFAULT NULL,
    `hasMod` BOOLEAN NOT NULL,
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `stalkOnly` BOOLEAN NOT NULL,
    PRIMARY KEY (`ID`)
);

INSERT IGNORE INTO `punishmentbot_data`.`Channels` (name, hasMod, joinedAt, stalkOnly) VALUES
                                                                                              ('mande', false, now(), false),
                                                                                              ('forsen', false, now(), true),
                                                                                              ('xqcOW', false, now(), true),
                                                                                              ('rprx', false, now(), true),
                                                                                              ('taxi2g', false, now(), true);

CREATE TABLE IF NOT EXISTS `punishmentbot_data`.`Connect_Four` (
   `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
   `username` VARCHAR(255) NOT NULL UNIQUE COMMENT 'The user',
   `games` INT(10) UNSIGNED NOT NULL DEFAULT 0,
   `mmr` INT(10) UNSIGNED NOT NULL DEFAULT 1200,
   `winStreak` INT(10) UNSIGNED NOT NULL DEFAULT 0,
   PRIMARY KEY (`ID`)
);