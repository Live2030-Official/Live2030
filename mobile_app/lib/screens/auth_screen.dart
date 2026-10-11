import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';
import '../widgets/country_code_picker.dart';
import '../localization/app_locale_service.dart';
import '../localization/language_selection_sheet.dart';

class AuthScreen extends StatefulWidget {
  final VoidCallback onLoginSuccess;

  const AuthScreen({super.key, required this.onLoginSuccess});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> with SingleTickerProviderStateMixin {
  bool _isLoading = false;
  late AnimationController _animController;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 16),
    )..repeat();
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  void _showPhoneLoginModal() {
    final phoneController = TextEditingController();
    final otpController = TextEditingController();
    CountryItem selectedCountry = CountryCodePicker.findByDialCode('+91');
    String countryCode = selectedCountry.dialCode;
    bool otpSent = false;
    bool isSending = false;
    bool isVerifying = false;
    int cooldownSeconds = 0;
    Timer? countdownTimer;
    String? statusMessage;
    bool isSuccessMessage = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: LiveColors.backgroundSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (modalCtx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          void startCooldown() {
            countdownTimer?.cancel();
            cooldownSeconds = 60;
            countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
              if (cooldownSeconds > 1) {
                setModalState(() {
                  cooldownSeconds--;
                });
              } else {
                setModalState(() {
                  cooldownSeconds = 0;
                });
                timer.cancel();
              }
            });
          }

          return Padding(
            padding: EdgeInsets.only(
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
              left: 20,
              right: 20,
              top: 24,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
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
                            gradient: const LinearGradient(
                              colors: [Color(0xFF10B981), Color(0xFF059669)],
                            ),
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFF10B981).withValues(alpha: 0.35),
                                blurRadius: 8,
                              ),
                            ],
                          ),
                          child: const Icon(Icons.phone_android, color: Colors.white, size: 18),
                        ),
                        const SizedBox(width: 10),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Phone Number Login'.tr,
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                            Text(
                              'Instant MSG91 SMS OTP Verification'.tr,
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 11,
                                color: const Color(0xFF10B981),
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, color: LiveColors.textSecondary),
                      onPressed: () {
                        countdownTimer?.cancel();
                        Navigator.pop(ctx);
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                if (statusMessage != null) ...[
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: isSuccessMessage
                          ? const Color(0xFF10B981).withValues(alpha: 0.15)
                          : const Color(0xFFEF4444).withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isSuccessMessage ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                        width: 0.8,
                      ),
                    ),
                    child: Text(
                      statusMessage!,
                      style: TextStyle(
                        fontSize: 12,
                        color: isSuccessMessage ? const Color(0xFF34D399) : const Color(0xFFF87171),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                ],

                // Mobile Number Input Row
                Text(
                  'Enter Mobile Number'.tr,
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: LiveColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 8),

                Row(
                  children: [
                    // Country Code Picker Button (All 200+ Countries)
                    InkWell(
                      onTap: () async {
                        final picked = await CountryCodePicker.showPicker(
                          context: ctx,
                          selectedCountry: selectedCountry,
                        );
                        if (picked != null) {
                          setModalState(() {
                            selectedCountry = picked;
                            countryCode = picked.dialCode;
                          });
                        }
                      },
                      borderRadius: BorderRadius.circular(14),
                      child: Container(
                        height: 48,
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                        decoration: BoxDecoration(
                          color: LiveColors.backgroundInput,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: Colors.white12),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(selectedCountry.flag, style: const TextStyle(fontSize: 18)),
                            const SizedBox(width: 5),
                            Text(
                              selectedCountry.dialCode,
                              style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(width: 2),
                            const Icon(Icons.arrow_drop_down_rounded, color: Colors.white70, size: 20),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),

                    // Phone Number Field
                    Expanded(
                      child: SizedBox(
                        height: 48,
                        child: TextField(
                          controller: phoneController,
                          keyboardType: TextInputType.phone,
                          style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600),
                          decoration: InputDecoration(
                            hintText: '9876543210',
                            hintStyle: const TextStyle(color: Colors.white24, fontSize: 13),
                            filled: true,
                            fillColor: LiveColors.backgroundInput,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(14),
                              borderSide: BorderSide.none,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),

                // OTP Input Field (shown after OTP requested)
                if (otpSent) ...[
                  Text(
                    'Enter 6-Digit OTP'.tr,
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: LiveColors.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 8),

                  SizedBox(
                    height: 48,
                    child: TextField(
                      controller: otpController,
                      keyboardType: TextInputType.number,
                      maxLength: 6,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        letterSpacing: 6,
                        fontWeight: FontWeight.bold,
                      ),
                      decoration: InputDecoration(
                        counterText: '',
                        hintText: '••••••',
                        hintStyle: const TextStyle(color: Colors.white24, letterSpacing: 4),
                        filled: true,
                        fillColor: LiveColors.backgroundInput,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: BorderSide.none,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                ],

                // Action Buttons: Send OTP / Verify & Login
                if (!otpSent) ...[
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF10B981),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                        elevation: 2,
                      ),
                      onPressed: isSending ? null : () async {
                        final rawNumber = phoneController.text.trim();
                        if (rawNumber.length < 6) {
                          setModalState(() {
                            statusMessage = 'Please enter a valid mobile number';
                            isSuccessMessage = false;
                          });
                          return;
                        }

                        final fullNumber = '$countryCode$rawNumber';
                        setModalState(() {
                          isSending = true;
                          statusMessage = null;
                        });

                        final res = await AuthService().sendPhoneOtp(fullNumber);

                        setModalState(() {
                          isSending = false;
                          if (res['success'] == true) {
                            otpSent = true;
                            isSuccessMessage = true;
                            if (res['isDemoAccount'] == true || rawNumber == '1111111111') {
                              otpController.text = '000000';
                              statusMessage = 'App Store Reviewer Demo Mode: Code 000000 ready';
                            } else {
                              statusMessage = res['message'] ?? 'OTP sent successfully! Enter code below.';
                              startCooldown();
                            }
                          } else {
                            isSuccessMessage = false;
                            statusMessage = res['message'] ?? 'Failed to send OTP';
                          }
                        });
                      },
                      child: isSending
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                            )
                          : Text(
                              'Send Verification OTP SMS'.tr,
                              style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.bold),
                            ),
                    ),
                  ),
                ] else ...[
                  // Verify & Login Button
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF10B981),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                        elevation: 2,
                      ),
                      onPressed: isVerifying ? null : () async {
                        final code = otpController.text.trim();
                        if (code.length < 4) {
                          setModalState(() {
                            statusMessage = 'Please enter the 6-digit OTP code';
                            isSuccessMessage = false;
                          });
                          return;
                        }

                        final rawNumber = phoneController.text.trim();
                        final fullNumber = '$countryCode$rawNumber';

                        setModalState(() {
                          isVerifying = true;
                          statusMessage = null;
                        });

                        final res = await AuthService().verifyPhoneOtpAndLogin(
                          phone: fullNumber,
                          otp: code,
                        );

                        if (res['success'] == true) {
                          countdownTimer?.cancel();
                          if (ctx.mounted) Navigator.pop(ctx);
                          if (mounted) widget.onLoginSuccess();
                        } else {
                          setModalState(() {
                            isVerifying = false;
                            isSuccessMessage = false;
                            statusMessage = res['message'] ?? 'Verification failed';
                          });
                        }
                      },
                      child: isVerifying
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                            )
                          : Text(
                              'Verify OTP & Login'.tr,
                              style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.bold),
                            ),
                    ),
                  ),
                  const SizedBox(height: 10),

                  // Resend OTP with Cooldown Timer
                  Center(
                    child: TextButton(
                      onPressed: cooldownSeconds > 0 || isSending ? null : () async {
                        final rawNumber = phoneController.text.trim();
                        final fullNumber = '$countryCode$rawNumber';

                        setModalState(() => isSending = true);
                        final res = await AuthService().sendPhoneOtp(fullNumber);

                        setModalState(() {
                          isSending = false;
                          if (res['success'] == true) {
                            isSuccessMessage = true;
                            statusMessage = 'New OTP sent to $fullNumber';
                            startCooldown();
                          } else {
                            isSuccessMessage = false;
                            statusMessage = res['message'] ?? 'Failed to resend';
                          }
                        });
                      },
                      child: Text(
                        cooldownSeconds > 0
                            ? 'Resend OTP in ${cooldownSeconds}s'
                            : 'Didn\'t receive code? Resend OTP',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: cooldownSeconds > 0 ? LiveColors.textSecondary : const Color(0xFF10B981),
                        ),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }

  void _showGoogleAccountPicker() {
    final emailController = TextEditingController(text: 'alex.streamer@gmail.com');
    final nameController = TextEditingController(text: 'Alex Streamer');

    showModalBottomSheet(
      context: context,
      backgroundColor: LiveColors.backgroundSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
          left: 20,
          right: 20,
          top: 24,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: const BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                      ),
                      child: const Text('G', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: LiveColors.accentBlue)),
                    ),
                    const SizedBox(width: 10),
                    Text('Sign in with Google'.tr,
                      style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: LiveColors.textSecondary),
                  onPressed: () => Navigator.pop(ctx),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Text('Select or confirm your Google Account to authenticate with Live 2030:'.tr,
              style: GoogleFonts.plusJakartaSans(fontSize: 12, color: LiveColors.textSecondary),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: emailController,
              style: const TextStyle(color: Colors.white, fontSize: 13),
              decoration: InputDecoration(
                labelText: 'Google Email'.tr,
                labelStyle: const TextStyle(color: LiveColors.textSecondary),
                filled: true,
                fillColor: LiveColors.backgroundInput,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
                prefixIcon: const Icon(Icons.email_outlined, color: LiveColors.accentBlue),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: nameController,
              style: const TextStyle(color: Colors.white, fontSize: 13),
              decoration: InputDecoration(
                labelText: 'Account Name'.tr,
                labelStyle: const TextStyle(color: LiveColors.textSecondary),
                filled: true,
                fillColor: LiveColors.backgroundInput,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
                prefixIcon: const Icon(Icons.person_outline, color: LiveColors.accentBlue),
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: LiveColors.accentBlue,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                ),
                onPressed: () async {
                  Navigator.pop(ctx);
                  setState(() => _isLoading = true);

                  final success = await AuthService().loginGoogle(
                    email: emailController.text.trim(),
                    displayName: nameController.text.trim(),
                    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
                  );

                  setState(() => _isLoading = false);

                  if (success && mounted) {
                    widget.onLoginSuccess();
                  }
                },
                child: Text('Continue with Google Account'.tr, style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.bold, fontSize: 14)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showAppleAccountPicker() {
    final appleIdController = TextEditingController(text: '001928.34e892c90df14f25b11a.1923');
    final emailController = TextEditingController(text: 'user@privaterelay.appleid.com');
    final nameController = TextEditingController(text: 'Apple User');

    showModalBottomSheet(
      context: context,
      backgroundColor: LiveColors.backgroundSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
          left: 20,
          right: 20,
          top: 24,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: const BoxDecoration(
                        color: Colors.black,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.apple, color: Colors.white, size: 20),
                    ),
                    const SizedBox(width: 10),
                    Text('Sign in with Apple'.tr, style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: LiveColors.textSecondary),
                  onPressed: () => Navigator.pop(ctx),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Text('Confirm your Apple credentials or test simulated Apple ID authentication:'.tr,
              style: GoogleFonts.plusJakartaSans(fontSize: 12, color: LiveColors.textSecondary),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: appleIdController,
              style: const TextStyle(color: Colors.white, fontSize: 13),
              decoration: InputDecoration(
                labelText: 'Apple User Identifier (sub)'.tr,
                labelStyle: const TextStyle(color: LiveColors.textSecondary),
                filled: true,
                fillColor: LiveColors.backgroundInput,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
                prefixIcon: const Icon(Icons.fingerprint, color: Colors.white70),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: emailController,
              style: const TextStyle(color: Colors.white, fontSize: 13),
              decoration: InputDecoration(
                labelText: 'Apple Relay / Email (Optional)'.tr,
                labelStyle: const TextStyle(color: LiveColors.textSecondary),
                filled: true,
                fillColor: LiveColors.backgroundInput,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
                prefixIcon: const Icon(Icons.email_outlined, color: Colors.white70),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: nameController,
              style: const TextStyle(color: Colors.white, fontSize: 13),
              decoration: InputDecoration(
                labelText: 'Display Name (Optional)'.tr,
                labelStyle: const TextStyle(color: LiveColors.textSecondary),
                filled: true,
                fillColor: LiveColors.backgroundInput,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
                prefixIcon: const Icon(Icons.person_outline, color: Colors.white70),
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: Colors.black87,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                ),
                onPressed: () async {
                  Navigator.pop(ctx);
                  setState(() => _isLoading = true);

                  final success = await AuthService().loginApple(
                    appleId: appleIdController.text.trim(),
                    email: emailController.text.trim().isNotEmpty ? emailController.text.trim() : null,
                    displayName: nameController.text.trim().isNotEmpty ? nameController.text.trim() : null,
                    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
                  );

                  setState(() => _isLoading = false);

                  if (success && mounted) {
                    widget.onLoginSuccess();
                  }
                },
                child: Text('Continue with Apple ID'.tr, style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.bold, fontSize: 14)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _handleGuestLogin() async {
    setState(() => _isLoading = true);
    final success = await AuthService().loginGuest();
    setState(() => _isLoading = false);

    if (success && mounted) {
      widget.onLoginSuccess();
    }
  }

  Future<void> _handleGoogleSignIn() async {
    setState(() => _isLoading = true);
    final res = await AuthService().signInWithGoogle();
    setState(() => _isLoading = false);

    if (!mounted) return;

    if (res['success'] == true) {
      widget.onLoginSuccess();
    } else if (res['cancelled'] != true) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            res['error'] ?? 'Sign in failed. Check network or use fallback.',
            style: const TextStyle(color: Colors.white, fontSize: 13),
          ),
          backgroundColor: const Color(0xFFEF4444),
          action: SnackBarAction(
            label: 'Manual Login'.tr,
            textColor: Colors.white,
            onPressed: _showGoogleAccountPicker,
          ),
        ),
      );
    }
  }

  Future<void> _handleAppleSignIn() async {
    setState(() => _isLoading = true);
    final res = await AuthService().signInWithApple();
    setState(() => _isLoading = false);

    if (!mounted) return;

    if (res['success'] == true) {
      widget.onLoginSuccess();
    } else if (res['cancelled'] != true) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            res['error'] ?? 'Apple sign in failed. Check network or use fallback.',
            style: const TextStyle(color: Colors.white, fontSize: 13),
          ),
          backgroundColor: const Color(0xFFEF4444),
          action: SnackBarAction(
            label: 'Manual Login'.tr,
            textColor: Colors.white,
            onPressed: _showAppleAccountPicker,
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final bool isIOS = defaultTargetPlatform == TargetPlatform.iOS;

    return Scaffold(
      backgroundColor: LiveColors.background,
      body: Stack(
        children: [
          // Deep royal cosmic background gradient
          Positioned.fill(
            child: Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Color(0xFF260D42), // Rich deep violet
                    Color(0xFF1B0731), // Eggplant
                    Color(0xFF120320), // Darkest royal base
                  ],
                ),
              ),
            ),
          ),

          SafeArea(
            child: SingleChildScrollView(
              physics: const BouncingScrollPhysics(),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                child: Column(
                  children: [
                    // Language Switcher Pill
                    Align(
                      alignment: Alignment.topRight,
                      child: InkWell(
                        onTap: () => LanguageSelectionSheet.show(context),
                        borderRadius: BorderRadius.circular(16),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                          decoration: BoxDecoration(
                            color: LiveColors.backgroundSurface.withValues(alpha: 0.8),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: LiveColors.accentPurple.withValues(alpha: 0.5)),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(AppLocaleService().currentLanguage.flag, style: const TextStyle(fontSize: 14)),
                              const SizedBox(width: 5),
                              Text(
                                AppLocaleService().currentLanguage.nativeName,
                                style: GoogleFonts.plusJakartaSans(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                ),
                              ),
                              const SizedBox(width: 4),
                              const Icon(Icons.keyboard_arrow_down_rounded, color: LiveColors.textSecondary, size: 16),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),

                    // Top Subtitle
                    Text(
                      'Live Streaming App'.tr,
                      textAlign: TextAlign.center,
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: LiveColors.accentPink,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 6),

                    // Main Headline
                    Text(
                      'Find your\nBest match'.tr,
                      textAlign: TextAlign.center,
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 34,
                        fontWeight: FontWeight.w900,
                        color: LiveColors.accentPink,
                        height: 1.15,
                        letterSpacing: 0.2,
                      ),
                    ),

                    const SizedBox(height: 16),

                    // Concentric Orbital Ring Graphic with Floating Avatars
                    SizedBox(
                      height: 310,
                      width: double.infinity,
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          // Concentric glowing orbital rings
                          CustomPaint(
                            size: const Size(310, 310),
                            painter: _OrbitalRingsPainter(),
                          ),

                          // Center Main Featured Couple/Host Circle
                          Container(
                            width: 120,
                            height: 120,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(color: LiveColors.accentPink, width: 3),
                              boxShadow: [
                                BoxShadow(
                                  color: LiveColors.accentPink.withValues(alpha: 0.45),
                                  blurRadius: 20,
                                  spreadRadius: 2,
                                ),
                              ],
                              image: const DecorationImage(
                                image: NetworkImage('https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400'),
                                fit: BoxFit.cover,
                              ),
                            ),
                          ),

                          // Floating Orbit Bubble 1: Top-Left Message Envelope Badge with 09
                          Positioned(
                            top: 48,
                            left: 36,
                            child: _buildBadgeBubble(
                              icon: Icons.mail,
                              color: const Color(0xFFFF2B72),
                              count: '09',
                              size: 38,
                            ),
                          ),

                          // Floating Orbit Bubble 2: Green Checkmark
                          Positioned(
                            top: 88,
                            left: 68,
                            child: Container(
                              width: 28,
                              height: 28,
                              decoration: const BoxDecoration(
                                shape: BoxShape.circle,
                                color: Color(0xFF10B981),
                              ),
                              child: const Icon(Icons.check, color: Colors.white, size: 16),
                            ),
                          ),

                          // Floating Orbit Bubble 3: Left Thumbs Up
                          Positioned(
                            bottom: 95,
                            left: 18,
                            child: Container(
                              width: 32,
                              height: 32,
                              decoration: const BoxDecoration(
                                shape: BoxShape.circle,
                                gradient: LinearGradient(
                                  colors: [Color(0xFFFF7A00), Color(0xFFFF4D00)],
                                ),
                              ),
                              child: const Icon(Icons.thumb_up, color: Colors.white, size: 16),
                            ),
                          ),

                          // Floating Orbit Bubble 4: Bottom-Left Male Avatar
                          Positioned(
                            bottom: 30,
                            left: 22,
                            child: _buildOrbitalAvatar(
                              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
                              36,
                            ),
                          ),

                          // Floating Orbit Bubble 5: Bottom-Center Woman Avatar
                          Positioned(
                            bottom: 6,
                            child: _buildOrbitalAvatar(
                              'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
                              48,
                              hasOnlineDot: true,
                            ),
                          ),

                          // Floating Orbit Bubble 6: Bottom-Right Pink Heart Bubble
                          Positioned(
                            bottom: 70,
                            right: 48,
                            child: Container(
                              width: 32,
                              height: 32,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                gradient: const LinearGradient(
                                  colors: [Color(0xFFFF2B85), Color(0xFFFF529D)],
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: LiveColors.accentPink.withValues(alpha: 0.5),
                                    blurRadius: 10,
                                  ),
                                ],
                              ),
                              child: const Icon(Icons.favorite, color: Colors.white, size: 17),
                            ),
                          ),

                          // Floating Orbit Bubble 7: Right Center Woman Avatar
                          Positioned(
                            top: 130,
                            right: 28,
                            child: _buildOrbitalAvatar(
                              'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
                              42,
                            ),
                          ),

                          // Floating Orbit Bubble 8: Top Right Male Avatar
                          Positioned(
                            top: 55,
                            right: 44,
                            child: _buildOrbitalAvatar(
                              'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
                              36,
                            ),
                          ),

                          // Orbiting Planets / Dots
                          const Positioned(
                            top: 60,
                            right: 120,
                            child: _PlanetDot(color: Color(0xFFFFD15C), size: 8),
                          ),
                          const Positioned(
                            top: 90,
                            right: 100,
                            child: _PlanetDot(color: Color(0xFF00D2FF), size: 7),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 20),

                    // Action Buttons (Platform Adaptive: Android = Phone, Google, Guest | iOS = Phone, Google, Apple)
                    if (_isLoading)
                      const Padding(
                        padding: EdgeInsets.all(24),
                        child: CircularProgressIndicator(color: LiveColors.accentPink),
                      )
                    else ...[
                      // 1. Log in with Mobile Number (MSG91 Phone OTP) — For Both Android & iOS
                      SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF10B981),
                            foregroundColor: Colors.white,
                            elevation: 4,
                            shadowColor: const Color(0xFF10B981).withValues(alpha: 0.4),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(26),
                            ),
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                          ),
                          onPressed: _showPhoneLoginModal,
                          child: Stack(
                            alignment: Alignment.center,
                            children: [
                              Align(
                                alignment: Alignment.centerLeft,
                                child: Container(
                                  width: 34,
                                  height: 34,
                                  decoration: const BoxDecoration(
                                    color: Colors.white,
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(Icons.phone_android, color: Color(0xFF10B981), size: 18),
                                ),
                              ),
                              Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 40),
                                child: Text('Log in with Mobile Number'.tr,
                                  textAlign: TextAlign.center,
                                  overflow: TextOverflow.ellipsis,
                                  style: GoogleFonts.plusJakartaSans(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 14),

                      // 2. Log in with Google — For Both Android & iOS
                      SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: LiveColors.accentBlue,
                            foregroundColor: Colors.white,
                            elevation: 4,
                            shadowColor: LiveColors.accentBlue.withValues(alpha: 0.5),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(26),
                            ),
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                          ),
                          onPressed: _handleGoogleSignIn,
                          child: Stack(
                            alignment: Alignment.center,
                            children: [
                              Align(
                                alignment: Alignment.centerLeft,
                                child: Container(
                                  width: 34,
                                  height: 34,
                                  decoration: const BoxDecoration(
                                    color: Colors.white,
                                    shape: BoxShape.circle,
                                  ),
                                  alignment: Alignment.center,
                                  child: const GoogleLogoWidget(size: 18),
                                ),
                              ),
                              Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 40),
                                child: Text('Log in with Google'.tr,
                                  textAlign: TextAlign.center,
                                  overflow: TextOverflow.ellipsis,
                                  style: GoogleFonts.plusJakartaSans(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 14),

                      // 3. Android Platform Option: Quick Login (Guest)
                      if (!isIOS) ...[
                        SizedBox(
                          width: double.infinity,
                          height: 52,
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFFFF2B72),
                              foregroundColor: Colors.white,
                              elevation: 4,
                              shadowColor: const Color(0xFFFF2B72).withValues(alpha: 0.5),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(26),
                              ),
                              padding: const EdgeInsets.symmetric(horizontal: 16),
                            ),
                            onPressed: _handleGuestLogin,
                            child: Stack(
                              alignment: Alignment.center,
                              children: [
                                Align(
                                  alignment: Alignment.centerLeft,
                                  child: Container(
                                    width: 34,
                                    height: 34,
                                    decoration: const BoxDecoration(
                                      color: Colors.white,
                                      shape: BoxShape.circle,
                                    ),
                                    child: const Icon(Icons.rocket_launch, color: Color(0xFFFF2B72), size: 18),
                                  ),
                                ),
                                Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 40),
                                  child: Text(
                                    'Quick Login (Guest)'.tr,
                                    textAlign: TextAlign.center,
                                    overflow: TextOverflow.ellipsis,
                                    style: GoogleFonts.plusJakartaSans(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 14),
                      ],

                      // 3. iOS Platform Option: Sign in with Apple
                      if (isIOS) ...[
                        SizedBox(
                          width: double.infinity,
                          height: 52,
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.black,
                              foregroundColor: Colors.white,
                              elevation: 4,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(26),
                                side: const BorderSide(color: Colors.white24, width: 1),
                              ),
                              padding: const EdgeInsets.symmetric(horizontal: 16),
                            ),
                            onPressed: _handleAppleSignIn,
                            child: Stack(
                              alignment: Alignment.center,
                              children: [
                                Align(
                                  alignment: Alignment.centerLeft,
                                  child: Container(
                                    width: 34,
                                    height: 34,
                                    decoration: const BoxDecoration(
                                      color: Colors.white,
                                      shape: BoxShape.circle,
                                    ),
                                    alignment: Alignment.center,
                                    child: const Icon(Icons.apple, color: Colors.black, size: 22),
                                  ),
                                ),
                                Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 40),
                                  child: Text(
                                    'Sign in with Apple'.tr,
                                    textAlign: TextAlign.center,
                                    overflow: TextOverflow.ellipsis,
                                    style: GoogleFonts.plusJakartaSans(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 14),
                      ],
                    ],

                    const SizedBox(height: 12),

                    // Footer Terms & Conditions
                    Text(
                      'By Signing up you will be agree to our'.tr,
                      textAlign: TextAlign.center,
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 12,
                        color: LiveColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          'Terms & Condition'.tr,
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: LiveColors.accentPink,
                            decoration: TextDecoration.underline,
                            decorationColor: LiveColors.accentPink,
                          ),
                        ),
                        Text(
                          ' and ',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 12,
                            color: LiveColors.textSecondary,
                          ),
                        ),
                        Text(
                          'Privacy Policy'.tr,
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: LiveColors.accentPink,
                            decoration: TextDecoration.underline,
                            decorationColor: LiveColors.accentPink,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOrbitalAvatar(String url, double size, {bool hasOnlineDot = false}) {
    return Stack(
      children: [
        Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white, width: 2),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.3),
                blurRadius: 8,
              ),
            ],
            image: DecorationImage(
              image: NetworkImage(url),
              fit: BoxFit.cover,
            ),
          ),
        ),
        if (hasOnlineDot)
          Positioned(
            left: 0,
            bottom: 4,
            child: Container(
              width: 10,
              height: 10,
              decoration: BoxDecoration(
                color: const Color(0xFF10B981),
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 1.5),
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildBadgeBubble({
    required IconData icon,
    required Color color,
    required String count,
    required double size,
  }) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Stack(
        alignment: Alignment.center,
        children: [
          Icon(icon, color: Colors.white, size: size * 0.55),
          Positioned(
            top: 2,
            right: 2,
            child: Text(
              count,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w900,
                fontSize: 9,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _PlanetDot extends StatelessWidget {
  final Color color;
  final double size;
  const _PlanetDot({required this.color, required this.size});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.7),
            blurRadius: 6,
          ),
        ],
      ),
    );
  }
}

class _OrbitalRingsPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);

    final Paint ring1 = Paint()
      ..color = const Color(0xFFFF2B85).withValues(alpha: 0.3)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.6;

    final Paint ring2 = Paint()
      ..color = const Color(0xFF8B25FF).withValues(alpha: 0.4)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.6;

    final Paint ring3 = Paint()
      ..color = const Color(0xFF38BDF8).withValues(alpha: 0.25)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.4;

    // Concentric orbital curves
    canvas.drawCircle(center, 78, ring1);
    canvas.drawCircle(center, 110, ring2);
    canvas.drawCircle(center, 138, ring3);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class GoogleLogoWidget extends StatelessWidget {
  final double size;
  const GoogleLogoWidget({super.key, this.size = 22});

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      size: Size(size, size),
      painter: _GoogleLogoPainter(),
    );
  }
}

