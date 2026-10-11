import '../localization/app_locale_service.dart';
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../screens/contact_us_screen.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';

class UserModerationDialog extends StatefulWidget {
  final VoidCallback? onDismissed;

  const UserModerationDialog({super.key, this.onDismissed});

  /// Static helper to display the non-dismissible moderation dialog
  static Future<void> show(BuildContext context) {
    return showDialog(
      context: context,
      barrierDismissible: false,
      barrierColor: Colors.black.withValues(alpha: 0.85),
      builder: (ctx) => const UserModerationDialog(),
    );
  }

  @override
  State<UserModerationDialog> createState() => _UserModerationDialogState();
}

class _UserModerationDialogState extends State<UserModerationDialog> with SingleTickerProviderStateMixin {
  Timer? _timer;
  Duration _remaining = Duration.zero;
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);
    _pulseAnimation = Tween<double>(begin: 0.95, end: 1.05).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    _updateRemainingTime();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) => _updateRemainingTime());

    // Listen to AuthService updates so if admin unbans or sets ACTIVE, dialog closes immediately
    AuthService().addListener(_onAuthServiceUpdate);
  }

  void _onAuthServiceUpdate() {
    if (!AuthService().hasActiveModerationPenalty && mounted) {
      widget.onDismissed?.call();
      Navigator.of(context, rootNavigator: true).maybePop();
    }
  }

  void _updateRemainingTime() {
    if (!mounted) return;
    final remaining = AuthService().remainingSuspensionTime;

    if (remaining == null || remaining <= Duration.zero) {
      if (AuthService().isSuspended) {
        // Expiration time arrived! Re-check with backend
        AuthService().checkModerationStatus();
      }
      setState(() {
        _remaining = Duration.zero;
      });
    } else {
      setState(() {
        _remaining = remaining;
      });
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _pulseController.dispose();
    AuthService().removeListener(_onAuthServiceUpdate);
    super.dispose();
  }

  String _formatDuration(Duration d) {
    final hours = d.inHours;
    final minutes = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final seconds = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    if (hours > 24) {
      final days = (hours / 24).floor();
      final remHours = (hours % 24).toString().padLeft(2, '0');
      return '${days}d ${remHours}h ${minutes}m ${seconds}s';
    }
    return '${hours.toString().padLeft(2, '0')}h : ${minutes}m : ${seconds}s';
  }

  void _handleContactSupport() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => const ContactUsScreen(isAppeal: true),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = AuthService().currentUser;
    final isBanned = AuthService().isBanned;
    final reason = AuthService().moderationReasonText;

    final primaryColor = isBanned ? const Color(0xFFEF4444) : const Color(0xFFF59E0B);
    final secondaryColor = isBanned ? const Color(0xFF991B1B) : const Color(0xFFD97706);

    return PopScope(
      canPop: false, // strictly non-dismissible until resolved or logged out
      child: Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
        child: Container(
          constraints: const BoxConstraints(maxWidth: 400),
          decoration: BoxDecoration(
            color: const Color(0xFF1B0730),
            borderRadius: BorderRadius.circular(28),
            border: Border.all(
              color: primaryColor.withValues(alpha: 0.5),
              width: 1.5,
            ),
            boxShadow: [
              BoxShadow(
                color: primaryColor.withValues(alpha: 0.25),
                blurRadius: 32,
                spreadRadius: 2,
              ),
              const BoxShadow(
                color: Colors.black87,
                blurRadius: 24,
              ),
            ],
          ),
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Pulsing Header Icon
              ScaleTransition(
                scale: _pulseAnimation,
                child: Container(
                  width: 72,
                  height: 72,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(
                      colors: [primaryColor, secondaryColor],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: primaryColor.withValues(alpha: 0.4),
                        blurRadius: 20,
                      ),
                    ],
                  ),
                  child: Icon(
                    isBanned ? Icons.block_rounded : Icons.shield_outlined,
                    color: Colors.white,
                    size: 38,
                  ),
                ),
              ),
              const SizedBox(height: 18),

              // Title
              Text(
                (isBanned ? 'ACCOUNT PERMANENTLY BANNED' : 'ACCOUNT TEMPORARILY SUSPENDED').tr,
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 16,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.8,
                  color: primaryColor,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),

              // User details chip
              if (user != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: const Color(0xFF260D42),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFF3E1968)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      CircleAvatar(
                        radius: 10,
                        backgroundColor: Colors.indigoAccent,
                        backgroundImage: user.avatarUrl.isNotEmpty ? NetworkImage(user.avatarUrl) : null,
                        child: user.avatarUrl.isEmpty
                            ? Text(user.displayName.isNotEmpty ? user.displayName[0] : 'U', style: const TextStyle(fontSize: 10, color: Colors.white))
                            : null,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '@${user.username} • ID: ${user.id.length > 8 ? user.id.substring(0, 8) : user.id}',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: Colors.white70,
                        ),
                      ),
                    ],
                  ),
                ),
              const SizedBox(height: 16),

              // Reason Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFF250E40),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFF3C1864)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.info_outline, color: primaryColor, size: 16),
                        const SizedBox(width: 6),
                        Text(
                          'Moderation Enforcement Reason:'.tr,
                          style: GoogleFonts.plusJakartaSans(
                            color: Colors.white70,
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      reason.tr,
                      style: GoogleFonts.plusJakartaSans(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),

              // Live Countdown for Temporary Suspensions
              if (!isBanned) ...[
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF2E124F),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: primaryColor.withValues(alpha: 0.3)),
                  ),
                  child: Column(
                    children: [
                      Text(
                        'TIME REMAINING UNTIL UNLOCK'.tr,
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 1,
                          color: const Color(0xFFFDE68A),
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        _remaining > Duration.zero ? _formatDuration(_remaining) : 'Checking reactivation status...'.tr,
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                          fontFeatures: const [FontFeature.tabularFigures()],
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Your account will automatically restore as soon as this period ends.'.tr,
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 10,
                          color: LiveColors.textSecondary,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 18),
              ] else ...[
                const SizedBox(height: 6),
                Text(
                  'Permanent bans can only be lifted through a formal administrator review appeal.'.tr,
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 11,
                    color: LiveColors.textSecondary,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 18),
              ],

              // Action Buttons
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF6366F1),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        elevation: 4,
                        shadowColor: const Color(0xFF6366F1).withValues(alpha: 0.5),
                      ),
                      onPressed: _handleContactSupport,
                      icon: const Icon(Icons.support_agent_rounded, size: 18),
                      label: Text(
                        'Contact Support'.tr,
                        style: GoogleFonts.plusJakartaSans(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF37165C),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      onPressed: () async {
                        await AuthService().logout();
                        if (context.mounted) {
                          Navigator.of(context, rootNavigator: true).maybePop();
                        }
                      },
                      child: Text(
                        'Log Out'.tr,
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: Colors.redAccent,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
