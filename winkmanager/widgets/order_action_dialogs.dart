import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:wink_manager/providers/order_provider.dart';
import 'package:wink_manager/screens/admin_orders_screen.dart'; // Pour les maps de statut

// NOTE: Dans une vraie application, le modèle Deliveryman et Shop serait importé ici
// Pour l'instant, on utilise Map<String, dynamic> et des IDs int.

// --- DIALOGUE DE STATUT (Pour Livrée/Ratée) ---
Future<void> showStatusActionDialog(BuildContext context, int orderId, String status) async {
  final provider = Provider.of<OrderProvider>(context, listen: false);

  // Statuts qui demandent une confirmation de paiement
  if (status == 'delivered') {
    return showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Mode de Paiement (Livrée)'),
        content: const Text('Sélectionnez comment le client a payé :'),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              _handleStatusUpdate(context, provider, orderId, status, paymentStatus: 'paid_to_supplier', amountReceived: 0);
            },
            child: const Text('Mobile Money'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              _handleStatusUpdate(context, provider, orderId, status, paymentStatus: 'cash', amountReceived: 0);
            },
            child: const Text('Cash'),
          ),
        ],
      ),
    );
  }
  
  // Statut de base pour Annulée, À relancer, etc.
  if (status == 'cancelled' || status == 'reported') {
    final String paymentStatus = status == 'cancelled' ? 'cancelled' : 'pending';
    if (status == 'cancelled' && !(await _confirmAction(context, 'Annuler la commande', 'Êtes-vous sûr de vouloir annuler cette commande ?'))) return;
    
    return _handleStatusUpdate(context, provider, orderId, status, paymentStatus: paymentStatus, amountReceived: 0);
  }

  // Statut Livraison ratée (requiert un montant reçu potentiel)
  if (status == 'failed_delivery') {
    TextEditingController amountController = TextEditingController(text: '0');
    return showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Livraison Ratée'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Montant reçu du client (si paiement partiel) :'),
            TextField(
              controller: amountController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Montant reçu (FCFA)'),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
          ElevatedButton(
            onPressed: () {
              final amount = double.tryParse(amountController.text) ?? 0.0;
              Navigator.pop(ctx);
              _handleStatusUpdate(context, provider, orderId, status, amountReceived: amount);
            },
            child: const Text('Confirmer'),
          ),
        ],
      ),
    );
  }
}

// Fonction d'appel API réelle pour le statut
Future<void> _handleStatusUpdate(
    BuildContext context,
    OrderProvider provider,
    int orderId,
    String status,
    {String? paymentStatus, double? amountReceived}) async {
  try {
    await provider.updateOrderStatus(
      orderId,
      status,
      paymentStatus: paymentStatus,
      amountReceived: amountReceived,
    );
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Statut mis à jour en ${statusTranslations[status]}!')),
    );
  } catch (e) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Erreur statut: ${e.toString()}'), backgroundColor: Colors.red),
    );
  }
}

// --- DIALOGUE D'ASSIGNATION ---
Future<void> showAssignDeliverymanDialog(BuildContext context, int orderId) async {
  final provider = Provider.of<OrderProvider>(context, listen: false);
  // Simuler une liste de livreurs (TODO: Implémenter fetchDeliverymen ici)
  // Pour l'instant, nous utilisons des données mockées
  const List<Map<String, dynamic>> deliverymen = [
    {'id': 1, 'name': 'Livreur A'},
    {'id': 2, 'name': 'Livreur B'},
    {'id': 3, 'name': 'Livreur C'},
  ];
  
  int? selectedDeliverymanId;
  
  return showDialog(
    context: context,
    builder: (ctx) => StatefulBuilder(
      builder: (context, setState) {
        return AlertDialog(
          title: const Text('Assigner un Livreur'),
          content: DropdownButtonFormField<int>(
            decoration: const InputDecoration(labelText: 'Sélectionnez un livreur'),
            items: deliverymen.map((dm) {
              return DropdownMenuItem<int>(
                value: dm['id'] as int,
                child: Text(dm['name'] as String),
              );
            }).toList(),
            onChanged: (int? newValue) {
              setState(() { selectedDeliverymanId = newValue; });
            },
            validator: (value) => value == null ? 'Sélection requise' : null,
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
            ElevatedButton(
              onPressed: selectedDeliverymanId == null ? null : () async {
                Navigator.pop(ctx);
                try {
                  await provider.assignOrder(orderId, selectedDeliverymanId!);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Livreur assigné avec succès!')),
                  );
                } catch (e) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Erreur assignation: ${e.toString()}'), backgroundColor: Colors.red),
                  );
                }
              },
              child: const Text('Assigner'),
            ),
          ],
        );
      },
    ),
  );
}

// Fonction de confirmation générique
Future<bool> _confirmAction(BuildContext context, String title, String content) async {
  return await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text(title),
      content: Text(content),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Non')),
        ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Oui')),
      ],
    ),
  ) ?? false;
}