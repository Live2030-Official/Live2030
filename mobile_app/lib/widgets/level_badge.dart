import 'package:flutter/material.dart';

/// Distinct Visual Badges for Levels 1 to 8 and VIP Levels 1 to 8 in Live 2030
class LevelBadge extends StatelessWidget {
  final int level;
  final int? vipLevel;
  final double fontSize;
  final bool showIcon;
  final EdgeInsets padding;

  const LevelBadge({
    super.key,
    required this.level,
    this.vipLevel,
    this.fontSize = 9.0,
    this.showIcon = true,
    this.padding = const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
  });

  static Color getLevelColor(int level) {
    switch (level) {
      case 1:
        return const Color(0xFF64748B); // Slate Gray
      case 2:
        return const Color(0xFF0284C7); // Sky Blue
      case 3:
        return const Color(0xFF059669); // Emerald Green
      case 4:
        return const Color(0xFFD97706); // Amber Gold
      case 5:
        return const Color(0xFFE11D48); // Vivid Rose Pink
      case 6:
        return const Color(0xFF4F46E5); // Royal Sapphire
      case 7:
        return const Color(0xFFC026D3); // Diamond Magenta
      case 8:
        return const Color(0xFFF59E0B); // Mythic Sovereign Gold
      default:
        return level > 8 ? const Color(0xFFF59E0B) : const Color(0xFF64748B);
    }
  }

  static List<Color> getLevelGradient(int level) {
    switch (level) {
      case 1:
        return [const Color(0xFF475569), const Color(0xFF64748B)];
      case 2:
        return [const Color(0xFF0284C7), const Color(0xFF38BDF8)];
      case 3:
        return [const Color(0xFF059669), const Color(0xFF34D399)];
      case 4:
        return [const Color(0xFFD97706), const Color(0xFFFBBF24)];
      case 5:
        return [const Color(0xFFE11D48), const Color(0xFFFB7185)];
      case 6:
        return [const Color(0xFF4338CA), const Color(0xFF6366F1)];
      case 7:
        return [const Color(0xFF9333EA), const Color(0xFFC026D3)];
      case 8:
        return [const Color(0xFFF59E0B), const Color(0xFFEC4899), const Color(0xFF8B5CF6)];
      default:
        return [const Color(0xFF475569), const Color(0xFF64748B)];
    }
  }

  static List<Color> getVipGradient(int vip) {
    switch (vip) {
      case 1:
        return [const Color(0xFFD97706), const Color(0xFFF59E0B)];
      case 2:
        return [const Color(0xFF2563EB), const Color(0xFF38BDF8), const Color(0xFFF59E0B)];
      case 3:
        return [const Color(0xFF059669), const Color(0xFF34D399), const Color(0xFFF59E0B)];
      case 4:
        return [const Color(0xFFDC2626), const Color(0xFFF59E0B)];
      case 5:
        return [const Color(0xFF7C3AED), const Color(0xFFEC4899), const Color(0xFFF59E0B)];
      case 6:
        return [const Color(0xFF0284C7), const Color(0xFFEC4899), const Color(0xFFF59E0B)];
      case 7:
        return [const Color(0xFFDC2626), const Color(0xFF7C3AED), const Color(0xFFF59E0B)];
      case 8:
        return [const Color(0xFFFFD700), const Color(0xFFFF1493), const Color(0xFF8A2BE2), const Color(0xFF00FFFF)];
      default:
        return [const Color(0xFFD97706), const Color(0xFFF59E0B)];
    }
  }

  static String getLevelTitle(int level) {
    switch (level) {
      case 1:
        return 'Newcomer';
      case 2:
        return 'Rising Star';
      case 3:
        return 'Bronze Elite';
      case 4:
        return 'Gold Broadcaster';
      case 5:
        return 'Ruby Influencer';
      case 6:
        return 'Sapphire Master';
      case 7:
        return 'Diamond Legend';
      case 8:
        return 'Mythic Sovereign';
      default:
        return level > 8 ? 'Mythic Sovereign' : 'Newcomer';
    }
  }

  static IconData getLevelIcon(int level) {
    if (level >= 8) return Icons.stars_rounded;
    if (level >= 6) return Icons.diamond_rounded;
    if (level >= 4) return Icons.military_tech_rounded;
    return Icons.star_rounded;
  }

  @override
  Widget build(BuildContext context) {
    final isVipBadge = (vipLevel ?? 0) >= 1;
    final gradient = isVipBadge ? getVipGradient(vipLevel!) : getLevelGradient(level);
    final label = isVipBadge ? 'VIP $vipLevel' : 'Lv.$level';
    final icon = isVipBadge ? Icons.workspace_premium_rounded : getLevelIcon(level);

    return Container(
      padding: padding,
      decoration: BoxDecoration(
        gradient: LinearGradient(colors: gradient),
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: gradient[0].withValues(alpha: 0.35),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (showIcon) ...[
            Icon(icon, color: Colors.white, size: fontSize + 2),
            const SizedBox(width: 4),
          ],
          Text(
            label,
            style: TextStyle(
              color: Colors.white,
              fontSize: fontSize,
              fontWeight: FontWeight.w900,
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }
}

