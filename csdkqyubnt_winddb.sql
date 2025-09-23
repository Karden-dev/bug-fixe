-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Hôte : localhost:3306
-- Généré le : mar. 23 sep. 2025 à 08:44
-- Version du serveur : 10.6.23-MariaDB-cll-lve
-- Version de PHP : 8.3.25

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données : `csdkqyubnt_winddb`
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
(14, 26, 'remittance', NULL, 4500.00, 'Versement en attente pour la commande n°53', 'pending', '2025-09-22 11:04:53', NULL, NULL),
(15, 24, 'remittance', NULL, 11500.00, 'Versement en attente pour la commande n°120', 'pending', '2025-09-23 03:23:08', NULL, NULL),
(16, 24, 'remittance', NULL, 11000.00, 'Versement en attente pour la commande n°119', 'pending', '2025-09-23 03:23:08', NULL, NULL),
(17, 24, 'remittance', NULL, 7500.00, 'Versement en attente pour la commande n°122', 'pending', '2025-09-23 03:23:08', NULL, NULL),
(18, 24, 'remittance', NULL, 6000.00, 'Versement en attente pour la commande n°121', 'pending', '2025-09-23 03:23:08', NULL, NULL),
(19, 24, 'remittance', NULL, 12000.00, 'Versement en attente pour la commande n°116', 'pending', '2025-09-23 03:29:43', NULL, NULL),
(20, 24, 'remittance', NULL, 12000.00, 'Versement en attente pour la commande n°116', 'pending', '2025-09-23 03:29:43', NULL, NULL),
(21, 24, 'remittance', NULL, 12000.00, 'Versement en attente pour la commande n°116', 'pending', '2025-09-23 03:29:43', NULL, NULL),
(22, 24, 'remittance', NULL, 12000.00, 'Versement en attente pour la commande n°116', 'pending', '2025-09-23 03:29:43', NULL, NULL),
(23, 24, 'remittance', NULL, 12000.00, 'Versement en attente pour la commande n°116', 'pending', '2025-09-23 03:29:43', NULL, NULL),
(24, 24, 'remittance', NULL, 12000.00, 'Versement en attente pour la commande n°116', 'pending', '2025-09-23 03:29:44', NULL, NULL),
(25, 24, 'remittance', NULL, 12000.00, 'Versement en attente pour la commande n°116', 'pending', '2025-09-23 03:29:44', NULL, NULL),
(26, 24, 'remittance', NULL, 12000.00, 'Versement en attente pour la commande n°116', 'pending', '2025-09-23 03:29:44', NULL, NULL),
(27, 24, 'remittance', NULL, 12000.00, 'Versement en attente pour la commande n°116', 'pending', '2025-09-23 03:29:45', NULL, NULL),
(28, 24, 'remittance', NULL, 8500.00, 'Versement en attente pour la commande n°111', 'pending', '2025-09-23 03:30:42', NULL, NULL),
(29, 24, 'remittance', NULL, 20000.00, 'Versement en attente pour la commande n°117', 'pending', '2025-09-23 03:30:42', NULL, NULL),
(30, 24, 'remittance', NULL, 11000.00, 'Versement en attente pour la commande n°109', 'pending', '2025-09-23 03:30:42', NULL, NULL),
(31, 24, 'remittance', NULL, 16000.00, 'Versement en attente pour la commande n°118', 'pending', '2025-09-23 03:30:42', NULL, NULL),
(32, 24, 'remittance', NULL, 5000.00, 'Versement en attente pour la commande n°115', 'pending', '2025-09-23 03:30:42', NULL, NULL),
(33, 24, 'remittance', NULL, 10500.00, 'Versement en attente pour la commande n°113', 'pending', '2025-09-23 03:30:42', NULL, NULL),
(34, 24, 'remittance', NULL, 11000.00, 'Versement en attente pour la commande n°112', 'pending', '2025-09-23 03:30:42', NULL, NULL),
(35, 24, 'remittance', NULL, 0.00, 'Versement en attente pour la commande n°110', 'pending', '2025-09-23 03:30:42', NULL, NULL),
(36, 24, 'remittance', NULL, 4000.00, 'Versement en attente pour la commande n°114', 'pending', '2025-09-23 03:30:42', NULL, NULL),
(37, 27, 'remittance', NULL, 9000.00, 'Versement en attente pour la commande n°123', 'pending', '2025-09-23 04:37:11', NULL, NULL),
(38, 27, 'remittance', NULL, 13500.00, 'Versement en attente pour la commande n°124', 'pending', '2025-09-23 04:37:20', NULL, NULL),
(39, 27, 'remittance', NULL, 13000.00, 'Versement en attente pour la commande n°126', 'pending', '2025-09-23 04:37:56', NULL, NULL),
(40, 27, 'remittance', NULL, 13000.00, 'Versement en attente pour la commande n°130', 'pending', '2025-09-23 04:38:45', NULL, NULL),
(41, 28, 'remittance', NULL, 11000.00, 'Versement en attente pour la commande n°96', 'pending', '2025-09-23 04:46:21', NULL, NULL),
(42, 28, 'remittance', NULL, 11000.00, 'Versement en attente pour la commande n°97', 'pending', '2025-09-23 04:47:08', NULL, NULL),
(43, 28, 'remittance', NULL, 11000.00, 'Versement en attente pour la commande n°98', 'pending', '2025-09-23 04:47:34', NULL, NULL),
(44, 28, 'remittance', NULL, 12000.00, 'Versement en attente pour la commande n°99', 'pending', '2025-09-23 04:48:05', NULL, NULL),
(45, 28, 'remittance', NULL, 4500.00, 'Versement en attente pour la commande n°100', 'pending', '2025-09-23 04:49:21', NULL, NULL),
(46, 28, 'remittance', NULL, 9000.00, 'Versement en attente pour la commande n°101', 'pending', '2025-09-23 04:49:46', NULL, NULL),
(47, 28, 'remittance', NULL, 42500.00, 'Versement en attente pour la commande n°103', 'pending', '2025-09-23 04:51:18', NULL, NULL),
(48, 28, 'remittance', NULL, 14000.00, 'Versement en attente pour la commande n°104', 'pending', '2025-09-23 04:51:54', NULL, NULL),
(49, 28, 'remittance', NULL, 16000.00, 'Versement en attente pour la commande n°106', 'pending', '2025-09-23 04:52:55', NULL, NULL),
(50, 28, 'remittance', NULL, 15000.00, 'Versement en attente pour la commande n°107', 'pending', '2025-09-23 04:53:20', NULL, NULL),
(51, 28, 'remittance', NULL, 24000.00, 'Versement en attente pour la commande n°108', 'pending', '2025-09-23 04:53:45', NULL, NULL),
(52, 20, 'remittance', NULL, 9000.00, 'Versement en attente pour la commande n°90', 'pending', '2025-09-23 04:56:26', NULL, NULL),
(53, 20, 'remittance', NULL, 9000.00, 'Versement en attente pour la commande n°90', 'pending', '2025-09-23 04:56:26', NULL, NULL),
(54, 20, 'remittance', NULL, 6500.00, 'Versement en attente pour la commande n°95', 'pending', '2025-09-23 04:57:58', NULL, NULL),
(55, 20, 'remittance', NULL, 26000.00, 'Versement en attente pour la commande n°91', 'pending', '2025-09-23 04:57:58', NULL, NULL),
(56, 20, 'remittance', NULL, 12000.00, 'Versement en attente pour la commande n°92', 'pending', '2025-09-23 04:57:58', NULL, NULL),
(57, 20, 'remittance', NULL, 16000.00, 'Versement en attente pour la commande n°94', 'pending', '2025-09-23 04:57:58', NULL, NULL),
(58, 24, 'remittance', NULL, 6000.00, 'Versement en attente pour la commande n°134', 'pending', '2025-09-23 05:19:33', NULL, NULL),
(59, 24, 'remittance', NULL, 11500.00, 'Versement en attente pour la commande n°133', 'pending', '2025-09-23 05:19:33', NULL, NULL),
(60, 24, 'remittance', NULL, 11000.00, 'Versement en attente pour la commande n°131', 'pending', '2025-09-23 05:19:33', NULL, NULL),
(61, 24, 'remittance', NULL, 11000.00, 'Versement en attente pour la commande n°132', 'pending', '2025-09-23 05:19:33', NULL, NULL),
(62, 19, 'remittance', NULL, 13500.00, 'Versement en attente pour la commande n°84', 'pending', '2025-09-23 05:29:05', NULL, NULL),
(63, 19, 'remittance', NULL, 4500.00, 'Versement en attente pour la commande n°85', 'pending', '2025-09-23 05:29:17', NULL, NULL),
(64, 19, 'remittance', NULL, 8500.00, 'Versement en attente pour la commande n°86', 'pending', '2025-09-23 05:29:54', NULL, NULL),
(65, 19, 'remittance', NULL, 16000.00, 'Versement en attente pour la commande n°87', 'pending', '2025-09-23 05:30:08', NULL, NULL),
(66, 19, 'remittance', NULL, 35500.00, 'Versement en attente pour la commande n°88', 'pending', '2025-09-23 05:30:24', NULL, NULL),
(67, 19, 'remittance', NULL, 11000.00, 'Versement en attente pour la commande n°89', 'pending', '2025-09-23 05:30:50', NULL, NULL),
(68, 19, 'remittance', NULL, 13000.00, 'Versement en attente pour la commande n°135', 'pending', '2025-09-23 05:42:16', NULL, NULL),
(69, 26, 'remittance', NULL, 4500.00, 'Versement en attente pour la commande n°53', 'pending', '2025-09-23 05:54:00', NULL, NULL),
(70, 26, 'remittance', NULL, 11000.00, 'Versement en attente pour la commande n°50', 'pending', '2025-09-23 05:54:00', NULL, NULL),
(71, 26, 'remittance', NULL, 20000.00, 'Versement en attente pour la commande n°46', 'pending', '2025-09-23 05:54:00', NULL, NULL),
(72, 26, 'remittance', NULL, 17000.00, 'Versement en attente pour la commande n°49', 'pending', '2025-09-23 05:54:00', NULL, NULL),
(73, 26, 'remittance', NULL, 8000.00, 'Versement en attente pour la commande n°139', 'pending', '2025-09-23 06:13:18', NULL, NULL),
(74, 26, 'remittance', NULL, 11000.00, 'Versement en attente pour la commande n°143', 'pending', '2025-09-23 06:13:58', NULL, NULL),
(75, 26, 'remittance', NULL, 10000.00, 'Versement en attente pour la commande n°142', 'pending', '2025-09-23 06:13:58', NULL, NULL),
(76, 26, 'remittance', NULL, 8500.00, 'Versement en attente pour la commande n°140', 'pending', '2025-09-23 06:14:15', NULL, NULL),
(77, 21, 'remittance', NULL, 11000.00, 'Versement en attente pour la commande n°77', 'pending', '2025-09-23 06:22:15', NULL, NULL),
(78, 21, 'remittance', NULL, 11000.00, 'Versement en attente pour la commande n°75', 'pending', '2025-09-23 06:22:15', NULL, NULL),
(79, 21, 'remittance', NULL, 8500.00, 'Versement en attente pour la commande n°73', 'pending', '2025-09-23 06:22:15', NULL, NULL),
(80, 21, 'remittance', NULL, 8000.00, 'Versement en attente pour la commande n°72', 'pending', '2025-09-23 06:22:15', NULL, NULL),
(81, 21, 'remittance', NULL, 11000.00, 'Versement en attente pour la commande n°74', 'pending', '2025-09-23 06:22:15', NULL, NULL),
(82, 21, 'remittance', NULL, 15000.00, 'Versement en attente pour la commande n°147', 'pending', '2025-09-23 06:41:02', NULL, NULL),
(83, 21, 'remittance', NULL, 6000.00, 'Versement en attente pour la commande n°146', 'pending', '2025-09-23 06:41:02', NULL, NULL),
(84, 21, 'remittance', NULL, 24000.00, 'Versement en attente pour la commande n°144', 'pending', '2025-09-23 06:41:02', NULL, NULL),
(85, 21, 'remittance', NULL, 6000.00, 'Versement en attente pour la commande n°145', 'pending', '2025-09-23 06:41:03', NULL, NULL),
(86, 29, 'remittance', NULL, 10000.00, 'Versement en attente pour la commande n°79', 'pending', '2025-09-23 06:50:07', NULL, NULL),
(87, 29, 'remittance', NULL, 10000.00, 'Versement en attente pour la commande n°79', 'pending', '2025-09-23 06:50:07', NULL, NULL),
(88, 29, 'remittance', NULL, 10000.00, 'Versement en attente pour la commande n°80', 'pending', '2025-09-23 06:50:33', NULL, NULL),
(89, 29, 'remittance', NULL, 0.00, 'Versement en attente pour la commande n°81', 'pending', '2025-09-23 06:51:19', NULL, NULL),
(90, 29, 'remittance', NULL, 0.00, 'Versement en attente pour la commande n°81', 'pending', '2025-09-23 06:52:22', NULL, NULL),
(91, 23, 'remittance', NULL, 20000.00, 'Versement en attente pour la commande n°66', 'pending', '2025-09-23 07:01:48', NULL, NULL),
(92, 23, 'remittance', NULL, 26000.00, 'Versement en attente pour la commande n°67', 'pending', '2025-09-23 07:02:02', NULL, NULL),
(93, 23, 'remittance', NULL, 8500.00, 'Versement en attente pour la commande n°68', 'pending', '2025-09-23 07:02:13', NULL, NULL),
(94, 23, 'remittance', NULL, 10000.00, 'Versement en attente pour la commande n°69', 'pending', '2025-09-23 07:02:32', NULL, NULL),
(95, 23, 'remittance', NULL, 6000.00, 'Versement en attente pour la commande n°154', 'pending', '2025-09-23 07:15:46', NULL, NULL),
(96, 23, 'remittance', NULL, 9900.00, 'Versement en attente pour la commande n°152', 'pending', '2025-09-23 07:15:46', NULL, NULL),
(97, 23, 'remittance', NULL, 7500.00, 'Versement en attente pour la commande n°151', 'pending', '2025-09-23 07:15:46', NULL, NULL),
(98, 23, 'remittance', NULL, 3500.00, 'Versement en attente pour la commande n°153', 'pending', '2025-09-23 07:15:46', NULL, NULL),
(99, 23, 'remittance', NULL, 43000.00, 'Versement en attente pour la commande n°150', 'pending', '2025-09-23 07:15:46', NULL, NULL),
(100, 23, 'remittance', NULL, 10000.00, 'Versement en attente pour la commande n°149', 'pending', '2025-09-23 07:15:46', NULL, NULL),
(101, 22, 'remittance', NULL, 0.00, 'Versement en attente pour la commande n°58', 'pending', '2025-09-23 07:21:40', NULL, NULL),
(102, 22, 'remittance', NULL, 13500.00, 'Versement en attente pour la commande n°59', 'pending', '2025-09-23 07:21:40', NULL, NULL),
(103, 22, 'remittance', NULL, 10000.00, 'Versement en attente pour la commande n°63', 'pending', '2025-09-23 07:21:40', NULL, NULL),
(104, 22, 'remittance', NULL, 28000.00, 'Versement en attente pour la commande n°61', 'pending', '2025-09-23 07:22:29', NULL, NULL),
(105, 22, 'remittance', NULL, 0.00, 'Versement en attente pour la commande n°156', 'pending', '2025-09-23 07:30:23', NULL, NULL),
(106, 22, 'remittance', NULL, 13500.00, 'Versement en attente pour la commande n°155', 'pending', '2025-09-23 07:30:32', NULL, NULL),
(107, 26, 'remittance', NULL, 13500.00, 'Versement en attente pour la commande n°51', 'pending', '2025-09-23 07:33:35', NULL, NULL),
(108, 29, 'remittance', NULL, 0.00, 'Versement en attente pour la commande n°158', 'pending', '2025-09-23 07:40:25', NULL, NULL),
(109, 29, 'remittance', NULL, 0.00, 'Versement en attente pour la commande n°158', 'pending', '2025-09-23 07:45:29', NULL, NULL),
(110, 24, 'remittance', NULL, 7000.00, 'Versement en attente pour la commande n°122', 'pending', '2025-09-23 08:26:43', NULL, NULL),
(111, 29, 'remittance', NULL, 0.00, 'Versement en attente pour la commande n°81', 'pending', '2025-09-23 08:27:40', NULL, NULL),
(112, 29, 'remittance', NULL, 1500.00, 'Versement en attente pour la commande n°81', 'pending', '2025-09-23 08:28:25', NULL, NULL);

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
-- Structure de la table `debts`
--

