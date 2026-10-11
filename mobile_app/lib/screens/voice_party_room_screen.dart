import 'package:flutter/material.dart';
import 'package:agora_rtc_engine/agora_rtc_engine.dart';
import 'package:image_picker/image_picker.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../theme/app_theme.dart';
import '../services/agora_service.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../widgets/user_avatar_with_frame.dart';
import '../widgets/topup_choice_dialog.dart';
import '../localization/app_locale_service.dart';
import '../localization/translation_service.dart';
import '../widgets/room_games_modal.dart';

class VoicePartyRoomScreen extends StatefulWidget {
  final String channelName;
  final String token;
  final bool isHost;
  final String hostName;
  final String roomTitle;
  final String? coverUrl;

  const VoicePartyRoomScreen({
    super.key,
    required this.channelName,
    required this.token,
    required this.isHost,
    this.hostName = 'Live Host',
    this.roomTitle = 'Live Voice Party 🎙️',
    this.coverUrl,
  });

  @override
  State<VoicePartyRoomScreen> createState() => _VoicePartyRoomScreenState();
}

class _VoicePartyRoomScreenState extends State<VoicePartyRoomScreen> with TickerProviderStateMixin {
  late final AgoraLiveService _agoraService;
  io.Socket? _socket;
  int _viewerCount = 1;
  bool _isJoined = false;
  int _totalDiamonds = 0;
  Map<String, dynamic>? _currentGiftAnimation;
  int? _mySeatIndex;
  bool _isMyMicMuted = false;

  late final AnimationController _pulseController;

  final TextEditingController _chatController = TextEditingController();
  final ScrollController _chatScrollController = ScrollController();
  final List<Map<String, dynamic>> _messages = [];

  // 8 seats: seat 0 is Host, seats 1-7 are Co-hosts
  late List<Map<String, dynamic>> _seats = List.generate(8, (index) {
    return {
      'seatIndex': index,
      'user': index == 0
          ? {
              'id': 'host',
              'displayName': widget.hostName,
              'avatarUrl': widget.coverUrl,
              'level': 1,
            }
          : null,
      'isMuted': false,
      'isLocked': false,
    };
  });
  bool _canExitScreen = false;
  bool _isClosingRoom = false;
  bool _voiceSubsReady = false;
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

  @override
  void initState() {
    super.initState();
    _agoraService = AgoraLiveService();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat(reverse: true);

    if (widget.isHost) {
      _mySeatIndex = 0;
    }

    _initVoiceRoom();
    _initWebSocket();
  }

