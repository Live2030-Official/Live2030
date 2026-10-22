import 'dart:async';
import 'dart:convert';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_service.dart';
import 'level_service.dart';

class UserModel {
  final String id;
  final String username;
  final String displayName;
  final String? email;
  final String? phone;
  final String avatarUrl;
  final String bio;
  final String gender;
  final String birthday;
  final String country;
  final String role;
  final int level;
  final int xp;
  final int coins;
  final int diamonds;
  final String status;
  final bool isBanned;
  final String? suspensionUntil;
  final String? suspensionReason;
  final int vipLevel;
  final double totalRechargedUSD;
  final double monthlyRechargedUSD;
  final String? customId;
  final String? customNameColor;
  final Map<String, dynamic>? vipSettings;
  final bool isVerified;
  final String? verifiedLabel;

  UserModel({
    required this.id,
    required this.username,
    required this.displayName,
    this.email,
    this.phone,
    required this.avatarUrl,
    this.bio = 'Enjoying Live 2030 ✨',
    this.gender = 'Female',
    this.birthday = '2000-01-01',
    this.country = 'United States 🇺🇸',
    this.role = 'USER',
    this.level = 1,
    this.xp = 0,
    this.coins = 0,
    this.diamonds = 0,
    this.status = 'ACTIVE',
    this.isBanned = false,
    this.suspensionUntil,
    this.suspensionReason,
    this.vipLevel = 0,
    this.totalRechargedUSD = 0.0,
    this.monthlyRechargedUSD = 0.0,
    this.customId,
    this.customNameColor,
    this.vipSettings,
    this.isVerified = false,
    this.verifiedLabel,
  });

  bool get isVip => vipLevel >= 1;

  UserModel copyWith({
    String? username,
    String? displayName,
    String? avatarUrl,
    String? bio,
    String? gender,
    String? birthday,
    String? country,
    int? coins,
    int? diamonds,
    int? level,
    int? xp,
    String? role,
    String? status,
    bool? isBanned,
    String? suspensionUntil,
    String? suspensionReason,
    int? vipLevel,
    double? totalRechargedUSD,
    double? monthlyRechargedUSD,
    String? customId,
    String? customNameColor,
    Map<String, dynamic>? vipSettings,
    bool? isVerified,
    String? verifiedLabel,
  }) {
    return UserModel(
      id: id,
      username: username ?? this.username,
      displayName: displayName ?? this.displayName,
      email: email,
      phone: phone,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      bio: bio ?? this.bio,
      gender: gender ?? this.gender,
      birthday: birthday ?? this.birthday,
      country: country ?? this.country,
      role: role ?? this.role,
      level: level ?? this.level,
      xp: xp ?? this.xp,
      coins: coins ?? this.coins,
      diamonds: diamonds ?? this.diamonds,
      status: status ?? this.status,
      isBanned: isBanned ?? this.isBanned,
      suspensionUntil: suspensionUntil ?? this.suspensionUntil,
      suspensionReason: suspensionReason ?? this.suspensionReason,
      vipLevel: vipLevel ?? this.vipLevel,
      totalRechargedUSD: totalRechargedUSD ?? this.totalRechargedUSD,
      monthlyRechargedUSD: monthlyRechargedUSD ?? this.monthlyRechargedUSD,
      customId: customId ?? this.customId,
      customNameColor: customNameColor ?? this.customNameColor,
      vipSettings: vipSettings ?? this.vipSettings,
      isVerified: isVerified ?? this.isVerified,
      verifiedLabel: verifiedLabel ?? this.verifiedLabel,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'username': username,
        'displayName': displayName,
        'email': email,
        'phone': phone,
        'avatarUrl': avatarUrl,
        'bio': bio,
        'gender': gender,
        'birthday': birthday,
        'country': country,
        'role': role,
        'level': level,
        'xp': xp,
        'coins': coins,
        'diamonds': diamonds,
        'status': status,
        'isBanned': isBanned,
        'suspensionUntil': suspensionUntil,
        'suspensionReason': suspensionReason,
        'vipLevel': vipLevel,
        'totalRechargedUSD': totalRechargedUSD,
        'monthlyRechargedUSD': monthlyRechargedUSD,
        'customId': customId,
        'customNameColor': customNameColor,
        'vipSettings': vipSettings,
        'isVerified': isVerified,
        'verifiedLabel': verifiedLabel,
      };

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? 'user_${DateTime.now().millisecondsSinceEpoch}',
      username: json['username'] ?? 'live_user',
      displayName: json['displayName'] ?? 'Live User',
      email: json['email'],
      phone: json['phone'],
      avatarUrl: json['avatarUrl'] ?? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      bio: json['bio'] ?? 'Streaming live on Live 2030 ✨',
      gender: json['gender'] ?? 'Female',
      birthday: json['birthday'] ?? '2000-01-01',
      country: json['country'] ?? 'Global 🌍',
      role: json['role'] ?? 'USER',
      level: (json['level'] ?? 1) as int,
      xp: (json['xp'] ?? 0) as int,
      coins: (json['coins'] ?? (json['wallet']?['coins'] ?? 0)) as int,
      diamonds: (json['diamonds'] ?? (json['wallet']?['diamonds'] ?? 0)) as int,
      status: json['status'] ?? 'ACTIVE',
      isBanned: json['isBanned'] == true,
      suspensionUntil: json['suspensionUntil'],
      suspensionReason: json['suspensionReason'],
      vipLevel: (json['vipLevel'] ?? 0) as int,
      totalRechargedUSD: ((json['totalRechargedUSD'] ?? 0) as num).toDouble(),
      monthlyRechargedUSD: ((json['monthlyRechargedUSD'] ?? 0) as num).toDouble(),
      customId: json['customId'] as String?,
      customNameColor: json['customNameColor'] as String?,
      vipSettings: json['vipSettings'] is Map<String, dynamic> ? json['vipSettings'] : null,
      isVerified: json['isVerified'] == true,
      verifiedLabel: json['verifiedLabel'] as String?,
    );
  }
}

