// lib/services/sync_service.dart

import 'dart:convert'; // <-- AJOUTÉ
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart' as p;
import 'package:connectivity_plus/connectivity_plus.dart';

import '../models/sync_request.dart';
import 'notification_service.dart'; // <-- Import décommenté et utilisé

class SyncService extends ChangeNotifier {
  static const String _dbName = 'wink_sync_db.db';
  static const String _tableName = 'sync_requests';
  Database? _database;
  final Dio _dio;
  final NotificationService _notificationService; // <-- Ajouté

  // Constructeur mis à jour
  SyncService(this._dio, this._notificationService);

  // --- Initialisation de la Base de Données ---

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDB();
    return _database!;
  }

  Future<Database> _initDB() async {
    final dbPath = await getDatabasesPath();
    final path = p.join(dbPath, _dbName);

    return await openDatabase(
      path,
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE $_tableName(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url TEXT,
            method TEXT,
            payload TEXT,
            token TEXT
          )
        ''');
      },
    );
  }

  // --- Opérations CRUD ---

  Future<void> addRequest(SyncRequest request) async {
    final db = await database;
    await db.insert(_tableName, request.toMap(), conflictAlgorithm: ConflictAlgorithm.replace);
    debugPrint('Sync: Requête ajoutée à la file: ${request.url}');
  }

  Future<List<SyncRequest>> getAllRequests() async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query(_tableName);
    return List.generate(maps.length, (i) => SyncRequest.fromMap(maps[i]));
  }

  Future<void> deleteRequest(int id) async {
    final db = await database;
    await db.delete(_tableName, where: 'id = ?', whereArgs: [id]);
  }

  // --- Logique de Synchronisation ---

  void initializeConnectivityListener() {
    Connectivity().onConnectivityChanged.listen((ConnectivityResult result) {
      if (result != ConnectivityResult.none) {
        debugPrint('Sync: Connexion rétablie. Tentative de synchronisation...');
        _replayFailedRequests();
      }
    });
    Connectivity().checkConnectivity().then((result) {
      if (result != ConnectivityResult.none) {
        _replayFailedRequests();
      }
    });
  }

  Future<void> _replayFailedRequests() async {
    final requests = await getAllRequests();
    if (requests.isEmpty) {
      debugPrint('Sync: Aucune requête en attente.');
      return;
    }

    debugPrint('Sync: Début du rejeu de ${requests.length} requêtes...');
    int successCount = 0;

    for (final request in requests) {
      bool isSuccessful = await _replaySingleRequest(request);
      if (isSuccessful) {
        successCount++;
        if (request.id != null) {
          await deleteRequest(request.id!);
        } else {
           debugPrint('Sync: Avertissement - Requête sans ID traitée : ${request.url}');
        }
      }
    }

    if (successCount > 0) {
      debugPrint('Sync: $successCount requête(s) rejouée(s) avec succès.');
      // FONCTIONNALITÉ AJOUTÉE : Afficher une notification de succès
      _notificationService.showNotification(
        99, // ID unique pour cette notification
        'Synchronisation Terminée',
        '$successCount action(s) en attente ont été synchronisée(s).',
      );
    }
  }

  Future<bool> _replaySingleRequest(SyncRequest request) async {
    try {
      final headers = Options(headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ${request.token}',
      });

      // CORRIGÉ : Utilisation de jsonDecode
      final dynamic requestData = (request.method == 'POST' || request.method == 'PUT' || request.method == 'PATCH')
          ? jsonDecode(request.payload)
          : null;


      final response = await _dio.request(
        request.url,
        data: requestData,
        options: headers.copyWith(method: request.method),
      );

      if (response.statusCode != null && response.statusCode! >= 200 && response.statusCode! < 300) {
        debugPrint('Sync: Requête réussie: ${request.url}');
        return true;
      }
      
      debugPrint('Sync: Échec (statut non-2xx) ${request.url}: ${response.statusCode}');
      return false;

    } on DioException catch (e) {
      debugPrint('Sync: Échec du rejeu ${request.url}: ${e.response?.statusCode}');

      if (e.response?.statusCode != null &&
          e.response!.statusCode! >= 400 &&
          e.response!.statusCode! < 500 &&
          e.response!.statusCode! != 401 &&
          e.response!.statusCode! != 403) {
         debugPrint('Sync: Supprimé car erreur client irrécupérable.');
         if (request.id != null) {
            await deleteRequest(request.id!);
         }
         return true; // Considéré comme "traité"
      }
      return false;
    } catch (e) {
      debugPrint('Sync: Erreur inattendue lors du rejeu: $e');
      return false;
    }
  }

  @override
  void dispose() {
    _database?.close();
    super.dispose();
  }
}