  Future<void> _initVoiceRoom() async {
    // Subscribe BEFORE joining so join/remote-user events are never missed.
    if (!_voiceSubsReady) {
      _voiceSubsReady = true;

      _agoraService.onChannelJoined.listen((joined) {
        if (mounted) {
          setState(() {
            _isJoined = joined;
          });
        }
      });

      _agoraService.onRemoteUserOffline.listen((offlineUid) {
        // Only auto-exit an audience member when the last publisher (host) is gone.
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
              content: Text('Reconnecting to voice party…'.tr),
            ),
          );
        } else if (state == ConnectionStateType.connectionStateFailed) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              backgroundColor: Colors.redAccent,
              content: Text('Voice connection lost.'.tr),
            ),
          );
          _closeRoomImmediately();
        }
      });
    }

    try {
      await _agoraService.joinVoiceRoom(
        channelName: widget.channelName,
        token: widget.token,
        isSpeaker: widget.isHost,
      );
    } catch (e) {
      debugPrint('Error joining Agora voice room: $e');
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

      void sendVoiceJoin() {
        final currentUser = AuthService().currentUser;
        _socket!.emit('room:join', {
          'roomId': widget.channelName,
          'userId': widget.isHost ? (currentUser?.id ?? 'host_me') : (currentUser?.id ?? 'user_${DateTime.now().millisecondsSinceEpoch}'),
          'displayName': widget.isHost ? widget.hostName : (currentUser?.displayName ?? 'Party Guest'),
          'isVoice': true,
        });
      }

      _socket!.onConnect((_) {
        debugPrint('🔌 Connected to Voice Signaling Server');
        sendVoiceJoin();
      });

      _socket!.on('reconnect', (_) {
        debugPrint('🔄 Voice Signaling Socket Reconnected: Rejoining room ${widget.channelName}');
        sendVoiceJoin();
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

      _socket!.on('voice:seats:sync', (data) {
        if (mounted && data != null && data['seats'] != null) {
          setState(() {
            _seats = List<Map<String, dynamic>>.from(data['seats']);
            // Check if current user is still on seat
            if (_mySeatIndex != null && _mySeatIndex != 0) {
              final mySeat = _seats.firstWhere(
                (s) => s['seatIndex'] == _mySeatIndex,
                orElse: () => {},
              );
              if (mySeat['user'] == null) {
                // We were kicked or stepped down
                _mySeatIndex = null;
                _agoraService.updateSpeakerRole(false);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    backgroundColor: Colors.orangeAccent,
                    content: Text('You stepped down or were removed from the mic seat.'.tr),
                  ),
                );
              }
            }
          });
        }
      });

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

          // Real-time dynamic auto-translation for voice party chat
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
          Future.delayed(const Duration(milliseconds: 3800), () {
            if (mounted && _currentGiftAnimation?['id'] == giftData['id']) {
              setState(() {
                _currentGiftAnimation = null;
              });
            }
          });
        }
      });

      _socket!.on('room:game_result', (data) {
        if (mounted && data != null) {
          final gameData = Map<String, dynamic>.from(data);
          final pName = gameData['playerName'] ?? 'Player';
          final gName = gameData['gameName'] ?? 'Mini-Game';
          final payout = gameData['payoutCoins'] ?? 0;
          final mult = gameData['multiplier'] ?? 1.0;

          setState(() {
            _messages.add({
              'isSystem': true,
              'text': '🎰 $pName won $payout 🪙 on $gName (${mult}x)! 🎉',
              'sender': {'displayName': 'Casino Dealer'},
            });
          });
          _scrollToBottom();
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
      debugPrint('Voice WebSocket connection error: $e');
    }
  }

  Future<void> _sendImageMessage() async {
    final currentUser = AuthService().currentUser;
    final isVip = (currentUser?.vipLevel ?? 0) >= 1;
    if (!isVip) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('👑 Sending photos in party rooms is a VIP 1 privilege. Spend \$500/mo to unlock.'.tr),
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
            'displayName': widget.isHost ? widget.hostName : (currentUser?.displayName ?? 'Guest'),
            'customId': currentUser?.customId,
            'vipLevel': currentUser?.vipLevel ?? 0,
            'level': widget.isHost ? 35 : (currentUser?.level ?? 1),
            'chatBubbleStyle': 'vip_photo',
            'avatarUrl': currentUser?.avatarUrl,
          },
          'text': '📷 Shared a photo',
          'imageUrl': ApiService.getFullImageUrl(uploadedUrl),
        });
      }
    } catch (e) {
      debugPrint('Error sending party photo: $e');
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
        'displayName': widget.isHost ? widget.hostName : (currentUser?.displayName ?? (_mySeatIndex != null ? 'Speaker #$_mySeatIndex' : 'Guest')),
        'customId': currentUser?.customId,
        'vipLevel': currentUser?.vipLevel ?? 0,
        'level': widget.isHost ? 35 : (currentUser?.level ?? 1),
        'avatarUrl': currentUser?.avatarUrl,
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

  // Action on tapping a seat
  void _handleSeatTap(int seatIndex) {
    final seat = _seats.firstWhere((s) => s['seatIndex'] == seatIndex);
    final user = seat['user'];
    final isLocked = seat['isLocked'] == true;

    if (seatIndex == 0) {
      // Host seat
      if (widget.isHost) {
        _toggleHostMic();
      } else {
        _showGiftDialog(preselectedSeatIndex: 0);
      }
      return;
    }

    if (user != null) {
      // Seat is occupied
      if (_mySeatIndex == seatIndex) {
        // Tapped my own seat -> Options to mute or leave
        _showMySeatOptions(seatIndex);
      } else if (widget.isHost) {
        // Host taps someone else's seat -> Moderation controls
        _showHostModerationOptions(seatIndex, user['displayName'] ?? 'User');
      } else {
        // Send gift to this speaker
        _showGiftDialog(preselectedSeatIndex: seatIndex);
      }
    } else {
      // Seat is empty
      if (isLocked) {
        if (widget.isHost) {
          _socket?.emit('voice:seat:lock', {
            'roomId': widget.channelName,
            'seatIndex': seatIndex,
            'isLocked': false,
          });
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Seat #$seatIndex unlocked.'.tr)),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('This seat is locked by the host.'.tr)),
          );
        }
      } else {
        // Seat is unlocked and empty
        if (_mySeatIndex != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('You are already seated on a mic! Step down first.'.tr)),
          );
        } else {
          _takeSeat(seatIndex);
        }
      }
    }
  }

  Future<void> _takeSeat(int seatIndex) async {
    setState(() {
      _mySeatIndex = seatIndex;
    });

    // Upgrade Agora audio role to Broadcaster (mic active)
    await _agoraService.updateSpeakerRole(true);

    final currentUser = AuthService().currentUser;
    _socket?.emit('voice:seat:occupy', {
      'roomId': widget.channelName,
      'seatIndex': seatIndex,
      'user': {
        'id': currentUser?.id ?? 'user_${DateTime.now().millisecondsSinceEpoch}',
        'displayName': currentUser?.displayName ?? 'Speaker #$seatIndex',
        'avatarUrl': currentUser?.avatarUrl,
        'level': currentUser?.level ?? 14,
      },
    });

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: const Color(0xFF10B981),
          content: Text('You took mic seat #$seatIndex! Your microphone is now live.'.tr),
        ),
      );
    }
  }

  Future<void> _leaveSeat(int seatIndex) async {
    setState(() {
      _mySeatIndex = null;
    });

    // Demote Agora role back to Audience
    await _agoraService.updateSpeakerRole(false);

    _socket?.emit('voice:seat:leave', {
      'roomId': widget.channelName,
      'seatIndex': seatIndex,
    });
  }

  void _toggleHostMic() async {
    await _agoraService.toggleAudioMute();
    if (!mounted) return;
    setState(() {
      _isMyMicMuted = _agoraService.isMuted;
    });
    _socket?.emit('voice:seat:mute', {
      'roomId': widget.channelName,
      'seatIndex': 0,
      'isMuted': _isMyMicMuted,
    });
  }

  void _showMySeatOptions(int seatIndex) {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF111827),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Mic Seat #$seatIndex Controls'.tr, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            ListTile(
              leading: Icon(_isMyMicMuted ? Icons.mic : Icons.mic_off, color: const Color(0xFF6366F1)),
              title: Text((_isMyMicMuted ? 'Unmute Microphone' : 'Mute Microphone').tr),
              onTap: () async {
                Navigator.pop(ctx);
                await _agoraService.toggleAudioMute();
                if (!mounted) return;
                setState(() {
                  _isMyMicMuted = _agoraService.isMuted;
                });
                _socket?.emit('voice:seat:mute', {
                  'roomId': widget.channelName,
                  'seatIndex': seatIndex,
                  'isMuted': _isMyMicMuted,
                });
              },
            ),
            ListTile(
              leading: const Icon(Icons.arrow_downward, color: Colors.redAccent),
              title: Text('Step Down from Mic'.tr, style: TextStyle(color: Colors.redAccent)),
              onTap: () {
                Navigator.pop(ctx);
                _leaveSeat(seatIndex);
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showHostModerationOptions(int seatIndex, String guestName) {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF111827),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Manage $guestName (Seat #$seatIndex)'.tr, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            ListTile(
              leading: const Icon(Icons.mic_off, color: Colors.amberAccent),
              title: Text('Mute Guest'.tr),
              onTap: () {
                Navigator.pop(ctx);
                _socket?.emit('voice:seat:mute', {
                  'roomId': widget.channelName,
                  'seatIndex': seatIndex,
                  'isMuted': true,
                });
              },
            ),
            ListTile(
              leading: const Icon(Icons.person_remove, color: Colors.redAccent),
              title: Text('Kick from Mic Seat'.tr, style: TextStyle(color: Colors.redAccent)),
              onTap: () {
                Navigator.pop(ctx);
                _socket?.emit('voice:seat:kick', {
                  'roomId': widget.channelName,
                  'seatIndex': seatIndex,
                });
              },
            ),
            ListTile(
              leading: const Icon(Icons.lock, color: Colors.grey),
              title: Text('Lock Mic Seat'.tr),
              onTap: () {
                Navigator.pop(ctx);
                _socket?.emit('voice:seat:lock', {
                  'roomId': widget.channelName,
                  'seatIndex': seatIndex,
                  'isLocked': true,
                });
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showGiftDialog({int? preselectedSeatIndex}) {
    int targetSeat = preselectedSeatIndex ?? 0;

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

        return StatefulBuilder(
          builder: (context, setModalState) {
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
                            'Send Virtual Gift to Stage'.tr,
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
                      const SizedBox(height: 12),
                      // Select target seat
                      Text('Select Recipient on Stage:'.tr, style: const TextStyle(color: Colors.grey, fontSize: 12)),
                      const SizedBox(height: 6),
                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: List.generate(8, (index) {
                            final seat = _seats.firstWhere((s) => s['seatIndex'] == index, orElse: () => {});
                            final label = (index == 0 ? 'Host 👑' : 'Seat #$index').tr;
                            final isOccupied = seat['user'] != null;
                            final isSelected = targetSeat == index;

                            return Padding(
                              padding: const EdgeInsets.only(right: 8),
                              child: ChoiceChip(
                                label: Text(label),
                                selected: isSelected,
                                selectedColor: const Color(0xFF6366F1),
                                backgroundColor: const Color(0xFF1F2937),
                                labelStyle: TextStyle(
                                  color: isSelected ? Colors.white : (isOccupied ? Colors.white70 : Colors.grey),
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                ),
                                onSelected: (selected) {
                                  if (selected) {
                                    setModalState(() {
                                      targetSeat = index;
                                    });
                                  }
                                },
                              ),
                            );
                          }),
                        ),
                      ),
                      const SizedBox(height: 16),
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

                              try {
                                final res = await ApiService().sendGift(
                                  roomId: widget.channelName,
                                  giftId: gift['id'] as String,
                                  quantity: 1,
                                  senderId: currentUser?.id,
                                  targetSeatIndex: targetSeat,
                                );

                                if (res != null && res['remainingCoins'] != null) {
                                  await AuthService().updateBalances(
                                    coins: (res['remainingCoins'] as num).toInt(),
                                  );
                                }

                                if (mounted) {
                                  ScaffoldMessenger.of(this.context).showSnackBar(
                                    SnackBar(
                                      backgroundColor: const Color(0xFF10B981),
                                      content: Row(
                                        children: [
                                          const Icon(Icons.check_circle, color: Colors.white, size: 18),
                                          const SizedBox(width: 8),
                                          Text('${'Sent'.tr} ${(gift['name'] as String).tr} ${'to Seat'.tr} #$targetSeat (-$cost 🪙)! ✨'),
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
                            child: Container(
                              decoration: BoxDecoration(
                                color: LiveColors.backgroundElevated,
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(
                                  color: minVip > 0 ? const Color(0xFFF59E0B).withValues(alpha: 0.5) : LiveColors.border,
                                  width: minVip > 0 ? 1.5 : 1.0,
                                ),
                              ),
                              child: Stack(
                                children: [
                                  Center(
                                    child: Column(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Icon(gift['icon'] as IconData, color: gift['color'] as Color, size: 28),
                                        const SizedBox(height: 6),
                                        Padding(
                                          padding: const EdgeInsets.symmetric(horizontal: 4),
                                          child: Text(
                                            (gift['name'] as String).tr,
                                            style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold),
                                            textAlign: TextAlign.center,
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          '${gift['coins']} 🪙',
                                          style: const TextStyle(fontSize: 10, color: Color(0xFFF59E0B), fontWeight: FontWeight.bold),
                                        ),
                                      ],
                                    ),
                                  ),
                                  if (minVip > 0)
                                    Positioned(
                                      top: 4,
                                      right: 4,
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                                        decoration: BoxDecoration(
                                          gradient: const LinearGradient(
                                            colors: [Color(0xFFF59E0B), Color(0xFFEF4444)],
                                          ),
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: Text(
                                          'VIP $minVip',
                                          style: const TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.bold),
                                        ),
                                      ),
                                    ),
                                ],
                              ),
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

  @override
  void dispose() {
    _pulseController.dispose();
    _socket?.emit('room:leave', {'roomId': widget.channelName});
    _socket?.disconnect();
    _socket?.dispose();
    _agoraService.leave();
    _agoraService.dispose();
    _chatController.dispose();
    _chatScrollController.dispose();
    super.dispose();
  }

  Future<bool> _confirmAndExitStream() async {
    final shouldClose = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        backgroundColor: LiveColors.backgroundSurface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: LiveColors.border),
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
              (widget.isHost ? 'End Voice Party?' : 'Leave Voice Party?').tr,
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
            ),
          ],
        ),
        content: Text(
          (widget.isHost
              ? 'Are you sure you want to end this voice lounge? The room will be closed for all guests on stage and listeners.'
              : 'Are you sure you want to leave this voice room and return to the lobby?').tr,
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
              (widget.isHost ? 'Yes, End Room' : 'Yes, Leave').tr,
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

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: _canExitScreen,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        _confirmAndExitStream();
      },
      child: Scaffold(
        backgroundColor: LiveColors.backgroundPrimary,
        body: Stack(
          children: [
          // Background Gradient Ambience
          Positioned.fill(
            child: Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Color(0xFF2E1054), // Deep royal purple night
                    LiveColors.backgroundSurface, // Rich purple surface
                    LiveColors.backgroundPrimary, // Midnight purple dark
                  ],
                ),
              ),
            ),
          ),

          // Top Header Bar
          Positioned(
            top: MediaQuery.of(context).padding.top + 8,
            left: 16,
            right: 16,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Room info pill
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.5),
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: Colors.white24),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const CircleAvatar(
                        radius: 14,
                        backgroundColor: Color(0xFF6366F1),
                        child: Icon(Icons.mic, size: 16, color: Colors.white),
                      ),
                      const SizedBox(width: 8),
                      ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 100),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              widget.roomTitle,
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.white),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            Text(
                              'Host: ${widget.hostName}',
                              style: const TextStyle(fontSize: 10, color: Colors.grey),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: _isJoined ? const Color(0xFF10B981) : const Color(0xFF8B5CF6),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          _isJoined ? 'VOICE ON 🎙️' : 'CONNECTING...',
                          style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                ),

                // Diamonds & Audience Count & Exit
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.5),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        children: [
                          const Text('💎', style: TextStyle(fontSize: 11)),
                          const SizedBox(width: 4),
                          Text(
                            '$_totalDiamonds',
                            style: const TextStyle(color: Color(0xFF06B6D4), fontSize: 11, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.5),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.headset, size: 14, color: Colors.white),
                          const SizedBox(width: 4),
                          Text(
                            '$_viewerCount',
                            style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 6),
                    IconButton(
                      icon: const Icon(Icons.close, color: Colors.white, size: 24),
                      onPressed: _confirmAndExitStream,
                    ),
                  ],
                ),
              ],
            ),
          ),

          // 8-Seat Voice Stage (Middle)
          Positioned(
            top: MediaQuery.of(context).padding.top + 70,
            left: 16,
            right: 16,
            child: _buildEightSeatGrid(),
          ),

          // Live Chat Messages (Bottom Left)
          Positioned(
            left: 16,
            bottom: MediaQuery.of(context).padding.bottom + 104,
            width: MediaQuery.of(context).size.width * 0.75,
            height: 165,
            child: ListView.builder(
              controller: _chatScrollController,
              padding: EdgeInsets.zero,
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final msg = _messages[index];
                final isSystem = msg['isSystem'] == true;
                final isGift = msg['isGift'] == true;
                final sender = msg['sender']?['displayName'] ?? 'Guest';
                final rawText = (msg['text'] ?? '').toString();
                final translatedText = msg['translatedText'] as String?;
                final isTranslated = msg['isTranslated'] == true && translatedText != null && translatedText.isNotEmpty;
                final displayText = isTranslated ? translatedText : rawText;

                final senderVip = (msg['sender']?['vipLevel'] ?? msg['vipLevel'] ?? 0) as int;
                final senderCustomId = (msg['sender']?['customId'] ?? msg['customId']) as String?;
                final imageUrl = msg['imageUrl'] as String?;

                Color senderColor = const Color(0xFF6366F1);
                if (isSystem) senderColor = Colors.amberAccent;
                if (isGift) senderColor = const Color(0xFFEC4899);

                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 3),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: isGift
                          ? const Color(0xFFEC4899).withValues(alpha: 0.25)
                          : isSystem
                              ? Colors.indigo.withValues(alpha: 0.3)
                              : (senderVip >= 1 ? const Color(0xFF1E1B4B).withValues(alpha: 0.75) : Colors.black.withValues(alpha: 0.45)),
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
                                        color: senderColor,
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

          // Bottom Two-Row Action Controls Bar
          Positioned(
            left: 12,
            right: 12,
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
                      // Left Section: Mic Control (if seated or host) / Lounge Status
                      if (_mySeatIndex != null || widget.isHost) ...[
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 38,
                              height: 38,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: _isMyMicMuted ? Colors.redAccent : const Color(0xFF10B981),
                                boxShadow: [
                                  BoxShadow(
                                    color: (_isMyMicMuted ? Colors.redAccent : const Color(0xFF10B981)).withValues(alpha: 0.45),
                                    blurRadius: 8,
                                    spreadRadius: 1,
                                  ),
                                ],
                              ),
                              child: IconButton(
                                padding: EdgeInsets.zero,
                                icon: Icon(_isMyMicMuted ? Icons.mic_off_rounded : Icons.mic_rounded, color: Colors.white, size: 20),
                                tooltip: _isMyMicMuted ? 'Unmute Mic'.tr : 'Mute Mic'.tr,
                                onPressed: widget.isHost ? _toggleHostMic : () => _showMySeatOptions(_mySeatIndex!),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              widget.isHost ? 'Host Mic'.tr : 'Seat #${_mySeatIndex! + 1}'.tr,
                              style: const TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                      ] else ...[
                        // Audience status badge
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
                                  color: Color(0xFF8B5CF6),
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(width: 6),
                              Text(
                                'VOICE LOUNGE'.tr,
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

                      // Right Section: Mini Games & Luxury Gift Buttons
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
                          const SizedBox(width: 8),

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
                              onPressed: () => _showGiftDialog(),
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

          // Luxury Gift Overlay Animation
          if (_currentGiftAnimation != null)
            _buildLuxuryGiftOverlay(),
        ],
      ),
    ),
  );
}

  // 8-Seat Voice Grid Layout
  Widget _buildEightSeatGrid() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF111827).withValues(alpha: 0.65),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.4),
            blurRadius: 20,
            spreadRadius: 2,
          ),
        ],
      ),
      child: Column(
        children: [
          // Row 1: Seats 0 (Host), 1, 2, 3
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildSeatItem(0),
              _buildSeatItem(1),
              _buildSeatItem(2),
              _buildSeatItem(3),
            ],
          ),
          const SizedBox(height: 18),
          // Row 2: Seats 4, 5, 6, 7
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildSeatItem(4),
              _buildSeatItem(5),
              _buildSeatItem(6),
              _buildSeatItem(7),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSeatItem(int seatIndex) {
    final seat = _seats.firstWhere((s) => s['seatIndex'] == seatIndex, orElse: () => {'seatIndex': seatIndex});
    final user = seat['user'];
    final isLocked = seat['isLocked'] == true;
    final isMuted = seat['isMuted'] == true;
    final isHostSeat = seatIndex == 0;
    final isMySeat = _mySeatIndex == seatIndex;

    return GestureDetector(
      onTap: () => _handleSeatTap(seatIndex),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Stack(
            alignment: Alignment.center,
            children: [
              // Pulse effect when user is present & speaking
              if (user != null && !isMuted)
                AnimatedBuilder(
                  animation: _pulseController,
                  builder: (context, child) {
                    final scale = 1.0 + (_pulseController.value * 0.15);
                    return Transform.scale(
                      scale: scale,
                      child: Container(
                        width: 58,
                        height: 58,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: isHostSeat ? const Color(0xFFF59E0B) : const Color(0xFF6366F1),
                            width: 2,
                          ),
                        ),
                      ),
                    );
                  },
                ),

              // Avatar / Mic Container
              if (user != null)
                UserAvatarWithFrame(
                  avatarUrl: user['avatarUrl'],
                  level: (user['level'] ?? (isHostSeat ? 5 : 1)) as int,
                  size: 48,
                  showBadge: true,
                )
              else
                Container(
                  width: 50,
                  height: 50,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: LiveColors.backgroundElevated,
                    border: Border.all(
                      color: isMySeat ? LiveColors.primaryAccent : Colors.white24,
                      width: 1.5,
                    ),
                  ),
                  child: Center(
                    child: Icon(
                      isLocked ? Icons.lock : Icons.mic_none,
                      color: isLocked ? Colors.redAccent : Colors.white38,
                      size: 20,
                    ),
                  ),
                ),

              // Host Crown on Seat #0
              if (isHostSeat)
                Positioned(
                  top: -6,
                  child: const Text('👑', style: TextStyle(fontSize: 14)),
                ),

              // Seat number badge if empty
              if (user == null && !isLocked)
                Positioned(
                  bottom: 0,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                    decoration: BoxDecoration(
                      color: Colors.black87,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      '#$seatIndex',
                      style: const TextStyle(fontSize: 8, color: Colors.white70, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),

              // Mute indicator badge
              if (isMuted)
                Positioned(
                  bottom: 0,
                  right: 0,
                  child: Container(
                    padding: const EdgeInsets.all(3),
                    decoration: const BoxDecoration(
                      color: Colors.redAccent,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.mic_off, color: Colors.white, size: 10),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 6),
          // User Name / Seat Status label
          SizedBox(
            width: 70,
            child: Text(
              user != null
                  ? (isHostSeat ? '👑 Host' : (user['displayName'] ?? 'Seat #$seatIndex'))
                  : (isLocked ? 'Locked' : 'Mic #$seatIndex'),
              textAlign: TextAlign.center,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 11,
                fontWeight: isHostSeat || isMySeat ? FontWeight.bold : FontWeight.normal,
                color: isHostSeat
                    ? const Color(0xFFF59E0B)
                    : isMySeat
                        ? const Color(0xFF10B981)
                        : (user != null ? Colors.white : Colors.grey),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLuxuryGiftOverlay() {
    final giftName = _currentGiftAnimation!['name'] ?? 'Luxury Gift';
    final senderName = _currentGiftAnimation!['sender']?['displayName'] ?? 'Party Supporter';
    final targetSeat = _currentGiftAnimation!['targetSeatIndex'];
    final diamonds = _currentGiftAnimation!['diamondsAwarded'] ?? 42;

    final targetText = targetSeat != null
        ? (targetSeat == 0 ? ' to Host 👑' : ' to Seat #$targetSeat')
        : '';

    return Positioned(
      top: MediaQuery.of(context).size.height * 0.44,
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
                      '$senderName sent a gift$targetText!',
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
}
