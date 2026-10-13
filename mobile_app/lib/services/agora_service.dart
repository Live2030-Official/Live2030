import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:agora_rtc_engine/agora_rtc_engine.dart';
import 'package:permission_handler/permission_handler.dart';

class AgoraLiveService {
  static const String agoraAppId = '95efa72862664489bcdf5c10451bef33';

  RtcEngine? _engine;
  bool _isInitialized = false;
  bool _disposed = false;
  Future<void>? _leaveFuture;
  int? _remoteUid;
  final Set<int> _remoteUids = {};
  bool _isMuted = false;
  bool _isVideoMuted = false;
  bool _beautyEnabled = false;
  double _beautySmoothness = 0.5;
  double _beautyWhitening = 0.3;
  double _beautyRedness = 0.0;

  // Stream controllers for UI updates
  final StreamController<int?> _remoteUserJoinedController = StreamController<int?>.broadcast();
  final StreamController<int> _remoteUserOfflineController = StreamController<int>.broadcast();
  final StreamController<bool> _channelJoinedController = StreamController<bool>.broadcast();
  final StreamController<ConnectionStateType> _connectionStateController = StreamController<ConnectionStateType>.broadcast();

  Stream<int?> get onRemoteUserJoined => _remoteUserJoinedController.stream;
  Stream<int> get onRemoteUserOffline => _remoteUserOfflineController.stream;
  Stream<bool> get onChannelJoined => _channelJoinedController.stream;
  Stream<ConnectionStateType> get onConnectionStateChanged => _connectionStateController.stream;
  RtcEngine? get engine => _engine;
  int? get remoteUid => _remoteUid;
  Set<int> get remoteUids => _remoteUids;
  bool get isMuted => _isMuted;
  bool get isVideoMuted => _isVideoMuted;
  bool get isBeautyEnabled => _beautyEnabled;
  double get beautySmoothness => _beautySmoothness;
  double get beautyWhitening => _beautyWhitening;
  double get beautyRedness => _beautyRedness;

  Future<void> initialize() async {
    if (_disposed) return;
    if (_isInitialized && _engine != null) return;

    // Request permissions on Android / iOS only (avoid crashes on Windows / Desktop / Web)
    if (!kIsWeb && (defaultTargetPlatform == TargetPlatform.android || defaultTargetPlatform == TargetPlatform.iOS)) {
      await [Permission.camera, Permission.microphone].request();
    }

    _engine = createAgoraRtcEngine();
    await _engine!.initialize(const RtcEngineContext(
      appId: agoraAppId,
      channelProfile: ChannelProfileType.channelProfileLiveBroadcasting,
    ));

    void handleRemoteActive(int remoteUid) {
      debugPrint('🎥 Remote Active Broadcaster Detected: $remoteUid');
      _remoteUid = remoteUid;
      _remoteUids.add(remoteUid);
      if (!_remoteUserJoinedController.isClosed) {
        _remoteUserJoinedController.add(remoteUid);
      }
    }

    _engine!.registerEventHandler(
      RtcEngineEventHandler(
        onJoinChannelSuccess: (RtcConnection connection, int elapsed) {
          debugPrint('✅ Joined Agora Channel: ${connection.channelId}');
          if (!_channelJoinedController.isClosed) {
            _channelJoinedController.add(true);
          }
        },
        onUserJoined: (RtcConnection connection, int remoteUid, int elapsed) {
          debugPrint('👤 Remote User Joined Channel: $remoteUid');
          handleRemoteActive(remoteUid);
        },
        onFirstRemoteVideoDecoded: (RtcConnection connection, int remoteUid, int width, int height, int elapsed) {
          debugPrint('🎬 First Remote Video Decoded from UID: $remoteUid (${width}x$height)');
          handleRemoteActive(remoteUid);
        },
        onFirstRemoteVideoFrame: (RtcConnection connection, int remoteUid, int width, int height, int elapsed) {
          debugPrint('🖼️ First Remote Video Frame from UID: $remoteUid');
          handleRemoteActive(remoteUid);
        },
        onRemoteVideoStateChanged: (RtcConnection connection, int remoteUid, RemoteVideoState state, RemoteVideoStateReason reason, int elapsed) {
          debugPrint('📹 Remote Video State: uid=$remoteUid, state=$state, reason=$reason');
          if (state == RemoteVideoState.remoteVideoStateDecoding ||
              state == RemoteVideoState.remoteVideoStateStarting) {
            handleRemoteActive(remoteUid);
          }
        },
        onUserMuteVideo: (RtcConnection connection, int remoteUid, bool muted) {
          debugPrint('🎦 Remote User Mute Video: uid=$remoteUid, muted=$muted');
          if (!muted) {
            handleRemoteActive(remoteUid);
          }
        },
        onUserOffline: (RtcConnection connection, int remoteUid, UserOfflineReasonType reason) {
          debugPrint('👋 Remote User Left Channel: $remoteUid');
          _remoteUids.remove(remoteUid);
          if (_remoteUid == remoteUid) {
            _remoteUid = _remoteUids.isNotEmpty ? _remoteUids.first : null;
            if (!_remoteUserJoinedController.isClosed) {
              _remoteUserJoinedController.add(_remoteUid);
            }
          }
          if (!_remoteUserOfflineController.isClosed) {
            _remoteUserOfflineController.add(remoteUid);
          }
        },
        onError: (ErrorCodeType err, String msg) {
          debugPrint('❌ Agora Error: $err, Msg: $msg');
        },
        onConnectionStateChanged: (RtcConnection connection, ConnectionStateType state, ConnectionChangedReasonType reason) {
          debugPrint('🔌 Agora Connection State: $state ($reason)');
          if (!_connectionStateController.isClosed) {
            _connectionStateController.add(state);
          }
        },
      ),
    );

    await _engine!.enableVideo();
    await _engine!.enableAudio();
    _isInitialized = true;
  }

