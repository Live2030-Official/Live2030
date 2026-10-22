import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'auth_service.dart';
import '../localization/app_locale_service.dart';
import '../localization/translation_service.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;

  late final Dio _dio;

  static String? customServerHost;

  static String get baseUrl {
    if (customServerHost != null && customServerHost!.trim().isNotEmpty) {
      final host = customServerHost!.trim();
      return host.startsWith('http') ? host : 'http://$host:4000';
    }
    // Default to Live AWS Production Server (accessible from all devices worldwide)
    return 'http://13.51.73.60:4000';
  }

  ApiService._internal() {
    _dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    // Attach the current auth token to every request automatically.
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          final token = AuthService().accessToken;
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
      ),
    );
  }

  /// Get live discovery rooms feed (Video & Voice Parties)
  /// Supports category / language / country / roomType filtering for discovery pills.
  Future<List<Map<String, dynamic>>> getDiscoveryRooms({
    String? category,
    String? language,
    String? country,
    String? roomType,
  }) async {
    try {
      final query = <String, dynamic>{};
      if (category != null && category.isNotEmpty && category.toUpperCase() != 'ALL') {
        query['category'] = category;
      }
      if (language != null && language.isNotEmpty && language.toLowerCase() != 'global' && language.toLowerCase() != 'all') {
        query['language'] = language;
      }
      if (country != null && country.isNotEmpty && country.toLowerCase() != 'global' && country.toLowerCase() != 'all') {
        query['country'] = country;
      }
      if (roomType != null && roomType.isNotEmpty && roomType.toUpperCase() != 'ALL') {
        query['roomType'] = roomType;
      }
      final response = await _dio.get('/api/rooms/discovery', queryParameters: query.isEmpty ? null : query);
      if (response.statusCode == 200 && response.data is List) {
        final list = List<Map<String, dynamic>>.from(response.data);
        return await _translateRooms(list);
      }
    } catch (e) {
      debugPrint('Error fetching discovery rooms: $e');
    }
    return [];
  }

  /// Start a new room (Video or Voice Party) and obtain Agora Broadcaster Token
  Future<Map<String, dynamic>?> startRoom({
    required String title,
    required String roomType, // 'VIDEO' or 'VOICE'
    String? hostId,
    String? hostDisplayName,
    String? hostAvatarUrl,
    String? coverUrl,
    bool isLocked = false,
    String? roomPin,
    bool isTrendingHidden = false,
    String? hostCustomId,
    int? hostVipLevel,
    String? category,
    String? language,
    String? country,
  }) async {
    try {
      final user = AuthService().currentUser;
      final currentUserId = (hostId != null && hostId.isNotEmpty)
          ? hostId
          : (user?.id != null && user!.id.isNotEmpty)
              ? user.id
              : 'user_${DateTime.now().millisecondsSinceEpoch}';
      final currentName = (hostDisplayName != null && hostDisplayName.trim().isNotEmpty)
          ? hostDisplayName.trim()
          : (user?.displayName != null && user!.displayName.trim().isNotEmpty)
              ? user.displayName.trim()
              : 'Live Host';
      final currentAvatar = hostAvatarUrl ?? user?.avatarUrl;
      final response = await _dio.post(
        '/api/rooms/start',
        data: {
          'title': title,
          'roomType': roomType,
          'hostId': currentUserId,
          'hostDisplayName': currentName,
          'hostAvatarUrl': currentAvatar,
          if (coverUrl != null && coverUrl.isNotEmpty) 'coverUrl': coverUrl,
          'isLocked': isLocked,
          if (roomPin != null && roomPin.isNotEmpty) 'roomPin': roomPin,
          'isTrendingHidden': isTrendingHidden,
          if (hostCustomId != null && hostCustomId.isNotEmpty) 'hostCustomId': hostCustomId,
          if (hostVipLevel != null) 'hostVipLevel': hostVipLevel,
          if (category != null && category.isNotEmpty) 'category': category,
          if (language != null && language.isNotEmpty) 'language': language,
          if (country != null && country.isNotEmpty) 'country': country,
        },
      );
      if (response.statusCode == 201 || response.statusCode == 200) {
        return Map<String, dynamic>.from(response.data);
      }
    } catch (e) {
      debugPrint('Error starting live room: $e');
    }
    return null;
  }

  /// Join an active room and obtain Agora Subscriber Token with Dual-Channel (HTTP + WebSocket)
  Future<Map<String, dynamic>?> joinRoom(String roomId, {String? userId, String? channelName, String? roomPin}) async {
    final currentUserId = userId ?? AuthService().currentUser?.id ?? 'viewer_${DateTime.now().millisecondsSinceEpoch}';
    final effectiveRoomId = roomId.trim().isNotEmpty ? roomId.trim() : (channelName ?? 'live_room');
    final targetChannel = (channelName != null && channelName.trim().isNotEmpty) ? channelName.trim() : effectiveRoomId;

    // 1. Primary HTTP Request
    try {
      final response = await _dio.post(
        '/api/rooms/join',
        data: {
          'roomId': effectiveRoomId,
          'userId': currentUserId,
          'channelName': targetChannel,
          if (roomPin != null && roomPin.isNotEmpty) 'roomPin': roomPin,
        },
      );
      if ((response.statusCode == 200 || response.statusCode == 201) && response.data != null) {
        final data = Map<String, dynamic>.from(response.data);
        if (data['agora']?['token'] != null && data['agora']['token'].toString().isNotEmpty) {
          debugPrint('✅ Agora Subscriber Token obtained successfully via HTTP /api/rooms/join');
          return data;
        }
      }
    } catch (e) {
      debugPrint('⚠️ HTTP /api/rooms/join failed ($e), falling back to WebSocket RTC channel...');
    }

    // 2. High-Resilience WebSocket Gateway Token Fallback (Bypasses all HTTP blocks)
    try {
      final socket = io.io(
        '${ApiService.baseUrl}/live',
        io.OptionBuilder()
            .setTransports(['websocket', 'polling'])
            .setAuth({'token': AuthService().accessToken ?? ''})
            .disableAutoConnect()
            .build(),
      );
      final completer = Completer<Map<String, dynamic>?>();
      socket.connect();
      socket.onConnect((_) {
        socket.emit('room:token:request', {
          'channelName': targetChannel,
          'isPublisher': false,
        });
      });
      socket.on('room:token:response', (data) {
        if (!completer.isCompleted && data != null && data['agora'] != null) {
          completer.complete({
            'room': {
              'id': effectiveRoomId,
              'agoraChannelName': targetChannel,
              'status': 'LIVE',
            },
            'agora': Map<String, dynamic>.from(data['agora']),
          });
          socket.disconnect();
          socket.dispose();
        }
      });
      Future.delayed(const Duration(milliseconds: 2500), () {
        if (!completer.isCompleted) {
          completer.complete(null);
          try {
            socket.disconnect();
            socket.dispose();
          } catch (_) {}
        }
      });
      final socketRes = await completer.future;
      if (socketRes != null) return socketRes;
    } catch (wsErr) {
      debugPrint('⚠️ WebSocket RTC token fallback failed: $wsErr');
    }

    return null;
  }

  /// End stream (Host or Admin)
  Future<bool> endRoom(String roomId, {String? hostId}) async {
    try {
      final host = hostId ?? AuthService().currentUser?.id;
      final response = await _dio.post(
        '/api/rooms/$roomId/end',
        queryParameters: (host != null && host.isNotEmpty) ? {'hostId': host} : null,
      );
      return response.statusCode == 200 || response.statusCode == 201;
    } catch (e) {
      debugPrint('Error ending room: $e');
      return false;
    }
  }

  /// Ends a room and returns the end-of-stream summary (host dashboard) if provided.
  Future<Map<String, dynamic>?> endRoomWithSummary(String roomId) async {
    try {
      final host = AuthService().currentUser?.id;
      final response = await _dio.post(
        '/api/rooms/$roomId/end',
        queryParameters: (host != null && host.isNotEmpty) ? {'hostId': host} : null,
      );
      if (response.statusCode == 200 && response.data is Map && response.data['summary'] is Map) {
        return Map<String, dynamic>.from(response.data['summary']);
      }
    } catch (e) {
      debugPrint('Error ending room with summary: $e');
    }
    return null;
  }

  /// Audience viewer leaves a room (decrements the live viewer count)
  Future<void> leaveRoom(String roomId) async {
    try {
      await _dio.post('/api/rooms/$roomId/leave');
    } catch (e) {
      debugPrint('Error leaving room: $e');
    }
  }

  /// Wallet / coin transaction history for the signed-in user.
  Future<List<Map<String, dynamic>>> getTransactions({int limit = 100}) async {
    try {
      final response = await _dio.get('/api/payments/transactions', queryParameters: {'limit': limit});
      if (response.statusCode == 200 && response.data is List) {
        return List<Map<String, dynamic>>.from(response.data);
      }
    } catch (e) {
      debugPrint('Error fetching transactions: $e');
    }
    return [];
  }

  /// Fetch active virtual gift catalog
  Future<List<Map<String, dynamic>>> getGifts() async {
    try {
      final response = await _dio.get('/api/gifts');
      if (response.statusCode == 200 && response.data is List) {
        final list = List<Map<String, dynamic>>.from(response.data);
        return await _translateGifts(list);
      }
    } catch (e) {
      debugPrint('Error fetching gifts: $e');
    }
    return [];
  }

  /// Fetch verified coin resellers
  Future<List<Map<String, dynamic>>> getResellers() async {
    try {
      final response = await _dio.get('/api/resellers');
      if (response.statusCode == 200 && response.data is List) {
        final list = List<Map<String, dynamic>>.from(response.data);
        return await _translateResellers(list);
      }
    } catch (e) {
      debugPrint('Error fetching resellers: $e');
    }
    return [];
  }

  /// Fetch official platform support contact details (WhatsApp, Helpline, Email)
  Future<Map<String, dynamic>> getSupportContact() async {
    try {
      final response = await _dio.get('/api/support/contact');
      if (response.statusCode == 200 && response.data is Map) {
        final map = Map<String, dynamic>.from(response.data);
        return await _translateSupportContact(map);
      }
    } catch (e) {
      debugPrint('Error fetching support contact: $e');
    }
    return await _translateSupportContact({
      'whatsappNumber': '+91 98765 43210',
      'helplineEmail': 'support@live2030.com',
      'helplinePhone': '+1 800 555 0199',
      'operatingHours': '24/7 Global Live Support',
      'announcement': 'Official Live 2030 Help Center & Appeal Desk.',
    });
  }

  /// Bind host to agency
  Future<bool> bindAgency({
    required String hostId,
    required String agencyCode,
  }) async {
    try {
      final response = await _dio.post(
        '/api/agencies/bind-host',
        data: {
          'hostId': hostId,
          'agencyCode': agencyCode,
        },
      );
      return response.statusCode == 200 || response.statusCode == 201;
    } catch (e) {
      debugPrint('Error binding agency: $e');
      return false;
    }
  }

  /// Submit host diamond cash withdrawal request
  Future<bool> requestWithdrawal({
    required String userId,
    required int amountDiamonds,
    required String paymentMethod,
    required Map<String, dynamic> accountDetails,
  }) async {
    try {
      final response = await _dio.post(
        '/api/withdrawals/request',
        data: {
          'userId': userId,
          'amountDiamonds': amountDiamonds,
          'paymentMethod': paymentMethod,
          'accountDetails': accountDetails,
        },
      );
      return response.statusCode == 200 || response.statusCode == 201;
    } catch (e) {
      debugPrint('Error requesting withdrawal: $e');
      return false;
    }
  }

  /// Guest Login
  Future<Map<String, dynamic>?> loginGuest({String? displayName}) async {
    try {
      final response = await _dio.post(
        '/api/auth/guest-login',
        data: {
          'displayName': displayName,
          'deviceId': 'flutter_${defaultTargetPlatform.name}',
        },
      );
      if (response.statusCode == 200 && response.data != null) {
        return Map<String, dynamic>.from(response.data);
      }
    } catch (e) {
      debugPrint('Error in guest login: $e');
    }
    return null;
  }

  /// Google Login
  Future<Map<String, dynamic>?> loginGoogle({
    required String email,
    required String displayName,
    String? avatarUrl,
    String? idToken,
  }) async {
    try {
      final response = await _dio.post(
        '/api/auth/google-login',
        data: {
          'email': email,
          'displayName': displayName,
          'avatarUrl': avatarUrl,
          'idToken': idToken ?? 'google-token-${DateTime.now().millisecondsSinceEpoch}',
          'deviceId': 'flutter_${defaultTargetPlatform.name}',
        },
      );
      if (response.statusCode == 200 && response.data != null) {
        return Map<String, dynamic>.from(response.data);
      }
    } catch (e) {
      debugPrint('Error in google login: $e');
    }
    return null;
  }

  /// Apple Login (iOS)
  Future<Map<String, dynamic>?> loginApple({
    required String appleId,
    String? email,
    String? displayName,
    String? avatarUrl,
    String? idToken,
  }) async {
    try {
      final response = await _dio.post(
        '/api/auth/apple-login',
        data: {
          'appleId': appleId,
          if (email != null && email.isNotEmpty) 'email': email,
          if (displayName != null && displayName.isNotEmpty) 'displayName': displayName,
          if (avatarUrl != null && avatarUrl.isNotEmpty) 'avatarUrl': avatarUrl,
          'idToken': idToken ?? 'apple-token-${DateTime.now().millisecondsSinceEpoch}',
          'deviceId': 'flutter_${defaultTargetPlatform.name}',
        },
      );
      if (response.statusCode == 200 && response.data != null) {
        return Map<String, dynamic>.from(response.data);
      }
    } catch (e) {
      debugPrint('Error in apple login: $e');
    }
    return null;
  }

  /// Request MSG91 Mobile OTP (with 60s cooldown period)
  Future<Map<String, dynamic>> sendPhoneOtp(String phone) async {
    try {
      final response = await _dio.post(
        '/api/auth/otp/send',
        data: {'phone': phone},
      );
      if (response.data != null) {
        return Map<String, dynamic>.from(response.data);
      }
    } on DioException catch (e) {
      if (e.response?.data != null && e.response?.data is Map) {
        return Map<String, dynamic>.from(e.response!.data);
      }
      return {
        'success': false,
        'message': e.response?.data?['message'] ?? 'Failed to send OTP. Please check phone number.',
      };
    } catch (e) {
      debugPrint('Error sending phone OTP: $e');
    }
    return {'success': false, 'message': 'Network error sending OTP'};
  }

  /// Verify MSG91 Mobile OTP & Login
  Future<Map<String, dynamic>> verifyPhoneOtp({
    required String phone,
    required String otp,
    String? displayName,
  }) async {
    try {
      final response = await _dio.post(
        '/api/auth/otp/verify',
        data: {
          'phone': phone,
          'otp': otp,
          if (displayName != null && displayName.isNotEmpty) 'displayName': displayName,
        },
      );
      if (response.data != null) {
        return Map<String, dynamic>.from(response.data);
      }
    } on DioException catch (e) {
      if (e.response?.data != null && e.response?.data is Map) {
        return Map<String, dynamic>.from(e.response!.data);
      }
      return {
        'success': false,
        'message': e.response?.data?['message'] ?? 'Invalid OTP code. Please try again.',
      };
    } catch (e) {
      debugPrint('Error verifying phone OTP: $e');
    }
    return {'success': false, 'message': 'Network error verifying OTP'};
  }


  /// Upload profile avatar to backend/AWS via multipart/form-data
  Future<String?> uploadAvatar(String filePath) async {
    try {
      final fileName = filePath.split(RegExp(r'[/\\]')).last;
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(
          filePath,
          filename: fileName,
        ),
      });

      final response = await _dio.post(
        '/api/upload/avatar',
        data: formData,
        options: Options(
          contentType: 'multipart/form-data',
        ),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = response.data;
        if (data != null && data['url'] != null) {
          return data['url'] as String;
        }
      }
    } catch (e) {
      debugPrint('Error uploading avatar image: $e');
    }
    return null;
  }

  /// Get full image URL from relative path or return original URL
  static String getFullImageUrl(String? url) {
    if (url == null || url.trim().isEmpty) {
      return 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200';
    }
    final trimmed = url.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    final base = baseUrl.endsWith('/') ? baseUrl.substring(0, baseUrl.length - 1) : baseUrl;
    final path = trimmed.startsWith('/') ? trimmed : '/$trimmed';
    return '$base$path';
  }

  /// Update Profile
  Future<Map<String, dynamic>?> updateProfile({
    required String userId,
    String? username,
    String? displayName,
    String? avatarUrl,
    String? bio,
    String? gender,
    String? birthday,
    String? country,
  }) async {
    try {
      final body = <String, dynamic>{'userId': userId};
      if (username != null) body['username'] = username;
      if (displayName != null) body['displayName'] = displayName;
      if (avatarUrl != null) body['avatarUrl'] = avatarUrl;
      if (bio != null) body['bio'] = bio;
      if (gender != null) body['gender'] = gender;
      if (birthday != null) body['birthday'] = birthday;
      if (country != null) body['country'] = country;
      final response = await _dio.put('/api/users/profile', data: body);
      if ((response.statusCode == 200 || response.statusCode == 201) && response.data != null) {
        return Map<String, dynamic>.from(response.data);
      }
    } catch (e) {
      debugPrint('Error updating profile: $e');
    }
    return null;
  }

  /// Permanently delete user account and associated personal data (Apple 5.1.1(v) & GDPR)
  Future<Map<String, dynamic>> deleteAccount(String userId) async {
    try {
      final response = await _dio.delete(
        '/api/users/account',
        data: {'userId': userId},
      );
      if (response.data != null) {
        return Map<String, dynamic>.from(response.data);
      }
      return {'success': true, 'message': 'Account deleted successfully'};
    } on DioException catch (e) {
      if (e.response?.data != null && e.response?.data is Map) {
        return Map<String, dynamic>.from(e.response!.data);
      }
      return {'success': false, 'message': e.message ?? 'Failed to delete account'};
    } catch (e) {
      debugPrint('Error deleting account: $e');
      return {'success': false, 'message': 'Error deleting account: $e'};
    }
  }

  /// Get user profile
  Future<Map<String, dynamic>?> getUserProfile(String userId) async {
    try {
      final response = await _dio.get('/api/users/$userId');
      if ((response.statusCode == 200 || response.statusCode == 201) && response.data != null) {
        return Map<String, dynamic>.from(response.data);
      }
    } catch (e) {
      debugPrint('Error fetching user profile: $e');
    }
    return null;
  }

  /// Submit Community Violation Report
  Future<bool> submitReport({
    required String targetType,
    required String targetId,
    required String category,
    required String reason,
    String? reportedUserId,
  }) async {
    try {
      final response = await _dio.post(
        '/api/reports/create',
        data: {
          'targetType': targetType,
          'targetId': targetId,
          'category': category,
          'reason': reason,
          'reportedUserId': reportedUserId,
        },
      );
      return response.statusCode == 200 || response.statusCode == 201;
    } catch (e) {
      debugPrint('Error submitting report: $e');
      return false;
    }
  }

  /// Bind user to agency and upgrade to Host
  Future<Map<String, dynamic>?> bindHost({
    required String hostId,
    required String agencyCode,
  }) async {
    try {
      final response = await _dio.post(
        '/api/agencies/bind-host',
        data: {
          'hostId': hostId,
          'agencyCode': agencyCode.trim().toUpperCase(),
        },
      );
      if (response.statusCode == 200 || response.statusCode == 201) {
        return Map<String, dynamic>.from(response.data);
      }
    } catch (e) {
      debugPrint('Error binding to agency: $e');
      if (e is DioException && e.response?.data != null) {
        final msg = e.response?.data['message'];
        throw Exception(msg is List ? msg.join(', ') : msg ?? 'Failed to bind agency');
      }
      rethrow;
    }
    return null;
  }

  /// Get host certification and affiliated agency status
  Future<Map<String, dynamic>?> getHostAgencyStatus(String hostId) async {
    try {
      final response = await _dio.get('/api/agencies/host-status/$hostId');
      if (response.statusCode == 200 && response.data != null) {
        return Map<String, dynamic>.from(response.data);
      }
    } catch (e) {
      debugPrint('Error fetching host agency status: $e');
    }
    return null;
  }

  /// Send virtual gift with real-time atomic balance deduction
  Future<Map<String, dynamic>?> sendGift({
    required String roomId,
    required String giftId,
    int quantity = 1,
    String? senderId,
    String? recipientId,
    int? targetSeatIndex,
    String? targetHost, // 'host1' or 'host2' for PK battles
  }) async {
    try {
      final response = await _dio.post(
        '/api/gifts/send',
        data: {
          'roomId': roomId,
          'giftId': giftId,
          'quantity': quantity,
          if (senderId != null) 'senderId': senderId,
          if (recipientId != null) 'recipientId': recipientId,
          if (targetSeatIndex != null) 'targetSeatIndex': targetSeatIndex,
          if (targetHost != null) 'targetHost': targetHost,
        },
      );
      if (response.statusCode == 200 || response.statusCode == 201) {
        return Map<String, dynamic>.from(response.data);
      }
    } catch (e) {
      debugPrint('Error sending virtual gift: $e');
      if (e is DioException && e.response?.data != null) {
        final msg = e.response?.data['message'];
        throw Exception(msg is List ? msg.join(', ') : msg ?? 'Failed to send gift');
      }
      rethrow;
    }
    return null;
  }

  /// Get detailed stream earnings & commission report
  Future<Map<String, dynamic>?> getUserEarningsReport(String userId) async {
    try {
      final response = await _dio.get('/api/users/$userId/earnings-report');
      if (response.statusCode == 200 && response.data != null) {
        return Map<String, dynamic>.from(response.data);
      }
    } catch (e) {
      debugPrint('Error fetching user earnings report: $e');
    }
    return null;
  }

  // ==========================================
  // SOCIAL FEED, POSTS, MEDIA, LIKES, COMMENTS
  // ==========================================

  /// Upload social post photo or video to AWS backend (supports up to 100MB)
  Future<Map<String, dynamic>?> uploadPostMedia(String filePath, {bool isVideo = false}) async {
    try {
      final fileName = filePath.split(RegExp(r'[\\/]')).last;
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(filePath, filename: fileName),
      });

      final response = await _dio.post(
        '/api/upload/post-media',
        data: formData,
        options: Options(
          contentType: 'multipart/form-data',
          sendTimeout: const Duration(minutes: 3),
          receiveTimeout: const Duration(minutes: 3),
        ),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = Map<String, dynamic>.from(response.data);
        var rawUrl = data['url'] as String? ?? '';
        if (rawUrl.startsWith('/')) {
          data['url'] = '$baseUrl$rawUrl';
        }
        var rawThumb = data['thumbnailUrl'] as String? ?? '';
        if (rawThumb.startsWith('/')) {
          data['thumbnailUrl'] = '$baseUrl$rawThumb';
        }
        return data;
      }
    } catch (e) {
      debugPrint('Error uploading post media: $e');
      rethrow;
    }
    return null;
  }

  /// Create a new social post (Photo or Video)
  Future<Map<String, dynamic>?> createPost({
    required String authorId,
    required String type, // 'PHOTO' or 'VIDEO'
    String? caption,
    required String mediaUrl,
    String? thumbnailUrl,
  }) async {
    try {
      final response = await _dio.post(
        '/api/social/posts',
        data: {
          'authorId': authorId,
          'type': type,
          if (caption != null) 'caption': caption,
          'mediaUrl': mediaUrl,
          if (thumbnailUrl != null) 'thumbnailUrl': thumbnailUrl,
        },
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        return Map<String, dynamic>.from(response.data);
      }
    } catch (e) {
      debugPrint('Error creating social post: $e');
      rethrow;
    }
    return null;
  }

  /// Fetch social feed posts with filters ('PHOTO' or 'VIDEO') and pagination
  Future<Map<String, dynamic>> getSocialPosts({
    String? type,
    int page = 1,
    int limit = 20,
    String? currentUserId,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        'page': page,
        'limit': limit,
      };
      if (type != null && type.isNotEmpty) queryParams['type'] = type;
      if (currentUserId != null && currentUserId.isNotEmpty) queryParams['currentUserId'] = currentUserId;

      final response = await _dio.get('/api/social/posts', queryParameters: queryParams);
      if (response.statusCode == 200 && response.data != null) {
        final map = Map<String, dynamic>.from(response.data);
        return await _translateSocialPosts(map);
      }
    } catch (e) {
      debugPrint('Error fetching social posts: $e');
    }
    return {'posts': <dynamic>[], 'pagination': {}};
  }

  /// Toggle like/unlike on a post
  Future<Map<String, dynamic>?> togglePostLike(String postId, String userId) async {
    try {
      final response = await _dio.post(
        '/api/social/posts/$postId/like',
        data: {'userId': userId},
      );
      if (response.statusCode == 200 && response.data != null) {
        return Map<String, dynamic>.from(response.data);
      }
    } catch (e) {
      debugPrint('Error toggling post like: $e');
    }
    return null;
  }

  /// Fetch comments tree with nested replies
  Future<List<Map<String, dynamic>>> getPostComments(String postId) async {
    try {
      final response = await _dio.get('/api/social/posts/$postId/comments');
      if (response.statusCode == 200 && response.data is List) {
        final list = List<Map<String, dynamic>>.from(response.data);
        return await _translateCommentsList(list);
      }
    } catch (e) {
      debugPrint('Error fetching comments: $e');
    }
    return [];
  }

  /// Add a comment or reply to a post
  Future<Map<String, dynamic>?> addPostComment(
    String postId, {
    required String authorId,
    required String content,
    String? parentId,
  }) async {
    try {
      final response = await _dio.post(
        '/api/social/posts/$postId/comments',
        data: {
          'authorId': authorId,
          'content': content,
          if (parentId != null) 'parentId': parentId,
        },
      );
      if (response.statusCode == 200 || response.statusCode == 201) {
        return Map<String, dynamic>.from(response.data);
      }
    } catch (e) {
      debugPrint('Error adding comment: $e');
      rethrow;
    }
    return null;
  }

  /// Delete a comment
  Future<bool> deletePostComment(String commentId, String userId) async {
    try {
      final response = await _dio.delete(
        '/api/social/comments/$commentId',
        queryParameters: {'userId': userId},
      );
      return response.statusCode == 200;
    } catch (e) {
      debugPrint('Error deleting comment: $e');
      return false;
    }
  }

  /// Increment share count
  Future<int?> sharePost(String postId) async {
    try {
      final response = await _dio.post('/api/social/posts/$postId/share');
      if (response.statusCode == 200 && response.data != null) {
        return response.data['sharesCount'] as int?;
      }
    } catch (e) {
      debugPrint('Error sharing post: $e');
    }
    return null;
  }

  /// Delete post
  Future<bool> deletePost(String postId, String userId) async {
    try {
      final response = await _dio.delete(
        '/api/social/posts/$postId',
        queryParameters: {'userId': userId},
      );
      return response.statusCode == 200;
    } catch (e) {
      debugPrint('Error deleting post: $e');
      return false;
    }
  }

  /// Fetch user's uploaded content (for Profile "My Content")
  Future<Map<String, dynamic>> getUserPosts(String userId, {String? currentUserId}) async {
    try {
      final queryParams = <String, dynamic>{};
      if (currentUserId != null) queryParams['currentUserId'] = currentUserId;

      final response = await _dio.get('/api/social/users/$userId/posts', queryParameters: queryParams);
      if (response.statusCode == 200 && response.data != null) {
        final map = Map<String, dynamic>.from(response.data);
        return await _translateSocialPosts(map);
      }
    } catch (e) {
      debugPrint('Error fetching user posts: $e');
    }
    return {'posts': <dynamic>[], 'totalPosts': 0};
  }

  /// Toggle Follow/Unfollow
  Future<Map<String, dynamic>?> toggleFollowUser(String targetUserId, String followerId) async {
    try {
      final response = await _dio.post(
        '/api/social/users/$targetUserId/follow',
        data: {'followerId': followerId},
      );
      if (response.statusCode == 200 && response.data != null) {
        return Map<String, dynamic>.from(response.data);
      }
    } catch (e) {
      debugPrint('Error toggling follow: $e');
    }
    return null;
  }

  /// Fetch followers list
  Future<List<Map<String, dynamic>>> getUserFollowers(String userId, {String? currentUserId}) async {
    try {
      final queryParams = <String, dynamic>{};
      if (currentUserId != null) queryParams['currentUserId'] = currentUserId;

      final response = await _dio.get('/api/social/users/$userId/followers', queryParameters: queryParams);
      if (response.statusCode == 200 && response.data is List) {
        return List<Map<String, dynamic>>.from(response.data);
      }
    } catch (e) {
      debugPrint('Error fetching followers: $e');
    }
    return [];
  }

  /// Fetch following list
  Future<List<Map<String, dynamic>>> getUserFollowing(String userId, {String? currentUserId}) async {
    try {
      final queryParams = <String, dynamic>{};
      if (currentUserId != null) queryParams['currentUserId'] = currentUserId;

      final response = await _dio.get('/api/social/users/$userId/following', queryParameters: queryParams);
      if (response.statusCode == 200 && response.data is List) {
        return List<Map<String, dynamic>>.from(response.data);
      }
    } catch (e) {
      debugPrint('Error fetching following: $e');
    }
    return [];
  }

  /// Fetch user profile social statistics
  Future<Map<String, dynamic>?> getUserSocialStats(String userId, {String? currentUserId}) async {
    try {
      final queryParams = <String, dynamic>{};
      if (currentUserId != null) queryParams['currentUserId'] = currentUserId;

      final response = await _dio.get('/api/social/users/$userId/social-stats', queryParameters: queryParams);
      if (response.statusCode == 200 && response.data != null) {
        return Map<String, dynamic>.from(response.data);
      }
    } catch (e) {
      debugPrint('Error fetching user social stats: $e');
    }
    return null;
  }

  /// Fetch all level configs (Levels 1 to 8)
  Future<List<Map<String, dynamic>>> getLevelConfigs() async {
    try {
      final response = await _dio.get('/api/levels');
      if (response.statusCode == 200 && response.data is List) {
        final list = List<Map<String, dynamic>>.from(response.data);
        return await _translateLevels(list);
      }
    } catch (e) {
      debugPrint('Error fetching level configs: $e');
    }
    return [];
  }

  /// Fetch single user level & XP info
  Future<Map<String, dynamic>?> getUserLevelInfo(String userId) async {
    try {
      final response = await _dio.get('/api/levels/user/$userId');
      if (response.statusCode == 200 && response.data != null) {
        return Map<String, dynamic>.from(response.data);
      }
    } catch (e) {
      debugPrint('Error fetching user level info: $e');
    }
    return null;
  }

  /// Fetch single user profile by ID including moderation and wallet state
  Future<Map<String, dynamic>?> fetchUserProfile(String userId) async {
    try {
      final response = await _dio.get('/api/users/$userId');
      if (response.statusCode == 200 && response.data != null) {
        final map = Map<String, dynamic>.from(response.data);
        return await _translateUserProfile(map);
      }
    } catch (e) {
      debugPrint('Error fetching user profile: $e');
    }
    return null;
  }

  /// VIP 1+: Claim a custom vanity ID
  Future<bool> claimCustomId(String userId, String customId) async {
    try {
      final res = await _dio.put('/api/levels/user/$userId/custom-id', data: {'customId': customId});
      return res.statusCode == 200 || res.statusCode == 201;
    } catch (e) {
      debugPrint('Error claiming custom ID: $e');
      return false;
    }
  }

  /// VIP 1+: Get profile visitors
  Future<List<Map<String, dynamic>>> getProfileVisitors(String userId, {String? requestingUserId}) async {
    try {
      final res = await _dio.get('/api/levels/visitors/$userId', queryParameters: {'requestingUserId': requestingUserId ?? userId});
      if (res.statusCode == 200 && res.data is List) {
        return List<Map<String, dynamic>>.from(res.data);
      }
    } catch (e) {
      debugPrint('Error fetching profile visitors: $e');
    }
    return [];
  }

  /// VIP: Record a profile visit
  Future<bool> recordProfileVisitor({required String profileId, required String visitorId}) async {
    try {
      final res = await _dio.post('/api/levels/visitors/visit', data: {
        'profileId': profileId,
        'visitorId': visitorId,
      });
      return res.statusCode == 200 || res.statusCode == 201;
    } catch (e) {
      debugPrint('Error recording profile visitor: $e');
      return false;
    }
  }

  /// VIP: Update user VIP privacy settings and custom name color
  Future<bool> updateVipSettings({required String userId, required Map<String, dynamic> settings, String? customNameColor}) async {
    try {
      final res = await _dio.put('/api/levels/user/$userId/settings', data: {
        ...settings,
        if (customNameColor != null) 'customNameColor': customNameColor,
      });
      return res.statusCode == 200 || res.statusCode == 201;
    } catch (e) {
      debugPrint('Error updating VIP settings: $e');
      return false;
    }
  }

  /// VIP: Fetch VIP status and active privileges
  Future<Map<String, dynamic>?> getUserVipStatus(String userId) async {
    try {
      final res = await _dio.get('/api/levels/user/$userId');
      if (res.statusCode == 200 && res.data is Map) {
        return Map<String, dynamic>.from(res.data);
      }
    } catch (e) {
      debugPrint('Error fetching user VIP status: $e');
    }
    return null;
  }

  /// ----------------------------------------------------
  /// RsomPay Payment Gateway (docs.rsompay.com) Integration
  /// ----------------------------------------------------

  /// Fetch active coin top-up packages and gateway configuration
  Future<Map<String, dynamic>> getCoinPackages() async {
    try {
      final response = await _dio.get('/api/payments/packages');
      if (response.statusCode == 200 && response.data is Map) {
        final map = Map<String, dynamic>.from(response.data);
        return await _translatePackages(map);
      }
    } catch (e) {
      debugPrint('Error fetching coin packages: $e');
    }

    // Resilient fallback default packages
    final fallback = {
      'packages': [
        {'id': 'pkg_100', 'coins': 100, 'bonusCoins': 0, 'totalCoins': 100, 'amountUSD': 0.53, 'amountSAR': 2.0, 'badge': 'Starter'},
        {'id': 'pkg_500', 'coins': 500, 'bonusCoins': 50, 'totalCoins': 550, 'amountUSD': 2.67, 'amountSAR': 10.0, 'badge': '+10% Bonus'},
        {'id': 'pkg_1200', 'coins': 1200, 'bonusCoins': 200, 'totalCoins': 1400, 'amountUSD': 6.4, 'amountSAR': 24.0, 'badge': '+16% Bonus'},
        {'id': 'pkg_2500', 'coins': 2500, 'bonusCoins': 500, 'totalCoins': 3000, 'amountUSD': 13.33, 'amountSAR': 50.0, 'badge': 'Most Popular 🔥', 'popular': true},
        {'id': 'pkg_6000', 'coins': 6000, 'bonusCoins': 1500, 'totalCoins': 7500, 'amountUSD': 32.0, 'amountSAR': 120.0, 'badge': '+25% Extra ✨'},
        {'id': 'pkg_15000', 'coins': 15000, 'bonusCoins': 5000, 'totalCoins': 20000, 'amountUSD': 80.0, 'amountSAR': 300.0, 'badge': 'Mega Deal 💎'},
      ],
      'environment': 'sandbox',
      'currency': 'SAR',
      'isSandbox': true,
      'testCards': [
        {'brand': 'mada', 'cardNumber': '4464040000000007', 'expiry': '01/39', 'cvv': '100'},
        {'brand': 'Mastercard', 'cardNumber': '5123450000000008', 'expiry': '01/39', 'cvv': '100'},
      ],
    };
    return await _translatePackages(fallback);
  }

  /// Create RsomPay Checkout Order session
  Future<Map<String, dynamic>?> createRsomPayOrder({
    required int coins,
    required double amountSAR,
    String? packageId,
    String? paymentMethod,
  }) async {
    try {
      final user = AuthService().currentUser;
      final response = await _dio.post(
        '/api/payments/rsompay/create-order',
        data: {
          'userId': user?.id,
          'packageId': packageId,
          'coins': coins,
          'amountSAR': amountSAR,
          if (paymentMethod != null) 'paymentMethod': paymentMethod,
        },
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        return Map<String, dynamic>.from(response.data);
      }
    } catch (e) {
      debugPrint('Error creating RsomPay order: $e');
    }
    return null;
  }

  /// Verify status of RsomPay payment order and auto-credit wallet
  Future<Map<String, dynamic>?> verifyPaymentStatus(String orderId) async {
    try {
      final response = await _dio.get('/api/payments/rsompay/status/$orderId');
      if (response.statusCode == 200 && response.data != null) {
        return Map<String, dynamic>.from(response.data);
      }
    } catch (e) {
      debugPrint('Error verifying RsomPay payment status: $e');
    }
    return null;
  }

  /// Fetch user payment history
  Future<List<Map<String, dynamic>>> getPaymentHistory(String userId) async {
    try {
      final response = await _dio.get('/api/payments/history/$userId');
      if (response.statusCode == 200 && response.data is List) {
        return List<Map<String, dynamic>>.from(response.data);
      }
    } catch (e) {
      debugPrint('Error fetching payment history: $e');
    }
    return [];
  }

  // --------------------------------------------------------------------------
  // Deep Server-Side Dynamic Response Translators
  // --------------------------------------------------------------------------

  Future<List<Map<String, dynamic>>> _translateRooms(List<Map<String, dynamic>> rooms) async {
    final lang = AppLocaleService().currentLanguage.code;
    if (lang == 'en' || rooms.isEmpty) return rooms;

    final toTranslate = <String>{};
    for (final r in rooms) {
      final t = r['title']?.toString();
      final c = r['category']?.toString();
      if (t != null && t.trim().isNotEmpty) toTranslate.add(t.trim());
      if (c != null && c.trim().isNotEmpty) toTranslate.add(c.trim());
    }

    if (toTranslate.isNotEmpty) {
      await TranslationService().translateBatch(toTranslate.toList(), targetLang: lang);
    }

    for (final r in rooms) {
      if (r['title'] != null) {
        r['title'] = AppLocaleService().tr(r['title'].toString());
      }
      if (r['category'] != null) {
        r['category'] = AppLocaleService().tr(r['category'].toString());
      }
    }
    return rooms;
  }

  Future<List<Map<String, dynamic>>> _translateResellers(List<Map<String, dynamic>> resellers) async {
    final lang = AppLocaleService().currentLanguage.code;
    if (lang == 'en' || resellers.isEmpty) return resellers;

    final toTranslate = <String>{};
    for (final m in resellers) {
      final region = m['region']?.toString() ?? m['country']?.toString();
      final badge = m['badgeTitle']?.toString();
      final desc = m['description']?.toString();
      if (region != null && region.trim().isNotEmpty) toTranslate.add(region.trim());
      if (badge != null && badge.trim().isNotEmpty) toTranslate.add(badge.trim());
      if (desc != null && desc.trim().isNotEmpty) toTranslate.add(desc.trim());
    }

    if (toTranslate.isNotEmpty) {
      await TranslationService().translateBatch(toTranslate.toList(), targetLang: lang);
    }

    for (final m in resellers) {
      if (m['region'] != null) m['region'] = AppLocaleService().tr(m['region'].toString());
      if (m['country'] != null) m['country'] = AppLocaleService().tr(m['country'].toString());
      if (m['badgeTitle'] != null) m['badgeTitle'] = AppLocaleService().tr(m['badgeTitle'].toString());
      if (m['description'] != null) m['description'] = AppLocaleService().tr(m['description'].toString());
    }
    return resellers;
  }

  Future<Map<String, dynamic>> _translateSupportContact(Map<String, dynamic> contact) async {
    final lang = AppLocaleService().currentLanguage.code;
    if (lang == 'en') return contact;

    final toTranslate = <String>{};
    if (contact['operatingHours'] != null) toTranslate.add(contact['operatingHours'].toString());
    if (contact['announcement'] != null) toTranslate.add(contact['announcement'].toString());

    if (toTranslate.isNotEmpty) {
      await TranslationService().translateBatch(toTranslate.toList(), targetLang: lang);
    }

    if (contact['operatingHours'] != null) {
      contact['operatingHours'] = AppLocaleService().tr(contact['operatingHours'].toString());
    }
    if (contact['announcement'] != null) {
      contact['announcement'] = AppLocaleService().tr(contact['announcement'].toString());
    }
    return contact;
  }

  Future<List<Map<String, dynamic>>> _translateGifts(List<Map<String, dynamic>> gifts) async {
    final lang = AppLocaleService().currentLanguage.code;
    if (lang == 'en' || gifts.isEmpty) return gifts;

    final toTranslate = <String>{};
    for (final g in gifts) {
      final name = g['name']?.toString();
      final desc = g['description']?.toString();
      if (name != null && name.trim().isNotEmpty) toTranslate.add(name.trim());
      if (desc != null && desc.trim().isNotEmpty) toTranslate.add(desc.trim());
    }

    if (toTranslate.isNotEmpty) {
      await TranslationService().translateBatch(toTranslate.toList(), targetLang: lang);
    }

    for (final g in gifts) {
      if (g['name'] != null) g['name'] = AppLocaleService().tr(g['name'].toString());
      if (g['description'] != null) g['description'] = AppLocaleService().tr(g['description'].toString());
    }
    return gifts;
  }

  Future<Map<String, dynamic>> _translatePackages(Map<String, dynamic> packagesData) async {
    final lang = AppLocaleService().currentLanguage.code;
    if (lang == 'en') return packagesData;

    final pkgs = packagesData['packages'];
    if (pkgs is List) {
      final toTranslate = <String>{};
      for (final p in pkgs) {
        if (p is Map) {
          final b = p['badge']?.toString();
          final t = p['title']?.toString();
          if (b != null && b.trim().isNotEmpty) toTranslate.add(b.trim());
          if (t != null && t.trim().isNotEmpty) toTranslate.add(t.trim());
        }
      }

      if (toTranslate.isNotEmpty) {
        await TranslationService().translateBatch(toTranslate.toList(), targetLang: lang);
      }

      for (final p in pkgs) {
        if (p is Map) {
          if (p['badge'] != null) p['badge'] = AppLocaleService().tr(p['badge'].toString());
          if (p['title'] != null) p['title'] = AppLocaleService().tr(p['title'].toString());
        }
      }
    }
    return packagesData;
  }

  Future<List<Map<String, dynamic>>> _translateLevels(List<Map<String, dynamic>> levels) async {
    final lang = AppLocaleService().currentLanguage.code;
    if (lang == 'en' || levels.isEmpty) return levels;

    final toTranslate = <String>{};
    for (final lvl in levels) {
      final t = lvl['title']?.toString() ?? lvl['name']?.toString();
      if (t != null && t.trim().isNotEmpty) toTranslate.add(t.trim());
      final perks = lvl['perks'];
      if (perks is List) {
        for (final p in perks) {
          if (p != null && p.toString().trim().isNotEmpty) {
            toTranslate.add(p.toString().trim());
          }
        }
      }
    }

    if (toTranslate.isNotEmpty) {
      await TranslationService().translateBatch(toTranslate.toList(), targetLang: lang);
    }

    for (final lvl in levels) {
      if (lvl['title'] != null) lvl['title'] = AppLocaleService().tr(lvl['title'].toString());
      if (lvl['name'] != null) lvl['name'] = AppLocaleService().tr(lvl['name'].toString());
      final perks = lvl['perks'];
      if (perks is List) {
        lvl['perks'] = perks.map((p) => AppLocaleService().tr(p.toString())).toList();
      }
    }
    return levels;
  }

  Future<Map<String, dynamic>> _translateSocialPosts(Map<String, dynamic> data) async {
    final lang = AppLocaleService().currentLanguage.code;
    if (lang == 'en') return data;

    final posts = data['posts'];
    if (posts is List) {
      final toTranslate = <String>{};
      for (final post in posts) {
        if (post is Map) {
          final c = post['caption']?.toString();
          if (c != null && c.trim().isNotEmpty) toTranslate.add(c.trim());
        }
      }

      if (toTranslate.isNotEmpty) {
        await TranslationService().translateBatch(toTranslate.toList(), targetLang: lang);
      }

      for (final post in posts) {
        if (post is Map && post['caption'] != null) {
          post['caption'] = AppLocaleService().tr(post['caption'].toString());
        }
      }
    }
    return data;
  }

  Future<List<Map<String, dynamic>>> _translateCommentsList(List<Map<String, dynamic>> comments) async {
    final lang = AppLocaleService().currentLanguage.code;
    if (lang == 'en' || comments.isEmpty) return comments;

    final toTranslate = <String>{};
    for (final c in comments) {
      final content = c['content']?.toString() ?? c['text']?.toString();
      if (content != null && content.trim().isNotEmpty) toTranslate.add(content.trim());
    }

    if (toTranslate.isNotEmpty) {
      await TranslationService().translateBatch(toTranslate.toList(), targetLang: lang);
    }

    for (final c in comments) {
      if (c['content'] != null) c['content'] = AppLocaleService().tr(c['content'].toString());
      if (c['text'] != null) c['text'] = AppLocaleService().tr(c['text'].toString());
    }
    return comments;
  }

  Future<Map<String, dynamic>> _translateUserProfile(Map<String, dynamic> user) async {
    final lang = AppLocaleService().currentLanguage.code;
    if (lang == 'en') return user;

    final bio = user['bio']?.toString();
    if (bio != null && bio.trim().isNotEmpty) {
      await TranslationService().translateBatch([bio.trim()], targetLang: lang);
      user['bio'] = AppLocaleService().tr(bio);
    }
    return user;
  }

  // ==================== DIRECT MESSAGING & SOCIAL CHATS ====================
  Future<List<Map<String, dynamic>>> getConversations(String userId) async {
    try {
      final response = await _dio.get('/api/social/chats/conversations', queryParameters: {'userId': userId});
      if (response.statusCode == 200 && response.data is List) {
        return List<Map<String, dynamic>>.from(response.data);
      }
    } catch (e) {
      debugPrint('Error fetching conversations: $e');
    }
    return [];
  }

  Future<List<Map<String, dynamic>>> getDirectMessages(String currentUserId, String targetUserId) async {
    try {
      final response = await _dio.get('/api/social/chats/$targetUserId', queryParameters: {'currentUserId': currentUserId});
      if (response.statusCode == 200 && response.data is List) {
        return List<Map<String, dynamic>>.from(response.data);
      }
    } catch (e) {
      debugPrint('Error fetching direct messages: $e');
    }
    return [];
  }

  Future<Map<String, dynamic>?> sendDirectMessage({
    required String senderId,
    required String receiverId,
    required String content,
    String? imageUrl,
  }) async {
    try {
      final response = await _dio.post('/api/social/chats/send', data: {
        'senderId': senderId,
        'receiverId': receiverId,
        'content': content,
        if (imageUrl != null && imageUrl.isNotEmpty) 'imageUrl': imageUrl,
      });
      if (response.statusCode == 200 || response.statusCode == 201) {
        return Map<String, dynamic>.from(response.data);
      }
    } catch (e) {
      debugPrint('Error sending direct message: $e');
      rethrow;
    }
    return null;
  }

  Future<List<Map<String, dynamic>>> getCommunityMembers({String? query}) async {
    try {
      final response = await _dio.get('/api/social/community/members', queryParameters: {
        if (query != null && query.isNotEmpty) 'query': query,
      });
      if (response.statusCode == 200 && response.data is List) {
        return List<Map<String, dynamic>>.from(response.data);
      }
    } catch (e) {
      debugPrint('Error fetching community members: $e');
    }
    return [];
  }

  // ==================== VIP CUSTOM ID ====================
  Future<bool> setCustomId(String userId, String customId) async {
    return claimCustomId(userId, customId);
  }

  // ==================== GROUP ROOM GAMES ====================
  Future<List<Map<String, dynamic>>> getGamesCatalog({String? userId}) async {
    try {
      final response = await _dio.get('/api/games/catalog', queryParameters: {
        if (userId != null && userId.isNotEmpty) 'userId': userId,
      });
      if (response.statusCode == 200 && response.data is List) {
        return List<Map<String, dynamic>>.from(response.data);
      }
    } catch (e) {
      debugPrint('Error fetching games catalog: $e');
    }
    return [];
  }

  Future<Map<String, dynamic>?> playGame({
    required String userId,
    required String gameId,
    required int betAmount,
    String? betChoice,
    String? roomId,
    bool? isAnonymous,
  }) async {
    try {
      final response = await _dio.post('/api/games/play', data: {
        'userId': userId,
        'gameId': gameId,
        'betAmount': betAmount,
        if (betChoice != null) 'betChoice': betChoice,
        if (roomId != null) 'roomId': roomId,
        if (isAnonymous != null) 'isAnonymous': isAnonymous,
      });
      if (response.statusCode == 200 || response.statusCode == 201) {
        return Map<String, dynamic>.from(response.data);
      }
    } catch (e) {
      debugPrint('Error playing game: $e');
      rethrow;
    }
    return null;
  }

  Future<List<Map<String, dynamic>>> getGameHistory(String userId) async {
    try {
      final response = await _dio.get('/api/games/history/$userId');
      if (response.statusCode == 200 && response.data is List) {
        return List<Map<String, dynamic>>.from(response.data);
      }
    } catch (e) {
      debugPrint('Error fetching game history: $e');
    }
    return [];
  }

  // ---------------- Notifications ----------------

  /// Fetch the current user's in-app notifications.
  Future<Map<String, dynamic>> getNotifications({int page = 1, int limit = 30, bool unreadOnly = false}) async {
    try {
      final response = await _dio.get('/api/notifications', queryParameters: {
        'page': page,
        'limit': limit,
        if (unreadOnly) 'unreadOnly': 'true',
      });
      if (response.statusCode == 200 && response.data is Map) {
        return Map<String, dynamic>.from(response.data);
      }
    } catch (e) {
      debugPrint('Error fetching notifications: $e');
    }
    return {'notifications': <Map<String, dynamic>>[], 'unreadCount': 0};
  }

  Future<int> getNotificationUnreadCount() async {
    try {
      final response = await _dio.get('/api/notifications/unread-count');
      if (response.statusCode == 200 && response.data is Map) {
        return (response.data['unreadCount'] ?? 0) as int;
      }
    } catch (e) {
      debugPrint('Error fetching unread count: $e');
    }
    return 0;
  }

  Future<bool> markNotificationRead(String id) async {
    try {
      final response = await _dio.post('/api/notifications/$id/read');
      return response.statusCode == 200 || response.statusCode == 201;
    } catch (e) {
      debugPrint('Error marking notification read: $e');
      return false;
    }
  }

  Future<bool> markAllNotificationsRead() async {
    try {
      final response = await _dio.post('/api/notifications/read-all');
      return response.statusCode == 200 || response.statusCode == 201;
    } catch (e) {
      debugPrint('Error marking all read: $e');
      return false;
    }
  }

  // ---------------- Blocking ----------------

  Future<bool> blockUser(String userId) async {
    try {
      final response = await _dio.post('/api/blocks', data: {'userId': userId});
      return response.statusCode == 200 || response.statusCode == 201;
    } catch (e) {
      debugPrint('Error blocking user: $e');
      return false;
    }
  }

  Future<bool> unblockUser(String userId) async {
    try {
      final response = await _dio.delete('/api/blocks/$userId');
      return response.statusCode == 200;
    } catch (e) {
      debugPrint('Error unblocking user: $e');
      return false;
    }
  }

  Future<List<Map<String, dynamic>>> getBlockedUsers() async {
    try {
      final response = await _dio.get('/api/blocks');
      List<dynamic>? list;
      if (response.statusCode == 200 && response.data is Map) {
        list = response.data['blocked'] ?? response.data['blocks'];
      } else if (response.statusCode == 200 && response.data is List) {
        list = response.data;
      }
      if (list is List) {
        // Backend returns { ...block, user: {...} }; flatten to the user object.
        return list.map<Map<String, dynamic>>((entry) {
          final row = Map<String, dynamic>.from(entry as Map);
          final user = row['user'];
          if (user is Map) {
            return {
              ...Map<String, dynamic>.from(user),
              'blockedAt': row['createdAt'],
            };
          }
          return row;
        }).toList();
      }
    } catch (e) {
      debugPrint('Error fetching blocked users: $e');
    }
    return [];
  }

  // ---------------- Room Moderators ----------------

  Future<List<Map<String, dynamic>>> getRoomModerators(String roomId) async {
    try {
      final response = await _dio.get('/api/rooms/$roomId/moderators');
      if (response.statusCode == 200 && response.data is Map && response.data['moderators'] is List) {
        return List<Map<String, dynamic>>.from(response.data['moderators']);
      }
    } catch (e) {
      debugPrint('Error fetching room moderators: $e');
    }
    return [];
  }

  Future<bool> addRoomModerator(String roomId, String userId) async {
    try {
      final response = await _dio.post('/api/rooms/$roomId/moderators', data: {'userId': userId});
      return response.statusCode == 200 || response.statusCode == 201;
    } catch (e) {
      debugPrint('Error adding moderator: $e');
      return false;
    }
  }

  Future<bool> removeRoomModerator(String roomId, String userId) async {
    try {
      final response = await _dio.delete('/api/rooms/$roomId/moderators/$userId');
      return response.statusCode == 200;
    } catch (e) {
      debugPrint('Error removing moderator: $e');
      return false;
    }
  }
}


