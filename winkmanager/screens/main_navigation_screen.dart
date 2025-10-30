import 'package:flutter/material.dart';
import 'package:wink_manager/screens/admin_chat_list_screen.dart';
import 'package:wink_manager/screens/admin_hub_screen.dart';
import 'package:wink_manager/screens/admin_orders_screen.dart';
import 'package:wink_manager/screens/admin_reports_screen.dart';
import 'package:wink_manager/screens/admin_order_edit_screen.dart';

class MainNavigationScreen extends StatefulWidget {
  const MainNavigationScreen({super.key});

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  int _selectedIndex = 0;

  static const List<Widget> _widgetOptions = <Widget>[
    AdminOrdersScreen(),
    AdminHubScreen(),
    AdminReportsScreen(),
    AdminChatListScreen(),
  ];

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }

  void _navigateToAddOrder() {
     Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => const AdminOrderEditScreen(order: null), 
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _selectedIndex,
        children: _widgetOptions,
      ),
      
      floatingActionButton: FloatingActionButton(
        onPressed: _navigateToAddOrder,
        elevation: 4.0,
        shape: const CircleBorder(), 
        child: const Icon(Icons.add, size: 30),
      ),
      
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      
      bottomNavigationBar: BottomAppBar(
        shape: const CircularNotchedRectangle(), 
        notchMargin: 8.0, 
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: <Widget>[
            _buildNavItem(icon: Icons.list_alt, label: 'Commandes', index: 0),
            _buildNavItem(icon: Icons.warehouse, label: 'Logistique', index: 1),
            const SizedBox(width: 48), // Espace mort
            _buildNavItem(icon: Icons.bar_chart, label: 'Rapports', index: 2),
            _buildNavItem(icon: Icons.chat_bubble, label: 'Suivis', index: 3),
          ],
        ),
      ),
    );
  }

  // Widget pour un élément de navigation (stylé)
  Widget _buildNavItem({required IconData icon, required String label, required int index}) {
    final bool isSelected = _selectedIndex == index;
    final Color color = isSelected ? Theme.of(context).primaryColor : Colors.grey[600]!;
    
    return Expanded(
      child: InkWell(
        onTap: () => _onItemTapped(index),
        splashColor: Colors.transparent,
        highlightColor: Colors.transparent,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 8.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              Icon(icon, color: color, size: isSelected ? 26 : 24),
              const SizedBox(height: 4),
              Text(
                label,
                style: TextStyle(
                  color: color, 
                  fontSize: 10, 
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }
}