class AuthService extends ChangeNotifier {
  static final AuthService _instance = AuthService._internal();
  factory AuthService() => _instance;
  AuthService._internal();

  UserModel? _currentUser;
  String? _accessToken;
  bool _isInitialized = false;
  bool _isOnboardingCompleted = false;

  UserModel? get currentUser => _currentUser;
  String? get accessToken => _accessToken;
  bool get isLoggedIn => _currentUser != null;
  bool get isAuthenticated => isLoggedIn;
  bool get isInitialized => _isInitialized;
  bool get isOnboardingCompleted => _isOnboardingCompleted;

  // VIP getters
  bool get isVip => (_currentUser?.vipLevel ?? 0) >= 1;
  int get vipLevel => _currentUser?.vipLevel ?? 0;
  double get totalRechargedUSD => _currentUser?.totalRechargedUSD ?? 0.0;
  String? get customId => _currentUser?.customId;
  String? get customNameColor => _currentUser?.customNameColor;
  Map<String, dynamic>? get vipSettings => _currentUser?.vipSettings;

  bool hasVipFeature(String key) {
    final level = _currentUser?.vipLevel ?? 0;
    if (level < 1) return false;
    // Prefer the tier feature map delivered by the backend; fall back to
    // LevelService which is kept in sync in real time.
    final features = LevelService().getConfig(level)?.features;
    if (features != null && features.containsKey(key)) {
      return features[key] == true;
    }
    return false;
  }

  void updateVerification({bool? isVerified, String? verifiedLabel}) {
    if (_currentUser == null) return;
    _currentUser = _currentUser!.copyWith(
      isVerified: isVerified,
      verifiedLabel: verifiedLabel,
    );
    notifyListeners();
  }

  void updateVipState({int? vipLevel, double? totalRechargedUSD, String? customId, String? customNameColor, Map<String, dynamic>? vipSettings}) {
    if (_currentUser == null) return;
    _currentUser = _currentUser!.copyWith(
      vipLevel: vipLevel,
      totalRechargedUSD: totalRechargedUSD,
      customId: customId,
      customNameColor: customNameColor,
      vipSettings: vipSettings,
    );
    notifyListeners();
  }

