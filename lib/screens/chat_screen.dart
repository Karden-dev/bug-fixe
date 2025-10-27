// lib/screens/chat_screen.dart

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart'; // Import nécessaire pour Provider

import '../models/order.dart';
// import '../models/user.dart'; // Importation supprimée car inutilisée
import '../models/message.dart'; // Import du modèle Message
import '../services/websocket_service.dart'; // Import du WebSocketService
import '../services/auth_service.dart'; // Import pour obtenir l'utilisateur
import '../utils/app_theme.dart';

class ChatScreen extends StatefulWidget {
  final Order order;

  const ChatScreen({super.key, required this.order});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  List<Message> _messages = []; // Liste pour stocker les messages chargés
  List<String> _quickReplies = []; // Liste pour les messages rapides
  bool _isLoadingMessages = true;
  bool _isLoadingQuickReplies = true;
  String? _errorMessage;
  int? _currentUserId; // Pour déterminer si un message est envoyé ou reçu

  WebSocketService? _webSocketService;
  StreamSubscription? _messageSubscription;

  @override
  void initState() {
    super.initState();
    // Obtenir l'ID de l'utilisateur courant
    _currentUserId = Provider.of<AuthService>(context, listen: false).currentUser?.id;

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _webSocketService = Provider.of<WebSocketService?>(context, listen: false);
      if (_webSocketService == null || _currentUserId == null) {
        if(mounted){ // Vérification mounted
          setState(() {
            _isLoadingMessages = false;
            _errorMessage = "Service de communication indisponible.";
          });
        }
        return;
      }
      // Rejoindre la conversation
      _webSocketService!.joinConversation(widget.order.id);
      // Charger les messages initiaux et les réponses rapides
      _loadInitialMessages();
      _loadQuickReplies();
      // Écouter les nouveaux messages
      _messageSubscription = _webSocketService!.messagesStream.listen(_handleNewMessage);
    });
  }

  // Gérer les nouveaux messages entrants du WebSocket
  void _handleNewMessage(Map<String, dynamic> messageData) {
    if (messageData['type'] == 'NEW_MESSAGE' && messageData['payload'] != null) {
      final payload = messageData['payload'] as Map<String, dynamic>;
      // Vérifier si le message concerne bien cette commande
      if (payload['order_id'] == widget.order.id && _currentUserId != null) {
        final newMessage = Message.fromJson(payload, _currentUserId!);
        // Éviter les doublons si le message a déjà été ajouté de manière optimiste
        if (!_messages.any((m) => m.id == newMessage.id)) {
           if (mounted) {
             setState(() {
               _messages.add(newMessage);
               _messages.sort((a, b) => a.createdAt.compareTo(b.createdAt)); // S'assurer de l'ordre
             });
             // Marquer comme lu si la fenêtre est visible
              _markAsReadIfNeeded(newMessage.id);
             WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToBottom());
           }
        }
      }
    } else if (messageData['type'] == 'ERROR') {
       _showErrorSnackbar(messageData['message'] as String? ?? 'Erreur WebSocket');
    }
  }

  // Marquer les messages comme lus (appelé après réception ou affichage)
  Future<void> _markAsReadIfNeeded(int lastMessageId) async {
    // Vérifie si la fenêtre est visible et si le service est dispo
    if (mounted && _webSocketService != null && _currentUserId != null) {
      try {
        await _webSocketService!.fetchMessages(widget.order.id, lastMessageId: lastMessageId);
        // La requête GET avec triggerRead marque comme lu côté serveur
      } catch (e) {
        debugPrint("Erreur lors du marquage comme lu: $e");
        // Gérer l'erreur discrètement, l'essentiel est l'affichage
      }
    }
  }


  // Charger les messages initiaux
  Future<void> _loadInitialMessages() async {
    if (_webSocketService == null || _currentUserId == null) return;
    if (mounted) { // Vérification mounted
      setState(() {
        _isLoadingMessages = true;
        _errorMessage = null;
      });
    }
    try {
      final messagesData = await _webSocketService!.fetchMessages(widget.order.id);
      if (mounted) {
        setState(() {
          _messages = messagesData.map((m) => Message.fromJson(m, _currentUserId!)).toList();
          _isLoadingMessages = false;
          // Marquer le dernier message comme lu après le chargement initial
          if (_messages.isNotEmpty) {
            _markAsReadIfNeeded(_messages.last.id);
          }
        });
        WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToBottom());
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString().replaceFirst('Exception: ', '');
          _isLoadingMessages = false;
        });
      }
    }
  }

  // Charger les réponses rapides
  Future<void> _loadQuickReplies() async {
    if (_webSocketService == null) return;
    if (mounted) { // Vérification mounted
      setState(() { _isLoadingQuickReplies = true; });
    }
    try {
      final replies = await _webSocketService!.fetchQuickReplies();
      if (mounted) {
        setState(() {
          _quickReplies = replies;
          _isLoadingQuickReplies = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() { _isLoadingQuickReplies = false; });
        _showErrorSnackbar('Erreur chargement réponses rapides.');
      }
    }
  }

  @override
  void dispose() {
    // Quitter la conversation
    _webSocketService?.leaveConversation(widget.order.id);
    _messageSubscription?.cancel(); // Annuler l'écoute du stream
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  // Fonction de défilement automatique
  void _scrollToBottom() {
    if (_scrollController.hasClients) {
       // Utilise un petit délai pour s'assurer que le layout est terminé
       Future.delayed(const Duration(milliseconds: 100), () {
          if (_scrollController.hasClients) {
             _scrollController.animateTo(
               _scrollController.position.maxScrollExtent,
               duration: const Duration(milliseconds: 300),
               curve: Curves.easeOut,
             );
          }
       });
    }
  }

  // Envoyer un message via WebSocketService
  Future<void> _sendMessage() async {
    final text = _messageController.text.trim();
    if (text.isEmpty || _webSocketService == null) return;

    _messageController.clear(); // Vider le champ immédiatement

    try {
      // Appel API pour envoyer le message (le serveur s'occupe de la diffusion WS)
      await _webSocketService!.sendMessage(widget.order.id, text);
      // Le message apparaîtra via le StreamSubscription _handleNewMessage
      WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToBottom()); // Assure le scroll après envoi
    } catch (e) {
      _showErrorSnackbar('Erreur d\'envoi: ${e.toString().replaceFirst("Exception: ","")}');
    }
  }

  // Ajouter un message rapide au champ texte
  void _addQuickReply(String reply) {
    _messageController.text = _messageController.text.isEmpty ? reply : '${_messageController.text} $reply';
    _messageController.selection = TextSelection.fromPosition(TextPosition(offset: _messageController.text.length));
  }

  // Fonction pour afficher la demande de modification
  void _requestModification() {
    // CORRECTION: Utilisation de const pour la variable locale
    const prefix = "Demande de modification : ";
    const detailedMessage = "$prefix Veuillez préciser ici l'erreur (client, adresse, articles, montant...).";

    _messageController.text = detailedMessage;
    _messageController.selection = TextSelection.fromPosition(const TextPosition(offset: prefix.length));

    _showInfoSnackbar('Précisez la modification et envoyez.');
  }

  // --- Fonctions pour afficher les Snackbars ---
  void _showErrorSnackbar(String message) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(message), backgroundColor: AppTheme.danger),
      );
    }
  }

  void _showInfoSnackbar(String message) {
     if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        // CORRECTION: Ajout de const
        const SnackBar(content: Text('Précisez la modification et envoyez.'), duration: Duration(seconds: 3)),
      );
    }
  }


  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Chat - CDE #${widget.order.id}'),
        actions: [
          TextButton.icon(
            onPressed: _requestModification,
            icon: const Icon(Icons.edit_note, color: Colors.white),
            label: const Text('Demander Modif.', style: TextStyle(color: Colors.white)),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Column(
        children: [
          // --- Zone de Messages ---
          Expanded(
            child: _isLoadingMessages
                ? const Center(child: CircularProgressIndicator())
                : _errorMessage != null
                    ? Center(child: Text(_errorMessage!, style: const TextStyle(color: AppTheme.danger)))
                    : _messages.isEmpty
                        ? const Center(child: Text('Aucun message dans cette conversation.', style: TextStyle(color: Colors.grey)))
                        : ListView.builder(
                            controller: _scrollController,
                            padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 8.0),
                            itemCount: _messages.length,
                            itemBuilder: (context, index) {
                              final message = _messages[index];
                              return _buildMessageBubble(context, message);
                            },
                          ),
          ),

          // --- Messages Rapides ---
          _buildQuickReplyArea(),

          // --- Zone de Saisie ---
          _buildInputArea(),
        ],
      ),
    );
  }

  // Widget pour une bulle de message (Adapté pour le modèle Message)
  Widget _buildMessageBubble(BuildContext context, Message message) {
    final isSent = message.isSentByMe;
    final isSystem = message.messageType == 'system';

    // Style spécifique pour les messages système
    if (isSystem) {
      return Container(
        alignment: Alignment.center,
        margin: const EdgeInsets.symmetric(vertical: 6, horizontal: 16),
        padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
        decoration: BoxDecoration(
          color: AppTheme.accentColor.withAlpha(30), // Couleur système
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          message.content,
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 11,
            fontStyle: FontStyle.italic,
            color: AppTheme.accentColor.withAlpha(200),
          ),
        ),
      );
    }

    // Bulles normales pour utilisateur
    return Align(
      alignment: isSent ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
        decoration: BoxDecoration(
          color: isSent ? AppTheme.primaryColor.withAlpha(230) : Colors.white, // Légère transparence pour le corail
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(15),
            topRight: const Radius.circular(15),
            bottomLeft: Radius.circular(isSent ? 15 : 5),
            bottomRight: Radius.circular(isSent ? 5 : 15),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.08),
              blurRadius: 2,
              offset: const Offset(0, 1),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: isSent ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            // Afficher le nom de l'expéditeur si ce n'est pas moi
            if (!isSent)
              Padding(
                padding: const EdgeInsets.only(bottom: 2.0),
                child: Text(
                  message.userName,
                  style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.primaryColor,
                  ),
                ),
              ),
            Text(
              message.content,
              style: TextStyle(
                color: isSent ? Colors.white : AppTheme.secondaryColor,
              ),
            ),
            Padding(
              padding: const EdgeInsets.only(top: 4.0),
              child: Text(
                DateFormat('HH:mm').format(message.createdAt.toLocal()), // Afficher en heure locale
                style: TextStyle(
                  fontSize: 10,
                  // CORRECTION: Remplacer withOpacity déprécié
                  color: isSent ? Colors.white.withAlpha(178) : Colors.grey.shade600, // 178 est ~70% opacité
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Widget pour la zone des messages rapides
  Widget _buildQuickReplyArea() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 8.0, horizontal: 4.0),
      color: Theme.of(context).dividerColor.withAlpha(50),
      child: _isLoadingQuickReplies
          ? const SizedBox(height: 36, child: Center(child: SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)))) // Indicateur de chargement
          : _quickReplies.isEmpty
              ? const SizedBox(height: 36, child: Center(child: Text('...', style: TextStyle(color: Colors.grey)))) // Placeholder si vide
              : SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: _quickReplies.map((reply) => Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4.0),
                      child: ActionChip(
                        label: Text(reply, style: const TextStyle(fontSize: 12, color: AppTheme.secondaryColor)),
                        backgroundColor: Colors.white,
                        shape: StadiumBorder(side: BorderSide(color: Theme.of(context).dividerColor)),
                        onPressed: () => _addQuickReply(reply),
                      ),
                    )).toList(),
                  ),
                ),
    );
  }

  // Widget pour la zone de saisie
  Widget _buildInputArea() {
    return Container(
      padding: const EdgeInsets.all(8.0),
      color: Theme.of(context).dividerColor.withAlpha(50),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _messageController,
              minLines: 1,
              maxLines: 4, // Permet l'expansion sur plusieurs lignes
              keyboardType: TextInputType.multiline,
              textCapitalization: TextCapitalization.sentences,
              decoration: InputDecoration(
                hintText: 'Écrire un message...',
                filled: true,
                fillColor: Colors.white,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(25.0),
                  borderSide: BorderSide.none, // Pas de bordure visible
                ),
                 focusedBorder: OutlineInputBorder( // Garde le même style au focus
                  borderRadius: BorderRadius.circular(25.0),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),
          // Bouton d'envoi
          FloatingActionButton(
            onPressed: _sendMessage,
            mini: true, // Bouton plus petit
            backgroundColor: AppTheme.primaryColor,
            elevation: 0, // Pas d'ombre
            child: const Icon(Icons.send, color: Colors.white, size: 20), // Taille icône ajustée
          ),
        ],
      ),
    );
  }
}