import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:wink_manager/providers/order_provider.dart'; 
import 'package:wink_manager/screens/login_screen.dart';
import 'package:wink_manager/screens/main_navigation_screen.dart';
import 'package:wink_manager/services/auth_service.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const WinkManagerApp());
}

class WinkManagerApp extends StatelessWidget {
  const WinkManagerApp({super.key});

  @override
  Widget build(BuildContext context) {
    // Définition des couleurs de l'application (basées sur votre CSS)
    const Color colorPrimary = Color(0xFFFF7F50); // Corail
    const Color colorSecondary = Color(0xFF2C3E50); // Bleu Profond
    const Color colorBackground = Color(0xFFF8F9FA); // Fond
    // const Color colorText = Color(0xFF34495E); // CORRECTION: Variable non utilisée, supprimée.

    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (context) => AuthService()),
        ChangeNotifierProxyProvider<AuthService, OrderProvider>(
          create: (context) => OrderProvider(Provider.of<AuthService>(context, listen: false)),
          update: (context, authService, previousProvider) => OrderProvider(authService),
        ),
      ],
      child: MaterialApp(
        title: 'WINK MANAGER',
        theme: ThemeData(
           primaryColor: colorPrimary,
           scaffoldBackgroundColor: colorBackground,
           
           appBarTheme: const AppBarTheme(
             backgroundColor: colorSecondary,
             foregroundColor: Colors.white,
             elevation: 2,
             titleTextStyle: TextStyle(
              fontSize: 20, 
              fontWeight: FontWeight.bold,
              fontFamily: 'sans-serif', 
             ),
           ),

           floatingActionButtonTheme: const FloatingActionButtonThemeData(
             backgroundColor: colorPrimary,
             foregroundColor: Colors.white,
           ),

           // CORRECTION: BottomAppBarTheme -> BottomAppBarThemeData
           bottomAppBarTheme: const BottomAppBarThemeData(
             color: Colors.white,
             elevation: 8,
           ),

           // CORRECTION: CardTheme -> CardThemeData
           cardTheme: CardThemeData(
            elevation: 1,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
           ),

           elevatedButtonTheme: ElevatedButtonThemeData(
            style: ElevatedButton.styleFrom(
              backgroundColor: colorPrimary,
              foregroundColor: Colors.white,
            )
           ),
           textButtonTheme: TextButtonThemeData(
            style: TextButton.styleFrom(
              foregroundColor: colorPrimary,
            )
           ),
        ),
        debugShowCheckedModeBanner: false,
        home: const AuthWrapper(),
      ),
    );
  }
}

// L'AuthWrapper reste identique
class AuthWrapper extends StatefulWidget {
  const AuthWrapper({super.key});

  @override
  State<AuthWrapper> createState() => _AuthWrapperState();
}

class _AuthWrapperState extends State<AuthWrapper> {
  @override
  void initState() {
    super.initState();
    Provider.of<AuthService>(context, listen: false).tryAutoLogin();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthService>(
      builder: (context, authService, child) {
        if (authService.isLoading) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }

        if (authService.isAuthenticated && authService.user?.role == 'admin') {
          return const MainNavigationScreen();
        } 
        
        return const LoginScreen();
      },
    );
  }
}