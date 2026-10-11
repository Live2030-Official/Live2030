import 'dart:io';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'localization/app_localizations.dart';
import 'localization/app_locale_service.dart';
import 'localization/translation_service.dart';
import 'localization/language_selection_sheet.dart';
import 'screens/agency_center_screen.dart';
import 'screens/auth_screen.dart';
import 'screens/contact_us_screen.dart';
import 'screens/earnings_report_screen.dart';
import 'screens/games_center_screen.dart';
import 'screens/live_room_screen.dart';
import 'screens/onboarding_screen.dart';
import 'screens/voice_party_room_screen.dart';
import 'screens/social_feed_screen.dart';
import 'screens/user_content_screen.dart';
import 'screens/user_relationships_screen.dart';
import 'screens/legal_policy_screen.dart';
import 'screens/notifications_screen.dart';
import 'services/api_service.dart';
import 'services/auth_service.dart';
import 'services/level_service.dart';
import 'widgets/user_avatar_with_frame.dart';
import 'widgets/level_celebration_dialog.dart';
import 'widgets/user_moderation_dialog.dart';
import 'package:flutter_native_splash/flutter_native_splash.dart';
import 'widgets/topup_choice_dialog.dart';
import 'theme/app_theme.dart';

void main() async {
  final widgetsBinding = WidgetsFlutterBinding.ensureInitialized();
  FlutterNativeSplash.preserve(widgetsBinding: widgetsBinding);

  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
    ),
  );

  try {
    await Firebase.initializeApp();
  } catch (e) {
    debugPrint('Firebase.initializeApp safe fallback: $e');
  }

  await AuthService().init();
  await LevelService().init();
  await AppLocaleService().init();
  await TranslationService().init();

  // Seamless transition from native splash to Flutter UI
  FlutterNativeSplash.remove();
  runApp(const Live2030App());
}

class Live2030App extends StatefulWidget {
  const Live2030App({super.key});

  @override
  State<Live2030App> createState() => _Live2030AppState();
}

class _Live2030AppState extends State<Live2030App> {
  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: AppLocaleService(),
      builder: (context, _) {
        final activeLocale = AppLocaleService().locale;

        return MaterialApp(
          key: ValueKey('live2030_app_${activeLocale.languageCode}_${AppLocaleService().rebuildKey}'),
          title: 'Live2030',
          debugShowCheckedModeBanner: false,
          theme: AppTheme.darkTheme,
          locale: activeLocale,
          supportedLocales: AppLocaleService.supportedLocales,
          builder: (context, child) {
            return Directionality(
              textDirection: AppLocaleService().isRtl ? TextDirection.rtl : TextDirection.ltr,
              child: child!,
            );
          },
          localizationsDelegates: const [
            AppLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          home: !AuthService().isAuthenticated
              ? AuthScreen(onLoginSuccess: () => setState(() {}))
              : (!AuthService().isOnboardingCompleted
                  ? OnboardingScreen(onComplete: () => setState(() {}))
                  : MainNavigationScreen(onLogout: () => setState(() {}))),
        );
      },
    );
  }
}

class MainNavigationScreen extends StatefulWidget {
  final VoidCallback onLogout;

  const MainNavigationScreen({super.key, required this.onLogout});

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  int _currentIndex = 0;
  io.Socket? _globalSocket;
  bool _isModerationDialogShowing = false;

