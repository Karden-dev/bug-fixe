import 'dart:async'; // CORRECTION: Import pour Timer (recherche)
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:wink_manager/models/admin_order.dart';
import 'package:wink_manager/models/order_item.dart';
import 'package:wink_manager/models/shop.dart';
import 'package:wink_manager/providers/order_provider.dart';

// --- Widget pour gérer la ligne d'un article ---
class OrderItemEditor extends StatelessWidget {
  final int index;
  final Function(int) onRemove;
  final TextEditingController nameController;
  final TextEditingController qtyController;
  final TextEditingController amountController;

  const OrderItemEditor({
    super.key,
    required this.index,
    required this.onRemove,
    required this.nameController,
    required this.qtyController,
    required this.amountController,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            flex: 3,
            child: TextFormField(
              controller: nameController,
              decoration: InputDecoration(
                labelText: 'Article ${index + 1}',
                border: const OutlineInputBorder(),
                contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
              ),
              validator: (value) => (value == null || value.isEmpty) ? 'Nom requis' : null,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            flex: 1,
            child: TextFormField(
              controller: qtyController,
              decoration: const InputDecoration(
                labelText: 'Qté',
                border: OutlineInputBorder(),
                contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 10),
              ),
              keyboardType: TextInputType.number,
              validator: (value) => (value == null || (int.tryParse(value) ?? 0) <= 0) ? 'Qté' : null,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            flex: 2,
            child: TextFormField(
              controller: amountController,
              decoration: const InputDecoration(
                labelText: 'Montant',
                border: OutlineInputBorder(),
                contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 10),
              ),
              keyboardType: TextInputType.number,
              validator: (value) => (value == null || value.isEmpty) ? 'Montant' : null,
            ),
          ),
          if (index > 0)
            IconButton(
              icon: const Icon(Icons.remove_circle_outline, color: Colors.red),
              onPressed: () => onRemove(index),
            ),
        ],
      ),
    );
  }
}


class AdminOrderEditScreen extends StatefulWidget {
  final AdminOrder? order; 

  const AdminOrderEditScreen({super.key, this.order});

  @override
  State<AdminOrderEditScreen> createState() => _AdminOrderEditScreenState();
}