CREATE TABLE `debts` (
  `id` int(11) NOT NULL,
  `shop_id` int(11) NOT NULL,
  `order_id` int(11) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `type` enum('packaging','storage','delivery_fee','other','expedition') NOT NULL,
  `status` enum('pending','paid') NOT NULL DEFAULT 'pending',
  `comment` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `settled_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `debts`
--

INSERT INTO `debts` (`id`, `shop_id`, `order_id`, `amount`, `type`, `status`, `comment`, `created_at`, `updated_at`, `created_by`, `updated_by`, `settled_at`) VALUES
(13, 33, 64, 1000.00, 'expedition', 'pending', 'Frais d\'expédition pour la commande n°64', '2025-09-22 12:42:30', '2025-09-22 12:42:30', NULL, NULL, NULL),
(14, 18, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-22 15:07:12', NULL, NULL, NULL),
(15, 19, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-22 15:07:12', NULL, NULL, NULL),
(16, 20, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-22 15:07:12', NULL, NULL, NULL),
(17, 21, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-22 15:07:12', NULL, NULL, NULL),
(18, 22, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-22 15:07:12', NULL, NULL, NULL),
(19, 23, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-22 15:07:12', NULL, NULL, NULL),
(20, 24, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-22 15:07:12', NULL, NULL, NULL),
(21, 25, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-22 15:07:12', NULL, NULL, NULL),
(22, 32, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-22 15:07:12', NULL, NULL, NULL),
(23, 33, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-22 15:07:12', NULL, NULL, NULL),
(24, 34, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-22 15:07:12', NULL, NULL, NULL),
(25, 35, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-22 15:07:12', NULL, NULL, NULL),
(26, 36, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-22 15:07:12', NULL, NULL, NULL),
(27, 18, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-22 15:07:30', NULL, NULL, NULL),
(28, 19, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-22 15:07:30', NULL, NULL, NULL),
(29, 20, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-22 15:07:30', NULL, NULL, NULL),
(30, 21, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-22 15:07:30', NULL, NULL, NULL),
(31, 22, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-22 15:07:30', NULL, NULL, NULL),
(32, 23, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-22 15:07:30', NULL, NULL, NULL),
(33, 24, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-22 15:07:30', NULL, NULL, NULL),
(34, 25, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-22 15:07:30', NULL, NULL, NULL),
(35, 32, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-22 15:07:30', NULL, NULL, NULL),
(36, 33, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-22 15:07:30', NULL, NULL, NULL),
(37, 34, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-22 15:07:30', NULL, NULL, NULL),
(38, 35, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-22 15:07:30', NULL, NULL, NULL),
(39, 36, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-22 15:07:30', NULL, NULL, NULL),
(40, 45, 102, 3000.00, 'expedition', 'pending', 'Mise à jour des frais d\'expédition pour la commande n°102', '2025-09-22 17:15:14', '2025-09-22 17:32:33', NULL, NULL, NULL),
(41, 18, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-23', '2025-09-23 04:00:00', '2025-09-23 11:48:44', NULL, NULL, NULL),
(42, 19, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-23', '2025-09-23 04:00:00', '2025-09-23 11:48:44', NULL, NULL, NULL),
(43, 20, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-23', '2025-09-23 04:00:00', '2025-09-23 11:48:44', NULL, NULL, NULL),
(44, 21, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-23', '2025-09-23 04:00:00', '2025-09-23 11:48:44', NULL, NULL, NULL),
(45, 22, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-23', '2025-09-23 04:00:00', '2025-09-23 11:48:44', NULL, NULL, NULL),
(46, 23, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-23', '2025-09-23 04:00:00', '2025-09-23 11:48:44', NULL, NULL, NULL),
(47, 24, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-23', '2025-09-23 04:00:00', '2025-09-23 11:48:44', NULL, NULL, NULL),
(48, 25, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-23', '2025-09-23 04:00:00', '2025-09-23 11:48:44', NULL, NULL, NULL),
(49, 32, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-23', '2025-09-23 04:00:00', '2025-09-23 11:48:44', NULL, NULL, NULL),
(50, 33, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-23', '2025-09-23 04:00:00', '2025-09-23 11:48:44', NULL, NULL, NULL),
(51, 34, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-23', '2025-09-23 04:00:00', '2025-09-23 11:48:44', NULL, NULL, NULL),
(52, 35, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-23', '2025-09-23 04:00:00', '2025-09-23 11:48:44', NULL, NULL, NULL),
(53, 36, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-23', '2025-09-23 04:00:00', '2025-09-23 11:48:44', NULL, NULL, NULL),
(54, 37, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-23', '2025-09-23 04:00:00', '2025-09-23 11:48:44', NULL, NULL, NULL),
(55, 38, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-23', '2025-09-23 04:00:00', '2025-09-23 11:48:44', NULL, NULL, NULL),
(56, 39, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-23', '2025-09-23 04:00:00', '2025-09-23 11:48:44', NULL, NULL, NULL),
(57, 40, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-23', '2025-09-23 04:00:00', '2025-09-23 11:48:44', NULL, NULL, NULL),
(58, 41, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-23', '2025-09-23 04:00:00', '2025-09-23 11:48:44', NULL, NULL, NULL),
(59, 42, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-23', '2025-09-23 04:00:00', '2025-09-23 11:48:44', NULL, NULL, NULL),
(60, 43, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-23', '2025-09-23 04:00:00', '2025-09-23 11:48:44', NULL, NULL, NULL),
(61, 44, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-23', '2025-09-23 04:00:00', '2025-09-23 11:48:44', NULL, NULL, NULL),
(62, 45, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-23', '2025-09-23 04:00:00', '2025-09-23 11:48:44', NULL, NULL, NULL),
(63, 46, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-23', '2025-09-23 04:00:00', '2025-09-23 11:48:44', NULL, NULL, NULL),
(64, 47, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-23', '2025-09-23 04:00:00', '2025-09-23 11:48:44', NULL, NULL, NULL),
(65, 48, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-23', '2025-09-23 04:00:00', '2025-09-23 11:48:44', NULL, NULL, NULL),
(66, 50, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-23', '2025-09-23 04:00:00', '2025-09-23 11:48:44', NULL, NULL, NULL),
(67, 51, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-23', '2025-09-23 04:00:00', '2025-09-23 11:48:44', NULL, NULL, NULL),
(68, 53, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-23', '2025-09-23 04:00:00', '2025-09-23 11:48:44', NULL, NULL, NULL),
(69, 55, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-23', '2025-09-23 04:00:00', '2025-09-23 11:48:44', NULL, NULL, NULL),
(70, 18, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:15:09', NULL, NULL, NULL),
(71, 19, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:15:09', NULL, NULL, NULL),
(72, 20, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:15:09', NULL, NULL, NULL),
(73, 21, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:15:09', NULL, NULL, NULL),
(74, 22, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:15:09', NULL, NULL, NULL),
(75, 23, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:15:09', NULL, NULL, NULL),
(76, 24, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:15:09', NULL, NULL, NULL),
(77, 25, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:15:09', NULL, NULL, NULL),
(78, 32, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:15:09', NULL, NULL, NULL),
(79, 33, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:15:09', NULL, NULL, NULL),
(80, 34, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:15:09', NULL, NULL, NULL),
(81, 35, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:15:09', NULL, NULL, NULL),
(82, 36, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:15:09', NULL, NULL, NULL),
(83, 37, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:15:09', NULL, NULL, NULL),
(84, 38, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:15:09', NULL, NULL, NULL),
(85, 39, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:15:09', NULL, NULL, NULL),
(86, 40, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:15:09', NULL, NULL, NULL),
(87, 41, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:15:09', NULL, NULL, NULL),
(88, 42, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:15:09', NULL, NULL, NULL),
(89, 43, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:15:09', NULL, NULL, NULL),
(90, 44, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:15:09', NULL, NULL, NULL),
(91, 45, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:15:09', NULL, NULL, NULL),
(92, 46, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:15:09', NULL, NULL, NULL),
(93, 47, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:15:09', NULL, NULL, NULL),
(94, 48, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:15:09', NULL, NULL, NULL),
(95, 50, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:15:09', NULL, NULL, NULL),
(96, 51, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:15:09', NULL, NULL, NULL),
(97, 53, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:15:09', NULL, NULL, NULL),
(98, 55, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:15:09', NULL, NULL, NULL),
(99, 31, NULL, 2500.00, '', 'pending', 'Report du solde négatif du 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:15:32', NULL, NULL, NULL),
(100, 35, NULL, 1500.00, '', 'pending', 'Report du solde négatif du 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:15:32', NULL, NULL, NULL),
(101, 38, NULL, 3000.00, '', 'pending', 'Report du solde négatif du 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:15:32', NULL, NULL, NULL),
(102, 46, NULL, 1500.00, '', 'pending', 'Report du solde négatif du 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:15:32', NULL, NULL, NULL),
(103, 49, NULL, 1500.00, '', 'pending', 'Report du solde négatif du 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:15:32', NULL, NULL, NULL),
(104, 53, NULL, 2600.00, '', 'pending', 'Report du solde négatif du 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:15:32', NULL, NULL, NULL),
(105, 56, NULL, 1000.00, '', 'pending', 'Report du solde négatif du 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:15:32', NULL, NULL, NULL),
(106, 57, NULL, 750.00, '', 'pending', 'Report du solde négatif du 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:15:32', NULL, NULL, NULL),
(107, 18, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:19:02', NULL, NULL, NULL),
(108, 19, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:19:02', NULL, NULL, NULL),
(109, 20, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:19:02', NULL, NULL, NULL),
(110, 21, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:19:02', NULL, NULL, NULL),
(111, 22, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:19:02', NULL, NULL, NULL),
(112, 23, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:19:02', NULL, NULL, NULL),
(113, 24, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:19:02', NULL, NULL, NULL),
(114, 25, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:19:02', NULL, NULL, NULL),
(115, 32, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:19:02', NULL, NULL, NULL),
(116, 33, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:19:02', NULL, NULL, NULL),
(117, 34, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:19:02', NULL, NULL, NULL),
(118, 35, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:19:02', NULL, NULL, NULL),
(119, 36, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:19:02', NULL, NULL, NULL),
(120, 37, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:19:02', NULL, NULL, NULL),
(121, 38, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:19:02', NULL, NULL, NULL),
(122, 39, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:19:02', NULL, NULL, NULL),
(123, 40, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:19:02', NULL, NULL, NULL),
(124, 41, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:19:02', NULL, NULL, NULL),
(125, 42, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:19:02', NULL, NULL, NULL),
(126, 43, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:19:02', NULL, NULL, NULL),
(127, 44, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:19:02', NULL, NULL, NULL),
(128, 45, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:19:02', NULL, NULL, NULL),
(129, 46, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:19:02', NULL, NULL, NULL),
(130, 47, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:19:02', NULL, NULL, NULL),
(131, 48, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:19:02', NULL, NULL, NULL),
(132, 50, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:19:02', NULL, NULL, NULL),
(133, 51, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:19:02', NULL, NULL, NULL),
(134, 53, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:19:02', NULL, NULL, NULL),
(135, 55, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:19:02', NULL, NULL, NULL),
(136, 31, NULL, 2500.00, '', 'pending', 'Report du solde négatif du 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:19:07', NULL, NULL, NULL),
(137, 35, NULL, 1500.00, '', 'pending', 'Report du solde négatif du 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:19:07', NULL, NULL, NULL),
(138, 38, NULL, 3000.00, '', 'pending', 'Report du solde négatif du 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:19:07', NULL, NULL, NULL),
(139, 46, NULL, 1500.00, '', 'pending', 'Report du solde négatif du 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:19:07', NULL, NULL, NULL),
(140, 49, NULL, 1500.00, '', 'pending', 'Report du solde négatif du 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:19:07', NULL, NULL, NULL),
(141, 53, NULL, 2600.00, '', 'pending', 'Report du solde négatif du 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:19:07', NULL, NULL, NULL),
(142, 56, NULL, 1000.00, '', 'pending', 'Report du solde négatif du 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:19:07', NULL, NULL, NULL),
(143, 57, NULL, 750.00, '', 'pending', 'Report du solde négatif du 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:19:07', NULL, NULL, NULL),
(144, 31, NULL, 2500.00, '', 'pending', 'Report du solde négatif du 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:31:14', NULL, NULL, NULL),
(145, 35, NULL, 1500.00, '', 'pending', 'Report du solde négatif du 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:31:14', NULL, NULL, NULL),
(146, 38, NULL, 1500.00, '', 'pending', 'Report du solde négatif du 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:31:14', NULL, NULL, NULL),
(147, 46, NULL, 1500.00, '', 'pending', 'Report du solde négatif du 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:31:14', NULL, NULL, NULL),
(148, 49, NULL, 1500.00, '', 'pending', 'Report du solde négatif du 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:31:14', NULL, NULL, NULL),
(149, 53, NULL, 2600.00, '', 'pending', 'Report du solde négatif du 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:31:14', NULL, NULL, NULL),
(150, 56, NULL, 1000.00, '', 'pending', 'Report du solde négatif du 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:31:14', NULL, NULL, NULL),
(151, 57, NULL, 750.00, '', 'pending', 'Report du solde négatif du 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:31:14', NULL, NULL, NULL),
(152, 18, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:31:25', NULL, NULL, NULL),
(153, 19, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:31:25', NULL, NULL, NULL),
(154, 20, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:31:25', NULL, NULL, NULL),
(155, 21, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:31:25', NULL, NULL, NULL),
(156, 22, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:31:25', NULL, NULL, NULL),
(157, 23, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:31:25', NULL, NULL, NULL),
(158, 24, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:31:25', NULL, NULL, NULL),
(159, 25, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:31:25', NULL, NULL, NULL),
(160, 32, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:31:25', NULL, NULL, NULL),
(161, 33, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:31:25', NULL, NULL, NULL),
(162, 34, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:31:25', NULL, NULL, NULL),
(163, 35, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:31:25', NULL, NULL, NULL),
(164, 36, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:31:25', NULL, NULL, NULL),
(165, 37, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:31:25', NULL, NULL, NULL),
(166, 38, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:31:25', NULL, NULL, NULL),
(167, 39, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:31:25', NULL, NULL, NULL),
(168, 40, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:31:25', NULL, NULL, NULL),
(169, 41, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:31:25', NULL, NULL, NULL),
(170, 42, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:31:25', NULL, NULL, NULL),
(171, 43, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:31:25', NULL, NULL, NULL),
(172, 44, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:31:25', NULL, NULL, NULL),
(173, 45, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:31:25', NULL, NULL, NULL),
(174, 46, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:31:25', NULL, NULL, NULL),
(175, 47, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:31:25', NULL, NULL, NULL),
(176, 48, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:31:25', NULL, NULL, NULL),
(177, 50, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:31:25', NULL, NULL, NULL),
(178, 51, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:31:25', NULL, NULL, NULL),
(179, 53, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:31:25', NULL, NULL, NULL),
(180, 55, NULL, 100.00, '', 'pending', 'Frais de stockage pour le 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:31:25', NULL, NULL, NULL),
(181, 31, NULL, 2500.00, '', 'pending', 'Report du solde négatif du 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:31:46', NULL, NULL, NULL),
(182, 35, NULL, 1500.00, '', 'pending', 'Report du solde négatif du 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:31:46', NULL, NULL, NULL),
(183, 38, NULL, 1500.00, '', 'pending', 'Report du solde négatif du 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:31:46', NULL, NULL, NULL),
(184, 46, NULL, 1500.00, '', 'pending', 'Report du solde négatif du 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:31:46', NULL, NULL, NULL),
(185, 49, NULL, 1500.00, '', 'pending', 'Report du solde négatif du 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:31:46', NULL, NULL, NULL),
(186, 53, NULL, 2600.00, '', 'pending', 'Report du solde négatif du 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:31:46', NULL, NULL, NULL),
(187, 56, NULL, 1000.00, '', 'pending', 'Report du solde négatif du 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:31:46', NULL, NULL, NULL),
(188, 57, NULL, 750.00, '', 'pending', 'Report du solde négatif du 2025-09-22', '2025-09-22 04:00:00', '2025-09-23 12:31:46', NULL, NULL, NULL);

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
  `updated_by` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `orders`
--

INSERT INTO `orders` (`id`, `shop_id`, `deliveryman_id`, `customer_name`, `customer_phone`, `delivery_location`, `article_amount`, `delivery_fee`, `expedition_fee`, `status`, `payment_status`, `created_by`, `created_at`, `updated_at`, `amount_received`, `debt_amount`, `updated_by`) VALUES
(46, 20, 26, NULL, ' 697615809', 'AWAE', 20000.00, 2000.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 05:14:08', '2025-09-23 05:54:00', 0.00, 0.00, 1),
(49, 22, 26, NULL, '696998203', 'nkaobang 10ème arrête ', 17000.00, 1500.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 05:22:30', '2025-09-23 05:54:00', 0.00, 0.00, 1),
(50, 22, 26, NULL, '695190640', 'Carrouselen face du collège mk2', 11000.00, 1500.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 05:24:50', '2025-09-23 05:54:00', 0.00, 0.00, 1),
(51, 18, 26, NULL, '6 82 03 25 08', 'Minboman entrée maeture', 13500.00, 1500.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 09:25:00', '2025-09-23 07:33:35', 0.00, 0.00, 1),
(53, 24, 26, NULL, '699851835', 'Boulangerie Essomba ', 4500.00, 1500.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 05:33:05', '2025-09-23 05:54:00', 0.00, 0.00, 1),
(58, 30, 22, NULL, '679037100', 'mokolo ', 0.00, 1000.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 07:54:58', '2025-09-23 07:21:40', 0.00, 0.00, 1),
(59, 26, 22, NULL, ':  Collège Nvog ', '679434450', 13500.00, 1000.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 08:04:20', '2025-09-23 07:21:40', 0.00, 0.00, 1),
(60, 31, 22, NULL, ':  ngoa ekelle ', '699182915', 0.00, 1000.00, 0.00, 'delivered', 'paid_to_supplier', 1, '2025-09-22 08:06:28', '2025-09-23 07:21:46', 0.00, 0.00, 1),
(61, 32, 22, NULL, '699182915', 'Mbankolo express union', 28000.00, 1500.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 08:09:09', '2025-09-23 07:22:29', 0.00, 0.00, 1),
(63, 28, 22, NULL, ' 694139124', ':Vers Mont Fébé derrière la Nonciature ', 10000.00, 1500.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 08:20:54', '2025-09-23 07:21:40', 0.00, 0.00, 1),
(64, 33, 23, NULL, ' 681345550', ': Leader Voyage à Olembe', 0.00, 1500.00, 1000.00, 'delivered', 'paid_to_supplier', 1, '2025-09-22 08:42:30', '2025-09-23 07:01:10', 0.00, 0.00, 1),
(65, 24, 23, NULL, ': 699535091', ' manguier', 4500.00, 1500.00, 0.00, 'failed_delivery', 'paid_to_supplier', 1, '2025-09-22 08:44:11', '2025-09-23 07:01:39', 0.00, 0.00, 1),
(66, 25, 23, NULL, '6 79109114', 'Coeur ouvert ', 20000.00, 2000.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 08:45:52', '2025-09-23 07:01:48', 0.00, 0.00, 1),
(67, 21, 23, NULL, '6 73902617', 'à nkozoua derrière dispensaire', 26000.00, 2000.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 08:47:04', '2025-09-23 07:02:02', 0.00, 0.00, 1),
(68, 22, 23, NULL, ' 697570054', ' Dragage', 8500.00, 1500.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 08:48:06', '2025-09-23 07:02:13', 0.00, 0.00, 1),
(69, 34, 23, NULL, '699437136', ' LA PROVINCE', 10000.00, 1500.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 08:54:12', '2025-09-23 07:02:32', 0.00, 0.00, 1),
(70, 24, 23, NULL, ' 698551449', 'messassi express union', 4500.00, 1500.00, 0.00, 'failed_delivery', 'paid_to_supplier', 1, '2025-09-22 08:56:16', '2025-09-23 07:02:46', 0.00, 0.00, 1),
(71, 35, 23, NULL, '6 71055509', 'Messassi dispensaire ', 20000.00, 1500.00, 0.00, 'failed_delivery', 'paid_to_supplier', 1, '2025-09-22 08:59:19', '2025-09-23 07:03:12', 0.00, 0.00, 1),
(72, 20, 21, NULL, '697975355 ', 'GP melen', 8000.00, 1000.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 09:21:28', '2025-09-23 06:22:15', 0.00, 0.00, 1),
(73, 22, 21, NULL, ': 697100045', ' :centre administratif', 8500.00, 1000.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 09:23:04', '2025-09-23 06:22:15', 0.00, 0.00, 1),
(74, 36, 21, NULL, '695565618', ' :poste central, rue marche mfoundi ', 11000.00, 1000.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 09:28:04', '2025-09-23 06:22:15', 0.00, 0.00, 1),
(75, 36, 21, NULL, ': 677944876', ':garnizon military ', 11000.00, 1000.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 09:28:54', '2025-09-23 06:22:15', 0.00, 0.00, 1),
(76, 31, 21, NULL, ':695271482', 'nlongkak  ', 0.00, 1500.00, 0.00, 'delivered', 'paid_to_supplier', 1, '2025-09-22 13:30:00', '2025-09-23 06:24:36', 0.00, 0.00, 1),
(77, 30, 21, NULL, ' :677668276', ' Génie militaire', 11000.00, 1000.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 13:32:00', '2025-09-23 06:22:15', 0.00, 0.00, 1),
(78, 36, 29, NULL, ' 653281386', 'n :Tsinga fecafoot ', 20000.00, 1000.00, 0.00, 'failed_delivery', 'paid_to_supplier', 1, '2025-09-22 11:46:02', '2025-09-23 06:49:35', 0.00, 0.00, 1),
(79, 37, 29, NULL, '6 73 62 61 48', ' Biyem assi cradat', 10000.00, 1000.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 11:49:54', '2025-09-23 06:50:07', 0.00, 0.00, 1),
(80, 37, 29, NULL, '  :698338576', '  BADTOS VERS AMBASSADE NIGERIA PRÉCISÉMENT SOCIÉTÉ ', 10000.00, 1500.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 11:52:18', '2025-09-23 06:50:33', 0.00, 0.00, 1),
(81, 38, 29, NULL, '6 55719274', ': Carrefour eloumden ', 1500.00, 1500.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 20:05:00', '2025-09-23 08:28:25', 0.00, 0.00, 1),
(82, 28, 19, NULL, '651537524', ':  :Yaoundé olembé', 10000.00, 2000.00, 0.00, 'failed_delivery', 'paid_to_supplier', 1, '2025-09-22 12:12:03', '2025-09-23 05:28:37', 0.00, 0.00, 1),
(83, 21, 19, NULL, '677879637', ':  :nkozoa derrière le lycée moderne', 9000.00, 2000.00, 0.00, 'failed_delivery', 'paid_to_supplier', 1, '2025-09-22 20:13:00', '2025-09-23 05:35:34', 0.00, 0.00, 1),
(84, 26, 19, NULL, ' 677818845', ' Etoua Meki  foyer bajoun ', 13500.00, 1500.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 16:15:00', '2025-09-23 05:29:05', 0.00, 0.00, 1),
(85, 39, 19, NULL, '699778940', 'manguier', 4500.00, 1500.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 12:18:45', '2025-09-23 05:29:17', 0.00, 0.00, 1),
(86, 39, 19, NULL, ' 6 99 64 06 17', ':Shell Élig-edzoa', 8500.00, 1500.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 12:21:00', '2025-09-23 05:29:54', 0.00, 0.00, 1),
(87, 32, 19, NULL, '694476529', 'Shell Élig-edzoa', 16000.00, 1500.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 12:22:48', '2025-09-23 05:30:08', 0.00, 0.00, 1),
(88, 25, 19, NULL, '651970608', 'Mokolo ', 35500.00, 1000.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 12:26:00', '2025-09-23 05:30:24', 0.00, 0.00, 1),
(89, 36, 19, NULL, ': 671058397', ' :hypodome, chambre des comptes', 11000.00, 1500.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 12:27:33', '2025-09-23 05:30:50', 0.00, 0.00, 1),
(90, 40, 20, NULL, '6 99961987', 'Barrière ', 9000.00, 1000.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 12:35:43', '2025-09-23 04:56:26', 0.00, 0.00, 1),
(91, 25, 20, NULL, '691303269', 'Odza', 26000.00, 1500.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 12:37:06', '2025-09-23 04:57:58', 0.00, 0.00, 1),
(92, 41, 20, NULL, '699005561', 'Total Odza borne 10', 12000.00, 1500.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 12:40:45', '2025-09-23 04:57:58', 0.00, 0.00, 1),
(93, 26, 20, NULL, '6 99 33 96 36', 'odja borne 10', 80000.00, 1500.00, 0.00, 'failed_delivery', 'paid_to_supplier', 1, '2025-09-22 12:41:37', '2025-09-23 04:58:46', 0.00, 0.00, 1),
(94, 39, 20, NULL, '656177681', 'nkomo', 16000.00, 1500.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 12:42:47', '2025-09-23 04:57:58', 0.00, 0.00, 1),
(95, 28, 20, NULL, '694031772', '   ekoundoum', 6500.00, 1500.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 12:43:30', '2025-09-23 04:57:58', 0.00, 0.00, 1),
(96, 33, 28, NULL, '655170045', ', apres Nkolbisson', 11000.00, 2000.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 12:59:20', '2025-09-23 04:46:21', 0.00, 0.00, 1),
(97, 42, 28, NULL, '655678105', 'Nouvelle Route Nkollbisson montée en face station Ola.', 11000.00, 2000.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 13:03:26', '2025-09-23 04:47:08', 0.00, 0.00, 1),
(98, 43, 28, NULL, '  6 97 00 83 52', ' :etoug ebe ', 11000.00, 1000.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 13:06:16', '2025-09-23 04:47:34', 0.00, 0.00, 1),
(99, 41, 28, NULL, '6 55 48 14 03', 'Noka Hotel Nkolbikok', 12000.00, 2000.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 13:07:24', '2025-09-23 04:48:05', 0.00, 0.00, 1),
(100, 24, 28, NULL, ' 671447142', ': nsam garantie Immeuble vision 4', 4500.00, 1000.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 17:08:00', '2025-09-23 04:49:21', 0.00, 0.00, 1),
(101, 44, 28, NULL, '6 91 19 27 27', 'mvan ancien touristiques voyage', 9000.00, 1000.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 13:11:41', '2025-09-23 04:49:46', 0.00, 0.00, 1),
(102, 45, 28, NULL, ' 6 97 98 34 70', 'à Garoua Boulaye  ', 0.00, 1500.00, 3000.00, 'delivered', 'paid_to_supplier', 1, '2025-09-22 17:15:00', '2025-09-23 04:50:20', 0.00, 0.00, 1),
(103, 25, 28, NULL, '6 90 28 24 48', 'mvan', 42500.00, 1000.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 13:19:53', '2025-09-23 04:51:18', 0.00, 0.00, 1),
(104, 25, 28, NULL, ' 6 95 08 00 16', 'Nkomo ', 14000.00, 1500.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 13:22:34', '2025-09-23 04:51:54', 0.00, 0.00, 1),
(105, 46, 28, NULL, ' :6 55 28 16 02', ': nkouabang ', 7000.00, 1500.00, 0.00, 'failed_delivery', 'paid_to_supplier', 1, '2025-09-22 13:25:49', '2025-09-23 04:52:38', 0.00, 0.00, 1),
(106, 39, 28, NULL, ' 6 77 07 32 90', 'Carrefour nkoabang', 16000.00, 1500.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 13:26:36', '2025-09-23 04:52:55', 0.00, 0.00, 1),
(107, 47, 28, NULL, '699731914 /', 'r sofavinc', 15000.00, 1000.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 13:29:11', '2025-09-23 04:53:20', 0.00, 0.00, 1),
(108, 48, 28, NULL, ' 6 77 76 69 06', 'k nouvelles route tam-tam week-end. ', 24000.00, 1000.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 13:31:43', '2025-09-23 04:53:45', 0.00, 0.00, 1),
(109, 45, 24, NULL, '674543487', ' fougerole', 11000.00, 1500.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 13:36:33', '2025-09-23 03:30:42', 0.00, 0.00, 1),
(110, 49, 24, NULL, '698944050', 'Orca Omnisports ', 0.00, 1500.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 13:39:24', '2025-09-23 03:30:42', 0.00, 0.00, 1),
(111, 22, 24, NULL, ' 6 77 03 27 14‬', 'mvogada', 8500.00, 1000.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 13:40:16', '2025-09-23 03:30:42', 0.00, 0.00, 1),
(113, 33, 24, NULL, '6 90 60 04 06', 'Total joungolo (la gare)', 10500.00, 1500.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 17:42:00', '2025-09-23 05:00:49', 0.00, 0.00, 1),
(114, 24, 24, NULL, ': 690365787', ' fougerol au niveau su château', 4000.00, 1500.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 13:43:07', '2025-09-23 03:30:42', 0.00, 0.00, 1),
(115, 37, 24, NULL, ' 6 70 80 33 03', 'chérie nkolbon', 5000.00, 1500.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 13:47:24', '2025-09-23 03:30:42', 0.00, 0.00, 1),
(116, 41, 24, NULL, '680647786', 'Avenue Germaine Essos', 12000.00, 1500.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 14:01:00', '2025-09-23 03:29:45', 0.00, 0.00, 1),
(117, 30, 24, NULL, 'o :670334630', 'beac elig essono ', 20000.00, 1500.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 22:01:00', '2025-09-23 05:02:17', 0.00, 0.00, 1),
(118, 30, 24, NULL, ' :682630640', 'marché mendong (commissariat)', 16000.00, 1000.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 14:03:24', '2025-09-23 03:30:42', 0.00, 0.00, 1),
(122, 39, 24, NULL, '7 6 99 86 74 85', 'Ydé éleveur', 7000.00, 1500.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 23:22:00', '2025-09-23 08:26:43', 0.00, 0.00, 1),
(123, 23, 27, NULL, ' 6 94 58 04 74', 'yde hôpital général ', 9000.00, 1500.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 07:39:00', '2025-09-23 04:42:08', 0.00, 0.00, 1),
(124, 26, 27, NULL, ' : 699807159', 'Mobil Essos  ', 13500.00, 1500.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 07:40:00', '2025-09-23 04:43:15', 0.00, 0.00, 1),
(125, 41, 27, NULL, '693305367', 'Carrefour Market Warda', 12000.00, 1000.00, 0.00, 'failed_delivery', 'paid_to_supplier', 1, '2025-09-22 07:41:00', '2025-09-23 04:43:04', 0.00, 0.00, 1),
(126, 51, 27, NULL, ': 653962906', 'Nvoekoussou', 13000.00, 2000.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 07:44:00', '2025-09-23 04:42:55', 0.00, 0.00, 1),
(127, 28, 27, NULL, ' 699366982', '  titi garage face camps sic Yaoundé', 6500.00, 1500.00, 0.00, 'failed_delivery', 'paid_to_supplier', 1, '2025-09-22 15:45:00', '2025-09-23 04:42:16', 0.00, 0.00, 1),
(128, 21, 27, NULL, '6 79 70 80 59', 'Tradex éleveur,', 9000.00, 1500.00, 0.00, 'failed_delivery', 'paid_to_supplier', 1, '2025-09-22 08:33:00', '2025-09-23 04:42:44', 0.00, 0.00, 1),
(129, 38, 27, NULL, ' 6 70 12 76 59', 'E :Fourgerol monté saplai entrée zéro la vie', 40000.00, 1500.00, 0.00, 'failed_delivery', 'paid_to_supplier', 1, '2025-09-22 08:34:00', '2025-09-23 04:42:36', 0.00, 0.00, 1),
(130, 18, 27, NULL, ' 6 55 24 89 11‬', 'Obobogo', 13000.00, 1500.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 08:35:00', '2025-09-23 04:42:26', 0.00, 0.00, 1),
(131, 43, 24, NULL, '699102248', 'mobile omnisports', 11000.00, 1500.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 09:15:00', '2025-09-23 05:20:22', 0.00, 0.00, 1),
(132, 50, 24, NULL, '694410576', 'dragage ', 11000.00, 1500.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 09:17:00', '2025-09-23 05:20:12', 0.00, 0.00, 1),
(133, 50, 24, NULL, '656122983', 'nkozoa ', 11500.00, 1500.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 09:18:00', '2025-09-23 05:20:00', 0.00, 0.00, 1),
(134, 43, 24, NULL, '699102248', 'omnisportt', 6000.00, 1500.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 09:19:00', '2025-09-23 05:19:50', 0.00, 0.00, 1),
(135, 52, 19, NULL, '653609388', 'KNKOMETOU', 13000.00, 3000.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 09:41:00', '2025-09-23 05:42:26', 0.00, 0.00, 1),
(136, 18, NULL, NULL, '682032508', 'MIMBOMAN ENTREE MAETURE', 13500.00, 1500.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 09:59:00', '2025-09-23 06:00:10', 0.00, 0.00, 1),
(137, 50, 26, NULL, '676107911', 'NKONDENGUI', 11000.00, 1500.00, 0.00, 'failed_delivery', 'paid_to_supplier', 1, '2025-09-22 10:02:00', '2025-09-23 06:14:25', 0.00, 0.00, 1),
(138, 53, 26, NULL, '696801912', 'SIMBOCK', 0.00, 500.00, 0.00, 'delivered', 'paid_to_supplier', 1, '2025-09-22 10:03:00', '2025-09-23 06:14:32', 0.00, 0.00, 1),
(139, 24, 26, NULL, '699150421', 'AWAE', 8000.00, 2000.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 10:04:00', '2025-09-23 06:14:39', 0.00, 0.00, 1),
(140, 19, 26, NULL, '681091008', 'PETIT GENIE', 8500.00, 1500.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 10:06:00', '2025-09-23 06:14:48', 0.00, 0.00, 1),
(141, 53, 26, NULL, '699960694', 'NKOLDA', 8500.00, 2000.00, 0.00, 'failed_delivery', 'paid_to_supplier', 1, '2025-09-22 10:07:00', '2025-09-23 06:14:57', 0.00, 0.00, 1),
(142, 36, 26, NULL, '677445172', 'AWAE', 10000.00, 2000.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 10:09:00', '2025-09-23 06:15:07', 0.00, 0.00, 1),
(143, 30, 26, NULL, '677864612', 'MENDONG', 11000.00, 1000.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 10:10:00', '2025-09-23 06:15:15', 0.00, 0.00, 1),
(144, 32, 21, NULL, '697472974', 'DAKAR EN BAS', 24000.00, 1000.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 10:35:00', '2025-09-23 06:41:58', 0.00, 0.00, 1),
(145, 39, 21, NULL, '699852098', 'nlongkak  ', 6000.00, 1500.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 10:37:00', '2025-09-23 06:41:46', 0.00, 0.00, 1),
(146, 39, 21, NULL, '677211910', 'POSTE', 6000.00, 1000.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 10:38:00', '2025-09-23 06:41:34', 0.00, 0.00, 1),
(147, 22, 21, NULL, '694525041', 'OBILI', 15000.00, 1500.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 14:39:00', '2025-09-23 06:41:23', 0.00, 0.00, 1),
(148, 36, NULL, NULL, '675085418', 'BAMBOU DE CHINE', 10000.00, 1500.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 10:55:00', '2025-09-23 06:57:33', 0.00, 0.00, 1),
(149, 30, 23, NULL, '677023760', 'TKC', 10000.00, 1000.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 11:05:00', '2025-09-23 07:16:39', 0.00, 0.00, 1),
(150, 30, 23, NULL, '679224757', 'BORNE 12', 43000.00, 1500.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 11:06:00', '2025-09-23 07:16:32', 0.00, 0.00, 1),
(151, 50, 23, NULL, '657914538', 'NKOLDONGO', 7500.00, 1500.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 11:07:00', '2025-09-23 07:16:25', 0.00, 0.00, 1),
(152, 23, 23, NULL, '693820549', 'YDE', 9900.00, 1500.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 11:09:00', '2025-09-23 07:16:17', 0.00, 0.00, 1),
(153, 54, 23, NULL, '670704811', 'TITI GARAGE', 3500.00, 1500.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 11:12:00', '2025-09-23 07:16:05', 0.00, 0.00, 1),
(154, 55, 23, NULL, '680378077', 'EKOUNOU', 6000.00, 1500.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 11:14:00', '2025-09-23 07:15:57', 0.00, 0.00, 1),
(155, 26, 22, NULL, '677007038', 'MADAGASCAR', 13500.00, 1000.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 11:24:00', '2025-09-23 07:31:08', 0.00, 0.00, 1),
(156, 56, 22, NULL, '620003048', 'CENTRE', 0.00, 1000.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 15:26:00', '2025-09-23 07:30:50', 0.00, 0.00, 1),
(157, 30, 22, NULL, '650144218', 'NKOLBISSON', 11000.00, 1500.00, 0.00, 'failed_delivery', 'paid_to_supplier', 1, '2025-09-22 11:28:00', '2025-09-23 07:30:57', 0.00, 0.00, 1),
(158, 57, 29, NULL, '690820730', 'MBANKOLO', 0.00, 750.00, 0.00, 'delivered', 'cash', 1, '2025-09-22 15:39:00', '2025-09-23 07:45:42', 0.00, 0.00, 1),
(159, 39, 20, NULL, '650724683', 'MVAN', 0.00, 1000.00, 0.00, 'delivered', 'paid_to_supplier', 1, '2025-09-22 11:46:00', '2025-09-23 07:47:43', 0.00, 0.00, 1),
(160, 32, 20, NULL, '650724683', 'MVAN', 0.00, 1000.00, 0.00, 'delivered', 'paid_to_supplier', 1, '2025-09-22 11:46:00', '2025-09-23 07:47:36', 0.00, 0.00, 1);

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
(13, 46, 'Commande créée', NULL, 1, '2025-09-22 09:14:08'),
(16, 49, 'Commande créée', NULL, 1, '2025-09-22 09:22:30'),
(17, 50, 'Commande créée', NULL, 1, '2025-09-22 09:24:50'),
(18, 51, 'Commande créée', NULL, 1, '2025-09-22 09:25:28'),
(19, 51, 'Mise à jour de la commande', NULL, 1, '2025-09-22 09:27:39'),
(21, 53, 'Commande créée', NULL, 1, '2025-09-22 09:33:05'),
(24, 50, 'Commande assignée au livreur : Kamdeu Edwin ', NULL, 1, '2025-09-22 09:36:56'),
(26, 51, 'Commande assignée au livreur : Kamdeu Edwin ', NULL, 1, '2025-09-22 09:36:56'),
(30, 53, 'Commande assignée au livreur : Kamdeu Edwin ', NULL, 1, '2025-09-22 09:36:56'),
(33, 46, 'Commande assignée au livreur : Kamdeu Edwin ', NULL, 1, '2025-09-22 09:36:56'),
(34, 49, 'Commande assignée au livreur : Kamdeu Edwin ', NULL, 1, '2025-09-22 09:36:56'),
(37, 58, 'Commande créée', NULL, 1, '2025-09-22 11:54:58'),
(38, 59, 'Commande créée', NULL, 1, '2025-09-22 12:04:20'),
(39, 60, 'Commande créée', NULL, 1, '2025-09-22 12:06:28'),
(40, 61, 'Commande créée', NULL, 1, '2025-09-22 12:09:09'),
(41, 61, 'Commande assignée au livreur : Tchougang junior ', NULL, 1, '2025-09-22 12:14:28'),
(42, 60, 'Commande assignée au livreur : Tchougang junior ', NULL, 1, '2025-09-22 12:14:28'),
(43, 58, 'Commande assignée au livreur : Tchougang junior ', NULL, 1, '2025-09-22 12:14:28'),
(44, 59, 'Commande assignée au livreur : Tchougang junior ', NULL, 1, '2025-09-22 12:14:28'),
(46, 63, 'Commande créée', NULL, 1, '2025-09-22 12:20:54'),
(48, 63, 'Commande assignée au livreur : Tchougang junior ', NULL, 1, '2025-09-22 12:22:13'),
(51, 64, 'Commande créée', NULL, 1, '2025-09-22 12:42:30'),
(52, 65, 'Commande créée', NULL, 1, '2025-09-22 12:44:11'),
(53, 66, 'Commande créée', NULL, 1, '2025-09-22 12:45:52'),
(54, 67, 'Commande créée', NULL, 1, '2025-09-22 12:47:04'),
(55, 68, 'Commande créée', NULL, 1, '2025-09-22 12:48:06'),
(56, 69, 'Commande créée', NULL, 1, '2025-09-22 12:54:12'),
(57, 70, 'Commande créée', NULL, 1, '2025-09-22 12:56:16'),
(58, 71, 'Commande créée', NULL, 1, '2025-09-22 12:59:19'),
(59, 69, 'Commande assignée au livreur : Benten  Jordan ', NULL, 1, '2025-09-22 13:03:29'),
(60, 70, 'Commande assignée au livreur : Benten  Jordan ', NULL, 1, '2025-09-22 13:03:29'),
(61, 71, 'Commande assignée au livreur : Benten  Jordan ', NULL, 1, '2025-09-22 13:03:29'),
(62, 68, 'Commande assignée au livreur : Benten  Jordan ', NULL, 1, '2025-09-22 13:03:29'),
(63, 67, 'Commande assignée au livreur : Benten  Jordan ', NULL, 1, '2025-09-22 13:03:29'),
(64, 64, 'Commande assignée au livreur : Benten  Jordan ', NULL, 1, '2025-09-22 13:03:29'),
(65, 66, 'Commande assignée au livreur : Benten  Jordan ', NULL, 1, '2025-09-22 13:03:29'),
(66, 65, 'Commande assignée au livreur : Benten  Jordan ', NULL, 1, '2025-09-22 13:03:29'),
(67, 72, 'Commande créée', NULL, 1, '2025-09-22 13:21:28'),
(68, 73, 'Commande créée', NULL, 1, '2025-09-22 13:23:04'),
(69, 74, 'Commande créée', NULL, 1, '2025-09-22 13:28:04'),
(70, 75, 'Commande créée', NULL, 1, '2025-09-22 13:28:54'),
(71, 76, 'Commande créée', NULL, 1, '2025-09-22 13:30:16'),
(72, 77, 'Commande créée', NULL, 1, '2025-09-22 13:32:16'),
(73, 77, 'Mise à jour de la commande', NULL, 1, '2025-09-22 13:32:55'),
(74, 72, 'Commande assignée au livreur : NGBWE  YVAN', NULL, 1, '2025-09-22 13:36:33'),
(75, 77, 'Commande assignée au livreur : NGBWE  YVAN', NULL, 1, '2025-09-22 13:36:33'),
(76, 75, 'Commande assignée au livreur : NGBWE  YVAN', NULL, 1, '2025-09-22 13:36:33'),
(77, 73, 'Commande assignée au livreur : NGBWE  YVAN', NULL, 1, '2025-09-22 13:36:33'),
(78, 74, 'Commande assignée au livreur : NGBWE  YVAN', NULL, 1, '2025-09-22 13:36:33'),
(79, 76, 'Commande assignée au livreur : NGBWE  YVAN', NULL, 1, '2025-09-22 13:36:33'),
(80, 76, 'Mise à jour de la commande', NULL, 1, '2025-09-22 13:37:05'),
(81, 53, 'Statut changé en Livré', NULL, 1, '2025-09-22 15:04:53'),
(82, 78, 'Commande créée', NULL, 1, '2025-09-22 15:46:02'),
(83, 79, 'Commande créée', NULL, 1, '2025-09-22 15:49:54'),
(84, 80, 'Commande créée', NULL, 1, '2025-09-22 15:52:18'),
(85, 81, 'Commande créée', NULL, 1, '2025-09-22 16:05:32'),
(86, 79, 'Commande assignée au livreur : Messi Joseph ', NULL, 1, '2025-09-22 16:07:10'),
(87, 78, 'Commande assignée au livreur : Messi Joseph ', NULL, 1, '2025-09-22 16:07:10'),
(88, 81, 'Commande assignée au livreur : Messi Joseph ', NULL, 1, '2025-09-22 16:07:53'),
(89, 80, 'Commande assignée au livreur : Messi Joseph ', NULL, 1, '2025-09-22 16:08:03'),
(90, 82, 'Commande créée', NULL, 1, '2025-09-22 16:12:04'),
(91, 83, 'Commande créée', NULL, 1, '2025-09-22 16:13:05'),
(92, 84, 'Commande créée', NULL, 1, '2025-09-22 16:15:16'),
(93, 83, 'Mise à jour de la commande', NULL, 1, '2025-09-22 16:16:16'),
(94, 85, 'Commande créée', NULL, 1, '2025-09-22 16:18:45'),
(95, 86, 'Commande créée', NULL, 1, '2025-09-22 16:21:00'),
(96, 87, 'Commande créée', NULL, 1, '2025-09-22 16:22:48'),
(97, 88, 'Commande créée', NULL, 1, '2025-09-22 16:26:00'),
(98, 89, 'Commande créée', NULL, 1, '2025-09-22 16:27:33'),
(99, 85, 'Commande assignée au livreur : Ntetngu\'u Chirac', NULL, 1, '2025-09-22 16:29:28'),
(100, 82, 'Commande assignée au livreur : Ntetngu\'u Chirac', NULL, 1, '2025-09-22 16:29:28'),
(101, 84, 'Commande assignée au livreur : Ntetngu\'u Chirac', NULL, 1, '2025-09-22 16:29:28'),
(102, 88, 'Commande assignée au livreur : Ntetngu\'u Chirac', NULL, 1, '2025-09-22 16:29:28'),
(103, 89, 'Commande assignée au livreur : Ntetngu\'u Chirac', NULL, 1, '2025-09-22 16:29:28'),
(104, 86, 'Commande assignée au livreur : Ntetngu\'u Chirac', NULL, 1, '2025-09-22 16:29:28'),
(105, 83, 'Commande assignée au livreur : Ntetngu\'u Chirac', NULL, 1, '2025-09-22 16:29:28'),
(106, 87, 'Commande assignée au livreur : Ntetngu\'u Chirac', NULL, 1, '2025-09-22 16:29:28'),
(107, 90, 'Commande créée', NULL, 1, '2025-09-22 16:35:43'),
(108, 91, 'Commande créée', NULL, 1, '2025-09-22 16:37:06'),
(109, 92, 'Commande créée', NULL, 1, '2025-09-22 16:40:45'),
(110, 93, 'Commande créée', NULL, 1, '2025-09-22 16:41:37'),
(111, 94, 'Commande créée', NULL, 1, '2025-09-22 16:42:47'),
(112, 95, 'Commande créée', NULL, 1, '2025-09-22 16:43:30'),
(113, 94, 'Commande assignée au livreur : Kemka Martial ', NULL, 1, '2025-09-22 16:45:37'),
(114, 93, 'Commande assignée au livreur : Kemka Martial ', NULL, 1, '2025-09-22 16:45:37'),
(115, 95, 'Commande assignée au livreur : Kemka Martial ', NULL, 1, '2025-09-22 16:45:37'),
(116, 92, 'Commande assignée au livreur : Kemka Martial ', NULL, 1, '2025-09-22 16:45:37'),
(117, 91, 'Commande assignée au livreur : Kemka Martial ', NULL, 1, '2025-09-22 16:45:37'),
(118, 90, 'Commande assignée au livreur : Kemka Martial ', NULL, 1, '2025-09-22 16:45:37'),
(119, 96, 'Commande créée', NULL, 1, '2025-09-22 16:59:20'),
(120, 97, 'Commande créée', NULL, 1, '2025-09-22 17:03:26'),
(121, 98, 'Commande créée', NULL, 1, '2025-09-22 17:06:16'),
(122, 99, 'Commande créée', NULL, 1, '2025-09-22 17:07:24'),
(123, 100, 'Commande créée', NULL, 1, '2025-09-22 17:08:49'),
(124, 101, 'Commande créée', NULL, 1, '2025-09-22 17:11:41'),
(125, 102, 'Commande créée', NULL, 1, '2025-09-22 17:15:14'),
(126, 103, 'Commande créée', NULL, 1, '2025-09-22 17:19:53'),
(127, 104, 'Commande créée', NULL, 1, '2025-09-22 17:22:34'),
(128, 105, 'Commande créée', NULL, 1, '2025-09-22 17:25:49'),
(129, 106, 'Commande créée', NULL, 1, '2025-09-22 17:26:36'),
(130, 107, 'Commande créée', NULL, 1, '2025-09-22 17:29:11'),
(131, 108, 'Commande créée', NULL, 1, '2025-09-22 17:31:43'),
(132, 102, 'Mise à jour de la commande', NULL, 1, '2025-09-22 17:32:33'),
(133, 104, 'Commande assignée au livreur : NGOUMA  ARMEL ', NULL, 1, '2025-09-22 17:33:00'),
(134, 105, 'Commande assignée au livreur : NGOUMA  ARMEL ', NULL, 1, '2025-09-22 17:33:00'),
(135, 99, 'Commande assignée au livreur : NGOUMA  ARMEL ', NULL, 1, '2025-09-22 17:33:00'),
(136, 106, 'Commande assignée au livreur : NGOUMA  ARMEL ', NULL, 1, '2025-09-22 17:33:00'),
(137, 100, 'Commande assignée au livreur : NGOUMA  ARMEL ', NULL, 1, '2025-09-22 17:33:00'),
(138, 108, 'Commande assignée au livreur : NGOUMA  ARMEL ', NULL, 1, '2025-09-22 17:33:00'),
(139, 96, 'Commande assignée au livreur : NGOUMA  ARMEL ', NULL, 1, '2025-09-22 17:33:00'),
(140, 98, 'Commande assignée au livreur : NGOUMA  ARMEL ', NULL, 1, '2025-09-22 17:33:00'),
(141, 103, 'Commande assignée au livreur : NGOUMA  ARMEL ', NULL, 1, '2025-09-22 17:33:00'),
(142, 101, 'Commande assignée au livreur : NGOUMA  ARMEL ', NULL, 1, '2025-09-22 17:33:00'),
(143, 102, 'Commande assignée au livreur : NGOUMA  ARMEL ', NULL, 1, '2025-09-22 17:33:00'),
(144, 97, 'Commande assignée au livreur : NGOUMA  ARMEL ', NULL, 1, '2025-09-22 17:33:00'),
(145, 107, 'Commande assignée au livreur : NGOUMA  ARMEL ', NULL, 1, '2025-09-22 17:33:00'),
(146, 109, 'Commande créée', NULL, 1, '2025-09-22 17:36:33'),
(147, 110, 'Commande créée', NULL, 1, '2025-09-22 17:39:24'),
(148, 111, 'Commande créée', NULL, 1, '2025-09-22 17:40:16'),
(150, 113, 'Commande créée', NULL, 1, '2025-09-22 17:42:03'),
(151, 114, 'Commande créée', NULL, 1, '2025-09-22 17:43:07'),
(152, 115, 'Commande créée', NULL, 1, '2025-09-22 17:47:24'),
(153, 116, 'Commande créée', NULL, 1, '2025-09-22 18:01:00'),
(154, 117, 'Commande créée', NULL, 1, '2025-09-22 18:01:55'),
(155, 118, 'Commande créée', NULL, 1, '2025-09-22 18:03:24'),
(159, 122, 'Commande créée', NULL, 1, '2025-09-23 07:22:28'),
(161, 122, 'Commande assignée au livreur : Onana Gallus', NULL, 1, '2025-09-23 07:22:45'),
(165, 122, 'Statut changé en Livré', NULL, 1, '2025-09-23 07:23:08'),
(168, 122, 'Mise à jour de la commande', NULL, 1, '2025-09-23 07:24:33'),
(169, 122, 'Mise à jour de la commande', NULL, 1, '2025-09-23 07:24:42'),
(170, 122, 'Mise à jour de la commande', NULL, 1, '2025-09-23 07:26:05'),
(174, 118, 'Commande assignée au livreur : Onana Gallus', NULL, 1, '2025-09-23 07:27:50'),
(175, 117, 'Commande assignée au livreur : Onana Gallus', NULL, 1, '2025-09-23 07:27:50'),
(176, 115, 'Commande assignée au livreur : Onana Gallus', NULL, 1, '2025-09-23 07:27:50'),
(178, 111, 'Commande assignée au livreur : Onana Gallus', NULL, 1, '2025-09-23 07:27:50'),
(179, 113, 'Commande assignée au livreur : Onana Gallus', NULL, 1, '2025-09-23 07:27:50'),
(180, 116, 'Commande assignée au livreur : Onana Gallus', NULL, 1, '2025-09-23 07:27:50'),
(181, 109, 'Commande assignée au livreur : Onana Gallus', NULL, 1, '2025-09-23 07:27:50'),
(182, 110, 'Commande assignée au livreur : Onana Gallus', NULL, 1, '2025-09-23 07:27:50'),
(183, 114, 'Commande assignée au livreur : Onana Gallus', NULL, 1, '2025-09-23 07:27:50'),
(184, 116, 'Statut changé en Livré', NULL, 1, '2025-09-23 07:29:43'),
(185, 116, 'Statut changé en Livré', NULL, 1, '2025-09-23 07:29:43'),
(186, 116, 'Statut changé en Livré', NULL, 1, '2025-09-23 07:29:43'),
(187, 116, 'Statut changé en Livré', NULL, 1, '2025-09-23 07:29:43'),
(188, 116, 'Statut changé en Livré', NULL, 1, '2025-09-23 07:29:43'),
(189, 116, 'Statut changé en Livré', NULL, 1, '2025-09-23 07:29:44'),
(190, 116, 'Statut changé en Livré', NULL, 1, '2025-09-23 07:29:44'),
(191, 116, 'Statut changé en Livré', NULL, 1, '2025-09-23 07:29:44'),
(192, 116, 'Statut changé en Livré', NULL, 1, '2025-09-23 07:29:45'),
(193, 117, 'Statut changé en Livré', NULL, 1, '2025-09-23 07:30:42'),
(194, 111, 'Statut changé en Livré', NULL, 1, '2025-09-23 07:30:42'),
(195, 115, 'Statut changé en Livré', NULL, 1, '2025-09-23 07:30:42'),
(196, 109, 'Statut changé en Livré', NULL, 1, '2025-09-23 07:30:42'),
(197, 118, 'Statut changé en Livré', NULL, 1, '2025-09-23 07:30:42'),
(198, 113, 'Statut changé en Livré', NULL, 1, '2025-09-23 07:30:42'),
(200, 110, 'Statut changé en Livré', NULL, 1, '2025-09-23 07:30:42'),
(201, 114, 'Statut changé en Livré', NULL, 1, '2025-09-23 07:30:42'),
(202, 123, 'Commande créée', NULL, 1, '2025-09-23 07:39:17'),
(203, 124, 'Commande créée', NULL, 1, '2025-09-23 07:40:27'),
(204, 125, 'Commande créée', NULL, 1, '2025-09-23 07:41:36'),
(205, 126, 'Commande créée', NULL, 1, '2025-09-23 07:44:12'),
(206, 127, 'Commande créée', NULL, 1, '2025-09-23 07:45:20'),
(207, 127, 'Commande assignée au livreur : NODJI GYLFRIED ', NULL, 1, '2025-09-23 07:52:14'),
(208, 124, 'Commande assignée au livreur : NODJI GYLFRIED ', NULL, 1, '2025-09-23 07:52:14'),
(209, 126, 'Commande assignée au livreur : NODJI GYLFRIED ', NULL, 1, '2025-09-23 07:52:14'),
(210, 125, 'Commande assignée au livreur : NODJI GYLFRIED ', NULL, 1, '2025-09-23 07:52:14'),
(211, 123, 'Commande assignée au livreur : NODJI GYLFRIED ', NULL, 1, '2025-09-23 07:52:14'),
(212, 128, 'Commande créée', NULL, 1, '2025-09-23 08:33:33'),
(213, 129, 'Commande créée', NULL, 1, '2025-09-23 08:34:31'),
(214, 130, 'Commande créée', NULL, 1, '2025-09-23 08:35:39'),
(215, 130, 'Commande assignée au livreur : NODJI GYLFRIED ', NULL, 1, '2025-09-23 08:36:17'),
(216, 129, 'Commande assignée au livreur : NODJI GYLFRIED ', NULL, 1, '2025-09-23 08:36:17'),
(217, 128, 'Commande assignée au livreur : NODJI GYLFRIED ', NULL, 1, '2025-09-23 08:36:26'),
(218, 123, 'Statut changé en Livré', NULL, 1, '2025-09-23 08:37:11'),
(219, 124, 'Statut changé en Livré', NULL, 1, '2025-09-23 08:37:20'),
(220, 125, 'Statut changé en Livraison ratée (Montant perçu: 0 FCFA)', NULL, 1, '2025-09-23 08:37:42'),
(221, 126, 'Statut changé en Livré', NULL, 1, '2025-09-23 08:37:56'),
(222, 128, 'Statut changé en Livraison ratée (Montant perçu: 0 FCFA)', NULL, 1, '2025-09-23 08:38:22'),
(223, 129, 'Statut changé en Livraison ratée (Montant perçu: 0 FCFA)', NULL, 1, '2025-09-23 08:38:35'),
(224, 130, 'Statut changé en Livré', NULL, 1, '2025-09-23 08:38:45'),
(225, 127, 'Mise à jour de la commande', NULL, 1, '2025-09-23 08:40:37'),
(226, 127, 'Mise à jour de la commande', NULL, 1, '2025-09-23 08:40:54'),
(227, 127, 'Statut changé en Livraison ratée (Montant perçu: 0 FCFA)', NULL, 1, '2025-09-23 08:41:45'),
(228, 123, 'Mise à jour de la commande', NULL, 1, '2025-09-23 08:42:08'),
(229, 127, 'Mise à jour de la commande', NULL, 1, '2025-09-23 08:42:16'),
(230, 130, 'Mise à jour de la commande', NULL, 1, '2025-09-23 08:42:26'),
(231, 129, 'Mise à jour de la commande', NULL, 1, '2025-09-23 08:42:36'),
(232, 128, 'Mise à jour de la commande', NULL, 1, '2025-09-23 08:42:44'),
(233, 126, 'Mise à jour de la commande', NULL, 1, '2025-09-23 08:42:55'),
(234, 125, 'Mise à jour de la commande', NULL, 1, '2025-09-23 08:43:04'),
(235, 124, 'Mise à jour de la commande', NULL, 1, '2025-09-23 08:43:15'),
(236, 96, 'Statut changé en Livré', NULL, 1, '2025-09-23 08:46:21'),
(237, 97, 'Statut changé en Livré', NULL, 1, '2025-09-23 08:47:08'),
(238, 98, 'Statut changé en Livré', NULL, 1, '2025-09-23 08:47:34'),
(239, 99, 'Statut changé en Livré', NULL, 1, '2025-09-23 08:48:05'),
(240, 100, 'Mise à jour de la commande', NULL, 1, '2025-09-23 08:48:56'),
(241, 100, 'Statut changé en Livré', NULL, 1, '2025-09-23 08:49:21'),
(242, 101, 'Statut changé en Livré', NULL, 1, '2025-09-23 08:49:46'),
(243, 102, 'Statut changé en Livré', NULL, 1, '2025-09-23 08:50:20'),
(244, 102, 'Statut changé en Livré', NULL, 1, '2025-09-23 08:50:20'),
(245, 103, 'Statut changé en Livré', NULL, 1, '2025-09-23 08:51:18'),
(246, 104, 'Statut changé en Livré', NULL, 1, '2025-09-23 08:51:54'),
(247, 105, 'Statut changé en Livraison ratée (Montant perçu: 0 FCFA)', NULL, 1, '2025-09-23 08:52:38'),
(248, 106, 'Statut changé en Livré', NULL, 1, '2025-09-23 08:52:55'),
(249, 107, 'Statut changé en Livré', NULL, 1, '2025-09-23 08:53:20'),
(250, 108, 'Statut changé en Livré', NULL, 1, '2025-09-23 08:53:45'),
(251, 90, 'Statut changé en Livré', NULL, 1, '2025-09-23 08:56:26'),
(252, 90, 'Statut changé en Livré', NULL, 1, '2025-09-23 08:56:26'),
(253, 95, 'Statut changé en Livré', NULL, 1, '2025-09-23 08:57:58'),
(254, 91, 'Statut changé en Livré', NULL, 1, '2025-09-23 08:57:58'),
(255, 94, 'Statut changé en Livré', NULL, 1, '2025-09-23 08:57:58'),
(256, 92, 'Statut changé en Livré', NULL, 1, '2025-09-23 08:57:58'),
(257, 93, 'Statut changé en Livraison ratée (Montant perçu: 0 FCFA)', NULL, 1, '2025-09-23 08:58:46'),
(258, 113, 'Mise à jour de la commande', NULL, 1, '2025-09-23 09:00:49'),
(259, 117, 'Mise à jour de la commande', NULL, 1, '2025-09-23 09:01:49'),
(260, 117, 'Mise à jour de la commande', NULL, 1, '2025-09-23 09:02:17'),
(261, 122, 'Mise à jour de la commande', NULL, 1, '2025-09-23 09:03:43'),
(262, 122, 'Mise à jour de la commande', NULL, 1, '2025-09-23 09:13:53'),
(263, 131, 'Commande créée', NULL, 1, '2025-09-23 09:15:48'),
(264, 132, 'Commande créée', NULL, 1, '2025-09-23 09:17:04'),
(265, 133, 'Commande créée', NULL, 1, '2025-09-23 09:18:12'),
(266, 134, 'Commande créée', NULL, 1, '2025-09-23 09:19:01'),
(267, 134, 'Commande assignée au livreur : Onana Gallus', NULL, 1, '2025-09-23 09:19:24'),
(268, 131, 'Commande assignée au livreur : Onana Gallus', NULL, 1, '2025-09-23 09:19:24'),
(269, 132, 'Commande assignée au livreur : Onana Gallus', NULL, 1, '2025-09-23 09:19:24'),
(270, 133, 'Commande assignée au livreur : Onana Gallus', NULL, 1, '2025-09-23 09:19:24'),
(271, 134, 'Statut changé en Livré', NULL, 1, '2025-09-23 09:19:33'),
(272, 131, 'Statut changé en Livré', NULL, 1, '2025-09-23 09:19:33'),
(273, 133, 'Statut changé en Livré', NULL, 1, '2025-09-23 09:19:33'),
(274, 132, 'Statut changé en Livré', NULL, 1, '2025-09-23 09:19:33'),
(275, 134, 'Mise à jour de la commande', NULL, 1, '2025-09-23 09:19:50'),
(276, 133, 'Mise à jour de la commande', NULL, 1, '2025-09-23 09:20:00'),
(277, 132, 'Mise à jour de la commande', NULL, 1, '2025-09-23 09:20:12'),
(278, 131, 'Mise à jour de la commande', NULL, 1, '2025-09-23 09:20:22'),
(279, 84, 'Mise à jour de la commande', NULL, 1, '2025-09-23 09:27:33'),
(281, 82, 'Statut changé en Livraison ratée (Montant perçu: 0 FCFA)', NULL, 1, '2025-09-23 09:28:37'),
(282, 84, 'Statut changé en Livré', NULL, 1, '2025-09-23 09:29:05'),
(283, 85, 'Statut changé en Livré', NULL, 1, '2025-09-23 09:29:17'),
(284, 86, 'Statut changé en Livré', NULL, 1, '2025-09-23 09:29:54'),
(285, 87, 'Statut changé en Livré', NULL, 1, '2025-09-23 09:30:08'),
(286, 88, 'Statut changé en Livré', NULL, 1, '2025-09-23 09:30:24'),
(287, 89, 'Statut changé en Livré', NULL, 1, '2025-09-23 09:30:50'),
(288, 83, 'Mise à jour de la commande', NULL, 1, '2025-09-23 09:35:20'),
(289, 83, 'Statut changé en Livraison ratée (Montant perçu: 0 FCFA)', NULL, 1, '2025-09-23 09:35:34'),
(290, 135, 'Commande créée', NULL, 1, '2025-09-23 09:41:16'),
(291, 135, 'Commande assignée au livreur : Ntetngu\'u Chirac', NULL, 1, '2025-09-23 09:42:04'),
(292, 135, 'Statut changé en Livré', NULL, 1, '2025-09-23 09:42:16'),
(293, 135, 'Mise à jour de la commande', NULL, 1, '2025-09-23 09:42:26'),
(294, 53, 'Statut changé en Livré', NULL, 1, '2025-09-23 09:54:00'),
(295, 50, 'Statut changé en Livré', NULL, 1, '2025-09-23 09:54:00'),
(296, 46, 'Statut changé en Livré', NULL, 1, '2025-09-23 09:54:00'),
(297, 49, 'Statut changé en Livré', NULL, 1, '2025-09-23 09:54:00'),
(298, 136, 'Commande créée', NULL, 1, '2025-09-23 09:59:21'),
(299, 136, 'Statut changé en Livré', NULL, 1, '2025-09-23 09:59:47'),
(300, 136, 'Mise à jour de la commande', NULL, 1, '2025-09-23 10:00:10'),
(301, 137, 'Commande créée', NULL, 1, '2025-09-23 10:02:01'),
(302, 138, 'Commande créée', NULL, 1, '2025-09-23 10:03:30'),
(303, 139, 'Commande créée', NULL, 1, '2025-09-23 10:04:17'),
(304, 140, 'Commande créée', NULL, 1, '2025-09-23 10:06:52'),
(305, 141, 'Commande créée', NULL, 1, '2025-09-23 10:07:54'),
(306, 142, 'Commande créée', NULL, 1, '2025-09-23 10:09:40'),
(307, 143, 'Commande créée', NULL, 1, '2025-09-23 10:10:52'),
(308, 142, 'Commande assignée au livreur : Kamdeu Edwin ', NULL, 1, '2025-09-23 10:12:04'),
(309, 137, 'Commande assignée au livreur : Kamdeu Edwin ', NULL, 1, '2025-09-23 10:12:04'),
(310, 140, 'Commande assignée au livreur : Kamdeu Edwin ', NULL, 1, '2025-09-23 10:12:04'),
(311, 139, 'Commande assignée au livreur : Kamdeu Edwin ', NULL, 1, '2025-09-23 10:12:04'),
(312, 143, 'Commande assignée au livreur : Kamdeu Edwin ', NULL, 1, '2025-09-23 10:12:04'),
(313, 141, 'Commande assignée au livreur : Kamdeu Edwin ', NULL, 1, '2025-09-23 10:12:04'),
(314, 138, 'Commande assignée au livreur : Kamdeu Edwin ', NULL, 1, '2025-09-23 10:12:04'),
(315, 137, 'Statut changé en Livraison ratée (Montant perçu: 0 FCFA)', NULL, 1, '2025-09-23 10:12:32'),
(316, 138, 'Statut changé en Livré', NULL, 1, '2025-09-23 10:12:42'),
(317, 139, 'Statut changé en Livré', NULL, 1, '2025-09-23 10:13:18'),
(318, 141, 'Statut changé en Livraison ratée (Montant perçu: 0 FCFA)', NULL, 1, '2025-09-23 10:13:32'),
(319, 143, 'Statut changé en Livré', NULL, 1, '2025-09-23 10:13:58'),
(320, 142, 'Statut changé en Livré', NULL, 1, '2025-09-23 10:13:58'),
(321, 140, 'Statut changé en Livré', NULL, 1, '2025-09-23 10:14:15'),
(322, 137, 'Mise à jour de la commande', NULL, 1, '2025-09-23 10:14:25'),
(323, 138, 'Mise à jour de la commande', NULL, 1, '2025-09-23 10:14:32'),
(324, 139, 'Mise à jour de la commande', NULL, 1, '2025-09-23 10:14:39'),
(325, 140, 'Mise à jour de la commande', NULL, 1, '2025-09-23 10:14:48'),
(326, 141, 'Mise à jour de la commande', NULL, 1, '2025-09-23 10:14:57'),
(327, 142, 'Mise à jour de la commande', NULL, 1, '2025-09-23 10:15:07'),
(328, 143, 'Mise à jour de la commande', NULL, 1, '2025-09-23 10:15:15'),
(329, 77, 'Statut changé en Livré', NULL, 1, '2025-09-23 10:22:15'),
(330, 75, 'Statut changé en Livré', NULL, 1, '2025-09-23 10:22:15'),
(331, 72, 'Statut changé en Livré', NULL, 1, '2025-09-23 10:22:15'),
(332, 73, 'Statut changé en Livré', NULL, 1, '2025-09-23 10:22:15'),
(333, 74, 'Statut changé en Livré', NULL, 1, '2025-09-23 10:22:15'),
(334, 76, 'Statut changé en Livré', NULL, 1, '2025-09-23 10:24:36'),
(335, 144, 'Commande créée', NULL, 1, '2025-09-23 10:35:18'),
(336, 145, 'Commande créée', NULL, 1, '2025-09-23 10:37:40'),
(337, 146, 'Commande créée', NULL, 1, '2025-09-23 10:38:30'),
(338, 147, 'Commande créée', NULL, 1, '2025-09-23 10:39:11'),
(339, 147, 'Commande assignée au livreur : NGBWE  YVAN', NULL, 1, '2025-09-23 10:39:40'),
(340, 144, 'Commande assignée au livreur : NGBWE  YVAN', NULL, 1, '2025-09-23 10:39:40'),
(341, 146, 'Commande assignée au livreur : NGBWE  YVAN', NULL, 1, '2025-09-23 10:39:40'),
(342, 145, 'Commande assignée au livreur : NGBWE  YVAN', NULL, 1, '2025-09-23 10:39:40'),
(343, 147, 'Mise à jour de la commande', NULL, 1, '2025-09-23 10:40:43'),
(344, 147, 'Statut changé en Livré', NULL, 1, '2025-09-23 10:41:02'),
(345, 146, 'Statut changé en Livré', NULL, 1, '2025-09-23 10:41:02'),
(346, 144, 'Statut changé en Livré', NULL, 1, '2025-09-23 10:41:02'),
(347, 145, 'Statut changé en Livré', NULL, 1, '2025-09-23 10:41:02'),
(348, 147, 'Mise à jour de la commande', NULL, 1, '2025-09-23 10:41:23'),
(349, 146, 'Mise à jour de la commande', NULL, 1, '2025-09-23 10:41:34'),
(350, 145, 'Mise à jour de la commande', NULL, 1, '2025-09-23 10:41:46'),
(351, 144, 'Mise à jour de la commande', NULL, 1, '2025-09-23 10:41:58'),
(352, 78, 'Statut changé en Livraison ratée (Montant perçu: 0 FCFA)', NULL, 1, '2025-09-23 10:49:35'),
(353, 78, 'Statut changé en Livraison ratée (Montant perçu: 0 FCFA)', NULL, 1, '2025-09-23 10:49:35'),
(354, 79, 'Statut changé en Livré', NULL, 1, '2025-09-23 10:50:07'),
(355, 79, 'Statut changé en Livré', NULL, 1, '2025-09-23 10:50:07'),
(356, 80, 'Statut changé en Livré', NULL, 1, '2025-09-23 10:50:33'),
(357, 81, 'Statut changé en Livré', NULL, 1, '2025-09-23 10:51:19'),
(358, 81, 'Statut changé en Livré', NULL, 1, '2025-09-23 10:52:22'),
(359, 81, 'Mise à jour de la commande', NULL, 1, '2025-09-23 10:52:57'),
(360, 148, 'Commande créée', NULL, 1, '2025-09-23 10:55:46'),
(361, 148, 'Statut changé en Livré', NULL, 1, '2025-09-23 10:56:54'),
(362, 148, 'Statut changé en Livré', NULL, 1, '2025-09-23 10:56:54'),
(363, 148, 'Mise à jour de la commande', NULL, 1, '2025-09-23 10:57:33'),
(364, 64, 'Statut changé en Livré', NULL, 1, '2025-09-23 11:01:09'),
(365, 64, 'Statut changé en Livré', NULL, 1, '2025-09-23 11:01:10'),
(366, 65, 'Statut changé en Livraison ratée (Montant perçu: 0 FCFA)', NULL, 1, '2025-09-23 11:01:39'),
(367, 66, 'Statut changé en Livré', NULL, 1, '2025-09-23 11:01:48'),
(368, 67, 'Statut changé en Livré', NULL, 1, '2025-09-23 11:02:02'),
(369, 68, 'Statut changé en Livré', NULL, 1, '2025-09-23 11:02:13'),
(370, 69, 'Statut changé en Livré', NULL, 1, '2025-09-23 11:02:32'),
(371, 70, 'Statut changé en Livraison ratée (Montant perçu: 0 FCFA)', NULL, 1, '2025-09-23 11:02:46'),
(372, 71, 'Statut changé en Livraison ratée (Montant perçu: 0 FCFA)', NULL, 1, '2025-09-23 11:03:12'),
(373, 149, 'Commande créée', NULL, 1, '2025-09-23 11:05:58'),
(374, 150, 'Commande créée', NULL, 1, '2025-09-23 11:06:57'),
(375, 151, 'Commande créée', NULL, 1, '2025-09-23 11:07:57'),
(376, 152, 'Commande créée', NULL, 1, '2025-09-23 11:09:37'),
(377, 153, 'Commande créée', NULL, 1, '2025-09-23 11:12:00'),
(378, 154, 'Commande créée', NULL, 1, '2025-09-23 11:14:53'),
(379, 154, 'Commande assignée au livreur : Benten  Jordan ', NULL, 1, '2025-09-23 11:15:39'),
(380, 149, 'Commande assignée au livreur : Benten  Jordan ', NULL, 1, '2025-09-23 11:15:39'),
(381, 150, 'Commande assignée au livreur : Benten  Jordan ', NULL, 1, '2025-09-23 11:15:39'),
(382, 153, 'Commande assignée au livreur : Benten  Jordan ', NULL, 1, '2025-09-23 11:15:39'),
(383, 152, 'Commande assignée au livreur : Benten  Jordan ', NULL, 1, '2025-09-23 11:15:39'),
(384, 151, 'Commande assignée au livreur : Benten  Jordan ', NULL, 1, '2025-09-23 11:15:39'),
(385, 154, 'Statut changé en Livré', NULL, 1, '2025-09-23 11:15:46'),
(386, 152, 'Statut changé en Livré', NULL, 1, '2025-09-23 11:15:46'),
(387, 151, 'Statut changé en Livré', NULL, 1, '2025-09-23 11:15:46'),
(388, 150, 'Statut changé en Livré', NULL, 1, '2025-09-23 11:15:46'),
(389, 153, 'Statut changé en Livré', NULL, 1, '2025-09-23 11:15:46'),
(390, 149, 'Statut changé en Livré', NULL, 1, '2025-09-23 11:15:46'),
(391, 154, 'Mise à jour de la commande', NULL, 1, '2025-09-23 11:15:57'),
(392, 153, 'Mise à jour de la commande', NULL, 1, '2025-09-23 11:16:05'),
(393, 152, 'Mise à jour de la commande', NULL, 1, '2025-09-23 11:16:17'),
(394, 151, 'Mise à jour de la commande', NULL, 1, '2025-09-23 11:16:25'),
(395, 150, 'Mise à jour de la commande', NULL, 1, '2025-09-23 11:16:32'),
(396, 149, 'Mise à jour de la commande', NULL, 1, '2025-09-23 11:16:39'),
(397, 58, 'Statut changé en Livré', NULL, 1, '2025-09-23 11:21:40'),
(398, 59, 'Statut changé en Livré', NULL, 1, '2025-09-23 11:21:40'),
(399, 63, 'Statut changé en Livré', NULL, 1, '2025-09-23 11:21:40'),
(400, 60, 'Statut changé en Livré', NULL, 1, '2025-09-23 11:21:46'),
(401, 61, 'Statut changé en Livré', NULL, 1, '2025-09-23 11:22:29'),
(402, 155, 'Commande créée', NULL, 1, '2025-09-23 11:24:07'),
(403, 156, 'Commande créée', NULL, 1, '2025-09-23 11:26:37'),
(404, 156, 'Mise à jour de la commande', NULL, 1, '2025-09-23 11:27:04'),
(405, 157, 'Commande créée', NULL, 1, '2025-09-23 11:28:39'),
(406, 157, 'Commande assignée au livreur : Tchougang junior ', NULL, 1, '2025-09-23 11:29:17'),
(407, 156, 'Commande assignée au livreur : Tchougang junior ', NULL, 1, '2025-09-23 11:29:17'),
(408, 155, 'Commande assignée au livreur : Tchougang junior ', NULL, 1, '2025-09-23 11:29:17'),
(409, 156, 'Statut changé en Livré', NULL, 1, '2025-09-23 11:30:23'),
(410, 155, 'Statut changé en Livré', NULL, 1, '2025-09-23 11:30:32'),
(411, 157, 'Statut changé en Livraison ratée (Montant perçu: 0 FCFA)', NULL, 1, '2025-09-23 11:30:37'),
(412, 156, 'Mise à jour de la commande', NULL, 1, '2025-09-23 11:30:50'),
(413, 157, 'Mise à jour de la commande', NULL, 1, '2025-09-23 11:30:57'),
(414, 155, 'Mise à jour de la commande', NULL, 1, '2025-09-23 11:31:08'),
(415, 51, 'Statut changé en Livré', NULL, 1, '2025-09-23 11:33:35'),
(416, 158, 'Commande créée', NULL, 1, '2025-09-23 11:39:42'),
(417, 158, 'Commande assignée au livreur : Messi Joseph ', NULL, 1, '2025-09-23 11:40:20'),
(418, 158, 'Statut changé en Livré', NULL, 1, '2025-09-23 11:40:25'),
(419, 158, 'Mise à jour de la commande', NULL, 1, '2025-09-23 11:45:21'),
(420, 158, 'Statut changé en Livré', NULL, 1, '2025-09-23 11:45:29'),
(421, 158, 'Mise à jour de la commande', NULL, 1, '2025-09-23 11:45:42'),
(422, 159, 'Commande créée', NULL, 1, '2025-09-23 11:46:44'),
(423, 160, 'Commande créée', NULL, 1, '2025-09-23 11:46:56'),
(424, 160, 'Commande assignée au livreur : Kemka Martial ', NULL, 1, '2025-09-23 11:47:09'),
(425, 159, 'Commande assignée au livreur : Kemka Martial ', NULL, 1, '2025-09-23 11:47:09'),
(426, 159, 'Statut changé en Livré', NULL, 1, '2025-09-23 11:47:22'),
(427, 160, 'Statut changé en Livré', NULL, 1, '2025-09-23 11:47:22'),
(428, 160, 'Mise à jour de la commande', NULL, 1, '2025-09-23 11:47:36'),
(429, 159, 'Mise à jour de la commande', NULL, 1, '2025-09-23 11:47:43'),
(430, 122, 'Statut changé en À relancer', NULL, 1, '2025-09-23 12:26:33'),
(431, 122, 'Statut changé en Livré', NULL, 1, '2025-09-23 12:26:43'),
(432, 81, 'Statut changé en Livré', NULL, 1, '2025-09-23 12:27:35'),
(433, 81, 'Statut changé en Livré', NULL, 1, '2025-09-23 12:27:36'),
(434, 81, 'Statut changé en Livré', NULL, 1, '2025-09-23 12:27:40'),
(435, 81, 'Mise à jour de la commande', NULL, 1, '2025-09-23 12:28:20'),
(436, 81, 'Statut changé en Livré', NULL, 1, '2025-09-23 12:28:25');

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
(18, 46, 'Mini spray', 4, 20000.00),
(19, 46, 'Modem', 1, 0.00),
(23, 49, 'Bar de Song', 1, 17000.00),
(24, 50, 'Grand tondeuse Oraimo ', 1, 11000.00),
(26, 51, 'boîte de collagène marin', 1, 13500.00),
(28, 53, 'Dentaire', 1, 4500.00),
(33, 58, ' : produits cosmétiques ', 1, 0.00),
(34, 59, ' AMIRAT Al Arab + Mini Flacon rechargeable offert ', 1, 13500.00),
(35, 60, ' : plastique bleu blancble offert ', 1, 0.00),
(36, 61, '‪perruk', 2, 28000.00),
(38, 63, ': SAVONS ', 2, 10000.00),
(40, 64, '- : Brunette Sigoue - Montre Connecté, Bijoux', 1, 0.00),
(41, 65, ' sac 110L fleurie ijoux', 1, 4500.00),
(42, 66, '01 desydrateu', 1, 20000.00),
(43, 67, 'Plastique noir à l\'intérieur du colis contenant 04 paires de chaussures ', 1, 26000.00),
(44, 68, ' Tondeuse 3en1', 1, 8500.00),
(45, 69, ' boîtes huile essentielle ', 3, 10000.00),
(46, 70, 'dentaire', 1, 4500.00),
(47, 71, '275', 1, 20000.00),
(48, 72, ' cordons ', 2, 8000.00),
(49, 73, ' Tondeuse 3en1', 1, 8500.00),
(50, 74, 'ferme porte automatique ', 1, 11000.00),
(51, 75, 'ferme porte automatique ', 1, 11000.00),
(54, 77, ' :2xl ou 1xl Clh,ou 2xl ou 1xl cln2 ', 1, 11000.00),
(55, 76, ': plastique bleu blanc ', 1, 0.00),
(56, 78, ' :ferme porte automatique ', 2, 20000.00),
(57, 79, 'Bouteilles spray et 1 avec bouchon.', 2, 10000.00),
(58, 80, '2 Bouteilles spray et 1 avec bouchon..', 3, 10000.00),
(60, 82, 'COLIS', 1, 10000.00),
(64, 85, 'rallonge ', 1, 4500.00),
(65, 86, ' glucomètre ', 1, 8500.00),
(66, 87, 'Perruk 1', 1, 16000.00),
(67, 88, '1 matelas gonflable  01 pompe  01 couvre lit ', 1, 35500.00),
(68, 89, ':anti rayures ', 1, 11000.00),
(69, 90, 'Crayons ', 1, 9000.00),
(70, 91, ' geuridon ', 2, 26000.00),
(71, 92, 'Semelles S', 1, 12000.00),
(72, 93, 'prostate cream', 1, 80000.00),
(73, 94, 'kit santé complete ', 1, 16000.00),
(74, 95, '1 POT ', 1, 6500.00),
(75, 96, 'Montre Connecté, Bijoux (couleur rose)', 1, 11000.00),
(76, 97, 'Lampadaire LED', 1, 11000.00),
(77, 98, 'noir ', 3, 11000.00),
(78, 99, 'Semelles S ', 1, 12000.00),
(80, 101, '8 valves vertes', 8, 9000.00),
(82, 103, '  01 set de plats bleue   01 set de plats et bol blanc   01 jeu de plateaux   01 jeu de pique fruits  c8', 1, 42500.00),
(83, 104, '01 sèche linge ', 1, 14000.00),
(84, 105, ': découpe légumes ', 1, 7000.00),
(85, 106, ':  kit santé complete ', 1, 16000.00),
(86, 107, 'Bouchon Vert M+(ERECTO TONUS+) Bouchon Rouge S+(ERECTO TONUS) Et Bouchon Jaune (FAF', 1, 15000.00),
(87, 108, ' Kit de lavage 240 V  Nouveau ', 1, 24000.00),
(88, 102, '  kit make up petit model  ajoutez la teinte c8', 1, 0.00),
(89, 109, ':  kit  make up petit Modele ajoutez la teinte c7', 1, 11000.00),
(90, 110, '1 colis e c7', 1, 0.00),
(91, 111, ': tondeuse 3en1', 1, 8500.00),
(94, 114, ' dentaire', 1, 4000.00),
(95, 115, '1Bouteilles spray ', 1, 5000.00),
(96, 116, 'Semelles S ', 1, 12000.00),
(98, 118, ' produits cosmétiques ', 1, 16000.00),
(119, 123, ' Organic ear oil ', 1, 9000.00),
(120, 127, 't 1 POT ', 1, 6500.00),
(121, 130, 'e boîte de collagène marin (la grande boite bleue', 1, 13000.00),
(122, 129, ' :   tableaux décoratif ', 1, 40000.00),
(123, 128, 'Espadrille noir 38,39 ', 1, 9000.00),
(124, 126, 'Miracle ', 3, 13000.00),
(125, 125, 'Semelles Sble offert ', 1, 12000.00),
(126, 124, ': AMIRAT Al Arab + Mini Flacon rechargeable offert ', 1, 13500.00),
(127, 100, ' dentaire', 1, 4500.00),
(128, 113, 'Montre Connecté, Bijoux (couleur rose si possible)', 1, 10500.00),
(130, 117, ':2xl CLL2 et 2xl clg2 ', 1, 20000.00),
(132, 122, ':   ceinture Lombair ', 1, 7000.00),
(137, 134, '01 noir', 1, 6000.00),
(138, 133, 'lait corporel', 1, 11500.00),
(139, 132, 'lait corporel', 1, 11000.00),
(140, 131, '01 blanc,01 noir,01 belge', 1, 11000.00),
(141, 84, ' : AMIRAT Al Arab + Mini Flacon rechargeable offert ', 1, 13500.00),
(142, 83, 'Espadrille noir 45, Espadrille jean 45,46 ', 1, 9000.00),
(144, 135, 'PENDERIE DEMONTABLE ', 1, 13000.00),
(146, 136, 'BOITEDE COLLAGENE MARIN', 1, 13500.00),
(154, 137, 'LAIT CORPOREL', 1, 11000.00),
(155, 138, 'RAMASSAGE', 1, 0.00),
(156, 139, 'GRAND SAC', 1, 8000.00),
(157, 140, '01 KILO DE GRAINES', 1, 8500.00),
(158, 141, '01 MONTRE ET 1 ECOUTEUR', 1, 8500.00),
(159, 142, 'ANTI RAYURES', 1, 10000.00),
(160, 143, '3XL OU 4XL CLG2', 1, 11000.00),
(166, 147, 'TONDEUSE ', 1, 15000.00),
(167, 146, 'rallonge ', 1, 6000.00),
(168, 145, 'GENOUILLERE', 1, 6000.00),
(169, 144, 'SERUM VITAMINE C ET SERU NIACINAMIDE', 1, 24000.00),
(172, 148, 'ANTI RAYURES', 1, 10000.00),
(179, 154, 'SWEAT SHAPER TAILLE L\\XL', 1, 6000.00),
(180, 153, 'EPICES ', 2, 3500.00),
(181, 152, 'RHINITIS SPRAY ', 1, 9900.00),
(182, 151, 'GAMME DE LAIT ', 1, 7500.00),
(183, 150, 'PRODUIT COSMETIQUE', 1, 43000.00),
(184, 149, '2XL OU 3XL CLN', 1, 10000.00),
(189, 156, 'ENVELOPPE ', 1, 0.00),
(190, 157, '2XL OU 3XLCLL2', 1, 11000.00),
(191, 155, 'AMIRAT AL ARAB +MINI FLACON ', 1, 13500.00),
(194, 158, 'RAMASSAGE', 1, 0.00),
(197, 160, 'RETRAIT CCOLIS', 1, 0.00),
(198, 159, 'RETRAIT CCOLIS', 1, 0.00),
(199, 81, ' tableaux décoratif ', 1, 1500.00);

-- --------------------------------------------------------

--
-- Structure de la table `remittances`
--

CREATE TABLE `remittances` (
  `id` int(11) NOT NULL,
  `shop_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_date` date NOT NULL,
  `payment_operator` enum('Orange Money','MTN Mobile Money') NOT NULL,
  `status` enum('paid','partially_paid','failed') NOT NULL,
  `transaction_id` varchar(255) DEFAULT NULL,
  `comment` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `user_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
(18, 'Gold store 237', '', '696112832', '', 'Orange Money', 1, 1, 50.00, 100.00, 'actif', 1, '2025-09-21 19:48:17'),
(19, 'Maghreb natural cosmitic ', NULL, '6 91 33 61 88', NULL, NULL, 1, 1, 50.00, 100.00, 'actif', 1, '2025-09-22 04:47:16'),
(20, 'O-RÉSEAU ', NULL, '696457727', NULL, NULL, 1, 1, 50.00, 100.00, 'actif', 1, '2025-09-22 04:50:19'),
(21, 'MA BOUTIQUE AFRICASTYLE', NULL, '676011845', NULL, NULL, 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-22 05:18:06'),
(22, 'WTS Business', NULL, '6 79 97 35 62', NULL, NULL, 1, 1, 50.00, 100.00, 'actif', 1, '2025-09-22 05:21:16'),
(23, 'Groupe Danister ', NULL, '679956768', NULL, NULL, 1, 1, 50.00, 100.00, 'actif', 1, '2025-09-22 05:30:17'),
(24, 'Josiane ', NULL, '678894889', NULL, NULL, 1, 1, 50.00, 100.00, 'actif', 1, '2025-09-22 05:32:29'),
(25, 'MELVI', NULL, '686338871', NULL, NULL, 1, 1, 50.00, 100.00, 'actif', 1, '2025-09-22 05:34:25'),
(26, 'DYXANE', NULL, '692013387', NULL, NULL, 0, 0, 50.00, 100.00, 'actif', 1, '2025-09-22 07:41:02'),
(28, 'BUNDA BUSINESS', NULL, '654482298', NULL, NULL, 0, 0, 50.00, 100.00, 'actif', 1, '2025-09-22 07:48:28'),
(30, 'HABIBI', NULL, '691452490', NULL, NULL, 0, 0, 50.00, 100.00, 'actif', 1, '2025-09-22 07:52:47'),
(31, 'BAMBOU', NULL, '699620045', NULL, NULL, 0, 0, 50.00, 100.00, 'actif', 1, '2025-09-22 08:05:24'),
(32, 'ADORABLE', NULL, '659234604', NULL, NULL, 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-22 08:07:44'),
(33, 'GODSON MARKET', NULL, '653625197', NULL, NULL, 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-22 08:40:54'),
(34, 'STANIS BUSSINESS', NULL, '693697182', NULL, NULL, 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-22 08:50:59'),
(35, 'MANDE SELLAM', NULL, '651937589', NULL, NULL, 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-22 08:57:38'),
(36, 'NICE LOOK', NULL, '658226309', NULL, NULL, 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-22 09:25:29'),
(37, 'LANDFILTRI', NULL, '697984351', NULL, NULL, 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-22 11:48:27'),
(38, 'NG PHOTO', NULL, '670593889', NULL, NULL, 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-22 11:55:47'),
(39, 'SHANL\'S MINI', NULL, '682921522', NULL, NULL, 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-22 12:17:38'),
(40, 'MCLV ONLINE', NULL, '682200997', NULL, NULL, 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-22 12:33:36'),
(41, 'JH GROUP', NULL, '690718386', NULL, NULL, 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-22 12:38:59'),
(42, 'INDUSTRIES MILLION', NULL, '689807020', NULL, NULL, 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-22 13:01:50'),
(43, 'LEADER SERVICE', NULL, '699248035', NULL, NULL, 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-22 13:05:01'),
(44, 'GUILAINE BOUTIQUE', NULL, '691192727', NULL, NULL, 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-22 13:10:27'),
(45, 'MEILLEUR PRIX', NULL, '653688261', NULL, NULL, 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-22 13:12:57'),
(46, 'TF MARKET', NULL, '695512572', NULL, NULL, 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-22 13:24:06'),
(47, 'PLANTES ANCESTRALES', NULL, '670951243', NULL, NULL, 1, 1, 50.00, 100.00, 'actif', 1, '2025-09-22 13:28:10'),
(48, 'FLEXI GADGET', NULL, '697747917', NULL, NULL, 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-22 13:30:29'),
(49, 'EMPIRE CHIC', NULL, '656405211', NULL, NULL, 0, 0, 50.00, 100.00, 'actif', 1, '2025-09-22 13:37:43'),
(50, 'FRID ?QRKET', NULL, '698215929', NULL, NULL, 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-23 03:14:30'),
(51, 'MCJ BIO NATURE', NULL, '681270541', NULL, NULL, 1, 1, 50.00, 100.00, 'actif', 1, '2025-09-23 03:42:48'),
(52, 'DORIANE', NULL, '691838814', NULL, NULL, 0, 0, 50.00, 100.00, 'actif', 1, '2025-09-23 05:39:01'),
(53, 'K&F STORE', NULL, '696801912', NULL, NULL, 1, 1, 50.00, 100.00, 'actif', 1, '2025-09-23 06:02:46'),
(54, 'PEULH SECRET', NULL, '681881679', NULL, NULL, 0, 0, 50.00, 100.00, 'actif', 1, '2025-09-23 07:10:54'),
(55, 'LE GRAND SPORTIF', NULL, '655600175', NULL, NULL, 0, 1, 50.00, 100.00, 'actif', 1, '2025-09-23 07:13:00'),
(56, 'EXPRESS', NULL, '620003048', NULL, NULL, 0, 0, 50.00, 100.00, 'actif', 1, '2025-09-23 07:24:52'),
(57, 'L\'AURELYS', NULL, '690820730', NULL, NULL, 0, 0, 50.00, 100.00, 'actif', 1, '2025-09-23 07:38:22');

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
(1, '690484981', '1234', 'admin', 'actif', 'Karden', '2025-09-08 08:02:07', '2025-09-22 02:49:34'),
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
(30, '656065084', '1234', 'admin', 'actif', 'Ngono Lehman', '2025-09-22 06:36:18', '2025-09-22 06:36:18');

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
-- Index pour la table `debts`
--
ALTER TABLE `debts`
  ADD PRIMARY KEY (`id`),
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
-- Index pour la table `remittances`
--
ALTER TABLE `remittances`
  ADD PRIMARY KEY (`id`),
  ADD KEY `shop_id` (`shop_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Index pour la table `remittance_orders`
--
ALTER TABLE `remittance_orders`
  ADD PRIMARY KEY (`remittance_id`,`order_id`),
  ADD KEY `order_id` (`order_id`);

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `cash_transactions`
--
ALTER TABLE `cash_transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=113;

--
-- AUTO_INCREMENT pour la table `debts`
--
ALTER TABLE `debts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=189;

--
-- AUTO_INCREMENT pour la table `deliveryman_shortfalls`
--
ALTER TABLE `deliveryman_shortfalls`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

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
-- AUTO_INCREMENT pour la table `orders`
--
ALTER TABLE `orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=161;

--
-- AUTO_INCREMENT pour la table `order_history`
--
ALTER TABLE `order_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=437;

--
-- AUTO_INCREMENT pour la table `order_items`
--
ALTER TABLE `order_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=200;

--
-- AUTO_INCREMENT pour la table `remittances`
--
ALTER TABLE `remittances`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT pour la table `shops`
--
ALTER TABLE `shops`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=58;

--
-- AUTO_INCREMENT pour la table `shop_storage_history`
--
ALTER TABLE `shop_storage_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=32;

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
