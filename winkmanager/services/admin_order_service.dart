
import 'package:dio/dio.dart'; 
import 'package:flutter/foundation.dart';
import 'package:wink_manager/models/admin_order.dart';
import 'package:wink_manager/models/shop.dart'; 
import 'package:wink_manager/services/auth_service.dart';

class AdminOrderService {
  final AuthService _authService;
  final Dio _dio; // Utilisation de l'instance Dio authentifiée

  // L'URL de base est gérée par AuthService
  AdminOrderService(this._authService) : _dio = _authService.dio;

  /// 1. RÉCUPÉRER LES COMMANDES (Corrigé)
  Future<List<AdminOrder>> fetchOrders(Map<String, String> filters) async {
    try {
      final response = await _dio.get(
        '/orders', 
        queryParameters: filters,
      );

      if (response.statusCode == 200) {
        final List<dynamic> body = response.data;
        return body.map((dynamic item) => AdminOrder.fromJson(item)).toList();
      } else {
        throw Exception('Échec du chargement des commandes: ${response.statusCode}');
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 401 || e.response?.statusCode == 403) {
        _authService.logout();
      }
      if (kDebugMode) {
        print('Erreur fetchOrders: $e');
      }
      throw Exception('Erreur réseau ou serveur: ${e.message}');
    }
  }
  
  /// 2. RECHERCHE MARCHANDE DYNAMIQUE (Corrigé)
  Future<List<Shop>> searchShops(String query) async {
    try {
      final response = await _dio.get(
        '/shops',
        queryParameters: {'status': 'actif', 'search': query},
      );
      
      final List<dynamic> body = response.data;
      return body.map((dynamic item) => Shop.fromJson(item)).toList();
      
    } on DioException catch (e) {
      if (kDebugMode) {
        print('Erreur searchShops: $e');
      }
      return []; 
    }
  }
  
  /// 3. CRÉER COMMANDE
  Future<Map<String, dynamic>> createOrder(Map<String, dynamic> orderData) async {
    try {
      final response = await _dio.post('/orders', data: orderData);
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? 'Échec de la création');
    }
  }

  /// 4. METTRE À JOUR COMMANDE
  Future<Map<String, dynamic>> updateOrder(int orderId, Map<String, dynamic> orderData) async {
     try {
      final response = await _dio.put('/orders/$orderId', data: orderData);
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? 'Échec de la mise à jour');
    }
  }

  /// 5. SUPPRIMER COMMANDE
  Future<void> deleteOrder(int orderId) async {
     try {
      await _dio.delete('/orders/$orderId');
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? 'Échec de la suppression');
    }
  }

  /// 6. ASSIGNER LIVREUR
  Future<void> assignDeliveryman(int orderId, int deliverymanId) async {
    try {
      await _dio.put(
        '/orders/$orderId/assign',
        data: {'deliverymanId': deliverymanId},
      );
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? 'Échec de l\'assignation');
    }
  }

  /// 7. CHANGER STATUT
  Future<void> updateOrderStatus(
      int orderId, String status, {String? paymentStatus, double? amountReceived}) async {
    try {
      final payload = {
        'status': status,
        if (paymentStatus != null) 'payment_status': paymentStatus,
        if (amountReceived != null) 'amount_received': amountReceived,
      };
      await _dio.put(
        '/orders/$orderId/status',
        data: payload,
      );
    } on DioException catch (e) {
      throw Exception(e.response?.data['message'] ?? 'Échec MAJ statut');
    }
  }
}