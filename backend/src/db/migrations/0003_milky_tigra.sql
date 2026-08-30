CREATE TABLE `analyticsEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventName` varchar(64) NOT NULL,
	`eventId` varchar(64) NOT NULL,
	`userId` int,
	`sessionKey` varchar(160),
	`path` varchar(500),
	`referrer` varchar(500),
	`value` int,
	`currency` varchar(8),
	`payload` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analyticsEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `storeSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`settingGroup` varchar(64) NOT NULL,
	`settingKey` varchar(120) NOT NULL,
	`value` text,
	`isSecret` enum('true','false') NOT NULL DEFAULT 'false',
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `storeSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `storeSettings_settingKey_unique` UNIQUE(`settingKey`)
);
