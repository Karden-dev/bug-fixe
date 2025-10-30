import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:wink_manager/models/admin_order.dart'; 
import 'package:wink_manager/providers/order_provider.dart'; 
import 'package:wink_manager/screens/admin_order_edit_screen.dart';
import 'package:wink_manager/widgets/order_action_dialogs.dart'; 

// Map des statuts (pour affichage et filtrage)
const Map<String, String> statusTranslations = {
  '': 'Tous (sauf retours)',
  'pending': 'En attente',
  'in_progress': 'Assignée',
  'ready_for_pickup': 'Prête',
  'en_route': 'En route',
  'delivered': 'Livrée',
  'cancelled': 'Annulée',
  'failed_delivery': 'Livraison ratée',
  'reported': 'À relancer',
};

// Map des couleurs de statut (inspiré du CSS)
const Map<String, Color> statusColors = {
  'pending': Colors.orange,
  'in_progress': Colors.blue,
  'ready_for_pickup': Colors.cyan,
  'en_route': Color(0xFFFF7F50), // Corail
  'delivered': Colors.green,
  'cancelled': Colors.red,
  'failed_delivery': Colors.redAccent,
  'reported': Colors.purple,
  'return_declared': Colors.grey,
  'returned': Colors.grey,
};


class AdminOrdersScreen extends StatefulWidget {
  const AdminOrdersScreen({super.key});

  @override
  State<AdminOrdersScreen> createState() => _AdminOrdersScreenState();
}

