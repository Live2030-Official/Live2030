import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
import '../theme/app_theme.dart';
import '../localization/app_locale_service.dart';
import '../localization/translation_service.dart';

enum PolicyType {
  privacyPolicy,
  termsOfService,
  accountDeletion,
  communityGuidelines,
  childSafety,
  appleEula,
}

class LegalPolicyScreen extends StatefulWidget {
  final PolicyType initialPolicy;

  const LegalPolicyScreen({
    super.key,
    this.initialPolicy = PolicyType.privacyPolicy,
  });

  @override
  State<LegalPolicyScreen> createState() => _LegalPolicyScreenState();
}

class _LegalPolicyScreenState extends State<LegalPolicyScreen> {
  late PolicyType _currentPolicy;
  static const String _backendBaseUrl = 'http://13.51.73.60:4000';

  @override
  void initState() {
    super.initState();
    _currentPolicy = widget.initialPolicy;
    _prewarmCurrentPolicy();
  }

  void _prewarmCurrentPolicy() {
    final lang = AppLocaleService().currentLanguage.code;
    if (lang == 'en') return;
    final policy = _getPolicyContent(_currentPolicy);
    final strings = <String>[
      policy.badge,
      policy.title,
      policy.description,
      for (final sec in policy.sections) ...[
        sec.heading,
        for (final p in sec.paragraphs)
          p.startsWith('ALERT:') || p.startsWith('SUCCESS:')
              ? p.substring(p.indexOf(':') + 1).trim()
              : p,
      ],
    ];
    TranslationService().translateBatch(strings, targetLang: lang).then((_) {
      if (mounted) setState(() {});
    });
  }

  String get _currentUrl {
    switch (_currentPolicy) {
      case PolicyType.privacyPolicy:
        return '$_backendBaseUrl/privacy-policy';
      case PolicyType.termsOfService:
        return '$_backendBaseUrl/terms-of-service';
      case PolicyType.accountDeletion:
        return '$_backendBaseUrl/account-deletion';
      case PolicyType.communityGuidelines:
        return '$_backendBaseUrl/community-guidelines';
      case PolicyType.childSafety:
        return '$_backendBaseUrl/child-safety';
      case PolicyType.appleEula:
        return '$_backendBaseUrl/eula';
    }
  }

