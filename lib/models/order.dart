// lib/models/order.dart

import 'package:flutter/foundation.dart'; // Pour kDebugMode
// import 'package:intl/intl.dart'; // Suppression: Importation inutilisée

// --- Helpers privés pour le parsing robuste (déplacés HORS des classes) ---
int? _parseInt(dynamic value) {
  if (value == null) return null;
  if (value is int) return value;
  if (value is double) return value.toInt(); // Convertit double en int si besoin
  if (value is String) return int.tryParse(value); // Essaie de parser la String
  // Log d'avertissement pour les types inattendus en mode debug
  if (kDebugMode) {
    print("Avertissement _parseInt: Type inattendu reçu - ${value.runtimeType}");
  }
  return null; // Retourne null si le type est inattendu
}

double? _parseDouble(dynamic value) {
  if (value == null) return null;
  if (value is double) return value;
  if (value is int) return value.toDouble(); // Convertit int en double
  if (value is String) return double.tryParse(value); // Essaie de parser la String
  // Log d'avertissement pour les types inattendus en mode debug
  if (kDebugMode) {
    print("Avertissement _parseDouble: Type inattendu reçu - ${value.runtimeType}");
  }
  return null; // Retourne null si le type est inattendu
}
// --- Fin des Helpers ---


class OrderItem {
  final String itemName;
  final int quantity;
  final double amount; // Montant unitaire

  OrderItem({
    required this.itemName,
    required this.quantity,
    required this.amount,
  });

  // Factory constructor pour créer un OrderItem à partir d'un JSON/Map
  factory OrderItem.fromJson(Map<String, dynamic> json) {
    return OrderItem(
      itemName: json['item_name'] as String? ?? 'N/A',
      quantity: _parseInt(json['quantity']) ?? 0, // Utilise helper global
      amount: _parseDouble(json['amount']) ?? 0.0, // Utilise helper global
    );
  }
}

class Order {
  final int id;
  final String shopName;
  final String? deliverymanName;
  final String? customerName;
  final String customerPhone;
  final String deliveryLocation;
  final double articleAmount;
  final double deliveryFee;
  final String status;
  final String paymentStatus;
  final DateTime createdAt;
  final double? amountReceived;
  final int unreadCount;
  final bool isUrgent;
  final String? itemsList; // Chaîne formatée
  final bool isPickedUp; // Basé sur picked_up_by_rider_at

  static const List<String> unprocessedStatuses = [
    'pending', 'in_progress', 'ready_for_pickup', 'en_route', 'reported', 'return_declared'
  ];

  Order({
    required this.id,
    required this.shopName,
    this.deliverymanName,
    this.customerName,
    required this.customerPhone,
    required this.deliveryLocation,
    required this.articleAmount,
    required this.deliveryFee,
    required this.status,
    required this.paymentStatus,
    required this.createdAt,
    this.amountReceived,
    required this.unreadCount,
    required this.isUrgent,
    this.itemsList,
    required this.isPickedUp,
  });

  // Factory constructor pour créer un objet Order à partir du JSON de l'API
  factory Order.fromJson(Map<String, dynamic> json) {
    DateTime parsedDate;
    try {
      parsedDate = DateTime.parse(json['created_at'] as String? ?? DateTime.now().toIso8601String());
    } catch (e) {
      if (kDebugMode) {
        print("Erreur parsing Order date: $e, Data: ${json['created_at']}");
      }
      parsedDate = DateTime.now();
    }

    return Order(
      id: _parseInt(json['id']) ?? 0, // Utilise helper global
      shopName: json['shop_name'] as String? ?? 'N/A',
      deliverymanName: json['deliveryman_name'] as String?,
      customerName: json['customer_name'] as String?,
      customerPhone: json['customer_phone'] as String? ?? 'N/A',
      deliveryLocation: json['delivery_location'] as String? ?? 'N/A',
      // **PARSING ROBUSTE**
      articleAmount: _parseDouble(json['article_amount']) ?? 0.0, // Utilise helper global
      deliveryFee: _parseDouble(json['delivery_fee']) ?? 0.0,     // Utilise helper global
      status: json['status'] as String? ?? 'unknown',
      paymentStatus: json['payment_status'] as String? ?? 'unknown',
      createdAt: parsedDate,
      amountReceived: _parseDouble(json['amount_received']), // Utilise helper global (peut rester null)
      unreadCount: _parseInt(json['unread_count']) ?? 0,    // Utilise helper global
      isUrgent: (_parseInt(json['is_urgent']) ?? 0) == 1,         // Utilise helper global
      itemsList: json['items_list'] as String?,
      isPickedUp: json['picked_up_by_rider_at'] != null,
    );
  }

  // Utilitaire pour afficher le montant à encaisser
  double get amountToCollect => articleAmount;

  // Méthode de comparaison pour le tri
  int compareToForToday(Order other) {
    // ... (logique de tri inchangée) ...
    final aIsUnprocessed = unprocessedStatuses.contains(status);
    final bIsUnprocessed = unprocessedStatuses.contains(other.status);

    if (aIsUnprocessed && !bIsUnprocessed) return -1;
    if (!aIsUnprocessed && bIsUnprocessed) return 1;

    if (aIsUnprocessed && bIsUnprocessed) {
      final aIsReadyNotPickedUp = status == 'ready_for_pickup' && !isPickedUp;
      final bIsReadyNotPickedUp = other.status == 'ready_for_pickup' && !other.isPickedUp;

      if (aIsReadyNotPickedUp && !bIsReadyNotPickedUp) return -1;
      if (!aIsReadyNotPickedUp && bIsReadyNotPickedUp) return 1;

      if (isUrgent != other.isUrgent) return isUrgent ? -1 : 1;
    }
    return createdAt.compareTo(other.createdAt);
  }
}