CREATE TABLE `productOptionChoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`label` varchar(200) NOT NULL,
	`value` varchar(120) NOT NULL,
	`priceDelta` int NOT NULL DEFAULT 0,
	`imageUrl` text,
	`swatchColor` varchar(20),
	`sku` varchar(100),
	`description` varchar(400),
	`isDefault` enum('true','false') NOT NULL DEFAULT 'false',
	`isVisible` enum('true','false') NOT NULL DEFAULT 'true',
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `productOptionChoices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `productOptionGroups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int,
	`label` varchar(160) NOT NULL,
	`slug` varchar(80) NOT NULL,
	`helpText` text,
	`displayType` enum('radio','dropdown','swatch','image','checkbox','text') NOT NULL DEFAULT 'radio',
	`isRequired` enum('true','false') NOT NULL DEFAULT 'true',
	`allowMultiple` enum('true','false') NOT NULL DEFAULT 'false',
	`isVisible` enum('true','false') NOT NULL DEFAULT 'true',
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `productOptionGroups_id` PRIMARY KEY(`id`)
);
