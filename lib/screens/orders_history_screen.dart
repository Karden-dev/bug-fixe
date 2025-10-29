// lib/screens/orders_history_screen.dart

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'dart:async'; // Ajouté pour Timer

import '../services/order_service.dart';
import '../models/order.dart';
import '../utils/app_theme.dart';
// Importe le widget OrderCard
import 'orders_today_screen.dart' show OrderCard;
// Import de l'écran de détails (utilisé par OrderCard)
// import 'order_details_screen.dart';


class OrdersHistoryScreen extends StatefulWidget {
  const OrdersHistoryScreen({super.key});

  @override
  State<OrdersHistoryScreen> createState() => _OrdersHistoryScreenState();
}

class _OrdersHistoryScreenState extends State<OrdersHistoryScreen> {
  Future<List<Order>>? _ordersFuture;

  final TextEditingController _searchController = TextEditingController();
  final TextEditingController _startDateController = TextEditingController();
  final TextEditingController _endDateController = TextEditingController();

  String? _searchQuery;
  DateTime? _startDate;
  DateTime? _endDate;
  // bool _isPerformingAction = false; // Plus nécessaire car les actions sont enlevées

  @override
  void initState() {
    super.initState();
    _setInitialDatesAndFetch();
  }

  void _setInitialDatesAndFetch() {
    final now = DateTime.now();
    // Défaut: Aujourd'hui pour correspondre à la logique implicite de rider.js pour "Mes Courses" si pas de date
    _startDate = DateTime(now.year, now.month, now.day);
    _endDate = DateTime(now.year, now.month, now.day, 23, 59, 59);
    _startDateController.text = DateFormat('dd/MM/yyyy', 'fr_FR').format(_startDate!);
    _endDateController.text = DateFormat('dd/MM/yyyy', 'fr_FR').format(_endDate!);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      // Vérification mounted avant le premier fetch dans le callback post-frame
      if (mounted) {
        _fetchOrders();
      }
    });
  }

  Future<void> _fetchOrders() async {
    // Ne pas rafraîchir si une action est en cours (la variable n'est plus utile mais on garde la logique au cas où)
    // if (_isPerformingAction) return;
    // Vérification initiale de mounted
    if (!mounted) return;

    final orderService = Provider.of<OrderService?>(context, listen: false);
    if (orderService == null) {
      if (mounted) { // Vérification avant setState
        setState(() {
          _ordersFuture = Future.error("Service de commandes non disponible.");
        });
      }
      return;
    }

    // Affiche un indicateur de chargement pendant la requête
    bool shouldShowLoading = _ordersFuture == null;
    if (!shouldShowLoading) {
      try {
        await _ordersFuture?.timeout(Duration.zero);
      } catch (_) {
        shouldShowLoading = true; // Si le future précédent a échoué ou timeout, on montre le loading
      }
    }

     if (mounted && shouldShowLoading) { // Vérification avant setState
       setState(() {
         // Force l'affichage du spinner en mettant le future à null temporairement
         _ordersFuture = null;
       });
     }


    // Lance la nouvelle requête
     final future = orderService.fetchRiderOrders(
      statuses: ['all'], // Historique complet
      startDate: _startDate != null ? DateFormat('yyyy-MM-dd').format(_startDate!) : null,
      endDate: _endDate != null ? DateFormat('yyyy-MM-dd').format(_endDate!) : null,
      search: _searchQuery,
    );

     if (mounted) { // Vérification avant le setState final
       setState(() {
         _ordersFuture = future;
       });
     }
  }


  Future<void> _selectDate(BuildContext context, bool isStartDate) async {
    // Vérification initiale de mounted
    if (!mounted) return;
    final DateTime? picked = await showDatePicker(
      context: context, // Utilise le contexte local passé en argument
      initialDate: (isStartDate ? _startDate : _endDate) ?? DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      locale: const Locale('fr', 'FR'),
    );
    // Vérification de mounted après await
    if (!mounted) return;
    if (picked != null) {
      setState(() {
        if (isStartDate) {
          _startDate = DateTime(picked.year, picked.month, picked.day);
          _startDateController.text = DateFormat('dd/MM/yyyy', 'fr_FR').format(_startDate!);
        } else {
          _endDate = DateTime(picked.year, picked.month, picked.day, 23, 59, 59);
          _endDateController.text = DateFormat('dd/MM/yyyy', 'fr_FR').format(_endDate!);
        }
      });
      _applyFilters(); // Appelle fetchOrders qui a déjà sa propre vérification mounted
    }
  }

  void _applyFilters() {
     if (!mounted) return; // Vérification avant setState
    setState(() {
      _searchQuery = _searchController.text.trim().isEmpty ? null : _searchController.text.trim();
    });
    _fetchOrders(); // Appelle fetchOrders qui a déjà sa propre vérification mounted
  }

  @override
  void dispose() {
    _searchController.dispose();
    _startDateController.dispose();
    _endDateController.dispose();
    super.dispose();
  }

   // --- Les fonctions de gestion des actions (_showFeedback, _performApiAction, _handle...) ont été supprimées ---


  // Helper local pour formater les montants (conservé car utile)
  String formatAmount(double? amount) {
    if (amount == null) return '0 FCFA';
    final formatter = NumberFormat.currency(locale: 'fr_FR', symbol: 'FCFA', decimalDigits: 0);
    return formatter.format(amount);
  }


  @override
  Widget build(BuildContext context) {
    return Scaffold(
      // appBar: AppBar( // L'AppBar est déjà dans HomeScreen
      //   title: const Text('Mes Courses (Historique)'),
      // ),
      body: Column(
        children: [
          // --- Section des Filtres (Style amélioré) ---
          Padding(
            padding: const EdgeInsets.all(12.0),
            child: Column(
              children: [
                TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    labelText: 'Rechercher (ID, Client, Lieu...)',
                    prefixIcon: const Icon(Icons.search),
                    suffixIcon: _searchController.text.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear),
                          onPressed: () {
                             if (!mounted) return; // Vérif avant _searchController.clear() et _applyFilters()
                            _searchController.clear();
                            _applyFilters();
                          },
                        )
                      : null,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    contentPadding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
                  ),
                   onSubmitted: (_) => _applyFilters(),
                   onChanged: (_) => _applyFilters(), // Recherche dynamique
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _startDateController,
                        decoration: InputDecoration(
                          labelText: 'Du',
                          prefixIcon: const Icon(Icons.calendar_today),
                           border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                           contentPadding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
                        ),
                        readOnly: true,
                        onTap: () => _selectDate(context, true), // Passe le BuildContext local
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextField(
                        controller: _endDateController,
                        decoration: InputDecoration(
                          labelText: 'Au',
                          prefixIcon: const Icon(Icons.calendar_today),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                          contentPadding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
                        ),
                        readOnly: true,
                        onTap: () => _selectDate(context, false), // Passe le BuildContext local
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // --- Section Liste des Commandes ---
          Expanded(
            child: FutureBuilder<List<Order>>(
              future: _ordersFuture,
              builder: (context, snapshot) {
                 // Gère l'état initial où _ordersFuture est null avant le premier fetch
                 if (_ordersFuture == null || (snapshot.connectionState == ConnectionState.waiting && snapshot.data == null) ) {
                   return const Center(child: CircularProgressIndicator());
                 }
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                } else if (snapshot.hasError) {
                   return Center(
                     child: Padding(
                       padding: const EdgeInsets.all(16.0),
                       child: Text(
                         'Erreur: ${snapshot.error.toString().replaceFirst('Exception: ', '')}',
                         style: const TextStyle(color: AppTheme.danger),
                         textAlign: TextAlign.center,
                       ),
                     ),
                   );
                } else if (!snapshot.hasData || snapshot.data!.isEmpty) {
                   return const Center(
                     child: Text(
                       'Aucune commande trouvée pour ces filtres.',
                       style: TextStyle(color: Colors.grey),
                     ),
                   );
                }

                final orders = snapshot.data!;
                // Tri antichronologique pour l'historique
                orders.sort((a, b) => b.createdAt.compareTo(a.createdAt));

                return ListView.builder(
                  padding: const EdgeInsets.only(left: 12.0, right: 12.0, bottom: 12.0),
                  itemCount: orders.length,
                  itemBuilder: (context, index) {
                    // Utilise OrderCard sans passer les callbacks d'action
                    return OrderCard(
                      order: orders[index],
                      // isActionInProgress: _isPerformingAction, // Plus nécessaire
                      // Pas de callbacks passés ici
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}