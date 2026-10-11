import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';
import 'app_locale_service.dart';
import 'translation_service.dart';

/// TranslatedText displays dynamic text (e.g. post captions, user bios, comment text)
/// with real-time translation into the user's active language, caching, and a
/// "See translation / See original" toggle button.
class TranslatedText extends StatefulWidget {
  final String text;
  final TextStyle? style;
  final int? maxLines;
  final TextOverflow? overflow;
  final bool autoTranslate;
  final bool showToggleButton;

  const TranslatedText({
    super.key,
    required this.text,
    this.style,
    this.maxLines,
    this.overflow,
    this.autoTranslate = true,
    this.showToggleButton = true,
  });

  @override
  State<TranslatedText> createState() => _TranslatedTextState();
}

class _TranslatedTextState extends State<TranslatedText> {
  String? _translatedText;
  bool _isTranslating = false;
  bool _showOriginal = false;

  @override
  void initState() {
    super.initState();
    AppLocaleService().addListener(_onLocaleChanged);
    _checkAndTranslate();
  }

  void _onLocaleChanged() {
    if (!mounted) return;
    _translatedText = null;
    _showOriginal = false;
    _checkAndTranslate();
  }

  @override
  void dispose() {
    AppLocaleService().removeListener(_onLocaleChanged);
    super.dispose();
  }

  @override
  void didUpdateWidget(TranslatedText oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.text != widget.text) {
      _translatedText = null;
      _showOriginal = false;
      _checkAndTranslate();
    }
  }

  Future<void> _checkAndTranslate() async {
    final currentLang = AppLocaleService().currentLanguage.code;
    if (widget.text.trim().isEmpty) return;

    if (currentLang == 'en') {
      if (mounted) setState(() => _translatedText = null);
      return;
    }

    // 1. Instant 0ms memory cache lookup
    final cached = TranslationService().getCached(widget.text, targetLang: currentLang);
    if (cached != null && cached.isNotEmpty) {
      if (mounted) {
        setState(() {
          _isTranslating = false;
          _translatedText = cached;
        });
      }
      return;
    }

    if (mounted) setState(() => _isTranslating = true);

    try {
      final res = await TranslationService().translateText(widget.text, targetLang: currentLang);
      if (mounted) {
        setState(() {
          _isTranslating = false;
          if (res.toLowerCase() != widget.text.toLowerCase()) {
            _translatedText = res;
          }
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isTranslating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final hasTranslation = _translatedText != null && _translatedText!.isNotEmpty;
    final displayText = (_showOriginal || !hasTranslation) ? widget.text : _translatedText!;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          displayText,
          style: widget.style,
          maxLines: widget.maxLines,
          overflow: widget.overflow,
        ),
        if (widget.showToggleButton && (hasTranslation || _isTranslating)) ...[
          const SizedBox(height: 3),
          GestureDetector(
            onTap: () {
              if (hasTranslation) {
                setState(() => _showOriginal = !_showOriginal);
              } else if (!_isTranslating) {
                _checkAndTranslate();
              }
            },
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (_isTranslating) ...[
                  const SizedBox(
                    width: 10,
                    height: 10,
                    child: CircularProgressIndicator(strokeWidth: 1.5, color: LiveColors.accentPink),
                  ),
                  const SizedBox(width: 4),
                ],
                Text(
                  _showOriginal
                      ? AppLocaleService().t('social_see_translation')
                      : (hasTranslation
                          ? '${AppLocaleService().t('social_see_original')} (${AppLocaleService().t('social_translated')})'
                          : AppLocaleService().t('social_see_translation')),
                  style: GoogleFonts.plusJakartaSans(
                    color: LiveColors.accentPink,
                    fontSize: 10.5,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}
