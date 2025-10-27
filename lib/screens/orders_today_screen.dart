// lib/screens/orders_today_screen.dart

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart'; // Pour le formatage des dates et montants
import 'package:url_launcher/url_launcher.dart'; // Import pour l'appel

import '../services/order_service.dart';
import '../models/order.dart';
import '../utils/app_theme.dart'; // Pour les couleurs
// Import de l'écran de détails
import 'order_details_screen.dart';
// Import de l'écran de chat
import 'chat_screen.dart'; // <-- AJOUTÉ

class OrdersTodayScreen extends StatefulWidget {
  const OrdersTodayScreen({super.key});

  @override
  State<OrdersTodayScreen> createState() => _OrdersTodayScreenState();
}

class _OrdersTodayScreenState extends State<OrdersTodayScreen> {
  late Future<List<Order>> _ordersFuture;
  bool _isPerformingAction = false; // Pour désactiver les boutons pendant une action API

  @override
  void initState() {
    super.initState();
    // Lance le fetch des commandes dès l'initialisation de l'écran
    _ordersFuture = _fetchOrders();
  }

  Future<List<Order>> _fetchOrders() async {
    // Utilise le OrderService via Provider pour récupérer les données
    final orderService = Provider.of<OrderService?>(context, listen: false);
    if (orderService == null) {
      // Gérer le cas où le service n'est pas encore prêt (peut arriver brièvement)
      await Future.delayed(const Duration(milliseconds: 100)); // Attendre un peu
      if (!mounted) return []; // Vérifier si le widget est toujours là
      final orderServiceRetry = Provider.of<OrderService?>(context, listen: false);
       if (orderServiceRetry == null) {
          throw Exception("Service de commandes non disponible.");
       }
       return orderServiceRetry.fetchRiderOrders(
          // CORRECTION: La liste doit inclure delivered/failed_delivery pour les commandes du jour
          statuses: ['pending', 'in_progress', 'ready_for_pickup', 'en_route', 'reported', 'delivered', 'failed_delivery'],
          startDate: DateFormat('yyyy-MM-dd').format(DateTime.now()), // Date du jour
          endDate: DateFormat('yyyy-MM-dd').format(DateTime.now()),   // Date du jour
       );
    }
    // Statuts pour "Aujourd'hui" basés sur rider.js
    return orderService.fetchRiderOrders(
      // CORRECTION: La liste doit inclure delivered/failed_delivery pour les commandes du jour
      statuses: ['pending', 'in_progress', 'ready_for_pickup', 'en_route', 'reported', 'delivered', 'failed_delivery'],
      startDate: DateFormat('yyyy-MM-dd').format(DateTime.now()), // Date du jour
      endDate: DateFormat('yyyy-MM-dd').format(DateTime.now()),   // Date du jour
    );
  }

  // Fonction pour rafraîchir la liste (Pull-to-refresh)
  Future<void> _refreshOrders() async {
    if (!mounted) return;
    setState(() {
      _ordersFuture = _fetchOrders();
    });
  }

  // --- Fonctions de gestion des actions (copiées depuis history et adaptées) ---

