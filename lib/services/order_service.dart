// lib/services/order_service.dart

import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:intl/intl.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart'; // Ajouté pour debugPrint

import '../models/order.dart';
import '../models/user.dart';
import '../models/rider_cash_details.dart';
import '../models/sync_request.dart';
import 'package:wink_rider_app/services/sync_service.dart';

class OrderService {
  final Dio _dio;
  final User _currentUser;
  final SyncService _syncService;

  static const String _apiBaseUrl = "https://app.winkexpress.online/api/rider";
  static const String _apiOrdersBaseUrl = "https://app.winkexpress.online/api/orders"; // Pour updateStatus etc.

  // --- NOUVEAU: Cache en mémoire ---
  // La clé sera une combinaison des filtres (statuses+dates+search)
  // La valeur sera la liste des commandes pour ces filtres
  final Map<String, List<Order>> _orderCache = {};
  // Optionnel: Stocker le timestamp de la dernière mise à jour du cache
  DateTime? _lastCacheUpdateTime;
  final Duration _cacheDuration = const Duration(minutes: 2); // Ex: Cache valide pendant 2 minutes

  OrderService(this._dio, this._currentUser, this._syncService);

  // Mappers de traduction (inchangés)
  final statusTranslations = {
    'pending': 'En attente',
    'in_progress': 'Assignée',
    'ready_for_pickup': 'Prête à prendre',
    'en_route': 'En route',
    'delivered': 'Livrée',
    'cancelled': 'Annulée',
    'failed_delivery': 'Livraison ratée',
    'reported': 'À relancer',
    'return_declared': 'Retour déclaré',
    'returned': 'Retournée'
  };

  /// **MODIFIÉ**: Récupère les commandes pour un statut donné, en utilisant le cache.
  Future<List<Order>> fetchRiderOrders({
    required List<String> statuses,
    String? startDate,
    String? endDate,
    String? search,
  }) async {
    // --- NOUVEAU: Logique de Cache ---
    final cacheKey = _generateCacheKey(statuses: statuses, startDate: startDate, endDate: endDate, search: search);
    final now = DateTime.now();

    // Vérifie si le cache existe et s'il est encore valide
    if (_orderCache.containsKey(cacheKey) && _lastCacheUpdateTime != null && now.difference(_lastCacheUpdateTime!) < _cacheDuration) {
      debugPrint("OrderService: Utilisation du cache pour la clé '$cacheKey'");
      return _orderCache[cacheKey]!;
    }
    // --- Fin Logique de Cache ---

    debugPrint("OrderService: Appel API pour la clé '$cacheKey'");
    try {
      final response = await _dio.get(
        '$_apiBaseUrl/orders',
        queryParameters: {
          'status': statuses,
          'startDate': startDate,
          'endDate': endDate,
          'search': search,
          'deliverymanId': _currentUser.id, // L'API utilise deliverymanId
        },
      );

      final List<Order> orders = (response.data as List)
          .map((json) => Order.fromJson(json))
          .toList();

      // --- NOUVEAU: Mise à jour du cache ---
      _orderCache[cacheKey] = orders;
      _lastCacheUpdateTime = now; // Met à jour le timestamp du cache
      // --- Fin Mise à jour du cache ---

      return orders;

    } on DioException catch (e) {
      String message = e.response?.data['message'] ?? 'Échec de la récupération des commandes.';
      // Si erreur réseau, tente quand même de retourner le cache s'il existe (même expiré)
      if (e.type == DioExceptionType.connectionError || e.type == DioExceptionType.connectionTimeout) {
        if (_orderCache.containsKey(cacheKey)) {
           debugPrint("OrderService: Erreur réseau, retour du cache expiré pour '$cacheKey'");
           return _orderCache[cacheKey]!;
        }
      }
      throw Exception(message);
    } catch (e) {
       // Tente de retourner le cache en cas d'erreur inattendue
       if (_orderCache.containsKey(cacheKey)) {
          debugPrint("OrderService: Erreur inattendue, retour du cache expiré pour '$cacheKey'");
          return _orderCache[cacheKey]!;
       }
       throw Exception("Erreur inconnue lors de la récupération des commandes.");
    }
  }

  /// **NOUVEAU**: Génère une clé unique pour le cache basée sur les filtres.
  String _generateCacheKey({
    required List<String> statuses,
    String? startDate,
    String? endDate,
    String? search,
  }) {
    // Trie les statuts pour assurer la cohérence de la clé
    final sortedStatuses = List<String>.from(statuses)..sort();
    return '${sortedStatuses.join(',')}|${startDate ?? 'null'}|${endDate ?? 'null'}|${search ?? 'null'}';
  }

  /// **NOUVEAU**: Invalide (vide) le cache des commandes.
  void invalidateOrderCache() {
    debugPrint("OrderService: Cache des commandes invalidé.");
    _orderCache.clear();
    _lastCacheUpdateTime = null;
  }

