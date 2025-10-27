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
// CORRIGÉ : Importation correcte de url_launcher
import 'package:url_launcher/url_launcher.dart';

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
  bool _isPerformingAction = false; // État pour bloquer les actions

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
    // Ne pas rafraîchir si une action est en cours
    if (_isPerformingAction) return;
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
    // Pour éviter les clignotements, on peut vérifier si _ordersFuture est déjà en cours
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
     // Utilise une variable locale pour le future afin d'éviter les setState multiples si possible
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
        // Déclencher automatiquement après sélection de date pour une meilleure UX
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

   // --- Copie des Fonctions de gestion des actions depuis orders_today_screen ---
   // (Nécessaires car OrderCard est utilisé ici aussi)

  void _showFeedback(String message, {bool isError = false}) {
    if (!mounted) return; // Vérification avant d'utiliser context
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? AppTheme.danger : Colors.green,
      ),
    );
  }

  Future<void> _performApiAction(Future<void> Function() action, String successMessage) async {
    if (_isPerformingAction) return;
     if (!mounted) return; // Vérification avant setState
    setState(() => _isPerformingAction = true);
    try {
      await action();
       // Vérification après await avant _showFeedback
      if (!mounted) return;
      _showFeedback(successMessage);
      _fetchOrders(); // Rafraîchit la liste (contient vérif mounted)
    } catch (e) {
       // Vérification après await avant _showFeedback
       if (!mounted) return;
      _showFeedback(e.toString().replaceFirst('Exception: ', ''), isError: true);
    } finally {
      // Ajout d'un léger délai pour éviter les doubles clics rapides
      await Future.delayed(const Duration(milliseconds: 500));
      if (mounted) { // Vérification avant setState
        setState(() => _isPerformingAction = false);
      }
    }
  }

  // --- Implémentations spécifiques nécessaires pour cet écran ---
  // (COPIÉES depuis orders_today_screen.dart et AVEC AJOUT DES VERIFICATIONS MOUNTED)

  Future<void> _handleConfirmPickup(BuildContext ctx, Order order) async {
     // Vérification initiale (le contexte de la méthode est ctx)
     if (!mounted) return;
    final confirm = await showDialog<bool>(
      context: ctx, // Utilisation du contexte fourni
      builder: (BuildContext dialogContext) {
        return AlertDialog(
          title: const Text('Confirmation'),
          content: Text('Confirmez-vous avoir récupéré le colis #${order.id} ?'),
          actions: <Widget>[
            TextButton(
              child: const Text('Annuler'),
              onPressed: () => Navigator.of(dialogContext).pop(false),
            ),
            TextButton(
              child: const Text('Confirmer'),
              onPressed: () => Navigator.of(dialogContext).pop(true),
            ),
          ],
        );
      },
    );
     // Vérification après await avant d'utiliser le contexte de l'état (this.context)
     if (!mounted) return;
    if (confirm == true) {
      final orderService = Provider.of<OrderService?>(context, listen: false); // Utilise this.context implicitement
      if (orderService != null) {
        _performApiAction( // Contient déjà des vérifs mounted
          () => orderService.confirmPickup(order.id),
          'Récupération colis #${order.id} confirmée !',
        );
      } else {
         _showFeedback('Service non disponible.', isError: true); // Contient vérif mounted
      }
    }
  }

  Future<void> _handleStartDelivery(BuildContext ctx, Order order) async {
      // Vérification initiale
      if (!mounted) return;
     final orderService = Provider.of<OrderService?>(context, listen: false);
      if (orderService != null) {
        _performApiAction( // Contient déjà des vérifs mounted
          () => orderService.startDelivery(order.id),
          'Course #${order.id} démarrée !',
        );
      } else {
         _showFeedback('Service non disponible.', isError: true); // Contient vérif mounted
      }
  }

  Future<void> _handleDeclareReturn(BuildContext ctx, Order order) async {
     // Vérification initiale
     if (!mounted) return;
    final confirm = await showDialog<bool>(
      context: ctx,
      builder: (BuildContext dialogContext) {
        return AlertDialog(
          title: const Text('Déclarer un Retour'),
          content: Text('Voulez-vous déclarer le colis #${order.id} comme retourné ?'),
          actions: <Widget>[
            TextButton(child: const Text('Annuler'), onPressed: () => Navigator.of(dialogContext).pop(false)),
            TextButton(child: const Text('Déclarer'), onPressed: () => Navigator.of(dialogContext).pop(true)),
          ],
        );
      },
    );
     // Vérification après await
     if (!mounted) return;
     if (confirm == true) {
      final orderService = Provider.of<OrderService?>(context, listen: false);
      if (orderService != null) {
        _performApiAction( // Contient déjà des vérifs mounted
          () => orderService.declareReturn(order.id),
          'Retour #${order.id} déclaré. En attente de réception au Hub.',
        );
      } else {
         _showFeedback('Service non disponible.', isError: true); // Contient vérif mounted
      }
    }
  }

  Future<void> _handleStatusUpdate(BuildContext ctx, Order order) async {
     // Vérification initiale
     if (!mounted) return;
    final result = await showModalBottomSheet<Map<String, dynamic>>(
      context: ctx,
      builder: (BuildContext sheetContext) {
        return SafeArea(
          child: Wrap(
            children: <Widget>[
              ListTile(leading: const Icon(Icons.check_circle_outline, color: Colors.green), title: const Text('Livrée'), onTap: () => Navigator.pop(sheetContext, {'status': 'delivered'})),
              ListTile(leading: const Icon(Icons.error_outline, color: Colors.orange), title: const Text('Ratée'), onTap: () => Navigator.pop(sheetContext, {'status': 'failed_delivery'})),
              ListTile(leading: const Icon(Icons.report_problem_outlined, color: Colors.purple), title: const Text('À relancer'), onTap: () => Navigator.pop(sheetContext, {'status': 'reported'})),
              ListTile(leading: const Icon(Icons.cancel_outlined, color: AppTheme.danger), title: const Text('Annulée'), onTap: () => Navigator.pop(sheetContext, {'status': 'cancelled'})),
              ListTile(leading: const Icon(Icons.close), title: const Text('Fermer'), onTap: () => Navigator.pop(sheetContext)),
            ],
          ),
        );
      },
    );

     // Vérification après await
     if (!mounted) return;

    if (result != null && result['status'] != null) {
      final String status = result['status'];
       final orderService = Provider.of<OrderService?>(context, listen: false);
       if (orderService == null) { _showFeedback('Service non disponible.', isError: true); return; } // Contient vérif mounted

      if (status == 'delivered') {
        _handleDeliveredPayment(ctx, order); // Contient vérif mounted
      } else if (status == 'failed_delivery') {
        _handleFailedDelivery(ctx, order); // Contient vérif mounted
      } else if (status == 'cancelled') {
        _performApiAction( // Contient vérif mounted
          () => orderService.updateOrderStatus(orderId: order.id, status: 'cancelled', paymentStatus: 'cancelled'),
          'Commande #${order.id} annulée.',
        );
      } else if (status == 'reported') {
         _performApiAction( // Contient vérif mounted
          () => orderService.updateOrderStatus(orderId: order.id, status: 'reported', paymentStatus: 'pending'), // Remettre en pending payment pour la relance
          'Commande #${order.id} marquée à relancer.',
        );
      }
    }
  }

  Future<void> _handleDeliveredPayment(BuildContext ctx, Order order) async {
     // Vérification initiale
     if (!mounted) return;
    final paymentMethod = await showModalBottomSheet<String>(
      context: ctx,
      builder: (BuildContext sheetContext) {
         return SafeArea(child: Wrap(children: <Widget>[
           ListTile(leading: const Icon(Icons.money, color: Colors.green), title: const Text('Espèces'), onTap: () => Navigator.pop(sheetContext, 'cash')),
           ListTile(leading: const Icon(Icons.phone_android, color: Colors.blue), title: const Text('Mobile Money'), onTap: () => Navigator.pop(sheetContext, 'paid_to_supplier')),
           ListTile(leading: const Icon(Icons.close), title: const Text('Annuler'), onTap: () => Navigator.pop(sheetContext)),
         ]));
      },
    );
     // Vérification après await
     if (!mounted) return;
    if (paymentMethod != null) {
       final orderService = Provider.of<OrderService?>(context, listen: false);
       if (orderService != null) {
          _performApiAction( // Contient vérif mounted
            () => orderService.updateOrderStatus(orderId: order.id, status: 'delivered', paymentStatus: paymentMethod),
            'Commande #${order.id} marquée comme livrée (${paymentMethod == "cash" ? "Espèces" : "Mobile Money"}).',
          );
       } else { _showFeedback('Service non disponible.', isError: true); } // Contient vérif mounted
    }
  }

  Future<void> _handleFailedDelivery(BuildContext ctx, Order order) async {
     // Vérification initiale
     if (!mounted) return;
     double? amountReceived;
     final TextEditingController amountController = TextEditingController();

     final confirm = await showDialog<bool>(
        context: ctx,
        builder: (BuildContext dialogContext) {
           return AlertDialog(
              title: Text('Livraison Ratée #${order.id}'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                   const Text('Montant perçu du client (si paiement partiel) :'),
                   TextField(
                      controller: amountController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(hintText: '0 FCFA'),
                   ),
                ],
              ),
              actions: [
                 TextButton(child: const Text('Annuler'), onPressed: () => Navigator.pop(dialogContext, false)),
                 TextButton(child: const Text('Confirmer Ratée'), onPressed: () {
                    amountReceived = double.tryParse(amountController.text) ?? 0.0;
                    Navigator.pop(dialogContext, true);
                 }),
              ],
           );
        },
     );
     amountController.dispose(); // Libérer le contrôleur

      // Vérification après await
     if (!mounted) return;

     if (confirm == true) {
        final orderService = Provider.of<OrderService?>(context, listen: false);
        if (orderService != null) {
           _performApiAction( // Contient vérif mounted
             () => orderService.updateOrderStatus(orderId: order.id, status: 'failed_delivery', amountReceived: amountReceived),
             'Commande #${order.id} marquée comme ratée${amountReceived != null && amountReceived! > 0 ? " (montant reçu: ${formatAmount(amountReceived)})" : ""}.',
           );
        } else { _showFeedback('Service non disponible.', isError: true); } // Contient vérif mounted
     }
  }

  Future<void> _handleCallClient(BuildContext ctx, Order order) async {
     // Vérification initiale
     if (!mounted) return;
     final Uri launchUri = Uri(scheme: 'tel', path: order.customerPhone.replaceAll(' ', ''));
     // CORRIGÉ : Appel direct aux fonctions du package
     if (await canLaunchUrl(launchUri)) {
       await launchUrl(launchUri);
     } else {
        // Vérification après await avant _showFeedback
        if (!mounted) return;
        _showFeedback('Impossible de lancer l\'application téléphone.', isError: true); // Contient vérif mounted
     }
  }

  // Helper local pour formater les montants
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
                    // CORRIGÉ : Appelle OrderCard sans les callbacks non définis
                    return OrderCard(
                      order: orders[index],
                      // Les callbacks suivants sont retirés :
                      // onConfirmPickup: () => _handleConfirmPickup(context, orders[index]),
                      // onStartDelivery: () => _handleStartDelivery(context, orders[index]),
                      // onDeclareReturn: () => _handleDeclareReturn(context, orders[index]),
                      // onStatusUpdate: () => _handleStatusUpdate(context, orders[index]),
                      // onCallClient: () => _handleCallClient(context, orders[index]),
                      // isActionInProgress: _isPerformingAction,
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