  void _showFeedback(String message, {bool isError = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? AppTheme.danger : Colors.green,
      ),
    );
  }

  Future<void> _performApiAction(Future<void> Function() action, String successMessage) async {
    if (_isPerformingAction) return;
    if (!mounted) return;
    setState(() => _isPerformingAction = true);
    try {
      await action();
      if (!mounted) return;
      _showFeedback(successMessage);
      _refreshOrders(); // Rafraîchit la liste
    } catch (e) {
      if (!mounted) return;
      _showFeedback(e.toString().replaceFirst('Exception: ', ''), isError: true);
    } finally {
      await Future.delayed(const Duration(milliseconds: 500)); // Anti double-clic
      if (mounted) {
        setState(() => _isPerformingAction = false);
      }
    }
  }

  // Confirmation récupération
  Future<void> _handleConfirmPickup(BuildContext ctx, Order order) async {
    if (!mounted) return;
    final confirm = await showDialog<bool>(
      context: ctx,
      builder: (BuildContext dialogContext) { /* ... AlertDialog ... */
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
    
    if (!mounted) return; // Check après await (consolidation)

    if (confirm == true) {
      final orderService = Provider.of<OrderService?>(context, listen: false);
      if (orderService != null) {
        _performApiAction(
          () => orderService.confirmPickup(order.id),
          'Récupération colis #${order.id} confirmée !',
        );
      } else {
         _showFeedback('Service non disponible.', isError: true);
      }
    }
  }

  // Démarrer course
  Future<void> _handleStartDelivery(BuildContext ctx, Order order) async {
    if (!mounted) return;
    final orderService = Provider.of<OrderService?>(context, listen: false);
    if (orderService != null) {
      _performApiAction(
        () => orderService.startDelivery(order.id),
        'Course #${order.id} démarrée !',
      );
    } else {
       _showFeedback('Service non disponible.', isError: true);
    }
  }

  // Déclarer retour
  Future<void> _handleDeclareReturn(BuildContext ctx, Order order) async {
    if (!mounted) return;
    final confirm = await showDialog<bool>(
      context: ctx,
      builder: (BuildContext dialogContext) { /* ... AlertDialog ... */
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
    
    if (!mounted) return; // Check après await (consolidation)
    
    if (confirm == true) {
      final orderService = Provider.of<OrderService?>(context, listen: false);
      if (orderService != null) {
        _performApiAction(
          () => orderService.declareReturn(order.id),
          'Retour #${order.id} déclaré. En attente de réception au Hub.',
        );
      } else {
         _showFeedback('Service non disponible.', isError: true);
      }
    }
  }

  // **IMPLÉMENTATION CHANGEMENT STATUT**
  Future<void> _handleStatusUpdate(BuildContext ctx, Order order) async {
    if (!mounted) return;
    final result = await showModalBottomSheet<Map<String, dynamic>>(
      context: ctx,
      builder: (BuildContext sheetContext) {
        // Options basées sur rider-common.js status-action-btn
        return SafeArea(
          child: Wrap(
            children: <Widget>[
              ListTile(leading: const Icon(Icons.check_circle_outline, color: Colors.green), title: const Text('Livrée'), onTap: () => Navigator.pop(sheetContext, {'status': 'delivered'})),
              ListTile(leading: const Icon(Icons.error_outline, color: Colors.orange), title: const Text('Ratée'), onTap: () => Navigator.pop(sheetContext, {'status': 'failed_delivery'})),
              ListTile(leading: const Icon(Icons.report_problem_outlined, color: Colors.purple), title: const Text('À relancer'), onTap: () => Navigator.pop(sheetContext, {'status': 'reported'})),
              ListTile(leading: const Icon(Icons.cancel_outlined, color: AppTheme.danger), title: const Text('Annulée'), onTap: () => Navigator.pop(sheetContext, {'status': 'cancelled'})),
              const Divider(),
              ListTile(leading: const Icon(Icons.close), title: const Text('Fermer'), onTap: () => Navigator.pop(sheetContext)),
            ],
          ),
        );
      },
    );

    if (!mounted) return; // Check après await (consolidation)

    if (result != null && result['status'] != null) {
      final String status = result['status'];
       final orderService = Provider.of<OrderService?>(context, listen: false);
       if (orderService == null) { 
         _showFeedback('Service non disponible.', isError: true); return; 
       }

      if (status == 'delivered') {
        _handleDeliveredPayment(ctx, order); // Ouvre la modale de paiement
      } else if (status == 'failed_delivery') {
        _handleFailedDelivery(ctx, order); // Ouvre la modale de montant reçu
      } else if (status == 'cancelled') {
        // Confirmation avant annulation
        final confirmCancel = await showDialog<bool>(
          context: ctx,
          builder: (dialogCtx) => AlertDialog(
            title: const Text('Confirmation'),
            content: Text('Voulez-vous vraiment annuler la commande #${order.id} ?'),
            actions: [
              TextButton(onPressed: () => Navigator.pop(dialogCtx, false), child: const Text('Non')),
              TextButton(onPressed: () => Navigator.pop(dialogCtx, true), child: const Text('Oui, Annuler')),
            ],
          ),
        );
        if (!mounted) return; // Check après await (consolidation)
        if (confirmCancel == true) {
          _performApiAction(
            () => orderService.updateOrderStatus(orderId: order.id, status: 'cancelled', paymentStatus: 'cancelled'),
            'Commande #${order.id} annulée.',
          );
        }
      } else if (status == 'reported') {
         _performApiAction(
          () => orderService.updateOrderStatus(orderId: order.id, status: 'reported', paymentStatus: 'pending'), // Remettre en pending payment pour la relance
          'Commande #${order.id} marquée à relancer.',
        );
      }
    }
  }

  // Modale pour choisir le mode de paiement si 'Livrée'
  Future<void> _handleDeliveredPayment(BuildContext ctx, Order order) async {
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
    if (!mounted) return; // Check après await (consolidation)
    if (paymentMethod != null) {
       final orderService = Provider.of<OrderService?>(context, listen: false);
       if (orderService != null) {
          _performApiAction(
            () => orderService.updateOrderStatus(orderId: order.id, status: 'delivered', paymentStatus: paymentMethod),
            'Commande #${order.id} marquée comme livrée (${paymentMethod == "cash" ? "Espèces" : "Mobile Money"}).',
          );
       } else { 
         _showFeedback('Service non disponible.', isError: true); 
       }
    }
  }

  // Modale pour entrer le montant si 'Ratée'
  Future<void> _handleFailedDelivery(BuildContext ctx, Order order) async {
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
                      keyboardType: const TextInputType.numberWithOptions(decimal: false), // Clavier numérique sans décimales
                      decoration: const InputDecoration(hintText: '0 FCFA', suffixText: 'FCFA'),
                   ),
                ],
              ),
              actions: [
                 TextButton(child: const Text('Annuler'), onPressed: () => Navigator.pop(dialogContext, false)),
                 TextButton(child: const Text('Confirmer Ratée'), onPressed: () {
                    // Essayer de parser, mettre 0 si invalide ou vide
                    amountReceived = double.tryParse(amountController.text.replaceAll(RegExp(r'[^0-9]'), '')) ?? 0.0;
                    Navigator.pop(dialogContext, true);
                 }),
              ],
           );
        },
     );
     amountController.dispose();

     if (!mounted) return; // Check après await (consolidation)

     if (confirm == true) {
        final orderService = Provider.of<OrderService?>(context, listen: false);
        if (orderService != null) {
           _performApiAction(
             () => orderService.updateOrderStatus(orderId: order.id, status: 'failed_delivery', amountReceived: amountReceived),
             'Commande #${order.id} marquée comme ratée${amountReceived != null && amountReceived! > 0 ? " (montant reçu: ${formatAmount(amountReceived)})" : ""}.',
           );
        } else { 
          _showFeedback('Service non disponible.', isError: true); 
        }
     }
  }

  // **IMPLÉMENTATION APPEL TÉLÉPHONIQUE**
  Future<void> _handleCallClient(BuildContext ctx, Order order) async {
     if (!mounted) return;
     final Uri launchUri = Uri(scheme: 'tel', path: order.customerPhone.replaceAll(RegExp(r'\s+'), '')); // Nettoyer le numéro

     if (await canLaunchUrl(launchUri)) {
       await launchUrl(launchUri);
     } else {
        if (!mounted) return; // Re-vérifier après await (consolidation)
        _showFeedback('Impossible de lancer l\'application téléphone.', isError: true);
     }
  }

  // **IMPLÉMENTATION OUVERTURE CHAT**
  void _openChat(BuildContext ctx, Order order) {
    Navigator.of(ctx).push(MaterialPageRoute(
      builder: (context) => ChatScreen(order: order),
    ));
  }

  // Helper local formatAmount
  String formatAmount(double? amount) {
    if (amount == null) return '0 FCFA';
    final formatter = NumberFormat.currency(locale: 'fr_FR', symbol: 'FCFA', decimalDigits: 0);
    return formatter.format(amount);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      // AppBar est gérée par HomeScreen
      body: RefreshIndicator(
        onRefresh: _refreshOrders,
        child: FutureBuilder<List<Order>>(
          future: _ordersFuture,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            } else if (snapshot.hasError) {
              return Center( /* ... gestion erreur ... */
                 child: Padding(
                   padding: const EdgeInsets.all(16.0),
                   child: Text(
                     'Erreur: ${snapshot.error.toString().replaceFirst('Exception: ', '')}',
                     style: const TextStyle(color: Colors.red),
                     textAlign: TextAlign.center,
                   ),
                 ),
              );
            } else if (!snapshot.hasData || snapshot.data!.isEmpty) {
              return LayoutBuilder( // Utilise LayoutBuilder pour permettre le RefreshIndicator même si vide
                 builder: (ctx, constraints) => SingleChildScrollView(
                   physics: const AlwaysScrollableScrollPhysics(),
                   child: Container(
                     height: constraints.maxHeight, // Prend toute la hauteur
                     alignment: Alignment.center,
                     child: const Text(
                       'Aucune commande pour aujourd\'hui.',
                       style: TextStyle(color: Colors.grey),
                     ),
                   ),
                 ),
               );
            }

            final orders = snapshot.data!;
            // Tri: prêt non récupéré > urgent > date ancienne
            orders.sort((a, b) => a.compareToForToday(b));

            return ListView.builder(
              padding: const EdgeInsets.all(12.0),
              itemCount: orders.length,
              itemBuilder: (context, index) {
                // Passe les callbacks aux actions de OrderCard
                return OrderCard(
                  order: orders[index],
                  onConfirmPickup: () => _handleConfirmPickup(context, orders[index]),
                  onStartDelivery: () => _handleStartDelivery(context, orders[index]),
                  onDeclareReturn: () => _handleDeclareReturn(context, orders[index]),
                  onStatusUpdate: () => _handleStatusUpdate(context, orders[index]),
                  onCallClient: () => _handleCallClient(context, orders[index]),
                  onOpenChat: () => _openChat(context, orders[index]), // Callback pour ouvrir le chat
                  isActionInProgress: _isPerformingAction,
                );
              },
            );
          },
        ),
      ),
    );
  }
}