  /// Récupère les compteurs de commandes par statut (pour la sidebar).
  Future<Map<String, int>> fetchOrderCounts() async {
     // Pas de cache ici car on veut des compteurs à jour
    try {
      final response = await _dio.get('$_apiBaseUrl/counts'); // L'API déduit l'ID

      final Map<String, dynamic> data = response.data;
      return data.map((key, value) => MapEntry(key, value as int));

    } on DioException catch (e) {
       String message = e.response?.data['message'] ?? 'Échec de la récupération des compteurs.';
       throw Exception(message);
    }
  }

  // --- Fonctions d'action (CRUD: PUT/POST avec Gestion Offline) ---

  // LOGIQUE OFFLINE : Gère la mise en file d'attente si hors ligne.
  Future<void> _handleOfflineRequest(String url, String method, Map<String, dynamic> payload, String baseErrorMessage) async {
    final connectivityResult = await Connectivity().checkConnectivity();
    // Utilisation de contains pour gérer les cas multiples (wifi, mobile, ethernet, etc.)
    if (![ConnectivityResult.wifi, ConnectivityResult.mobile, ConnectivityResult.ethernet].contains(connectivityResult)) {
      final request = SyncRequest(
        url: url,
        method: method,
        payload: jsonEncode(payload),
        token: _currentUser.token,
      );
      await _syncService.addRequest(request);
      // Invalide le cache car une action a été mise en file d'attente
      invalidateOrderCache();
      throw Exception("Hors ligne. Action mise en file d'attente. Elle sera synchronisée dès que la connexion sera rétablie.");
    }
    // Si en ligne mais l'API a renvoyé une erreur, on lance l'exception de base
    throw Exception(baseErrorMessage);
  }

  /// Confirme la récupération physique du colis au Hub.
  Future<void> confirmPickup(int orderId) async {
    final String url = '$_apiBaseUrl/orders/$orderId/confirm-pickup-rider';
    try {
      await _dio.put(url);
      invalidateOrderCache(); // Invalide le cache après une action réussie
    } on DioException catch (e) {
      final baseErrorMessage = e.response?.data['message'] ?? 'Échec de la confirmation de récupération.';
      // handleOfflineRequest gère l'invalidation du cache si mis en file d'attente
      await _handleOfflineRequest(url, 'PUT', {}, baseErrorMessage);
    }
  }

  /// Démarre la course après confirmation de la récupération.
  Future<void> startDelivery(int orderId) async {
    final String url = '$_apiBaseUrl/orders/$orderId/start-delivery';
    try {
      await _dio.put(url);
      invalidateOrderCache(); // Invalide le cache après une action réussie
    } on DioException catch (e) {
      final baseErrorMessage = e.response?.data['message'] ?? 'Échec du démarrage de la course.';
      await _handleOfflineRequest(url, 'PUT', {}, baseErrorMessage);
    }
  }

  /// Met à jour le statut d'une commande (Livrée, Annulée, Ratée, Relance).
  Future<void> updateOrderStatus({
    required int orderId,
    required String status,
    String? paymentStatus,
    double? amountReceived
  }) async {
    // Utilise la base URL standard des commandes, pas celle spécifique au rider
    final String url = "$_apiOrdersBaseUrl/$orderId/status";
    final payload = {
      'status': status,
      'payment_status': paymentStatus,
      'amount_received': amountReceived,
      'userId': _currentUser.id, // L'API attend userId dans le payload pour cette route
    };

    try {
      await _dio.put(url, data: payload);
      invalidateOrderCache(); // Invalide le cache après une action réussie
    } on DioException catch (e) {
      final baseErrorMessage = e.response?.data['message'] ?? 'Échec de la mise à jour du statut.';
      await _handleOfflineRequest(url, 'PUT', payload, baseErrorMessage);
    }
  }

  /// Déclare un colis comme retourné (passage en 'return_declared').
  Future<void> declareReturn(int orderId) async {
    // Utilise la base URL standard des commandes
    final String url = "$_apiOrdersBaseUrl/$orderId/declare-return";
    final payload = {
        'comment': 'Déclaré depuis app Flutter',
        'userId': _currentUser.id, // L'API attend userId (pas dans l'URL pour POST)
    };

    try {
      await _dio.post(url, data: payload);
      invalidateOrderCache(); // Invalide le cache après une action réussie
    } on DioException catch (e) {
      final baseErrorMessage = e.response?.data['message'] ?? 'Échec de la déclaration de retour.';
      await _handleOfflineRequest(url, 'POST', payload, baseErrorMessage);
    }
  }

  /// Récupère les détails de la caisse pour une date donnée.
  Future<RiderCashDetails> fetchRiderCashDetails(DateTime date) async {
    // Pas de cache pour la caisse pour l'instant, nécessite souvent des données fraîches
    try {
      final response = await _dio.get(
        '$_apiBaseUrl/cash-details',
        queryParameters: {
          // L'API déduit l'ID du token
          'date': DateFormat('yyyy-MM-dd').format(date),
        },
      );

      return RiderCashDetails.fromJson(response.data);

    } on DioException catch (e) {
      String message = e.response?.data['message'] ?? 'Échec de la récupération de la caisse.';
      throw Exception(message);
    } catch (e) {
      throw Exception("Une erreur inattendue est survenue lors du chargement de la caisse.");
    }
  }
}