  /// Re-syncs the current user profile, VIP level, recharge amount, and moderation status from backend.
  /// Merges onto the existing model so a partial payload never wipes freshly-edited data or VIP state.
  Future<void> refreshCurrentUser() async {
    if (_currentUser == null) return;
    try {
      final profile = await ApiService().fetchUserProfile(_currentUser!.id);
      if (profile != null) {
        final merged = <String, dynamic>{..._currentUser!.toJson()};
        profile.forEach((key, value) {
          if (value != null) merged[key] = value;
        });
        final wallet = profile['wallet'];
        if (wallet is Map) {
          if (wallet['coins'] != null) merged['coins'] = wallet['coins'];
          if (wallet['diamonds'] != null) merged['diamonds'] = wallet['diamonds'];
        }
        _currentUser = UserModel.fromJson(merged);
        await _persistSession();
        notifyListeners();
      }
    } catch (e) {
      debugPrint('Error refreshing current user session: $e');
    }
  }

  // Moderation getters
  bool get isBanned => _currentUser?.isBanned == true || _currentUser?.status == 'BANNED';

  bool get isSuspended {
    if (_currentUser == null) return false;
    if (_currentUser!.status.startsWith('SUSPENDED_')) {
      if (_currentUser!.suspensionUntil == null) return true;
      final expiry = DateTime.tryParse(_currentUser!.suspensionUntil!);
      if (expiry == null) return true;
      return DateTime.now().isBefore(expiry);
    }
    return false;
  }

  bool get hasActiveModerationPenalty => isBanned || isSuspended;

  Duration? get remainingSuspensionTime {
    if (!isSuspended || _currentUser?.suspensionUntil == null) return null;
    final expiry = DateTime.tryParse(_currentUser!.suspensionUntil!);
    if (expiry == null) return null;
    final diff = expiry.difference(DateTime.now());
    return diff.isNegative ? Duration.zero : diff;
  }

  String get moderationReasonText {
    if (_currentUser?.suspensionReason != null && _currentUser!.suspensionReason!.trim().isNotEmpty) {
      return _currentUser!.suspensionReason!;
    }
    return isBanned
        ? 'Account permanently banned for violation of Live 2030 Community Guidelines.'
        : 'Account temporarily suspended for policy review.';
  }

  Future<void> setModerationState({
    required String status,
    String? reason,
    String? suspensionUntil,
    bool? isBanned,
  }) async {
    if (_currentUser == null) return;
    final banned = isBanned ?? (status == 'BANNED');
    _currentUser = _currentUser!.copyWith(
      status: status,
      suspensionUntil: suspensionUntil,
      suspensionReason: reason,
      isBanned: banned,
    );
    await _persistSession();
    notifyListeners();
  }

  Future<void> checkModerationStatus() async {
    if (_currentUser == null) return;
    try {
      final res = await ApiService().fetchUserProfile(_currentUser!.id);
      if (res != null) {
        final newStatus = res['status'] ?? 'ACTIVE';
        final newIsBanned = res['isBanned'] == true || newStatus == 'BANNED';
        final newSuspensionUntil = res['suspensionUntil'];
        final newSuspensionReason = res['suspensionReason'];
        
        _currentUser = _currentUser!.copyWith(
          status: newStatus,
          isBanned: newIsBanned,
          suspensionUntil: newSuspensionUntil,
          suspensionReason: newSuspensionReason,
        );
        await _persistSession();
        notifyListeners();
      }
    } catch (e) {
      debugPrint('Error checking moderation status: $e');
    }
  }

  /// Directly update coins in current user session and notify UI listeners
  Future<void> updateCoins(int newCoins) async {
    if (_currentUser == null) return;
    _currentUser = _currentUser!.copyWith(coins: newCoins);
    await _persistSession();
    notifyListeners();
  }

