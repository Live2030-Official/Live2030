import '../localization/app_locale_service.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';

class EarningsReportScreen extends StatefulWidget {
  const EarningsReportScreen({super.key});

  @override
  State<EarningsReportScreen> createState() => _EarningsReportScreenState();
}

class _EarningsReportScreenState extends State<EarningsReportScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isLoading = true;
  Map<String, dynamic>? _reportData;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadReport();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadReport() async {
    final user = AuthService().currentUser;
    if (user == null) {
      setState(() {
        _isLoading = false;
        _errorMessage = 'Please sign in to view your stream earnings report.';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final res = await ApiService().getUserEarningsReport(user.id);
      if (mounted) {
        setState(() {
          _reportData = res;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = 'Could not load earnings report. Please check network connection.';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = AuthService().currentUser;
    final summary = _reportData?['summary'];
    final rates = _reportData?['commissionRates'];
    final agency = _reportData?['agency'];
    final streamSessions = (_reportData?['streamSessions'] as List<dynamic>?) ?? [];
    final recentTransactions = (_reportData?['recentTransactions'] as List<dynamic>?) ?? [];

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
          'Stream Earnings & Reports'.tr,
          style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.white),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white70),
            tooltip: 'Refresh Report'.tr,
            onPressed: _loadReport,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: LiveColors.primaryAccent))
          : _errorMessage != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.error_outline, color: Colors.redAccent, size: 48),
                        const SizedBox(height: 12),
                        Text(_errorMessage!, style: const TextStyle(color: Colors.white70, fontSize: 13), textAlign: TextAlign.center),
                        const SizedBox(height: 16),
                        Container(
                          decoration: BoxDecoration(
                            gradient: LiveColors.primaryGradient,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.transparent,
                              shadowColor: Colors.transparent,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                            onPressed: _loadReport,
                            child: Text('Try Again'.tr, style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                          ),
                        ),
                      ],
                    ),
                  ),
                )
              : RefreshIndicator(
                  color: const Color(0xFF10B981),
                  onRefresh: _loadReport,
                  child: NestedScrollView(
                    headerSliverBuilder: (context, innerBoxIsScrolled) => [
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // 1. Top Executive KPI Card
                              Container(
                                width: double.infinity,
                                padding: const EdgeInsets.all(20),
                                decoration: BoxDecoration(
                                  gradient: const LinearGradient(
                                    colors: [Color(0xFF38125E), LiveColors.backgroundSurface, LiveColors.backgroundPrimary],
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                  ),
                                  borderRadius: BorderRadius.circular(22),
                                  border: Border.all(color: LiveColors.border),
                                  boxShadow: [
                                    BoxShadow(
                                      color: LiveColors.primaryAccent.withValues(alpha: 0.15),
                                      blurRadius: 20,
                                      offset: const Offset(0, 8),
                                    ),
                                  ],
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Row(
                                          children: [
                                            Container(
                                              padding: const EdgeInsets.all(8),
                                              decoration: BoxDecoration(
                                                color: LiveColors.primaryAccent.withValues(alpha: 0.2),
                                                shape: BoxShape.circle,
                                              ),
                                              child: const Icon(Icons.diamond_rounded, color: LiveColors.primaryAccent, size: 22),
                                            ),
                                            const SizedBox(width: 10),
                                            Text(
                                              'LIFETIME STREAM EARNINGS'.tr,
                                              style: TextStyle(
                                                color: LiveColors.primaryAccent.withValues(alpha: 0.9),
                                                fontSize: 11,
                                                fontWeight: FontWeight.w900,
                                                letterSpacing: 1.1,
                                              ),
                                            ),
                                          ],
                                        ),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                          decoration: BoxDecoration(
                                            color: Colors.white.withValues(alpha: 0.1),
                                            borderRadius: BorderRadius.circular(10),
                                            border: Border.all(color: Colors.white12),
                                          ),
                                          child: Text(
                                            user?.role ?? 'HOST',
                                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 10),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 16),
                                    Row(
                                      crossAxisAlignment: CrossAxisAlignment.end,
                                      children: [
                                        Text(
                                          '${summary?['totalDiamondsEarned'] ?? user?.diamonds ?? 0}',
                                          style: GoogleFonts.plusJakartaSans(
                                            fontSize: 34,
                                            fontWeight: FontWeight.w900,
                                            color: Colors.white,
                                          ),
                                        ),
                                        const SizedBox(width: 6),
                                        Padding(
                                          padding: const EdgeInsets.only(bottom: 6),
                                          child: Text('💎 Diamonds'.tr, style: TextStyle(color: LiveColors.primaryAccent, fontWeight: FontWeight.bold, fontSize: 14)),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      '≈ \$${summary?['estimatedUsdValuation'] ?? '0.00'} ${'USD Cash Valuation (100 💎 = \$1.00 USD)'.tr}',
                                      style: const TextStyle(color: Colors.white70, fontSize: 12),
                                    ),
                                    const SizedBox(height: 16),
                                    const Divider(color: Colors.white12),
                                    const SizedBox(height: 8),
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                                      children: [
                                        _buildMetricColumn('Hosted Streams', '${summary?['totalStreamsHosted'] ?? 0} 📹'),
                                        _buildMetricDivider(),
                                        _buildMetricColumn('Gifts Received', '${summary?['totalGiftsReceived'] ?? 0} 🎁'),
                                        _buildMetricDivider(),
                                        _buildMetricColumn('Audience Coins', '${summary?['totalCoinsReceived'] ?? 0} 🪙'),
                                      ],
                                    ),
                                  ],
                                ),
                              ),

                              const SizedBox(height: 16),

                              // 2. Agency Affiliation & Commission Distribution Card
                              Container(
                                width: double.infinity,
                                padding: const EdgeInsets.all(18),
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
                                        Icon(
                                          agency != null ? Icons.apartment : Icons.person_outline,
                                          color: agency != null ? LiveColors.primaryAccent : const Color(0xFFC084FC),
                                          size: 20,
                                        ),
                                        const SizedBox(width: 8),
                                        Expanded(
                                          child: Text(
                                            (agency != null ? 'Affiliated Talent Agency Contract' : 'Independent Broadcaster Model').tr,
                                            style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 12),
                                    if (agency != null) ...[
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text('Agency Name:'.tr, style: TextStyle(color: LiveColors.textSecondary, fontSize: 12)),
                                          Text('${agency['name']} (${agency['code']})', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                                        ],
                                      ),
                                      const SizedBox(height: 6),
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text('Commission Share Breakdown:'.tr, style: TextStyle(color: LiveColors.textSecondary, fontSize: 12)),
                                          Text(
                                            'Host: ${rates?['hostCutPercent'] ?? 42}% • Agency: ${agency['commissionPercent'] ?? 13}% • Platform: ${rates?['platformCutPercent'] ?? 45}%',
                                            style: const TextStyle(color: LiveColors.gold, fontWeight: FontWeight.bold, fontSize: 11, fontFamily: 'monospace'),
                                          ),
                                        ],
                                      ),
                                    ] else ...[
                                      Text(
                                        'You are currently an Independent Host. You receive the full creator allocation directly with zero agency cut.'.tr,
                                        style: const TextStyle(color: LiveColors.textSecondary, fontSize: 12),
                                      ),
                                      const SizedBox(height: 6),
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text('Independent Split Ratio:'.tr, style: TextStyle(color: LiveColors.textSecondary, fontSize: 12)),
                                          Text(
                                            'Host: ${rates?['hostCutPercent'] ?? 55}% • Platform: ${rates?['platformCutPercent'] ?? 45}%',
                                            style: const TextStyle(color: LiveColors.waveGreen, fontWeight: FontWeight.bold, fontSize: 11, fontFamily: 'monospace'),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ],
                                ),
                              ),

                              const SizedBox(height: 16),

                              // Tab Bar with LiveColors gradient indicator
                              Container(
                                decoration: BoxDecoration(
                                  color: LiveColors.backgroundSurface,
                                  borderRadius: BorderRadius.circular(14),
                                  border: Border.all(color: LiveColors.border),
                                ),
                                child: TabBar(
                                  controller: _tabController,
                                  indicator: BoxDecoration(
                                    gradient: LiveColors.primaryGradient,
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  labelColor: Colors.white,
                                  unselectedLabelColor: LiveColors.textSecondary,
                                  labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                                  tabs: [
                                    Tab(text: '${'Stream Sessions'.tr} (${streamSessions.length})'),
                                    Tab(text: '${'Gift Ledger'.tr} (${recentTransactions.length})'),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                    body: TabBarView(
                      controller: _tabController,
                      children: [
                        // Tab 1: Stream Sessions
                        _buildStreamSessionsTab(streamSessions),

                        // Tab 2: Gift Transactions Ledger
                        _buildGiftLedgerTab(recentTransactions),
                      ],
                    ),
                  ),
                ),
    );
  }

  Widget _buildMetricColumn(String label, String value) {
    return Column(
      children: [
        Text(value, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
        const SizedBox(height: 2),
        Text(label.tr, style: const TextStyle(color: Colors.white60, fontSize: 10)),
      ],
    );
  }

  Widget _buildMetricDivider() {
    return Container(width: 1, height: 28, color: Colors.white12);
  }

  Widget _buildStreamSessionsTab(List<dynamic> sessions) {
    if (sessions.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.live_tv, color: Colors.white.withValues(alpha: 0.3), size: 48),
              const SizedBox(height: 12),
              Text('No Stream Sessions Yet'.tr, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
              const SizedBox(height: 6),
              Text(
                'Start a live broadcast from the home screen to see your session earnings, viewer peaks, and gift reports!'.tr,
                style: const TextStyle(color: Colors.white60, fontSize: 12),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemCount: sessions.length,
      itemBuilder: (context, idx) {
        final session = sessions[idx];
        final gifts = (session['gifts'] as List<dynamic>?) ?? [];
        final isLive = session['status'] == 'LIVE';

        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          decoration: BoxDecoration(
            color: LiveColors.backgroundSurface,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: isLive ? LiveColors.primaryAccent.withValues(alpha: 0.6) : LiveColors.border,
            ),
          ),
          child: ExpansionTile(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
            collapsedShape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
            backgroundColor: Colors.transparent,
            collapsedBackgroundColor: Colors.transparent,
            iconColor: Colors.white70,
            collapsedIconColor: Colors.white70,
            leading: Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: isLive ? const Color(0xFF10B981).withValues(alpha: 0.2) : Colors.white10,
                shape: BoxShape.circle,
              ),
              child: Icon(
                session['roomType'] == 'VOICE' ? Icons.mic : Icons.videocam,
                color: isLive ? const Color(0xFF34D399) : Colors.white70,
                size: 20,
              ),
            ),
            title: Text(
              (session['title'] as String?)?.tr ?? 'Live Broadcast'.tr,
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            subtitle: Text(
              '${session['durationMinutes'] ?? 1} ${'mins'.tr} • ${session['peakViewers'] ?? 0} ${'Peak Viewers'.tr}',
              style: const TextStyle(color: Colors.white60, fontSize: 11),
            ),
            trailing: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  '+${session['diamondsEarned'] ?? 0} 💎',
                  style: const TextStyle(color: Color(0xFF06B6D4), fontWeight: FontWeight.w900, fontSize: 13),
                ),
                Text(
                  isLive ? '🔴 LIVE'.tr : '⏹️ ENDED'.tr,
                  style: TextStyle(
                    color: isLive ? const Color(0xFF10B981) : Colors.grey,
                    fontSize: 9,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Divider(color: Colors.white12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Audience Coins Sent:'.tr, style: TextStyle(color: Colors.white60, fontSize: 11)),
                        Text('${session['coinsDebitedTotal'] ?? 0} 🪙', style: const TextStyle(color: Color(0xFFF59E0B), fontWeight: FontWeight.bold, fontSize: 11)),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Net Streamer Diamonds Credited:'.tr, style: TextStyle(color: Colors.white60, fontSize: 11)),
                        Text('${session['diamondsEarned'] ?? 0} 💎 (≈ \$${(((session['diamondsEarned'] ?? 0) as num) * 0.01).toStringAsFixed(2)})', style: const TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.bold, fontSize: 11)),
                      ],
                    ),
                    if (session['agencyCutUSD'] != null && (session['agencyCutUSD'] as num) > 0) ...[
                      const SizedBox(height: 4),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Agency Commission Cut:'.tr, style: TextStyle(color: Colors.white60, fontSize: 11)),
                          Text('\$${session['agencyCutUSD']} USD', style: const TextStyle(color: Color(0xFFEC4899), fontWeight: FontWeight.bold, fontSize: 11)),
                        ],
                      ),
                    ],
                    const SizedBox(height: 10),
                    Text(
                      '${'Virtual Gifts in this Session'.tr} (${gifts.length}):',
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 11),
                    ),
                    const SizedBox(height: 6),
                    if (gifts.isEmpty)
                      Text('No gifts sent during this session.'.tr, style: TextStyle(color: Colors.white38, fontSize: 11, fontStyle: FontStyle.italic))
                    else
                      ...gifts.map((g) => Container(
                            margin: const EdgeInsets.only(bottom: 6),
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: LiveColors.backgroundElevated,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  children: [
                                    const Icon(Icons.card_giftcard, color: LiveColors.primaryAccent, size: 14),
                                    const SizedBox(width: 6),
                                    Text(
                                      '${'From'.tr} ${g['senderName'] ?? 'Audience'.tr}',
                                      style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600),
                                    ),
                                  ],
                                ),
                                Text(
                                  '+${g['diamondsAwarded'] ?? 0} 💎 (${g['coins'] ?? 0} 🪙)',
                                  style: const TextStyle(color: Color(0xFF34D399), fontWeight: FontWeight.bold, fontSize: 11),
                                ),
                              ],
                            ),
                          )),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildGiftLedgerTab(List<dynamic> transactions) {
    if (transactions.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.receipt_long, color: Colors.white.withValues(alpha: 0.3), size: 48),
              const SizedBox(height: 12),
              Text('No Transactions Yet'.tr, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
              const SizedBox(height: 6),
              Text(
                'When viewers send you gifts during live streams or voice parties, detailed ledger lines will log here.'.tr,
                style: const TextStyle(color: Colors.white60, fontSize: 12),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemCount: transactions.length,
      itemBuilder: (context, idx) {
        final t = transactions[idx];
        final timeStr = DateTime.tryParse(t['createdAt'] ?? '')?.toLocal().toString().split('.')[0] ?? '';

        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: LiveColors.backgroundSurface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: LiveColors.border),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: LiveColors.accentPurple.withValues(alpha: 0.2),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.diamond, color: Color(0xFFC084FC), size: 18),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Flexible(
                          child: Text(
                            '${'Gift from'.tr} ${t['senderName'] ?? 'Viewer'.tr}',
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '+${t['diamondsCredited'] ?? 0} 💎',
                          style: const TextStyle(color: LiveColors.waveGreen, fontWeight: FontWeight.w900, fontSize: 13),
                        ),
                      ],
                    ),
                    const SizedBox(height: 3),
                    if (t['roomTitle'] != null)
                      Text(
                        '${'Room:'.tr} ${t['roomTitle']}',
                        style: const TextStyle(color: Color(0xFF818CF8), fontSize: 11),
                      ),
                    if (t['notes'] != null)
                      Text(
                        (t['notes'] as String).tr,
                        style: const TextStyle(color: Colors.white60, fontSize: 10),
                      ),
                    const SizedBox(height: 4),
                    Text(
                      timeStr,
                      style: const TextStyle(color: Colors.white38, fontSize: 10, fontFamily: 'monospace'),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
