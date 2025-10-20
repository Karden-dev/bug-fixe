-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Hôte : 127.0.0.1
-- Généré le : lun. 20 oct. 2025 à 19:43
-- Version du serveur : 10.4.32-MariaDB
-- Version de PHP : 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données : `winkdb`
--

-- --------------------------------------------------------

--
-- Structure de la table `cash_closings`
--

CREATE TABLE `cash_closings` (
  `id` int(11) NOT NULL,
  `closing_date` date NOT NULL,
  `total_cash_collected` decimal(12,2) NOT NULL DEFAULT 0.00,
  `total_delivery_fees` decimal(12,2) NOT NULL DEFAULT 0.00,
  `total_expenses` decimal(12,2) NOT NULL DEFAULT 0.00,
  `total_remitted` decimal(12,2) NOT NULL DEFAULT 0.00,
  `total_withdrawals` decimal(12,2) NOT NULL DEFAULT 0.00,
  `expected_cash` decimal(12,2) NOT NULL DEFAULT 0.00,
  `actual_cash_counted` decimal(12,2) NOT NULL DEFAULT 0.00,
  `difference` decimal(12,2) NOT NULL DEFAULT 0.00,
  `comment` text DEFAULT NULL,
  `closed_by_user_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `cash_closings`
--

INSERT INTO `cash_closings` (`id`, `closing_date`, `total_cash_collected`, `total_delivery_fees`, `total_expenses`, `total_remitted`, `total_withdrawals`, `expected_cash`, `actual_cash_counted`, `difference`, `comment`, `closed_by_user_id`, `created_at`) VALUES
(5, '2025-10-06', 19000.00, 4150.00, 0.00, 10000.00, 0.00, 13150.00, 13000.00, -150.00, 'BONJOUR FLORE', 1, '2025-10-06 12:54:24');

-- --------------------------------------------------------

--
-- Structure de la table `cash_transactions`
--

CREATE TABLE `cash_transactions` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `type` enum('remittance','expense','manual_withdrawal') NOT NULL,
  `category_id` int(11) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `comment` text DEFAULT NULL,
  `status` enum('pending','confirmed') NOT NULL DEFAULT 'confirmed',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `validated_by` int(11) DEFAULT NULL,
  `validated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `cash_transactions`
--

INSERT INTO `cash_transactions` (`id`, `user_id`, `type`, `category_id`, `amount`, `comment`, `status`, `created_at`, `validated_by`, `validated_at`) VALUES
(4, 22, '', NULL, -10000.00, 'Annulation versement CDE n°1 suite à réassignation', 'confirmed', '2025-10-06 15:39:57', 22, NULL),
(6, 22, '', NULL, -9000.00, 'Annulation versement CDE n°2 suite à réassignation', 'confirmed', '2025-10-06 15:39:57', 22, NULL),
(9, 32, 'remittance', NULL, 2000.00, 'Versement en attente pour la commande n°5', 'pending', '2025-10-06 20:08:30', NULL, NULL),
(10, 32, '', NULL, -9000.00, 'Annulation versement CDE n°2 suite à réassignation', 'confirmed', '2025-10-06 22:25:51', 32, NULL),
(11, 32, '', NULL, -10000.00, 'Annulation versement CDE n°1 suite à réassignation', 'confirmed', '2025-10-06 22:25:51', 32, NULL),
(12, 22, 'remittance', NULL, 10000.00, 'Versement pour commande n°2', 'pending', '2025-10-06 22:25:51', NULL, NULL),
(13, 22, 'remittance', NULL, 10000.00, 'Versement pour commande n°1', 'pending', '2025-10-06 22:25:51', NULL, NULL),
(17, 32, 'expense', 2, -1000.00, 'merci', 'confirmed', '2025-10-10 00:00:00', 32, NULL),
(18, 32, '', NULL, 1000.00, 'Règlement du manquant #5', 'confirmed', '2025-10-10 00:00:00', 32, NULL),
(19, 32, 'remittance', NULL, 10000.00, 'Versement pour les commandes: 10', 'confirmed', '2025-10-10 00:00:00', 32, '2025-10-10 16:20:10'),
(20, 32, 'expense', 2, -500.00, 'MERCI', 'confirmed', '2025-10-11 00:00:00', 32, NULL),
(21, 32, 'remittance', NULL, 5000.00, 'Versement pour les commandes: 11', 'confirmed', '2025-10-11 00:00:00', 1, '2025-10-11 08:15:59'),
(22, 32, '', NULL, 500.00, 'Règlement du manquant #6', 'confirmed', '2025-10-11 00:00:00', 1, NULL),
(23, 32, 'remittance', NULL, 10000.00, 'Versement pour les commandes: 12', 'confirmed', '2025-10-11 00:00:00', 1, '2025-10-11 09:37:15'),
(24, 32, 'remittance', NULL, 1000.00, 'Versement pour les commandes: 13', 'confirmed', '2025-10-11 00:00:00', 1, '2025-10-11 10:11:12'),
(25, 32, 'remittance', NULL, 10000.00, 'Versement pour les commandes: 15', 'confirmed', '2025-10-20 00:00:00', 1, '2025-10-20 16:14:52');

--
-- Déclencheurs `cash_transactions`
--
DELIMITER $$
CREATE TRIGGER `before_cash_transactions_insert` BEFORE INSERT ON `cash_transactions` FOR EACH ROW BEGIN
    IF NEW.type != 'remittance' THEN
        SET NEW.status = 'confirmed';
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Structure de la table `daily_shop_balances`
--

CREATE TABLE `daily_shop_balances` (
  `id` int(11) NOT NULL,
  `report_date` date NOT NULL,
  `shop_id` int(11) NOT NULL,
  `total_orders_sent` int(11) NOT NULL DEFAULT 0,
  `total_orders_delivered` int(11) NOT NULL DEFAULT 0,
  `total_revenue_articles` decimal(12,2) NOT NULL DEFAULT 0.00,
  `total_delivery_fees` decimal(12,2) NOT NULL DEFAULT 0.00,
  `total_expedition_fees` decimal(12,2) NOT NULL DEFAULT 0.00,
  `total_packaging_fees` decimal(12,2) NOT NULL DEFAULT 0.00,
  `total_storage_fees` decimal(12,2) NOT NULL DEFAULT 0.00,
  `previous_debts` decimal(12,2) NOT NULL DEFAULT 0.00,
  `remittance_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `status` enum('pending','paid') NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `daily_shop_balances`
--

INSERT INTO `daily_shop_balances` (`id`, `report_date`, `shop_id`, `total_orders_sent`, `total_orders_delivered`, `total_revenue_articles`, `total_delivery_fees`, `total_expedition_fees`, `total_packaging_fees`, `total_storage_fees`, `previous_debts`, `remittance_amount`, `status`, `created_at`, `updated_at`) VALUES
(1, '2025-10-06', 20, 2, 1, 2000.00, 1000.00, 0.00, 50.00, 0.00, 0.00, 950.00, 'pending', '2025-10-06 12:46:42', '2025-10-06 22:15:50'),
(8, '2025-10-06', 18, 1, 0, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'pending', '2025-10-06 12:47:43', '2025-10-06 21:25:51'),
(24, '2025-10-06', 78, 1, 0, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'pending', '2025-10-06 12:50:13', '2025-10-06 21:30:22'),
(31, '2025-10-06', 61, 0, 0, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, -10000.00, 'pending', '2025-10-06 12:53:39', '2025-10-06 12:53:39'),
(96, '2025-10-07', 20, 2, 0, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'pending', '2025-10-07 07:16:07', '2025-10-07 11:05:52'),
(112, '2025-10-07', 79, 1, 0, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'pending', '2025-10-07 09:16:39', '2025-10-07 11:06:28'),
(151, '2025-10-07', 31, 1, 0, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'pending', '2025-10-07 09:41:17', '2025-10-07 11:05:57'),
(212, '2025-10-10', 78, 1, 1, 10000.00, 1000.00, 0.00, 0.00, 0.00, 0.00, 9000.00, 'pending', '2025-10-10 13:12:29', '2025-10-10 15:17:41'),
(219, '2025-10-11', 20, 3, 3, 16000.00, 2000.00, 0.00, 150.00, 0.00, 0.00, 13850.00, 'pending', '2025-10-11 07:14:48', '2025-10-11 15:01:14'),
(225, '2025-10-11', 78, 1, 1, 1000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 1000.00, 'pending', '2025-10-11 09:10:28', '2025-10-11 09:10:39'),
(231, '2025-10-20', 61, 1, 1, 10000.00, 1000.00, 0.00, 50.00, 0.00, 0.00, 8950.00, 'pending', '2025-10-20 15:02:09', '2025-10-20 15:14:33');

-- --------------------------------------------------------

--
-- Structure de la table `debts`
--

CREATE TABLE `debts` (
  `id` int(11) NOT NULL,
  `shop_id` int(11) NOT NULL,
  `order_id` int(11) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `type` enum('packaging','storage','delivery_fee','other','expedition','daily_balance') NOT NULL,
  `status` enum('pending','paid') NOT NULL DEFAULT 'pending',
  `comment` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `settled_at` datetime DEFAULT NULL,
  `creation_date_only` date GENERATED ALWAYS AS (cast(`created_at` as date)) VIRTUAL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `debts`
--

INSERT INTO `debts` (`id`, `shop_id`, `order_id`, `amount`, `type`, `status`, `comment`, `created_at`, `updated_at`, `created_by`, `updated_by`, `settled_at`) VALUES
(1, 61, NULL, 10000.00, 'expedition', 'paid', '', '2025-10-05 23:00:00', '2025-10-06 12:53:59', 1, 1, '2025-10-06 13:53:59');

-- --------------------------------------------------------

--
-- Structure de la table `deliveryman_shortfalls`
--

CREATE TABLE `deliveryman_shortfalls` (
  `id` int(11) NOT NULL,
  `deliveryman_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `comment` text DEFAULT NULL,
  `status` enum('pending','paid','partially_paid') NOT NULL DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_by_user_id` int(11) DEFAULT NULL,
  `settled_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `deliveryman_shortfalls`
--

INSERT INTO `deliveryman_shortfalls` (`id`, `deliveryman_id`, `amount`, `comment`, `status`, `created_at`, `created_by_user_id`, `settled_at`) VALUES
(5, 32, 0.00, 'Manquant créé manuellement', 'paid', '2025-10-09 23:00:00', 1, '2025-10-10 00:00:00'),
(6, 32, 0.00, 'MERCI', 'paid', '2025-10-10 23:00:00', 1, '2025-10-11 00:00:00'),
(7, 32, 500.00, 'Manquant créé manuellement', 'pending', '2025-10-10 23:00:00', 1, NULL);

-- --------------------------------------------------------

--
-- Structure de la table `expenses`
--

CREATE TABLE `expenses` (
  `id` int(11) NOT NULL,
  `rider_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `comment` text DEFAULT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `expense_categories`
--

CREATE TABLE `expense_categories` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `type` enum('company_charge','deliveryman_charge') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `expense_categories`
--

INSERT INTO `expense_categories` (`id`, `name`, `type`) VALUES
(1, 'Loyer', 'company_charge'),
(2, 'Eau', 'company_charge'),
(3, 'Électricité', 'company_charge'),
(4, 'Fournitures de bureau', 'company_charge'),
(5, 'Carburant', 'deliveryman_charge'),
(6, 'Maintenance de moto', 'deliveryman_charge'),
(7, 'Taxi', 'deliveryman_charge'),
(8, 'Autre', 'deliveryman_charge');

-- --------------------------------------------------------

--
-- Structure de la table `livreurs`
--

CREATE TABLE `livreurs` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `vehicle_type` enum('pied','moto') NOT NULL COMMENT 'Type de véhicule utilisé par le livreur',
  `base_salary` decimal(10,2) DEFAULT NULL COMMENT 'Salaire de base mensuel (pour motards)',
  `personal_goal_daily` int(11) DEFAULT NULL COMMENT 'Objectif personnel quotidien (nb courses)',
  `personal_goal_weekly` int(11) DEFAULT NULL COMMENT 'Objectif personnel hebdomadaire (nb courses)',
  `personal_goal_monthly` int(11) DEFAULT NULL COMMENT 'Objectif personnel mensuel (nb courses)',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `commission_rate` decimal(5,2) DEFAULT NULL COMMENT 'Taux de commission en pourcentage (pour livreurs à pied)',
  `monthly_objective` int(11) DEFAULT NULL COMMENT 'Objectif Mensuel (utilisé pour les settings admin)'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `livreurs`
--

INSERT INTO `livreurs` (`id`, `user_id`, `vehicle_type`, `base_salary`, `personal_goal_daily`, `personal_goal_weekly`, `personal_goal_monthly`, `created_at`, `updated_at`, `commission_rate`, `monthly_objective`) VALUES
(1, 32, 'moto', 40000.00, NULL, NULL, NULL, '2025-10-20 16:11:28', '2025-10-20 16:11:28', NULL, NULL);

-- --------------------------------------------------------

--
-- Structure de la table `monthly_objectives`
--

CREATE TABLE `monthly_objectives` (
  `id` int(11) NOT NULL,
  `month_year` varchar(7) NOT NULL COMMENT 'Mois et année au format YYYY-MM',
  `target_deliveries_moto` int(11) DEFAULT 370 COMMENT 'Objectif de courses pour les motards ce mois-là',
  `bonus_tiers_moto` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Structure JSON décrivant les paliers de prime pour les motards. Ex: [{"min_percent": 65, "bonus": 100}, {"min_percent": 75, "bonus": 125}, ...]' CHECK (json_valid(`bonus_tiers_moto`)),
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Objectifs de performance mensuels fixés par l''admin';

--
-- Déchargement des données de la table `monthly_objectives`
--

INSERT INTO `monthly_objectives` (`id`, `month_year`, `target_deliveries_moto`, `bonus_tiers_moto`, `created_at`, `updated_at`) VALUES
(1, '2025-09', 370, '[{\"min_percent\": 65, \"bonus\": 100}, {\"min_percent\": 75, \"bonus\": 125}, {\"min_percent\": 85, \"bonus\": 150}, {\"min_percent\": 95, \"bonus\": 175}]', '2025-10-20 12:37:07', '2025-10-20 12:37:07'),
(2, '2025-10', 200, NULL, '2025-10-20 16:11:28', '2025-10-20 16:11:28');

-- --------------------------------------------------------

--
-- Structure de la table `orders`
--

CREATE TABLE `orders` (
  `id` int(11) NOT NULL,
  `shop_id` int(11) NOT NULL,
  `deliveryman_id` int(11) DEFAULT NULL,
  `customer_name` varchar(255) DEFAULT NULL,
  `customer_phone` varchar(20) NOT NULL,
  `delivery_location` varchar(255) NOT NULL,
  `article_amount` decimal(10,2) NOT NULL,
  `delivery_fee` decimal(10,2) NOT NULL,
  `expedition_fee` decimal(10,2) NOT NULL DEFAULT 0.00,
  `status` enum('pending','in_progress','delivered','cancelled','failed_delivery','reported') NOT NULL DEFAULT 'pending',
  `payment_status` enum('pending','cash','paid_to_supplier','cancelled') NOT NULL DEFAULT 'pending',
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `amount_received` decimal(10,2) DEFAULT 0.00,
  `debt_amount` decimal(10,2) DEFAULT 0.00,
  `remittance_amount` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Montant net pré-calculé à verser au marchand pour cette commande.',
  `updated_by` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `orders`
--

INSERT INTO `orders` (`id`, `shop_id`, `deliveryman_id`, `customer_name`, `customer_phone`, `delivery_location`, `article_amount`, `delivery_fee`, `expedition_fee`, `status`, `payment_status`, `created_by`, `created_at`, `updated_at`, `amount_received`, `debt_amount`, `remittance_amount`, `updated_by`) VALUES
(1, 20, 22, 'bardon', '1234555', 'JOUVENCE', 10000.00, 1000.00, 0.00, 'in_progress', 'cash', 1, '2025-10-06 13:46:42', '2025-10-06 22:25:51', NULL, 0.00, 0.00, 1),
(2, 18, 22, 'bardon', '65689390', 'JOUVENCE', 10000.00, 500.00, 0.00, 'in_progress', 'cash', 1, '2025-10-06 13:47:43', '2025-10-06 22:25:51', NULL, 0.00, 0.00, 1),
(4, 78, 32, 'EMMA', '65689390', 'JOUVENCE', 10000.00, 1000.00, 0.00, 'in_progress', 'cash', 1, '2025-10-06 13:50:13', '2025-10-06 22:30:22', NULL, 0.00, 0.00, 1),
(5, 20, 32, 'EMMA', '65689390', 'JOUVENCE', 2000.00, 1000.00, 0.00, 'delivered', 'cash', 1, '2025-10-06 16:29:18', '2025-10-06 23:00:31', NULL, 0.00, 0.00, 32),
(6, 20, 22, 'bardon', '1234555', 'CJEKEL', 10000.00, 1000.00, 0.00, 'in_progress', 'pending', 1, '2025-10-07 08:16:07', '2025-10-07 12:05:52', NULL, 0.00, 0.00, 1),
(7, 20, 22, NULL, '66378299', 'JOUVENCE', 10000.00, 1000.00, 0.00, 'in_progress', 'pending', 1, '2025-10-07 09:57:47', '2025-10-07 12:05:52', NULL, 0.00, 0.00, 1),
(8, 79, 32, NULL, '66378299', 'JOUVENCE', 10000.00, 1000.00, 0.00, 'in_progress', 'pending', 1, '2025-10-07 10:16:39', '2025-10-07 12:06:28', NULL, 0.00, 0.00, 1),
(9, 31, 32, 'EMMA', '65689390', 'BASTOS', 0.00, 0.00, 0.00, 'in_progress', 'pending', 1, '2025-10-07 10:41:17', '2025-10-07 12:05:57', NULL, 0.00, 0.00, 1),
(10, 78, 32, 'TEST', '123', 'TEST', 10000.00, 1000.00, 0.00, 'delivered', 'cash', 1, '2025-10-10 14:12:29', '2025-10-10 16:17:41', NULL, 0.00, 0.00, 1),
(11, 20, 32, 'bardon', '65689390', 'BASTOS', 5000.00, 1000.00, 0.00, 'delivered', 'cash', 1, '2025-10-11 08:14:48', '2025-10-11 08:14:56', NULL, 0.00, 0.00, 1),
(12, 20, 32, 'BARDON', '1233', 'JOUVENCE', 10000.00, 1000.00, 0.00, 'delivered', 'cash', 1, '2025-10-11 09:36:16', '2025-10-11 09:36:28', NULL, 0.00, 0.00, 1),
(13, 78, 32, 'TEST', '234', 'TEST2', 1000.00, 0.00, 0.00, 'delivered', 'cash', 1, '2025-10-11 10:10:28', '2025-10-11 10:10:39', NULL, 0.00, 0.00, 1),
(14, 20, 32, 'bardon', 'test', '1', 1000.00, 0.00, 0.00, 'delivered', 'cash', 1, '2025-10-11 16:00:51', '2025-10-11 16:01:14', NULL, 0.00, 0.00, 1),
(15, 61, 32, NULL, '65689390', 'BASTOS', 10000.00, 1000.00, 0.00, 'delivered', 'cash', 1, '2025-10-20 16:02:09', '2025-10-20 16:14:33', 0.00, 0.00, 0.00, 32);

-- --------------------------------------------------------

--
-- Structure de la table `order_history`
--

CREATE TABLE `order_history` (
  `id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `action` varchar(255) NOT NULL,
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`details`)),
  `user_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `order_history`
--

INSERT INTO `order_history` (`id`, `order_id`, `action`, `details`, `user_id`, `created_at`) VALUES
(1, 10, 'Commande créée', NULL, 1, '2025-10-10 13:12:29'),
(2, 10, 'Commande assignée au livreur : rider', NULL, 1, '2025-10-10 13:12:37'),
(3, 10, 'Statut changé en delivered', NULL, 32, '2025-10-10 13:12:45'),
(4, 10, 'Statut changé en cancelled', NULL, 1, '2025-10-10 15:17:15'),
(5, 10, 'Statut changé en delivered', NULL, 1, '2025-10-10 15:17:41'),
(6, 11, 'Commande créée', NULL, 1, '2025-10-11 07:14:48'),
(7, 11, 'Commande assignée au livreur : rider', NULL, 1, '2025-10-11 07:14:53'),
(8, 11, 'Statut changé en delivered', NULL, 1, '2025-10-11 07:14:56'),
(9, 12, 'Commande créée', NULL, 1, '2025-10-11 08:36:16'),
(10, 12, 'Commande assignée au livreur : rider', NULL, 1, '2025-10-11 08:36:25'),
(11, 12, 'Statut changé en delivered', NULL, 1, '2025-10-11 08:36:28'),
(12, 13, 'Commande créée', NULL, 1, '2025-10-11 09:10:28'),
(13, 13, 'Commande assignée au livreur : rider', NULL, 1, '2025-10-11 09:10:33'),
(14, 13, 'Statut changé en delivered', NULL, 1, '2025-10-11 09:10:39'),
(15, 14, 'Commande créée', NULL, 1, '2025-10-11 15:00:51'),
(16, 14, 'Commande assignée au livreur : rider', NULL, 1, '2025-10-11 15:01:10'),
(17, 14, 'Statut changé en delivered', NULL, 1, '2025-10-11 15:01:14'),
(18, 15, 'Commande créée', NULL, 1, '2025-10-20 15:02:09'),
(19, 15, 'Commande assignée au livreur : rider', NULL, 1, '2025-10-20 15:13:14'),
(20, 15, 'Statut changé en delivered', NULL, 32, '2025-10-20 15:14:33');

-- --------------------------------------------------------

--
-- Structure de la table `order_items`
--

CREATE TABLE `order_items` (
  `id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `item_name` varchar(255) NOT NULL,
  `quantity` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `order_items`
--

INSERT INTO `order_items` (`id`, `order_id`, `item_name`, `quantity`, `amount`) VALUES
(1, 10, 'TEST', 1, 10000.00),
(2, 11, 'TEST', 1, 5000.00),
(3, 12, 'SAC', 1, 10000.00),
(4, 13, 't', 1, 1000.00),
(5, 14, 'TEST', 1, 1000.00),
(6, 15, 'SAC', 1, 10000.00);

-- --------------------------------------------------------

--
-- Structure de la table `push_subscriptions`
--

CREATE TABLE `push_subscriptions` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `token` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `push_subscriptions`
--

INSERT INTO `push_subscriptions` (`id`, `user_id`, `token`, `created_at`) VALUES
(1, 32, 'dI3yZOZztjy6GVgRM8OZf_:APA91bGOGBH2qFVf5Umhf6Gv_u9JAC-Tj8QHWrTglmaG8ExX_NAdY-N4EEGIMMoFT1AzCQ1NELcZI4f_1eGb2p8wssk0tmWpZSWAjNbbqfUV3y35O2MRIKg', '2025-10-07 10:43:07');

-- --------------------------------------------------------

--
-- Structure de la table `remittances`
--

CREATE TABLE `remittances` (
  `id` int(11) NOT NULL,
  `shop_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `remittance_date` date DEFAULT NULL COMMENT 'Date du rapport qui a généré ce versement',
  `payment_date` date DEFAULT NULL COMMENT 'Date réelle du paiement',
  `payment_operator` enum('Orange Money','MTN Mobile Money') DEFAULT NULL,
  `status` enum('pending','paid','partially_paid','failed') NOT NULL,
  `transaction_id` varchar(255) DEFAULT NULL,
  `comment` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `user_id` int(11) DEFAULT NULL,
  `debts_consolidated` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Créances en attente consolidées au moment de la synchronisation.'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `remittances`
--

INSERT INTO `remittances` (`id`, `shop_id`, `amount`, `remittance_date`, `payment_date`, `payment_operator`, `status`, `transaction_id`, `comment`, `created_at`, `updated_at`, `user_id`, `debts_consolidated`) VALUES
(1, 20, 6400.00, '2025-10-06', NULL, 'Orange Money', 'pending', NULL, NULL, '2025-10-06 12:46:53', '2025-10-06 12:50:34', 1, 0.00),
(2, 18, 9450.00, '2025-10-06', NULL, 'Orange Money', 'pending', NULL, NULL, '2025-10-06 12:47:54', '2025-10-06 12:50:34', 1, 0.00),
(10, 78, 9000.00, '2025-10-06', NULL, NULL, 'pending', NULL, NULL, '2025-10-06 12:50:34', '2025-10-06 12:50:34', 1, 0.00),
(11, 78, 9000.00, '2025-10-10', NULL, NULL, 'pending', NULL, NULL, '2025-10-10 13:13:17', '2025-10-10 15:18:12', 1, 0.00),
(15, 20, 12900.00, '2025-10-11', NULL, 'Orange Money', 'pending', NULL, NULL, '2025-10-11 07:15:09', '2025-10-11 14:52:43', 1, 0.00),
(19, 78, 1000.00, '2025-10-11', NULL, NULL, 'pending', NULL, NULL, '2025-10-11 09:11:07', '2025-10-11 14:52:43', 1, 0.00),
(22, 61, 8950.00, '2025-10-20', NULL, NULL, 'pending', NULL, NULL, '2025-10-20 15:14:46', '2025-10-20 15:17:21', 1, 0.00);

-- --------------------------------------------------------

--
-- Structure de la table `remittance_orders`
--

CREATE TABLE `remittance_orders` (
  `remittance_id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `returned_stock_tracking`
--

CREATE TABLE `returned_stock_tracking` (
  `id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `deliveryman_id` int(11) NOT NULL,
  `shop_id` int(11) NOT NULL,
  `return_status` enum('pending_return_to_hub','received_at_hub','returned_to_shop','cancelled') NOT NULL DEFAULT 'pending_return_to_hub',
  `declaration_date` datetime NOT NULL COMMENT 'Date à laquelle le livreur a déclaré le retour',
  `hub_reception_date` datetime DEFAULT NULL COMMENT 'Date de confirmation de réception au hub par le magasinier',
  `stock_received_by_user_id` int(11) DEFAULT NULL COMMENT 'Utilisateur (Admin/Stocker) qui a reçu le stock au hub',
  `comment` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `rider_absences`
--

CREATE TABLE `rider_absences` (
  `id` int(11) NOT NULL,
  `absence_date` date NOT NULL COMMENT 'Date de l''absence/jour férié',
  `user_id` int(11) DEFAULT NULL COMMENT 'ID du livreur concerné (NULL si férié pour tous)',
  `type` enum('absence','permission','ferie') NOT NULL COMMENT 'Type d''événement',
  `motif` varchar(255) DEFAULT NULL COMMENT 'Motif ou nom du jour férié (ex: Maladie, Tabaski)',
  `created_by_user_id` int(11) DEFAULT NULL COMMENT 'ID de l''admin qui a enregistré',
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Enregistrement des jours non travaillés (absences, fériés)';

--
-- Déchargement des données de la table `rider_absences`
--

INSERT INTO `rider_absences` (`id`, `absence_date`, `user_id`, `type`, `motif`, `created_by_user_id`, `created_at`) VALUES
(1, '2025-10-20', 32, 'permission', 'MERCI', 1, '2025-10-20 15:48:13');

-- --------------------------------------------------------

--
-- Structure de la table `shops`
--

CREATE TABLE `shops` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `payment_name` varchar(255) DEFAULT NULL,
  `phone_number` varchar(20) NOT NULL,
  `phone_number_for_payment` varchar(20) DEFAULT NULL,
  `payment_operator` enum('Orange Money','MTN Mobile Money') DEFAULT NULL,
  `bill_packaging` tinyint(1) NOT NULL DEFAULT 0,
  `bill_storage` tinyint(1) NOT NULL DEFAULT 0,
  `packaging_price` decimal(10,2) NOT NULL DEFAULT 50.00,
  `storage_price` decimal(10,2) NOT NULL DEFAULT 100.00,
  `status` enum('actif','inactif') NOT NULL DEFAULT 'actif',
  `created_by` int(11) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `shops`
--

INSERT INTO `shops` (`id`, `name`, `payment_name`, `phone_number`, `phone_number_for_payment`, `payment_operator`, `bill_packaging`, `bill_storage`, `packaging_price`, `storage_price`, `status`, `created_by`, `created_at`) VALUES
(18, 'Gold store 237', 'KOME MARTIN YVAN ETUGE', '696112832', '696112832', 'Orange Money', 1, 1, 50.00, 100.00, 'actif', 1, '2025-09-21 19:48:17'),
(19, 'Maghreb natural cosmitic ', 'KOUEMENI CARINE', '6 91 33 61 88', '691336188', 'Orange Money', 1, 1, 50.00, 100.00, 'actif', 1, '2025-09-22 04:47:16'),
(20, 'O-RÉSEAU ', 'NANA YEMDJEU MARTHE DIENG', '696457727', '691384529', 'Orange Money', 1, 1, 50.00, 100.00, 'actif', 1, '2025-09-22 04:50:19'),
(21, 'MA BOUTIQUE AFRICASTYLE', 'FOPA TIOSOP', '676011845', '698493408', 'Orange Money', 0, 0, 50.00, 100.00, 'actif', 1, '2025-09-22 05:18:06'),
(22, 'WTS Business', NULL, '6 79 97 35 62', NULL, NULL, 1, 1, 50.00, 100.00, 'actif', 1, '2025-09-22 05:21:16'),
(23, 'Groupe Danister ', 'JOEL NOUBISSIE', '679956768', '695403135', 'Orange Money', 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-22 05:30:17'),
(24, 'Josiane ', 'NANA MOUONTIO EPSE KAMGAING', '678894889', '697963898', 'Orange Money', 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-22 05:32:29'),
(25, 'MELVI', 'MAGAKO ELVIRA', '686338871', '699025241', '', 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-22 05:34:25'),
(26, 'DYXANE', 'RICKY ADRIANE', '692013387', '698330746', 'Orange Money', 0, 0, 50.00, 100.00, 'actif', 1, '2025-09-22 07:41:02'),
(28, 'BUNDA BUSINESS', NULL, '654482298', NULL, NULL, 0, 0, 50.00, 100.00, 'actif', 1, '2025-09-22 07:48:28'),
(30, 'HABIBI', 'ABIBA NDANE', '691452490', '691452490', 'Orange Money', 0, 0, 50.00, 100.00, 'actif', 1, '2025-09-22 07:52:47'),
(31, 'BAMBOU', NULL, '699620045', NULL, NULL, 0, 0, 50.00, 100.00, 'actif', 1, '2025-09-22 08:05:24'),
(32, 'ADORABLE', 'GABRIELLE STEPHANIE OHO', '659234604', '659234604', 'Orange Money', 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-22 08:07:44'),
(33, 'GODSON MARKET', 'NZOFOU STEVE', '653625197', '656617817', 'Orange Money', 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-22 08:40:54'),
(34, 'STANIS BUSSINESS', NULL, '693697182', NULL, NULL, 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-22 08:50:59'),
(35, 'MANDE SELLAM', NULL, '651937589', NULL, NULL, 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-22 08:57:38'),
(36, 'NICE LOOK', 'NFOGHAM FANGMO AHMED', '658226309', '656883923', 'Orange Money', 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-22 09:25:29'),
(37, 'LANDFILTRI', 'TEUMA GAETAN ', '697984351', '697984351', 'Orange Money', 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-22 11:48:27'),
(38, 'NG PHOTO', NULL, '670593889', NULL, NULL, 0, 0, 50.00, 100.00, 'actif', 1, '2025-09-22 11:55:47'),
(39, 'SHANL\'S MINI', NULL, '682921522', NULL, NULL, 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-22 12:17:38'),
(40, 'MCLV ONLINE', 'VANESSA YONGA', '682200997', '697649876', 'Orange Money', 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-22 12:33:36'),
(41, 'JH GROUP', 'NGAMBA', '690718386', '690718386', 'Orange Money', 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-22 12:38:59'),
(42, 'INDUSTRIES MILLION', 'ADAMOU TIZE', '689807020', '697487213', 'Orange Money', 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-22 13:01:50'),
(43, 'LEADER SERVICE', 'JOSEPH TAYO TIFFE', '699248035', '699248035', 'Orange Money', 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-22 13:05:01'),
(44, 'GUILAINE BOUTIQUE', 'DJONZO TATSENA GUILLAIN', '691192727', '656331206', 'Orange Money', 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-22 13:10:27'),
(45, 'MEILLEUR PRIX', 'AYINA EVODO MARIELLA DE LA GRACE', '653688261', '659464078', 'Orange Money', 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-22 13:12:57'),
(46, 'TF MARKET', NULL, '695512572', NULL, NULL, 1, 1, 50.00, 100.00, 'actif', 1, '2025-09-22 13:24:06'),
(47, 'PLANTES ANCESTRALES', NULL, '670951243', NULL, NULL, 1, 1, 50.00, 100.00, 'actif', 1, '2025-09-22 13:28:10'),
(48, 'FLEXI GADGET', 'NOUTCHEU LOIC RICHIPIN', '697747917', '688581764', 'Orange Money', 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-22 13:30:29'),
(49, 'EMPIRE CHIC', 'SHANDA NDJATIE', '656405211', '656405211', 'Orange Money', 0, 0, 50.00, 100.00, 'actif', 1, '2025-09-22 13:37:43'),
(50, 'FRID ?QRKET', 'TAKOUGANG FRIDOLIN', '698215929', '698215929', 'Orange Money', 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-23 03:14:30'),
(51, 'MCJ BIO NATURE', 'MONKAM JUNIOR', '681270541', '658389738', 'Orange Money', 1, 1, 50.00, 100.00, 'actif', 1, '2025-09-23 03:42:48'),
(52, 'DORIANE', 'GEORDANIE CHEDJOU TALLA', '691838814', '693913336', 'Orange Money', 0, 0, 50.00, 100.00, 'actif', 1, '2025-09-23 05:39:01'),
(53, 'K&F STORE', NULL, '696801912', NULL, NULL, 1, 1, 50.00, 100.00, 'actif', 1, '2025-09-23 06:02:46'),
(54, 'PEULH SECRET', NULL, '681881679', NULL, NULL, 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-23 07:10:54'),
(55, 'LE GRAND SPORTIF', 'FEUKAM KENGNE GERVAIS LANDRY', '655600175', '698424802', 'Orange Money', 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-23 07:13:00'),
(56, 'EXPRESS', NULL, '620003048', NULL, NULL, 0, 0, 50.00, 100.00, 'actif', 1, '2025-09-23 07:24:52'),
(57, 'L\'AURELYS', NULL, '690820730', NULL, NULL, 0, 0, 50.00, 100.00, 'actif', 1, '2025-09-23 07:38:22'),
(58, 'BLACK NAPPY', 'test', '696259305', '1234567', 'Orange Money', 0, 0, 50.00, 100.00, 'actif', 1, '2025-09-23 11:25:11'),
(59, 'CHRISLINE MARKET', NULL, '695829260', NULL, NULL, 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-24 03:25:46'),
(60, 'YAMO GADGETS', NULL, '675523964', NULL, NULL, 1, 1, 50.00, 100.00, 'actif', 1, '2025-09-24 04:10:00'),
(61, 'AFRIKA STORE', NULL, '676756445', NULL, NULL, 1, 1, 50.00, 100.00, 'actif', 1, '2025-09-24 04:12:14'),
(62, 'UNIVERT PHOTO', NULL, '681024316', NULL, NULL, 0, 0, 50.00, 100.00, 'actif', 1, '2025-09-24 04:17:52'),
(63, 'MARY MARKET', 'GUIMATSIA MEZATIO MARIE', '681489644', '699936042', 'Orange Money', 0, 0, 50.00, 100.00, 'actif', 1, '2025-09-24 04:38:48'),
(65, 'NELL COSMETIQUE', 'KETCHA NELLY', '696140377', '696140377', 'Orange Money', 0, 0, 50.00, 100.00, 'actif', 1, '2025-09-24 05:05:10'),
(66, 'D\'S SHOP', NULL, '673964734', NULL, NULL, 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-24 05:50:03'),
(67, 'ORIGINAL  SHOP', NULL, '682188915', NULL, NULL, 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-24 06:41:57'),
(68, 'ZOE DIGITECH SOLUTION', NULL, '640244614', NULL, NULL, 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-24 06:50:34'),
(69, 'KAMWAS SERVICE', NULL, '692320254', NULL, NULL, 1, 1, 50.00, 100.00, 'actif', 1, '2025-09-24 07:07:51'),
(71, 'MOUAFO SHOP YDE', '', '692022172', '', '', 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-24 23:14:39'),
(72, 'ECO CLEAN SOLUTION', NULL, '655535691', NULL, NULL, 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-24 23:22:27'),
(73, 'LUXURY SHOP ', NULL, '671733113', NULL, NULL, 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-24 23:31:43'),
(74, 'VITALIS', NULL, '689875922', NULL, NULL, 1, 1, 50.00, 100.00, 'actif', 1, '2025-09-24 23:33:24'),
(75, 'UNIVERS VITALIA', NULL, '678687200', NULL, NULL, 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-24 23:50:38'),
(76, 'CUISINE FACILE', NULL, '699143940', NULL, NULL, 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-25 00:05:55'),
(77, 'MEDI & STORE', NULL, '690813260', NULL, NULL, 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-25 00:59:08'),
(78, 'ZENDO', NULL, '694624521', NULL, NULL, 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-25 01:18:31'),
(79, 'BINSERVICE', NULL, '699553638', NULL, NULL, 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-25 01:27:40'),
(80, 'o-store', NULL, '656082184', NULL, NULL, 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-25 04:17:47'),
(81, 'loet store', NULL, '675207496', NULL, NULL, 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-25 04:38:11'),
(82, 'Mas company', NULL, '686183437', NULL, NULL, 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-25 04:49:02'),
(83, 'Opul store', NULL, '673062985', NULL, NULL, 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-25 08:51:31'),
(84, 'GLOTELHO', NULL, '673882617', NULL, NULL, 0, 0, 50.00, 100.00, 'actif', 1, '2025-09-26 03:17:09'),
(85, 'k-mystore', NULL, '693800251', NULL, NULL, 1, 1, 50.00, 100.00, 'actif', 1, '2025-09-26 05:59:10'),
(86, 'All u need', NULL, '678818725', NULL, NULL, 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-26 06:43:34'),
(88, 'secret beauty', NULL, '652244620', NULL, NULL, 0, 0, 50.00, 100.00, 'actif', 1, '2025-09-26 07:47:27'),
(89, 'Le boudoire', NULL, '698013625', NULL, NULL, 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-26 09:45:20'),
(90, 'Viral service', NULL, '671132743', NULL, NULL, 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-26 10:46:28'),
(91, 'Jupiter', NULL, '620722881', NULL, NULL, 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-27 08:06:22'),
(92, 'EASY STORE', NULL, '655437151', NULL, NULL, 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-27 12:49:27'),
(93, 'C\'LA SOLDE', NULL, '650724683', NULL, NULL, 0, 0, 50.00, 100.00, 'actif', 1, '2025-09-27 13:07:48'),
(94, 'ISADI FRAGRANCE', NULL, '677275003', NULL, NULL, 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-29 08:27:15'),
(95, 'INSTITUT VANI', NULL, '655866548', NULL, NULL, 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-29 09:40:36'),
(96, 'CYDJENN-CARE', NULL, '688785507', NULL, NULL, 0, 0, 50.00, 100.00, 'actif', 1, '2025-09-29 11:04:09'),
(97, 'O-STORE ', NULL, '656082184', NULL, NULL, 0, 1, 50.00, 100.00, 'inactif', 1, '2025-09-30 07:02:26'),
(98, 'INTECH SOLUTION', NULL, '691233191', NULL, NULL, 0, 0, 50.00, 100.00, 'actif', 1, '2025-09-30 08:47:54'),
(99, 'BOUTIQUE EN LIGNE', NULL, '673274009', NULL, NULL, 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-30 10:07:27'),
(100, 'NTJ PRESTATAIRE ', NULL, '653854714', NULL, NULL, 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-30 10:23:10'),
(101, 'PNK', NULL, '693245266', NULL, NULL, 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-30 11:37:29'),
(102, 'PROV TECH', NULL, '679755401', NULL, NULL, 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-30 12:26:46'),
(103, 'BLANDINE CHOPPING', NULL, '675503715', NULL, NULL, 0, 1, 50.00, 100.00, 'actif', 1, '2025-10-01 12:15:01');

-- --------------------------------------------------------

--
-- Structure de la table `shop_storage_history`
--

CREATE TABLE `shop_storage_history` (
  `id` int(11) NOT NULL,
  `shop_id` int(11) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `shop_storage_history`
--

INSERT INTO `shop_storage_history` (`id`, `shop_id`, `start_date`, `end_date`, `price`, `created_at`) VALUES
(1, 18, '2025-09-21', NULL, 100.00, '2025-09-26 04:31:32'),
(2, 19, '2025-09-22', NULL, 100.00, '2025-09-26 04:31:32'),
(3, 20, '2025-09-22', NULL, 100.00, '2025-09-26 04:31:32'),
(4, 22, '2025-09-22', NULL, 100.00, '2025-09-26 04:31:32'),
(5, 23, '2025-09-22', NULL, 100.00, '2025-09-26 04:31:32'),
(6, 24, '2025-09-22', NULL, 100.00, '2025-09-26 04:31:32'),
(7, 25, '2025-09-22', NULL, 100.00, '2025-09-26 04:31:32'),
(8, 32, '2025-09-22', NULL, 100.00, '2025-09-26 04:31:32'),
(9, 33, '2025-09-22', NULL, 100.00, '2025-09-26 04:31:32'),
(10, 34, '2025-09-22', NULL, 100.00, '2025-09-26 04:31:32'),
(11, 35, '2025-09-22', NULL, 100.00, '2025-09-26 04:31:32'),
(12, 36, '2025-09-22', NULL, 100.00, '2025-09-26 04:31:32'),
(13, 37, '2025-09-22', NULL, 100.00, '2025-09-26 04:31:32'),
(14, 38, '2025-09-22', '2025-09-29', 100.00, '2025-09-26 04:31:32'),
(15, 39, '2025-09-22', NULL, 100.00, '2025-09-26 04:31:32'),
(16, 40, '2025-09-22', NULL, 100.00, '2025-09-26 04:31:32'),
(17, 41, '2025-09-22', NULL, 100.00, '2025-09-26 04:31:32'),
(18, 42, '2025-09-22', NULL, 100.00, '2025-09-26 04:31:32'),
(19, 43, '2025-09-22', NULL, 100.00, '2025-09-26 04:31:32'),
(20, 44, '2025-09-22', NULL, 100.00, '2025-09-26 04:31:32'),
(21, 45, '2025-09-22', NULL, 100.00, '2025-09-26 04:31:32'),
(22, 46, '2025-09-22', NULL, 100.00, '2025-09-26 04:31:32'),
(23, 47, '2025-09-22', NULL, 100.00, '2025-09-26 04:31:32'),
(24, 48, '2025-09-22', NULL, 100.00, '2025-09-26 04:31:32'),
(25, 50, '2025-09-23', NULL, 100.00, '2025-09-26 04:31:32'),
(26, 51, '2025-09-23', NULL, 100.00, '2025-09-26 04:31:32'),
(27, 53, '2025-09-23', NULL, 100.00, '2025-09-26 04:31:32'),
(28, 55, '2025-09-23', NULL, 100.00, '2025-09-26 04:31:32'),
(29, 58, '2025-09-23', '2025-10-02', 100.00, '2025-09-26 04:31:32'),
(30, 59, '2025-09-24', NULL, 100.00, '2025-09-26 04:31:32'),
(31, 60, '2025-09-24', NULL, 100.00, '2025-09-26 04:31:32'),
(32, 61, '2025-09-24', NULL, 100.00, '2025-09-26 04:31:32'),
(33, 66, '2025-09-24', NULL, 100.00, '2025-09-26 04:31:32'),
(34, 67, '2025-09-24', NULL, 100.00, '2025-09-26 04:31:32'),
(35, 68, '2025-09-24', NULL, 100.00, '2025-09-26 04:31:32'),
(36, 69, '2025-09-24', NULL, 100.00, '2025-09-26 04:31:32'),
(38, 72, '2025-09-24', NULL, 100.00, '2025-09-26 04:31:32'),
(39, 73, '2025-09-24', NULL, 100.00, '2025-09-26 04:31:32'),
(40, 74, '2025-09-24', NULL, 100.00, '2025-09-26 04:31:32'),
(41, 76, '2025-09-25', NULL, 100.00, '2025-09-26 04:31:32'),
(42, 77, '2025-09-25', NULL, 100.00, '2025-09-26 04:31:32'),
(43, 78, '2025-09-25', '2025-09-28', 100.00, '2025-09-26 04:31:32'),
(44, 79, '2025-09-25', NULL, 100.00, '2025-09-26 04:31:32'),
(45, 80, '2025-09-25', NULL, 100.00, '2025-09-26 04:31:32'),
(46, 81, '2025-09-25', NULL, 100.00, '2025-09-26 04:31:32'),
(47, 82, '2025-09-25', NULL, 100.00, '2025-09-26 04:31:32'),
(48, 83, '2025-09-25', NULL, 100.00, '2025-09-26 04:31:32'),
(64, 85, '2025-09-26', NULL, 100.00, '2025-09-26 05:59:10'),
(65, 86, '2025-09-26', NULL, 100.00, '2025-09-26 06:43:34'),
(67, 88, '2025-09-26', '2025-09-26', 100.00, '2025-09-26 07:47:27'),
(69, 89, '2025-09-26', NULL, 100.00, '2025-09-26 09:45:20'),
(70, 90, '2025-09-26', NULL, 100.00, '2025-09-26 10:46:28'),
(71, 91, '2025-09-27', NULL, 100.00, '2025-09-27 08:06:22'),
(72, 21, '2025-09-29', '2025-09-30', 100.00, '2025-09-29 07:56:11'),
(73, 54, '2025-09-29', NULL, 100.00, '2025-09-29 07:56:27'),
(74, 71, '2025-09-29', NULL, 100.00, '2025-09-29 08:17:42'),
(75, 75, '2025-09-29', NULL, 100.00, '2025-09-29 08:18:52'),
(76, 78, '2025-09-29', NULL, 100.00, '2025-09-29 08:19:40'),
(77, 92, '2025-09-29', NULL, 100.00, '2025-09-29 08:20:31'),
(78, 94, '2025-09-29', NULL, 100.00, '2025-09-29 08:27:15'),
(79, 95, '2025-09-29', NULL, 100.00, '2025-09-29 09:40:36'),
(80, 97, '2025-09-30', '2025-09-30', 100.00, '2025-09-30 07:02:26'),
(81, 99, '2025-09-30', NULL, 100.00, '2025-09-30 10:07:27'),
(82, 100, '2025-09-30', NULL, 100.00, '2025-09-30 10:23:10'),
(83, 101, '2025-09-30', NULL, 100.00, '2025-09-30 11:37:29'),
(84, 102, '2025-09-30', NULL, 100.00, '2025-09-30 12:26:46'),
(85, 103, '2025-10-01', NULL, 100.00, '2025-10-01 12:15:01');

-- --------------------------------------------------------

--
-- Structure de la table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `phone_number` varchar(20) NOT NULL,
  `pin` varchar(255) NOT NULL,
  `role` enum('admin','livreur') NOT NULL,
  `status` enum('actif','inactif') NOT NULL DEFAULT 'actif',
  `name` varchar(255) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `users`
--

INSERT INTO `users` (`id`, `phone_number`, `pin`, `role`, `status`, `name`, `created_at`, `updated_at`) VALUES
(1, '690484981', '1234', 'admin', 'actif', 'Bardon', '2025-09-08 08:02:07', '2025-10-05 13:29:45'),
(15, '658215442', '5442', 'admin', 'actif', 'Maffo Pagnole', '2025-09-21 19:21:40', '2025-09-22 02:49:22'),
(17, '696987880', '1234', 'admin', 'actif', 'Makougoum idenne', '2025-09-22 04:07:24', '2025-09-22 04:07:33'),
(18, '693557575', '1234', 'admin', 'actif', 'Ngakem Flore', '2025-09-22 04:11:03', '2025-09-22 04:11:03'),
(19, '696139326', '1234', 'livreur', 'actif', 'Ntetngu\'u Chirac', '2025-09-22 04:12:36', '2025-09-22 04:12:36'),
(20, '650134794', '1234', 'livreur', 'actif', 'Kemka Martial ', '2025-09-22 04:13:06', '2025-09-22 04:13:06'),
(21, '694926390', '1234', 'livreur', 'actif', 'NGBWE  YVAN', '2025-09-22 04:13:35', '2025-09-22 04:13:35'),
(22, '693474587', '1234', 'livreur', 'actif', 'Tchougang junior ', '2025-09-22 04:14:39', '2025-09-22 04:14:39'),
(23, '697183175', '1234', 'livreur', 'actif', 'Benten  Jordan ', '2025-09-22 04:15:12', '2025-09-22 04:15:12'),
(24, '694932382', '1234', 'livreur', 'actif', 'Onana Gallus', '2025-09-22 04:15:35', '2025-09-22 04:15:35'),
(25, '693567255', '1234', 'livreur', 'actif', 'Metila  Georges ', '2025-09-22 04:16:00', '2025-09-22 04:16:00'),
(26, '688182732', '1234', 'livreur', 'actif', 'Kamdeu Edwin ', '2025-09-22 04:16:32', '2025-09-22 04:16:32'),
(27, '657123160', '1234', 'livreur', 'actif', 'NODJI GYLFRIED ', '2025-09-22 04:16:56', '2025-09-22 04:16:56'),
(28, '690159760', '1234', 'livreur', 'actif', 'NGOUMA  ARMEL ', '2025-09-22 04:17:19', '2025-09-22 04:17:19'),
(29, '697866279', '1234', 'livreur', 'actif', 'Messi Joseph ', '2025-09-22 04:17:48', '2025-09-22 04:17:48'),
(30, '656065084', '1234', 'admin', 'actif', 'Ngono Lehman', '2025-09-22 06:36:18', '2025-09-22 06:36:18'),
(32, '0000', '0000', 'livreur', 'actif', 'rider', '2025-09-23 11:30:34', '2025-10-06 14:40:34'),
(33, '695523964', '0000', 'admin', 'actif', 'MEKONDANE MEKONDANE FRANCK VINCENT', '2025-09-25 05:54:04', '2025-09-25 05:54:04'),
(34, '692260821', '0000', 'admin', 'actif', 'ADJEUFACK JULIO', '2025-09-25 05:59:23', '2025-09-25 05:59:23');

--
-- Index pour les tables déchargées
--

--
-- Index pour la table `cash_closings`
--
ALTER TABLE `cash_closings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `closing_date` (`closing_date`),
  ADD KEY `closed_by_user_id` (`closed_by_user_id`);

--
-- Index pour la table `cash_transactions`
--
ALTER TABLE `cash_transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `validated_by` (`validated_by`),
  ADD KEY `category_id` (`category_id`);

--
-- Index pour la table `daily_shop_balances`
--
ALTER TABLE `daily_shop_balances`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `date_shop_unique` (`report_date`,`shop_id`),
  ADD KEY `shop_id` (`shop_id`);

--
-- Index pour la table `debts`
--
ALTER TABLE `debts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_debt_idempotence` (`shop_id`,`type`,`creation_date_only`),
  ADD KEY `order_id` (`order_id`),
  ADD KEY `idx_debt_shop` (`shop_id`),
  ADD KEY `idx_debt_status` (`status`),
  ADD KEY `idx_debt_created_at` (`created_at`),
  ADD KEY `idx_debt_type_date` (`type`,`created_at`);

--
-- Index pour la table `deliveryman_shortfalls`
--
ALTER TABLE `deliveryman_shortfalls`
  ADD PRIMARY KEY (`id`),
  ADD KEY `deliveryman_id` (`deliveryman_id`),
  ADD KEY `fk_shortfall_user` (`created_by_user_id`);

--
-- Index pour la table `expenses`
--
ALTER TABLE `expenses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `rider_id` (`rider_id`);

--
-- Index pour la table `expense_categories`
--
ALTER TABLE `expense_categories`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `livreurs`
--
ALTER TABLE `livreurs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`);

--
-- Index pour la table `monthly_objectives`
--
ALTER TABLE `monthly_objectives`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `month_year` (`month_year`),
  ADD KEY `idx_month_year` (`month_year`);

--
-- Index pour la table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `shop_id` (`shop_id`),
  ADD KEY `deliveryman_id` (`deliveryman_id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `updated_by` (`updated_by`);

--
-- Index pour la table `order_history`
--
ALTER TABLE `order_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `order_id` (`order_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Index pour la table `order_items`
--
ALTER TABLE `order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `order_id` (`order_id`);

--
-- Index pour la table `push_subscriptions`
--
ALTER TABLE `push_subscriptions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `token` (`token`),
  ADD KEY `user_id` (`user_id`);

--
-- Index pour la table `remittances`
--
ALTER TABLE `remittances`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `shop_date_unique` (`shop_id`,`remittance_date`),
  ADD UNIQUE KEY `uk_remittance_unique` (`shop_id`,`remittance_date`),
  ADD KEY `shop_id` (`shop_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Index pour la table `remittance_orders`
--
ALTER TABLE `remittance_orders`
  ADD PRIMARY KEY (`remittance_id`,`order_id`),
  ADD KEY `order_id` (`order_id`);

--
-- Index pour la table `returned_stock_tracking`
--
ALTER TABLE `returned_stock_tracking`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_order_return` (`order_id`),
  ADD KEY `fk_return_deliveryman` (`deliveryman_id`),
  ADD KEY `fk_return_shop` (`shop_id`),
  ADD KEY `fk_return_stocker` (`stock_received_by_user_id`);

--
-- Index pour la table `rider_absences`
--
ALTER TABLE `rider_absences`
  ADD PRIMARY KEY (`id`),
  ADD KEY `created_by_user_id` (`created_by_user_id`),
  ADD KEY `idx_absence_date` (`absence_date`),
  ADD KEY `idx_user_date` (`user_id`,`absence_date`);

--
-- Index pour la table `shops`
--
ALTER TABLE `shops`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_shops_name` (`name`),
  ADD KEY `idx_shops_phone_number` (`phone_number`),
  ADD KEY `idx_shops_created_by` (`created_by`);

--
-- Index pour la table `shop_storage_history`
--
ALTER TABLE `shop_storage_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `shop_id` (`shop_id`);

--
-- Index pour la table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `phone_number` (`phone_number`),
  ADD KEY `idx_users_phone_number` (`phone_number`),
  ADD KEY `idx_users_role` (`role`);

--
-- AUTO_INCREMENT pour les tables déchargées
--

--
-- AUTO_INCREMENT pour la table `cash_closings`
--
ALTER TABLE `cash_closings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT pour la table `cash_transactions`
--
ALTER TABLE `cash_transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT pour la table `daily_shop_balances`
--
ALTER TABLE `daily_shop_balances`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=234;

--
-- AUTO_INCREMENT pour la table `debts`
--
ALTER TABLE `debts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT pour la table `deliveryman_shortfalls`
--
ALTER TABLE `deliveryman_shortfalls`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT pour la table `expenses`
--
ALTER TABLE `expenses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `expense_categories`
--
ALTER TABLE `expense_categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT pour la table `livreurs`
--
ALTER TABLE `livreurs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT pour la table `monthly_objectives`
--
ALTER TABLE `monthly_objectives`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT pour la table `orders`
--
ALTER TABLE `orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT pour la table `order_history`
--
ALTER TABLE `order_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT pour la table `order_items`
--
ALTER TABLE `order_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT pour la table `push_subscriptions`
--
ALTER TABLE `push_subscriptions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT pour la table `remittances`
--
ALTER TABLE `remittances`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT pour la table `returned_stock_tracking`
--
ALTER TABLE `returned_stock_tracking`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `rider_absences`
--
ALTER TABLE `rider_absences`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT pour la table `shops`
--
ALTER TABLE `shops`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=104;

--
-- AUTO_INCREMENT pour la table `shop_storage_history`
--
ALTER TABLE `shop_storage_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=86;

--
-- AUTO_INCREMENT pour la table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=36;

--
-- Contraintes pour les tables déchargées
--

--
-- Contraintes pour la table `cash_closings`
--
ALTER TABLE `cash_closings`
  ADD CONSTRAINT `cash_closings_ibfk_1` FOREIGN KEY (`closed_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Contraintes pour la table `cash_transactions`
--
ALTER TABLE `cash_transactions`
  ADD CONSTRAINT `cash_transactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `cash_transactions_ibfk_2` FOREIGN KEY (`validated_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `cash_transactions_ibfk_3` FOREIGN KEY (`category_id`) REFERENCES `expense_categories` (`id`);

--
-- Contraintes pour la table `daily_shop_balances`
--
ALTER TABLE `daily_shop_balances`
  ADD CONSTRAINT `daily_shop_balances_ibfk_1` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `debts`
--
ALTER TABLE `debts`
  ADD CONSTRAINT `debts_ibfk_1` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `debts_ibfk_2` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE SET NULL;

--
-- Contraintes pour la table `deliveryman_shortfalls`
--
ALTER TABLE `deliveryman_shortfalls`
  ADD CONSTRAINT `fk_shortfall_deliveryman` FOREIGN KEY (`deliveryman_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_shortfall_user` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Contraintes pour la table `expenses`
--
ALTER TABLE `expenses`
  ADD CONSTRAINT `expenses_ibfk_1` FOREIGN KEY (`rider_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `livreurs`
--
ALTER TABLE `livreurs`
  ADD CONSTRAINT `livreurs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `orders_ibfk_2` FOREIGN KEY (`deliveryman_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `orders_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `orders_ibfk_4` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Contraintes pour la table `order_history`
--
ALTER TABLE `order_history`
  ADD CONSTRAINT `order_history_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `order_history_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Contraintes pour la table `order_items`
--
ALTER TABLE `order_items`
  ADD CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `push_subscriptions`
--
ALTER TABLE `push_subscriptions`
  ADD CONSTRAINT `push_subscriptions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `remittances`
--
ALTER TABLE `remittances`
  ADD CONSTRAINT `remittances_ibfk_1` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `remittances_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Contraintes pour la table `remittance_orders`
--
ALTER TABLE `remittance_orders`
  ADD CONSTRAINT `remittance_orders_ibfk_1` FOREIGN KEY (`remittance_id`) REFERENCES `remittances` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `remittance_orders_ibfk_2` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `returned_stock_tracking`
--
ALTER TABLE `returned_stock_tracking`
  ADD CONSTRAINT `fk_return_deliveryman` FOREIGN KEY (`deliveryman_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_return_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_return_shop` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_return_stocker` FOREIGN KEY (`stock_received_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Contraintes pour la table `rider_absences`
--
ALTER TABLE `rider_absences`
  ADD CONSTRAINT `rider_absences_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `rider_absences_ibfk_2` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Contraintes pour la table `shops`
--
ALTER TABLE `shops`
  ADD CONSTRAINT `shops_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Contraintes pour la table `shop_storage_history`
--
ALTER TABLE `shop_storage_history`
  ADD CONSTRAINT `shop_storage_history_ibfk_1` FOREIGN KEY (`shop_id`) REFERENCES `shops` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