class _AdminOrderEditScreenState extends State<AdminOrderEditScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;

  final _shopSearchController = TextEditingController();
  final _customerNameController = TextEditingController();
  final _customerPhoneController = TextEditingController();
  final _deliveryLocationController = TextEditingController();
  final _deliveryFeeController = TextEditingController();
  final _expeditionFeeController = TextEditingController();
  
  Shop? _selectedShop; 
  bool _isExpedition = false;
  DateTime _createdAt = DateTime.now();

  // CORRECTION: Le champ est désormais final
  final List<Map<String, TextEditingController>> _itemControllers = [];

  bool get _isEditMode => widget.order != null;

  @override
  void initState() {
    super.initState();
    if (_isEditMode) {
      final order = widget.order!;
      
      _selectedShop = Shop(id: order.id, name: order.shopName, phoneNumber: ''); 
      _shopSearchController.text = order.shopName; 
      
      _customerNameController.text = order.customerName ?? '';
      _customerPhoneController.text = order.customerPhone;
      _deliveryLocationController.text = order.deliveryLocation;
      _deliveryFeeController.text = order.deliveryFee.toStringAsFixed(0);
      _expeditionFeeController.text = order.expeditionFee.toStringAsFixed(0);
      _isExpedition = order.expeditionFee > 0;
      _createdAt = order.createdAt;
      
      if (order.items.isNotEmpty) {
        for (var item in order.items) {
          _addItemRow(item: item);
        }
      } else {
         _addItemRow();
      }
    } else {
      _addItemRow();
      _deliveryFeeController.text = "0";
      _expeditionFeeController.text = "0";
    }
  }

  void _addItemRow({OrderItem? item}) {
    final nameController = TextEditingController(text: item?.itemName ?? '');
    final qtyController = TextEditingController(text: item?.quantity.toString() ?? '1');
    final amountController = TextEditingController(text: item?.amount.toStringAsFixed(0) ?? '0');

    setState(() {
      _itemControllers.add({
        'name': nameController,
        'qty': qtyController,
        'amount': amountController,
      });
    });
  }

  void _removeItemRow(int index) {
    if (_itemControllers.length <= 1) {
       ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vous devez avoir au moins un article.'), backgroundColor: Colors.red),
      );
      return;
    }
    
    _itemControllers[index]['name']?.dispose();
    _itemControllers[index]['qty']?.dispose();
    _itemControllers[index]['amount']?.dispose();
    
    setState(() {
      _itemControllers.removeAt(index);
    });
  }


  @override
  void dispose() {
    _shopSearchController.dispose();
    _customerNameController.dispose();
    _customerPhoneController.dispose();
    _deliveryLocationController.dispose();
    _deliveryFeeController.dispose();
    _expeditionFeeController.dispose();
    
    for (var controllers in _itemControllers) {
      controllers['name']?.dispose();
      controllers['qty']?.dispose();
      controllers['amount']?.dispose();
    }
    
    super.dispose();
  }

  Future<void> _saveForm() async {
    if (!_formKey.currentState!.validate() || _selectedShop == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Veuillez remplir tous les champs obligatoires et sélectionner un marchand.'), backgroundColor: Colors.red),
      );
      return; 
    }
    
    setState(() { _isLoading = true; });

    final List<Map<String, dynamic>> itemsList = [];
    double totalArticleAmount = 0;

    for (var controllers in _itemControllers) {
      final double amount = double.tryParse(controllers['amount']!.text) ?? 0;
      final int quantity = int.tryParse(controllers['qty']!.text) ?? 0;
      
      if (quantity <= 0) {
        setState(() { _isLoading = false; });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('La quantité de l\'article doit être supérieure à zéro.'), backgroundColor: Colors.red),
        );
        return;
      }

      itemsList.add({
        'item_name': controllers['name']!.text,
        'quantity': quantity,
        'amount': amount,
      });
      totalArticleAmount += amount;
    }
    
    final Map<String, dynamic> orderData = {
      'shop_id': _selectedShop!.id, 
      'customer_name': _customerNameController.text.trim(),
      'customer_phone': _customerPhoneController.text.trim(),
      'delivery_location': _deliveryLocationController.text.trim(),
      'article_amount': totalArticleAmount,
      'delivery_fee': double.tryParse(_deliveryFeeController.text) ?? 0,
      'expedition_fee': _isExpedition ? (double.tryParse(_expeditionFeeController.text) ?? 0) : 0,
      'created_at': DateFormat("yyyy-MM-ddTHH:mm:ss").format(_createdAt),
      'items': itemsList,
    };

    try {
      await Provider.of<OrderProvider>(context, listen: false)
          .saveOrder(orderData, widget.order?.id);
      
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Commande sauvegardée avec succès !'), backgroundColor: Colors.green),
      );
      Navigator.of(context).pop(); 
      
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erreur lors de la sauvegarde: $e'), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) {
        setState(() { _isLoading = false; });
      }
    }
  }
  
  Future<void> _selectCreatedAt() async {
    final DateTime? pickedDate = await showDatePicker(
      context: context,
      initialDate: _createdAt,
      firstDate: DateTime(2023),
      lastDate: DateTime.now().add(const Duration(days: 1)),
    );
    if (pickedDate != null) {
       if (!mounted) return;
       final TimeOfDay? pickedTime = await showTimePicker(
        context: context,
        initialTime: TimeOfDay.fromDateTime(_createdAt),
       );
       if (pickedTime != null) {
          setState(() {
            _createdAt = DateTime(
              pickedDate.year, pickedDate.month, pickedDate.day,
              pickedTime.hour, pickedTime.minute
            );
          });
       }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(_isEditMode ? 'Modifier Cde #${widget.order!.id}' : 'Créer Commande'),
        actions: [
          IconButton(
            icon: const Icon(Icons.save),
            onPressed: _isLoading ? null : _saveForm,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Form(
              key: _formKey,
              child: ListView(
                padding: const EdgeInsets.all(8.0),
                children: [
                  _buildSectionCard(
                    theme: theme,
                    title: 'Informations de Base',
                    children: [
                      // --- RECHERCHE MARCHANDE STATIQUE (AUTOCOMPLETE) ---
                      Autocomplete<Shop>(
                        fieldViewBuilder: (context, textEditingController, focusNode, onFieldSubmitted) {
                           _shopSearchController.text = textEditingController.text;
                           
                           return TextFormField(
                            controller: textEditingController,
                            focusNode: focusNode,
                            decoration: const InputDecoration(
                              labelText: 'Marchand *',
                              icon: Icon(Icons.store),
                              border: OutlineInputBorder(),
                            ),
                            validator: (value) {
                              if (_selectedShop == null || value!.isEmpty) {
                                return 'Marchand requis';
                              }
                              return null;
                            },
                           );
                        },
                        initialValue: TextEditingValue(text: _selectedShop?.name ?? ''),
                        displayStringForOption: (Shop option) => option.name,
                        
                        optionsBuilder: (TextEditingValue textEditingValue) async {
                          if (textEditingValue.text.isEmpty) {
                            return const Iterable<Shop>.empty();
                          }
                          if (mounted) {
                             return await Provider.of<OrderProvider>(context, listen: false)
                              .searchShops(textEditingValue.text);
                          }
                          return const Iterable<Shop>.empty();
                        },
                        
                        onSelected: (Shop selection) {
                          setState(() {
                            _selectedShop = selection;
                            _shopSearchController.text = selection.name;
                          });
                        },
                        
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _customerNameController,
                        decoration: const InputDecoration(labelText: 'Nom Client', icon: Icon(Icons.person), border: OutlineInputBorder()),
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _customerPhoneController,
                        decoration: const InputDecoration(labelText: 'Tél. Client *', icon: Icon(Icons.phone), border: OutlineInputBorder()),
                        keyboardType: TextInputType.phone,
                        validator: (value) => (value == null || value.isEmpty) ? 'Téléphone requis' : null,
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _deliveryLocationController,
                        decoration: const InputDecoration(labelText: 'Lieu de Livraison *', icon: Icon(Icons.location_on), border: OutlineInputBorder()),
                        validator: (value) => (value == null || value.isEmpty) ? 'Lieu requis' : null,
                      ),
                      const SizedBox(height: 16),
                      ListTile(
                        leading: const Icon(Icons.calendar_today),
                        title: Text(_isEditMode ? 'Date de modification' : 'Date et heure de création'),
                        subtitle: Text(DateFormat('dd/MM/yyyy HH:mm').format(_createdAt)),
                        onTap: _selectCreatedAt,
                      ),
                    ],
                  ),
                  
                  _buildSectionCard(
                    theme: theme,
                    title: 'Articles Commandés',
                    children: [
                       ListView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: _itemControllers.length,
                        itemBuilder: (context, index) {
                          return OrderItemEditor(
                            index: index,
                            onRemove: _removeItemRow,
                            nameController: _itemControllers[index]['name']!,
                            qtyController: _itemControllers[index]['qty']!,
                            amountController: _itemControllers[index]['amount']!,
                          );
                        },
                      ),
                      TextButton.icon(
                        icon: const Icon(Icons.add_circle_outline),
                        label: const Text('Ajouter un article'),
                        onPressed: () => _addItemRow(),
                      ),
                    ]
                  ),

                  _buildSectionCard(
                    theme: theme,
                    title: 'Frais de Livraison et Expédition',
                    children: [
                       TextFormField(
                        controller: _deliveryFeeController,
                        decoration: const InputDecoration(labelText: 'Frais de Livraison *', icon: Icon(Icons.delivery_dining), border: OutlineInputBorder()),
                        keyboardType: TextInputType.number,
                        validator: (value) => (value == null || value.isEmpty) ? 'Frais requis' : null,
                      ),
                      const SizedBox(height: 16),
                      SwitchListTile(
                        title: const Text("C'est une expédition"),
                        value: _isExpedition,
                        onChanged: (value) {
                          setState(() { _isExpedition = value; });
                        },
                        secondary: const Icon(Icons.local_shipping),
                      ),
                      if (_isExpedition)
                        Padding(
                          padding: const EdgeInsets.only(left: 40.0, top: 8.0, bottom: 8.0),
                          child: TextFormField(
                            controller: _expeditionFeeController,
                            decoration: const InputDecoration(labelText: 'Frais d\'Expédition', border: OutlineInputBorder()),
                            keyboardType: TextInputType.number,
                          ),
                        ),
                    ]
                  ),
                ],
              ),
            ),
    );
  }

  // Helper pour créer les cartes de section
  Widget _buildSectionCard({required ThemeData theme, required String title, required List<Widget> children}) {
    return Card(
      elevation: 2,
      margin: const EdgeInsets.symmetric(vertical: 8),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: theme.textTheme.titleLarge?.copyWith(color: theme.primaryColor)),
            const Divider(height: 24),
            ...children,
          ],
        ),
      ),
    );
  }
}