  Future<void> joinLiveRoom({
    required String channelName,
    required String token,
    required bool isHost,
    int uid = 0,
  }) async {
    await initialize();

    final role = isHost ? ClientRoleType.clientRoleBroadcaster : ClientRoleType.clientRoleAudience;

    await _engine!.setClientRole(role: role);

    if (isHost) {
      await _engine!.startPreview();
    }

    await _engine!.joinChannel(
      token: token,
      channelId: channelName,
      uid: uid,
      options: ChannelMediaOptions(
        channelProfile: ChannelProfileType.channelProfileLiveBroadcasting,
        clientRoleType: role,
        publishCameraTrack: isHost,
        publishMicrophoneTrack: isHost,
        autoSubscribeAudio: true,
        autoSubscribeVideo: true,
      ),
    );
  }

  Future<void> switchCamera() async {
    if (_engine != null) {
      await _engine!.switchCamera();
    }
  }

  Future<void> joinVoiceRoom({
    required String channelName,
    required String token,
    required bool isSpeaker,
    int uid = 0,
  }) async {
    await initialize();

    final role = isSpeaker ? ClientRoleType.clientRoleBroadcaster : ClientRoleType.clientRoleAudience;
    await _engine!.setClientRole(role: role);

    await _engine!.joinChannel(
      token: token,
      channelId: channelName,
      uid: uid,
      options: ChannelMediaOptions(
        channelProfile: ChannelProfileType.channelProfileLiveBroadcasting,
        clientRoleType: role,
        publishCameraTrack: false,
        publishMicrophoneTrack: isSpeaker,
        autoSubscribeAudio: true,
        autoSubscribeVideo: false,
      ),
    );
  }

  Future<void> updateSpeakerRole(bool isSpeaker) async {
    if (_engine != null) {
      final role = isSpeaker ? ClientRoleType.clientRoleBroadcaster : ClientRoleType.clientRoleAudience;
      await _engine!.setClientRole(role: role);
      await _engine!.updateChannelMediaOptions(
        ChannelMediaOptions(
          clientRoleType: role,
          publishMicrophoneTrack: isSpeaker,
          publishCameraTrack: false,
          autoSubscribeAudio: true,
        ),
      );
    }
  }

  /// Dynamically upgrade an audience member to a full live video broadcaster (for PK battles)
  Future<void> updateBroadcasterRole({required bool isBroadcaster}) async {
    if (_engine != null) {
      final role = isBroadcaster ? ClientRoleType.clientRoleBroadcaster : ClientRoleType.clientRoleAudience;
      await _engine!.setClientRole(role: role);
      if (isBroadcaster) {
        await _engine!.enableVideo();
        await _engine!.startPreview();
      } else {
        await _engine!.stopPreview();
      }
      await _engine!.updateChannelMediaOptions(
        ChannelMediaOptions(
          clientRoleType: role,
          publishCameraTrack: isBroadcaster,
          publishMicrophoneTrack: isBroadcaster,
          autoSubscribeAudio: true,
          autoSubscribeVideo: true,
        ),
      );
    }
  }

  Future<void> toggleAudioMute() async {
    if (_engine != null) {
      _isMuted = !_isMuted;
      await _engine!.muteLocalAudioStream(_isMuted);
    }
  }

  Future<void> toggleVideoMute() async {
    if (_engine != null) {
      _isVideoMuted = !_isVideoMuted;
      await _engine!.muteLocalVideoStream(_isVideoMuted);
    }
  }

  Future<void> setBeautyEffect({bool? enabled, double? smoothness, double? whitening, double? redness}) async {
    if (_engine != null) {
      if (enabled != null) _beautyEnabled = enabled;
      if (smoothness != null) _beautySmoothness = smoothness.clamp(0.0, 1.0);
      if (whitening != null) _beautyWhitening = whitening.clamp(0.0, 1.0);
      if (redness != null) _beautyRedness = redness.clamp(0.0, 1.0);

      try {
        await _engine!.setBeautyEffectOptions(
          enabled: _beautyEnabled,
          options: BeautyOptions(
            lighteningContrastLevel: LighteningContrastLevel.lighteningContrastNormal,
            lighteningLevel: _beautyWhitening,
            smoothnessLevel: _beautySmoothness,
            rednessLevel: _beautyRedness,
            sharpnessLevel: 0.0,
          ),
        );
      } catch (e) {
        debugPrint('Beauty effect error: $e');
      }
    }
  }

  Future<void> leave() async {
    if (_leaveFuture != null) return _leaveFuture!;
    final engine = _engine;
    if (engine == null) return;
    _leaveFuture = _doLeave(engine);
    try {
      await _leaveFuture;
    } finally {
      _leaveFuture = null;
    }
  }

  Future<void> _doLeave(RtcEngine engine) async {
    try {
      await engine.stopPreview();
    } catch (_) {}
    try {
      await engine.leaveChannel();
    } catch (_) {}
    _remoteUid = null;
    _remoteUids.clear();
    if (!_channelJoinedController.isClosed) _channelJoinedController.add(false);
    if (!_remoteUserJoinedController.isClosed) _remoteUserJoinedController.add(null);
  }

  void dispose() {
    if (_disposed) return;
    _disposed = true;
    final engine = _engine;
    _engine = null;
    _remoteUid = null;
    _remoteUids.clear();
    _isInitialized = false;
    _remoteUserJoinedController.close();
    _remoteUserOfflineController.close();
    _channelJoinedController.close();
    _connectionStateController.close();
    if (engine != null) {
      try {
        engine.leaveChannel();
      } catch (_) {}
      try {
        engine.release();
      } catch (_) {}
    }
  }
}
