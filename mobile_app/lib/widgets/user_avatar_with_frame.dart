import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/level_service.dart';

/// Animated VIP Avatar with Luxury Frame, Glowing Pulsing Aura & VIP Badges
class UserAvatarWithFrame extends StatefulWidget {
  final String? avatarUrl;
  final int level;
  final int? vipLevel;
  final double size;
  final bool showBadge;
  final VoidCallback? onTap;
  final String? customFrameUrl;
  final bool isVerified;
  final String? verifiedLabel;

  const UserAvatarWithFrame({
    super.key,
    required this.avatarUrl,
    this.level = 1,
    this.vipLevel,
    this.size = 50.0,
    this.showBadge = false,
    this.onTap,
    this.customFrameUrl,
    this.isVerified = false,
    this.verifiedLabel,
  });

  @override
  State<UserAvatarWithFrame> createState() => _UserAvatarWithFrameState();
}

class _UserAvatarWithFrameState extends State<UserAvatarWithFrame> with SingleTickerProviderStateMixin {
  late AnimationController _animController;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    );
    if ((widget.vipLevel ?? 0) >= 1) {
      _animController.repeat();
    }
  }

  @override
  void didUpdateWidget(covariant UserAvatarWithFrame oldWidget) {
    super.didUpdateWidget(oldWidget);
    final isVip = (widget.vipLevel ?? 0) >= 1;
    final wasVip = (oldWidget.vipLevel ?? 0) >= 1;
    if (isVip && !wasVip) {
      _animController.repeat();
    } else if (!isVip && wasVip) {
      _animController.stop();
    }
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isVip = (widget.vipLevel ?? 0) >= 1;
    final vLevel = widget.vipLevel ?? 0;

    Widget avatarCore = ClipOval(
      child: _buildAvatarImage(widget.size / 2),
    );

    Widget content;
    if (isVip) {
      // VIP Animated Glow Aura & Frame
      content = AnimatedBuilder(
        animation: _animController,
        builder: (context, child) {
          return SizedBox(
            width: widget.size + 8,
            height: widget.size + 8,
            child: Stack(
              clipBehavior: Clip.none,
              alignment: Alignment.center,
              children: [
                // Rotating Multi-color Aura Glow
                Transform.rotate(
                  angle: _animController.value * 2 * 3.14159,
                  child: Container(
                    width: widget.size + 6,
                    height: widget.size + 6,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: SweepGradient(
                        colors: vLevel >= 5
                            ? const [Color(0xFFFFD700), Color(0xFFFF2B85), Color(0xFF8B25FF), Color(0xFFFFD700)]
                            : const [Color(0xFF3B82F6), Color(0xFF60A5FA), Color(0xFF93C5FD), Color(0xFF3B82F6)],
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: (vLevel >= 5 ? Colors.amber : const Color(0xFF3B82F6)).withValues(alpha: 0.4),
                          blurRadius: 8,
                          spreadRadius: 1,
                        ),
                      ],
                    ),
                  ),
                ),

                // Inner Avatar container with dark separator
                Container(
                  width: widget.size,
                  height: widget.size,
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    color: Color(0xFF0F172A),
                  ),
                  padding: const EdgeInsets.all(2),
                  child: avatarCore,
                ),

                // VIP Frame border overlay with specular glints
                IgnorePointer(
                  child: Container(
                    width: widget.size + 4,
                    height: widget.size + 4,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: vLevel >= 5 ? const Color(0xFFFFD700) : const Color(0xFF93C5FD),
                        width: 1.8,
                      ),
                    ),
                  ),
                ),

                // VIP Badge at bottom right
                if (widget.showBadge || widget.size >= 40)
                  Positioned(
                    bottom: -2,
                    right: -2,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1.5),
                      decoration: BoxDecoration(
                        gradient: vLevel >= 5
                            ? const LinearGradient(colors: [Color(0xFFFFB800), Color(0xFFFF5722)])
                            : const LinearGradient(colors: [Color(0xFF2563EB), Color(0xFF1D4ED8)]),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.white, width: 1),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.5),
                            blurRadius: 3,
                            offset: const Offset(0, 1),
                          ),
                        ],
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.star, color: Colors.yellow, size: 9),
                          const SizedBox(width: 1.5),
                          Text(
                            'VIP $vLevel',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 8,
                              fontWeight: FontWeight.w900,
                              letterSpacing: -0.2,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          );
        },
      );
    } else {
      // Standard non-VIP avatar
      content = Container(
        width: widget.size,
        height: widget.size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: const Color(0xFF1E293B),
          border: Border.all(
            color: Colors.white.withValues(alpha: 0.18),
            width: 1.5,
          ),
        ),
        child: avatarCore,
      );
    }

    if (widget.isVerified) {
      content = SizedBox(
        width: widget.size + 8,
        height: widget.size + 8,
        child: Stack(
          clipBehavior: Clip.none,
          alignment: Alignment.center,
          children: [
            content,
            Positioned(
              top: -2,
              left: -2,
              child: Container(
                padding: const EdgeInsets.all(2),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0xFF0EA5E9),
                  border: Border.all(color: Colors.white, width: 1.5),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.4),
                      blurRadius: 3,
                      offset: const Offset(0, 1),
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.verified,
                  color: Colors.white,
                  size: 12,
                ),
              ),
            ),
          ],
        ),
      );
    }

    if (widget.onTap != null) {
      content = GestureDetector(
        onTap: widget.onTap,
        child: content,
      );
    }

    // Admin-configured level frame (or an explicit custom frame) rendered as an
    // overlay on top of the avatar/badges.
    final frameUrl = (widget.customFrameUrl != null && widget.customFrameUrl!.trim().isNotEmpty)
        ? widget.customFrameUrl
        : LevelService().getFrameUrl(widget.level);
    if (frameUrl != null && frameUrl.trim().isNotEmpty) {
      content = SizedBox(
        width: widget.size + 10,
        height: widget.size + 10,
        child: Stack(
          clipBehavior: Clip.none,
          alignment: Alignment.center,
          children: [
            content,
            Positioned.fill(
              child: IgnorePointer(
                child: Image.network(
                  ApiService.getFullImageUrl(frameUrl),
                  fit: BoxFit.contain,
                  errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                ),
              ),
            ),
          ],
        ),
      );
    }

    return content;
  }

  Widget _buildAvatarImage(double radius) {
    final fullUrl = ApiService.getFullImageUrl(widget.avatarUrl);
    return Image.network(
      fullUrl,
      fit: BoxFit.cover,
      width: radius * 2,
      height: radius * 2,
      errorBuilder: (context, error, stackTrace) {
        return Container(
          color: const Color(0xFF1F2937),
          child: Icon(
            Icons.person,
            color: Colors.white70,
            size: radius * 1.1,
          ),
        );
      },
      loadingBuilder: (context, child, loadingProgress) {
        if (loadingProgress == null) return child;
        return Container(
          color: const Color(0xFF1F2937),
          child: const Center(
            child: SizedBox(
              width: 14,
              height: 14,
              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white38),
            ),
          ),
        );
      },
    );
  }
}
