import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';
import 'app_language.dart';
import 'app_locale_service.dart';

/// LanguageSelectionSheet provides a rich, responsive interface for users to browse,
/// search, and select from 100+ world languages, configure live chat auto-translation,
/// and apply globalization preferences instantly across the whole application.
class LanguageSelectionSheet extends StatefulWidget {
  const LanguageSelectionSheet({super.key});

  static Future<void> show(BuildContext context) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => const LanguageSelectionSheet(),
    );
  }

  @override
  State<LanguageSelectionSheet> createState() => _LanguageSelectionSheetState();
}

class _LanguageSelectionSheetState extends State<LanguageSelectionSheet> {
  final TextEditingController _searchController = TextEditingController();
  List<AppLanguage> _filteredLanguages = [];

  @override
  void initState() {
    super.initState();
    _filteredLanguages = List.from(AppLanguage.worldLanguages);
    _searchController.addListener(_onSearchChanged);
  }

  void _onSearchChanged() {
    final query = _searchController.text.trim().toLowerCase();
    setState(() {
      if (query.isEmpty) {
        _filteredLanguages = List.from(AppLanguage.worldLanguages);
      } else {
        _filteredLanguages = AppLanguage.worldLanguages.where((lang) {
          return lang.name.toLowerCase().contains(query) ||
              lang.nativeName.toLowerCase().contains(query) ||
              lang.code.toLowerCase().contains(query) ||
              lang.country.toLowerCase().contains(query);
        }).toList();
      }
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _selectLanguage(AppLanguage lang) async {
    final currentLanguage = AppLocaleService().currentLanguage;
    if (lang.code == currentLanguage.code) {
      Navigator.pop(context);
      return;
    }

    double currentProgress = 0.0;
    StateSetter? dialogSetState;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dCtx) {
        return StatefulBuilder(
          builder: (context, setDState) {
            dialogSetState = setDState;
            return PopScope(
              canPop: false,
              child: Dialog(
                backgroundColor: LiveColors.backgroundSurface,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(24),
                  side: BorderSide(color: LiveColors.accentPurple.withValues(alpha: 0.5)),
                ),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          gradient: LiveColors.primaryGradient,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: LiveColors.accentPink.withValues(alpha: 0.4),
                              blurRadius: 16,
                            ),
                          ],
                        ),
                        child: Text(lang.flag, style: const TextStyle(fontSize: 32)),
                      ),
                      const SizedBox(height: 18),
                      Text(
                        '${lang.nativeName} (${lang.name})',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Translating all app screens & popups...'.tr,
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 13,
                          color: LiveColors.textSecondary,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 20),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(6),
                        child: LinearProgressIndicator(
                          value: currentProgress > 0 ? currentProgress : null,
                          backgroundColor: LiveColors.backgroundInput,
                          color: LiveColors.accentPink,
                          minHeight: 8,
                        ),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        '${(currentProgress * 100).toInt()}% • 100+ World Languages'.tr,
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 11,
                          color: LiveColors.textMuted,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );

    try {
      await AppLocaleService().setLanguage(
        lang,
        onProgress: (p) {
          currentProgress = p;
          dialogSetState?.call(() {});
        },
      );
    } catch (_) {}

    if (!mounted) return;

    // Dismiss translation progress dialog
    Navigator.of(context, rootNavigator: true).pop();

    // Dismiss bottom sheet
    if (Navigator.of(context).canPop()) {
      Navigator.pop(context);
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: const Color(0xFF10B981),
        duration: const Duration(seconds: 3),
        content: Row(
          children: [
            Text(lang.flag, style: const TextStyle(fontSize: 20)),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                '${lang.nativeName} (${lang.name}) applied across the entire app! ✨'.tr,
                style: GoogleFonts.plusJakartaSans(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final currentLanguage = AppLocaleService().currentLanguage;
    final autoTranslate = AppLocaleService().autoTranslateChatAndPosts;

    return Container(
      height: MediaQuery.of(context).size.height * 0.88,
      decoration: const BoxDecoration(
        color: LiveColors.backgroundSurface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        border: Border(
          top: BorderSide(color: LiveColors.accentPurple, width: 1.5),
        ),
      ),
      child: Column(
        children: [
          // Drag handle
          const SizedBox(height: 12),
          Container(
            width: 44,
            height: 4,
            decoration: BoxDecoration(
              color: LiveColors.border,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 12),

          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        gradient: LiveColors.primaryGradient,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: LiveColors.accentPink.withValues(alpha: 0.4),
                            blurRadius: 12,
                          ),
                        ],
                      ),
                      child: const Icon(Icons.language_rounded, color: Colors.white, size: 20),
                    ),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Select Language & Region'.tr,
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                        Text(
                          '${AppLanguage.worldLanguages.length} Languages Supported'.tr,
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 11,
                            color: LiveColors.textSecondary,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded, color: LiveColors.textSecondary),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // Auto-Translate Toggle Feature Card
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    LiveColors.accentPurple.withValues(alpha: 0.2),
                    LiveColors.accentPink.withValues(alpha: 0.12),
                  ],
                ),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(
                  color: LiveColors.accentPurple.withValues(alpha: 0.4),
                  width: 1.2,
                ),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.1),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.translate_rounded, color: Color(0xFF38BDF8), size: 20),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Auto-Translate Live Chat & Moments'.tr,
                          style: GoogleFonts.plusJakartaSans(
                            color: Colors.white,
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Instantly translate comments in streaming rooms & social feed to your chosen language'.tr,
                          style: GoogleFonts.plusJakartaSans(
                            color: LiveColors.textSecondary,
                            fontSize: 10.5,
                            height: 1.3,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Switch.adaptive(
                    value: autoTranslate,
                    activeThumbColor: LiveColors.accentPink,
                    activeTrackColor: LiveColors.accentPurple,
                    onChanged: (val) {
                      AppLocaleService().setAutoTranslate(val);
                      setState(() {});
                    },
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 14),

          // Search Field
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Container(
              decoration: BoxDecoration(
                color: LiveColors.backgroundInput,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: LiveColors.border),
              ),
              child: TextField(
                controller: _searchController,
                style: GoogleFonts.plusJakartaSans(color: Colors.white, fontSize: 14),
                decoration: InputDecoration(
                  hintText: 'Search 100+ world languages...'.tr,
                  hintStyle: GoogleFonts.plusJakartaSans(color: LiveColors.textMuted, fontSize: 13),
                  prefixIcon: const Icon(Icons.search_rounded, color: LiveColors.textSecondary, size: 20),
                  suffixIcon: _searchController.text.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear_rounded, color: LiveColors.textSecondary, size: 18),
                          onPressed: () {
                            _searchController.clear();
                          },
                        )
                      : null,
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                ),
              ),
            ),
          ),
          const SizedBox(height: 10),