// --- WIDGET POUR AFFICHER UNE CARTE DE COMMANDE ---

class OrderCard extends StatelessWidget {
  final Order order;
  // Ajout des callbacks
  final VoidCallback? onConfirmPickup;
  final VoidCallback? onStartDelivery;
  final VoidCallback? onDeclareReturn;
  final VoidCallback? onStatusUpdate;
  final VoidCallback? onCallClient;
  final VoidCallback? onOpenChat; // Callback pour le chat
  final bool isActionInProgress; // Pour désactiver les boutons

  const OrderCard({
    super.key,
    required this.order,
    this.onConfirmPickup,
    this.onStartDelivery,
    this.onDeclareReturn,
    this.onStatusUpdate,
    this.onCallClient,
    this.onOpenChat, // Paramètre chat
    this.isActionInProgress = false,
  });

  // Helper pour obtenir la couleur du statut
  Color _getStatusColor(String status) {
    switch (status) {
      case 'delivered': return Colors.green.shade700;
      case 'cancelled': case 'failed_delivery': case 'return_declared': case 'returned': return AppTheme.danger; // Rouge pour retours/échecs
      case 'pending': return Colors.orange.shade700;
      case 'in_progress': case 'ready_for_pickup': return Colors.blue.shade700;
      case 'en_route': return AppTheme.primaryColor; // Corail
      case 'reported': return Colors.purple.shade700;
      default: return Colors.grey.shade700;
    }
  }

