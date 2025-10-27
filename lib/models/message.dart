// lib/models/message.dart
import 'package:flutter/foundation.dart'; // Pour kDebugMode

class Message {
  final int id;
  final int orderId;
  final int userId;
  final String userName;
  final String content;
  final String messageType; // 'user' or 'system'
  final DateTime createdAt;
  final bool isSentByMe; // Dérivé côté client

  Message({
    required this.id,
    required this.orderId,
    required this.userId,
    required this.userName,
    required this.content,
    required this.messageType,
    required this.createdAt,
    required this.isSentByMe,
  });

  factory Message.fromJson(Map<String, dynamic> json, int currentUserId) {
     // Gestion robuste des types et valeurs null
     int parsedId = 0;
     try {
       parsedId = (json['id'] as num?)?.toInt() ?? 0;
     } catch (e) {
        if (kDebugMode) {
          print("Erreur parsing message ID: $e, Data: ${json['id']}");
        }
     }

     DateTime parsedDate;
     try {
        parsedDate = DateTime.parse(json['created_at'] as String? ?? DateTime.now().toIso8601String());
     } catch(e) {
       if (kDebugMode) {
         print("Erreur parsing message date: $e, Data: ${json['created_at']}");
       }
        parsedDate = DateTime.now();
     }

     return Message(
       id: parsedId,
       orderId: (json['order_id'] as num?)?.toInt() ?? 0,
       userId: (json['user_id'] as num?)?.toInt() ?? 0,
       userName: json['user_name'] as String? ?? 'Inconnu',
       content: json['message_content'] as String? ?? '',
       messageType: json['message_type'] as String? ?? 'user',
       createdAt: parsedDate,
       isSentByMe: ((json['user_id'] as num?)?.toInt() ?? -1) == currentUserId,
     );
   }
}