import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:wink_manager/models/admin_order.dart';
import 'package:wink_manager/models/shop.dart'; // Import du modèle Shop
import 'package:wink_manager/services/admin_order_service.dart';
import 'package:wink_manager/services/auth_service.dart';

class OrderProvider with ChangeNotifier {
  final AdminOrderService _orderService;
  final AuthService _authService; 

  OrderProvider(AuthService authService)
      : _orderService = AdminOrderService(authService),
        _authService = authService; 

  List<AdminOrder> _orders = [];
  bool _isLoading = false;
  String? _error;

  DateTime _startDate = DateTime.now();
  DateTime _endDate = DateTime.now();
  String _statusFilter = ''; 
  String _searchFilter = '';

  // Getters
  List<AdminOrder> get orders => _orders;
  bool get isLoading => _isLoading;
  String? get error => _error;
  DateTime get startDate => _startDate;
  DateTime get endDate => _endDate;
  String get statusFilter => _statusFilter;
  String get searchFilter => _searchFilter;

  // --- 1. CHARGEMENT ---
  Future<void> loadOrders() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final Map<String, String> filters = {
        'startDate': DateFormat('yyyy-MM-dd').format(_startDate),
        'endDate': DateFormat('yyyy-MM-dd').format(_endDate),
      };

      if (_statusFilter.isNotEmpty) {
        filters['status'] = _statusFilter;
      }
      
      List<AdminOrder> fetchedOrders = await _orderService.fetchOrders(filters);

      if (_searchFilter.isNotEmpty) {
        String searchLower = _searchFilter.toLowerCase();
        fetchedOrders = fetchedOrders.where((order) {
          return order.id.toString().contains(searchLower) ||
              (order.customerName?.toLowerCase().contains(searchLower) ?? false) ||
              order.customerPhone.toLowerCase().contains(searchLower) ||
              order.deliveryLocation.toLowerCase().contains(searchLower) ||
              order.shopName.toLowerCase().contains(searchLower) ||
              (order.deliverymanName?.toLowerCase().contains(searchLower) ?? false);
        }).toList();
      }

      _orders = fetchedOrders;
      
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
  
  // --- 2. ACTIONS CRUD (inchangé) ---
  Future<void> saveOrder(Map<String, dynamic> orderData, int? orderId) async {
    final userId = _authService.user?.id;
    if (userId == null) throw Exception("Utilisateur non trouvé");

    if (orderId == null) {
      orderData['created_by'] = userId;
      await _orderService.createOrder(orderData);
    } else {
      orderData['updated_by'] = userId;
      await _orderService.updateOrder(orderId, orderData);
    }
    
    await loadOrders(); 
  }

  Future<void> deleteOrder(int orderId) async {
    try {
      await _orderService.deleteOrder(orderId);
      _orders.removeWhere((order) => order.id == orderId);
      notifyListeners();
      await loadOrders(); 
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      rethrow;
    }
  }
  
  // --- 3. OPÉRATIONS (inchangé) ---
  Future<void> assignOrder(int orderId, int deliverymanId) async {
    await _orderService.assignDeliveryman(orderId, deliverymanId);
    await loadOrders(); 
  }

  Future<void> updateOrderStatus(int orderId, String status, {String? paymentStatus, double? amountReceived}) async {
    await _orderService.updateOrderStatus(
      orderId,
      status,
      paymentStatus: paymentStatus,
      amountReceived: amountReceived,
    );
    await loadOrders();
  }

  // --- CORRECTION : NOM DE LA MÉTHODE EXPOSÉE ---
  // Elle est correctement nommée searchShops(query)
  Future<List<Shop>> searchShops(String query) async {
    return await _orderService.searchShops(query);
  }

  // --- 4. GESTION FILTRES (inchangé) ---
  void setSearchFilter(String search) {
    _searchFilter = search;
    loadOrders(); 
  }

  void setStatusFilter(String status) {
    _statusFilter = status;
    loadOrders();
  }

  void setDateRange(DateTime start, DateTime end) {
    _startDate = start;
    _endDate = end;
    loadOrders();
  }
}