  @override
  void initState() {
    super.initState();
    _initGlobalSocket();
    AuthService().addListener(_onAuthUpdate);
    AppLocaleService().addListener(_onLocaleChanged);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      AuthService().checkModerationStatus().then((_) {
        _checkAndShowModerationDialog();
      });
    });
  }

  void _onLocaleChanged() {
    if (mounted) setState(() {});
  }

  void _onAuthUpdate() {
    if (AuthService().hasActiveModerationPenalty) {
      _checkAndShowModerationDialog();
    }
  }

  void _checkAndShowModerationDialog() {
    if (!mounted) return;
    if (AuthService().hasActiveModerationPenalty && !_isModerationDialogShowing) {
      _isModerationDialogShowing = true;
      UserModerationDialog.show(context).then((_) {
        _isModerationDialogShowing = false;
      });
    }
  }

  void _initGlobalSocket() {
    try {
      final socketUrl = '${ApiService.baseUrl}/live';
      _globalSocket = io.io(
        socketUrl,
        io.OptionBuilder()
            .setTransports(['websocket', 'polling'])
            .enableAutoConnect()
            .enableReconnection()
            .setReconnectionDelay(2000)
            .build(),
      );

      _globalSocket!.onConnect((_) {
        debugPrint('⚡ [Global Socket] Connected to $socketUrl');
        final user = AuthService().currentUser;
        if (user != null) {
          _globalSocket!.emit('user:register', {'userId': user.id});
          _globalSocket!.emit('user:join', {'userId': user.id});
        }
      });

      _globalSocket!.on('reconnect', (_) {
        final user = AuthService().currentUser;
        if (user != null) {
          _globalSocket!.emit('user:register', {'userId': user.id});
          _globalSocket!.emit('user:join', {'userId': user.id});
        }
      });

      // Real-time Moderation Enforcement pushed by Admin Dashboard
      _globalSocket!.on('user:moderation_action', (data) {
        debugPrint('🚨 [Global Socket] user:moderation_action received: $data');
        if (data is Map) {
          final targetUserId = data['userId'];
          final currentUserId = AuthService().currentUser?.id;
          if (targetUserId == currentUserId || targetUserId == null) {
            final newStatus = data['status']?.toString() ?? 'SUSPENDED_24H';
            final reason = data['reason']?.toString();
            final suspensionUntil = data['suspensionUntil']?.toString();
            final isBanned = data['isBanned'] == true || newStatus == 'BANNED';

            AuthService().setModerationState(
              status: newStatus,
              reason: reason,
              suspensionUntil: suspensionUntil,
              isBanned: isBanned,
            );

            if (mounted && (isBanned || newStatus.startsWith('SUSPENDED_'))) {
              _checkAndShowModerationDialog();
            }
          }
        }
      });

      _globalSocket!.on('wallet:balance_update', (data) {
        if (data != null) {
          final current = AuthService().currentUser;
          final targetUserId = data['userId'];
          if (current != null && (targetUserId == null || targetUserId == current.id)) {
            debugPrint('💰 [Global Socket] Wallet update received: ${data['coins']} coins, ${data['diamonds']} diamonds');
            AuthService().updateBalances(
              coins: (data['coins'] as num?)?.toInt(),
              diamonds: (data['diamonds'] as num?)?.toInt(),
            );
          }
        }
      });

      // Real-time Level Configuration & Asset updates pushed by Admin Dashboard
      _globalSocket!.on('level_config_updated', (data) {
        if (data != null) {
          debugPrint('👑 [Global Socket] level_config_updated received: $data');
          LevelService().onLevelConfigUpdated(Map<String, dynamic>.from(data));
        }
      });

      // Real-time User Level-Up & Test Celebration broadcast
      _globalSocket!.on('user_level_up', _handleUserLevelUp);
      _globalSocket!.on('user:level_up', _handleUserLevelUp);
    } catch (e) {
      debugPrint('Error initializing global socket: $e');
    }
  }

  void _handleUserLevelUp(dynamic data) {
    if (data == null) return;
    debugPrint('🎉 [Global Socket] level-up received: $data');
    final map = Map<String, dynamic>.from(data);
    LevelService().onUserLevelUp(map);
    if (mounted) {
      final level = (map['newLevel'] ?? map['level'] ?? 1) as int;
      LevelCelebrationDialog.show(
        context,
        level: level,
        title: map['title'] as String?,
        perks: (map['perks'] as List?)?.map((e) => e.toString()).toList(),
        lottieUrl: map['lottieUrl'] as String?,
      );
    }
  }

  @override
  void dispose() {
    AuthService().removeListener(_onAuthUpdate);
    AppLocaleService().removeListener(_onLocaleChanged);
    try {
      _globalSocket?.disconnect();
      _globalSocket?.dispose();
    } catch (_) {}
    super.dispose();
  }

  void _openBroadcastStudioModal() {
    String selectedMode = 'VIDEO'; // 'VIDEO' or 'VOICE'
    final titleController = TextEditingController(text: 'Star Live Party & Music Vibes ✨');
    String selectedTag = 'Music 🎸';
    bool isStarting = false;
    XFile? pickedCoverFile;
    bool isLockedRoom = false;
    final pinController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF111827),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          final user = AuthService().currentUser;

          return SafeArea(
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
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                gradient: const LinearGradient(
                                  colors: [Color(0xFF6366F1), Color(0xFFEC4899)],
                                ),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Icon(Icons.videocam, color: Colors.white, size: 22),
                            ),
                            const SizedBox(width: 12),
                            Text(
                              'Go Live Broadcast Studio'.tr,
                              style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: Colors.white),
                            ),
                          ],
                        ),
                        IconButton(
                          icon: const Icon(Icons.close, color: Colors.grey),
                          onPressed: () => Navigator.pop(ctx),
                        ),
                      ],
                    ),
                    const SizedBox(height: 18),
                    Text('Select Broadcast Mode:'.tr, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey)),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: GestureDetector(
                            onTap: () => setModalState(() => selectedMode = 'VIDEO'),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              decoration: BoxDecoration(
                                gradient: selectedMode == 'VIDEO'
                                    ? const LinearGradient(colors: [Color(0xFF6366F1), Color(0xFF4F46E5)])
                                    : null,
                                color: selectedMode == 'VIDEO' ? null : const Color(0xFF1F2937),
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(
                                  color: selectedMode == 'VIDEO' ? const Color(0xFF818CF8) : Colors.white10,
                                  width: 1.5,
                                ),
                              ),
                              child: Column(
                                children: [
                                  const Icon(Icons.camera_alt, color: Colors.white, size: 24),
                                  const SizedBox(height: 6),
                                  Text('Video Live 📹'.tr, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.white)),
                                  Text('Sub-300ms RTC'.tr, style: const TextStyle(fontSize: 10, color: Colors.white70)),
                                ],
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: GestureDetector(
                            onTap: () => setModalState(() => selectedMode = 'VOICE'),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              decoration: BoxDecoration(
                                gradient: selectedMode == 'VOICE'
                                    ? const LinearGradient(colors: [Color(0xFF8B5CF6), Color(0xFF7C3AED)])
                                    : null,
                                color: selectedMode == 'VOICE' ? null : const Color(0xFF1F2937),
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(
                                  color: selectedMode == 'VOICE' ? const Color(0xFFA78BFA) : Colors.white10,
                                  width: 1.5,
                                ),
                              ),
                              child: Column(
                                children: [
                                  const Icon(Icons.mic, color: Colors.white, size: 24),
                                  const SizedBox(height: 6),
                                  Text('8-Seat Voice 🎙️'.tr, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.white)),
                                  Text('Audio Stage Party'.tr, style: const TextStyle(fontSize: 10, color: Colors.white70)),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 18),
                    Text('Room Title:'.tr, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey)),
                    const SizedBox(height: 8),
                    TextField(
                      controller: titleController,
                      style: const TextStyle(color: Colors.white, fontSize: 13),
                      decoration: InputDecoration(
                        filled: true,
                        fillColor: const Color(0xFF1F2937),
                        hintText: 'Enter room title...'.tr,
                        hintStyle: const TextStyle(color: Colors.grey),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
                        prefixIcon: const Icon(Icons.edit, color: Color(0xFF6366F1), size: 18),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text('Category Tag:'.tr, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey)),
                    const SizedBox(height: 8),
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: ['Music 🎸', 'Chat & Chill ☕', 'Gaming 🎮', 'Talent Show ⭐', 'Global Friends 🌍'].map((tag) {
                          final isSelected = selectedTag == tag;
                          return Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: ChoiceChip(
                              label: Text(tag.tr),
                              selected: isSelected,
                              selectedColor: const Color(0xFF6366F1),
                              backgroundColor: const Color(0xFF1F2937),
                              labelStyle: TextStyle(
                                color: isSelected ? Colors.white : Colors.grey,
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                              ),
                              onSelected: (selected) {
                                if (selected) {
                                  setModalState(() => selectedTag = tag);
                                }
                              },
                            ),
                          );
                        }).toList(),
                      ),
                    ),

                    // Room Cover Selection (VIP / Host Privilege)
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Room Cover Photo:'.tr, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey)),
                        if (user?.isVip == true)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(colors: [Color(0xFF3B82F6), Color(0xFF8B5CF6)]),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Text('VIP PRIVILEGE', style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold)),
                          ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    GestureDetector(
                      onTap: () async {
                        final picker = ImagePicker();
                        final img = await picker.pickImage(source: ImageSource.gallery, imageQuality: 85);
                        if (img != null) {
                          setModalState(() => pickedCoverFile = img);
                        }
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1F2937),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: pickedCoverFile != null ? const Color(0xFF6366F1) : Colors.white10),
                        ),
                        child: Row(
                          children: [
                            if (pickedCoverFile != null) ...[
                              ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: Image.file(File(pickedCoverFile!.path), width: 44, height: 44, fit: BoxFit.cover),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text('Custom Cover Selected ✨'.tr, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600)),
                              ),
                              IconButton(
                                icon: const Icon(Icons.close, color: Colors.grey, size: 18),
                                onPressed: () => setModalState(() => pickedCoverFile = null),
                              ),
                            ] else ...[
                              const Icon(Icons.add_photo_alternate_rounded, color: Color(0xFF6366F1), size: 24),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text('Choose Custom Room Cover...'.tr, style: const TextStyle(color: Colors.white70, fontSize: 13)),
                              ),
                              const Icon(Icons.chevron_right, color: Colors.grey, size: 18),
                            ],
                          ],
                        ),
                      ),
                    ),

                    // Lock Room PIN Toggle (VIP Privilege)
                    const SizedBox(height: 14),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1F2937),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: isLockedRoom ? const Color(0xFFF59E0B) : Colors.white10),
                      ),
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Row(
                                children: [
                                  Icon(Icons.lock_outline, color: isLockedRoom ? const Color(0xFFF59E0B) : Colors.grey, size: 20),
                                  const SizedBox(width: 10),
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text('Lock Room (PIN Protection)'.tr, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
                                      Text('Require 4-digit code to enter'.tr, style: const TextStyle(color: Colors.grey, fontSize: 10)),
                                    ],
                                  ),
                                ],
                              ),
                              Switch(
                                value: isLockedRoom,
                                activeThumbColor: const Color(0xFFF59E0B),
                                onChanged: (val) => setModalState(() => isLockedRoom = val),
                              ),
                            ],
                          ),
                          if (isLockedRoom) ...[
                            const SizedBox(height: 8),
                            TextField(
                              controller: pinController,
                              keyboardType: TextInputType.number,
                              maxLength: 6,
                              style: const TextStyle(color: Colors.white, fontSize: 15, letterSpacing: 3),
                              decoration: InputDecoration(
                                filled: true,
                                fillColor: const Color(0xFF111827),
                                hintText: 'Enter 4-digit PIN (e.g. 1234)',
                                hintStyle: const TextStyle(color: Colors.grey, letterSpacing: 0, fontSize: 12),
                                counterText: '',
                                isDense: true,
                                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),

                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          padding: EdgeInsets.zero,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        ),
                        onPressed: isStarting
                            ? null
                            : () async {
                                setModalState(() => isStarting = true);
                                final roomTitle = titleController.text.trim().isNotEmpty
                                    ? titleController.text.trim()
                                    : 'Live Broadcast';

                                String? uploadedCoverUrl;
                                if (pickedCoverFile != null) {
                                  try {
                                    uploadedCoverUrl = await ApiService().uploadAvatar(pickedCoverFile!.path);
                                  } catch (e) {
                                    debugPrint('Cover upload failed: $e');
                                  }
                                }

                                final tagLower = selectedTag.toLowerCase();
                                final roomCategory = tagLower.contains('music')
                                    ? 'MUSIC'
                                    : tagLower.contains('chat')
                                        ? 'CHAT'
                                        : tagLower.contains('gam')
                                            ? 'GAMING'
                                            : tagLower.contains('party')
                                                ? 'PARTY'
                                                : 'LIVE';
                                final roomLanguage = AppLocaleService().locale.languageCode;
                                final hostCountry = user?.country;
                                final roomCountry = (hostCountry != null && hostCountry.isNotEmpty) ? hostCountry : null;

                                final res = await ApiService().startRoom(
                                  title: '$roomTitle [$selectedTag]',
                                  roomType: selectedMode,
                                  hostId: user?.id,
                                  hostDisplayName: user?.displayName,
                                  hostAvatarUrl: user?.avatarUrl,
                                  coverUrl: uploadedCoverUrl,
                                  isLocked: isLockedRoom,
                                  roomPin: isLockedRoom ? pinController.text.trim() : null,
                                  hostCustomId: user?.customId,
                                  hostVipLevel: user?.vipLevel ?? 0,
                                  category: roomCategory,
                                  language: roomLanguage,
                                  country: roomCountry,
                                );

                                setModalState(() => isStarting = false);
                                if (!ctx.mounted) return;
                                Navigator.pop(ctx);
                                if (!mounted) return;

                                if (res != null) {
                                  final channelName = res['agora']?['channelName'] ?? 'live_${res['room']?['id']}';
                                  final token = res['agora']?['token'] ?? '';
                                  final hostName = user?.displayName ?? 'Host Star';

                                  if (selectedMode == 'VOICE') {
                                    await Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (_) => VoicePartyRoomScreen(
                                          channelName: channelName,
                                          token: token,
                                          isHost: true,
                                          hostName: hostName,
                                          roomTitle: roomTitle,
                                          coverUrl: uploadedCoverUrl ?? user?.avatarUrl,
                                        ),
                                      ),
                                    );
                                    if (mounted) setState(() {});
                                  } else {
                                    await Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (_) => LiveRoomScreen(
                                          channelName: channelName,
                                          token: token,
                                          isHost: true,
                                          hostName: hostName,
                                          roomTitle: roomTitle,
                                          hostAvatarUrl: user?.avatarUrl,
                                          hostCustomId: user?.customId,
                                          hostVipLevel: user?.vipLevel ?? 0,
                                        ),
                                      ),
                                    );
                                    if (mounted) setState(() {});
                                  }
                                } else {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      backgroundColor: Colors.redAccent,
                                      content: Text('Failed to start broadcast. Please check backend connection.'.tr),
                                    ),
                                  );
                                }
                              },
                        child: Ink(
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [Color(0xFF6366F1), Color(0xFFEC4899)],
                            ),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Container(
                            alignment: Alignment.center,
                            child: isStarting
                                ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                : Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      const Icon(Icons.radio_button_checked, color: Colors.white, size: 20),
                                      const SizedBox(width: 8),
                                      Text(
                                        AppLocaleService().t('live_start_broadcast'),
                                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white, letterSpacing: 0.8),
                                      ),
                                    ],
                                  ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final List<Widget> screens = [
      const LiveDiscoveryFeedScreen(),
      const VoicePartyHubScreen(),
      const SizedBox(), // Center Placeholder for GO LIVE
      const SocialFeedScreen(),
      UserProfileScreen(onLogout: widget.onLogout),
    ];

    return Scaffold(
      body: IndexedStack(
        index: _currentIndex == 2 ? 0 : _currentIndex,
        children: screens,
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: LiveColors.navBarBackground,
          border: Border(top: BorderSide(color: Color(0xFF281347), width: 1)),
        ),
        child: SafeArea(
          top: false,
          child: SizedBox(
            height: 64,
            child: Row(
            children: [
              _buildNavItem(0, Icons.explore_rounded, AppLocaleService().t('nav_explore')),
              _buildNavItem(1, Icons.mic_external_on_rounded, AppLocaleService().t('nav_party')),

              // Center Raised Broadcast FAB
              Expanded(
                child: Center(
                  child: GestureDetector(
                    onTap: () {
                      ScaffoldMessenger.of(context).hideCurrentSnackBar();
                      _openBroadcastStudioModal();
                    },
                    child: Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: LiveColors.primaryGradient,
                        boxShadow: [
                          BoxShadow(
                            color: LiveColors.accentPink.withValues(alpha: 0.4),
                            blurRadius: 14,
                            spreadRadius: 1,
                          ),
                        ],
                      ),
                      child: const Center(
                        child: Icon(Icons.podcasts_rounded, color: Colors.white, size: 24),
                      ),
                    ),
                  ),
                ),
              ),

              _buildNavItem(3, Icons.dynamic_feed_rounded, AppLocaleService().t('nav_social')),
              _buildNavItem(4, Icons.person_rounded, AppLocaleService().t('nav_profile')),
            ],
          ),
        ),
      ),
    ),
  );
}

  Widget _buildNavItem(int index, IconData icon, String label) {
    final isSelected = _currentIndex == index;
    return Expanded(
      child: InkResponse(
        onTap: () {
          ScaffoldMessenger.of(context).hideCurrentSnackBar();
          setState(() => _currentIndex = index);
        },
        radius: 28,
        splashColor: LiveColors.accentPink.withValues(alpha: 0.2),
        highlightColor: Colors.transparent,
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                color: isSelected ? Colors.white : const Color(0xFFC084FC).withValues(alpha: 0.6),
                size: 23,
              ),
              const SizedBox(height: 3),
              Text(
                label,
                style: GoogleFonts.plusJakartaSans(
                  color: isSelected ? Colors.white : const Color(0xFFC084FC).withValues(alpha: 0.6),
                  fontSize: 10,
                  fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                ),
              ),
              const SizedBox(height: 3),
              AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                width: isSelected ? 20 : 0,
                height: 2.5,
                decoration: BoxDecoration(
                  gradient: LiveColors.primaryGradient,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// 1. Real-Time Discovery Feed (Explore Tab)
class LiveDiscoveryFeedScreen extends StatefulWidget {
  const LiveDiscoveryFeedScreen({super.key});

  @override
  State<LiveDiscoveryFeedScreen> createState() => _LiveDiscoveryFeedScreenState();
}

class _LiveDiscoveryFeedScreenState extends State<LiveDiscoveryFeedScreen> {
  String _subTab = 'ALL'; // 'ALL', 'VIDEO', 'VOICE', 'PK', 'POPULAR', 'GAMING'
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  bool _isLoading = false;
  bool _isJoining = false;
  List<Map<String, dynamic>> _rooms = [];
  int _unreadNotifications = 0;
  io.Socket? _feedSocket;

  @override
  void initState() {
    super.initState();
    AppLocaleService().addListener(_onLocaleChanged);
    _fetchRooms();
    _initFeedSocket();
    _loadUnreadNotifications();
  }

  Future<void> _loadUnreadNotifications() async {
    final count = await ApiService().getNotificationUnreadCount();
    if (mounted) setState(() => _unreadNotifications = count);
  }

  void _openNotifications() async {
    await Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const NotificationsScreen()),
    );
    _loadUnreadNotifications();
  }

  void _onLocaleChanged() {
    if (mounted) _fetchRooms();
  }

  void _initFeedSocket() {
    try {
      final socketUrl = '${ApiService.baseUrl}/live';
      _feedSocket = io.io(
        socketUrl,
        io.OptionBuilder()
            .setTransports(['websocket', 'polling'])
            .enableAutoConnect()
            .enableReconnection()
            .setReconnectionDelay(2000)
            .build(),
      );

      _feedSocket!.connect();

      _feedSocket!.onConnect((_) {
        debugPrint('🔌 Home Discovery Feed Connected to Live WebSocket Gateway');
        final uid = AuthService().currentUser?.id;
        if (uid != null && uid.isNotEmpty) {
          _feedSocket!.emit('user:join', {'userId': uid});
        }
      });

      _feedSocket!.on('reconnect', (_) {
        debugPrint('🔄 WebSocket Reconnected: Syncing rooms in real-time');
        _fetchRooms();
      });

      _feedSocket!.on('discovery:stream_started', (data) {
        debugPrint('🔴 Real-time Stream Started detected: $data');
        if (mounted && data != null && data['room'] != null) {
          final newRoom = Map<String, dynamic>.from(data['room']);
          setState(() {
            _rooms.removeWhere((r) =>
                r['id']?.toString() == newRoom['id']?.toString() ||
                r['agoraChannelName']?.toString() == newRoom['agoraChannelName']?.toString());
            _rooms.insert(0, newRoom);
          });
        }
      });

      _feedSocket!.on('discovery:stream_ended', (data) {
        debugPrint('⏹️ Real-time Stream Ended detected: $data');
        if (mounted && data != null) {
          final endedId = data['roomId']?.toString();
          final endedCh = data['agoraChannelName']?.toString();
          setState(() {
            _rooms.removeWhere((r) =>
                (endedId != null && (r['id']?.toString() == endedId || r['agoraChannelName']?.toString() == endedId)) ||
                (endedCh != null && (r['agoraChannelName']?.toString() == endedCh || r['id']?.toString() == endedCh)));
          });
          _fetchRooms();
        }
      });

      _feedSocket!.on('stream:ended', (data) {
        if (mounted && data != null) {
          final endedId = data['roomId']?.toString();
          final endedCh = data['agoraChannelName']?.toString();
          setState(() {
            _rooms.removeWhere((r) =>
                (endedId != null && (r['id']?.toString() == endedId || r['agoraChannelName']?.toString() == endedId)) ||
                (endedCh != null && (r['agoraChannelName']?.toString() == endedCh || r['id']?.toString() == endedCh)));
          });
          _fetchRooms();
        }
      });

      _feedSocket!.on('notification:new', (data) {
        if (mounted) {
          setState(() => _unreadNotifications = _unreadNotifications + 1);
        }
      });
    } catch (e) {
      debugPrint('Error initializing feed socket: $e');
    }
  }

  @override
  void dispose() {
    AppLocaleService().removeListener(_onLocaleChanged);
    _searchController.dispose();
    _feedSocket?.dispose();
    super.dispose();
  }

  Future<void> _fetchRooms() async {
    setState(() => _isLoading = true);
    final rooms = await ApiService().getDiscoveryRooms();
    if (mounted) {
      final seen = <String>{};
      final unique = <Map<String, dynamic>>[];
      for (final r in rooms) {
        if (r['status'] == 'TERMINATED') continue;
        final id = r['id']?.toString() ?? '';
        final ch = r['agoraChannelName']?.toString() ?? '';
        final key = '${id}_$ch';
        if (id.isNotEmpty && !seen.contains(key) && !seen.contains(id)) {
          seen.add(key);
          seen.add(id);
          unique.add(r);
        }
      }
      setState(() {
        _rooms = unique;
        _isLoading = false;
      });
    }
  }

  Future<void> _joinRoom(Map<String, dynamic> room) async {
    if (_isJoining) return;

    final roomId = room['id']?.toString() ?? '';
    final roomType = room['roomType'] ?? 'VIDEO';
    final hostName = room['hostDisplayName'] ??
        room['hostName'] ??
        room['host']?['displayName'] ??
        room['host']?['username'] ??
        'Live Broadcaster';
    final hostAvatar = room['hostAvatarUrl'] ?? room['host']?['avatarUrl'];
    final roomTitle = room['title'] ?? 'Live Broadcast';
    final channelName = room['agoraChannelName'] ?? 'live_$roomId';
    final hostCustomId = room['hostCustomId'] ?? room['host']?['customId'];

    if (!mounted) return;

    String? enteredPin;
    if (room['isLocked'] == true) {
      final pinCtrl = TextEditingController();
      final proceed = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: const Color(0xFF111827),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
            side: const BorderSide(color: Color(0xFFF59E0B), width: 1.5),
          ),
          title: Row(
            children: [
              const Icon(Icons.lock, color: Color(0xFFF59E0B), size: 22),
              const SizedBox(width: 8),
              Text('Locked Room 🔒'.tr, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('This room is PIN-protected by the host. Enter the access PIN code:'.tr, style: const TextStyle(color: Colors.white70, fontSize: 12)),
              const SizedBox(height: 12),
              TextField(
                controller: pinCtrl,
                keyboardType: TextInputType.number,
                obscureText: true,
                maxLength: 6,
                style: const TextStyle(color: Colors.white, fontSize: 18, letterSpacing: 4),
                decoration: InputDecoration(
                  filled: true,
                  fillColor: const Color(0xFF1F2937),
                  hintText: 'PIN Code',
                  hintStyle: const TextStyle(color: Colors.grey, letterSpacing: 0, fontSize: 13),
                  counterText: '',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                  prefixIcon: const Icon(Icons.key, color: Color(0xFFF59E0B), size: 20),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: Text('Cancel'.tr, style: const TextStyle(color: Colors.grey)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF6366F1),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: () => Navigator.pop(ctx, true),
              child: Text('Enter Room'.tr, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      );

      if (proceed != true || pinCtrl.text.trim().isEmpty) {
        return;
      }
      enteredPin = pinCtrl.text.trim();
    }

    if (!mounted) return;
    setState(() => _isJoining = true);

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        duration: const Duration(seconds: 4),
        backgroundColor: const Color(0xFF1E1B4B),
        content: Row(
          children: [
            const SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF6366F1)),
            ),
            const SizedBox(width: 12),
            Text('Connecting to $hostName...'.tr, style: const TextStyle(color: Colors.white, fontSize: 13)),
          ],
        ),
      ),
    );

    Map<String, dynamic>? joinRes = await ApiService().joinRoom(
      roomId,
      channelName: room['agoraChannelName'],
      roomPin: enteredPin,
    );
    String token = joinRes?['agora']?['token'] ?? '';

    // If initial join had network latency or returned empty token, retry once immediately
    if (token.isEmpty && joinRes?['error'] == null) {
      await Future.delayed(const Duration(milliseconds: 300));
      joinRes = await ApiService().joinRoom(
        roomId,
        channelName: room['agoraChannelName'],
      );
      token = joinRes?['agora']?['token'] ?? '';
    }

    if (mounted) {
      ScaffoldMessenger.of(context).hideCurrentSnackBar();
      setState(() => _isJoining = false);
    }

    if (token.isEmpty) {
      if (mounted) {
        final errMsg = joinRes?['message']?.toString() ??
            'Could not connect to live stream. Please check connection and try again.'.tr;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: Colors.redAccent,
            content: Text(errMsg),
          ),
        );
      }
      return;
    }

    final activeChannel = joinRes?['room']?['agoraChannelName'] ??
        joinRes?['agora']?['channelName'] ??
        room['agoraChannelName'] ??
        channelName;

    if (!mounted) return;

    if (roomType == 'VOICE') {
      await Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => VoicePartyRoomScreen(
            channelName: activeChannel,
            token: token,
            isHost: false,
            hostName: hostName,
            roomTitle: roomTitle,
            coverUrl: room['coverUrl'] ?? hostAvatar,
          ),
        ),
      );
      if (mounted) _fetchRooms();
    } else {
      await Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => LiveRoomScreen(
            channelName: activeChannel,
            token: token,
            isHost: false,
            hostName: hostName,
            roomTitle: roomTitle,
            hostAvatarUrl: hostAvatar,
            hostCustomId: hostCustomId,
          ),
        ),
      );
      if (mounted) _fetchRooms();
    }
  }

  @override
  Widget build(BuildContext context) {
    // Only real live broadcasts from signaling & discovery server
    final allRooms = List<Map<String, dynamic>>.from(_rooms);

    // Filter by Category Capsule Tab
    var displayRooms = allRooms.where((room) {
      if (_subTab == 'ALL') return true;
      final roomType = (room['roomType'] ?? 'VIDEO').toString().toUpperCase();
      final category = (room['category'] ?? '').toString().toUpperCase();
      final title = (room['title'] ?? '').toString().toLowerCase();

      if (_subTab == 'VIDEO') {
        return roomType == 'VIDEO' || category == 'VIDEO';
      } else if (_subTab == 'VOICE') {
        return roomType == 'VOICE' || category == 'VOICE' || title.contains('voice') || title.contains('party') || title.contains('audio');
      } else if (_subTab == 'PK') {
        return roomType == 'PK' || category == 'PK' || room['isPk'] == true || title.contains('pk') || title.contains('battle');
      } else if (_subTab == 'POPULAR') {
        final viewers = (room['currentViewers'] ?? 0) as num;
        return viewers >= 50 || category == 'POPULAR';
      } else if (_subTab == 'GAMING') {
        return category == 'GAMING' || title.contains('game') || title.contains('gaming');
      }
      return true;
    }).toList();

    // Filter by Real-time Search Query
    if (_searchQuery.trim().isNotEmpty) {
      final q = _searchQuery.trim().toLowerCase();
      displayRooms = displayRooms.where((room) {
        final hostName = (room['hostDisplayName'] ?? room['hostName'] ?? room['host']?['displayName'] ?? '').toString().toLowerCase();
        final username = (room['username'] ?? room['host']?['username'] ?? '').toString().toLowerCase();
        final title = (room['title'] ?? '').toString().toLowerCase();
        final category = (room['category'] ?? '').toString().toLowerCase();
        return hostName.contains(q) || username.contains(q) || title.contains(q) || category.contains(q);
      }).toList();
    }

    return Scaffold(
      backgroundColor: LiveColors.background,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(60),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            child: Row(
              children: [
                // Stylized Brand Icon on Left matching Screenshot 1
                ShaderMask(
                  shaderCallback: (bounds) => LiveColors.primaryGradient.createShader(bounds),
                  child: const Icon(Icons.flash_on, size: 28, color: Colors.white),
                ),
                const SizedBox(width: 10),

                // Real-time Search Pill with Clear & Trophy Icon
                Expanded(
                  child: Container(
                    height: 40,
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      color: LiveColors.backgroundElevated,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: LiveColors.borderSubtle),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.search, color: LiveColors.textSecondary, size: 18),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextField(
                            controller: _searchController,
                            style: GoogleFonts.plusJakartaSans(color: Colors.white, fontSize: 13),
                            onChanged: (val) {
                              setState(() {
                                _searchQuery = val;
                              });
                            },
                            decoration: InputDecoration(
                              hintText: 'Search streamers, title...'.tr,
                              hintStyle: GoogleFonts.plusJakartaSans(color: LiveColors.textMuted, fontSize: 13),
                              border: InputBorder.none,
                              isDense: true,
                              contentPadding: EdgeInsets.zero,
                            ),
                          ),
                        ),
                        if (_searchQuery.isNotEmpty)
                          GestureDetector(
                            onTap: () {
                              _searchController.clear();
                              setState(() => _searchQuery = '');
                            },
                            child: const Icon(Icons.close_rounded, color: LiveColors.textSecondary, size: 18),
                          )
                        else
                          const Icon(Icons.emoji_events_rounded, color: Color(0xFFE879F9), size: 20),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 10),

                // Notification Bell with unread badge
                GestureDetector(
                  onTap: _openNotifications,
                  child: Stack(
                    clipBehavior: Clip.none,
                    children: [
                      const Icon(Icons.notifications_none_rounded, color: Colors.white, size: 26),
                      if (_unreadNotifications > 0)
                        Positioned(
                          right: -4,
                          top: -4,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                            constraints: const BoxConstraints(minWidth: 16),
                            decoration: BoxDecoration(
                              color: LiveColors.accentPink,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              _unreadNotifications > 99 ? '99+' : '$_unreadNotifications',
                              textAlign: TextAlign.center,
                              style: GoogleFonts.plusJakartaSans(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),

                // Profile Avatar on Right with Level Frame
                UserAvatarWithFrame(
                  avatarUrl: AuthService().currentUser?.avatarUrl,
                  level: AuthService().currentUser?.level ?? 1,
                  size: 38,
                  showBadge: false,
                  isVerified: AuthService().currentUser?.isVerified ?? false,
                  verifiedLabel: AuthService().currentUser?.verifiedLabel,
                ),
              ],
            ),
          ),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _fetchRooms,
        color: LiveColors.accentPink,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 10),

              // Category Pills Row (Banner removed - start directly from category tabs)
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                child: Row(
                  children: [
                    _buildCategoryPill('ALL', 'Explore'.tr),
                    _buildCategoryPill('VIDEO', 'Live Streaming'.tr),
                    _buildCategoryPill('VOICE', 'Party'.tr),
                    _buildCategoryPill('PK', 'PK Battle'.tr),
                    _buildCategoryPill('POPULAR', 'Popular'.tr),
                    _buildCategoryPill('GAMING', 'Gaming'.tr),
                  ],
                ),
              ),

              const SizedBox(height: 8),

              // 2-Column Stream Grid Cards with Filter & Empty State Support
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                child: _isLoading && _rooms.isEmpty
                    ? const Center(child: Padding(padding: EdgeInsets.all(40), child: CircularProgressIndicator(color: LiveColors.accentPink)))
                    : displayRooms.isEmpty
                        ? Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(32),
                            decoration: BoxDecoration(
                              color: LiveColors.backgroundSurface,
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: LiveColors.borderSubtle),
                            ),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.search_off_rounded, size: 48, color: LiveColors.textMuted),
                                const SizedBox(height: 12),
                                Text(
                                  'No streams found'.tr,
                                  style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  _searchQuery.isNotEmpty
                                      ? 'No broadcast matches "$_searchQuery".'.tr
                                      : 'No live broadcasts available in this category right now.'.tr,
                                  textAlign: TextAlign.center,
                                  style: GoogleFonts.plusJakartaSans(color: LiveColors.textSecondary, fontSize: 12),
                                ),
                                const SizedBox(height: 16),
                                TextButton(
                                  onPressed: () {
                                    _searchController.clear();
                                    setState(() {
                                      _searchQuery = '';
                                      _subTab = 'ALL';
                                    });
                                  },
                                  child: Text('Reset Filters'.tr, style: GoogleFonts.plusJakartaSans(color: LiveColors.accentPink, fontWeight: FontWeight.bold)),
                                ),
                              ],
                            ),
                          )
                        : GridView.builder(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 2,
                              childAspectRatio: 0.72,
                              crossAxisSpacing: 12,
                              mainAxisSpacing: 12,
                            ),
                            itemCount: displayRooms.length,
                            itemBuilder: (context, index) {
                              return _buildStreamCard(displayRooms[index]);
                            },
                          ),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCategoryPill(String key, String label) {
    final isSelected = _subTab == key;
    return GestureDetector(
      onTap: () => setState(() => _subTab = key),
      child: Container(
        margin: const EdgeInsets.only(right: 10),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 9),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          gradient: isSelected ? LiveColors.primaryGradient : null,
          color: isSelected ? null : LiveColors.backgroundElevated,
        ),
        child: Text(
          label,
          style: GoogleFonts.plusJakartaSans(
            color: isSelected ? Colors.white : LiveColors.textSecondary,
            fontSize: 13,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
          ),
        ),
      ),
    );
  }

  Widget _buildStreamCard(Map<String, dynamic> room) {
    final hostName = room['hostDisplayName'] ??
        room['hostName'] ??
        room['host']?['displayName'] ??
        room['host']?['username'] ??
        'Hana';
    final hostAvatar = room['hostAvatarUrl'] ?? room['host']?['avatarUrl'] ?? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500';
    final coverPhoto = room['coverUrl'] ?? hostAvatar;
    final viewers = room['currentViewers'] ?? 59;
    final username = room['username'] ?? hostName.toString().toLowerCase().replaceAll(RegExp(r'\s+'), '.');
    final flag = room['flag'] ?? '🌍';
    final hostCustomId = room['hostCustomId'] ?? room['host']?['customId'] as String?;

    return GestureDetector(
      onTap: () => _joinRoom(room),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(22),
          color: LiveColors.backgroundSurface,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.3),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(22),
          child: Stack(
            fit: StackFit.expand,
            children: [
              // Host Cover Photo
              Image.network(
                coverPhoto.toString(),
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(
                  color: const Color(0xFF2E1065),
                  child: const Center(child: Icon(Icons.person, color: Colors.white24, size: 48)),
                ),
              ),

              // Gradient Scrim for High Contrast Text Legibility
              Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.black26,
                      Colors.transparent,
                      Color(0xEE000000),
                    ],
                    stops: [0.0, 0.45, 1.0],
                  ),
                ),
              ),

              // Top-Left Lock PIN Badge if room is locked
              if (room['isLocked'] == true)
                Positioned(
                  top: 10,
                  left: 10,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF59E0B).withValues(alpha: 0.9),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.lock, color: Colors.black, size: 11),
                        SizedBox(width: 3),
                        Text('PIN', style: TextStyle(color: Colors.black, fontSize: 10, fontWeight: FontWeight.w900)),
                      ],
                    ),
                  ),
                ),

              // Top-Right Waveform Indicator Capsule matching Screenshot 1
              Positioned(
                top: 10,
                right: 10,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.45),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.graphic_eq, color: Colors.white, size: 14),
                      const SizedBox(width: 4),
                      Text(
                        '$viewers',
                        style: GoogleFonts.plusJakartaSans(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Bottom Info: Host Name, Flag + @handle, Floating Call CTA Button
              Positioned(
                left: 10,
                right: 10,
                bottom: 10,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    // Host Info (Left)
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Row(
                            children: [
                              Flexible(
                                child: Text(
                                  hostName,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: GoogleFonts.plusJakartaSans(
                                    color: Colors.white,
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 2),
                          if (hostCustomId != null && hostCustomId.isNotEmpty)
                            Text(
                              'ID: $hostCustomId',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: GoogleFonts.plusJakartaSans(
                                color: Colors.white70,
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                              ),
                            )
                          else
                            Row(
                              children: [
                                Text(flag, style: const TextStyle(fontSize: 11)),
                                const SizedBox(width: 4),
                                Expanded(
                                  child: Text(
                                    '@$username',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: GoogleFonts.plusJakartaSans(
                                      color: Colors.white70,
                                      fontSize: 11,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 6),

                    // Floating Call / Join Button matching Screenshot 1
                    GestureDetector(
                      onTap: () => _joinRoom(room),
                      child: Container(
                        width: 38,
                        height: 38,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: LiveColors.callButtonGradient,
                          boxShadow: [
                            BoxShadow(
                              color: LiveColors.accentPink.withValues(alpha: 0.5),
                              blurRadius: 8,
                            ),
                          ],
                        ),
                        child: const Icon(Icons.phone_in_talk, color: Colors.white, size: 18),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// 2. Dedicated Voice Party Hub (8-Seat Stage Discovery)
class VoicePartyHubScreen extends StatefulWidget {
  const VoicePartyHubScreen({super.key});

  @override
  State<VoicePartyHubScreen> createState() => _VoicePartyHubScreenState();
}

class _VoicePartyHubScreenState extends State<VoicePartyHubScreen> {
  bool _isLoading = false;
  List<Map<String, dynamic>> _voiceRooms = [];
  io.Socket? _voiceSocket;

  @override
  void initState() {
    super.initState();
    AppLocaleService().addListener(_onLocaleChanged);
    _fetchVoiceRooms();
    _initVoiceSocket();
  }

  void _onLocaleChanged() {
    if (mounted) _fetchVoiceRooms();
  }

  void _initVoiceSocket() {
    try {
      final socketUrl = '${ApiService.baseUrl}/live';
      _voiceSocket = io.io(
        socketUrl,
        io.OptionBuilder()
            .setTransports(['websocket', 'polling'])
            .enableAutoConnect()
            .enableReconnection()
            .setReconnectionDelay(2000)
            .build(),
      );

      _voiceSocket!.connect();

      _voiceSocket!.on('reconnect', (_) {
        _fetchVoiceRooms();
      });

      _voiceSocket!.on('discovery:stream_started', (data) {
        if (mounted && data != null && data['room'] != null) {
          final newRoom = Map<String, dynamic>.from(data['room']);
          if ((newRoom['roomType'] ?? '').toString().toUpperCase() == 'VOICE') {
            setState(() {
              _voiceRooms.removeWhere((r) => r['id'] == newRoom['id'] || r['agoraChannelName'] == newRoom['agoraChannelName']);
              _voiceRooms.insert(0, newRoom);
            });
          }
        }
      });

      _voiceSocket!.on('discovery:stream_ended', (data) {
        if (mounted && data != null) {
          final endedId = data['roomId']?.toString();
          final endedCh = data['agoraChannelName']?.toString();
          setState(() {
            _voiceRooms.removeWhere((r) =>
                r['id']?.toString() == endedId ||
                r['agoraChannelName']?.toString() == endedCh ||
                r['agoraChannelName']?.toString() == endedId);
          });
        }
      });
    } catch (e) {
      debugPrint('Error initializing voice socket: $e');
    }
  }

  @override
  void dispose() {
    AppLocaleService().removeListener(_onLocaleChanged);
    _voiceSocket?.dispose();
    super.dispose();
  }

  Future<void> _fetchVoiceRooms() async {
    setState(() => _isLoading = true);
    try {
      final allRooms = await ApiService().getDiscoveryRooms();
      if (mounted) {
        setState(() {
          _voiceRooms = allRooms.where((r) {
            final type = (r['roomType'] ?? '').toString().toUpperCase();
            return type == 'VOICE';
          }).toList();
        });
      }
    } catch (e) {
      debugPrint('Error fetching voice rooms: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _joinVoiceParty(Map<String, dynamic> party) async {
    final roomId = party['id']?.toString() ?? '';
    final roomTitle = party['title'] ?? 'Live Voice Party 🎙️';
    final hostName = party['hostDisplayName'] ??
        party['hostName'] ??
        party['host']?['displayName'] ??
        party['host']?['username'] ??
        'Live Host';
    final coverUrl = party['coverUrl'] ?? party['hostAvatarUrl'] ?? party['host']?['avatarUrl'];

    try {
      final res = await ApiService().joinRoom(roomId, channelName: party['agoraChannelName']);
      final token = res?['agora']?['token'] ?? '';
      final channelName = res?['room']?['agoraChannelName'] ??
          res?['agora']?['channelName'] ??
          party['agoraChannelName'] ??
          roomId;

      if (token.isEmpty) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              backgroundColor: Colors.redAccent,
              content: Text('Could not connect to voice room. Please check connection and try again.'.tr),
            ),
          );
        }
        return;
      }

      if (!mounted) return;
      await Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => VoicePartyRoomScreen(
            channelName: channelName,
            token: token,
            isHost: false,
            hostName: hostName,
            roomTitle: roomTitle,
            coverUrl: coverUrl,
          ),
        ),
      );
      if (mounted) _fetchVoiceRooms();
    } catch (e) {
      debugPrint('Error joining voice party: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: LiveColors.backgroundPrimary,
      appBar: AppBar(
        backgroundColor: LiveColors.backgroundPrimary,
        elevation: 0,
        title: Row(
          children: [
            const Icon(Icons.mic, color: LiveColors.accentPurple),
            const SizedBox(width: 8),
            Text(
              'Voice Party Stages'.tr,
              style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.white),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white70),
            onPressed: _fetchVoiceRooms,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _fetchVoiceRooms,
        color: LiveColors.accentPink,
        child: _isLoading
            ? const Center(child: CircularProgressIndicator(color: LiveColors.accentPink))
            : _voiceRooms.isEmpty
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(32),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(20),
                            decoration: BoxDecoration(
                              color: LiveColors.accentPurple.withValues(alpha: 0.15),
                              shape: BoxShape.circle,
                              border: Border.all(color: LiveColors.accentPurple.withValues(alpha: 0.3)),
                            ),
                            child: const Icon(Icons.mic_none, size: 54, color: LiveColors.accentPink),
                          ),
                          const SizedBox(height: 18),
                          Text(
                            'No Voice Party Stages Live'.tr,
                            style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Be the first to start an 8-seat audio lounge and invite listeners worldwide!'.tr,
                            textAlign: TextAlign.center,
                            style: GoogleFonts.plusJakartaSans(fontSize: 13, color: LiveColors.textSecondary),
                          ),
                          const SizedBox(height: 20),
                          GestureDetector(
                            onTap: _fetchVoiceRooms,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                              decoration: BoxDecoration(
                                gradient: LiveColors.primaryGradient,
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.refresh, color: Colors.white, size: 18),
                                  const SizedBox(width: 8),
                                  Text(
                                    'Refresh Stages'.tr,
                                    style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _voiceRooms.length,
                    itemBuilder: (context, index) {
                      final party = _voiceRooms[index];
                      final hostName = party['hostDisplayName'] ??
                          party['hostName'] ??
                          party['host']?['displayName'] ??
                          party['host']?['username'] ??
                          'Live Host';
                      final hostAvatar = party['hostAvatarUrl'] ?? party['host']?['avatarUrl'] ?? party['coverUrl'];
                      final listeners = party['currentViewers'] ?? 1;
                      final occupied = party['occupiedSeats'] ?? 1;
                      final title = party['title'] ?? 'Live Voice Party 🎙️';

                      return Container(
                        margin: const EdgeInsets.only(bottom: 14),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: LiveColors.backgroundSurface,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: LiveColors.border),
                        ),
                        child: Row(
                          children: [
                            CircleAvatar(
                              radius: 30,
                              backgroundColor: LiveColors.accentPurple,
                              backgroundImage: hostAvatar != null && hostAvatar.toString().isNotEmpty
                                  ? NetworkImage(hostAvatar.toString())
                                  : null,
                              child: hostAvatar == null || hostAvatar.toString().isEmpty
                                  ? Text(hostName.isNotEmpty ? hostName[0].toUpperCase() : 'H', style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold))
                                  : null,
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                        decoration: BoxDecoration(
                                          gradient: LiveColors.primaryGradient,
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: Text(
                                          'Voice Stage'.tr,
                                          style: GoogleFonts.plusJakartaSans(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.white),
                                        ),
                                      ),
                                      const Spacer(),
                                      const Icon(Icons.headset, size: 12, color: LiveColors.textSecondary),
                                      const SizedBox(width: 3),
                                      Text('$listeners', style: GoogleFonts.plusJakartaSans(color: LiveColors.textSecondary, fontSize: 11)),
                                    ],
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    title.toString().tr,
                                    style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    '${'Host:'.tr} $hostName',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: GoogleFonts.plusJakartaSans(fontSize: 11, color: LiveColors.textSecondary),
                                  ),
                                  const SizedBox(height: 6),
                                  Row(
                                    children: [
                                      const Icon(Icons.record_voice_over, color: Color(0xFF10B981), size: 14),
                                      const SizedBox(width: 4),
                                      Flexible(
                                        child: Text(
                                          '$occupied/8 ${'Mics Active'.tr}',
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: GoogleFonts.plusJakartaSans(fontSize: 11, color: const Color(0xFF10B981), fontWeight: FontWeight.bold),
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 10),
                            GestureDetector(
                              onTap: () => _joinVoiceParty(party),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
                                decoration: BoxDecoration(
                                  gradient: LiveColors.primaryGradient,
                                  borderRadius: BorderRadius.circular(14),
                                ),
                                child: Text(
                                  'Join'.tr,
                                  style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                                ),
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
      ),
    );
  }
}

/// 3. Resellers & Coin Merchants Screen (Dynamic WhatsApp Recharge Hub)
class CoinResellersScreen extends StatefulWidget {
  const CoinResellersScreen({super.key});

  @override
  State<CoinResellersScreen> createState() => _CoinResellersScreenState();
}

class _CoinResellersScreenState extends State<CoinResellersScreen> {
  bool _isLoading = true;
  List<Map<String, dynamic>> _resellers = [];

  @override
  void initState() {
    super.initState();
    AppLocaleService().addListener(_onLocaleChanged);
    _loadResellers();
  }

  void _onLocaleChanged() {
    if (mounted) _loadResellers();
  }

  @override
  void dispose() {
    AppLocaleService().removeListener(_onLocaleChanged);
    super.dispose();
  }

  Future<void> _loadResellers() async {
    setState(() => _isLoading = true);
    try {
      final list = await ApiService().getResellers();
      if (mounted) {
        setState(() {
          _resellers = list;
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('Error loading resellers: $e');
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _launchWhatsApp(String phone, String name) async {
    final cleanPhone = phone.replaceAll(RegExp(r'[^0-9]'), '');
    final currentUser = AuthService().currentUser;
    final greeting = 'Hello $name!\nI would like to purchase Live 2030 Coins.\n\nMy Account Details:\n• User ID: ${currentUser?.id ?? "N/A"}\n• Display Name: ${currentUser?.displayName ?? "User"}\n\nPlease share payment methods and coin packages!';
    
    final uri = Uri.parse('https://wa.me/$cleanPhone?text=${Uri.encodeComponent(greeting)}');

    try {
      final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!launched) {
        // Fallback: copy to clipboard
        await Clipboard.setData(ClipboardData(text: phone));
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              backgroundColor: const Color(0xFF10B981),
              content: Text('Copied to clipboard!'.tr),
            ),
          );
        }
      }
    } catch (e) {
      debugPrint('Error launching WhatsApp: $e');
      await Clipboard.setData(ClipboardData(text: phone));
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: const Color(0xFF10B981),
            content: Text('Copied to clipboard!'.tr),
          ),
        );
      }
    }
  }

  void _copyPhoneNumber(String phone) async {
    await Clipboard.setData(ClipboardData(text: phone));
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: const Color(0xFF6366F1),
          duration: const Duration(seconds: 2),
          content: Row(
            children: [
              const Icon(Icons.check_circle, color: Colors.white, size: 18),
              const SizedBox(width: 8),
              Text('Phone number copied!'.tr),
            ],
          ),
        ),
      );
    }
  }

  String _formatNumber(dynamic number) {
    if (number == null) return '0';
    final str = number.toString();
    return str.replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]},');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: LiveColors.backgroundPrimary,
      appBar: AppBar(
        backgroundColor: LiveColors.backgroundPrimary,
        elevation: 0,
        title: Row(
          children: [
            const Icon(Icons.monetization_on, color: Color(0xFFF59E0B)),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'Agency Coin Recharge Hub'.tr,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.white),
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white70),
            onPressed: _loadResellers,
            tooltip: 'Refresh Merchants'.tr,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadResellers,
        color: const Color(0xFFF59E0B),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Agency Escrow Guarantee Header Card
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      const Color(0xFFF59E0B).withValues(alpha: 0.15),
                      const Color(0xFF1E1B4B).withValues(alpha: 0.6),
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.4)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF59E0B).withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: const Icon(Icons.verified_user_rounded, color: Color(0xFFF59E0B), size: 28),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '100% Bonded Agency Escrow'.tr,
                            style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.white),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'All listed talent agencies hold verified platform coin reserves. Connect via WhatsApp to recharge coins directly into your User ID.'.tr,
                            style: GoogleFonts.plusJakartaSans(fontSize: 11, color: LiveColors.textSecondary, height: 1.4),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      'Authorized Agency WhatsApp Merchants:'.tr,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.white),
                    ),
                  ),
                  const SizedBox(width: 8),
                  if (!_isLoading && _resellers.isNotEmpty)
                    Text(
                      '${_resellers.length} ${'Online'.tr}',
                      style: GoogleFonts.plusJakartaSans(fontSize: 12, color: const Color(0xFF10B981), fontWeight: FontWeight.bold),
                    ),
                ],
              ),

              const SizedBox(height: 12),

              // Loading Skeleton
              if (_isLoading)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.all(40),
                    child: CircularProgressIndicator(color: Color(0xFFF59E0B)),
                  ),
                )
              // Empty State
              else if (_resellers.isEmpty)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
                  decoration: BoxDecoration(
                    color: LiveColors.backgroundSurface,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: LiveColors.border),
                  ),
                  child: Column(
                    children: [
                      const Icon(Icons.storefront_outlined, size: 52, color: Color(0xFFF59E0B)),
                      const SizedBox(height: 14),
                      Text(
                        'No Partner Agencies Registered Yet'.tr,
                        style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.white),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Official certified partner agencies registered by platform administration will appear here with live coin stock.'.tr,
                        textAlign: TextAlign.center,
                        style: GoogleFonts.plusJakartaSans(fontSize: 12, color: LiveColors.textSecondary),
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFF59E0B),
                          foregroundColor: Colors.black,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        onPressed: _loadResellers,
                        icon: const Icon(Icons.refresh, size: 16),
                        label: Text('Check Again'.tr),
                      ),
                    ],
                  ),
                )
              // Dynamic Resellers List
              else
                ..._resellers.map((merchant) {
                  final name = merchant['businessName'] ?? merchant['name'] ?? 'Authorized Coin Vendor';
                  final phone = merchant['whatsappNumber'] ?? merchant['phone'] ?? '+1 555 000 0000';
                  final region = merchant['region'] ?? merchant['country'] ?? 'Global';
                  final badge = merchant['badgeTitle'] ?? 'Authorized Vendor';
                  final stock = merchant['coinStock'] ?? 1000000;

                  return Container(
                    margin: const EdgeInsets.only(bottom: 14),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: LiveColors.backgroundSurface,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.25)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.3),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Header: Region & Badge Tag
                        Row(
                          children: [
                            Flexible(
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.3)),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(Icons.verified, size: 12, color: Color(0xFFF59E0B)),
                                    const SizedBox(width: 4),
                                    Flexible(
                                      child: Text(
                                        badge.toString().tr,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: GoogleFonts.plusJakartaSans(
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold,
                                          color: const Color(0xFFF59E0B),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.06),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                region.toString().tr,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: GoogleFonts.plusJakartaSans(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: LiveColors.textSecondary,
                                ),
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 10),

                        // Merchant Business Name
                        Text(
                          name.toString().tr,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),

                        const SizedBox(height: 8),

                        // Stock & WhatsApp Number Details
                        Row(
                          children: [
                            Text(
                              'Available Stock: '.tr,
                              style: GoogleFonts.plusJakartaSans(fontSize: 12, color: LiveColors.textSecondary),
                            ),
                            const Icon(Icons.monetization_on, size: 14, color: Color(0xFFF59E0B)),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                '${_formatNumber(stock)} ${'Coins'.tr}',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: GoogleFonts.plusJakartaSans(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w800,
                                  color: const Color(0xFFF59E0B),
                                ),
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 6),

                        Row(
                          children: [
                            const Icon(Icons.phone_iphone, size: 14, color: LiveColors.textSecondary),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                phone,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: GoogleFonts.plusJakartaSans(
                                  fontSize: 12,
                                  color: Colors.white70,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            InkWell(
                              onTap: () => _copyPhoneNumber(phone),
                              borderRadius: BorderRadius.circular(4),
                              child: const Padding(
                                padding: EdgeInsets.all(3),
                                child: Icon(Icons.copy_rounded, size: 14, color: Color(0xFF6366F1)),
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 14),

                        // Direct WhatsApp Purchase Button
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF25D366),
                              foregroundColor: Colors.white,
                              elevation: 4,
                              shadowColor: const Color(0xFF25D366).withValues(alpha: 0.4),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                              padding: const EdgeInsets.symmetric(vertical: 13, horizontal: 8),
                            ),
                            onPressed: () => _launchWhatsApp(phone, name),
                            icon: const Icon(Icons.chat_rounded, color: Colors.white, size: 19),
                            label: FittedBox(
                              fit: BoxFit.scaleDown,
                              child: Text(
                                'Chat & Buy Coins on WhatsApp'.tr,
                                style: GoogleFonts.plusJakartaSans(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                }),
            ],
          ),
        ),
      ),
    );
  }
}