          // Languages List
          Expanded(
            child: _filteredLanguages.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.search_off_rounded, color: LiveColors.textMuted, size: 48),
                        const SizedBox(height: 12),
                        Text(
                          'No matching language found'.tr,
                          style: GoogleFonts.plusJakartaSans(color: LiveColors.textSecondary, fontSize: 14),
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                    itemCount: _filteredLanguages.length,
                    itemBuilder: (context, index) {
                      final lang = _filteredLanguages[index];
                      final isSelected = lang.code == currentLanguage.code;

                      return Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? LiveColors.accentPurple.withValues(alpha: 0.22)
                              : LiveColors.backgroundElevated.withValues(alpha: 0.5),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: isSelected ? LiveColors.accentPink : LiveColors.borderSubtle,
                            width: isSelected ? 1.5 : 1.0,
                          ),
                        ),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(16),
                          onTap: () => _selectLanguage(lang),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                            child: Row(
                              children: [
                                // Country Flag
                                Container(
                                  width: 36,
                                  height: 36,
                                  decoration: BoxDecoration(
                                    color: Colors.white.withValues(alpha: 0.08),
                                    shape: BoxShape.circle,
                                  ),
                                  alignment: Alignment.center,
                                  child: Text(
                                    lang.flag,
                                    style: const TextStyle(fontSize: 18),
                                  ),
                                ),
                                const SizedBox(width: 14),

                                // Language names
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Text(
                                            lang.nativeName,
                                            style: GoogleFonts.plusJakartaSans(
                                              color: Colors.white,
                                              fontSize: 15,
                                              fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                                            ),
                                          ),
                                          if (lang.isRtl) ...[
                                            const SizedBox(width: 6),
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                                              decoration: BoxDecoration(
                                                color: const Color(0xFF38BDF8).withValues(alpha: 0.2),
                                                borderRadius: BorderRadius.circular(6),
                                              ),
                                              child: const Text(
                                                'RTL',
                                                style: TextStyle(
                                                  color: Color(0xFF38BDF8),
                                                  fontSize: 9,
                                                  fontWeight: FontWeight.bold,
                                                ),
                                              ),
                                            ),
                                          ],
                                        ],
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        '${lang.name} • ${lang.country}',
                                        style: GoogleFonts.plusJakartaSans(
                                          color: isSelected ? LiveColors.accentPink : LiveColors.textSecondary,
                                          fontSize: 11.5,
                                          fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ],
                                  ),
                                ),

                                // Checkmark radio
                                if (isSelected)
                                  Container(
                                    padding: const EdgeInsets.all(3),
                                    decoration: const BoxDecoration(
                                      color: LiveColors.accentPink,
                                      shape: BoxShape.circle,
                                    ),
                                    child: const Icon(Icons.check, color: Colors.white, size: 14),
                                  )
                                else
                                  Container(
                                    width: 20,
                                    height: 20,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      border: Border.all(color: LiveColors.border, width: 1.5),
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