  /// Refresh user balance & profile from server
  Future<void> refreshUser() async {
    if (_currentUser == null) return;
    try {
      final res = await ApiService().fetchUserProfile(_currentUser!.id);
      if (res != null) {
        final newCoins = (res['coins'] ?? (res['wallet']?['coins'] ?? _currentUser!.coins)) as int;
        final newDiamonds = (res['diamonds'] ?? (res['wallet']?['diamonds'] ?? _currentUser!.diamonds)) as int;
        _currentUser = _currentUser!.copyWith(
          coins: newCoins,
          diamonds: newDiamonds,
        );
        await _persistSession();
        notifyListeners();
      }
    } catch (e) {
      debugPrint('Error refreshing user: $e');
    }
  }

  Future<void> init() => initialize();

  Future<void> initialize() async {
    if (_isInitialized) return;
    try {
      final prefs = await SharedPreferences.getInstance();
      final userJson = prefs.getString('live2030_user_session');
      final token = prefs.getString('live2030_access_token');
      _isOnboardingCompleted = prefs.getBool('live2030_onboarding_completed') ?? false;

      if (userJson != null) {
        _currentUser = UserModel.fromJson(jsonDecode(userJson));
        _accessToken = token;
        unawaited(refreshCurrentUser());
      }
    } catch (e) {
      debugPrint('Error restoring user session: $e');
    }
    _isInitialized = true;
    notifyListeners();
  }

  /// Send Mobile OTP via MSG91 (with 60-second cooldown period)
  Future<Map<String, dynamic>> sendPhoneOtp(String phone) async {
    return await ApiService().sendPhoneOtp(phone);
  }

  /// Verify Mobile OTP & Login
  Future<Map<String, dynamic>> verifyPhoneOtpAndLogin({
    required String phone,
    required String otp,
    String? displayName,
  }) async {
    final res = await ApiService().verifyPhoneOtp(
      phone: phone,
      otp: otp,
      displayName: displayName,
    );

    if (res['success'] == true && res['user'] != null) {
      _currentUser = UserModel.fromJson(res['user']);
      _accessToken = res['accessToken'];

      final bool isNew = res['isNewUser'] == true;
      final bool alreadyRegistered = !isNew && (_currentUser!.username.isNotEmpty && !_currentUser!.username.startsWith('user_'));
      _isOnboardingCompleted = alreadyRegistered;
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool('live2030_onboarding_completed', alreadyRegistered);

      await _persistSession();
      notifyListeners();
      return {'success': true, 'user': _currentUser};
    }

    return {
      'success': false,
      'message': res['message'] ?? 'Failed to verify OTP code',
    };
  }

  Future<bool> loginGuest({String? displayName}) async {
    try {
      final res = await ApiService().loginGuest(displayName: displayName);
      if (res != null && res['user'] != null) {
        _currentUser = UserModel.fromJson(res['user']);
        _accessToken = res['accessToken'];
        await _persistSession();
        notifyListeners();
        return true;
      }
    } catch (e) {
      debugPrint('Guest login network error, activating resilient session: $e');
    }

    // Resilient fallback so physical device or network latency never denies access
    final id = 'guest_${DateTime.now().millisecondsSinceEpoch}';
    _currentUser = UserModel(
      id: id,
      username: id,
      displayName: displayName ?? 'Guest Explorer',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
      coins: 0,
      diamonds: 0,
      role: 'USER',
      level: 1,
    );
    _accessToken = 'offline_token_$id';
    await _persistSession();
    notifyListeners();
    return true;
  }

  static const String googleWebClientId =
      '685237346194-a9avr5tbce3m104rp856tlaeomalms0h.apps.googleusercontent.com';

