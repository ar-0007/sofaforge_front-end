CREATE TABLE `adminAuditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminUserId` int NOT NULL,
	`action` varchar(120) NOT NULL,
	`entityType` varchar(120) NOT NULL,
	`entityId` int,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `adminAuditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `carts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`sessionKey` varchar(160),
	`customerEmail` varchar(320),
	`itemsJson` text NOT NULL,
	`subtotal` int NOT NULL DEFAULT 0,
	`status` enum('active','converted','abandoned') NOT NULL DEFAULT 'active',
	`reminderConsent` enum('true','false') NOT NULL DEFAULT 'false',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `carts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contentPlacements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slot` varchar(120) NOT NULL,
	`entityType` enum('product','series','custom') NOT NULL,
	`entityId` int,
	`heading` varchar(255),
	`subheading` text,
	`imageUrl` text,
	`ctaLabel` varchar(120),
	`ctaHref` varchar(255),
	`sortOrder` int NOT NULL DEFAULT 0,
	`isVisible` enum('true','false') NOT NULL DEFAULT 'true',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contentPlacements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customerReminders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cartId` int,
	`userId` int,
	`recipientEmail` varchar(320) NOT NULL,
	`subject` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`channel` enum('email','internal') NOT NULL DEFAULT 'email',
	`status` enum('draft','queued','sent','failed') NOT NULL DEFAULT 'draft',
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`sentAt` timestamp,
	CONSTRAINT `customerReminders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `productReviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`userId` int,
	`authorName` varchar(160) NOT NULL,
	`rating` int NOT NULL,
	`body` text NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`verifiedPurchase` enum('true','false') NOT NULL DEFAULT 'false',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `productReviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `products` ADD `isVisible` enum('true','false') DEFAULT 'true' NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `isFeatured` enum('true','false') DEFAULT 'false' NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `sortOrder` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `updatedAt` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `series` ADD `isVisible` enum('true','false') DEFAULT 'true' NOT NULL;--> statement-breakpoint
ALTER TABLE `series` ADD `sortOrder` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `series` ADD `updatedAt` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;