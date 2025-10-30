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

  // Liste statique des écrans de navigation
  static const List<Widget> _widgetOptions = <Widget>[
    AdminOrdersScreen(), // Index 0: Commandes
    AdminHubScreen(),     // Index 1: Logistique (Hub)
    AdminReportsScreen(), // Index 2: Rapports
    AdminChatListScreen(),// Index 3: Suivis (Chat)
  ];

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }

  void _navigateToAddOrder() {
     Navigator.push(
      context,
      // Utilisation d'un MaterialPageRoute simple, comme dans l'implémentation précédente.
      MaterialPageRoute(
        builder: (_) => const AdminOrderEditScreen(order: null), 
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Note technique: L'utilisation de Scaffold.extendBody est cruciale pour 
    // que le FloatingActionButtonLocation.centerDocked fonctionne correctement 
    // et que le corps de l'application s'étende derrière la barre de navigation.
    return Scaffold(
      extendBody: true, 
      
      body: IndexedStack(
        index: _selectedIndex,
        children: _widgetOptions,
      ),
      
      // Floating Action Button pour l'ajout de commande (fonctionnalité conservée)
      floatingActionButton: FloatingActionButton(
        onPressed: _navigateToAddOrder,
        // Utilisation du style Material 3
        elevation: 3.0,
        shape: const CircleBorder(), 
        child: const Icon(Icons.add_rounded, size: 30),
      ),
      
      // Ancrage du FAB entre les éléments de la barre de navigation
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      
      // Remplacement de BottomAppBar par le widget moderne NavigationBar (Material 3)
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: _onItemTapped,
        // Paramètres visuels pour un look Material 3 épuré
        height: 65, 
        elevation: 4, // Légère ombre pour le détacher du corps
        indicatorColor: Theme.of(context).colorScheme.primary.withOpacity(0.1),

        destinations: const <NavigationDestination>[
          NavigationDestination(
            icon: Icon(Icons.list_alt_outlined),
            selectedIcon: Icon(Icons.list_alt_rounded),
            label: 'Commandes',
          ),
          NavigationDestination(
            icon: Icon(Icons.warehouse_outlined),
            selectedIcon: Icon(Icons.warehouse_rounded),
            label: 'Logistique',
          ),
          // Un élément vide pour l'encoche du FloatingActionButton. 
          // Note : La NavigationBar gère automatiquement l'espacement pour les 
          // FABs dockés, mais avoir un 5ème élément au milieu avec un label vide 
          // ou une meilleure gestion pourrait être envisagé pour 5 onglets.
          // Ici, on revient au design 4 onglets en comptant sur centerDocked.
          // Le NavigationBar n'utilise pas l'encoche de CircularNotchedRectangle.
          // Pour un FAB docké, il faut que le nombre d'items soit gérable.

          // *Correction de la Navigation:* J'utilise ici un `NavigationBar` sans 
          // l'encoche classique du `BottomAppBar` + `CircularNotchedRectangle`. 
          // Pour un design moderne et pour corriger le bug d'overflow, il est 
          // préférable de laisser la `NavigationBar` gérer son propre padding. 
          // Je conserve les 4 destinations initiales, la `floatingActionButtonLocation.centerDocked` 
          // placera le FAB au-dessus de la zone centrale.
          NavigationDestination(
            icon: Icon(Icons.bar_chart_outlined),
            selectedIcon: Icon(Icons.bar_chart_rounded),
            label: 'Rapports',
          ),
          NavigationDestination(
            icon: Icon(Icons.chat_bubble_outline_rounded),
            selectedIcon: Icon(Icons.chat_bubble_rounded),
            label: 'Suivis',
          ),
        ],
      ),
    );
  }
}