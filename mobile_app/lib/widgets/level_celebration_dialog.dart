import '../localization/app_locale_service.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lottie/lottie.dart';
import '../theme/app_theme.dart';
import '../services/auth_service.dart';
import '../services/level_service.dart';
import 'level_badge.dart';
import 'user_avatar_with_frame.dart';

/// Modal Popup for Level Up & VIP Celebrations
/// Dynamically renders Lottie 60fps animations uploaded from Admin Dashboard
class LevelCelebrationDialog extends StatefulWidget {
  final int level;
  final String? title;
  final List<String>? perks;
  final String? lottieUrl;

  const LevelCelebrationDialog({
    super.key,
    required this.level,
    this.title,
    this.perks,
    this.lottieUrl,
  });

  static Future<void> show(
    BuildContext context, {
    required int level,
    String? title,
    List<String>? perks,
    String? lottieUrl,
  }) {
    return showDialog(
      context: context,
      barrierDismissible: true,
      barrierColor: Colors.black.withValues(alpha: 0.82),
      builder: (ctx) => LevelCelebrationDialog(
        level: level,
        title: title,
        perks: perks,
        lottieUrl: lottieUrl,
      ),
    );
  }

  @override
  State<LevelCelebrationDialog> createState() => _LevelCelebrationDialogState();
}

class _LevelCelebrationDialogState extends State<LevelCelebrationDialog>
    with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 700),
    );
    _scaleAnimation = CurvedAnimation(
      parent: _animController,
      curve: Curves.elasticOut,
    );
    _animController.forward();
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final user = AuthService().currentUser;
    final levelService = LevelService();
    final config = levelService.getConfig(widget.level);

    final resolvedTitle = widget.title ?? config?.title ?? LevelBadge.getLevelTitle(widget.level);
    final resolvedPerks = widget.perks ?? config?.perks ?? levelService.getPerks(widget.level);
    final resolvedLottieUrl = widget.lottieUrl ?? config?.resolvedLottieUrl;
    final gradientColors = LevelBadge.getLevelGradient(widget.level);

    return Center(
      child: ScaleTransition(
        scale: _scaleAnimation,
        child: Dialog(
          backgroundColor: Colors.transparent,
          insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          child: Stack(
            alignment: Alignment.center,
            children: [
              // Outer Card
              Container(
                width: double.infinity,
                constraints: BoxConstraints(
                  maxHeight: MediaQuery.of(context).size.height * 0.85,
                  maxWidth: 420,
                ),
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [LiveColors.backgroundSurface, LiveColors.backgroundPrimary],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  ),
                  borderRadius: BorderRadius.circular(28),
                  border: Border.all(
                    color: gradientColors[0].withValues(alpha: 0.65),
                    width: 2,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: gradientColors[0].withValues(alpha: 0.4),
                      blurRadius: 30,
                      spreadRadius: 4,
                    ),
                  ],
                ),
                child: SingleChildScrollView(
                  physics: const BouncingScrollPhysics(),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Top Sparkle & Header
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.auto_awesome, color: gradientColors[0], size: 20),
                          const SizedBox(width: 8),
                          Flexible(
                            child: Text(
                              'LEVEL UP ACHIEVED! 🎉'.tr,
                              textAlign: TextAlign.center,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 15,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 1.2,
                                color: Colors.white,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Icon(Icons.auto_awesome, color: gradientColors[0], size: 20),
                        ],
                      ),
                    const SizedBox(height: 18),

                    // Lottie Bodymovin Animation or Avatar with Frame
                    SizedBox(
                      height: 150,
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          // 1. Dynamic Lottie Animation if uploaded from Admin Dashboard
                          if (resolvedLottieUrl != null && resolvedLottieUrl.isNotEmpty)
                            Positioned.fill(
                              child: Lottie.network(
                                resolvedLottieUrl,
                                fit: BoxFit.contain,
                                errorBuilder: (ctx, err, stack) {
                                  return const SizedBox.shrink();
                                },
                              ),
                            ),

                          // 2. Avatar with dynamic outer frame
                          UserAvatarWithFrame(
                            avatarUrl: user?.avatarUrl,
                            level: widget.level,
                            size: 78,
                            showBadge: false,
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 12),

                    // Level Badge
                    LevelBadge(
                      level: widget.level,
                      fontSize: 14,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                    ),

                    const SizedBox(height: 8),

                    // Title
                    Text(
                      resolvedTitle.tr,
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 22,
                        fontWeight: FontWeight.w900,
                        color: Colors.white,
                      ),
                      textAlign: TextAlign.center,
                    ),

                    const SizedBox(height: 14),

                    // Unlocked Perks Box
                    if (resolvedPerks.isNotEmpty) ...[
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: LiveColors.backgroundInput,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: LiveColors.border),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(Icons.stars_rounded, color: LiveColors.gold, size: 16),
                                SizedBox(width: 6),
                                Text(
                                  'UNLOCKED PRIVILEGES'.tr,
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w800,
                                    color: LiveColors.textSecondary,
                                    letterSpacing: 1.0,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            ...resolvedPerks.map(
                              (perk) => Padding(
                                padding: const EdgeInsets.only(bottom: 5),
                                child: Row(
                                  children: [
                                    Container(
                                      width: 6,
                                      height: 6,
                                      decoration: BoxDecoration(
                                        color: gradientColors[0],
                                        shape: BoxShape.circle,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        perk.tr,
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 12,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 18),
                    ],

                    // Action Button
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          padding: EdgeInsets.zero,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          elevation: 6,
                        ),
                        onPressed: () => Navigator.pop(context),
                        child: Ink(
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: gradientColors,
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Container(
                            alignment: Alignment.center,
                            child: Text(
                              'CLAIM & CELEBRATE ✨'.tr,
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 14,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 0.8,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Close X button top right
            Positioned(
                top: 12,
                right: 12,
                child: IconButton(
                  icon: const Icon(Icons.close, color: Colors.white70, size: 22),
                  onPressed: () => Navigator.pop(context),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