/// 4. Profile & Wallet Screen (With Avatar Changer & Onboarding link)
class UserProfileScreen extends StatefulWidget {
  final VoidCallback onLogout;

  const UserProfileScreen({super.key, required this.onLogout});

  @override
  State<UserProfileScreen> createState() => _UserProfileScreenState();
}

class _UserProfileScreenState extends State<UserProfileScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      AuthService().refreshCurrentUser();
      LevelService().fetchConfigs();
    });
  }

  void _openAvatarChanger() {
    showModalBottomSheet(
      context: context,
      backgroundColor: LiveColors.backgroundSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Change Profile Picture'.tr,
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: LiveColors.textSecondary),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                'Upload a new photo from gallery or take one with your camera:'.tr,
                style: GoogleFonts.plusJakartaSans(color: LiveColors.textSecondary, fontSize: 12),
              ),
              const SizedBox(height: 18),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: LiveColors.accentPurple.withValues(alpha: 0.15),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.photo_library_rounded, color: LiveColors.accentPurple),
                ),
                title: Text('Choose from Gallery'.tr, style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.w600)),
                subtitle: Text('Pick any photo from device storage'.tr, style: GoogleFonts.plusJakartaSans(color: LiveColors.textSecondary, fontSize: 11)),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickAndUploadAvatar(ImageSource.gallery);
                },
              ),
              const Divider(color: LiveColors.border),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: LiveColors.accentPink.withValues(alpha: 0.15),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.camera_alt_rounded, color: LiveColors.accentPink),
                ),
                title: Text('Take Photo with Camera'.tr, style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.w600)),
                subtitle: Text('Snap an instant selfie or photo'.tr, style: GoogleFonts.plusJakartaSans(color: LiveColors.textSecondary, fontSize: 11)),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickAndUploadAvatar(ImageSource.camera);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _pickAndUploadAvatar(ImageSource source) async {
    try {
      final picked = await ImagePicker().pickImage(
        source: source,
        maxWidth: 1200,
        maxHeight: 1200,
        imageQuality: 85,
      );
      if (picked == null) return;

      if (!mounted) return;
      _showUploadLoadingDialog();

      final uploadedPath = await ApiService().uploadAvatar(picked.path);

      if (!mounted) return;
      Navigator.of(context, rootNavigator: true).pop();

      if (uploadedPath != null) {
        final fullUrl = ApiService.getFullImageUrl(uploadedPath);
        final saved = await AuthService().updateProfile(avatarUrl: fullUrl);
        if (!mounted) return;
        setState(() {});

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: saved ? const Color(0xFF10B981) : Colors.orangeAccent,
            content: Row(
              children: [
                Icon(saved ? Icons.check_circle : Icons.cloud_off, color: Colors.white, size: 20),
                const SizedBox(width: 8),
                Text(
                  (saved
                          ? 'Profile picture updated successfully! ✨'
                          : 'Picture saved on this device. It will sync when you are back online.')
                      .tr,
                  style: GoogleFonts.plusJakartaSans(color: Colors.white),
                ),
              ],
            ),
          ),
        );
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              backgroundColor: const Color(0xFFEF4444),
              content: Text('Failed to upload image. Please check connection.'.tr, style: GoogleFonts.plusJakartaSans()),
            ),
          );
        }
      }
    } catch (e) {
      debugPrint('Error picking avatar: $e');
    }
  }

  void _showUploadLoadingDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => PopScope(
        canPop: false,
        child: Dialog(
          backgroundColor: LiveColors.backgroundSurface,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(22),
            side: const BorderSide(color: LiveColors.border),
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 72,
                  height: 72,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LiveColors.primaryGradient,
                    boxShadow: [
                      BoxShadow(
                        color: LiveColors.accentPink.withValues(alpha: 0.5),
                        blurRadius: 24,
                        spreadRadius: 3,
                      ),
                    ],
                  ),
                  child: const Padding(
                    padding: EdgeInsets.all(18),
                    child: CircularProgressIndicator(
                      strokeWidth: 3.5,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  ),
                ),
                const SizedBox(height: 22),
                Text(
                  'Uploading Avatar...'.tr,
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 19,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Encoding multipart and streaming to server'.tr,
                  textAlign: TextAlign.center,
                  style: GoogleFonts.plusJakartaSans(color: LiveColors.textSecondary, fontSize: 12),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _confirmLogout() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: LiveColors.backgroundSurface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: LiveColors.border),
        ),
        title: Row(
          children: [
            const Icon(Icons.logout, color: Colors.redAccent, size: 24),
            const SizedBox(width: 10),
            Text('Log Out'.tr, style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
          ],
        ),
        content: Text(
          'Are you sure you want to log out of your account? You will be signed out of your account as well.'.tr,
          style: GoogleFonts.plusJakartaSans(color: Colors.white70, fontSize: 13),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('Cancel'.tr, style: GoogleFonts.plusJakartaSans(color: LiveColors.textSecondary)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.redAccent,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () async {
              Navigator.pop(ctx);
              await AuthService().logout();
              widget.onLogout();
            },
            child: Text('Log Out'.tr, style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  void _confirmDeleteAccount() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: LiveColors.backgroundSurface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
          side: const BorderSide(color: Colors.redAccent, width: 1.2),
        ),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.redAccent.withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.delete_forever_rounded, color: Colors.redAccent, size: 24),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'Delete Account?'.tr,
                style: GoogleFonts.plusJakartaSans(
                  color: Colors.white,
                  fontWeight: FontWeight.w800,
                  fontSize: 18,
                ),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Are you sure you want to permanently delete your account?'.tr,
              style: GoogleFonts.plusJakartaSans(
                color: Colors.white,
                fontWeight: FontWeight.w700,
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.redAccent.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: Colors.redAccent.withValues(alpha: 0.3)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '⚠️ This action is permanent and cannot be undone:'.tr,
                    style: GoogleFonts.plusJakartaSans(
                      color: const Color(0xFFFCA5A5),
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    '• All coins and diamonds will be permanently erased.\n• Your profile, username, and stream history will be purged.\n• All moments posts, comments, and follower ties will be deleted.'.tr,
                    style: GoogleFonts.plusJakartaSans(
                      color: const Color(0xFFFEE2E2),
                      fontSize: 11.5,
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(
              'Keep Account'.tr,
              style: GoogleFonts.plusJakartaSans(
                color: LiveColors.textSecondary,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.redAccent,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              elevation: 0,
            ),
            onPressed: () {
              Navigator.pop(ctx);
              _executeAccountDeletion();
            },
            child: Text(
              'Yes, Delete Forever'.tr,
              style: GoogleFonts.plusJakartaSans(
                fontWeight: FontWeight.bold,
                fontSize: 13,
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _executeAccountDeletion() async {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dlgCtx) => PopScope(
        canPop: false,
        child: Center(
          child: Container(
            padding: const EdgeInsets.all(24),
            margin: const EdgeInsets.symmetric(horizontal: 36),
            decoration: BoxDecoration(
              color: LiveColors.backgroundSurface,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: LiveColors.border),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const SizedBox(
                  width: 38,
                  height: 38,
                  child: CircularProgressIndicator(color: Colors.redAccent, strokeWidth: 3),
                ),
                const SizedBox(height: 16),
                Text(
                  'Deleting Account...'.tr,
                  style: GoogleFonts.plusJakartaSans(
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Purging personal data, wallet balances, and active sessions.'.tr,
                  textAlign: TextAlign.center,
                  style: GoogleFonts.plusJakartaSans(
                    color: LiveColors.textSecondary,
                    fontSize: 11.5,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );

    final res = await AuthService().deleteAccount();

    if (mounted) {
      Navigator.of(context, rootNavigator: true).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(res['message'] ?? 'Account permanently deleted successfully.'),
          backgroundColor: Colors.redAccent,
        ),
      );
      widget.onLogout();
    }
  }

  void _openEditProfileSheet() {
    final user = AuthService().currentUser;
    final nameController = TextEditingController(text: user?.displayName ?? '');
    final usernameController = TextEditingController(text: user?.username ?? '');
    final bioController = TextEditingController(text: user?.bio ?? '');
    String selectedCountry = (user?.country != null && user!.country.isNotEmpty) ? user.country : 'United States 🇺🇸';
    String selectedGender = (user?.gender != null && user!.gender.isNotEmpty) ? user.gender : 'Female';
    DateTime selectedBirthday = DateTime.tryParse(user?.birthday ?? '') ?? DateTime(2000, 1, 1);
    bool isSaving = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: LiveColors.backgroundSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Padding(
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
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: LiveColors.accentPurple.withValues(alpha: 0.2),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.edit, color: LiveColors.accentPink, size: 20),
                        ),
                        const SizedBox(width: 10),
                        Text(
                          'Edit Profile Details'.tr,
                          style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, color: LiveColors.textSecondary),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Display Name
                TextField(
                  controller: nameController,
                  style: GoogleFonts.plusJakartaSans(color: Colors.white, fontSize: 14),
                  decoration: InputDecoration(
                    labelText: 'Display Name'.tr,
                    labelStyle: GoogleFonts.plusJakartaSans(color: LiveColors.textSecondary),
                    prefixIcon: const Icon(Icons.badge_outlined, color: LiveColors.accentPurple),
                    filled: true,
                    fillColor: LiveColors.backgroundInput,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: LiveColors.border)),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: LiveColors.border)),
                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: LiveColors.accentPink, width: 1.5)),
                  ),
                ),
                const SizedBox(height: 12),

                // Username / Handle
                TextField(
                  controller: usernameController,
                  style: GoogleFonts.plusJakartaSans(color: Colors.white, fontSize: 14),
                  decoration: InputDecoration(
                    labelText: 'Username (@handle)'.tr,
                    labelStyle: GoogleFonts.plusJakartaSans(color: LiveColors.textSecondary),
                    prefixIcon: const Icon(Icons.alternate_email, color: LiveColors.accentPurple),
                    filled: true,
                    fillColor: LiveColors.backgroundInput,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: LiveColors.border)),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: LiveColors.border)),
                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: LiveColors.accentPink, width: 1.5)),
                  ),
                ),
                const SizedBox(height: 12),

                // Bio
                TextField(
                  controller: bioController,
                  maxLines: 2,
                  style: GoogleFonts.plusJakartaSans(color: Colors.white, fontSize: 13),
                  decoration: InputDecoration(
                    labelText: 'Bio / Motto'.tr,
                    labelStyle: GoogleFonts.plusJakartaSans(color: LiveColors.textSecondary),
                    prefixIcon: const Icon(Icons.format_quote_rounded, color: LiveColors.accentPurple),
                    filled: true,
                    fillColor: LiveColors.backgroundInput,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: LiveColors.border)),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: LiveColors.border)),
                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: LiveColors.accentPink, width: 1.5)),
                  ),
                ),
                const SizedBox(height: 14),

                // Gender Selector matching Screenshot 2
                Text('Gender'.tr, style: GoogleFonts.plusJakartaSans(color: LiveColors.textSecondary, fontSize: 12, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Row(
                  children: ['Female', 'Male'].map((g) {
                    final isSel = selectedGender == g;
                    return Expanded(
                      child: GestureDetector(
                        onTap: () => setSheetState(() => selectedGender = g),
                        child: Container(
                          margin: const EdgeInsets.symmetric(horizontal: 4),
                          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
                          decoration: BoxDecoration(
                            color: LiveColors.backgroundInput,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: isSel ? LiveColors.accentPink : LiveColors.border,
                              width: isSel ? 1.5 : 1,
                            ),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                g.tr,
                                style: GoogleFonts.plusJakartaSans(
                                  color: isSel ? Colors.white : LiveColors.textSecondary,
                                  fontWeight: isSel ? FontWeight.bold : FontWeight.w500,
                                  fontSize: 14,
                                ),
                              ),
                              Container(
                                width: 20,
                                height: 20,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color: isSel ? LiveColors.accentPink : LiveColors.textSecondary.withValues(alpha: 0.5),
                                    width: 2,
                                  ),
                                ),
                                child: isSel
                                    ? Center(
                                        child: Container(
                                          width: 10,
                                          height: 10,
                                          decoration: const BoxDecoration(
                                            shape: BoxShape.circle,
                                            color: LiveColors.accentPink,
                                          ),
                                        ),
                                      )
                                    : null,
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 14),

                // Country Dropdown
                Text('Country / Region'.tr, style: GoogleFonts.plusJakartaSans(color: LiveColors.textSecondary, fontSize: 12, fontWeight: FontWeight.bold)),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                  decoration: BoxDecoration(
                    color: LiveColors.backgroundInput,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: LiveColors.border),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      isExpanded: true,
                      value: [
                        'United States 🇺🇸', 'India 🇮🇳', 'United Kingdom 🇬🇧', 'Canada 🇨🇦',
                        'Saudi Arabia 🇸🇦', 'United Arab Emirates 🇦🇪', 'Singapore 🇸🇬',
                        'Germany 🇩🇪', 'France 🇫🇷', 'Australia 🇦🇺', 'Japan 🇯🇵',
                        'South Korea 🇰🇷', 'Brazil 🇧🇷', 'Indonesia 🇮🇩', 'Philippines 🇵🇭',
                        'Pakistan 🇵🇰', 'Turkey 🇹🇷', 'Egypt 🇪🇬', 'Nigeria 🇳🇬', 'Mexico 🇲🇽', 'Global 🌍'
                      ].contains(selectedCountry) ? selectedCountry : 'Global 🌍',
                      dropdownColor: LiveColors.backgroundSurface,
                      style: GoogleFonts.plusJakartaSans(color: Colors.white, fontSize: 13),
                      icon: const Icon(Icons.arrow_drop_down, color: Colors.white70),
                      items: [
                        'United States 🇺🇸', 'India 🇮🇳', 'United Kingdom 🇬🇧', 'Canada 🇨🇦',
                        'Saudi Arabia 🇸🇦', 'United Arab Emirates 🇦🇪', 'Singapore 🇸🇬',
                        'Germany 🇩🇪', 'France 🇫🇷', 'Australia 🇦🇺', 'Japan 🇯🇵',
                        'South Korea 🇰🇷', 'Brazil 🇧🇷', 'Indonesia 🇮🇩', 'Philippines 🇵🇭',
                        'Pakistan 🇵🇰', 'Turkey 🇹🇷', 'Egypt 🇪🇬', 'Nigeria 🇳🇬', 'Mexico 🇲🇽', 'Global 🌍'
                      ].map((c) => DropdownMenuItem(value: c, child: Text(c.tr, maxLines: 1, overflow: TextOverflow.ellipsis))).toList(),
                      onChanged: (val) {
                        if (val != null) setSheetState(() => selectedCountry = val);
                      },
                    ),
                  ),
                ),
                const SizedBox(height: 20),

                // Full-width Gradient Save Changes Button matching Screenshot 2
                GestureDetector(
                  onTap: isSaving ? null : () async {
                    final newName = nameController.text.trim();
                    if (newName.isEmpty) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Display Name cannot be empty'.tr, style: GoogleFonts.plusJakartaSans())),
                      );
                      return;
                    }

                    setSheetState(() => isSaving = true);

                    final cleanUsername = usernameController.text.trim().replaceAll('@', '');
                    final birthdayStr = '${selectedBirthday.year}-${selectedBirthday.month.toString().padLeft(2, '0')}-${selectedBirthday.day.toString().padLeft(2, '0')}';

                    final saved = await AuthService().updateProfile(
                      username: cleanUsername.isNotEmpty ? cleanUsername : null,
                      displayName: newName,
                      bio: bioController.text.trim(),
                      gender: selectedGender,
                      country: selectedCountry,
                      birthday: birthdayStr,
                    );

                    if (!ctx.mounted) return;
                    if (!saved) {
                      setSheetState(() => isSaving = false);
                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            backgroundColor: Colors.redAccent,
                            content: Text('Could not save profile. Please try again.'.tr, style: GoogleFonts.plusJakartaSans(color: Colors.white)),
                          ),
                        );
                      }
                      return;
                    }
                    Navigator.pop(ctx);

                    if (mounted) {
                      setState(() {});
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          backgroundColor: const Color(0xFF10B981),
                          content: Row(
                            children: [
                              const Icon(Icons.check_circle, color: Colors.white, size: 20),
                              const SizedBox(width: 8),
                              Text('Profile updated successfully! ✨'.tr, style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold)),
                            ],
                          ),
                        ),
                      );
                    }
                  },
                  child: Container(
                    width: double.infinity,
                    height: 52,
                    decoration: BoxDecoration(
                      gradient: LiveColors.primaryGradient,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: LiveColors.accentPink.withValues(alpha: 0.35),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    alignment: Alignment.center,
                    child: isSaving
                        ? const SizedBox(
                            width: 22,
                            height: 22,
                            child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white),
                          )
                        : Text(
                            'Save Changes'.tr,
                            style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _openCustomIdSheet() {
    final user = AuthService().currentUser;
    final vipLevel = user?.vipLevel ?? 0;
    final canUseCustomId = vipLevel >= 1 && LevelService().userHasFeature(vipLevel, 'customId');
    if (!canUseCustomId) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: Colors.orange.shade800,
          content: Text('Custom ID is a VIP 1+ benefit. Upgrade your VIP tier to claim a vanity ID.'.tr),
        ),
      );
      return;
    }
    final idController = TextEditingController(text: user?.customId ?? '');
    bool isSaving = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: LiveColors.backgroundSurface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
            left: 20,
            right: 20,
            top: 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(colors: [Color(0xFF3B82F6), Color(0xFF8B5CF6)]),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(Icons.stars, color: Colors.amberAccent, size: 20),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'VIP Custom Vanity ID'.tr,
                            style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(icon: const Icon(Icons.close, color: Colors.grey), onPressed: () => Navigator.pop(ctx)),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                'Customize your unique platform ID. This ID appears in all video and voice party rooms when you chat or comment.'.tr,
                style: GoogleFonts.plusJakartaSans(color: LiveColors.textSecondary, fontSize: 12),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: idController,
                maxLength: 20,
                style: GoogleFonts.plusJakartaSans(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
                decoration: InputDecoration(
                  labelText: 'Custom ID (e.g. STAR_KING)'.tr,
                  labelStyle: GoogleFonts.plusJakartaSans(color: LiveColors.textSecondary),
                  prefixIcon: const Icon(Icons.fingerprint, color: Color(0xFF6366F1)),
                  filled: true,
                  fillColor: LiveColors.backgroundInput,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: LiveColors.border)),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: LiveColors.border)),
                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFF6366F1), width: 1.5)),
                ),
              ),
              const SizedBox(height: 14),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    padding: EdgeInsets.zero,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  onPressed: isSaving ? null : () async {
                    if (user == null) return;
                    final val = idController.text.trim();
                    if (val.isEmpty) return;

                    final nav = Navigator.of(ctx);
                    final messenger = ScaffoldMessenger.of(context);

                    setSheetState(() => isSaving = true);
                    final success = await ApiService().setCustomId(user.id, val);
                    setSheetState(() => isSaving = false);

                    nav.pop();
                    if (success) {
                      await AuthService().updateProfile(customId: val);
                      messenger.showSnackBar(
                        SnackBar(backgroundColor: const Color(0xFF10B981), content: Text('Custom ID updated to $val! ✨'.tr)),
                      );
                    } else {
                      messenger.showSnackBar(
                        SnackBar(backgroundColor: Colors.redAccent, content: Text('Could not save Custom ID. Please try again.'.tr)),
                      );
                    }
                  },
                  child: Ink(
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(colors: [Color(0xFF3B82F6), Color(0xFF8B5CF6)]),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Container(
                      alignment: Alignment.center,
                      child: isSaving
                          ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : Text('Save Custom ID'.tr, style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _openVisitorsSheet() {
    final user = AuthService().currentUser;
    if (user == null) return;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: LiveColors.backgroundSurface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.65,
        minChildSize: 0.4,
        maxChildSize: 0.9,
        expand: false,
        builder: (ctx, scrollController) => Column(
          children: [
            Container(
              margin: const EdgeInsets.symmetric(vertical: 12),
              width: 40,
              height: 4,
              decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(2)),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(colors: [Color(0xFF3B82F6), Color(0xFF60A5FA)]),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(Icons.remove_red_eye_rounded, color: Colors.white, size: 20),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'Profile Visitors 👁️'.tr,
                          style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
                  IconButton(icon: const Icon(Icons.close, color: Colors.grey), onPressed: () => Navigator.pop(ctx)),
                ],
              ),
            ),
            const Divider(color: LiveColors.border),
            Expanded(
              child: FutureBuilder<List<Map<String, dynamic>>>(
                future: ApiService().getProfileVisitors(user.id),
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Center(child: CircularProgressIndicator(color: Color(0xFF6366F1)));
                  }
                  final visitors = snapshot.data ?? [];
                  if (visitors.isEmpty) {
                    return Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.visibility_off_outlined, color: Colors.white24, size: 48),
                          const SizedBox(height: 12),
                          Text('No recent visitors'.tr, style: GoogleFonts.plusJakartaSans(color: Colors.white70, fontWeight: FontWeight.bold, fontSize: 15)),
                          const SizedBox(height: 4),
                          Text('Go live or share moments to gain attention! ✨'.tr, style: GoogleFonts.plusJakartaSans(color: LiveColors.textSecondary, fontSize: 12)),
                        ],
                      ),
                    );
                  }

                  return ListView.separated(
                    controller: scrollController,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    itemCount: visitors.length,
                    separatorBuilder: (_, __) => const Divider(color: Colors.white10),
                    itemBuilder: (ctx, i) {
                      final item = visitors[i];
                      final visitor = item['visitor'] ?? item;
                      final name = visitor['displayName'] ?? visitor['username'] ?? 'User';
                      final avatar = visitor['avatarUrl'];
                      final vip = (visitor['vipLevel'] ?? 0) as int;
                      final customId = visitor['customId'] as String?;
                      final timeStr = item['visitedAt'] != null ? item['visitedAt'].toString().split('T').first : 'Recently';

                      return ListTile(
                        leading: UserAvatarWithFrame(
                          avatarUrl: avatar,
                          vipLevel: vip,
                          size: 42,
                          showBadge: vip >= 1,
                        ),
                        title: Row(
                          children: [
                            Flexible(child: Text(name, style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14), overflow: TextOverflow.ellipsis)),
                            if (vip >= 1) ...[
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                                decoration: BoxDecoration(
                                  gradient: const LinearGradient(colors: [Color(0xFF3B82F6), Color(0xFF8B5CF6)]),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text('VIP $vip', style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold)),
                              ),
                            ],
                          ],
                        ),
                        subtitle: Text(
                          customId != null && customId.isNotEmpty ? 'ID: $customId • $timeStr' : timeStr,
                          style: GoogleFonts.plusJakartaSans(color: LiveColors.textSecondary, fontSize: 11),
                        ),
                        trailing: const Icon(Icons.arrow_forward_ios, size: 12, color: Colors.grey),
                        onTap: () {
                          if (visitor['id'] != null) {
                            Navigator.push(context, MaterialPageRoute(builder: (_) => UserContentScreen(userId: visitor['id'])));
                          }
                        },
                      );
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _openVipPrivacySheet() {
    final user = AuthService().currentUser;
    if (user == null) return;
    final vipLevel = user.vipLevel;

    final settings = Map<String, dynamic>.from(user.vipSettings ?? {});
    bool rejectStrangers = settings['rejectStrangerMessages'] == true;
    bool disableFollow = settings['disableFollowing'] == true;
    bool hideLoc = settings['hideLocationInRooms'] == true;
    bool anonymousGames = settings['anonymousInGames'] == true;
    bool invisibleOnline = settings['invisibleOnlineStatus'] == true;
    bool hideCountry = settings['hideCountry'] == true;
    bool mysteryMode = settings['mysteryMode'] == true;
    bool hideVisitors = settings['hideFromVisitors'] == true;
    bool hideTrending = settings['hideRoomFromTrending'] == true;
    bool stealthAccess = settings['stealthRoomAccess'] == true;

    bool hasBenefit(String key) => LevelService().userHasFeature(vipLevel, key);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: LiveColors.backgroundSurface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => SafeArea(
          child: Container(
            constraints: BoxConstraints(maxHeight: MediaQuery.of(ctx).size.height * 0.8),
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(colors: [Color(0xFF8B5CF6), Color(0xFFEC4899)]),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(Icons.security_rounded, color: Colors.white, size: 20),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              'VIP Privacy Controls 🛡️'.tr,
                              style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(icon: const Icon(Icons.close, color: Colors.grey), onPressed: () => Navigator.pop(ctx)),
                  ],
                ),
                const SizedBox(height: 8),
                Expanded(
                  child: SingleChildScrollView(
                    physics: const BouncingScrollPhysics(),
                    child: Column(
                      children: [
                        SwitchListTile(
                          contentPadding: EdgeInsets.zero,
                          activeThumbColor: const Color(0xFF6366F1),
                          title: Text('Reject Stranger Messages (VIP 1)'.tr, style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                          subtitle: Text('Only receive direct chats from users you follow'.tr, style: GoogleFonts.plusJakartaSans(color: LiveColors.textSecondary, fontSize: 11)),
                          value: rejectStrangers,
                          onChanged: (vipLevel >= 1 && hasBenefit('rejectStrangerMessages')) ? (val) async {
                            setSheetState(() => rejectStrangers = val);
                            settings['rejectStrangerMessages'] = val;
                            await ApiService().updateVipSettings(userId: user.id, settings: settings);
                            await AuthService().updateProfile(vipSettings: settings);
                          } : null,
                        ),
                        const Divider(color: Colors.white10),
                        SwitchListTile(
                          contentPadding: EdgeInsets.zero,
                          activeThumbColor: const Color(0xFF6366F1),
                          title: Text('Disable Following (VIP 1)'.tr, style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                          subtitle: Text('Prevent other users from following your profile'.tr, style: GoogleFonts.plusJakartaSans(color: LiveColors.textSecondary, fontSize: 11)),
                          value: disableFollow,
                          onChanged: (vipLevel >= 1 && hasBenefit('disableFollowing')) ? (val) async {
                            setSheetState(() => disableFollow = val);
                            settings['disableFollowing'] = val;
                            await ApiService().updateVipSettings(userId: user.id, settings: settings);
                            await AuthService().updateProfile(vipSettings: settings);
                          } : null,
                        ),
                        const Divider(color: Colors.white10),
                        SwitchListTile(
                          contentPadding: EdgeInsets.zero,
                          activeThumbColor: const Color(0xFF6366F1),
                          title: Text('Hide Location in Rooms (VIP 1)'.tr, style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                          subtitle: Text('Conceal your country and flag in live & audio rooms'.tr, style: GoogleFonts.plusJakartaSans(color: LiveColors.textSecondary, fontSize: 11)),
                          value: hideLoc,
                          onChanged: (vipLevel >= 1 && hasBenefit('hideLocationInRooms')) ? (val) async {
                            setSheetState(() => hideLoc = val);
                            settings['hideLocationInRooms'] = val;
                            await ApiService().updateVipSettings(userId: user.id, settings: settings);
                            await AuthService().updateProfile(vipSettings: settings);
                          } : null,
                        ),
                        const Divider(color: Colors.white10),
                        SwitchListTile(
                          contentPadding: EdgeInsets.zero,
                          activeThumbColor: const Color(0xFF38BDF8),
                          title: Text('Anonymous Mode in Games (VIP 2+)'.tr, style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                          subtitle: Text('Conceal your identity and name when playing 777 slots & wheel'.tr, style: GoogleFonts.plusJakartaSans(color: LiveColors.textSecondary, fontSize: 11)),
                          value: anonymousGames,
                          onChanged: (vipLevel >= 2 && hasBenefit('anonymousInGames')) ? (val) async {
                            setSheetState(() => anonymousGames = val);
                            settings['anonymousInGames'] = val;
                            await ApiService().updateVipSettings(userId: user.id, settings: settings);
                            await AuthService().updateProfile(vipSettings: settings);
                          } : null,
                        ),
                        const Divider(color: Colors.white10),
                        SwitchListTile(
                          contentPadding: EdgeInsets.zero,
                          activeThumbColor: const Color(0xFF10B981),
                          title: Text('Invisible Online Status (VIP 3+)'.tr, style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                          subtitle: Text('Hide green active indicator from friend lists and rooms'.tr, style: GoogleFonts.plusJakartaSans(color: LiveColors.textSecondary, fontSize: 11)),
                          value: invisibleOnline,
                          onChanged: (vipLevel >= 3 && hasBenefit('invisibleOnlineStatus')) ? (val) async {
                            setSheetState(() => invisibleOnline = val);
                            settings['invisibleOnlineStatus'] = val;
                            await ApiService().updateVipSettings(userId: user.id, settings: settings);
                            await AuthService().updateProfile(vipSettings: settings);
                          } : null,
                        ),
                        const Divider(color: Colors.white10),
                        SwitchListTile(
                          contentPadding: EdgeInsets.zero,
                          activeThumbColor: const Color(0xFF10B981),
                          title: Text('Hide Country / Flag (VIP 3+)'.tr, style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                          subtitle: Text('Remove country badge entirely from your profile card'.tr, style: GoogleFonts.plusJakartaSans(color: LiveColors.textSecondary, fontSize: 11)),
                          value: hideCountry,
                          onChanged: (vipLevel >= 3 && hasBenefit('hideCountry')) ? (val) async {
                            setSheetState(() => hideCountry = val);
                            settings['hideCountry'] = val;
                            await ApiService().updateVipSettings(userId: user.id, settings: settings);
                            await AuthService().updateProfile(vipSettings: settings);
                          } : null,
                        ),
                        const Divider(color: Colors.white10),
                        SwitchListTile(
                          contentPadding: EdgeInsets.zero,
                          activeThumbColor: const Color(0xFFF59E0B),
                          title: Text('Mystery Mode (VIP 4+)'.tr, style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                          subtitle: Text('Browse social moments and feeds with mystery avatar aura'.tr, style: GoogleFonts.plusJakartaSans(color: LiveColors.textSecondary, fontSize: 11)),
                          value: mysteryMode,
                          onChanged: (vipLevel >= 4 && hasBenefit('mysteryMode')) ? (val) async {
                            setSheetState(() => mysteryMode = val);
                            settings['mysteryMode'] = val;
                            await ApiService().updateVipSettings(userId: user.id, settings: settings);
                            await AuthService().updateProfile(vipSettings: settings);
                          } : null,
                        ),
                        const Divider(color: Colors.white10),
                        SwitchListTile(
                          contentPadding: EdgeInsets.zero,
                          activeThumbColor: const Color(0xFFF59E0B),
                          title: Text('Hide From Profile Visitors (VIP 4+)'.tr, style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                          subtitle: Text('Do not show up in visitor histories when viewing other profiles'.tr, style: GoogleFonts.plusJakartaSans(color: LiveColors.textSecondary, fontSize: 11)),
                          value: hideVisitors,
                          onChanged: (vipLevel >= 4 && hasBenefit('hideFromVisitors')) ? (val) async {
                            setSheetState(() => hideVisitors = val);
                            settings['hideFromVisitors'] = val;
                            await ApiService().updateVipSettings(userId: user.id, settings: settings);
                            await AuthService().updateProfile(vipSettings: settings);
                          } : null,
                        ),
                        const Divider(color: Colors.white10),
                        SwitchListTile(
                          contentPadding: EdgeInsets.zero,
                          activeThumbColor: const Color(0xFFEF4444),
                          title: Text('Hide Room From Trending (VIP 5+)'.tr, style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                          subtitle: Text('Exclude your hosted rooms from public algorithm discovery'.tr, style: GoogleFonts.plusJakartaSans(color: LiveColors.textSecondary, fontSize: 11)),
                          value: hideTrending,
                          onChanged: (vipLevel >= 5 && hasBenefit('hideRoomFromTrending')) ? (val) async {
                            setSheetState(() => hideTrending = val);
                            settings['hideRoomFromTrending'] = val;
                            await ApiService().updateVipSettings(userId: user.id, settings: settings);
                            await AuthService().updateProfile(vipSettings: settings);
                          } : null,
                        ),
                        const Divider(color: Colors.white10),
                        SwitchListTile(
                          contentPadding: EdgeInsets.zero,
                          activeThumbColor: const Color(0xFFFFD700),
                          title: Text('Stealth Room Access (VIP 8)'.tr, style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                          subtitle: Text('Enter any room silently without join notification or toast'.tr, style: GoogleFonts.plusJakartaSans(color: LiveColors.textSecondary, fontSize: 11)),
                          value: stealthAccess,
                          onChanged: (vipLevel >= 8 && hasBenefit('stealthRoomAccess')) ? (val) async {
                            setSheetState(() => stealthAccess = val);
                            settings['stealthRoomAccess'] = val;
                            await ApiService().updateVipSettings(userId: user.id, settings: settings);
                            await AuthService().updateProfile(vipSettings: settings);
                          } : null,
                        ),
                        const SizedBox(height: 12),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _openVipPrivilegeSheet() {
    final user = AuthService().currentUser;
    final userVip = user?.vipLevel ?? 0;

    final Map<int, List<Map<String, dynamic>>> vipTierPerks = {
      1: [
        {'title': 'Unlimited chat', 'desc': 'Chat freely in all live & party rooms without message throttle.', 'icon': Icons.chat_rounded, 'color': const Color(0xFF60A5FA)},
        {'title': 'Send private photos and comments without limits', 'desc': 'Attach photos and post comments without limits.', 'icon': Icons.image_rounded, 'color': const Color(0xFFF472B6)},
        {'title': 'View profile visitors', 'desc': 'Track all visitors checking out your profile.', 'icon': Icons.remove_red_eye_rounded, 'color': const Color(0xFF34D399)},
        {'title': 'Lock rooms', 'desc': 'Host PIN-protected private live and voice rooms.', 'icon': Icons.lock_rounded, 'color': const Color(0xFFFBBF24)},
        {'title': 'Animated profile picture', 'desc': 'Rotating radiant luxury aura encircling your avatar.', 'icon': Icons.motion_photos_on_rounded, 'color': const Color(0xFFA78BFA)},
        {'title': 'Choose a room cover', 'desc': 'Pick custom cover from device photo gallery for rooms.', 'icon': Icons.photo_library_rounded, 'color': const Color(0xFF38BDF8)},
        {'title': 'Reject messages from strangers', 'desc': 'Block unsolicited direct chats from strangers.', 'icon': Icons.mark_chat_read_rounded, 'color': const Color(0xFFF87171)},
        {'title': 'Disable following', 'desc': 'Disable incoming profile follows for total privacy.', 'icon': Icons.person_off_rounded, 'color': const Color(0xFF818CF8)},
        {'title': 'Hide your location in rooms', 'desc': 'Conceal geographic location and flags in rooms.', 'icon': Icons.location_off_rounded, 'color': const Color(0xFF94A3B8)},
        {'title': 'Special VIP gifts', 'desc': 'Exclusive access to Neon Cruiser and VIP gift set.', 'icon': Icons.card_giftcard_rounded, 'color': const Color(0xFFF59E0B)},
        {'title': 'Custom ID', 'desc': 'Claim an exclusive vanity alphanumeric ID tag.', 'icon': Icons.stars_rounded, 'color': const Color(0xFF8B5CF6)},
        {'title': 'VIP 1 badge', 'desc': 'Distinguished VIP 1 luxury badge.', 'icon': Icons.workspace_premium_rounded, 'color': const Color(0xFF3B82F6)},
        {'title': 'VIP 1 frame', 'desc': 'Glowing blue specular avatar frame.', 'icon': Icons.filter_vintage_rounded, 'color': const Color(0xFF60A5FA)},
      ],
      2: [
        {'title': 'Anonymous mode during games', 'desc': 'Conceal identity when playing 777 slots, wheel, and dice.', 'icon': Icons.visibility_off, 'color': const Color(0xFF38BDF8)},
        {'title': 'Custom name color', 'desc': 'Select custom glowing display name color in chat.', 'icon': Icons.palette_rounded, 'color': const Color(0xFF818CF8)},
        {'title': 'VIP chat bubble', 'desc': 'Exclusive illuminated neon chat bubble in streams.', 'icon': Icons.mode_comment_rounded, 'color': const Color(0xFFC084FC)},
        {'title': 'VIP 2 badge', 'desc': 'Distinguished VIP 2 sapphire badge.', 'icon': Icons.workspace_premium_rounded, 'color': const Color(0xFF2563EB)},
        {'title': 'VIP 2 frame', 'desc': 'Sapphire & Gold dynamic animated frame.', 'icon': Icons.filter_vintage_rounded, 'color': const Color(0xFF38BDF8)},
      ],
      3: [
        {'title': 'Invisible online status', 'desc': 'Browse and watch without green active indicator.', 'icon': Icons.fiber_manual_record_outlined, 'color': const Color(0xFF34D399)},
        {'title': 'Hide country', 'desc': 'Conceal origin country badge on profile.', 'icon': Icons.public_off_rounded, 'color': const Color(0xFF059669)},
        {'title': 'VIP 3 badge', 'desc': 'Emerald elite VIP 3 insignia.', 'icon': Icons.workspace_premium_rounded, 'color': const Color(0xFF059669)},
        {'title': 'VIP 3 frame', 'desc': 'Emerald radiant luxury frame with particles.', 'icon': Icons.filter_vintage_rounded, 'color': const Color(0xFF34D399)},
      ],
      4: [
        {'title': 'Mystery mode', 'desc': 'Stealth profile mode when viewing moments.', 'icon': Icons.theater_comedy_rounded, 'color': const Color(0xFFF59E0B)},
        {'title': 'Hide from profile visitors', 'desc': 'Browse other profiles without leaving footprints.', 'icon': Icons.visibility_off_rounded, 'color': const Color(0xFFD97706)},
        {'title': 'Special entry effect', 'desc': 'Dramatic golden flash entry effect when joining rooms.', 'icon': Icons.auto_awesome, 'color': const Color(0xFFFBBF24)},
        {'title': 'VIP 4 badge', 'desc': 'Amber gold VIP 4 master badge.', 'icon': Icons.workspace_premium_rounded, 'color': const Color(0xFFD97706)},
        {'title': 'VIP 4 frame', 'desc': 'Golden palace animated luxury frame.', 'icon': Icons.filter_vintage_rounded, 'color': const Color(0xFFF59E0B)},
      ],
      5: [
        {'title': 'Hide room from trending topics', 'desc': 'Keep your room unlisted on explore discover page.', 'icon': Icons.trending_down_rounded, 'color': const Color(0xFFEC4899)},
        {'title': 'Kick Protection', 'desc': 'Immunity from room moderator kicks in voice & video.', 'icon': Icons.shield_rounded, 'color': const Color(0xFF10B981)},
        {'title': 'Ban Protection', 'desc': 'Cannot be banned from comments or rooms by hosts.', 'icon': Icons.security_rounded, 'color': const Color(0xFF6366F1)},
        {'title': 'Animated VIP frame', 'desc': 'Pulsating celestial frame with ruby flame aura.', 'icon': Icons.animation_rounded, 'color': const Color(0xFFE11D48)},
        {'title': 'VIP 5 badge', 'desc': 'Ruby emperor VIP 5 badge.', 'icon': Icons.workspace_premium_rounded, 'color': const Color(0xFFE11D48)},
      ],
      6: [
        {'title': 'VIP announcement in all rooms (limited daily)', 'desc': 'Broadcast server-wide arrival banners across rooms.', 'icon': Icons.campaign_rounded, 'color': const Color(0xFFF97316)},
        {'title': 'Additional gift set', 'desc': 'Unlock Phoenix Sovereign and high-roller gifts.', 'icon': Icons.redeem_rounded, 'color': const Color(0xFFFB923C)},
        {'title': 'Higher priority in lists', 'desc': 'Top ranking placement in room audience lists.', 'icon': Icons.arrow_upward_rounded, 'color': const Color(0xFF8B5CF6)},
        {'title': 'VIP 6 badge', 'desc': 'Sapphire sovereign VIP 6 badge.', 'icon': Icons.workspace_premium_rounded, 'color': const Color(0xFF4F46E5)},
        {'title': 'VIP 6 frame', 'desc': 'Sapphire & hot pink mythic vortex frame.', 'icon': Icons.filter_vintage_rounded, 'color': const Color(0xFF818CF8)},
      ],
      7: [
        {'title': 'Immunity from being kicked', 'desc': 'Absolute immunity from host/moderator kicks.', 'icon': Icons.verified_user_rounded, 'color': const Color(0xFF10B981)},
        {'title': 'VIP announcement in all rooms', 'desc': 'Unlimited server-wide high priority arrival announcements.', 'icon': Icons.volume_up_rounded, 'color': const Color(0xFFF59E0B)},
        {'title': 'App login notification', 'desc': 'Platform-wide notification sent to friends on login.', 'icon': Icons.notifications_active_rounded, 'color': const Color(0xFFA855F7)},
        {'title': 'Legendary login effect', 'desc': 'Celestial dragon full-screen entrance animation.', 'icon': Icons.flash_on_rounded, 'color': const Color(0xFFEC4899)},
        {'title': 'Special unique name', 'desc': 'Iridescent prismatic name styling in all rooms.', 'icon': Icons.auto_fix_high_rounded, 'color': const Color(0xFFFFD700)},
        {'title': 'VIP 7 badge', 'desc': 'Diamond magenta VIP 7 badge.', 'icon': Icons.workspace_premium_rounded, 'color': const Color(0xFFC026D3)},
        {'title': 'VIP 7 frame', 'desc': 'Legendary crimson-gold celestial dragon frame.', 'icon': Icons.filter_vintage_rounded, 'color': const Color(0xFFE11D48)},
      ],
      8: [
        {'title': 'Unique and exclusive name', 'desc': 'One-of-a-kind supreme imperial holographic name.', 'icon': Icons.stars_rounded, 'color': const Color(0xFFFFD700)},
        {'title': 'Stealthy room access without notification', 'desc': 'Enter any room completely silently without notification.', 'icon': Icons.visibility_off_rounded, 'color': const Color(0xFF94A3B8)},
        {'title': 'Top VIP frame', 'desc': 'Apex Throne of Eternity 4-color rainbow prismatic frame.', 'icon': Icons.filter_vintage_rounded, 'color': const Color(0xFFFFD700)},
        {'title': 'Highest login effect', 'desc': 'Supreme celestial supernova login animation.', 'icon': Icons.local_fire_department_rounded, 'color': const Color(0xFFFF4500)},
        {'title': 'Top VIP badge', 'desc': 'Highest pinnacle VIP 8 Mythic Sovereign badge.', 'icon': Icons.workspace_premium_rounded, 'color': const Color(0xFFFFD700)},
        {'title': 'Exclusive VIP identity', 'desc': 'Unlocks special crown icon beside vanity ID.', 'icon': Icons.military_tech_rounded, 'color': const Color(0xFFEC4899)},
        {'title': 'Maximum system priority', 'desc': 'Absolute #1 ranking in all room member lists & chats.', 'icon': Icons.vertical_align_top_rounded, 'color': const Color(0xFF00FFFF)},
      ],
    };

    int selectedTier = userVip >= 1 ? userVip.clamp(1, 8) : 1;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: LiveColors.backgroundSurface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) {
          // Collect all perks up to selectedTier
          final currentTierPerks = <Map<String, dynamic>>[];
          for (int t = 1; t <= selectedTier; t++) {
            if (vipTierPerks.containsKey(t)) {
              currentTierPerks.addAll(vipTierPerks[t]!);
            }
          }

          final isUnlocked = userVip >= selectedTier;

          return DraggableScrollableSheet(
            initialChildSize: 0.8,
            minChildSize: 0.5,
            maxChildSize: 0.95,
            expand: false,
            builder: (ctx, scrollController) => Column(
              children: [
                Container(margin: const EdgeInsets.symmetric(vertical: 12), width: 40, height: 4, decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(2))),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                gradient: const LinearGradient(colors: [Color(0xFF3B82F6), Color(0xFF8B5CF6)]),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Icon(Icons.workspace_premium_rounded, color: Colors.amberAccent, size: 20),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                'VIP 1 to 8 Privileges Suite 👑'.tr,
                                style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(icon: const Icon(Icons.close, color: Colors.grey), onPressed: () => Navigator.pop(ctx)),
                    ],
                  ),
                ),

                // VIP 1 - 8 Tier Tabs
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Row(
                    children: List.generate(8, (i) {
                      final tierNum = i + 1;
                      final isSelected = selectedTier == tierNum;
                      final isOwned = userVip >= tierNum;

                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: GestureDetector(
                          onTap: () => setSheetState(() => selectedTier = tierNum),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              gradient: isSelected
                                  ? const LinearGradient(colors: [Color(0xFFF59E0B), Color(0xFFEC4899)])
                                  : null,
                              color: isSelected ? null : Colors.white.withValues(alpha: 0.08),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: isSelected
                                    ? Colors.amberAccent
                                    : (isOwned ? const Color(0xFF10B981) : Colors.white12),
                                width: isSelected ? 1.5 : 1,
                              ),
                            ),
                            child: Row(
                              children: [
                                if (isOwned) ...[
                                  const Icon(Icons.check_circle, color: Color(0xFF10B981), size: 12),
                                  const SizedBox(width: 4),
                                ],
                                Text(
                                  'VIP $tierNum',
                                  style: TextStyle(
                                    color: isSelected ? Colors.white : (isOwned ? Colors.white70 : Colors.grey),
                                    fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    }),
                  ),
                ),

                // Status Banner for Selected Tier
                Container(
                  margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: isUnlocked ? const Color(0xFF10B981).withValues(alpha: 0.15) : const Color(0xFFF59E0B).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: isUnlocked ? const Color(0xFF10B981).withValues(alpha: 0.3) : const Color(0xFFF59E0B).withValues(alpha: 0.3)),
                  ),
                  child: Row(
                    children: [
                      Icon(isUnlocked ? Icons.verified_rounded : Icons.lock_outline_rounded, color: isUnlocked ? const Color(0xFF10B981) : const Color(0xFFF59E0B), size: 16),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          isUnlocked
                              ? '${'VIP'.tr} $selectedTier: ${'Active & Unlocked!'.tr}'
                              : '${'VIP'.tr} $selectedTier: ${'Spend required monthly recharge to unlock all'.tr} ${currentTierPerks.length} ${'perks.'.tr}',
                          style: TextStyle(color: isUnlocked ? const Color(0xFF10B981) : const Color(0xFFF59E0B), fontSize: 11, fontWeight: FontWeight.bold),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),

                const Divider(color: LiveColors.border),
                Expanded(
                  child: ListView.builder(
                    controller: scrollController,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                    itemCount: currentTierPerks.length,
                    itemBuilder: (ctx, idx) {
                      final p = currentTierPerks[idx];
                      return Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        decoration: BoxDecoration(
                          color: LiveColors.backgroundInput,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: Colors.white10),
                        ),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: (p['color'] as Color).withValues(alpha: 0.15),
                                shape: BoxShape.circle,
                              ),
                              child: Icon(p['icon'] as IconData, color: p['color'] as Color, size: 20),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    (p['title'] as String).tr,
                                    style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    (p['desc'] as String).tr,
                                    style: GoogleFonts.plusJakartaSans(color: LiveColors.textSecondary, fontSize: 11),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 8),
                            Icon(isUnlocked ? Icons.check_circle : Icons.lock, color: isUnlocked ? const Color(0xFF10B981) : Colors.grey, size: 16),
                          ],
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildVipPrivilegeCard(UserModel? user) {
    final vipLevel = user?.vipLevel ?? 0;
    final isVip = vipLevel >= 1;
    final spend = user?.monthlyRechargedUSD ?? 0.0;
    const targetSpend = 500.0; // VIP 1 threshold
    final progress = (spend / targetSpend).clamp(0.0, 1.0);

    return Container(
      margin: const EdgeInsets.only(top: 14, bottom: 6),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: isVip
              ? [const Color(0xFF1E1B4B), const Color(0xFF312E81), const Color(0xFF4C1D95)]
              : [const Color(0xFF1F2937), const Color(0xFF111827)],
        ),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(
          color: isVip ? const Color(0xFF818CF8) : Colors.white12,
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: (isVip ? const Color(0xFF6366F1) : Colors.black).withValues(alpha: 0.25),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        gradient: isVip
                            ? const LinearGradient(colors: [Color(0xFFF59E0B), Color(0xFFEC4899)])
                            : const LinearGradient(colors: [Color(0xFF4B5563), Color(0xFF374151)]),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.workspace_premium_rounded, color: Colors.white, size: 20),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            isVip ? 'VIP $vipLevel PRIVILEGE SUITE 👑' : 'VIP 1 MEMBERSHIP 👑',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.plusJakartaSans(
                              color: isVip ? Colors.amberAccent : Colors.white,
                              fontWeight: FontWeight.w900,
                              fontSize: 13,
                              letterSpacing: 0.8,
                            ),
                          ),
                          Text(
                            isVip ? 'All VIP $vipLevel privileges active' : 'Spend \$500/mo to unlock VIP 1',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.plusJakartaSans(color: Colors.white70, fontSize: 11),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              GestureDetector(
                onTap: _openVipPrivilegeSheet,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: Colors.white10,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.white24),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text('Perks'.tr, style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                      const SizedBox(width: 4),
                      const Icon(Icons.chevron_right, color: Colors.white, size: 14),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Monthly Spend Tracker Progress
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Monthly Spend'.tr,
                style: GoogleFonts.plusJakartaSans(color: Colors.white70, fontSize: 11),
              ),
              Text(
                '\$${spend.toStringAsFixed(0)} / \$${targetSpend.toStringAsFixed(0)} USD',
                style: GoogleFonts.plusJakartaSans(color: Colors.amberAccent, fontWeight: FontWeight.bold, fontSize: 11),
              ),
            ],
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 7,
              backgroundColor: Colors.white12,
              valueColor: AlwaysStoppedAnimation<Color>(isVip ? const Color(0xFFF59E0B) : const Color(0xFF6366F1)),
            ),
          ),
          const SizedBox(height: 14),

          // 4 Action Buttons: Vanity ID, Visitors, Privacy, Benefits
          Row(
            children: [
              Expanded(
                child: GestureDetector(
                  onTap: _openCustomIdSheet,
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: Colors.white12),
                    ),
                    child: Column(
                      children: [
                        const Icon(Icons.fingerprint, color: Color(0xFF818CF8), size: 18),
                        const SizedBox(height: 4),
                        Text('Custom ID'.tr, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: GestureDetector(
                  onTap: _openVisitorsSheet,
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: Colors.white12),
                    ),
                    child: Column(
                      children: [
                        const Icon(Icons.remove_red_eye_rounded, color: Color(0xFF34D399), size: 18),
                        const SizedBox(height: 4),
                        Text('Visitors'.tr, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: GestureDetector(
                  onTap: _openVipPrivacySheet,
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: Colors.white12),
                    ),
                    child: Column(
                      children: [
                        const Icon(Icons.security_rounded, color: Color(0xFFF472B6), size: 18),
                        const SizedBox(height: 4),
                        Text('Privacy'.tr, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: GestureDetector(
                  onTap: _openVipPrivilegeSheet,
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: Colors.white12),
                    ),
                    child: Column(
                      children: [
                        const Icon(Icons.card_giftcard, color: Color(0xFFFBBF24), size: 18),
                        const SizedBox(height: 4),
                        Text('Privileges'.tr, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSectionGroup({
    required String title,
    required IconData sectionIcon,
    required List<Widget> items,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 6, bottom: 8, top: 16),
          child: Row(
            children: [
              Icon(sectionIcon, size: 14, color: LiveColors.accentPurple),
              const SizedBox(width: 6),
              Text(
                title.toUpperCase(),
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: LiveColors.textMuted,
                  letterSpacing: 1.1,
                ),
              ),
            ],
          ),
        ),
        Container(
          decoration: BoxDecoration(
            color: LiveColors.backgroundSurface,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: LiveColors.border),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.2),
                blurRadius: 10,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: Column(
              children: [
                for (int i = 0; i < items.length; i++) ...[
                  items[i],
                  if (i < items.length - 1)
                    Divider(
                      height: 1,
                      thickness: 1,
                      color: LiveColors.border.withValues(alpha: 0.5),
                      indent: 64,
                      endIndent: 16,
                    ),
                ],
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildProfileTile({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
    Color? titleColor,
    bool isDanger = false,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
          child: Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  color: iconColor.withValues(alpha: 0.12),
                ),
                alignment: Alignment.center,
                child: Icon(icon, color: iconColor, size: 20),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.plusJakartaSans(
                        fontWeight: FontWeight.w700,
                        fontSize: 13.5,
                        color: titleColor ?? (isDanger ? Colors.redAccent : Colors.white),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 11,
                        color: LiveColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Icon(
                Icons.arrow_forward_ios_rounded,
                size: 13,
                color: isDanger ? Colors.redAccent : Colors.white24,
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: Listenable.merge([AuthService(), AppLocaleService()]),
      builder: (context, _) {
        final user = AuthService().currentUser;

        return Scaffold(
          backgroundColor: LiveColors.background,
          appBar: AppBar(
            backgroundColor: LiveColors.background,
            elevation: 0,
            title: Text(
              AppLocaleService().t('profile_title'),
              style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.white),
            ),
            actions: [
              InkWell(
                onTap: () => LanguageSelectionSheet.show(context),
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                  margin: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
                  decoration: BoxDecoration(
                    color: LiveColors.backgroundInput,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: LiveColors.accentPurple.withValues(alpha: 0.5)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(AppLocaleService().currentLanguage.flag, style: const TextStyle(fontSize: 14)),
                      const SizedBox(width: 4),
                      Text(
                        AppLocaleService().currentLanguage.code.toUpperCase(),
                        style: GoogleFonts.plusJakartaSans(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.logout, color: Colors.redAccent),
                tooltip: AppLocaleService().t('menu_logout'),
                onPressed: _confirmLogout,
              ),
            ],
          ),
          body: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Column(
              children: [
                // Clean User Profile Header (No Frame, No Level, No ID, Just Name)
                Center(
                  child: Column(
                    children: [
                      Stack(
                        alignment: Alignment.center,
                        children: [
                          UserAvatarWithFrame(
                            avatarUrl: user?.avatarUrl,
                            vipLevel: user?.vipLevel ?? 0,
                            level: user?.level ?? 1,
                            size: 96,
                            showBadge: (user?.vipLevel ?? 0) >= 1,
                            isVerified: user?.isVerified ?? false,
                            verifiedLabel: user?.verifiedLabel,
                          ),
                          Positioned(
                            bottom: 0,
                            right: 4,
                            child: InkWell(
                              onTap: _openAvatarChanger,
                              child: Container(
                                padding: const EdgeInsets.all(7),
                                decoration: const BoxDecoration(
                                  shape: BoxShape.circle,
                                  gradient: LiveColors.callButtonGradient,
                                ),
                                child: const Icon(Icons.camera_alt, color: Colors.white, size: 16),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Flexible(
                            child: Text(
                              user?.displayName ?? 'Streamer Star',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 22,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                          ),
                          if (user?.isVerified == true) ...[
                            const SizedBox(width: 6),
                            const Icon(Icons.verified, color: Color(0xFF38BDF8), size: 22),
                          ],
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '@${user?.username ?? 'user'} • ${(user?.country ?? 'Global 🌍').tr}',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 12,
                          color: LiveColors.textSecondary,
                        ),
                      ),
                      if (user?.vipLevel != null && user!.vipLevel >= 1) ...[
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(colors: [Color(0xFF3B82F6), Color(0xFF8B5CF6)]),
                            borderRadius: BorderRadius.circular(20),
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFF6366F1).withValues(alpha: 0.4),
                                blurRadius: 8,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.workspace_premium_rounded, color: Colors.amberAccent, size: 14),
                              const SizedBox(width: 4),
                              Text('VIP ${user.vipLevel} MEMBER', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: 0.5)),
                            ],
                          ),
                        ),
                      ],
                      if (user?.isVerified == true) ...[
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(colors: [Color(0xFF0EA5E9), Color(0xFF2563EB)]),
                            borderRadius: BorderRadius.circular(20),
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFF0EA5E9).withValues(alpha: 0.35),
                                blurRadius: 8,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.verified, color: Colors.white, size: 13),
                              const SizedBox(width: 4),
                              Text(
                                (user!.verifiedLabel ?? 'Verified').toUpperCase(),
                                style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: 0.4),
                              ),
                            ],
                          ),
                        ),
                      ],
                      if (user?.customId != null && user!.customId!.isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.white10,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.white24),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.stars, color: Colors.amberAccent, size: 12),
                              const SizedBox(width: 4),
                              Text('ID: ${user.customId}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white70)),
                            ],
                          ),
                        ),
                      ],
                      if (user != null && user.bio.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          decoration: BoxDecoration(
                            color: LiveColors.backgroundSurface.withValues(alpha: 0.6),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            '"${user.bio.tr}"',
                            maxLines: 3,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.plusJakartaSans(fontSize: 12, color: LiveColors.textSecondary, fontStyle: FontStyle.italic),
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ],

                      // Clickable Social Counters (Posts, Followers, Following)
                      FutureBuilder<Map<String, dynamic>?>(
                        future: user != null ? ApiService().getUserSocialStats(user.id) : null,
                        builder: (context, snapshot) {
                          final stats = snapshot.data;
                          final followers = stats?['followersCount'] ?? 0;
                          final following = stats?['followingCount'] ?? 0;
                          final posts = stats?['postsCount'] ?? 0;

                          return Container(
                            margin: const EdgeInsets.only(top: 14),
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                            decoration: BoxDecoration(
                              color: LiveColors.backgroundSurface,
                              borderRadius: BorderRadius.circular(18),
                              border: Border.all(color: LiveColors.border),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceAround,
                              children: [
                                GestureDetector(
                                  onTap: () {
                                    if (user != null) {
                                      Navigator.push(
                                        context,
                                        MaterialPageRoute(builder: (_) => UserContentScreen(userId: user.id)),
                                      );
                                    }
                                  },
                                  child: Column(
                                    children: [
                                      Text('$posts', style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                                      const SizedBox(height: 2),
                                      Text('Posts 📸'.tr, style: GoogleFonts.plusJakartaSans(fontSize: 11, color: LiveColors.textSecondary)),
                                    ],
                                  ),
                                ),
                                Container(width: 1, height: 24, color: LiveColors.border),
                                GestureDetector(
                                  onTap: () {
                                    if (user != null) {
                                      Navigator.push(
                                        context,
                                        MaterialPageRoute(
                                          builder: (_) => UserRelationshipsScreen(
                                            userId: user.id,
                                            displayName: user.displayName,
                                            initialTabIndex: 0,
                                          ),
                                        ),
                                      );
                                    }
                                  },
                                  child: Column(
                                    children: [
                                      Text('$followers', style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                                      const SizedBox(height: 2),
                                      Text('Followers'.tr, style: GoogleFonts.plusJakartaSans(fontSize: 11, color: LiveColors.textSecondary)),
                                    ],
                                  ),
                                ),
                                Container(width: 1, height: 24, color: LiveColors.border),
                                GestureDetector(
                                  onTap: () {
                                    if (user != null) {
                                      Navigator.push(
                                        context,
                                        MaterialPageRoute(
                                          builder: (_) => UserRelationshipsScreen(
                                            userId: user.id,
                                            displayName: user.displayName,
                                            initialTabIndex: 1,
                                          ),
                                        ),
                                      );
                                    }
                                  },
                                  child: Column(
                                    children: [
                                      Text('$following', style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                                      const SizedBox(height: 2),
                                      Text('Following'.tr, style: GoogleFonts.plusJakartaSans(fontSize: 11, color: LiveColors.textSecondary)),
                                    ],
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
                // VIP 1 Privilege Suite Card
                _buildVipPrivilegeCard(user),
                const SizedBox(height: 14),

                // Games Center Entry (independent mini-games hub)
                InkWell(
                  onTap: () => GamesCenterScreen.open(context),
                  borderRadius: BorderRadius.circular(18),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(colors: [Color(0xFF7C3AED), Color(0xFFEC4899)]),
                      borderRadius: BorderRadius.circular(18),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF7C3AED).withValues(alpha: 0.35),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.casino_rounded, color: Colors.white, size: 26),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Games Center'.tr,
                                style: GoogleFonts.plusJakartaSans(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'Lucky Wheel, Yummy, Slots & more — play anytime'.tr,
                                style: const TextStyle(fontSize: 11.5, color: Colors.white70),
                              ),
                            ],
                          ),
                        ),
                        const Icon(Icons.chevron_right, color: Colors.white, size: 24),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 14),

                // Wallet Balances (Coins & Diamonds Cards)
                Row(
                  children: [
                    // Coins Card
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: LiveColors.backgroundSurface,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.4)),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFFF59E0B).withValues(alpha: 0.08),
                              blurRadius: 14,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Container(
                                  width: 32,
                                  height: 32,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: const Color(0xFFF59E0B).withValues(alpha: 0.2),
                                  ),
                                  alignment: Alignment.center,
                                  child: const Icon(Icons.monetization_on_rounded, color: Color(0xFFFBBF24), size: 18),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    'Coins'.tr,
                                    style: GoogleFonts.plusJakartaSans(color: LiveColors.textSecondary, fontSize: 13, fontWeight: FontWeight.w600),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Text(
                              '${user?.coins ?? 0}',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: GoogleFonts.plusJakartaSans(fontSize: 22, fontWeight: FontWeight.w900, color: const Color(0xFFFBBF24)),
                            ),
                            const SizedBox(height: 12),
                            GestureDetector(
                              onTap: () {
                                TopUpChoiceDialog.show(context);
                              },
                              child: Container(
                                width: double.infinity,
                                padding: const EdgeInsets.symmetric(vertical: 8),
                                decoration: BoxDecoration(
                                  gradient: LiveColors.primaryGradient,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                alignment: Alignment.center,
                                child: Text(
                                  '+ Top Up'.tr,
                                  style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),

                    // Diamonds Card
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: LiveColors.backgroundSurface,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: const Color(0xFF06B6D4).withValues(alpha: 0.4)),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFF06B6D4).withValues(alpha: 0.08),
                              blurRadius: 14,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Container(
                                  width: 32,
                                  height: 32,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: const Color(0xFF06B6D4).withValues(alpha: 0.2),
                                  ),
                                  alignment: Alignment.center,
                                  child: const Icon(Icons.diamond_rounded, color: Color(0xFF22D3EE), size: 18),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    'Diamonds'.tr,
                                    style: GoogleFonts.plusJakartaSans(color: LiveColors.textSecondary, fontSize: 13, fontWeight: FontWeight.w600),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Text(
                              '${user?.diamonds ?? 0}',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: GoogleFonts.plusJakartaSans(fontSize: 22, fontWeight: FontWeight.w900, color: const Color(0xFF22D3EE)),
                            ),
                            const SizedBox(height: 12),
                            GestureDetector(
                              onTap: () {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    backgroundColor: const Color(0xFF10B981),
                                    content: Text(r'Withdrawal desk open: 45,000 💎 = $450.00 USD.'.tr, style: GoogleFonts.plusJakartaSans()),
                                  ),
                                );
                              },
                              child: Container(
                                width: double.infinity,
                                padding: const EdgeInsets.symmetric(vertical: 8),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF10B981),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                alignment: Alignment.center,
                                child: Text(
                                  'Cash Out'.tr,
                                  style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),

                // ==========================================
                // SECTION 1: WALLET & CREATOR SERVICES
                // ==========================================
                _buildSectionGroup(
                  title: AppLocaleService().t('section_creator_earnings'),
                  sectionIcon: Icons.account_balance_wallet_rounded,
                  items: [
                    _buildProfileTile(
                      icon: Icons.flash_on_rounded,
                      iconColor: const Color(0xFFFF2B85),
                      title: AppLocaleService().t('menu_recharge_coins'),
                      subtitle: AppLocaleService().t('menu_recharge_sub'),
                      onTap: () => TopUpChoiceDialog.show(context),
                    ),
                    _buildProfileTile(
                      icon: Icons.monetization_on_rounded,
                      iconColor: const Color(0xFFFBBF24),
                      title: AppLocaleService().t('menu_resellers'),
                      subtitle: AppLocaleService().t('menu_resellers_sub'),
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const CoinResellersScreen()),
                        );
                      },
                    ),
                    _buildProfileTile(
                      icon: Icons.analytics_rounded,
                      iconColor: const Color(0xFF34D399),
                      title: AppLocaleService().t('menu_earnings_reports'),
                      subtitle: AppLocaleService().t('menu_earnings_sub'),
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const EarningsReportScreen()),
                        );
                      },
                    ),
                    _buildProfileTile(
                      icon: Icons.verified_user_rounded,
                      iconColor: LiveColors.accentPurple,
                      title: AppLocaleService().t('menu_agency_portal'),
                      subtitle: AppLocaleService().t('menu_agency_sub'),
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const AgencyCenterScreen()),
                        ).then((_) => setState(() {}));
                      },
                    ),
                  ],
                ),

                // ==========================================
                // SECTION 2: CONTENT & ACCOUNT
                // ==========================================
                _buildSectionGroup(
                  title: AppLocaleService().t('section_content_account'),
                  sectionIcon: Icons.person_rounded,
                  items: [
                    _buildProfileTile(
                      icon: Icons.grid_on_rounded,
                      iconColor: LiveColors.accentPink,
                      title: AppLocaleService().t('menu_my_moments'),
                      subtitle: AppLocaleService().t('menu_my_moments_sub'),
                      onTap: () {
                        if (user != null) {
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => UserContentScreen(userId: user.id)),
                          );
                        }
                      },
                    ),
                    _buildProfileTile(
                      icon: Icons.edit_note_rounded,
                      iconColor: const Color(0xFF818CF8),
                      title: AppLocaleService().t('menu_edit_profile'),
                      subtitle: AppLocaleService().t('menu_edit_profile_sub'),
                      onTap: _openEditProfileSheet,
                    ),
                    _buildProfileTile(
                      icon: Icons.face_retouching_natural_rounded,
                      iconColor: const Color(0xFFE879F9),
                      title: AppLocaleService().t('menu_change_avatar'),
                      subtitle: AppLocaleService().t('menu_change_avatar_sub'),
                      onTap: _openAvatarChanger,
                    ),
                  ],
                ),

                // ==========================================
                // SECTION 3: PREFERENCES & LOCALIZATION
                // ==========================================
                _buildSectionGroup(
                  title: AppLocaleService().t('section_preferences'),
                  sectionIcon: Icons.translate_rounded,
                  items: [
                    _buildProfileTile(
                      icon: Icons.language_rounded,
                      iconColor: const Color(0xFF38BDF8),
                      title: AppLocaleService().t('language_setting_title'),
                      subtitle: '${AppLocaleService().currentLanguage.flag} ${AppLocaleService().currentLanguage.nativeName} (${AppLocaleService().currentLanguage.name}) • ${(AppLocaleService().autoTranslateChatAndPosts ? "Auto-Translate Active" : "Auto-Translate Off").tr}',
                      onTap: () => LanguageSelectionSheet.show(context),
                    ),
                  ],
                ),

                // ==========================================
                // SECTION 4: HELP & COMMUNITY SAFETY
                // ==========================================
                _buildSectionGroup(
                  title: AppLocaleService().t('section_help_support'),
                  sectionIcon: Icons.support_agent_rounded,
                  items: [
                    _buildProfileTile(
                      icon: Icons.support_agent_rounded,
                      iconColor: const Color(0xFF10B981),
                      title: AppLocaleService().t('menu_contact_us'),
                      subtitle: AppLocaleService().t('menu_contact_us_sub'),
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const ContactUsScreen()),
                        );
                      },
                    ),
                    _buildProfileTile(
                      icon: Icons.verified_user_outlined,
                      iconColor: const Color(0xFF34D399),
                      title: AppLocaleService().t('menu_community_guidelines'),
                      subtitle: 'Zero-tolerance rules for safe, respectful live broadcasting'.tr,
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => const LegalPolicyScreen(initialPolicy: PolicyType.communityGuidelines),
                          ),
                        );
                      },
                    ),
                    _buildProfileTile(
                      icon: Icons.child_care_rounded,
                      iconColor: const Color(0xFFFBBF24),
                      title: AppLocaleService().t('menu_child_safety'),
                      subtitle: 'Strict 18+ enforcement and minor protection protocols'.tr,
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => const LegalPolicyScreen(initialPolicy: PolicyType.childSafety),
                          ),
                        );
                      },
                    ),
                  ],
                ),

                // ==========================================
                // SECTION 5: LEGAL & POLICIES
                // ==========================================
                _buildSectionGroup(
                  title: AppLocaleService().t('section_legal_policies'),
                  sectionIcon: Icons.gavel_rounded,
                  items: [
                    _buildProfileTile(
                      icon: Icons.shield_outlined,
                      iconColor: const Color(0xFF38BDF8),
                      title: AppLocaleService().t('menu_privacy_policy'),
                      subtitle: 'Data protection, hardware permissions, and user privacy rights'.tr,
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => const LegalPolicyScreen(initialPolicy: PolicyType.privacyPolicy),
                          ),
                        );
                      },
                    ),
                    _buildProfileTile(
                      icon: Icons.description_outlined,
                      iconColor: const Color(0xFFA78BFA),
                      title: AppLocaleService().t('menu_terms_service'),
                      subtitle: 'User agreement, streaming etiquette, and virtual goods policy'.tr,
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => const LegalPolicyScreen(initialPolicy: PolicyType.termsOfService),
                          ),
                        );
                      },
                    ),
                    _buildProfileTile(
                      icon: Icons.person_remove_outlined,
                      iconColor: const Color(0xFFF43F5E),
                      title: AppLocaleService().t('menu_account_deletion_policy'),
                      subtitle: 'Apple 5.1.1(v) compliance & permanent data erasure terms'.tr,
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => const LegalPolicyScreen(initialPolicy: PolicyType.accountDeletion),
                          ),
                        );
                      },
                    ),
                    _buildProfileTile(
                      icon: Icons.policy_outlined,
                      iconColor: const Color(0xFF94A3B8),
                      title: AppLocaleService().t('menu_apple_eula'),
                      subtitle: 'End User License Agreement for iOS App Store distribution'.tr,
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => const LegalPolicyScreen(initialPolicy: PolicyType.appleEula),
                          ),
                        );
                      },
                    ),
                  ],
                ),

                // ==========================================
                // SECTION 6: ACCOUNT SECURITY & ACTIONS
                // ==========================================
                _buildSectionGroup(
                  title: AppLocaleService().t('section_session_danger'),
                  sectionIcon: Icons.security_rounded,
                  items: [
                    _buildProfileTile(
                      icon: Icons.logout_rounded,
                      iconColor: Colors.amberAccent,
                      title: AppLocaleService().t('menu_logout'),
                      subtitle: AppLocaleService().t('menu_logout_sub'),
                      titleColor: Colors.amberAccent,
                      onTap: _confirmLogout,
                    ),
                    _buildProfileTile(
                      icon: Icons.delete_forever_rounded,
                      iconColor: Colors.redAccent,
                      title: AppLocaleService().t('menu_delete_account'),
                      subtitle: AppLocaleService().t('menu_delete_account_sub'),
                      titleColor: Colors.redAccent,
                      isDanger: true,
                      onTap: _confirmDeleteAccount,
                    ),
                  ],
                ),
                const SizedBox(height: 28),
              ],
            ),
          ),
        );
      },
    );
  }
}