  // Helper pour obtenir l'icône du statut
  IconData _getStatusIcon(String status) {
     switch (status) {
      case 'delivered': return Icons.check_circle_outline;
      case 'cancelled': return Icons.cancel_outlined;
      case 'failed_delivery': return Icons.error_outline;
      case 'return_declared': case 'returned': return Icons.assignment_return_outlined;
      case 'pending': return Icons.pending_outlined;
      case 'in_progress': return Icons.assignment_ind_outlined;
      case 'ready_for_pickup': return Icons.inventory_2_outlined;
      case 'en_route': return Icons.local_shipping_outlined;
      case 'reported': return Icons.report_problem_outlined;
      default: return Icons.help_outline;
    }
  }

  // --- NOUVEAU: Map pour traduction paiement (localement car non dans OrderService) ---
   static const Map<String, String> paymentTranslations = {
    'pending': 'En attente',
    'cash': 'En espèces',
    'paid_to_supplier': 'Mobile Money',
    'cancelled': 'Annulé'
   };

    Color _getPaymentColor(String paymentStatus) {
      switch (paymentStatus) {
        case 'pending': return Colors.orange.shade700;
        case 'cash': return Colors.green.shade700;
        case 'paid_to_supplier': return Colors.blue.shade700;
        case 'cancelled': return AppTheme.danger;
        default: return Colors.grey.shade700;
      }
    }