class _AdminOrdersScreenState extends State<AdminOrdersScreen> {
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<OrderProvider>(context, listen: false).loadOrders();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _navigateToEditScreen(AdminOrder? order) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => AdminOrderEditScreen(order: order),
      ),
    ).then((_) {
      Provider.of<OrderProvider>(context, listen: false).loadOrders();
    });
  }

  Future<void> _selectDateRange(BuildContext context) async {
    final provider = Provider.of<OrderProvider>(context, listen: false);
    
    if (!context.mounted) return;

    final newRange = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2023),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      initialDateRange: DateTimeRange(
        start: provider.startDate,
        end: provider.endDate,
      ),
      initialEntryMode: DatePickerEntryMode.calendarOnly,
    );

    if (newRange != null) {
      provider.setDateRange(newRange.start, newRange.end);
    }
  }

  void _showStatusFilter(BuildContext context) {
    final provider = Provider.of<OrderProvider>(context, listen: false);
    showModalBottomSheet(
      context: context,
      builder: (context) {
        return ListView(
          shrinkWrap: true,
          children: statusTranslations.entries.map((entry) {
            return ListTile(
              title: Text(entry.value),
              onTap: () {
                provider.setStatusFilter(entry.key);
                Navigator.pop(context);
              },
              trailing: provider.statusFilter == entry.key
                  ? const Icon(Icons.check, color: Color(0xFFFF7F50))
                  : null,
            );
          }).toList(),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<OrderProvider>(context);

    // Titre "parlant" pour l'AppBar
    final String dateTitle = (provider.startDate == provider.endDate)
      ? DateFormat('dd MMM yyyy', 'fr_FR').format(provider.startDate)
      : "${DateFormat('dd/MM', 'fr_FR').format(provider.startDate)} - ${DateFormat('dd/MM', 'fr_FR').format(provider.endDate)}";

    return Scaffold(
      appBar: AppBar(
        title: Text('Commandes ($dateTitle)'),
        actions: [
          // Bouton pour rafraîchir manuellement
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: provider.isLoading ? null : () => provider.loadOrders(),
          ),
          // Le bouton "+" est maintenant dans la barre de navigation
        ],
      ),
      body: Column(
        children: [
          _buildFilterControls(context, provider),
          Expanded(
            child: _buildOrderList(provider),
          ),
        ],
      ),
    );
  }

  // (Les filtres restent identiques)
  Widget _buildFilterControls(BuildContext context, OrderProvider provider) {
     final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.all(8.0),
      child: Column(
        children: [
          TextField(
            controller: _searchController,
            decoration: InputDecoration(
              hintText: 'Rechercher (ID, Tél, Client...)',
              prefixIcon: const Icon(Icons.search),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              contentPadding: const EdgeInsets.symmetric(horizontal: 12),
            ),
            onChanged: (value) {
              provider.setSearchFilter(value);
            },
          ),
          const SizedBox(height: 8),
          
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  icon: const Icon(Icons.calendar_today),
                  label: Text(
                    '${DateFormat('dd/MM').format(provider.startDate)} - ${DateFormat('dd/MM').format(provider.endDate)}',
                    style: const TextStyle(fontSize: 12),
                    overflow: TextOverflow.ellipsis,
                  ),
                  onPressed: () => _selectDateRange(context),
                  style: OutlinedButton.styleFrom(
                    side: BorderSide(color: theme.primaryColor.withAlpha((255 * 0.5).round())),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              
              Expanded(
                child: OutlinedButton.icon(
                  icon: const Icon(Icons.flag_outlined),
                  label: Text(
                    statusTranslations[provider.statusFilter] ?? 'Statut',
                    style: const TextStyle(fontSize: 12),
                    overflow: TextOverflow.ellipsis,
                  ),
                  onPressed: () => _showStatusFilter(context),
                  style: OutlinedButton.styleFrom(
                    side: BorderSide(color: theme.primaryColor.withAlpha((255 * 0.5).round())),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // (La liste des commandes reste identique)
  Widget _buildOrderList(OrderProvider provider) {
    if (provider.isLoading && provider.orders.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (provider.error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Text(
            'Erreur: ${provider.error}\nVeuillez réessayer.',
            textAlign: TextAlign.center,
            style: const TextStyle(color: Colors.red),
          ),
        ),
      );
    }

    if (provider.orders.isEmpty) {
      return const Center(
        child: Text('Aucune commande trouvée pour les filtres actuels.'),
      );
    }

    return RefreshIndicator(
      onRefresh: () => provider.loadOrders(),
      child: ListView.builder(
        padding: const EdgeInsets.only(bottom: 80), // Espace pour le FAB
        itemCount: provider.orders.length,
        itemBuilder: (context, index) {
          final order = provider.orders[index];
          return _OrderListItem(
            order: order,
            onEdit: () => _navigateToEditScreen(order),
          );
        },
      ),
    );
  }
}

// --- WIDGET POUR UN ÉLÉMENT DE LA LISTE (NOUVEAU STYLE) ---

class _OrderListItem extends StatelessWidget {
  final AdminOrder order;
  final VoidCallback onEdit;

  const _OrderListItem({required this.order, required this.onEdit});

  String _formatCurrency(double amount) {
    return '${amount.toStringAsFixed(0)} FCFA';
  }

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

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final Color color = statusColors[order.status] ?? Colors.grey;
    final String statusText = statusTranslations[order.status] ?? order.status;
    final String itemsPreview = order.items.map((e) => e.itemName).join(', ');

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      elevation: 2,
      child: InkWell(
        onTap: () { 
          // TODO: Afficher les détails (Action 'details')
          ScaffoldMessenger.of(context).showSnackBar(
             SnackBar(content: Text('Afficher les détails de #${order.id} (WIP)')),
          );
        },
        child: Padding(
          padding: const EdgeInsets.all(12.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Ligne 1: ID, Statut et Menu
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // Pastille de couleur
                  Container(
                    width: 10,
                    height: 10,
                    decoration: BoxDecoration(
                      color: color,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '#${order.id}',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    statusText,
                    style: TextStyle(
                      color: color,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                  const Spacer(),
                  _buildActionMenu(context, onEdit), // Menu
                ],
              ),
              const Divider(height: 16),
              
              // Ligne 2: Montant et Client
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    _formatCurrency(order.articleAmount + order.deliveryFee),
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 18,
                      color: theme.primaryColor,
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        order.customerPhone,
                        style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14),
                      ),
                      Text(
                        order.deliveryLocation,
                        style: TextStyle(fontSize: 12, color: Colors.grey[700]),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 12),
              
              // Ligne 3: Marchand et Livreur
              _buildInfoRow(Icons.store, order.shopName),
              const SizedBox(height: 4),
              _buildInfoRow(Icons.delivery_dining, order.deliverymanName ?? 'Non assigné'),
              const SizedBox(height: 8),
              // Ligne 4: Aperçu articles
              _buildInfoRow(Icons.shopping_bag, itemsPreview, isMuted: true),
            ],
          ),
        ),
      ),
    );
  }

  // Helper pour les lignes d'info
  Widget _buildInfoRow(IconData icon, String text, {bool isMuted = false}) {
     return Row(
      children: [
        Icon(icon, size: 14, color: isMuted ? Colors.grey[500] : Colors.grey[700]),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            text,
            style: TextStyle(
              fontSize: 12, 
              color: isMuted ? Colors.grey[600] : Colors.black87,
              fontStyle: (text == 'Non assigné') ? FontStyle.italic : FontStyle.normal,
            ),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }

  // Le menu d'actions (logique inchangée)
  Widget _buildActionMenu(BuildContext context, VoidCallback onEdit) {
    final provider = Provider.of<OrderProvider>(context, listen: false);

    final bool isAssigned = order.deliverymanName != null;
    final bool canChangeStatus = isAssigned && (order.status == 'en_route' || order.status == 'reported');
    final bool canEdit = order.pickedUpByRiderAt == null; 

    Future<void> handleDelete() async {
      if (!context.mounted) return;
      if (await _confirmAction(context, 'Supprimer la commande', 'Êtes-vous sûr de vouloir supprimer la commande #${order.id} ?')) {
        if (!context.mounted) return;
        try {
          await provider.deleteOrder(order.id);
          if (!context.mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Commande supprimée.')),
          );
        } catch (e) {
          if (!context.mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Erreur: ${e.toString()}'), backgroundColor: Colors.red),
          );
        }
      }
    }

    return PopupMenuButton<String>(
      icon: const Icon(Icons.more_vert, color: Colors.grey),
      onSelected: (value) {
        switch (value) {
          case 'edit':
            onEdit();
            break;
          case 'assign':
            showAssignDeliverymanDialog(context, order.id);
            break;
          case 'delivered':
            showStatusActionDialog(context, order.id, 'delivered');
            break;
          case 'failed':
            showStatusActionDialog(context, order.id, 'failed_delivery');
            break;
          case 'reported':
            showStatusActionDialog(context, order.id, 'reported');
            break;
          case 'cancel':
            showStatusActionDialog(context, order.id, 'cancelled');
            break;
          case 'delete':
            handleDelete();
            break;
          default:
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Afficher les détails de #${order.id} (WIP)')),
            );
        }
      },
      itemBuilder: (BuildContext context) => <PopupMenuEntry<String>>[
        const PopupMenuItem<String>(
          value: 'details',
          child: ListTile(leading: Icon(Icons.visibility), title: Text('Détails')),
        ),
        PopupMenuItem<String>(
          value: 'edit',
          enabled: canEdit,
          child: const ListTile(leading: Icon(Icons.edit), title: Text('Modifier')),
        ),
        const PopupMenuItem<String>(
          value: 'assign',
          child: ListTile(leading: Icon(Icons.person_add), title: Text('Assigner')),
        ),
        const PopupMenuDivider(),
        PopupMenuItem<String>(
          value: 'delivered',
          enabled: canChangeStatus,
          child: const ListTile(leading: Icon(Icons.check_circle, color: Colors.green), title: Text('Livrée')),
        ),
        PopupMenuItem<String>(
          value: 'failed',
          enabled: canChangeStatus,
          child: const ListTile(leading: Icon(Icons.cancel, color: Colors.red), title: Text('Livraison ratée')),
        ),
        PopupMenuItem<String>(
          value: 'reported',
          enabled: canChangeStatus,
          child: const ListTile(leading: Icon(Icons.history, color: Colors.purple), title: Text('À relancer')),
        ),
        PopupMenuItem<String>(
          value: 'cancel',
          enabled: isAssigned && order.status != 'delivered', 
          child: const ListTile(leading: Icon(Icons.block, color: Colors.grey), title: Text('Annuler')),
        ),
        const PopupMenuDivider(),
        const PopupMenuItem<String>(
          value: 'delete',
          child: ListTile(leading: Icon(Icons.delete_forever, color: Colors.red), title: Text('Supprimer')),
        ),
      ],
    );
  }
}