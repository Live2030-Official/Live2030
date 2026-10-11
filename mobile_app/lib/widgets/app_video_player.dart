import '../localization/app_locale_service.dart';
import 'dart:async';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

/// In-App Custom Video Player for Feed and Profile Posts
/// Features:
/// - Plays 100% inside the app (no external browser or Chrome)
/// - Play / Pause button with tap-to-show overlay
/// - Interactive Seek Bar with scrub support & time indicator (00:04 / 00:10)
/// - Mute / Unmute audio toggle
/// - High-resolution poster thumbnail while loading
class AppVideoPlayer extends StatefulWidget {
  final String videoUrl;
  final String? thumbnailUrl;
  final double? aspectRatio;
  final bool autoPlay;
  final bool looping;

  const AppVideoPlayer({
    super.key,
    required this.videoUrl,
    this.thumbnailUrl,
    this.aspectRatio,
    this.autoPlay = false,
    this.looping = true,
  });

  @override
  State<AppVideoPlayer> createState() => _AppVideoPlayerState();
}

class _AppVideoPlayerState extends State<AppVideoPlayer> {
  VideoPlayerController? _controller;
  bool _isInitialized = false;
  bool _isPlaying = false;
  bool _isMuted = false;
  bool _hasError = false;
  String? _errorMessage;
  bool _showControls = true;
  Timer? _hideControlsTimer;
  bool _isDraggingSeek = false;
  double _dragValue = 0.0;

  @override
  void initState() {
    super.initState();
    _initializeVideo();
  }