     IconData _getPaymentIcon(String paymentStatus) {
      switch (paymentStatus) {
        case 'pending': return Icons.hourglass_empty;
        case 'cash': return Icons.money;
        case 'paid_to_supplier': return Icons.phone_android;
        case 'cancelled': return Icons.money_off;
        default: return Icons.help_outline;
      }
    }


  @override
  Widget build(BuildContext context) {
    final orderService = Provider.of<OrderService?>(context, listen: false); // Pour les traductions statut
    final statusText = orderService?.statusTranslations[order.status] ?? order.status;
    final paymentText = paymentTranslations[order.paymentStatus] ?? order.paymentStatus; // Utilise la map locale
    final statusColor = _getStatusColor(order.status);
    final statusIcon = _getStatusIcon(order.status);
    final paymentColor = _getPaymentColor(order.paymentStatus);
    final paymentIcon = _getPaymentIcon(order.paymentStatus);

    final amountToCollectFormatted = NumberFormat.currency(locale: 'fr_FR', symbol: 'FCFA', decimalDigits: 0).format(order.amountToCollect);

    // Déterminer les actions possibles basées sur le statut
    final bool canPickup = order.status == 'ready_for_pickup' && !order.isPickedUp;
    final bool canStartDelivery = order.status == 'ready_for_pickup' && order.isPickedUp;
    final bool canUpdateStatus = ['en_route', 'reported'].contains(order.status);
    final bool canDeclareReturn = ['en_route', 'failed_delivery', 'cancelled', 'reported'].contains(order.status);

    return GestureDetector(
       onTap: () {
         Navigator.of(context).push(MaterialPageRoute(
           builder: (context) => OrderDetailsScreen(order: order),
         ));
       },
       child: Card(
         elevation: 3,
         margin: const EdgeInsets.only(bottom: 12.0),
         shape: RoundedRectangleBorder(
           borderRadius: BorderRadius.circular(12.0),
           side: order.isUrgent ? const BorderSide(color: AppTheme.danger, width: 2) : BorderSide.none,
         ),
         child: Padding(
           padding: const EdgeInsets.all(16.0),
           child: Column(
             crossAxisAlignment: CrossAxisAlignment.start,
             children: [
               Row(
                 mainAxisAlignment: MainAxisAlignment.spaceBetween,
                 children: [
                   Expanded( // Empêche le titre de déborder si trop long
                     child: Text(
                       'Commande #${order.id}',
                       style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                       overflow: TextOverflow.ellipsis,
                     ),
                   ),
                   // Actions (Chat, Options, Contact)
                   Row(
                     mainAxisSize: MainAxisSize.min, // Empêche Row de prendre toute la largeur
                     children: [
                       IconButton(
                         icon: Badge(
                           label: Text(order.unreadCount.toString()),
                           isLabelVisible: order.unreadCount > 0,
                           child: const Icon(Icons.chat_bubble_outline),
                         ),
                         color: AppTheme.secondaryColor,
                         tooltip: 'Discussion',
                         // **ACTION CHAT**
                         onPressed: isActionInProgress ? null : onOpenChat,
                       ),
                       PopupMenuButton<String>(
                         icon: const Icon(Icons.more_vert, color: AppTheme.secondaryColor),
                         tooltip: 'Options',
                         // Désactiver si une action est en cours
                         enabled: !isActionInProgress,
                         onSelected: (String result) {
                            if (result == 'pickup') {
                                onConfirmPickup?.call();
                            } else if (result == 'start_delivery') {
                                onStartDelivery?.call();
                            } else if (result == 'status') {
                                onStatusUpdate?.call();
                            } else if (result == 'return') {
                                onDeclareReturn?.call();
                            } else if (result == 'call_client') {
                                onCallClient?.call();
                            }
                         },
                         itemBuilder: (BuildContext context) => <PopupMenuEntry<String>>[
                           if (canPickup)
                             const PopupMenuItem<String>(value: 'pickup', child: ListTile(leading: Icon(Icons.inventory), title: Text('Confirmer Récupération'))),
                           if (canStartDelivery)
                             const PopupMenuItem<String>(value: 'start_delivery', child: ListTile(leading: Icon(Icons.play_circle_outline), title: Text('Démarrer Course'))),
                           if (canUpdateStatus)
                             const PopupMenuItem<String>(value: 'status', child: ListTile(leading: Icon(Icons.rule), title: Text('Statuer la commande'))),
                           if (canDeclareReturn)
                             const PopupMenuItem<String>(value: 'return', child: ListTile(leading: Icon(Icons.assignment_return), title: Text('Déclarer un retour'))),
                           // Séparateur si au moins une action est possible
                           if (canPickup || canStartDelivery || canUpdateStatus || canDeclareReturn)
                             const PopupMenuDivider(),
                           // Appel client toujours possible
                           const PopupMenuItem<String>(value: 'call_client', child: ListTile(leading: Icon(Icons.call), title: Text('Appeler Client'))),
                         ],
                       ),
                     ],
                   ),
                 ],
               ),
               if (order.isUrgent) // Afficher badge URGENT si nécessaire
                   const Padding(
                      padding: EdgeInsets.only(top: 4.0),
                      child: Chip(
                         label: Text('URGENT'),
                         backgroundColor: AppTheme.danger,
                         labelStyle: TextStyle(color: Colors.white, fontSize: 10),
                         padding: EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      ),
                   ),
               const Divider(height: 16),
               _buildDetailRow(Icons.storefront, 'Marchand', order.shopName),
               _buildDetailRow(Icons.person_outline, 'Client', order.customerName ?? order.customerPhone),
               _buildDetailRow(Icons.location_on_outlined, 'Adresse', order.deliveryLocation),
               _buildDetailRow(Icons.list_alt, 'Articles', order.itemsList ?? 'Non spécifié', maxLines: 2),
               const SizedBox(height: 8),
               // --- Statut & Paiement ---
                Row(
                   children: [
                      Icon(statusIcon, color: statusColor, size: 16),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                           statusText,
                           style: TextStyle(color: statusColor, fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                      ),
                      Icon(paymentIcon, color: paymentColor, size: 16),
                      const SizedBox(width: 6),
                      Text(
                         paymentText,
                         style: TextStyle(color: paymentColor, fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                   ],
                 ),
                 const SizedBox(height: 8),
                 // Montant à encaisser
                 Row(
                   mainAxisAlignment: MainAxisAlignment.end,
                   children: [
                     const Text('À encaisser: ', style: TextStyle(fontSize: 14)),
                     Text(
                       amountToCollectFormatted,
                       style: Theme.of(context).textTheme.titleMedium?.copyWith(
                         color: AppTheme.primaryColor,
                         fontWeight: FontWeight.bold,
                       ),
                     ),
                   ],
                 ),
                 // Date de création
                Padding(
                  padding: const EdgeInsets.only(top: 8.0),
                  child: Align( // Aligner à droite
                    alignment: Alignment.centerRight,
                    child: Text(
                      'Créée le ${DateFormat('dd MMM yyyy à HH:mm', 'fr_FR').format(order.createdAt)}',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey),
                    ),
                  ),
                ),
             ],
           ),
         ),
       ),
    );
  }

  // Widget helper pour afficher une ligne de détail avec icône
  Widget _buildDetailRow(IconData icon, String label, String value, {int maxLines = 1}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: Colors.grey.shade600),
          const SizedBox(width: 10),
          Text(
             '$label: ',
             style: TextStyle(color: Colors.grey.shade700, fontSize: 13),
             overflow: TextOverflow.ellipsis,
             maxLines: 1, // Label sur 1 ligne max
           ),
           Expanded(
            child: Text(
              value,
              style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14),
              overflow: TextOverflow.ellipsis,
              maxLines: maxLines, // Valeur peut prendre plusieurs lignes si besoin
            ),
          ),
        ],
      ),
    );
  }
}