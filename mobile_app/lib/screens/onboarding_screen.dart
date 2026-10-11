import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';
import '../localization/app_locale_service.dart';

class OnboardingScreen extends StatefulWidget {
  final VoidCallback onComplete;

  const OnboardingScreen({super.key, required this.onComplete});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final ImagePicker _picker = ImagePicker();
  final _formKey = GlobalKey<FormState>();

  String? _avatarUrl;
  late final TextEditingController _displayNameController;
  late final TextEditingController _usernameController;
  late final TextEditingController _bioController;

  String _selectedGender = 'Male';
  int _selectedAge = 18;
  late final FixedExtentScrollController _ageScrollController;
  String _selectedCountry = 'Global 🌍';
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    final user = AuthService().currentUser;

    _avatarUrl = user?.avatarUrl;
    if (_avatarUrl != null && _avatarUrl!.isNotEmpty) {
      _avatarUrl = ApiService.getFullImageUrl(_avatarUrl);
    }

    final initialName = user?.displayName.isNotEmpty == true ? user!.displayName : 'Kevin patoliya';
    final initialUsername = (user?.username != null && user!.username.isNotEmpty && !user.username.startsWith('user_'))
        ? user.username
        : initialName.toLowerCase().replaceAll(RegExp(r'[^a-z0-9_]'), '_');

    _displayNameController = TextEditingController(text: initialName);
    _usernameController = TextEditingController(text: initialUsername);
    _bioController = TextEditingController(text: user?.bio.isNotEmpty == true ? user!.bio : '');

