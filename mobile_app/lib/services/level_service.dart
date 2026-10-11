import 'dart:async';
import 'package:flutter/foundation.dart';
import 'api_service.dart';
import 'auth_service.dart';

class LevelConfigModel {
  final int level;
  final String title;
  final int minXp;
  final int minRechargeUSD;
  final String badgeColor;
  final String? badgeTitle;
  final String? badgeIconUrl;
  final String? frameUrl;
  final String? animatedFrameUrl;
  final bool isAnimatedFrame;
  final String? chatBubbleColor;
  final String? chatBubbleStyle;
  final String? nameColor;
  final String? entryEffectUrl;
  final String? entryEffectType;
  final String? lottieUrl;
  final List<String> perks;
  final Map<String, bool> features;
  final bool isVip;

  LevelConfigModel({
    required this.level,
    required this.title,
    required this.minXp,
    required this.minRechargeUSD,
    required this.badgeColor,
    this.badgeTitle,
    this.badgeIconUrl,
    this.frameUrl,
    this.animatedFrameUrl,
    this.isAnimatedFrame = false,
    this.chatBubbleColor,
    this.chatBubbleStyle,
    this.nameColor,
    this.entryEffectUrl,
    this.entryEffectType,
    this.lottieUrl,
    this.perks = const [],
    this.features = const {},
    this.isVip = true,
  });

  factory LevelConfigModel.fromJson(Map<String, dynamic> json) {
    List<String> parsedPerks = [];
    if (json['perks'] is List) {
      parsedPerks = List<String>.from(json['perks'].map((p) => p.toString()));
    }

    Map<String, bool> parsedFeatures = {};
    if (json['features'] is Map) {
      json['features'].forEach((k, v) {
        parsedFeatures[k.toString()] = v == true;
      });
    }

    return LevelConfigModel(
      level: (json['level'] ?? 1) as int,
      title: json['title'] ?? 'Level ${json['level'] ?? 1}',
      minXp: (json['minXp'] ?? 0) as int,
      minRechargeUSD: (json['minRechargeUSD'] ?? LevelService.fallbackRechargeMilestones[json['level']] ?? 500) as int,
      badgeColor: json['badgeColor'] ?? '#F59E0B',
      badgeTitle: json['badgeTitle'] as String?,
      badgeIconUrl: json['badgeIconUrl'] as String?,
      frameUrl: json['frameUrl'] as String?,
      animatedFrameUrl: json['animatedFrameUrl'] as String?,
      isAnimatedFrame: json['isAnimatedFrame'] == true,
      chatBubbleColor: json['chatBubbleColor'] as String?,
      chatBubbleStyle: json['chatBubbleStyle'] as String?,
      nameColor: json['nameColor'] as String?,
      entryEffectUrl: json['entryEffectUrl'] as String?,
      entryEffectType: json['entryEffectType'] as String?,
      lottieUrl: json['lottieUrl'] as String?,
      perks: parsedPerks,
      features: parsedFeatures,
      isVip: json['isVip'] ?? true,
    );
  }

  /// Get absolute URL for the outer avatar frame
  String? get resolvedFrameUrl {
    final target = (isAnimatedFrame && animatedFrameUrl != null && animatedFrameUrl!.isNotEmpty)
        ? animatedFrameUrl
        : frameUrl;
    if (target == null || target.trim().isEmpty) return null;
    return ApiService.getFullImageUrl(target);
  }

  /// Get absolute URL for the Bodymovin Lottie JSON animation
  String? get resolvedLottieUrl {
    if (lottieUrl == null || lottieUrl!.trim().isEmpty) return null;
    final trimmed = lottieUrl!.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    final base = ApiService.baseUrl.endsWith('/')
        ? ApiService.baseUrl.substring(0, ApiService.baseUrl.length - 1)
        : ApiService.baseUrl;
    final path = trimmed.startsWith('/') ? trimmed : '/$trimmed';
    return '$base$path';
  }

  /// Check whether a specific VIP feature permission is granted in this stage
  bool hasFeature(String key) => features[key] == true;
}

/// Centralized Real-time Level & VIP Service
/// Automatically keeps level configs & assets synchronized with the Admin Dashboard
class LevelService extends ChangeNotifier {
  static final LevelService _instance = LevelService._internal();
  factory LevelService() => _instance;
  LevelService._internal();

  final Map<int, LevelConfigModel> _configs = {};
  bool _isLoading = false;

  // Stream of level up celebration events for showing celebration dialog
  final StreamController<Map<String, dynamic>> _celebrationStream =
      StreamController<Map<String, dynamic>>.broadcast();
  Stream<Map<String, dynamic>> get celebrationStream => _celebrationStream.stream;