  Future<void> _openWebVersion() async {
    final uri = Uri.parse(_currentUrl);
    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${'Could not open'.tr} $_currentUrl')),
        );
      }
    } catch (e) {
      debugPrint('Error launching URL: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: LiveColors.background,
      appBar: AppBar(
        backgroundColor: LiveColors.background,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_rounded, color: Colors.white, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'Legal & Policies'.tr,
          style: GoogleFonts.plusJakartaSans(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
        actions: [
          IconButton(
            tooltip: 'Open in Browser'.tr,
            icon: const Icon(Icons.open_in_browser_rounded, color: LiveColors.accentPink),
            onPressed: _openWebVersion,
          ),
        ],
      ),
      body: ListenableBuilder(
        listenable: AppLocaleService(),
        builder: (context, _) {
          final policyData = _getPolicyContent(_currentPolicy);

          return Column(
            children: [
              // Horizontal Selector Tabs
              Container(
                height: 48,
                margin: const EdgeInsets.symmetric(vertical: 8),
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  children: [
                    _buildTab(PolicyType.privacyPolicy, '🛡️ Privacy Policy'.tr),
                    _buildTab(PolicyType.termsOfService, '📜 Terms of Service'.tr),
                    _buildTab(PolicyType.accountDeletion, '🗑️ Account Deletion'.tr),
                    _buildTab(PolicyType.communityGuidelines, '🌟 Guidelines'.tr),
                    _buildTab(PolicyType.childSafety, '👶 Child Safety'.tr),
                    _buildTab(PolicyType.appleEula, '📋 Apple EULA'.tr),
                  ],
                ),
              ),

              // Policy Document Scrollview
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Hero Header Card
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              LiveColors.accentPink.withValues(alpha: 0.15),
                              LiveColors.accentPurple.withValues(alpha: 0.1),
                            ],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: LiveColors.accentPink.withValues(alpha: 0.3)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: LiveColors.accentPink.withValues(alpha: 0.2),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                policyData.badge.tr,
                                style: GoogleFonts.plusJakartaSans(
                                  color: LiveColors.accentPink,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 11,
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ),
                            const SizedBox(height: 10),
                            Text(
                              policyData.title.tr,
                              style: GoogleFonts.plusJakartaSans(
                                color: Colors.white,
                                fontSize: 22,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              policyData.description.tr,
                              style: GoogleFonts.plusJakartaSans(
                                color: LiveColors.textSecondary,
                                fontSize: 13,
                              ),
                            ),
                            const SizedBox(height: 12),
                            Row(
                              children: [
                                const Icon(Icons.verified_user_rounded, color: Color(0xFF10B981), size: 16),
                                const SizedBox(width: 6),
                                Text(
                                  'Live 2030 Official Compliance • Verified for Apple & Google'.tr,
                                  style: GoogleFonts.plusJakartaSans(
                                    color: const Color(0xFF10B981),
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Sections
                      ...policyData.sections.map((section) => _buildSectionCard(section)),

                      // Open Web Version Button
                      const SizedBox(height: 10),
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            foregroundColor: LiveColors.accentPink,
                            side: BorderSide(color: LiveColors.accentPink.withValues(alpha: 0.4)),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          ),
                          onPressed: _openWebVersion,
                          icon: const Icon(Icons.public, size: 18),
                          label: Text(
                            'View Web URL for Apple / Google Store Review'.tr,
                            style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ),
                      const SizedBox(height: 30),
                    ],
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildTab(PolicyType type, String label) {
    final isSelected = _currentPolicy == type;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text(
          label,
          style: GoogleFonts.plusJakartaSans(
            color: isSelected ? Colors.white : LiveColors.textSecondary,
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
          ),
        ),
        selected: isSelected,
        selectedColor: LiveColors.accentPink,
        backgroundColor: LiveColors.backgroundSurface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(
            color: isSelected ? LiveColors.accentPink : LiveColors.border,
          ),
        ),
        onSelected: (selected) {
          if (selected) {
            setState(() => _currentPolicy = type);
            _prewarmCurrentPolicy();
          }
        },
      ),
    );
  }

  Widget _buildSectionCard(_PolicySection section) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: LiveColors.backgroundSurface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: LiveColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 4,
                height: 16,
                decoration: BoxDecoration(
                  gradient: LiveColors.primaryGradient,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  section.heading.tr,
                  style: GoogleFonts.plusJakartaSans(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...section.paragraphs.map((p) {
            if (p.startsWith('ALERT:')) {
              return Container(
                margin: const EdgeInsets.symmetric(vertical: 6),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.redAccent.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.redAccent.withValues(alpha: 0.4)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.warning_amber_rounded, color: Colors.redAccent, size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        p.replaceFirst('ALERT:', '').trim().tr,
                        style: GoogleFonts.plusJakartaSans(
                          color: const Color(0xFFFCA5A5),
                          fontSize: 12.5,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
              );
            }
            if (p.startsWith('SUCCESS:')) {
              return Container(
                margin: const EdgeInsets.symmetric(vertical: 6),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.4)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.check_circle_outline_rounded, color: Color(0xFF10B981), size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        p.replaceFirst('SUCCESS:', '').trim().tr,
                        style: GoogleFonts.plusJakartaSans(
                          color: const Color(0xFF86EFAC),
                          fontSize: 12.5,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
              );
            }
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(
                p.tr,
                style: GoogleFonts.plusJakartaSans(
                  color: const Color(0xFFCBD5E1),
                  fontSize: 13,
                  height: 1.5,
                ),
              ),
            );
          }),
        ],
      ),
    );
  }

  _PolicyContent _getPolicyContent(PolicyType type) {
    switch (type) {
      case PolicyType.privacyPolicy:
        return _PolicyContent(
          badge: 'Apple 5.1.1 & Google Play Compliant',
          title: 'Privacy Policy',
          description:
              'How Live 2030 collects, processes, protects, and respects your personal data during live audio/video broadcasts.',
          sections: [
            _PolicySection(
              heading: '1. Information We Collect',
              paragraphs: [
                'We collect information necessary to operate real-time broadcasts and social interactions:',
                '• Account Credentials: Phone number, display name, avatar, bio, age, gender, and country.',
                '• Audio & Video Streams: Real-time video/audio streams broadcasted via Agora.io RTC.',
                '• Device & Identifiers: UUID, OS version, device model, and IP address for security & fraud prevention.',
                '• Wallet & Virtual Goods: In-app coin purchases, virtual gifts sent, and diamond earnings.',
              ],
            ),
            _PolicySection(
              heading: '2. Hardware Permissions Used',
              paragraphs: [
                '• Camera & Microphone: Used exclusively when actively broadcasting live or in voice party rooms. Never accessed or recorded when the app is in the background.',
                '• Photo Library: Used strictly when you choose to upload a custom profile avatar or moments photo.',
              ],
            ),
            _PolicySection(
              heading: '3. Data Retention & Permanent Deletion',
              paragraphs: [
                'SUCCESS: You retain full sovereignty over your data. You can permanently delete your entire account and all associated personal records at any time directly in Profile > Session & Security > Delete Account.',
              ],
            ),
            _PolicySection(
              heading: '4. Contact Privacy Officer',
              paragraphs: [
                'For GDPR/CCPA questions or data inquiries, contact our dedicated Data Protection Officer at: privacy@live2030.app',
              ],
            ),
          ],
        );

      case PolicyType.termsOfService:
        return _PolicyContent(
          badge: 'User Agreement & Conduct',
          title: 'Terms of Service',
          description:
              'Rules and community expectations when participating in the Live 2030 streaming ecosystem.',
          sections: [
            _PolicySection(
              heading: '1. Age & Eligibility (18+)',
              paragraphs: [
                'Live 2030 is designated exclusively for users aged 18 and older. Minors are strictly prohibited from broadcasting or purchasing virtual currency.',
              ],
            ),
            _PolicySection(
              heading: '2. Zero-Tolerance Content Policy',
              paragraphs: [
                'ALERT: Live 2030 enforces a strict zero-tolerance policy. Immediate account bans apply for nudity, sexual content, hate speech, harassment, drugs, weapons, or illegal activities.',
              ],
            ),
            _PolicySection(
              heading: '3. Virtual Items & Currency Rules',
              paragraphs: [
                '• Virtual Coins purchased in-app or through verified resellers have no monetary value outside Live 2030.',
                '• Diamonds earned by streamers from virtual gifts can be redeemed via official creator payout thresholds (minimum 10,000 diamonds).',
              ],
            ),
            _PolicySection(
              heading: '4. 24-Hour Moderation SLA',
              paragraphs: [
                'All user reports are evaluated by our trust & safety moderation team within 24 hours. Offending users and content are removed immediately.',
              ],
            ),
          ],
        );

      case PolicyType.accountDeletion:
        return _PolicyContent(
          badge: 'Apple Guideline 5.1.1(v) Requirement',
          title: 'Account Deletion Policy',
          description:
              'Clear, transparent steps on how any user can immediately and permanently delete their account and personal data.',
          sections: [
            _PolicySection(
              heading: '1. In-App Deletion Steps',
              paragraphs: [
                'SUCCESS: To delete your account immediately:',
                '1. Go to the "Profile" screen in Live 2030.',
                '2. Scroll down to the "SESSION & DANGER ZONE" section.',
                '3. Tap "Delete Account" (red icon).',
                '4. Read the confirmation dialog and confirm.',
                'Your account, wallet balances, posts, and social links are purged immediately and you are safely logged out.',
              ],
            ),
            _PolicySection(
              heading: '2. What Data Is Erased',
              paragraphs: [
                '• Profile data: Phone number, username, display name, avatar, bio, and birthday.',
                '• Wallet balances: Remaining coins, diamonds, and virtual items.',
                '• Content: All photos, moments posts, comments, likes, and followers.',
                '• Auth tokens: Invalidation of all JWT sessions and device identifiers.',
              ],
            ),
            _PolicySection(
              heading: '3. Email / Web Deletion Assistance',
              paragraphs: [
                'If you no longer have access to your mobile device, submit an account deletion request to: support@live2030.app with your registered phone number. We process all requests within 48 business hours.',
              ],
            ),
          ],
        );

      case PolicyType.communityGuidelines:
        return _PolicyContent(
          badge: 'Safe Streamer Standards',
          title: 'Community Guidelines',
          description:
              'Standards of respect, safety, and mutual support across all video and audio live rooms.',
          sections: [
            _PolicySection(
              heading: '1. Strict Prohibition of Adult Content',
              paragraphs: [
                'ALERT: No sexual acts, nudity, erotic streaming, or solicitation is permitted. Broadcasters in violation are terminated in real time and banned permanently.',
              ],
            ),
            _PolicySection(
              heading: '2. Harassment & Hate Speech',
              paragraphs: [
                'We do not tolerate intimidation, cyberbullying, or discrimination against any race, religion, sexual orientation, or disability.',
              ],
            ),
            _PolicySection(
              heading: '3. Real-Time Report Mechanism',
              paragraphs: [
                'Every viewer can report a stream or comment instantly using the flag icon in the room. Stream hosts and co-hosts can also kick or block disruptive users.',
              ],
            ),
          ],
        );

      case PolicyType.childSafety:
        return _PolicyContent(
          badge: 'COPPA & Minor Protection',
          title: 'Child Safety Policy',
          description:
              'Absolute protection of minors and zero tolerance for child exploitation.',
          sections: [
            _PolicySection(
              heading: '1. Strict 18+ Age Restriction',
              paragraphs: [
                'Live 2030 is an adult live streaming network. We do not knowingly permit minors under 18 to create accounts or stream. Suspected minor accounts are shut down immediately.',
              ],
            ),
            _PolicySection(
              heading: '2. CSAM / CSAE Absolute Zero Tolerance',
              paragraphs: [
                'ALERT: Any child sexual abuse material or exploitation attempt results in immediate permanent ban, IP and hardware blacklisting, and reporting to NCMEC and international law enforcement agencies.',
              ],
            ),
          ],
        );

      case PolicyType.appleEula:
        return _PolicyContent(
          badge: 'Apple Standard License Agreement',
          title: 'Apple Standard EULA',
          description:
              'End User License Agreement terms specific to iOS App Store distribution.',
          sections: [
            _PolicySection(
              heading: '1. Parties & Acknowledgment',
              paragraphs: [
                'This agreement is concluded between you and Live 2030 Global Entertainment Ltd., and not with Apple Inc. Live 2030 is solely responsible for the Licensed Application and content.',
              ],
            ),
            _PolicySection(
              heading: '2. User Generated Content Moderation',
              paragraphs: [
                'Live 2030 enforces strict moderation on all User Generated Content (UGC), providing blocking, reporting, and 24-hour removal of objectionable content per Apple Guideline 1.2.',
              ],
            ),
            _PolicySection(
              heading: '3. Legal Inquiries',
              paragraphs: [
                'For legal notices or questions regarding the iOS application, contact: legal@live2030.app',
              ],
            ),
          ],
        );
    }
  }
}

class _PolicyContent {
  final String badge;
  final String title;
  final String description;
  final List<_PolicySection> sections;

  _PolicyContent({
    required this.badge,
    required this.title,
    required this.description,
    required this.sections,
  });
}

class _PolicySection {
  final String heading;
  final List<String> paragraphs;

  _PolicySection({
    required this.heading,
    required this.paragraphs,
  });
}
