import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:agora_rtc_engine/agora_rtc_engine.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../theme/app_theme.dart';
import '../services/agora_service.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../services/level_service.dart';
import '../widgets/user_avatar_with_frame.dart';
import '../widgets/topup_choice_dialog.dart';
import '../localization/app_locale_service.dart';
import '../localization/translation_service.dart';
import '../widgets/room_games_modal.dart';

class LiveRoomScreen extends StatefulWidget {
  final String channelName;
  final String token;
  final bool isHost;
  final String hostName;
  final String roomTitle;
  final String? hostAvatarUrl;
  final String? hostCustomId;
  final int? hostVipLevel;

  const LiveRoomScreen({
    super.key,
    required this.channelName,
    required this.token,
    required this.isHost,
    this.hostName = 'Live Host',
    this.roomTitle = 'Live Video Stream 📹',
    this.hostAvatarUrl,
    this.hostCustomId,
    this.hostVipLevel,
  });

  @override
  State<LiveRoomScreen> createState() => _LiveRoomScreenState();
}

class _HeartItem {
  final Key id;
  final double startX;
  final Color color;
  final double scale;

  _HeartItem({
    required this.id,
    required this.startX,
    required this.color,
    required this.scale,
  });
}

class _LiveRoomScreenState extends State<LiveRoomScreen> with TickerProviderStateMixin {
  late final AgoraLiveService _agoraService;
  io.Socket? _socket;
  int _viewerCount = 1;
  int? _remoteUid;
  bool _isJoined = false;
  int _totalDiamonds = 0;
  Map<String, dynamic>? _currentGiftAnimation;
  Map<String, dynamic>? _activeVipEntrance;

  // ⚔️ 1v1 PK Battle State
  bool _isPKActive = false;
  Map<String, dynamic>? _pkBattle;
  int _pkRemainingSeconds = 180;
  int _pkHost1Score = 0;
  int _pkHost2Score = 0;
  int _pkProgress = 50; // 0 - 100 percentage
  String _pkStatus = 'NONE'; // 'BATTLE', 'PUNISHMENT', 'NONE'
  String? _pkWinnerName;
  bool _pkIsDraw = false;