  Map<int, LevelConfigModel> get configs => Map.unmodifiable(_configs);
  bool get isLoading => _isLoading;

  /// Strict cumulative recharge milestones in USD ($)
  static const Map<int, int> fallbackRechargeMilestones = {
    1: 500,
    2: 1000,
    3: 2000,
    4: 3500,
    5: 5000,
    6: 7500,
    7: 10000,
    8: 15000,
  };

  /// Fallback XP milestones if needed
  static const Map<int, int> fallbackMilestones = {
    1: 5000,
    2: 10000,
    3: 20000,
    4: 35000,
    5: 50000,
    6: 75000,
    7: 100000,
    8: 150000,
  };

  /// Initialize and fetch all Level 1 to 8 configurations
  Future<void> init() async {
    await fetchConfigs();
  }

  Future<void> fetchConfigs() async {
    _isLoading = true;
    notifyListeners();

    try {
      final list = await ApiService().getLevelConfigs();
      for (final item in list) {
        final config = LevelConfigModel.fromJson(item);
        _configs[config.level] = config;
      }
    } catch (e) {
      debugPrint('Error loading level configs: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Called when Socket.io receives `level_config_updated` from Admin Dashboard
  void onLevelConfigUpdated(Map<String, dynamic> data) {
    try {
      final configData = (data['config'] is Map)
          ? Map<String, dynamic>.from(data['config'] as Map)
          : data;
      final config = LevelConfigModel.fromJson(configData);
      _configs[config.level] = config;
      debugPrint('👑 [LevelService] Real-time level config updated: Lv.${config.level} (${config.title})');
      notifyListeners();
    } catch (e) {
      debugPrint('Error updating level config from socket: $e');
    }
  }

  /// Called when Socket.io receives `user_level_up`
  void onUserLevelUp(Map<String, dynamic> data) {
    try {
      debugPrint('🎉 [LevelService] User Level-Up received: $data');
      final newLevel = (data['newLevel'] ?? data['level'] ?? 1) as int;
      final newXp = (data['newXp'] ?? data['xp'] ?? 0) as int;

      // Update local user auth state if this event is for the current user
      final currentUser = AuthService().currentUser;
      final targetUserId = data['userId']?.toString();

      if (currentUser != null && (targetUserId == null || targetUserId == currentUser.id)) {
        AuthService().updateLevelAndXp(level: newLevel, xp: newXp);
        _celebrationStream.add(data);
      }
    } catch (e) {
      debugPrint('Error handling user level-up event: $e');
    }
  }

  LevelConfigModel? getConfig(int level) => _configs[level];

  String? getFrameUrl(int level) => _configs[level]?.resolvedFrameUrl;

  String? getLottieUrl(int level) => _configs[level]?.resolvedLottieUrl;

  String getTitle(int level) {
    return _configs[level]?.title ?? 'Level $level';
  }

  List<String> getPerks(int level) {
    return _configs[level]?.perks ?? [];
  }

  bool isVip(int level) => _configs[level]?.isVip ?? (level >= 1);

  int getMinRechargeUSD(int level) {
    if (_configs.containsKey(level)) {
      return _configs[level]!.minRechargeUSD;
    }
    return fallbackRechargeMilestones[level] ?? (level * 1000);
  }

  int getMinXp(int level) {
    if (_configs.containsKey(level)) {
      return _configs[level]!.minXp;
    }
    return fallbackMilestones[level] ?? (level * 1000);
  }

  int getNextLevelMinXp(int level) {
    if (level >= 8) {
      return getMinXp(8);
    }
    return getMinXp(level + 1);
  }

  /// Calculate progression fraction [0.0 to 1.0] from current level to next level
  double getProgress(int currentLevel, int currentXp) {
    if (currentLevel >= 8) return 1.0;

    final currMin = getMinXp(currentLevel);
    final nextMin = getNextLevelMinXp(currentLevel);

    final span = nextMin - currMin;
    if (span <= 0) return 1.0;

    final progress = (currentXp - currMin) / span;
    return progress.clamp(0.0, 1.0);
  }

  /// Calculate progression fraction [0.0 to 1.0] from current recharge USD to target VIP level
  double getRechargeProgress(double totalRechargedUSD, int targetVipLevel) {
    final needed = getMinRechargeUSD(targetVipLevel);
    if (needed <= 0) return 1.0;
    return (totalRechargedUSD / needed).clamp(0.0, 1.0);
  }

  /// Check whether the current user has unlocked a specific VIP feature,
  /// honouring both their tier and the admin's per-benefit toggles.
  bool userHasFeature(int userVipLevel, String featureKey) {
    if (userVipLevel < 1) return false;
    final features = _configs[userVipLevel]?.features;
    if (features == null || !features.containsKey(featureKey)) return false;
    return features[featureKey] == true;
  }
}
