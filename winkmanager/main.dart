import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/date_symbol_data_local.dart'; // Import pour la localisation
import 'package:wink_manager/screens/login_screen.dart';
import 'package:wink_manager/screens/main_navigation_screen.dart';
import 'package:wink_manager/providers/order_provider.dart';
import 'package:wink_manager/services/auth_service.dart';
import 'package:wink_manager/utils/app_theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Initialiser la localisation pour les dates (ex: "dd MMM yyyy")
  await initializeDateFormatting('fr_FR', null); 
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        // 1. Fournir AuthService à la racine
        ChangeNotifierProvider(create: (_) => AuthService()),
        
        // 2. CORRECTION: Le ProxyProvider écoute AuthService
        ChangeNotifierProxyProvider<AuthService, OrderProvider>(
          // 'create' ne doit pas dépendre d'AuthService.
          // Il crée un provider initial vide.
          create: (_) => OrderProvider(AuthService()), 
          
          // 'update' REÇOIT le 'auth' (connecté ou non) et 
          // RECONSTRUIT OrderProvider avec LE BON AuthService.
          update: (_, auth, previousProvider) {
            // Si 'auth' est authentifié, OrderProvider utilisera le bon 'dio'
            return OrderProvider(auth); 
          },
        ),
      ],
      child: Consumer<AuthService>(
        builder: (context, authService, _) {
          return MaterialApp(
            title: 'Wink Manager',
            theme: AppTheme.lightTheme,
            debugShowCheckedModeBanner: false,
            
            home: authService.isAuthenticated
                ? const MainNavigationScreen()
                : const LoginScreen(),
            
            // Gestion des routes au cas où
            routes: {
              '/login': (context) => const LoginScreen(),
              '/home': (context) => const MainNavigationScreen(),
            },
          );
        },
      ),
    );
  }
}