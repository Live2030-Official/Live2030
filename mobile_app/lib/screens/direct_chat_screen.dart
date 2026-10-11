import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../theme/app_theme.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../widgets/user_avatar_with_frame.dart';
import '../localization/app_locale_service.dart';

class DirectChatScreen extends StatefulWidget {
  final Map<String, dynamic> targetUser;

  const DirectChatScreen({
    super.key,
    required this.targetUser,
  });

  @override
  State<DirectChatScreen> createState() => _DirectChatScreenState();
}

class _DirectChatScreenState extends State<DirectChatScreen> {
  final TextEditingController _msgController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final ImagePicker _picker = ImagePicker();

  List<Map<String, dynamic>> _messages = [];
  bool _isLoading = true;
  bool _isSending = false;
  io.Socket? _socket;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadMessages();
    _initSocket();
  }

  @override
  void dispose() {
    _msgController.dispose();
    _scrollController.dispose();
    _socket?.disconnect();
    super.dispose();
  }

  void _initSocket() {
    final currentUserId = AuthService().currentUser?.id;
    if (currentUserId == null) return;

    try {
      _socket = io.io(
        '${ApiService.baseUrl}/live',
        io.OptionBuilder()
            .setTransports(['websocket', 'polling'])
            .enableAutoConnect()
            .build(),
      );

      _socket?.onConnect((_) {
        _socket?.emit('chat:join', {'userId': currentUserId});
      });

      _socket?.on('chat:direct', (data) {
        if (data is Map && mounted) {
          final sId = data['senderId']?.toString();
          final rId = data['receiverId']?.toString();
          final targetId = widget.targetUser['id']?.toString();

          if ((sId == targetId && rId == currentUserId) ||
              (sId == currentUserId && rId == targetId)) {
            final incoming = Map<String, dynamic>.from(data);
            final id = incoming['id']?.toString();
            if (id != null && _messages.any((m) => m['id']?.toString() == id)) {
              return;
            }
            setState(() {
              _messages.add(incoming);
            });
            _scrollToBottom();
          }
        }
      });
    } catch (e) {
      debugPrint('Error initializing direct chat socket: $e');
    }
  }

  Future<void> _loadMessages() async {
    final currentUserId = AuthService().currentUser?.id;
    final targetId = widget.targetUser['id']?.toString();

    if (currentUserId == null || targetId == null) {
      setState(() => _isLoading = false);
      return;
    }

    final res = await ApiService().getDirectMessages(currentUserId, targetId);
    if (mounted) {
      setState(() {
        _messages = res;
        _isLoading = false;
      });
      _scrollToBottom();
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage({String? imageUrl}) async {
    final text = _msgController.text.trim();
    if (text.isEmpty && (imageUrl == null || imageUrl.isEmpty)) return;

    final currentUserId = AuthService().currentUser?.id;
    final targetId = widget.targetUser['id']?.toString();
    if (currentUserId == null || targetId == null) return;

    setState(() {
      _isSending = true;
      _errorMessage = null;
    });

    final pendingContent = text;
    _msgController.clear();

    try {
      final res = await ApiService().sendDirectMessage(
        senderId: currentUserId,
        receiverId: targetId,
        content: pendingContent,
        imageUrl: imageUrl,
      );

      if (res != null && mounted) {
        setState(() {
          final id = res['id']?.toString();
          if (id == null || !_messages.any((m) => m['id']?.toString() == id)) {
            _messages.add(res);
          }
        });
        _scrollToBottom();
      }
    } catch (e) {
      final errStr = e.toString();
      String userFriendly = 'Failed to send message. Please try again.'.tr;

      if (errStr.contains('strangers') || errStr.contains('rejectStrangerMessages')) {
        userFriendly = 'This user has disabled messages from strangers. You must follow them first.'.tr;
      }

      if (mounted) {
        setState(() {
          _errorMessage = userFriendly;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(userFriendly),
            backgroundColor: Colors.redAccent,
            duration: const Duration(seconds: 4),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSending = false);
      }
    }
  }

  Future<void> _pickAndSendPhoto() async {
    try {
      final picked = await _picker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 85,
      );
      if (picked == null) return;

      setState(() => _isSending = true);

      final uploadRes = await ApiService().uploadPostMedia(picked.path, isVideo: false);
      if (uploadRes != null && uploadRes['url'] != null) {
        final photoUrl = uploadRes['url'] as String;
        await _sendMessage(imageUrl: photoUrl);
      } else {
        throw Exception('Failed to upload image');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${'Error sending image:'.tr} $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSending = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final targetName = widget.targetUser['displayName'] ?? widget.targetUser['username'] ?? 'User';
    final targetAvatar = widget.targetUser['avatarUrl'];
    final targetVip = widget.targetUser['vipLevel'] as int? ?? 0;
    final targetCustomId = widget.targetUser['customId']?.toString();
    final currentUserId = AuthService().currentUser?.id;

    return Scaffold(
      backgroundColor: LiveColors.background,
      appBar: AppBar(
        backgroundColor: LiveColors.backgroundSurface,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        titleSpacing: 0,
        title: Row(
          children: [
            UserAvatarWithFrame(
              avatarUrl: targetAvatar,
              vipLevel: targetVip,
              size: 38,
              showBadge: true,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          targetName,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.plusJakartaSans(
                            color: Colors.white,
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      if (targetVip >= 1) ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(colors: [Color(0xFF2563EB), Color(0xFF1D4ED8)]),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: Colors.white, width: 0.8),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.star, color: Colors.yellow, size: 9),
                              const SizedBox(width: 2),
                              Text(
                                'VIP $targetVip',
                                style: const TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.w900),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                  if (targetCustomId != null && targetCustomId.isNotEmpty)
                    Text(
                      'ID: $targetCustomId',
                      style: GoogleFonts.firaCode(
                        color: LiveColors.accentPink,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                      ),
                    )
                  else
                    Text(
                      '@${widget.targetUser['username'] ?? 'user'}',
                      style: GoogleFonts.plusJakartaSans(
                        color: LiveColors.textSecondary,
                        fontSize: 11,
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            if (_errorMessage != null)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                color: Colors.red.withValues(alpha: 0.2),
                child: Row(
                  children: [
                    const Icon(Icons.shield_outlined, color: Colors.redAccent, size: 16),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _errorMessage!,
                        style: GoogleFonts.plusJakartaSans(color: Colors.redAccent, fontSize: 12),
                      ),
                    ),
                  ],
                ),
              ),

            // Messages List
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator(color: LiveColors.accentPink))
                  : _messages.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                width: 70,
                                height: 70,
                                decoration: BoxDecoration(
                                  color: LiveColors.backgroundElevated,
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.chat_bubble_outline_rounded, color: LiveColors.textSecondary, size: 34),
                              ),
                              const SizedBox(height: 12),
                              Text(
                                'No messages yet'.tr,
                                style: GoogleFonts.plusJakartaSans(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Say hello to start the conversation!'.tr,
                                style: GoogleFonts.plusJakartaSans(color: LiveColors.textSecondary, fontSize: 13),
                              ),
                            ],
                          ),
                        )
                      : ListView.builder(
                          controller: _scrollController,
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          itemCount: _messages.length,
                          itemBuilder: (context, index) {
                            final msg = _messages[index];
                            final isMe = msg['senderId'] == currentUserId;
                            final content = msg['content']?.toString() ?? '';
                            final imageUrl = msg['imageUrl']?.toString();

                            return Align(
                              alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                              child: Container(
                                margin: const EdgeInsets.only(bottom: 8),
                                constraints: BoxConstraints(
                                  maxWidth: MediaQuery.of(context).size.width * 0.75,
                                ),
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  gradient: isMe ? LiveColors.primaryGradient : null,
                                  color: isMe ? null : LiveColors.backgroundElevated,
                                  borderRadius: BorderRadius.only(
                                    topLeft: const Radius.circular(16),
                                    topRight: const Radius.circular(16),
                                    bottomLeft: Radius.circular(isMe ? 16 : 4),
                                    bottomRight: Radius.circular(isMe ? 4 : 16),
                                  ),
                                  border: Border.all(
                                    color: isMe ? Colors.transparent : LiveColors.borderSubtle,
                                  ),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withValues(alpha: 0.15),
                                      blurRadius: 4,
                                      offset: const Offset(0, 2),
                                    ),
                                  ],
                                ),
                                child: Column(
                                  crossAxisAlignment: isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                                  children: [
                                    if (imageUrl != null && imageUrl.isNotEmpty) ...[
                                      ClipRRect(
                                        borderRadius: BorderRadius.circular(12),
                                        child: Image.network(
                                          ApiService.getFullImageUrl(imageUrl),
                                          fit: BoxFit.cover,
                                          errorBuilder: (_, __, ___) => const Icon(Icons.broken_image, color: Colors.white),
                                        ),
                                      ),
                                      if (content.isNotEmpty) const SizedBox(height: 6),
                                    ],
                                    if (content.isNotEmpty)
                                      Text(
                                        content,
                                        style: GoogleFonts.plusJakartaSans(
                                          color: Colors.white,
                                          fontSize: 14,
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
            ),

            // Bottom Input Bar
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              decoration: BoxDecoration(
                color: LiveColors.backgroundSurface,
                border: Border(top: BorderSide(color: LiveColors.borderSubtle)),
              ),
              child: Row(
                children: [
                  IconButton(
                    onPressed: _isSending ? null : _pickAndSendPhoto,
                    icon: const Icon(Icons.photo_camera_back_rounded, color: LiveColors.accentPink),
                    tooltip: 'Send Photo'.tr,
                  ),
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      decoration: BoxDecoration(
                        color: LiveColors.backgroundInput,
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(color: LiveColors.borderSubtle),
                      ),
                      child: TextField(
                        controller: _msgController,
                        style: GoogleFonts.plusJakartaSans(color: Colors.white, fontSize: 14),
                        decoration: InputDecoration(
                          hintText: 'Type a message...'.tr,
                          hintStyle: GoogleFonts.plusJakartaSans(color: LiveColors.textMuted, fontSize: 14),
                          border: InputBorder.none,
                          contentPadding: const EdgeInsets.symmetric(vertical: 10),
                        ),
                        onSubmitted: (_) => _sendMessage(),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    decoration: const BoxDecoration(
                      gradient: LiveColors.primaryGradient,
                      shape: BoxShape.circle,
                    ),
                    child: IconButton(
                      onPressed: _isSending ? null : () => _sendMessage(),
                      icon: _isSending
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : const Icon(Icons.send_rounded, color: Colors.white, size: 20),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