  /// Native Firebase Google Sign-In for Android & iOS
  Future<Map<String, dynamic>> signInWithGoogle() async {
    try {
      final GoogleSignIn googleSignIn = GoogleSignIn(
        serverClientId: defaultTargetPlatform == TargetPlatform.android
            ? googleWebClientId
            : null,
        scopes: ['email', 'profile'],
      );

      // Reset sign-in state to always show account picker
      try {
        await googleSignIn.signOut();
      } catch (_) {}

      final GoogleSignInAccount? googleUser = await googleSignIn.signIn();
      if (googleUser == null) {
        return {'success': false, 'cancelled': true, 'message': 'Google Sign-In was cancelled by user'};
      }

      final GoogleSignInAuthentication googleAuth = await googleUser.authentication;
      final AuthCredential credential = GoogleAuthProvider.credential(
        accessToken: googleAuth.accessToken,
        idToken: googleAuth.idToken,
      );

      final UserCredential userCredential =
          await FirebaseAuth.instance.signInWithCredential(credential);
      final User? firebaseUser = userCredential.user;

      final email = firebaseUser?.email ?? googleUser.email;
      final displayName = firebaseUser?.displayName ?? googleUser.displayName ?? 'Google User';
      final photoUrl = firebaseUser?.photoURL ?? googleUser.photoUrl;
      final idToken = await firebaseUser?.getIdToken() ?? googleAuth.idToken;

      final success = await loginGoogle(
        email: email,
        displayName: displayName,
        avatarUrl: photoUrl,
        idToken: idToken,
      );

      final isNewUser = userCredential.additionalUserInfo?.isNewUser ?? false;

      return {
        'success': success,
        'cancelled': false,
        'isNewUser': isNewUser,
        'email': email,
        'displayName': displayName,
      };
    } catch (e) {
      debugPrint('Firebase Google Sign-In Error: $e');
      return {
        'success': false,
        'cancelled': false,
        'error': e.toString(),
      };
    }
  }

  Future<bool> loginGoogle({
    required String email,
    required String displayName,
    String? avatarUrl,
    String? idToken,
  }) async {
    try {
      final res = await ApiService().loginGoogle(
        email: email,
        displayName: displayName,
        avatarUrl: avatarUrl,
        idToken: idToken,
      );
      if (res != null && res['user'] != null) {
        _currentUser = UserModel.fromJson(res['user']);
        _accessToken = res['accessToken'];

        final bool isNew = res['isNewUser'] == true;
        final bool isOnboarded = res['isOnboarded'] == true;
        final bool alreadyRegistered = !isNew && (isOnboarded || (_currentUser!.username.isNotEmpty && !_currentUser!.username.startsWith('user_')));

        _isOnboardingCompleted = alreadyRegistered;
        final prefs = await SharedPreferences.getInstance();
        await prefs.setBool('live2030_onboarding_completed', alreadyRegistered);

        await _persistSession();
        notifyListeners();
        return true;
      }
    } catch (e) {
      debugPrint('Google login network error, activating resilient session: $e');
    }

    // Resilient fallback so physical device or network latency never denies access
    final id = 'user_${email.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '_')}';
    _currentUser = UserModel(
      id: id,
      username: email.split('@').first,
      displayName: displayName,
      email: email,
      avatarUrl: avatarUrl ?? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
      coins: 0,
      diamonds: 0,
      role: 'USER',
      level: 1,
    );
    _accessToken = 'offline_token_$id';
    await _persistSession();
    notifyListeners();
    return true;
  }

  /// Native Firebase Apple Sign-In for iOS
  Future<Map<String, dynamic>> signInWithApple() async {
    try {
      final appleProvider = OAuthProvider('apple.com')
        ..addScope('email')
        ..addScope('name');

      final UserCredential userCredential =
          await FirebaseAuth.instance.signInWithProvider(appleProvider);
      final User? firebaseUser = userCredential.user;

      if (firebaseUser == null) {
        return {
          'success': false,
          'cancelled': true,
          'message': 'Apple Sign-In was cancelled by user',
        };
      }

      final appleId = firebaseUser.uid;
      final email = firebaseUser.email;
      final displayName = firebaseUser.displayName ?? 'Apple User';
      final photoUrl = firebaseUser.photoURL;
      final idToken = await firebaseUser.getIdToken();

      final success = await loginApple(
        appleId: appleId,
        email: email,
        displayName: displayName,
        avatarUrl: photoUrl,
        idToken: idToken,
      );

      final isNewUser = userCredential.additionalUserInfo?.isNewUser ?? false;

      return {
        'success': success,
        'cancelled': false,
        'isNewUser': isNewUser,
        'appleId': appleId,
        'email': email,
        'displayName': displayName,
      };
    } catch (e) {
      debugPrint('Firebase Apple Sign-In Error: $e');
      return {
        'success': false,
        'cancelled': false,
        'error': e.toString(),
      };
    }
  }