  @override
  void didUpdateWidget(covariant AppVideoPlayer oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.videoUrl != widget.videoUrl) {
      _controller?.dispose();
      _controller = null;
      _isInitialized = false;
      _hasError = false;
      _initializeVideo();
    }
  }

  Future<void> _initializeVideo() async {
    if (widget.videoUrl.isEmpty) {
      setState(() {
        _hasError = true;
        _errorMessage = 'Invalid video URL';
      });
      return;
    }

    try {
      final uri = Uri.parse(widget.videoUrl);
      _controller = VideoPlayerController.networkUrl(uri);
      await _controller!.initialize();
      _controller!.setLooping(widget.looping);
      _controller!.addListener(_onControllerUpdate);

      if (mounted) {
        setState(() {
          _isInitialized = true;
          _hasError = false;
        });

        if (widget.autoPlay) {
          _controller!.play();
          _isPlaying = true;
          _startHideControlsTimer();
        }
      }
    } catch (e) {
      debugPrint('AppVideoPlayer init error: $e');
      if (mounted) {
        setState(() {
          _hasError = true;
          _errorMessage = e.toString().contains('MissingPluginException')
              ? 'Please restart flutter run once in terminal to enable video playback'
              : 'Unable to load video stream';
        });
      }
    }
  }

  void _onControllerUpdate() {
    if (!mounted || _controller == null) return;
    final isPlaying = _controller!.value.isPlaying;
    if (isPlaying != _isPlaying) {
      setState(() {
        _isPlaying = isPlaying;
      });
    } else {
      // Rebuild to update seekbar progress
      setState(() {});
    }
  }

  @override
  void dispose() {
    _hideControlsTimer?.cancel();
    _controller?.removeListener(_onControllerUpdate);
    _controller?.dispose();
    super.dispose();
  }

  void _togglePlayPause() {
    if (_controller == null || !_isInitialized) return;
    if (_controller!.value.isPlaying) {
      _controller!.pause();
      _cancelHideControlsTimer();
      setState(() {
        _isPlaying = false;
        _showControls = true;
      });
    } else {
      _controller!.play();
      setState(() {
        _isPlaying = true;
      });
      _startHideControlsTimer();
    }
  }

  void _toggleMute() {
    if (_controller == null || !_isInitialized) return;
    setState(() {
      _isMuted = !_isMuted;
    });
    _controller!.setVolume(_isMuted ? 0.0 : 1.0);
  }

  void _onTapVideo() {
    setState(() {
      _showControls = !_showControls;
    });
    if (_showControls && _isPlaying) {
      _startHideControlsTimer();
    } else {
      _cancelHideControlsTimer();
    }
  }

  void _startHideControlsTimer() {
    _cancelHideControlsTimer();
    _hideControlsTimer = Timer(const Duration(seconds: 3), () {
      if (mounted && _isPlaying && !_isDraggingSeek) {
        setState(() {
          _showControls = false;
        });
      }
    });
  }

  void _cancelHideControlsTimer() {
    _hideControlsTimer?.cancel();
    _hideControlsTimer = null;
  }

  String _formatDuration(Duration duration) {
    String twoDigits(int n) => n.toString().padLeft(2, '0');
    final minutes = twoDigits(duration.inMinutes.remainder(60));
    final seconds = twoDigits(duration.inSeconds.remainder(60));
    return '$minutes:$seconds';
  }

  @override
  Widget build(BuildContext context) {
    // 1. Error state
    if (_hasError) {
      return Container(
        color: Colors.black,
        width: double.infinity,
        child: Stack(
          alignment: Alignment.center,
          children: [
            if (widget.thumbnailUrl != null && widget.thumbnailUrl!.isNotEmpty)
              CachedNetworkImage(
                imageUrl: widget.thumbnailUrl!,
                fit: BoxFit.cover,
                width: double.infinity,
                height: double.infinity,
                errorWidget: (_, __, ___) => const SizedBox.shrink(),
              ),
            Container(
              color: Colors.black.withValues(alpha: 0.75),
              padding: const EdgeInsets.all(20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEC4899).withValues(alpha: 0.2),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.video_library_rounded, color: Color(0xFFEC4899), size: 36),
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Video Uploaded Successfully 🎬',
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 6),
                  Text(
                    _errorMessage ?? 'Restart app terminal to initialize native video engine.',
                    style: const TextStyle(color: Colors.white70, fontSize: 12),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 14),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFEC4899),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
                    ),
                    icon: const Icon(Icons.refresh, color: Colors.white, size: 18),
                    label: Text('Retry In-App Play'.tr, style: TextStyle(color: Colors.white, fontSize: 13)),
                    onPressed: () {
                      setState(() {
                        _hasError = false;
                      });
                      _initializeVideo();
                    },
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    // 2. Loading state (shows thumbnail poster with spinner)
    if (!_isInitialized || _controller == null) {
      return Container(
        color: Colors.black,
        width: double.infinity,
        child: Stack(
          fit: StackFit.expand,
          alignment: Alignment.center,
          children: [
            if (widget.thumbnailUrl != null && widget.thumbnailUrl!.isNotEmpty)
              CachedNetworkImage(
                imageUrl: widget.thumbnailUrl!,
                fit: BoxFit.cover,
                placeholder: (_, __) => Container(color: const Color(0xFF111827)),
                errorWidget: (_, __, ___) => Container(color: const Color(0xFF111827)),
              )
            else
              Container(color: const Color(0xFF111827)),
            const Center(
              child: CircularProgressIndicator(
                color: Color(0xFFEC4899),
                strokeWidth: 3,
              ),
            ),
          ],
        ),
      );
    }

    // 3. Initialized Player with Custom In-App Controls
    final position = _isDraggingSeek
        ? Duration(milliseconds: _dragValue.toInt())
        : _controller!.value.position;
    final duration = _controller!.value.duration;
    final maxDurationMs = duration.inMilliseconds > 0 ? duration.inMilliseconds.toDouble() : 1.0;
    final currentMs = position.inMilliseconds.toDouble().clamp(0.0, maxDurationMs);

    final videoAspectRatio = widget.aspectRatio ??
        (_controller!.value.aspectRatio > 0 ? _controller!.value.aspectRatio : 9 / 16);

    return GestureDetector(
      onTap: _onTapVideo,
      child: Container(
        color: Colors.black,
        width: double.infinity,
        child: Stack(
          alignment: Alignment.center,
          children: [
            // Video Frame
            Center(
              child: AspectRatio(
                aspectRatio: videoAspectRatio,
                child: VideoPlayer(_controller!),
              ),
            ),

            // Controls Overlay
            AnimatedOpacity(
              opacity: _showControls ? 1.0 : 0.0,
              duration: const Duration(milliseconds: 200),
              child: IgnorePointer(
                ignoring: !_showControls,
                child: Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        Colors.black.withValues(alpha: 0.5),
                        Colors.transparent,
                        Colors.black.withValues(alpha: 0.8),
                      ],
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                    ),
                  ),
                  child: Stack(
                    children: [
                      // Top Right: Mute / Unmute Button
                      Positioned(
                        top: 12,
                        right: 12,
                        child: GestureDetector(
                          onTap: _toggleMute,
                          child: Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: Colors.black.withValues(alpha: 0.65),
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.white24),
                            ),
                            child: Icon(
                              _isMuted ? Icons.volume_off_rounded : Icons.volume_up_rounded,
                              color: _isMuted ? const Color(0xFFEF4444) : Colors.white,
                              size: 22,
                            ),
                          ),
                        ),
                      ),

                      // Center: Large Play / Pause Button
                      Center(
                        child: GestureDetector(
                          onTap: _togglePlayPause,
                          child: Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEC4899).withValues(alpha: 0.85),
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: const Color(0xFFEC4899).withValues(alpha: 0.4),
                                  blurRadius: 20,
                                  spreadRadius: 2,
                                ),
                              ],
                            ),
                            child: Icon(
                              _isPlaying ? Icons.pause_rounded : Icons.play_arrow_rounded,
                              color: Colors.white,
                              size: 44,
                            ),
                          ),
                        ),
                      ),

                      // Bottom: Seek Bar & Timestamp & Mini Controls
                      Positioned(
                        left: 12,
                        right: 12,
                        bottom: 8,
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            // Time row (00:03 / 00:10)
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  _formatDuration(position),
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                Text(
                                  _formatDuration(duration),
                                  style: const TextStyle(
                                    color: Colors.white70,
                                    fontSize: 11,
                                  ),
                                ),
                              ],
                            ),

                            // Seek Bar Slider
                            SliderTheme(
                              data: SliderTheme.of(context).copyWith(
                                trackHeight: 3.5,
                                activeTrackColor: const Color(0xFFEC4899),
                                inactiveTrackColor: Colors.white24,
                                thumbColor: const Color(0xFFEC4899),
                                thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 6),
                                overlayColor: const Color(0xFFEC4899).withValues(alpha: 0.2),
                                overlayShape: const RoundSliderOverlayShape(overlayRadius: 12),
                              ),
                              child: Slider(
                                min: 0.0,
                                max: maxDurationMs,
                                value: currentMs,
                                onChangeStart: (val) {
                                  _cancelHideControlsTimer();
                                  setState(() {
                                    _isDraggingSeek = true;
                                    _dragValue = val;
                                  });
                                },
                                onChanged: (val) {
                                  setState(() {
                                    _dragValue = val;
                                  });
                                },
                                onChangeEnd: (val) async {
                                  await _controller!.seekTo(Duration(milliseconds: val.toInt()));
                                  setState(() {
                                    _isDraggingSeek = false;
                                  });
                                  if (_isPlaying) {
                                    _startHideControlsTimer();
                                  }
                                },
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