    if (user?.gender != null && user!.gender.isNotEmpty) {
      _selectedGender = user.gender;
    }
    if (user?.country != null && user!.country.isNotEmpty) {
      _selectedCountry = user.country;
    }
    if (user?.birthday != null && user!.birthday.isNotEmpty) {
      final bday = DateTime.tryParse(user.birthday);
      if (bday != null) {
        final age = DateTime.now().year - bday.year;
        if (age >= 18 && age <= 100) _selectedAge = age;
      }
    }
    _ageScrollController = FixedExtentScrollController(
      initialItem: (_selectedAge - 18).clamp(0, 81),
    );
  }

  @override
  void dispose() {
    _ageScrollController.dispose();
    _displayNameController.dispose();
    _usernameController.dispose();
    _bioController.dispose();
    super.dispose();
  }

  void _showImagePickerSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: LiveColors.backgroundSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Choose Profile Photo'.tr,
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: LiveColors.textSecondary),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: LiveColors.accentPurple.withValues(alpha: 0.15),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.photo_library_rounded, color: LiveColors.accentPurple),
                ),
                title: Text('Choose from Gallery'.tr, style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.w600)),
                subtitle: Text('Pick any photo from device storage'.tr, style: GoogleFonts.plusJakartaSans(color: LiveColors.textSecondary, fontSize: 11)),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickAndUploadImage(ImageSource.gallery);
                },
              ),
              const Divider(color: LiveColors.borderSubtle),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: LiveColors.accentPink.withValues(alpha: 0.15),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.camera_alt_rounded, color: LiveColors.accentPink),
                ),
                title: Text('Take Photo with Camera'.tr, style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.w600)),
                subtitle: Text('Snap an instant selfie or picture'.tr, style: GoogleFonts.plusJakartaSans(color: LiveColors.textSecondary, fontSize: 11)),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickAndUploadImage(ImageSource.camera);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _pickAndUploadImage(ImageSource source) async {
    try {
      final XFile? picked = await _picker.pickImage(
        source: source,
        maxWidth: 1200,
        maxHeight: 1200,
        imageQuality: 85,
      );

      if (picked == null) return;

      if (!mounted) return;
      _showUploadLoadingDialog();

      final uploadedPath = await ApiService().uploadAvatar(picked.path);

      if (!mounted) return;
      Navigator.of(context, rootNavigator: true).pop();

      if (uploadedPath != null) {
        final fullUrl = ApiService.getFullImageUrl(uploadedPath);
        setState(() {
          _avatarUrl = fullUrl;
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: const Color(0xFF10B981),
            content: Text('Profile photo uploaded successfully! ✨'.tr, style: TextStyle(color: Colors.white)),
          ),
        );
      }
    } catch (e) {
      debugPrint('Error uploading image: $e');
    }
  }

  void _showUploadLoadingDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => PopScope(
        canPop: false,
        child: Dialog(
          backgroundColor: LiveColors.backgroundSurface,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 30, horizontal: 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const SizedBox(
                  width: 48,
                  height: 48,
                  child: CircularProgressIndicator(color: LiveColors.accentPink, strokeWidth: 3),
                ),
                const SizedBox(height: 18),
                Text(
                  'Uploading Image...'.tr,
                  style: GoogleFonts.plusJakartaSans(fontSize: 17, fontWeight: FontWeight.bold, color: Colors.white),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _submitProfile() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);

    final displayName = _displayNameController.text.trim();
    final username = _usernameController.text.trim().replaceAll('@', '');
    final birthYear = DateTime.now().year - _selectedAge;
    final birthdayStr = '$birthYear-01-01';
    final finalAvatar = (_avatarUrl != null && _avatarUrl!.isNotEmpty)
        ? _avatarUrl!
        : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200';

    await AuthService().completeOnboarding(
      username: username,
      displayName: displayName,
      avatarUrl: finalAvatar,
      birthday: birthdayStr,
      gender: _selectedGender,
      country: _selectedCountry,
      bio: _bioController.text.trim(),
    );

    if (mounted) {
      setState(() => _isSubmitting = false);
      widget.onComplete();
      if (Navigator.of(context).canPop()) {
        Navigator.of(context).pop();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: LiveColors.background,
      body: SafeArea(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top App Bar matching Screenshot 2
                Row(
                  children: [
                    if (Navigator.of(context).canPop())
                      IconButton(
                        icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white, size: 20),
                        onPressed: () => Navigator.of(context).pop(),
                      )
                    else
                      const SizedBox(width: 40),
                    Expanded(
                      child: Text(
                        'Edit Profile'.tr,
                        textAlign: TextAlign.center,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ),
                    const SizedBox(width: 40),
                  ],
                ),

                const SizedBox(height: 24),

                // Squircle Profile Avatar Container with Bottom Center Camera Badge
                Center(
                  child: Stack(
                    clipBehavior: Clip.none,
                    alignment: Alignment.center,
                    children: [
                      // Smooth Squircle Avatar Card
                      Container(
                        width: 120,
                        height: 120,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(28),
                          boxShadow: [
                            BoxShadow(
                              color: LiveColors.accentPurple.withValues(alpha: 0.35),
                              blurRadius: 18,
                              spreadRadius: 2,
                            ),
                          ],
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(26),
                          child: _avatarUrl != null && _avatarUrl!.isNotEmpty
                              ? Image.network(
                                  _avatarUrl!,
                                  fit: BoxFit.cover,
                                  errorBuilder: (ctx, err, stack) => _buildDefaultAvatarPlaceholder(),
                                )
                              : _buildDefaultAvatarPlaceholder(),
                        ),
                      ),

                      // Floating Purple Camera Badge Button at Bottom Center
                      Positioned(
                        bottom: -14,
                        child: GestureDetector(
                          onTap: _showImagePickerSheet,
                          child: Container(
                            width: 38,
                            height: 38,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              gradient: const LinearGradient(
                                colors: [Color(0xFF8B25FF), Color(0xFF6D28D9)],
                              ),
                              border: Border.all(color: LiveColors.background, width: 2.5),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.4),
                                  blurRadius: 6,
                                ),
                              ],
                            ),
                            child: const Icon(Icons.camera_alt, color: Colors.white, size: 18),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 36),

                // 1. Enter Name Label & Input Box
                _buildFieldLabel('Enter Name'.tr),
                const SizedBox(height: 8),
                Container(
                  decoration: BoxDecoration(
                    color: LiveColors.backgroundInput,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: TextFormField(
                    controller: _displayNameController,
                    style: GoogleFonts.plusJakartaSans(color: Colors.white, fontSize: 15),
                    decoration: InputDecoration(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
                      border: InputBorder.none,
                      hintText: 'Enter your name'.tr,
                      hintStyle: GoogleFonts.plusJakartaSans(color: LiveColors.textMuted, fontSize: 14),
                    ),
                    validator: (val) => (val == null || val.trim().isEmpty) ? 'Please enter your name'.tr : null,
                  ),
                ),

                const SizedBox(height: 20),

                // 2. Select Gender (Male / Female Cards with Radio Indicator)
                _buildFieldLabel('Select Age'.tr),
                const SizedBox(height: 8),
                Row(
                  children: [
                    // Male Card
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() => _selectedGender = 'Male'),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          decoration: BoxDecoration(
                            color: LiveColors.backgroundInput,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: _selectedGender == 'Male' ? LiveColors.accentPurple : Colors.transparent,
                              width: 1.5,
                            ),
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 32,
                                height: 32,
                                decoration: const BoxDecoration(
                                  color: Color(0xFFFBBF24),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.person, color: Colors.white, size: 20),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text('Male'.tr,
                                  overflow: TextOverflow.ellipsis,
                                  style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                                ),
                              ),
                              _buildRadioIndicator(_selectedGender == 'Male'),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),

                    // Female Card
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() => _selectedGender = 'Female'),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          decoration: BoxDecoration(
                            color: LiveColors.backgroundInput,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: _selectedGender == 'Female' ? LiveColors.accentPurple : Colors.transparent,
                              width: 1.5,
                            ),
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 32,
                                height: 32,
                                decoration: const BoxDecoration(
                                  color: Color(0xFFF472B6),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.person, color: Colors.white, size: 20),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text('Female'.tr,
                                  overflow: TextOverflow.ellipsis,
                                  style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                                ),
                              ),
                              _buildRadioIndicator(_selectedGender == 'Female'),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 20),

                // 3. Select your age (Vertical Interactive Scroll Picker)
                _buildFieldLabel('Select your age (Scroll to pick)'.tr),
                const SizedBox(height: 10),
                Container(
                  height: 130,
                  decoration: BoxDecoration(
                    color: LiveColors.backgroundInput,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: LiveColors.borderSubtle),
                  ),
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      // Highlight selection band / bracket
                      Container(
                        height: 42,
                        margin: const EdgeInsets.symmetric(horizontal: 24),
                        decoration: BoxDecoration(
                          color: LiveColors.backgroundElevated,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: LiveColors.accentPink.withValues(alpha: 0.8),
                            width: 1.5,
                          ),
                        ),
                      ),
                      ListWheelScrollView.useDelegate(
                        controller: _ageScrollController,
                        itemExtent: 42,
                        perspective: 0.003,
                        diameterRatio: 1.6,
                        physics: const FixedExtentScrollPhysics(),
                        onSelectedItemChanged: (index) {
                          setState(() {
                            _selectedAge = 18 + index;
                          });
                        },
                        childDelegate: ListWheelChildBuilderDelegate(
                          builder: (context, index) {
                            final age = 18 + index;
                            final isSelected = age == _selectedAge;
                            return Center(
                              child: Text(
                                '$age '.tr + 'years old'.tr,
                                style: GoogleFonts.plusJakartaSans(
                                  color: isSelected ? Colors.white : LiveColors.textMuted,
                                  fontSize: isSelected ? 20 : 15,
                                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                                ),
                              ),
                            );
                          },
                          childCount: 82, // 18 to 99
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 16),

                // 4. Enter Your Bio
                _buildFieldLabel('Enter Your Bio'.tr),
                const SizedBox(height: 8),
                Container(
                  height: 120,
                  decoration: BoxDecoration(
                    color: LiveColors.backgroundInput,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: TextFormField(
                    controller: _bioController,
                    maxLines: 4,
                    style: GoogleFonts.plusJakartaSans(color: Colors.white, fontSize: 14),
                    decoration: InputDecoration(
                      contentPadding: const EdgeInsets.all(16),
                      border: InputBorder.none,
                      hintText: 'Enter bio here..'.tr,
                      hintStyle: GoogleFonts.plusJakartaSans(color: LiveColors.textMuted, fontSize: 14),
                    ),
                  ),
                ),

                const SizedBox(height: 32),

                // 5. Full-Width Gradient "Save Changes" Button
                SizedBox(
                  width: double.infinity,
                  height: 54,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      padding: EdgeInsets.zero,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(27)),
                      elevation: 6,
                      shadowColor: LiveColors.accentPink.withValues(alpha: 0.5),
                    ),
                    onPressed: _isSubmitting ? null : _submitProfile,
                    child: Ink(
                      decoration: BoxDecoration(
                        gradient: LiveColors.primaryGradient,
                        borderRadius: BorderRadius.circular(27),
                      ),
                      child: Container(
                        alignment: Alignment.center,
                        child: _isSubmitting
                            ? const SizedBox(
                                width: 24,
                                height: 24,
                                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                              )
                            : Text(
                                'Save Changes'.tr,
                                style: GoogleFonts.plusJakartaSans(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                  letterSpacing: 0.3,
                                ),
                              ),
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFieldLabel(String label) {
    return Text(
      label,
      style: GoogleFonts.plusJakartaSans(
        fontSize: 13,
        color: LiveColors.textSecondary,
        fontWeight: FontWeight.w500,
      ),
    );
  }

  Widget _buildRadioIndicator(bool isSelected) {
    return Container(
      width: 22,
      height: 22,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(
          color: isSelected ? LiveColors.accentPurple : LiveColors.textMuted,
          width: 2,
        ),
      ),
      child: isSelected
          ? Center(
              child: Container(
                width: 10,
                height: 10,
                decoration: const BoxDecoration(
                  color: LiveColors.accentPurple,
                  shape: BoxShape.circle,
                ),
              ),
            )
          : null,
    );
  }

  Widget _buildDefaultAvatarPlaceholder() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.all(12),
      child: const Center(
        child: Icon(Icons.person, color: Color(0xFF6B7280), size: 56),
      ),
    );
  }
}