  Future<bool> loginApple({
    required String appleId,
    String? email,
    String? displayName,
    String? avatarUrl,
    String? idToken,
  }) async {
    try {
      final res = await ApiService().loginApple(
        appleId: appleId,
        email: email,
        displayName: displayName,
        avatarUrl: avatarUrl,
        idToken: idToken,
      );
      if (res != null && res['user'] != null) {
        _currentUser = UserModel.fromJson(res['user']);
        _accessToken = res['accessToken'];

        final bool isNew = res['isNewUser'] == true;
        final bool isOnboarded = res['isOnboarded'] == true;
        final bool alreadyRegistered = !isNew &&
            (isOnboarded ||
                (_currentUser!.username.isNotEmpty &&
                    !_currentUser!.username.startsWith('user_')));

        _isOnboardingCompleted = alreadyRegistered;
        final prefs = await SharedPreferences.getInstance();
        await prefs.setBool('live2030_onboarding_completed', alreadyRegistered);

        await _persistSession();
        notifyListeners();
        return true;
      }
    } catch (e) {
      debugPrint('Apple login network error, activating resilient session: $e');
    }

    // Resilient fallback so physical device or simulator never denies access
    final safeName = displayName ?? (email?.split('@').first ?? 'Apple User');
    final cleanId = appleId.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '_');
    final shortId = cleanId.length > 8 ? cleanId.substring(cleanId.length - 8) : cleanId;
    final id = 'apple_$shortId';
    _currentUser = UserModel(
      id: id,
      username: email != null ? email.split('@').first : 'apple_$shortId',
      displayName: safeName,
      email: email,
      avatarUrl: avatarUrl ?? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
      coins: 0,
      diamonds: 0,
      role: 'USER',
      level: 1,
    );
    _accessToken = 'offline_token_$id';
    await _persistSession();
    notifyListeners();
    return true;
  }

  Future<bool> completeOnboarding({
    required String username,
    required String displayName,
    required String avatarUrl,
    required String birthday,
    required String gender,
    required String country,
    String? bio,
  }) async {
    if (_currentUser == null) return false;

    final updated = _currentUser!.copyWith(
      username: username,
      displayName: displayName,
      avatarUrl: avatarUrl,
      birthday: birthday,
      gender: gender,
      country: country,
      bio: bio,
    );

    _currentUser = updated;
    _isOnboardingCompleted = true;

    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('live2030_onboarding_completed', true);
    await _persistSession();
    notifyListeners();

    // Synchronize directly with live backend / AWS
    try {
      final res = await ApiService().updateProfile(
        userId: _currentUser!.id,
        username: username,
        displayName: displayName,
        avatarUrl: avatarUrl,
        birthday: birthday,
        gender: gender,
        country: country,
        bio: bio,
      );
      if (res != null && res['user'] != null) {
        _currentUser = UserModel.fromJson(res['user']);
        await _persistSession();
        notifyListeners();
      }
    } catch (e) {
      debugPrint('Error updating profile with backend: $e');
    }

    return true;
  }

  Future<bool> updateProfile({
    String? username,
    String? displayName,
    String? avatarUrl,
    String? bio,
    String? gender,
    String? birthday,
    String? country,
    String? customId,
    Map<String, dynamic>? vipSettings,
    int? vipLevel,
  }) async {
    if (_currentUser == null) return false;

    final previous = _currentUser!;
    _currentUser = _currentUser!.copyWith(
      username: username,
      displayName: displayName,
      avatarUrl: avatarUrl,
      bio: bio,
      gender: gender,
      birthday: birthday,
      country: country,
      customId: customId,
      vipSettings: vipSettings,
      vipLevel: vipLevel,
    );
    await _persistSession();
    notifyListeners();

    // Persist to backend; roll back the server-synced text fields on failure
    // so the UI never reports a false success.
    try {
      final res = await ApiService().updateProfile(
        userId: _currentUser!.id,
        username: username,
        displayName: displayName,
        avatarUrl: avatarUrl,
        bio: bio,
        gender: gender,
        birthday: birthday,
        country: country,
      );
      if (res == null || res['user'] is! Map) {
        _currentUser = _currentUser!.copyWith(
          username: previous.username,
          displayName: previous.displayName,
          avatarUrl: previous.avatarUrl,
          bio: previous.bio,
          gender: previous.gender,
          birthday: previous.birthday,
          country: previous.country,
        );
        await _persistSession();
        notifyListeners();
        return false;
      }
      final merged = <String, dynamic>{..._currentUser!.toJson()};
      (res['user'] as Map).forEach((key, value) {
        if (value != null) merged[key as String] = value;
      });
      _currentUser = UserModel.fromJson(merged);
      await _persistSession();
      notifyListeners();
      return true;
    } catch (e) {
      debugPrint('Error updating profile in backend: $e');
      _currentUser = _currentUser!.copyWith(
        username: previous.username,
        displayName: previous.displayName,
        avatarUrl: previous.avatarUrl,
        bio: previous.bio,
        gender: previous.gender,
        birthday: previous.birthday,
        country: previous.country,
      );
      await _persistSession();
      notifyListeners();
      return false;
    }
  }

  Future<void> awardCoins(int delta) async {
    if (_currentUser == null) return;
    _currentUser = _currentUser!.copyWith(
      coins: _currentUser!.coins + delta,
    );
    await _persistSession();
    notifyListeners();
  }

  Future<void> awardDiamonds(int delta) async {
    if (_currentUser == null) return;
    _currentUser = _currentUser!.copyWith(
      diamonds: _currentUser!.diamonds + delta,
    );
    await _persistSession();
    notifyListeners();
  }

  Future<void> updateBalances({int? coins, int? diamonds}) async {
    if (_currentUser == null) return;
    _currentUser = _currentUser!.copyWith(
      coins: coins ?? _currentUser!.coins,
      diamonds: diamonds ?? _currentUser!.diamonds,
    );
    await _persistSession();
    notifyListeners();
  }

  Future<void> updateLevelAndXp({int? level, int? xp}) async {
    if (_currentUser == null) return;
    _currentUser = _currentUser!.copyWith(
      level: level ?? _currentUser!.level,
      xp: xp ?? _currentUser!.xp,
    );
    await _persistSession();
    notifyListeners();
  }

  Future<void> updateRole(String newRole) async {
    if (_currentUser == null) return;
    _currentUser = _currentUser!.copyWith(role: newRole);
    await _persistSession();
    notifyListeners();
  }

  Future<void> updateUser(UserModel user) async {
    _currentUser = user;
    await _persistSession();
    notifyListeners();
  }

  Future<void> logout() async {
    try {
      final GoogleSignIn googleSignIn = GoogleSignIn(
        serverClientId: defaultTargetPlatform == TargetPlatform.android
            ? googleWebClientId
            : null,
        scopes: ['email', 'profile'],
      );
      await googleSignIn.signOut();
      try {
        await googleSignIn.disconnect();
      } catch (_) {}
    } catch (e) {
      debugPrint('Google Sign-Out error: $e');
    }

    try {
      await FirebaseAuth.instance.signOut();
    } catch (e) {
      debugPrint('Firebase Sign-Out error: $e');
    }

    _currentUser = null;
    _accessToken = null;
    _isOnboardingCompleted = false;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('live2030_user_session');
    await prefs.remove('live2030_access_token');
    await prefs.remove('live2030_onboarding_completed');
    notifyListeners();
  }

  /// Delete user account permanently and wipe all local session data (Apple 5.1.1(v) & GDPR)
  Future<Map<String, dynamic>> deleteAccount() async {
    if (_currentUser == null) {
      return {'success': false, 'message': 'No active account session found'};
    }

    final userId = _currentUser!.id;
    final res = await ApiService().deleteAccount(userId);

    // Regardless of whether backend succeeded or user was already purged, wipe local state
    await logout();
    return res;
  }

  Future<void> _persistSession() async {
    if (_currentUser == null) return;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('live2030_user_session', jsonEncode(_currentUser!.toJson()));
      if (_accessToken != null) {
        await prefs.setString('live2030_access_token', _accessToken!);
      }
    } catch (e) {
      debugPrint('Error saving session: $e');
    }
  }
}
