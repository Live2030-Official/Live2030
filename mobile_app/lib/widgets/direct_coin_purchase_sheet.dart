import '../localization/app_locale_service.dart';
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';

class DirectCoinPurchaseSheet extends StatefulWidget {
  const DirectCoinPurchaseSheet({super.key});

  static Future<void> show(BuildContext context) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => const DirectCoinPurchaseSheet(),
    );
  }

  @override
  State<DirectCoinPurchaseSheet> createState() => _DirectCoinPurchaseSheetState();
}

class _DirectCoinPurchaseSheetState extends State<DirectCoinPurchaseSheet>
    with WidgetsBindingObserver {
  bool _isLoading = true;
  bool _isProcessing = false;
  String? _activeOrderId;
  Timer? _statusPollingTimer;

  List<Map<String, dynamic>> _packages = [];
  Map<String, dynamic>? _selectedPackage;
  bool _isSandbox = true;
  String _currency = 'SAR';
  List<Map<String, dynamic>> _testCards = [];

  // Success state
  bool _isSuccess = false;
  int _coinsCredited = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _loadPackages();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _statusPollingTimer?.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // When returning from payment browser/app, check status immediately
    if (state == AppLifecycleState.resumed && _activeOrderId != null && !_isSuccess) {
      _checkPaymentStatus(_activeOrderId!);
    }
  }

  Future<void> _loadPackages() async {
    setState(() => _isLoading = true);
    try {
      final res = await ApiService().getCoinPackages();
      if (mounted) {
        final pkgs = List<Map<String, dynamic>>.from(res['packages'] ?? []);
        setState(() {
          _packages = pkgs;
          _selectedPackage = pkgs.firstWhere(
            (p) => p['popular'] == true,
            orElse: () => pkgs.isNotEmpty ? pkgs[1] : <String, dynamic>{},
          );
          _isSandbox = res['isSandbox'] == true;
          _currency = res['currency'] ?? 'SAR';
          _testCards = List<Map<String, dynamic>>.from(res['testCards'] ?? []);
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('Error loading packages: $e');
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _initiateRsomPayCheckout() async {
    if (_selectedPackage == null) return;

    final coins = (_selectedPackage!['totalCoins'] ?? _selectedPackage!['coins']) as int;
    final amountSAR = (_selectedPackage!['amountSAR'] as num).toDouble();
    final packageId = _selectedPackage!['id'] as String?;

    setState(() => _isProcessing = true);

    try {
      final orderRes = await ApiService().createRsomPayOrder(
        coins: coins,
        amountSAR: amountSAR,
        packageId: packageId,
      );

      if (orderRes != null && orderRes['success'] == true) {
        final checkoutUrl = orderRes['checkoutUrl'] as String?;
        final orderId = orderRes['orderId'] as String?;
        _activeOrderId = orderId;

        if (checkoutUrl != null && checkoutUrl.isNotEmpty) {
          // If the checkout URL is on direct IP:4000 (HTTP without SSL), ensure it uses http://
          String sanitizedUrl = checkoutUrl;
          if (sanitizedUrl.startsWith('https://') && (sanitizedUrl.contains(':4000') || RegExp(r'https://\d+\.\d+\.\d+\.\d+').hasMatch(sanitizedUrl))) {
            sanitizedUrl = sanitizedUrl.replaceFirst('https://', 'http://');
          }

          final uri = Uri.parse(sanitizedUrl);
          final launched = await launchUrl(
            uri,
            mode: LaunchMode.externalApplication,
          );

          if (!launched) {
            // Fallback launch
            await launchUrl(uri, mode: LaunchMode.inAppBrowserView);
          }

          // Start polling every 4 seconds in background for confirmation
          _startStatusPolling(orderId!);
        } else {
          _showError('Gateway did not return checkout link. Please try again.');
          setState(() => _isProcessing = false);
        }
      } else {
        _showError('Could not initialize checkout order. Please try again.');
        setState(() => _isProcessing = false);
      }
    } catch (e) {
      debugPrint('Error launching RsomPay: $e');
      _showError('Connection error while contacting RsomPay.');
      setState(() => _isProcessing = false);
    }
  }

  void _startStatusPolling(String orderId) {
    _statusPollingTimer?.cancel();
    int attempts = 0;
    _statusPollingTimer = Timer.periodic(const Duration(seconds: 3), (timer) async {
      attempts++;
      if (attempts > 40 || _isSuccess) {
        timer.cancel();
        return;
      }
      await _checkPaymentStatus(orderId, isPolling: true);
    });
  }

  Future<void> _checkPaymentStatus(String orderId, {bool isPolling = false}) async {
    try {
      final res = await ApiService().verifyPaymentStatus(orderId);
      if (res != null && res['status'] == 'PAID') {
        _statusPollingTimer?.cancel();
        final credited = (res['coinsCredited'] ?? _selectedPackage?['totalCoins'] ?? 0) as int;
        final currentCoins = (res['currentCoins'] ?? 0) as int;

        // Update local session
        if (currentCoins > 0) {
          await AuthService().updateCoins(currentCoins);
        } else {
          await AuthService().refreshUser();
        }

        if (mounted) {
          setState(() {
            _isSuccess = true;
            _coinsCredited = credited;
            _isProcessing = false;
          });
        }
      } else if (!isPolling && mounted) {
        setState(() => _isProcessing = false);
      }
    } catch (e) {
      debugPrint('Error checking status: $e');
      if (!isPolling && mounted) {
        setState(() => _isProcessing = false);
      }
    }
  }

  void _showError(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: Colors.redAccent,
        content: Text(message, style: GoogleFonts.plusJakartaSans(color: Colors.white)),
      ),
    );
  }

  void _copyTestCard(String cardNumber) async {
    await Clipboard.setData(ClipboardData(text: cardNumber));
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: const Color(0xFF10B981),
          duration: const Duration(seconds: 2),
          content: Text('Test card copied to clipboard!'.tr),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = AuthService().currentUser;

    return Container(
      height: MediaQuery.of(context).size.height * 0.88,
      decoration: const BoxDecoration(
        color: Color(0xFF130924),
        borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
        border: Border(top: BorderSide(color: Color(0xFF4A1A80), width: 1.5)),
      ),
      child: _isSuccess ? _buildSuccessView() : _buildPurchaseView(user),
    );
  }

  Widget _buildPurchaseView(user) {
    return Column(
      children: [
        // Handle bar
        Center(
          child: Container(
            margin: const EdgeInsets.only(top: 12, bottom: 8),
            width: 44,
            height: 5,
            decoration: BoxDecoration(
              color: Colors.white24,
              borderRadius: BorderRadius.circular(99),
            ),
          ),
        ),

        // Header
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [Color(0xFF8B25FF), Color(0xFFFF2B85)]),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const Icon(Icons.flash_on_rounded, color: Colors.white, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Direct Coin Top-Up',
                      style: GoogleFonts.plusJakartaSans(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    Text(
                      'Official RsomPay Gateway (Mada • Visa • Apple Pay)',
                      style: GoogleFonts.plusJakartaSans(
                        color: LiveColors.textSecondary,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close_rounded, color: Colors.white70),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
        ),

        const Divider(color: Color(0xFF26123D), height: 1),

        // Body content
        Expanded(
          child: _isLoading
              ? const Center(child: CircularProgressIndicator(color: Color(0xFFFF2B85)))
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Current Balance Card
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1E0D36),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFF3B1863)),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 36,
                              height: 36,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: const Color(0xFFF59E0B).withValues(alpha: 0.2),
                              ),
                              alignment: Alignment.center,
                              child: const Icon(Icons.monetization_on_rounded, color: Color(0xFFFBBF24), size: 20),
                            ),
                            const SizedBox(width: 12),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Current Coin Balance'.tr,
                                  style: GoogleFonts.plusJakartaSans(color: LiveColors.textSecondary, fontSize: 11),
                                ),
                                Text(
                                  '${user?.coins ?? 0} 🪙',
                                  style: GoogleFonts.plusJakartaSans(
                                    color: const Color(0xFFFBBF24),
                                    fontSize: 18,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ],
                            ),
                            const Spacer(),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: const Color(0xFF10B981).withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.4)),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.verified_rounded, color: Color(0xFF10B981), size: 14),
                                  const SizedBox(width: 4),
                                  Text(
                                    'Instant Credit'.tr,
                                    style: GoogleFonts.plusJakartaSans(
                                      color: const Color(0xFF10B981),
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 16),

                      // Sandbox banner
                      if (_isSandbox) _buildSandboxNoticeBanner(),

                      const SizedBox(height: 20),

                      Text(
                        'SELECT COIN PACKAGE'.tr,
                        style: GoogleFonts.plusJakartaSans(
                          color: LiveColors.textSecondary,
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 1.2,
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Packages Grid
                      GridView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          crossAxisSpacing: 12,
                          mainAxisSpacing: 12,
                          childAspectRatio: 1.15,
                        ),
                        itemCount: _packages.length,
                        itemBuilder: (context, index) {
                          final pkg = _packages[index];
                          final isSelected = _selectedPackage?['id'] == pkg['id'];
                          return _buildPackageCard(pkg, isSelected);
                        },
                      ),

                      const SizedBox(height: 20),

                      // Supported Payment Badges
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: const Color(0xFF190B2E),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFF331554)),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceAround,
                          children: [
                            _buildMethodBadge('MADA', const Color(0xFF00A651)),
                            _buildMethodBadge('VISA', const Color(0xFF1A1F71)),
                            _buildMethodBadge('MASTERCARD', const Color(0xFFEB001B)),
                            _buildMethodBadge('APPLE PAY', Colors.white),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
        ),

        // Bottom checkout button bar
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          decoration: const BoxDecoration(
            color: Color(0xFF1A0A30),
            border: Border(top: BorderSide(color: Color(0xFF3D166B))),
          ),
          child: SafeArea(
            top: false,
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'Total Payable'.tr,
                        style: GoogleFonts.plusJakartaSans(color: LiveColors.textSecondary, fontSize: 11),
                      ),
                      Text(
                        '${_selectedPackage?['amountSAR'] ?? 0} $_currency',
                        style: GoogleFonts.plusJakartaSans(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ],
                  ),
                ),
                ElevatedButton(
                  onPressed: _isProcessing ? null : _initiateRsomPayCheckout,
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 16),
                    backgroundColor: const Color(0xFFFF2B85),
                    disabledBackgroundColor: Colors.white24,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    elevation: 8,
                    shadowColor: const Color(0xFFFF2B85).withValues(alpha: 0.5),
                  ),
                  child: _isProcessing
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                        )
                      : Row(
                          children: [
                            const Icon(Icons.lock_outline_rounded, size: 18, color: Colors.white),
                            const SizedBox(width: 8),
                            Text(
                              'Pay with RsomPay'.tr,
                              style: GoogleFonts.plusJakartaSans(
                                color: Colors.white,
                                fontWeight: FontWeight.w800,
                                fontSize: 15,
                              ),
                            ),
                          ],
                        ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildPackageCard(Map<String, dynamic> pkg, bool isSelected) {
    final coins = (pkg['totalCoins'] ?? pkg['coins']) as int;
    final amountSAR = pkg['amountSAR'];
    final badge = pkg['badge'] as String?;

    return GestureDetector(
      onTap: () => setState(() => _selectedPackage = pkg),
      child: Container(
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF321356) : const Color(0xFF1E0D36),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? const Color(0xFFFF2B85) : const Color(0xFF38155E),
            width: isSelected ? 2 : 1,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: const Color(0xFFFF2B85).withValues(alpha: 0.3),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  )
                ]
              : [],
        ),
        child: Stack(
          children: [
            Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: const Color(0xFFF59E0B).withValues(alpha: 0.2),
                        ),
                        child: const Icon(Icons.monetization_on_rounded, color: Color(0xFFFBBF24), size: 18),
                      ),
                      const Spacer(),
                      if (isSelected)
                        const Icon(Icons.check_circle_rounded, color: Color(0xFFFF2B85), size: 20),
                    ],
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${coins.toLocaleString()} 🪙',
                        style: GoogleFonts.plusJakartaSans(
                          color: Colors.white,
                          fontSize: 17,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '$amountSAR $_currency',
                        style: GoogleFonts.plusJakartaSans(
                          color: const Color(0xFF38BDF8),
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            if (badge != null && badge.isNotEmpty)
              Positioned(
                top: 0,
                right: 0,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(colors: [Color(0xFFFF2B85), Color(0xFF8B25FF)]),
                    borderRadius: const BorderRadius.only(
                      topRight: Radius.circular(19),
                      bottomLeft: Radius.circular(12),
                    ),
                  ),
                  child: Text(
                    badge.tr,
                    style: GoogleFonts.plusJakartaSans(
                      color: Colors.white,
                      fontSize: 9,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildSandboxNoticeBanner() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF0C2A4D),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF0284C7)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.science_rounded, color: Color(0xFF38BDF8), size: 18),
              const SizedBox(width: 8),
              Text(
                'RsomPay Sandbox Demo Mode',
                style: GoogleFonts.plusJakartaSans(
                  color: const Color(0xFF38BDF8),
                  fontWeight: FontWeight.w800,
                  fontSize: 12,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            'Test with official sandbox cards (no real charges):',
            style: GoogleFonts.plusJakartaSans(color: Colors.white70, fontSize: 11),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _testCards.map((card) {
              final brand = card['brand'] ?? 'Card';
              final number = card['cardNumber'] ?? '';
              return GestureDetector(
                onTap: () => _copyTestCard(number),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E3A5F),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFF38BDF8).withValues(alpha: 0.5)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        '$brand: $number',
                        style: GoogleFonts.firaCode(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(width: 6),
                      const Icon(Icons.copy_rounded, color: Colors.white70, size: 12),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildMethodBadge(String title, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.4)),
      ),
      child: Text(
        title,
        style: GoogleFonts.plusJakartaSans(
          color: color,
          fontSize: 10,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }

  Widget _buildSuccessView() {
    return Container(
      padding: const EdgeInsets.all(32),
      width: double.infinity,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 90,
            height: 90,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: const LinearGradient(colors: [Color(0xFF10B981), Color(0xFF059669)]),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF10B981).withValues(alpha: 0.45),
                  blurRadius: 28,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: const Icon(Icons.check_circle_rounded, color: Colors.white, size: 54),
          ),
          const SizedBox(height: 24),
          Text(
            'Recharge Successful! 🎉'.tr,
            style: GoogleFonts.plusJakartaSans(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            '+${_coinsCredited.toLocaleString()} Coins',
            style: GoogleFonts.plusJakartaSans(
              color: const Color(0xFFFBBF24),
              fontSize: 32,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            'Coins have been securely credited to your Live 2030 wallet via RsomPay.'.tr,
            textAlign: TextAlign.center,
            style: GoogleFonts.plusJakartaSans(
              color: LiveColors.textSecondary,
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 36),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () => Navigator.pop(context),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                backgroundColor: const Color(0xFF10B981),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              child: Text(
                'Awesome, Back to App!'.tr,
                style: GoogleFonts.plusJakartaSans(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

extension NumberFormatting on int {
  String toLocaleString() {
    return toString().replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
      (Match m) => '${m[1]},',
    );
  }
}
