import '../localization/app_locale_service.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import 'earnings_report_screen.dart';

class AgencyCenterScreen extends StatefulWidget {
  const AgencyCenterScreen({super.key});

  @override
  State<AgencyCenterScreen> createState() => _AgencyCenterScreenState();
}

class _AgencyCenterScreenState extends State<AgencyCenterScreen> {
  final TextEditingController _codeController = TextEditingController();
  bool _isLoading = false;
  bool _isFetchingStatus = true;
  Map<String, dynamic>? _agencyStatus;

  @override
  void initState() {
    super.initState();
    _loadHostAgencyStatus();
  }

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _loadHostAgencyStatus() async {
    final user = AuthService().currentUser;
    if (user == null) {
      setState(() => _isFetchingStatus = false);
      return;
    }

    setState(() => _isFetchingStatus = true);
    try {
      final status = await ApiService().getHostAgencyStatus(user.id);
      if (mounted) {
        setState(() {
          _agencyStatus = status;
          _isFetchingStatus = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isFetchingStatus = false);
    }
  }

  Future<void> _submitAgencyCode() async {
    final code = _codeController.text.trim();
    if (code.isEmpty) {
      _showSnackbar('Please enter an Agency Invitation Code', isError: true);
      return;
    }

    final user = AuthService().currentUser;
    if (user == null) return;

    setState(() => _isLoading = true);

    try {
      final res = await ApiService().bindHost(
        hostId: user.id,
        agencyCode: code,
      );

      if (mounted) {
        // Upgrade role in local AuthService
        await AuthService().updateRole('HOST');

        _codeController.clear();
        await _loadHostAgencyStatus();

        if (mounted) {
          showDialog(
            context: context,
            builder: (ctx) => AlertDialog(
              backgroundColor: LiveColors.backgroundSurface,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
                side: const BorderSide(color: LiveColors.border, width: 1.5),
              ),
              title: Row(
                children: [
                  Icon(Icons.verified, color: LiveColors.primaryAccent, size: 28),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text('Host Certified! ⭐'.tr, style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18), maxLines: 1, overflow: TextOverflow.ellipsis),
                  ),
                ],
              ),
              content: Text(
                res?['message'] ?? 'You have successfully joined the talent agency and are now an Official Broadcaster Host!',
                style: const TextStyle(color: Colors.white70, fontSize: 13),
              ),
              actions: [
                Container(
                  decoration: BoxDecoration(
                    gradient: LiveColors.primaryGradient,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.transparent,
                      shadowColor: Colors.transparent,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: () => Navigator.pop(ctx),
                    child: Text('Awesome!'.tr, style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        _showSnackbar(e.toString().replaceAll('Exception: ', ''), isError: true);
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showSnackbar(String msg, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg, style: const TextStyle(color: Colors.white)),
        backgroundColor: isError ? const Color(0xFFEF4444) : const Color(0xFF10B981),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = AuthService().currentUser;
    final isHost = _agencyStatus?['isHost'] == true || user?.role == 'HOST';
    final agency = _agencyStatus?['agency'];

    return Scaffold(
      backgroundColor: LiveColors.backgroundPrimary,
      appBar: AppBar(
        backgroundColor: LiveColors.backgroundPrimary,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white, size: 18),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'Agency Center & Host Portal'.tr,
          style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.white),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white70),
            onPressed: _loadHostAgencyStatus,
          ),
        ],
      ),
      body: _isFetchingStatus
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF6366F1)))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 1. Host Certification Status Card
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: isHost
                            ? [const Color(0xFF38125E), LiveColors.backgroundSurface]
                            : [LiveColors.backgroundSurface, LiveColors.backgroundPrimary],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: isHost
                            ? LiveColors.primaryAccent.withValues(alpha: 0.5)
                            : LiveColors.border,
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: (isHost ? LiveColors.primaryAccent : LiveColors.accentPurple).withValues(alpha: 0.2),
                                shape: BoxShape.circle,
                              ),
                              child: Icon(
                                isHost ? Icons.verified : Icons.star_border,
                                color: isHost ? LiveColors.primaryAccent : const Color(0xFFC084FC),
                                size: 28,
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    (isHost ? 'CERTIFIED BROADCASTER HOST' : 'REGULAR VIEWER ACCOUNT').tr,
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w900,
                                      letterSpacing: 1.1,
                                      color: isHost ? LiveColors.primaryAccent : LiveColors.textSecondary,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    user?.displayName ?? 'Streamer',
                                    style: GoogleFonts.plusJakartaSans(
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                gradient: isHost ? LiveColors.primaryGradient : null,
                                color: isHost ? null : LiveColors.backgroundElevated,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Text(
                                (isHost ? 'HOST ACTIVE' : 'USER').tr,
                                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 10),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        const Divider(color: Colors.white12),
                        const SizedBox(height: 8),

                        // Affiliated Agency details if bound
                        if (agency != null) ...[
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('Affiliated Talent Agency:'.tr, style: TextStyle(color: Colors.white70, fontSize: 12)),
                              Text(agency['name'] ?? 'Official Agency', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('Agency Invitation Code:'.tr, style: TextStyle(color: Colors.white70, fontSize: 12)),
                              Text(agency['code'] ?? '-', style: const TextStyle(color: Color(0xFFF59E0B), fontWeight: FontWeight.bold, fontSize: 12, fontFamily: 'monospace')),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('Agency Commission Rate:'.tr, style: TextStyle(color: Colors.white70, fontSize: 12)),
                              Text('${agency['commissionPercent'] ?? 12}% Tier', style: const TextStyle(color: Color(0xFFEC4899), fontWeight: FontWeight.bold, fontSize: 12)),
                            ],
                          ),
                        ] else ...[
                          Text(
                            (isHost
                                ? 'Independent Broadcaster Host (No agency affiliated)'
                                : 'You are not currently affiliated with a talent agency. Join an agency below to access host perks and revenue bonuses.').tr,
                            style: const TextStyle(color: Colors.white60, fontSize: 12),
                          ),
                        ],
                      ],
                    ),
                  ),

                  const SizedBox(height: 14),

                  // Button to view detailed stream earnings & commission reports
                  InkWell(
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const EarningsReportScreen()),
                      );
                    },
                    borderRadius: BorderRadius.circular(16),
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      decoration: BoxDecoration(
                        color: LiveColors.backgroundSurface,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: LiveColors.border),
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: LiveColors.primaryAccent.withValues(alpha: 0.15),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.analytics_rounded, color: LiveColors.primaryAccent, size: 20),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('View Stream Earnings & Reports'.tr, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13), maxLines: 1, overflow: TextOverflow.ellipsis),
                                const SizedBox(height: 2),
                                Text('Detailed stream revenue, diamond cuts & commission ledger'.tr, style: const TextStyle(color: LiveColors.textSecondary, fontSize: 11), maxLines: 1, overflow: TextOverflow.ellipsis),
                              ],
                            ),
                          ),
                          const Icon(Icons.arrow_forward_ios, color: Colors.white60, size: 14),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 20),

                  // 2. Agency Invitation Code Input Card
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: LiveColors.backgroundSurface,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: LiveColors.border),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.apartment, color: LiveColors.gold, size: 22),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                (isHost ? 'Change or Bind Talent Agency' : 'Enter Agency Invitation Code').tr,
                                style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          (isHost
                              ? 'Enter a new agency code to transfer or update your management representation.'
                              : 'Have an invitation code from a talent agency? Enter it below to unlock instant host certification.').tr,
                          style: const TextStyle(color: LiveColors.textSecondary, fontSize: 12),
                        ),
                        const SizedBox(height: 16),
                        TextField(
                          controller: _codeController,
                          textCapitalization: TextCapitalization.characters,
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, letterSpacing: 1.5),
                          decoration: InputDecoration(
                            hintText: 'e.g. AGY-GLOBAL-01'.tr,
                            hintStyle: const TextStyle(color: LiveColors.textMuted, letterSpacing: 1),
                            filled: true,
                            fillColor: LiveColors.backgroundInput,
                            prefixIcon: const Icon(Icons.vpn_key, color: LiveColors.gold, size: 20),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(14),
                              borderSide: const BorderSide(color: LiveColors.border),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(14),
                              borderSide: const BorderSide(color: LiveColors.primaryAccent),
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),
                        Container(
                          width: double.infinity,
                          height: 48,
                          decoration: BoxDecoration(
                            gradient: LiveColors.primaryGradient,
                            borderRadius: BorderRadius.circular(14),
                            boxShadow: [
                              BoxShadow(
                                color: LiveColors.primaryAccent.withValues(alpha: 0.3),
                                blurRadius: 10,
                                offset: const Offset(0, 4),
                              ),
                            ],
                          ),
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.transparent,
                              shadowColor: Colors.transparent,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                            ),
                            onPressed: _isLoading ? null : _submitAgencyCode,
                            child: _isLoading
                                ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                                : Text(
                                    'Submit Agency Code & Verify Host'.tr,
                                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  // 3. Certified Host Creator Benefits
                  Text(
                    'Certified Host Creator Perks'.tr,
                    style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                  const SizedBox(height: 12),

                  GridView.count(
                    crossAxisCount: 2,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    mainAxisSpacing: 12,
                    crossAxisSpacing: 12,
                    childAspectRatio: 1.25,
                    children: [
                      _buildPerkCard(
                        icon: Icons.diamond,
                        iconColor: const Color(0xFF06B6D4),
                        title: '42% Diamonds',
                        subtitle: 'Earn real diamonds instantly from every virtual gift sent by viewers.',
                      ),
                      _buildPerkCard(
                        icon: Icons.payments,
                        iconColor: const Color(0xFF10B981),
                        title: 'Cash-Out to USD',
                        subtitle: 'Direct payouts to Bank Wire, USDT TRC-20, or PayPal at 100 💎 = \$1.00 USD.',
                      ),
                      _buildPerkCard(
                        icon: Icons.mic_external_on,
                        iconColor: const Color(0xFF8B5CF6),
                        title: '8-Seat Audio Stage',
                        subtitle: 'Host multi-guest voice lounges with 8 simultaneous active microphones.',
                      ),
                      _buildPerkCard(
                        icon: Icons.flash_on,
                        iconColor: const Color(0xFFEF4444),
                        title: 'PK Battle Arena',
                        subtitle: 'Challenge streamer rivals head-to-head with live diamond tug-of-war.',
                      ),
                    ],
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildPerkCard({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String subtitle,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: LiveColors.backgroundSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: LiveColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: iconColor, size: 24),
          const SizedBox(height: 8),
          Text(title.tr, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13), maxLines: 1, overflow: TextOverflow.ellipsis),
          const SizedBox(height: 4),
          Text(subtitle.tr, style: const TextStyle(color: LiveColors.textSecondary, fontSize: 10), maxLines: 3, overflow: TextOverflow.ellipsis),
        ],
      ),
    );
  }
}