  // ⚔️ In-Room PK Viewer Invitation & Dynamic Co-Broadcasting State
  List<Map<String, dynamic>> _roomViewers = [];
  bool _isLoadingViewers = false;
  String? _invitingUserId;
  bool _isRivalBroadcaster = false;
  String _selectedPKGiftTarget = 'host1'; // 'host1' or 'host2'
  StateSetter? _sheetSetState;
  bool _canExitScreen = false;
  bool _isClosingRoom = false;
  ModalRoute? _currentRoomRoute;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _currentRoomRoute ??= ModalRoute.of(context);
  }

  void _closeRoomImmediately() {
    if (_isClosingRoom) return;
    _isClosingRoom = true;
    _canExitScreen = true;

    try {
      _agoraService.leave();
    } catch (_) {}

    if (!widget.isHost) {
      ApiService().leaveRoom(widget.channelName);
    }

    try {
      _socket?.emit('room:leave', {'roomId': widget.channelName});
      _socket?.disconnect();
      _socket?.dispose();
      _socket = null;
    } catch (_) {}

    if (!mounted) return;

    try {
      ScaffoldMessenger.of(context).clearSnackBars();
    } catch (_) {}

    final navigator = Navigator.of(context, rootNavigator: true);
    final roomRoute = _currentRoomRoute;
    if (roomRoute != null && roomRoute.isActive) {
      navigator.popUntil((route) => route == roomRoute || route.isFirst);
      if (mounted && roomRoute.isActive && navigator.canPop()) {
        navigator.pop();
      }
    } else {
      navigator.popUntil((route) => route.isFirst);
    }
  }

  final TextEditingController _chatController = TextEditingController();
  final ScrollController _chatScrollController = ScrollController();
  final List<Map<String, dynamic>> _messages = [];

  // Floating hearts
  final List<_HeartItem> _floatingHearts = [];
  final math.Random _random = math.Random();

  // Equalizer animation for visualizer
  late final AnimationController _equalizerController;

  @override
  void initState() {
    super.initState();
    _agoraService = AgoraLiveService();
    _equalizerController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat(reverse: true);

    _initLiveRoom();
    _initWebSocket();
  }

  Future<void> _initLiveRoom() async {
    try {
      // 1. Subscribe to events BEFORE joining channel so no initial events are lost
      _agoraService.onRemoteUserJoined.listen((uid) {
        if (mounted) {
          setState(() {
            _remoteUid = uid ?? (_agoraService.remoteUids.isNotEmpty ? _agoraService.remoteUids.first : null);
          });
        }
      });

      _agoraService.onChannelJoined.listen((joined) {
        if (mounted) {
          setState(() {
            _isJoined = joined;
          });
        }
      });

      _agoraService.onRemoteUserOffline.listen((offlineUid) {
        // Audience exits only when the last broadcaster (host) has left.
        if (mounted && !widget.isHost && _agoraService.remoteUids.isEmpty) {
          _closeRoomImmediately();
        }
      });

      _agoraService.onConnectionStateChanged.listen((state) {
        if (!mounted) return;
        if (state == ConnectionStateType.connectionStateReconnecting) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              backgroundColor: Colors.orangeAccent,
              duration: const Duration(seconds: 2),
              content: Text('Reconnecting to live stream…'.tr),
            ),
          );
        } else if (state == ConnectionStateType.connectionStateFailed) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              backgroundColor: Colors.redAccent,
              content: Text('Live connection lost.'.tr),
            ),
          );
          _closeRoomImmediately();
        }
      });

      // 2. Join the Agora live room
      await _agoraService.joinLiveRoom(
        channelName: widget.channelName,
        token: widget.token,
        isHost: widget.isHost,
      );

      // 3. Immediately catch any remote UID already cached during connection
      if (mounted) {
        final existingUid = _agoraService.remoteUid ??
            (_agoraService.remoteUids.isNotEmpty ? _agoraService.remoteUids.first : null);
        if (existingUid != null) {
          setState(() {
            _remoteUid = existingUid;
          });
        }
      }
    } catch (e) {
      debugPrint('Error joining Agora room: $e');
    }
  }

  void _initWebSocket() {
    try {
      final socketUrl = '${ApiService.baseUrl}/live';

      _socket = io.io(
        socketUrl,
        io.OptionBuilder()
            .setTransports(['websocket', 'polling'])
            .enableAutoConnect()
            .enableReconnection()
            .setReconnectionDelay(1500)
            .build(),
      );

      _socket!.connect();

      void sendJoin() {
        final currentUser = AuthService().currentUser;
        _socket!.emit('room:join', {
          'roomId': widget.channelName,
          'userId': widget.isHost
              ? (currentUser?.id ?? 'host')
              : (currentUser?.id ?? 'viewer_${DateTime.now().millisecondsSinceEpoch}'),
          'displayName': widget.isHost ? widget.hostName : (currentUser?.displayName ?? 'Viewer'),
          'avatarUrl': widget.isHost ? widget.hostAvatarUrl : currentUser?.avatarUrl,
          'customId': widget.isHost ? widget.hostCustomId : currentUser?.customId,
          'level': widget.isHost ? 35 : (currentUser?.level ?? 1),
          'frameUrl': LevelService().getFrameUrl(currentUser?.level ?? 1),
        });
      }

      _socket!.onConnect((_) {
        debugPrint('🔌 Connected to Live Signaling Server');
        sendJoin();
      });

      _socket!.on('room:global_marquee', (data) {
        if (mounted && data != null && data['message'] != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              backgroundColor: const Color(0xFF312E81),
              behavior: SnackBarBehavior.floating,
              duration: const Duration(seconds: 4),
              content: Row(
                children: [
                  const Icon(Icons.workspace_premium_rounded, color: Color(0xFFF59E0B), size: 22),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      data['message'].toString(),
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                    ),
                  ),
                ],
              ),
            ),
          );
        }
      });

      _socket!.on('room:vip_entrance', (data) {
        if (mounted && data != null) {
          final payload = Map<String, dynamic>.from(data);
          setState(() => _activeVipEntrance = payload);
          Future.delayed(const Duration(seconds: 6), () {
            if (mounted && _activeVipEntrance?['timestamp'] == payload['timestamp']) {
              setState(() => _activeVipEntrance = null);
            }
          });
        }
      });

      _socket!.on('reconnect', (_) {

      _socket!.on('room:viewer_count', (data) {
        if (mounted && data != null && data['viewerCount'] != null) {
          setState(() {
            _viewerCount = data['viewerCount'];
          });
        }
      });

      _socket!.on('chat:broadcast', (data) async {
        if (mounted && data != null) {
          final msgMap = Map<String, dynamic>.from(data);
          setState(() {
            _messages.add(msgMap);
          });
          _scrollToBottom();

          // Real-time dynamic auto-translation for in-room comments
          if (AppLocaleService().autoTranslateChatAndPosts) {
            final translatedMsg = await TranslationService().translateLiveMessage(msgMap);
            if (mounted && translatedMsg['isTranslated'] == true) {
              setState(() {});
            }
          }
        }
      });

      _socket!.on('chat:warning', (data) {
        if (mounted) {
          final msg = data != null && data['message'] != null
              ? data['message'].toString()
              : 'Your message contained prohibited language and has been flagged.';
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              backgroundColor: const Color(0xFFEF4444),
              behavior: SnackBarBehavior.floating,
              duration: const Duration(seconds: 4),
              content: Row(
                children: [
                  const Icon(Icons.warning_amber_rounded, color: Colors.white, size: 22),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      msg,
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                  ),
                ],
              ),
            ),
          );
        }
      });

      _socket!.on('gift:broadcast', (data) {
        if (mounted && data != null) {
          final giftData = Map<String, dynamic>.from(data);
          setState(() {
            _currentGiftAnimation = giftData;
            if (giftData['diamondsAwarded'] != null) {
              _totalDiamonds += (giftData['diamondsAwarded'] as num).toInt();
            }
          });
          Future.delayed(const Duration(milliseconds: 3500), () {
            if (mounted && _currentGiftAnimation?['id'] == giftData['id']) {
              setState(() {
                _currentGiftAnimation = null;
              });
            }
          });
        }
      });

      _socket!.on('wallet:balance_update', (data) {
        if (mounted && data != null) {
          AuthService().updateBalances(
            coins: data['coins'] as int?,
            diamonds: data['diamonds'] as int?,
          );
          setState(() {});
        }
      });

      _socket!.on('room:game_result', (data) {
        if (mounted && data != null) {
          final isWin = data['isWin'] == true;
          final winAmount = (data['winAmount'] as num?)?.toInt() ?? 0;
          final playerName = data['playerName'] ?? 'A player';
          final gameTitle = data['gameTitle'] ?? 'Mini Game';
          if (isWin && winAmount >= 100) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                backgroundColor: const Color(0xFF10B981),
                duration: const Duration(seconds: 3),
                content: Row(
                  children: [
                    const Icon(Icons.stars, color: Colors.amberAccent, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text('🎰 $playerName won $winAmount 🪙 in $gameTitle!'),
                    ),
                  ],
                ),
              ),
            );
          }
        }
      });

      // 👥 In-Room Viewers list response
      _socket!.on('room:viewers:data', (data) {
        if (mounted && data != null && data['viewers'] != null) {
          final List raw = data['viewers'] as List;
          _roomViewers = raw.map((v) => Map<String, dynamic>.from(v)).toList();
          _isLoadingViewers = false;
          _sheetSetState?.call(() {});
          setState(() {});
        }
      });

      // ⚔️ PK Invitation Received (Viewer challenge popup)
      _socket!.on('pk:invite:received', (data) {
        if (mounted && data != null) {
          _showPKChallengeDialog(Map<String, dynamic>.from(data));
        }
      });

      // ⚔️ PK Invitation Sent Confirmation
      _socket!.on('pk:invite:sent', (data) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              backgroundColor: Color(0xFF6366F1),
              content: Row(
                children: [
                  Icon(Icons.hourglass_top, color: Colors.white, size: 20),
                  SizedBox(width: 8),
                  Text('PK Invitation sent! Waiting for response...'.tr),
                ],
              ),
              duration: Duration(seconds: 4),
            ),
          );
        }
      });

      // ⚔️ PK Invitation Declined
      _socket!.on('pk:invite:declined', (data) {
        if (mounted) {
          setState(() {
            _invitingUserId = null;
          });
          final msg = data?['message'] ?? 'The PK Battle challenge was declined.';
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              backgroundColor: Colors.blueGrey,
              content: Row(
                children: [
                  const Icon(Icons.cancel_outlined, color: Colors.amberAccent, size: 20),
                  const SizedBox(width: 8),
                  Expanded(child: Text(msg)),
                ],
              ),
              duration: const Duration(seconds: 4),
            ),
          );
        }
      });

      _socket!.on('pk:started', (data) {
        if (mounted && data != null) {
          final battleData = Map<String, dynamic>.from(data);
          final currentUserId = AuthService().currentUser?.id;
          final rivalId = battleData['host2']?['id'];
          final isMeRival = currentUserId != null && currentUserId == rivalId;

          setState(() {
            _isPKActive = true;
            _isRivalBroadcaster = isMeRival;
            _invitingUserId = null;
            _pkBattle = battleData;
            _pkRemainingSeconds = (data['remainingSeconds'] as num?)?.toInt() ?? 180;
            _pkHost1Score = (data['host1Score'] as num?)?.toInt() ?? 0;
            _pkHost2Score = (data['host2Score'] as num?)?.toInt() ?? 0;
            _pkProgress = (data['progressHost1'] as num?)?.toInt() ?? 50;
            _pkStatus = data['status'] ?? 'BATTLE';
            _pkWinnerName = null;
            _pkIsDraw = false;
          });
        }
      });

      _socket!.on('pk:tick', (data) {
        if (mounted && data != null) {
          setState(() {
            _pkRemainingSeconds = (data['remainingSeconds'] as num?)?.toInt() ?? _pkRemainingSeconds;
            _pkHost1Score = (data['host1Score'] as num?)?.toInt() ?? _pkHost1Score;
            _pkHost2Score = (data['host2Score'] as num?)?.toInt() ?? _pkHost2Score;
            _pkProgress = (data['progressHost1'] as num?)?.toInt() ?? _pkProgress;
            _pkStatus = data['status'] ?? _pkStatus;
          });
        }
      });

      _socket!.on('pk:score_update', (data) {
        if (mounted && data != null) {
          setState(() {
            _pkHost1Score = (data['host1Score'] as num?)?.toInt() ?? _pkHost1Score;
            _pkHost2Score = (data['host2Score'] as num?)?.toInt() ?? _pkHost2Score;
            _pkProgress = (data['progressHost1'] as num?)?.toInt() ?? _pkProgress;
          });
        }
      });

      _socket!.on('pk:ended', (data) {
        if (mounted && data != null) {
          setState(() {
            _pkStatus = 'PUNISHMENT';
            _pkWinnerName = data['winnerName'] as String?;
            _pkIsDraw = data['isDraw'] == true;
            _pkRemainingSeconds = (data['punishmentSeconds'] as num?)?.toInt() ?? 60;
          });
        }
      });

      _socket!.on('pk:punishment_tick', (data) {
        if (mounted && data != null) {
          setState(() {
            _pkRemainingSeconds = (data['punishmentSeconds'] as num?)?.toInt() ?? _pkRemainingSeconds;
          });
        }
      });

      _socket!.on('pk:closed', (_) {
        if (mounted) {
          if (_isRivalBroadcaster) {
            _agoraService.updateBroadcasterRole(isBroadcaster: false);
          }
          setState(() {
            _isPKActive = false;
            _isRivalBroadcaster = false;
            _pkBattle = null;
            _pkStatus = 'NONE';
          });
        }
      });

      _socket!.on('reaction:heart', (data) {
        if (mounted) {
          _spawnFloatingHeart();
        }
      });

      // Immediate clean close on room termination by Admin or Host (No dialog)
      _socket!.on('room:terminated', (data) {
        if (mounted) {
          _closeRoomImmediately();
        }
      });

      _socket!.on('stream:ended', (data) {
        if (mounted) {
          _closeRoomImmediately();
        }
      });

      _socket!.on('discovery:stream_ended', (data) {
        final endedId = data?['roomId'] ?? data?['agoraChannelName'];
        if ((endedId == widget.channelName || endedId == null) && mounted) {
          _closeRoomImmediately();
        }
      });
    } catch (e) {
      debugPrint('WebSocket connection error: $e');
    }
  }

  void _spawnFloatingHeart() {
    final colors = [
      const Color(0xFFEF4444), // Crimson
      const Color(0xFFEC4899), // Pink
      const Color(0xFF8B5CF6), // Purple
      const Color(0xFF06B6D4), // Cyan
      const Color(0xFFF59E0B), // Gold
    ];
    final heart = _HeartItem(
      id: UniqueKey(),
      startX: 20.0 + _random.nextDouble() * 60.0,
      color: colors[_random.nextInt(colors.length)],
      scale: 0.8 + _random.nextDouble() * 0.5,
    );
    setState(() {
      _floatingHearts.add(heart);
    });
    Future.delayed(const Duration(milliseconds: 1800), () {
      if (mounted) {
        setState(() {
          _floatingHearts.removeWhere((h) => h.id == heart.id);
        });
      }
    });
  }

  void _onScreenTap() {
    _spawnFloatingHeart();
    _socket?.emit('reaction:heart', {'roomId': widget.channelName});
  }

  Future<void> _sendImageMessage() async {
    final currentUser = AuthService().currentUser;
    final isVip = (currentUser?.vipLevel ?? 0) >= 1;
    if (!isVip) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('👑 Sending photos in live streams is a VIP 1 privilege. Spend \$500/mo to unlock.'.tr),
          backgroundColor: const Color(0xFF6366F1),
        ),
      );
      return;
    }

    try {
      final picker = ImagePicker();
      final picked = await picker.pickImage(source: ImageSource.gallery, imageQuality: 80);
      if (picked == null) return;

      final uploadedUrl = await ApiService().uploadAvatar(picked.path);
      if (uploadedUrl != null && uploadedUrl.isNotEmpty) {
        _socket?.emit('chat:send', {
          'roomId': widget.channelName,
          'sender': {
            'id': widget.isHost ? (currentUser?.id ?? 'host') : (currentUser?.id ?? 'me'),
            'displayName': widget.isHost ? widget.hostName : (currentUser?.displayName ?? 'Me'),
            'customId': widget.isHost ? widget.hostCustomId : currentUser?.customId,
            'vipLevel': currentUser?.vipLevel ?? 0,
            'level': widget.isHost ? 35 : (currentUser?.level ?? 1),
            'nameColor': currentUser?.customNameColor,
            'chatBubbleStyle': 'vip_photo',
            'avatarUrl': widget.isHost ? widget.hostAvatarUrl : currentUser?.avatarUrl,
          },
          'text': '📷 Shared a photo',
          'imageUrl': ApiService.getFullImageUrl(uploadedUrl),
        });
      }
    } catch (e) {
      debugPrint('Error sending stream photo: $e');
    }
  }

  void _sendMessage() {
    final text = _chatController.text.trim();
    if (text.isEmpty) return;

    final currentUser = AuthService().currentUser;

    _socket?.emit('chat:send', {
      'roomId': widget.channelName,
      'sender': {
        'id': widget.isHost ? (currentUser?.id ?? 'host') : (currentUser?.id ?? 'me'),
        'displayName': widget.isHost ? widget.hostName : (currentUser?.displayName ?? 'Me'),
        'customId': widget.isHost ? widget.hostCustomId : currentUser?.customId,
        'vipLevel': widget.isHost ? (widget.hostVipLevel ?? currentUser?.vipLevel ?? 0) : (currentUser?.vipLevel ?? 0),
        'level': widget.isHost ? 35 : (currentUser?.level ?? 1),
        'nameColor': currentUser?.customNameColor,
        'chatBubbleStyle': 'standard',
        'avatarUrl': widget.isHost ? widget.hostAvatarUrl : currentUser?.avatarUrl,
      },
      'text': text,
    });

    _chatController.clear();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_chatScrollController.hasClients) {
        _chatScrollController.animateTo(
          _chatScrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _showReportDialog() {
    String selectedCategory = 'INAPPROPRIATE_CONTENT';
    final reasonController = TextEditingController();
    bool isSubmitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: LiveColors.backgroundSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => SafeArea(
          child: Padding(
            padding: EdgeInsets.only(
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
              left: 20,
              right: 20,
              top: 20,
            ),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.shield_outlined, color: Colors.redAccent, size: 22),
                          SizedBox(width: 8),
                          Text('Report Live Stream'.tr, style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                        ],
                      ),
                      IconButton(
                        icon: const Icon(Icons.close, color: Colors.grey),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Help keep Live 2030 safe. Reports are monitored in real-time by Community Moderation.'.tr,
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade400),
                  ),
                  const SizedBox(height: 16),
                  Text('Violation Category:'.tr, style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white70)),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    initialValue: selectedCategory,
                    dropdownColor: LiveColors.backgroundInput,
                    style: const TextStyle(color: Colors.white, fontSize: 13),
                    decoration: InputDecoration(
                      filled: true,
                      fillColor: LiveColors.backgroundInput,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: LiveColors.border)),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: LiveColors.border)),
                      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: LiveColors.primaryAccent)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    ),
                    items: [
                      DropdownMenuItem(value: 'INAPPROPRIATE_CONTENT', child: Text('Explicit / Inappropriate Content'.tr)),
                      DropdownMenuItem(value: 'HARASSMENT', child: Text('Harassment or Hate Speech'.tr)),
                      DropdownMenuItem(value: 'SPAM_SCAM', child: Text('Spam or Financial Fraud'.tr)),
                      DropdownMenuItem(value: 'UNDERAGE', child: Text('Underage Streamer'.tr)),
                      DropdownMenuItem(value: 'COPYRIGHT', child: Text('Copyright Infringement'.tr)),
                    ],
                    onChanged: (val) {
                      if (val != null) {
                        setModalState(() => selectedCategory = val);
                      }
                    },
                  ),
                  const SizedBox(height: 14),
                  Text('Additional Details (Optional):'.tr, style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white70)),
                  const SizedBox(height: 8),
                  TextField(
                    controller: reasonController,
                    maxLines: 3,
                    style: const TextStyle(color: Colors.white, fontSize: 13),
                    decoration: InputDecoration(
                      hintText: 'Describe what occurred on stream...'.tr,
                      hintStyle: const TextStyle(color: LiveColors.textMuted, fontSize: 12),
                      filled: true,
                      fillColor: LiveColors.backgroundInput,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: LiveColors.border)),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: LiveColors.border)),
                      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: LiveColors.primaryAccent)),
                    ),
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    height: 46,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.redAccent,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: isSubmitting
                          ? null
                          : () async {
                              setModalState(() => isSubmitting = true);
                              final success = await ApiService().submitReport(
                                targetType: 'STREAM',
                                targetId: widget.channelName,
                                category: selectedCategory,
                                reason: reasonController.text.trim().isNotEmpty
                                    ? reasonController.text.trim()
                                    : 'Flagged by audience viewer',
                                reportedUserId: widget.isHost ? 'me' : 'host_streamer',
                              );
                              setModalState(() => isSubmitting = false);
                              if (ctx.mounted) Navigator.pop(ctx);

                              if (mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    backgroundColor: success ? const Color(0xFF10B981) : Colors.redAccent,
                                    content: Text(
                                      success
                                          ? 'Report submitted to Trust & Safety moderation team.'
                                          : 'Failed to submit report. Please try again.',
                                    ),
                                  ),
                                );
                              }
                            },
                      child: isSubmitting
                          ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : Text('Submit Report to Moderation'.tr, style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  void _showGiftDialog() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: LiveColors.backgroundSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        final gifts = [
          // Standard Gifts (All Users)
          {'id': 'g1', 'name': 'Rose 🌹', 'coins': 10, 'minVip': 0, 'icon': Icons.local_florist, 'color': Colors.redAccent},
          {'id': 'g2', 'name': 'Diamond Ring 💍', 'coins': 100, 'minVip': 0, 'icon': Icons.diamond, 'color': Colors.cyanAccent},
          {'id': 'g3', 'name': 'Sports Car 🏎️', 'coins': 1000, 'minVip': 0, 'icon': Icons.directions_car, 'color': Colors.amberAccent},
          {'id': 'g4', 'name': 'Luxury Yacht 🛥️', 'coins': 5000, 'minVip': 0, 'icon': Icons.directions_boat, 'color': Colors.tealAccent},
          {'id': 'g5', 'name': 'Golden Dragon 🐉', 'coins': 10000, 'minVip': 0, 'icon': Icons.whatshot, 'color': Colors.orangeAccent},
          {'id': 'g6', 'name': 'Space Rocket 🚀', 'coins': 50000, 'minVip': 0, 'icon': Icons.rocket_launch, 'color': Colors.purpleAccent},
          // VIP 1-8 Exclusives
          {'id': 'g_vip1_yacht', 'name': 'Neon Cruiser 🚤', 'coins': 500, 'minVip': 1, 'icon': Icons.sailing, 'color': const Color(0xFF06B6D4)},
          {'id': 'g_vip2_sports_car', 'name': 'Cyber Phantom 🏎️', 'coins': 1500, 'minVip': 2, 'icon': Icons.electric_bolt, 'color': const Color(0xFF8B5CF6)},
          {'id': 'g_vip3_helicopter', 'name': 'Royal Airship 🛸', 'coins': 3500, 'minVip': 3, 'icon': Icons.flight, 'color': const Color(0xFFEC4899)},
          {'id': 'g_vip4_mansion', 'name': 'Palace of Light 🏰', 'coins': 8000, 'minVip': 4, 'icon': Icons.castle, 'color': const Color(0xFFF59E0B)},
          {'id': 'g_vip5_dragon', 'name': 'Celestial Dragon 🐲', 'coins': 15000, 'minVip': 5, 'icon': Icons.local_fire_department, 'color': const Color(0xFFEF4444)},
          {'id': 'g_vip6_phoenix', 'name': 'Phoenix Sovereign 🦅', 'coins': 30000, 'minVip': 6, 'icon': Icons.auto_awesome, 'color': const Color(0xFFF97316)},
          {'id': 'g_vip7_galaxy', 'name': 'Nebula Galaxy 🌌', 'coins': 60000, 'minVip': 7, 'icon': Icons.brightness_high, 'color': const Color(0xFFA855F7)},
          {'id': 'g_vip8_sovereign', 'name': 'Throne of Eternity 👑', 'coins': 120000, 'minVip': 8, 'icon': Icons.workspace_premium, 'color': const Color(0xFFFFD700)},
        ];

        final userCoins = AuthService().currentUser?.coins ?? 0;
        final hostDisplayName = _pkBattle?['host1']?['displayName'] ?? widget.hostName;
        final rivalDisplayName = _pkBattle?['host2']?['displayName'] ?? 'Rival';

        return StatefulBuilder(
          builder: (ctx, setGiftState) {
            return SafeArea(
              child: Padding(
                padding: EdgeInsets.only(
                  bottom: MediaQuery.of(context).viewInsets.bottom + 20,
                  left: 20,
                  right: 20,
                  top: 20,
                ),
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Send Virtual Gift'.tr,
                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF59E0B).withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.4)),
                            ),
                            child: Text(
                              '${'Wallet:'.tr} $userCoins 🪙',
                              style: const TextStyle(color: Color(0xFFF59E0B), fontWeight: FontWeight.bold, fontSize: 12),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),

                      // ⚔️ PK Targeted Recipient Selector
                      if (_isPKActive) ...[
                        Text(
                          'Select Recipient & Boost PK Score:'.tr,
                          style: const TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w600),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            // Person 1 (Host)
                            Expanded(
                              child: InkWell(
                                onTap: () {
                                  setGiftState(() {
                                    _selectedPKGiftTarget = 'host1';
                                  });
                                  setState(() {
                                    _selectedPKGiftTarget = 'host1';
                                  });
                                },
                                borderRadius: BorderRadius.circular(12),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 8),
                                  decoration: BoxDecoration(
                                    gradient: _selectedPKGiftTarget == 'host1'
                                        ? const LinearGradient(colors: [Color(0xFF6366F1), Color(0xFF4F46E5)])
                                        : null,
                                    color: _selectedPKGiftTarget != 'host1' ? Colors.white.withValues(alpha: 0.08) : null,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(
                                      color: _selectedPKGiftTarget == 'host1' ? const Color(0xFF818CF8) : Colors.white12,
                                      width: 1.5,
                                    ),
                                  ),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      const Text('👑 ', style: TextStyle(fontSize: 13)),
                                      Flexible(
                                        child: Text(
                                          hostDisplayName,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: TextStyle(
                                            color: Colors.white,
                                            fontWeight: _selectedPKGiftTarget == 'host1' ? FontWeight.bold : FontWeight.normal,
                                            fontSize: 12,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            // Person 2 (Rival)
                            Expanded(
                              child: InkWell(
                                onTap: () {
                                  setGiftState(() {
                                    _selectedPKGiftTarget = 'host2';
                                  });
                                  setState(() {
                                    _selectedPKGiftTarget = 'host2';
                                  });
                                },
                                borderRadius: BorderRadius.circular(12),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 8),
                                  decoration: BoxDecoration(
                                    gradient: _selectedPKGiftTarget == 'host2'
                                        ? const LinearGradient(colors: [Color(0xFFEC4899), Color(0xFFBE185D)])
                                        : null,
                                    color: _selectedPKGiftTarget != 'host2' ? Colors.white.withValues(alpha: 0.08) : null,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(
                                      color: _selectedPKGiftTarget == 'host2' ? const Color(0xFFF472B6) : Colors.white12,
                                      width: 1.5,
                                    ),
                                  ),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      const Text('⚔️ ', style: TextStyle(fontSize: 13)),
                                      Flexible(
                                        child: Text(
                                          rivalDisplayName,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: TextStyle(
                                            color: Colors.white,
                                            fontWeight: _selectedPKGiftTarget == 'host2' ? FontWeight.bold : FontWeight.normal,
                                            fontSize: 12,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),
                      ],

                      GridView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 3,
                          childAspectRatio: 1.05,
                          crossAxisSpacing: 10,
                          mainAxisSpacing: 10,
                        ),
                        itemCount: gifts.length,
                        itemBuilder: (context, index) {
                          final gift = gifts[index];
                          final minVip = (gift['minVip'] as int?) ?? 0;
                          final currentUser = AuthService().currentUser;
                          final myVip = currentUser?.vipLevel ?? 0;

                          return InkWell(
                            onTap: () async {
                              if (myVip < minVip) {
                                ScaffoldMessenger.of(this.context).hideCurrentSnackBar();
                                ScaffoldMessenger.of(this.context).showSnackBar(
                                  SnackBar(
                                    behavior: SnackBarBehavior.floating,
                                    duration: const Duration(seconds: 3),
                                    backgroundColor: const Color(0xFF4C1D95),
                                    content: Row(
                                      children: [
                                        const Icon(Icons.lock, color: Colors.amberAccent, size: 18),
                                        const SizedBox(width: 8),
                                        Expanded(child: Text('VIP $minVip required to send ${(gift['name'] as String).tr}! Upgrade VIP to unlock.'.tr)),
                                      ],
                                    ),
                                  ),
                                );
                                return;
                              }

                              final cost = gift['coins'] as int;
                              final currentCoins = currentUser?.coins ?? 0;

                              if (currentCoins < cost) {
                                Navigator.pop(context);
                                TopUpChoiceDialog.show(this.context);
                                return;
                              }

                              Navigator.pop(context);

                              final targetHost = _isPKActive ? _selectedPKGiftTarget : null;
                              String? targetRecipientId;
                              if (_isPKActive) {
                                if (_selectedPKGiftTarget == 'host2') {
                                  targetRecipientId = _pkBattle?['host2']?['id'];
                                } else {
                                  targetRecipientId = _pkBattle?['host1']?['id'];
                                }
                              }

                              try {
                                final res = await ApiService().sendGift(
                                  roomId: widget.channelName,
                                  giftId: gift['id'] as String,
                                  quantity: 1,
                                  senderId: currentUser?.id,
                                  recipientId: targetRecipientId,
                                  targetHost: targetHost,
                                );

                                if (res != null && res['remainingCoins'] != null) {
                                  await AuthService().updateBalances(
                                    coins: (res['remainingCoins'] as num).toInt(),
                                  );
                                }

                                if (mounted) {
                                  final recipientLabel = _isPKActive
                                      ? (_selectedPKGiftTarget == 'host2' ? rivalDisplayName : hostDisplayName)
                                      : widget.hostName;
                                  ScaffoldMessenger.of(this.context).showSnackBar(
                                    SnackBar(
                                      backgroundColor: const Color(0xFF10B981),
                                      content: Row(
                                        children: [
                                          const Icon(Icons.check_circle, color: Colors.white, size: 18),
                                          const SizedBox(width: 8),
                                          Expanded(
                                            child: Text('${'Sent'.tr} ${(gift['name'] as String).tr} (-$cost 🪙) ${'to'.tr} $recipientLabel! 💎 ${'credited'.tr}.'),
                                          ),
                                        ],
                                      ),
                                    ),
                                  );
                                }
                              } catch (e) {
                                if (mounted) {
                                  ScaffoldMessenger.of(this.context).showSnackBar(
                                    SnackBar(
                                      backgroundColor: Colors.redAccent,
                                      content: Text(e.toString().replaceAll('Exception: ', '').tr),
                                    ),
                                  );
                                }
                              }
                            },
                            child: Stack(
                              children: [
                                Container(
                                  width: double.infinity,
                                  height: double.infinity,
                                  decoration: BoxDecoration(
                                    color: LiveColors.backgroundElevated,
                                    borderRadius: BorderRadius.circular(14),
                                    border: Border.all(
                                      color: minVip > 0
                                          ? (myVip >= minVip ? const Color(0xFF10B981) : Colors.amber.withValues(alpha: 0.5))
                                          : LiveColors.border,
                                      width: minVip > 0 ? 1.5 : 1,
                                    ),
                                  ),
                                  child: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(gift['icon'] as IconData, color: gift['color'] as Color, size: 28),
                                      const SizedBox(height: 6),
                                      Padding(
                                        padding: const EdgeInsets.symmetric(horizontal: 4),
                                        child: Text(
                                          (gift['name'] as String).tr,
                                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                                          textAlign: TextAlign.center,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        '${gift['coins']} 🪙',
                                        style: const TextStyle(fontSize: 10, color: Color(0xFFF59E0B)),
                                      ),
                                    ],
                                  ),
                                ),
                                if (minVip > 0)
                                  Positioned(
                                    top: 4,
                                    right: 4,
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1.5),
                                      decoration: BoxDecoration(
                                        gradient: LinearGradient(
                                          colors: myVip >= minVip
                                              ? [const Color(0xFF10B981), const Color(0xFF059669)]
                                              : [const Color(0xFFF59E0B), const Color(0xFFB45309)],
                                        ),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(
                                        'VIP $minVip',
                                        style: const TextStyle(fontSize: 8, fontWeight: FontWeight.bold, color: Colors.white),
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                          );
                        },
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  /// Bottom sheet showing all joined viewers in this live stream so host can challenge one to a 1v1 PK
  void _showPKViewerInviteSheet() {
    final currentUser = AuthService().currentUser;
    _isLoadingViewers = true;

    // Request active viewers from signaling server
    _socket?.emit('room:viewers:get', {
      'roomId': widget.channelName,
      'excludeUserId': currentUser?.id,
    });

    // Safety fallback: if socket response is delayed or room is empty, dismiss loader after 1.2s
    Future.delayed(const Duration(milliseconds: 1200), () {
      if (mounted && _isLoadingViewers) {
        _isLoadingViewers = false;
        _sheetSetState?.call(() {});
        setState(() {});
      }
    });

    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF0F172A),
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            _sheetSetState = setSheetState;
            return SafeArea(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                constraints: BoxConstraints(
                  maxHeight: MediaQuery.of(context).size.height * 0.55,
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.sports_kabaddi, color: Color(0xFFEC4899), size: 22),
                            const SizedBox(width: 8),
                            Text(
                              'PK Battle: Select Rival'.tr,
                              style: const TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                        IconButton(
                          icon: const Icon(Icons.close, color: Colors.white54, size: 20),
                          onPressed: () => Navigator.pop(ctx),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Challenge an audience member in this room to a live 1v1 PK Battle!'.tr,
                      style: const TextStyle(color: Colors.white60, fontSize: 12),
                    ),
                    const Divider(color: Colors.white12, height: 20),

                    Expanded(
                      child: _isLoadingViewers
                          ? const Center(
                              child: CircularProgressIndicator(color: Color(0xFFEC4899)),
                            )
                          : _roomViewers.isEmpty
                              ? Center(
                                  child: Column(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Icon(Icons.people_outline, color: Colors.white24, size: 44),
                                      const SizedBox(height: 10),
                                      Text(
                                        'No viewers in room yet'.tr,
                                        style: const TextStyle(color: Colors.white70, fontWeight: FontWeight.bold, fontSize: 14),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        'When audience members join your stream, they will appear here so you can invite them to PK!'.tr,
                                        textAlign: TextAlign.center,
                                        style: const TextStyle(color: Colors.white38, fontSize: 12),
                                      ),
                                    ],
                                  ),
                                )
                          : ListView.separated(
                              itemCount: _roomViewers.length,
                              separatorBuilder: (_, __) => const Divider(color: Colors.white10, height: 10),
                              itemBuilder: (context, index) {
                                final viewer = _roomViewers[index];
                                final vName = viewer['displayName'] ?? 'Audience Member';
                                final vAvatar = viewer['avatarUrl'] ?? '';
                                final vUserId = viewer['userId'] ?? '';
                                final isInviting = _invitingUserId == vUserId;

                                final vLevel = (viewer['level'] as num?)?.toInt() ?? 1;

                                return ListTile(
                                  contentPadding: EdgeInsets.zero,
                                  leading: UserAvatarWithFrame(
                                    avatarUrl: vAvatar.isNotEmpty ? vAvatar : null,
                                    level: vLevel,
                                    size: 40,
                                    showBadge: false,
                                  ),
                                  title: Text(
                                    vName,
                                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  subtitle: Text(
                                    'Audience Viewer'.tr,
                                    style: const TextStyle(color: Colors.white38, fontSize: 11),
                                  ),
                                  trailing: ElevatedButton(
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: isInviting ? Colors.blueGrey : const Color(0xFFEC4899),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                    ),
                                    onPressed: isInviting
                                        ? null
                                        : () {
                                            setSheetState(() {
                                              _invitingUserId = vUserId;
                                            });
                                            setState(() {
                                              _invitingUserId = vUserId;
                                            });
                                            final cUser = AuthService().currentUser;
                                            _socket?.emit('pk:invite:send', {
                                              'roomId': widget.channelName,
                                              'host': {
                                                'id': cUser?.id ?? 'host',
                                                'displayName': widget.hostName,
                                                'avatarUrl': widget.hostAvatarUrl,
                                                'level': cUser?.level ?? 25,
                                              },
                                              'targetUserId': vUserId,
                                              'targetSocketId': viewer['socketId'],
                                            });
                                            Navigator.pop(ctx);
                                          },
                                    child: isInviting
                                        ? const SizedBox(
                                            width: 14,
                                            height: 14,
                                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                          )
                                        : Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              Icon(Icons.sports_kabaddi, color: Colors.white, size: 14),
                                              SizedBox(width: 4),
                                              Text('Invite'.tr, style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                                            ],
                                          ),
                                  ),
                                );
                              },
                            ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  /// Challenge prompt dialog presented to the receiver when challenged to a PK battle
  void _showPKChallengeDialog(Map<String, dynamic> data) {
    final host = data['host'] ?? {};
    final hostName = host['displayName'] ?? 'Host';
    final hostAvatar = host['avatarUrl'] ?? '';

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) {
        return AlertDialog(
          backgroundColor: LiveColors.backgroundSurface,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
            side: const BorderSide(color: LiveColors.primaryAccent, width: 1.5),
          ),
          title: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: const BoxDecoration(
                  gradient: LinearGradient(colors: [Color(0xFFEC4899), Color(0xFF8B5CF6)]),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.sports_kabaddi, color: Colors.white, size: 22),
              ),
              const SizedBox(width: 10),
              Text(
                '1v1 PK Challenge!'.tr,
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18),
              ),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircleAvatar(
                radius: 36,
                backgroundColor: const Color(0xFF6366F1),
                backgroundImage: hostAvatar.isNotEmpty ? NetworkImage(hostAvatar) : null,
                child: hostAvatar.isEmpty
                    ? Text(
                        hostName.isNotEmpty ? hostName[0].toUpperCase() : 'H',
                        style: const TextStyle(fontSize: 28, color: Colors.white, fontWeight: FontWeight.bold),
                      )
                    : null,
              ),
              const SizedBox(height: 12),
              Text(
                hostName,
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
              ),
              const SizedBox(height: 6),
              Text(
                'has invited you to a live 1v1 PK Battle in this room!\nDo you accept the challenge?'.tr,
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.white70, fontSize: 13, height: 1.4),
              ),
            ],
          ),
          actionsAlignment: MainAxisAlignment.spaceBetween,
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(ctx);
                final currentUser = AuthService().currentUser;
                _socket?.emit('pk:invite:respond', {
                  'roomId': widget.channelName,
                  'accepted': false,
                  'host': host,
                  'rival': {
                    'id': currentUser?.id ?? 'viewer',
                    'displayName': currentUser?.displayName ?? 'Viewer',
                    'avatarUrl': currentUser?.avatarUrl,
                  },
                });
              },
              child: Text('Decline'.tr, style: TextStyle(color: Colors.grey, fontWeight: FontWeight.bold)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFEC4899),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
              ),
              onPressed: () async {
                Navigator.pop(ctx);
                final currentUser = AuthService().currentUser;

                // Dynamically upgrade Agora role to Broadcaster (turns on camera & mic)
                await _agoraService.updateBroadcasterRole(isBroadcaster: true);

                _socket?.emit('pk:invite:respond', {
                  'roomId': widget.channelName,
                  'accepted': true,
                  'host': host,
                  'rival': {
                    'id': currentUser?.id ?? 'viewer',
                    'displayName': currentUser?.displayName ?? 'Rival Broadcaster',
                    'avatarUrl': currentUser?.avatarUrl,
                    'level': currentUser?.level ?? 20,
                  },
                });
              },
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.sports_kabaddi, color: Colors.white, size: 16),
                  SizedBox(width: 6),
                  Text('Accept & Battle!'.tr, style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                ],
              ),
            ),
          ],
        );
      },
    );
  }

  void _confirmAndEndPKBattle() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1E1B4B),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: Row(
          children: [
            Icon(Icons.stop_circle_outlined, color: Colors.redAccent),
            SizedBox(width: 8),
            Text('End PK Battle?'.tr, style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
          ],
        ),
        content: Text(
          'Are you sure you want to conclude this PK Battle session and return the room to standard live broadcast?'.tr,
          style: TextStyle(color: Colors.white70, fontSize: 13),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('Cancel'.tr, style: TextStyle(color: Colors.grey)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent),
            onPressed: () {
              Navigator.pop(ctx);
              _endPKBattle();
            },
            child: Text('End PK'.tr, style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  void _endPKBattle() {
    _socket?.emit('pk:close', {'roomId': widget.channelName});
    if (_isRivalBroadcaster) {
      _agoraService.updateBroadcasterRole(isBroadcaster: false);
    }
    setState(() {
      _isPKActive = false;
      _isRivalBroadcaster = false;
      _pkStatus = 'NONE';
      _pkBattle = null;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: Colors.blueGrey,
        content: Text('PK Battle ended.'.tr),
      ),
    );
  }

  String _formatTimer(int totalSeconds) {
    final m = (totalSeconds ~/ 60).toString().padLeft(2, '0');
    final s = (totalSeconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  Future<bool> _confirmAndExitStream() async {
    final shouldClose = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF111827),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: Colors.white12),
        ),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.redAccent.withValues(alpha: 0.2),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.power_settings_new, color: Colors.redAccent, size: 22),
            ),
            const SizedBox(width: 12),
            Text(
              (widget.isHost ? 'End Live Broadcast?' : 'Leave Live Stream?').tr,
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
            ),
          ],
        ),
        content: Text(
          (widget.isHost
              ? 'Are you sure you want to end this live streaming session? Your broadcast will be closed for all viewers and recorded in platform history.'
              : 'Are you sure you want to exit this live stream and return to the lobby?').tr,
          style: const TextStyle(color: Colors.white70, fontSize: 13),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text('Cancel'.tr, style: TextStyle(color: Colors.grey, fontWeight: FontWeight.bold)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.redAccent,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(
              (widget.isHost ? 'Yes, End Stream' : 'Yes, Leave').tr,
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );

    if (shouldClose == true) {
      if (!mounted) return true;
      setState(() => _canExitScreen = true);
      ScaffoldMessenger.of(context).clearSnackBars();
      try {
        _agoraService.leave();
      } catch (_) {}
      if (widget.isHost) {
        // Fire-and-forget server endRoom and socket event so UI closes instantly without delay
        ApiService().endRoom(widget.channelName);
        try {
          _socket?.emit('stream:ended', {
            'roomId': widget.channelName,
            'hostId': AuthService().currentUser?.id,
          });
        } catch (_) {}
      }
      _closeRoomImmediately();
      return true;
    }
    return false;
  }

  Widget _buildCircleButton({
    required IconData icon,
    required Color color,
    required Color bgColor,
    required VoidCallback onTap,
    String? tooltip,
  }) {
    return Container(
      width: 38,
      height: 38,
      decoration: BoxDecoration(
        color: bgColor,
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white12),
      ),
      child: IconButton(
        padding: EdgeInsets.zero,
        icon: Icon(icon, color: color, size: 19),
        onPressed: onTap,
        tooltip: tooltip,
      ),
    );
  }

  @override
  void dispose() {
    _equalizerController.dispose();
    try {
      _socket?.emit('room:leave', {'roomId': widget.channelName});
      _socket?.disconnect();
      _socket?.dispose();
    } catch (_) {}
    try {
      _agoraService.leave();
      _agoraService.dispose();
    } catch (_) {}
    _chatController.dispose();
    _chatScrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: _canExitScreen,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        _confirmAndExitStream();
      },
      child: Scaffold(
        backgroundColor: Colors.black,
        body: GestureDetector(
          behavior: HitTestBehavior.translucent,
          onTap: _onScreenTap,
          child: Stack(
            children: [
              // 1. Live Video Surface (Normal Mode: Fullscreen; PK Mode: Studio Ambience)
              if (!_isPKActive)
                Positioned.fill(
                  child: _buildVideoSurface(),
                )
              else
                Positioned.fill(
                  child: Container(
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Color(0xFF0F172A),
                          Color(0xFF1E1B4B),
                          Color(0xFF0B0F19),
                          Colors.black,
                        ],
                      ),
                    ),
                  ),
                ),

              // 1.5. PK Battle Split Screen Camera View (Top 40% Proportion)
              if (_isPKActive)
                Positioned(
                  top: MediaQuery.of(context).padding.top + (_pkStatus == 'PUNISHMENT' ? 144 : 112),
                  left: 8,
                  right: 8,
                  height: MediaQuery.of(context).size.height * 0.40,
                  child: Container(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.white24),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.7),
                          blurRadius: 16,
                          spreadRadius: 2,
                        ),
                      ],
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: _buildPKSplitScreen(),
                    ),
                  ),
                ),

            // 2. Tap-to-Heart Floating Animations
            ..._floatingHearts.map((heart) {
              return Positioned(
                bottom: 80,
                right: heart.startX,
                child: TweenAnimationBuilder<double>(
                  key: heart.id,
                  tween: Tween(begin: 0.0, end: 1.0),
                  duration: const Duration(milliseconds: 1600),
                  curve: Curves.easeOutCubic,
                  builder: (context, progress, child) {
                    final dy = -progress * 220.0;
                    final dx = math.sin(progress * math.pi * 3) * 18.0;
                    final opacity = (1.0 - progress).clamp(0.0, 1.0);
                    final scale = heart.scale * (1.0 + (1.0 - progress) * 0.2);

                    return Transform.translate(
                      offset: Offset(dx, dy),
                      child: Transform.scale(
                        scale: scale,
                        child: Opacity(
                          opacity: opacity,
                          child: Icon(Icons.favorite, color: heart.color, size: 28),
                        ),
                      ),
                    );
                  },
                ),
              );
            }),

            // 3. Top Gradient overlay
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              height: 130,
              child: IgnorePointer(
                child: Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.black.withValues(alpha: 0.85),
                        Colors.transparent,
                      ],
                    ),
                  ),
                ),
              ),
            ),

            // 4. Bottom Gradient overlay
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              height: 260,
              child: IgnorePointer(
                child: Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.bottomCenter,
                      end: Alignment.topCenter,
                      colors: [
                        Colors.black.withValues(alpha: 0.9),
                        Colors.transparent,
                      ],
                    ),
                  ),
                ),
              ),
            ),

            // 5. Top Status Bar (Host Info, Diamonds, Reports, Exit)
            Positioned(
              top: MediaQuery.of(context).padding.top + 8,
              left: 12,
              right: 12,
              child: SafeArea(
                bottom: false,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Host Pill
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.55),
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(color: Colors.white24),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          UserAvatarWithFrame(
                            avatarUrl: widget.hostAvatarUrl,
                            level: widget.isHost ? (AuthService().currentUser?.level ?? 1) : 1,
                            size: 28,
                            showBadge: false,
                          ),
                          const SizedBox(width: 6),
                          ConstrainedBox(
                            constraints: const BoxConstraints(maxWidth: 110),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Flexible(
                                      child: Text(
                                        widget.hostName,
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Colors.white),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ],
                                ),
                                Text(
                                  widget.roomTitle,
                                  style: const TextStyle(fontSize: 9, color: Colors.grey),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.redAccent,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text('LIVE'.tr, style: TextStyle(fontSize: 8, fontWeight: FontWeight.bold, color: Colors.white)),
                          ),
                        ],
                      ),
                    ),

                    // Actions (Diamonds, Viewer Count, Report, Exit)
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 5),
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.55),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Row(
                            children: [
                              const Text('💎', style: TextStyle(fontSize: 10)),
                              const SizedBox(width: 3),
                              Text(
                                '$_totalDiamonds',
                                style: const TextStyle(color: Color(0xFF06B6D4), fontSize: 10, fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 4),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 5),
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.55),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.remove_red_eye, size: 12, color: Colors.white),
                              const SizedBox(width: 3),
                              Text(
                                '$_viewerCount',
                                style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 4),
                        // Community Safety Report Flag
                        InkWell(
                          onTap: _showReportDialog,
                          child: Container(
                            padding: const EdgeInsets.all(5),
                            decoration: BoxDecoration(
                              color: Colors.black.withValues(alpha: 0.55),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.flag_outlined, color: Colors.white70, size: 16),
                          ),
                        ),
                        const SizedBox(width: 4),
                        // Close / Exit Stream Button
                        InkWell(
                          onTap: _confirmAndExitStream,
                          child: Container(
                            padding: const EdgeInsets.all(6),
                            decoration: BoxDecoration(
                              color: Colors.black.withValues(alpha: 0.65),
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.white24),
                            ),
                            child: const Icon(Icons.close, color: Colors.white, size: 20),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            // 5.5. ⚔️ PK Battle Showdown Header & Tug-of-War Bar
            if (_isPKActive)
              _buildPKHeaderBar(),

            // 6. Live Chat Overlay (Bottom Left)
            Positioned(
              left: 16,
              bottom: MediaQuery.of(context).padding.bottom + 104,
              width: MediaQuery.of(context).size.width * 0.72,
              height: 175,
              child: ListView.builder(
                controller: _chatScrollController,
                padding: EdgeInsets.zero,
                itemCount: _messages.length,
                itemBuilder: (context, index) {
                  final msg = _messages[index];
                  final isSystem = msg['isSystem'] == true;
                  final senderData = msg['sender'] as Map<String, dynamic>?;
                  final sender = senderData?['displayName'] ?? msg['senderName'] ?? 'Viewer';
                  final nameColorStr = senderData?['nameColor'] as String?;
                  Color senderNameColor = isSystem ? Colors.amberAccent : const Color(0xFF6366F1);
                  if (nameColorStr != null && nameColorStr.startsWith('#')) {
                    try {
                      final hex = nameColorStr.replaceAll('#', '');
                      senderNameColor = Color(int.parse('FF$hex', radix: 16));
                    } catch (_) {}
                  }

                  final rawText = (msg['text'] ?? '').toString();
                  final translatedText = msg['translatedText'] as String?;
                  final isTranslated = msg['isTranslated'] == true && translatedText != null && translatedText.isNotEmpty;
                  final displayText = isTranslated ? translatedText : rawText;
                  final senderVip = (msg['sender']?['vipLevel'] ?? msg['vipLevel'] ?? 0) as int;
                  final senderCustomId = (msg['sender']?['customId'] ?? msg['customId']) as String?;
                  final imageUrl = msg['imageUrl'] as String?;

                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 2.5),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: isSystem
                            ? Colors.indigo.withValues(alpha: 0.35)
                            : (senderVip >= 1 ? const Color(0xFF1E1B4B).withValues(alpha: 0.75) : Colors.black.withValues(alpha: 0.5)),
                        borderRadius: BorderRadius.circular(12),
                        border: senderVip >= 1 ? Border.all(color: const Color(0xFF6366F1).withValues(alpha: 0.5), width: 1) : null,
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.center,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              if (senderVip >= 1) ...[
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                                  margin: const EdgeInsets.only(right: 5),
                                  decoration: BoxDecoration(
                                    gradient: const LinearGradient(colors: [Color(0xFF3B82F6), Color(0xFF8B5CF6)]),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text('VIP $senderVip', style: const TextStyle(color: Colors.white, fontSize: 8.5, fontWeight: FontWeight.bold)),
                                ),
                              ],
                              if (senderCustomId != null && senderCustomId.isNotEmpty) ...[
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                                  margin: const EdgeInsets.only(right: 5),
                                  decoration: BoxDecoration(
                                    color: Colors.white12,
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text('ID: $senderCustomId', style: const TextStyle(color: Colors.amberAccent, fontSize: 8.5, fontWeight: FontWeight.bold)),
                                ),
                              ],
                              Flexible(
                                child: RichText(
                                  text: TextSpan(
                                    children: [
                                      TextSpan(
                                        text: '$sender: ',
                                        style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 12,
                                          color: senderNameColor,
                                        ),
                                      ),
                                      TextSpan(
                                        text: displayText,
                                        style: const TextStyle(fontSize: 12, color: Colors.white),
                                      ),
                                      if (isTranslated)
                                        const TextSpan(
                                          text: '  🌐',
                                          style: TextStyle(fontSize: 10),
                                        ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                          if (imageUrl != null && imageUrl.isNotEmpty) ...[
                            const SizedBox(height: 5),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: Image.network(
                                imageUrl,
                                width: 140,
                                height: 100,
                                fit: BoxFit.cover,
                                errorBuilder: (_, __, ___) => const Icon(Icons.broken_image, size: 24, color: Colors.white30),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),

            // 7. Bottom Two-Row Action Controls Bar
            Positioned(
              left: 10,
              right: 10,
              bottom: MediaQuery.of(context).padding.bottom + 6,
              child: SafeArea(
                top: false,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // ROW 1: Wide Chat Input Field with Photo & Send Buttons
                    Container(
                      height: 42,
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.65),
                        borderRadius: BorderRadius.circular(21),
                        border: Border.all(color: Colors.white24, width: 1),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.35),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Row(
                        children: [
                          const SizedBox(width: 12),
                          const Icon(Icons.chat_bubble_outline_rounded, color: Colors.white54, size: 16),
                          const SizedBox(width: 8),
                          Expanded(
                            child: TextField(
                              controller: _chatController,
                              style: const TextStyle(color: Colors.white, fontSize: 13),
                              decoration: InputDecoration(
                                hintText: AppLocaleService().t('live_say_something'),
                                hintStyle: const TextStyle(color: Colors.white54, fontSize: 12),
                                border: InputBorder.none,
                                isDense: true,
                                contentPadding: const EdgeInsets.symmetric(vertical: 10),
                              ),
                              onSubmitted: (_) => _sendMessage(),
                            ),
                          ),
                          // Photo Attachment (VIP 1)
                          IconButton(
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                            icon: const Icon(Icons.add_photo_alternate_rounded, size: 19, color: Colors.amberAccent),
                            tooltip: 'Send Photo (VIP 1)'.tr,
                            onPressed: _sendImageMessage,
                          ),
                          // Send Button
                          Padding(
                            padding: const EdgeInsets.only(right: 5),
                            child: Material(
                              color: Colors.transparent,
                              child: InkWell(
                                borderRadius: BorderRadius.circular(16),
                                onTap: _sendMessage,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                  decoration: BoxDecoration(
                                    gradient: const LinearGradient(
                                      colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)],
                                    ),
                                    borderRadius: BorderRadius.circular(16),
                                  ),
                                  child: const Icon(Icons.send_rounded, size: 14, color: Colors.white),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 8),

                    // ROW 2: Action & Interaction Buttons
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        // Left Section: Host Controls (or Viewer Info Badge)
                        if (widget.isHost || _isRivalBroadcaster) ...[
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              // Camera Switch
                              _buildCircleButton(
                                icon: Icons.flip_camera_ios,
                                color: Colors.white,
                                bgColor: Colors.black.withValues(alpha: 0.6),
                                onTap: () => _agoraService.switchCamera(),
                                tooltip: 'Flip Camera'.tr,
                              ),
                              const SizedBox(width: 6),

                              // Mic Mute
                              _buildCircleButton(
                                icon: _agoraService.isMuted ? Icons.mic_off : Icons.mic,
                                color: _agoraService.isMuted ? Colors.redAccent : Colors.white,
                                bgColor: _agoraService.isMuted
                                    ? Colors.redAccent.withValues(alpha: 0.25)
                                    : Colors.black.withValues(alpha: 0.6),
                                onTap: () async {
                                  await _agoraService.toggleAudioMute();
                                  if (!mounted) return;
                                  setState(() {});
                                },
                                tooltip: 'Mute Mic'.tr,
                              ),
                              const SizedBox(width: 6),

                              // PK Battle Button
                              Container(
                                width: 38,
                                height: 38,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  gradient: const LinearGradient(
                                    colors: [Color(0xFF8B5CF6), Color(0xFFEC4899)],
                                  ),
                                  boxShadow: [
                                    BoxShadow(
                                      color: const Color(0xFFEC4899).withValues(alpha: 0.45),
                                      blurRadius: 8,
                                      spreadRadius: 1,
                                    ),
                                  ],
                                ),
                                child: IconButton(
                                  padding: EdgeInsets.zero,
                                  icon: Icon(
                                    _isPKActive ? Icons.stop_circle : Icons.sports_kabaddi,
                                    color: Colors.white,
                                    size: 19,
                                  ),
                                  tooltip: _isPKActive ? 'End PK Battle'.tr : 'PK Battle'.tr,
                                  onPressed: _isPKActive ? _confirmAndEndPKBattle : _showPKViewerInviteSheet,
                                ),
                              ),
                            ],
                          ),
                        ] else ...[
                          // Viewer status badge
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            decoration: BoxDecoration(
                              color: Colors.black.withValues(alpha: 0.5),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: Colors.white12),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  width: 6,
                                  height: 6,
                                  decoration: const BoxDecoration(
                                    color: Color(0xFF10B981),
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  'LIVE ROOM'.tr,
                                  style: const TextStyle(
                                    color: Colors.white70,
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],

                        // Right Section: Mini Games, Heart & Luxury Gift Buttons
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            // Mini Games Button (777 Slots, Casino Wheel, Sic Bo)
                            Container(
                              width: 38,
                              height: 38,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                gradient: const LinearGradient(
                                  colors: [Color(0xFF7C3AED), Color(0xFF4F46E5)],
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: const Color(0xFF7C3AED).withValues(alpha: 0.4),
                                    blurRadius: 8,
                                    spreadRadius: 1,
                                  ),
                                ],
                              ),
                              child: IconButton(
                                padding: EdgeInsets.zero,
                                icon: const Icon(Icons.casino_rounded, color: Colors.white, size: 19),
                                tooltip: 'Mini Games (777 & Casino)'.tr,
                                onPressed: () => RoomGamesModal.show(context, roomId: widget.channelName),
                              ),
                            ),
                            const SizedBox(width: 6),

                            // Tap-to-Heart Button
                            _buildCircleButton(
                              icon: Icons.favorite,
                              color: Colors.redAccent,
                              bgColor: Colors.redAccent.withValues(alpha: 0.2),
                              onTap: _onScreenTap,
                              tooltip: 'Send Heart'.tr,
                            ),
                            const SizedBox(width: 6),

                            // Luxury Gift Button
                            Container(
                              width: 42,
                              height: 42,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                gradient: const LinearGradient(
                                  colors: [Color(0xFFF59E0B), Color(0xFFD97706)],
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: const Color(0xFFF59E0B).withValues(alpha: 0.5),
                                    blurRadius: 10,
                                    spreadRadius: 1,
                                  ),
                                ],
                              ),
                              child: IconButton(
                                padding: EdgeInsets.zero,
                                icon: const Icon(Icons.card_giftcard, color: Colors.black, size: 21),
                                tooltip: 'Send Gift'.tr,
                                onPressed: _showGiftDialog,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            // 8. Luxury Full-Screen Animated Gift Overlay
            if (_currentGiftAnimation != null)
              _buildLuxuryGiftOverlay(),

            // 9. Royal VIP Entrance Effect Banner (VIP 4+)
            if (_activeVipEntrance != null)
              _buildVipEntranceBanner(),
          ],
        ),
      ),
    ),
  );
}

  Widget _buildVipEntranceBanner() {
    final data = _activeVipEntrance!;
    final vipLevel = (data['vipLevel'] as num?)?.toInt() ?? 4;
    final name = data['displayName']?.toString() ?? 'Royal VIP';
    final title = data['title']?.toString();
    final badgeColor = _parseHexColor(data['badgeColor']?.toString()) ?? const Color(0xFFF59E0B);
    final avatarUrl = data['avatarUrl']?.toString() ?? '';

    return Positioned(
      top: MediaQuery.of(context).padding.top + 70,
      left: 14,
      right: 14,
      child: IgnorePointer(
        child: TweenAnimationBuilder<double>(
          key: ValueKey(data['userId']?.toString() ?? name),
          tween: Tween(begin: 0.0, end: 1.0),
          duration: const Duration(milliseconds: 700),
          curve: Curves.easeOutBack,
          builder: (context, progress, child) {
            return Transform.translate(
              offset: Offset(-120 * (1 - progress), 0),
              child: Opacity(opacity: progress.clamp(0.0, 1.0), child: child),
            );
          },
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [badgeColor.withValues(alpha: 0.95), const Color(0xFF7C3AED).withValues(alpha: 0.85)],
              ),
              borderRadius: BorderRadius.circular(30),
              border: Border.all(color: Colors.white.withValues(alpha: 0.7), width: 1.5),
              boxShadow: [
                BoxShadow(color: badgeColor.withValues(alpha: 0.5), blurRadius: 20, spreadRadius: 1),
              ],
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(3),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: const Color(0xFFFFD700), width: 2),
                  ),
                  child: CircleAvatar(
                    radius: 17,
                    backgroundColor: const Color(0xFF2B1348),
                    backgroundImage: avatarUrl.isNotEmpty ? NetworkImage(avatarUrl) : null,
                    child: avatarUrl.isEmpty
                        ? Text(name.isNotEmpty ? name[0].toUpperCase() : 'V', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold))
                        : null,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        children: [
                          ShaderMask(
                            shaderCallback: (b) => const LinearGradient(colors: [Color(0xFFFFF7AD), Color(0xFFFFB800)]).createShader(b),
                            child: const Icon(Icons.workspace_premium_rounded, color: Colors.white, size: 16),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            'VIP $vipLevel',
                            style: const TextStyle(color: Color(0xFFFFD700), fontWeight: FontWeight.w900, fontSize: 12, letterSpacing: 0.5),
                          ),
                        ],
                      ),
                      Text(
                        name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 13),
                      ),
                    ],
                  ),
                ),
                if (title != null && title.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.25),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.4)),
                    ),
                    child: Text(
                      title,
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 10.5),
                    ),
                  ),
                const SizedBox(width: 6),
                Text('entered ✨', style: TextStyle(color: Colors.white.withValues(alpha: 0.9), fontSize: 11, fontWeight: FontWeight.w600)),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Color? _parseHexColor(String? hex) {
    if (hex == null) return null;
    var value = hex.trim().replaceFirst('#', '');
    if (value.length == 6) value = 'FF$value';
    if (value.length != 8) return null;
    final parsed = int.tryParse(value, radix: 16);
    return parsed == null ? null : Color(parsed);
  }

  Widget _buildLuxuryGiftOverlay() {
    final giftName = _currentGiftAnimation!['name'] ?? 'Luxury Gift';
    final senderName = _currentGiftAnimation!['sender']?['displayName'] ?? 'Supporter';
    final diamonds = _currentGiftAnimation!['diamondsAwarded'] ?? 42;

    return Positioned(
      top: MediaQuery.of(context).size.height * 0.32,
      left: 20,
      right: 20,
      child: TweenAnimationBuilder<double>(
        tween: Tween(begin: 0.0, end: 1.0),
        duration: const Duration(milliseconds: 450),
        curve: Curves.elasticOut,
        builder: (context, scale, child) {
          return Transform.scale(
            scale: scale,
            child: child,
          );
        },
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF8B5CF6), Color(0xFFEC4899), Color(0xFFF59E0B)],
            ),
            borderRadius: BorderRadius.circular(24),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFFEC4899).withValues(alpha: 0.6),
                blurRadius: 28,
                spreadRadius: 4,
              ),
            ],
            border: Border.all(color: Colors.white70, width: 1.5),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white24,
                ),
                child: const Icon(Icons.celebration, color: Colors.amberAccent, size: 30),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      '$senderName sent a luxury gift!',
                      style: const TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.w500),
                    ),
                    Text(
                      giftName,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                        fontSize: 17,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.5),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Text(
                  '+$diamonds 💎',
                  style: const TextStyle(
                    color: Color(0xFF06B6D4),
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildVideoSurfaceSingle({required bool isHost}) {
    if (isHost) {
      // Local Host Camera Preview
      if (_agoraService.engine != null && _isJoined) {
        return AgoraVideoView(
          controller: VideoViewController(
            rtcEngine: _agoraService.engine!,
            canvas: const VideoCanvas(uid: 0),
          ),
        );
      }
      return _buildStudioVisualizer(isHostPreview: true);
    } else {
      // Remote Audience View: resolve active broadcaster UID
      final activeUid = _remoteUid ??
          _agoraService.remoteUid ??
          (_agoraService.remoteUids.isNotEmpty ? _agoraService.remoteUids.first : null);

      if (activeUid != null && _agoraService.engine != null) {
        return AgoraVideoView(
          controller: VideoViewController.remote(
            rtcEngine: _agoraService.engine!,
            canvas: VideoCanvas(uid: activeUid, renderMode: RenderModeType.renderModeHidden),
            connection: RtcConnection(channelId: widget.channelName),
          ),
        );
      }

      // Waiting for broadcaster or Agora video frame
      return _buildStudioVisualizer(isHostPreview: false);
    }
  }

  Widget _buildVideoSurface() {
    return _buildVideoSurfaceSingle(isHost: widget.isHost);
  }

  Widget _buildPKSplitScreen() {
    final hostData = _pkBattle?['host1'] ?? {'displayName': widget.hostName};
    final rival = _pkBattle?['host2'] ?? {
      'displayName': 'Rival Broadcaster',
      'avatarUrl': '',
      'level': 20,
    };
    final hostDisplayName = hostData['displayName'] ?? widget.hostName;
    final rivalDisplayName = rival['displayName'] ?? 'Rival Broadcaster';
    final rivalAvatar = rival['avatarUrl'] as String?;

    final remoteList = _agoraService.remoteUids.toList();
    final int? hostUidForViewer = remoteList.isNotEmpty ? remoteList.first : _remoteUid;
    final int? rivalUidForViewer = remoteList.length > 1 ? remoteList[1] : null;

    return Row(
      children: [
        // Left Half: Host 1 (Person 1)
        Expanded(
          child: Stack(
            fit: StackFit.expand,
            children: [
              if (widget.isHost)
                _buildVideoSurfaceSingle(isHost: true)
              else if (hostUidForViewer != null && _agoraService.engine != null)
                AgoraVideoView(
                  controller: VideoViewController.remote(
                    rtcEngine: _agoraService.engine!,
                    canvas: VideoCanvas(
                      uid: hostUidForViewer,
                      renderMode: RenderModeType.renderModeHidden,
                    ),
                    connection: RtcConnection(channelId: widget.channelName),
                  ),
                )
              else
                _buildStudioVisualizer(isHostPreview: true),

              // Host Name Badge
              Positioned(
                bottom: 8,
                left: 8,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                  decoration: BoxDecoration(
                    color: const Color(0xFF6366F1).withValues(alpha: 0.85),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    children: [
                      const Text('👑 ', style: TextStyle(fontSize: 10)),
                      Text(
                        hostDisplayName,
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 10),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),

        // Center Split Line
        Container(
          width: 2,
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [Color(0xFF6366F1), Color(0xFFEC4899), Color(0xFFF59E0B)],
            ),
          ),
        ),

        // Right Half: Rival (Person 2)
        Expanded(
          child: Stack(
            fit: StackFit.expand,
            children: [
              if (_isRivalBroadcaster)
                _buildVideoSurfaceSingle(isHost: true)
              else if (widget.isHost && _remoteUid != null && _agoraService.engine != null)
                AgoraVideoView(
                  controller: VideoViewController.remote(
                    rtcEngine: _agoraService.engine!,
                    canvas: VideoCanvas(
                      uid: _remoteUid,
                      renderMode: RenderModeType.renderModeHidden,
                    ),
                    connection: RtcConnection(channelId: widget.channelName),
                  ),
                )
              else if (!widget.isHost && rivalUidForViewer != null && _agoraService.engine != null)
                AgoraVideoView(
                  controller: VideoViewController.remote(
                    rtcEngine: _agoraService.engine!,
                    canvas: VideoCanvas(
                      uid: rivalUidForViewer,
                      renderMode: RenderModeType.renderModeHidden,
                    ),
                    connection: RtcConnection(channelId: widget.channelName),
                  ),
                )
              else
                Container(
                  decoration: const BoxDecoration(
                    gradient: RadialGradient(
                      center: Alignment.center,
                      radius: 0.9,
                      colors: [
                        Color(0xFF4C0519), // Deep rose
                        Color(0xFF1E1B4B),
                        Color(0xFF0F172A),
                      ],
                    ),
                  ),
                  child: Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        AnimatedBuilder(
                          animation: _equalizerController,
                          builder: (context, child) {
                            final scale = 1.0 + (_equalizerController.value * 0.08);
                            return Transform.scale(
                              scale: scale,
                              child: Container(
                                padding: const EdgeInsets.all(4),
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  gradient: const LinearGradient(
                                    colors: [Color(0xFFEC4899), Color(0xFFEF4444)],
                                  ),
                                  boxShadow: [
                                    BoxShadow(
                                      color: const Color(0xFFEC4899).withValues(alpha: 0.5),
                                      blurRadius: 16,
                                      spreadRadius: 2,
                                    ),
                                  ],
                                ),
                                child: CircleAvatar(
                                  radius: 34,
                                  backgroundColor: const Color(0xFFEC4899),
                                  backgroundImage: (rivalAvatar != null && rivalAvatar.isNotEmpty)
                                      ? NetworkImage(rivalAvatar)
                                      : null,
                                  child: (rivalAvatar == null || rivalAvatar.isEmpty)
                                      ? Text(
                                          rivalDisplayName.isNotEmpty ? rivalDisplayName[0].toUpperCase() : 'R',
                                          style: const TextStyle(fontSize: 24, color: Colors.white, fontWeight: FontWeight.bold),
                                        )
                                      : null,
                                ),
                              ),
                            );
                          },
                        ),
                        const SizedBox(height: 8),
                        Text(
                          rivalDisplayName,
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.redAccent.withValues(alpha: 0.3),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: Colors.redAccent),
                          ),
                          child: Text('RIVAL ⚔️'.tr, style: TextStyle(color: Colors.redAccent, fontSize: 8, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                  ),
                ),

              // Rival Name Badge
              Positioned(
                bottom: 8,
                right: 8,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEC4899).withValues(alpha: 0.85),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    children: [
                      const Text('⚔️ ', style: TextStyle(fontSize: 10)),
                      Text(
                        rivalDisplayName,
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 10),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildPKHeaderBar() {
    return Positioned(
      top: MediaQuery.of(context).padding.top + 56,
      left: 14,
      right: 14,
      child: Column(
        children: [
          // Tug-of-War Score & Timer Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.75),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.white24),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.6),
                  blurRadius: 12,
                ),
              ],
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Left Host Points (Blue)
                    Row(
                      children: [
                        const Text('💎 ', style: TextStyle(fontSize: 12)),
                        Text(
                          '$_pkHost1Score',
                          style: const TextStyle(
                            color: Color(0xFF818CF8),
                            fontWeight: FontWeight.w900,
                            fontSize: 16,
                          ),
                        ),
                      ],
                    ),

                    // Center VS Timer
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: _pkStatus == 'PUNISHMENT'
                              ? [Colors.orange, Colors.red]
                              : [const Color(0xFF6366F1), const Color(0xFFEC4899)],
                        ),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            _pkStatus == 'PUNISHMENT' ? Icons.warning_amber : Icons.flash_on,
                            color: Colors.white,
                            size: 13,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            _pkStatus == 'PUNISHMENT'
                                ? 'PUNISH ${_formatTimer(_pkRemainingSeconds)}'
                                : 'PK ${_formatTimer(_pkRemainingSeconds)}',
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 11),
                          ),
                        ],
                      ),
                    ),

                    // Right Rival Points (Pink)
                    Row(
                      children: [
                        Text(
                          '$_pkHost2Score',
                          style: const TextStyle(
                            color: Color(0xFFF472B6),
                            fontWeight: FontWeight.w900,
                            fontSize: 16,
                          ),
                        ),
                        const Text(' 💎', style: TextStyle(fontSize: 12)),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 8),

                // Animated Tug-of-War Bar
                ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: Container(
                    height: 8,
                    width: double.infinity,
                    color: const Color(0xFFEC4899),
                    child: FractionallySizedBox(
                      alignment: Alignment.centerLeft,
                      widthFactor: (_pkProgress / 100.0).clamp(0.05, 0.95),
                      child: Container(
                        decoration: const BoxDecoration(
                          gradient: LinearGradient(
                            colors: [Color(0xFF6366F1), Color(0xFF06B6D4)],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Victory / Defeat Announcement in Punishment Phase
          if (_pkStatus == 'PUNISHMENT')
            Container(
              margin: const EdgeInsets.only(top: 6),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFFF59E0B), Color(0xFFEF4444)],
                ),
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFFEF4444).withValues(alpha: 0.6),
                    blurRadius: 10,
                  ),
                ],
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.emoji_events, color: Colors.white, size: 16),
                  const SizedBox(width: 6),
                  Text(
                    _pkIsDraw ? '🤝 DRAW MATCH!' : '🏆 WINNER: ${_pkWinnerName ?? 'Host'}!',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildStudioVisualizer({required bool isHostPreview}) {
    return Container(
      decoration: const BoxDecoration(
        gradient: RadialGradient(
          center: Alignment.center,
          radius: 0.9,
          colors: [
            Color(0xFF1E1B4B), // Deep indigo
            Color(0xFF0F172A), // Slate
            Color(0xFF020617), // Black
          ],
        ),
      ),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Glowing Avatar Ring with Animated Equalizer Pulse
            AnimatedBuilder(
              animation: _equalizerController,
              builder: (context, child) {
                final scale = 1.0 + (_equalizerController.value * 0.08);
                return Transform.scale(
                  scale: scale,
                  child: Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: const LinearGradient(
                        colors: [Color(0xFF6366F1), Color(0xFFEC4899), Color(0xFFF59E0B)],
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF6366F1).withValues(alpha: 0.5),
                          blurRadius: 30,
                          spreadRadius: 4,
                        ),
                      ],
                    ),
                    child: CircleAvatar(
                      radius: 56,
                      backgroundColor: const Color(0xFF6366F1),
                      backgroundImage: (widget.hostAvatarUrl != null && widget.hostAvatarUrl!.isNotEmpty)
                          ? NetworkImage(widget.hostAvatarUrl!)
                          : null,
                      child: (widget.hostAvatarUrl == null || widget.hostAvatarUrl!.isEmpty)
                          ? Text(
                              widget.hostName.isNotEmpty ? widget.hostName[0].toUpperCase() : 'H',
                              style: const TextStyle(fontSize: 32, color: Colors.white, fontWeight: FontWeight.bold),
                            )
                          : null,
                    ),
                  ),
                );
              },
            ),
            const SizedBox(height: 24),
            Text(
              widget.hostName,
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18),
            ),
            const SizedBox(height: 6),
            Text(
              isHostPreview ? 'Studio Camera Initializing...' : 'Live Studio Audio & Stream Active',
              style: TextStyle(color: Colors.grey.shade400, fontSize: 12),
            ),
            const SizedBox(height: 16),

            // Live Audio Equalizer Waveform Bars
            AnimatedBuilder(
              animation: _equalizerController,
              builder: (context, child) {
                return Row(
                  mainAxisSize: MainAxisSize.min,
                  children: List.generate(7, (i) {
                    final height = 12.0 + 26.0 * math.sin((_equalizerController.value * math.pi) + (i * 0.5)).abs();
                    return Container(
                      margin: const EdgeInsets.symmetric(horizontal: 3),
                      width: 4,
                      height: height,
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          begin: Alignment.bottomCenter,
                          end: Alignment.topCenter,
                          colors: [Color(0xFF6366F1), Color(0xFF06B6D4)],
                        ),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    );
                  }),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