class _GoogleLogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final double w = size.width;
    final double h = size.height;
    final double strokeWidth = w * 0.22;
    final Rect rect = Rect.fromLTWH(strokeWidth / 2, strokeWidth / 2, w - strokeWidth, h - strokeWidth);

    final Paint bluePaint = Paint()
      ..color = const Color(0xFF4285F4)
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.butt;

    final Paint greenPaint = Paint()
      ..color = const Color(0xFF34A853)
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.butt;

    final Paint yellowPaint = Paint()
      ..color = const Color(0xFFFBBC05)
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.butt;

    final Paint redPaint = Paint()
      ..color = const Color(0xFFEA4335)
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.butt;

    // Red arc (top)
    canvas.drawArc(rect, -2.35, 1.57, false, redPaint);
    // Yellow arc (left)
    canvas.drawArc(rect, -3.92, 1.57, false, yellowPaint);
    // Green arc (bottom)
    canvas.drawArc(rect, 0.78, 1.57, false, greenPaint);
    // Blue arc (right-bottom)
    canvas.drawArc(rect, 0.0, 0.78, false, bluePaint);

    // Blue horizontal bar
    final Paint blueBar = Paint()
      ..color = const Color(0xFF4285F4)
      ..style = PaintingStyle.fill;
    canvas.drawRect(Rect.fromLTWH(w * 0.45, h * 0.39, w * 0.55, strokeWidth), blueBar);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
