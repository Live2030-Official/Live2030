import '../localization/app_locale_service.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../main.dart'; // for CoinResellersScreen
import '../services/auth_service.dart';
import '../theme/app_theme.dart';
import 'direct_coin_purchase_sheet.dart';

class TopUpChoiceDialog extends StatelessWidget {
  const TopUpChoiceDialog({super.key});

  /// Static helper to display the stylish top-up choice dialog
  static Future<void> show(BuildContext context) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => const TopUpChoiceDialog(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = AuthService().currentUser;

    return ListenableBuilder(
      listenable: AppLocaleService(),
      builder: (context, _) {
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
          decoration: const BoxDecoration(
            color: Color(0xFF140827),
            borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
            border: Border(
              top: BorderSide(color: Color(0xFF6B21A8), width: 1.5),
            ),
            boxShadow: [
              BoxShadow(
                color: Color(0x66000000),
                blurRadius: 30,
                offset: Offset(0, -10),
              ),
            ],
          ),
          child: SafeArea(
            top: false,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Drag Indicator
                Center(
                  child: Container(
                    width: 44,
                    height: 5,
                    margin: const EdgeInsets.only(bottom: 20),
                    decoration: BoxDecoration(
                      color: Colors.white24,
                      borderRadius: BorderRadius.circular(99),
                    ),
                  ),
                ),

                // Dialog Header with Live Coin Balance
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Add Coins 🪙'.tr,
                          style: GoogleFonts.plusJakartaSans(
                            color: Colors.white,
                            fontSize: 22,
                            fontWeight: FontWeight.w900,
                            letterSpacing: -0.5,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Choose how you would like to top up your wallet'.tr,
                          style: GoogleFonts.plusJakartaSans(
                            color: LiveColors.textSecondary,
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: Container(
                        padding: const EdgeInsets.all(6),
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          color: Color(0xFF26123D),
                        ),
                        child: const Icon(Icons.close_rounded, color: Colors.white70, size: 18),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 16),

                // Live Balance Bar
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF25103E), Color(0xFF1B0B2E)],
                    ),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFF43196B)),
                  ),
                  child: Row(
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
                      const SizedBox(width: 10),
                      Text(
                        'Current Wallet:'.tr,
                        style: GoogleFonts.plusJakartaSans(
                          color: LiveColors.textSecondary,
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const Spacer(),
                      Text(
                        '${user?.coins ?? 0} 🪙',
                        style: GoogleFonts.plusJakartaSans(
                          color: const Color(0xFFFBBF24),
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 20),

                // Option 1: Instant Direct Online Payment (RsomPay)
                _buildChoiceCard(
                  context: context,
                  title: 'Instant Online Payment ⚡'.tr,
                  subtitle: 'Pay directly via official RsomPay gateway. Coins are credited instantly to your account.'.tr,
                  badges: ['Instant Credit'.tr, 'Mada • Visa • Apple Pay'.tr, '3D Secure'.tr],
                  gradientColors: [const Color(0xFF6B21A8), const Color(0xFFDB2777)],
                  icon: Icons.credit_card_rounded,
                  iconColor: const Color(0xFFFF2B85),
                  buttonText: 'Pay Directly Online →'.tr,
                  isPrimary: true,
                  onTap: () {
                    Navigator.pop(context); // Close choice dialog
                    DirectCoinPurchaseSheet.show(context); // Open direct checkout sheet
                  },
                ),

                const SizedBox(height: 14),

                // Option 2: Authorized Coin Resellers (WhatsApp)
                _buildChoiceCard(
                  context: context,
                  title: 'Through Coin Resellers 🤝'.tr,
                  subtitle: 'Connect with verified regional merchants via WhatsApp for local bank transfers & bulk packages.'.tr,
                  badges: ['Local Bank Transfer'.tr, 'Bulk Discounts'.tr, 'Verified Vendors'.tr],
                  gradientColors: [const Color(0xFF065F46), const Color(0xFF047857)],
                  icon: Icons.storefront_rounded,
                  iconColor: const Color(0xFF34D399),
                  buttonText: 'Contact Resellers →'.tr,
                  isPrimary: false,
                  onTap: () {
                    Navigator.pop(context); // Close choice dialog
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const CoinResellersScreen()),
                    );
                  },
                ),

                const SizedBox(height: 12),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildChoiceCard({
    required BuildContext context,
    required String title,
    required String subtitle,
    required List<String> badges,
    required List<Color> gradientColors,
    required IconData icon,
    required Color iconColor,
    required String buttonText,
    required bool isPrimary,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: const Color(0xFF1E0D36),
          borderRadius: BorderRadius.circular(22),
          border: Border.all(
            color: isPrimary ? const Color(0xFFFF2B85).withValues(alpha: 0.6) : const Color(0xFF3D1A63),
            width: isPrimary ? 1.5 : 1,
          ),
          boxShadow: isPrimary
              ? [
                  BoxShadow(
                    color: const Color(0xFFFF2B85).withValues(alpha: 0.15),
                    blurRadius: 16,
                    offset: const Offset(0, 4),
                  ),
                ]
              : [],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(14),
                    gradient: LinearGradient(colors: gradientColors),
                  ),
                  alignment: Alignment.center,
                  child: Icon(icon, color: Colors.white, size: 22),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title.tr,
                        style: GoogleFonts.plusJakartaSans(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Wrap(
                        spacing: 6,
                        runSpacing: 4,
                        children: badges.map((badge) {
                          return Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: isPrimary
                                  ? const Color(0xFFFF2B85).withValues(alpha: 0.15)
                                  : const Color(0xFF10B981).withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              badge.tr,
                              style: GoogleFonts.plusJakartaSans(
                                color: isPrimary ? const Color(0xFFFF6EB4) : const Color(0xFF34D399),
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              subtitle.tr,
              style: GoogleFonts.plusJakartaSans(
                color: LiveColors.textSecondary,
                fontSize: 12,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 14),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 12),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                gradient: isPrimary
                    ? const LinearGradient(colors: [Color(0xFFFF2B85), Color(0xFF8B25FF)])
                    : null,
                color: isPrimary ? null : const Color(0xFF2B1348),
                border: isPrimary ? null : Border.all(color: const Color(0xFF4B237C)),
              ),
              alignment: Alignment.center,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    buttonText.tr,
                    style: GoogleFonts.plusJakartaSans(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
