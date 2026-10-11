import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'app_language.dart';
import 'app_localizations.dart';
import 'translation_service.dart';

/// AppLocaleService provides a reactive, persistent localization and globalization manager.
/// When the language changes, it notifies listeners and rebuilds the MaterialApp and UI instantly.
class AppLocaleService extends ChangeNotifier {
  static final AppLocaleService _instance = AppLocaleService._internal();
  factory AppLocaleService() => _instance;
  AppLocaleService._internal();

  static const String _prefLanguageKey = 'app_language_code';
  static const String _prefAutoTranslateKey = 'app_auto_translate_live';

  AppLanguage _currentLanguage = AppLanguage.english;
  bool _autoTranslateChatAndPosts = true;
  bool _isInitialized = false;
  int _rebuildKey = 0;

  AppLanguage get currentLanguage => _currentLanguage;
  Locale get locale => _currentLanguage.locale;
  bool get isRtl => _currentLanguage.isRtl;
  bool get autoTranslateChatAndPosts => _autoTranslateChatAndPosts;
  bool get isInitialized => _isInitialized;
  int get rebuildKey => _rebuildKey;

  /// All supported locales generated dynamically from world languages (100+ languages)
  static List<Locale> get supportedLocales {
    return AppLanguage.worldLanguages.map((l) => l.locale).toList();
  }

  /// Initialize and load persisted user language choice
  Future<void> init() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      _autoTranslateChatAndPosts = prefs.getBool(_prefAutoTranslateKey) ?? true;

      final savedCode = prefs.getString(_prefLanguageKey);
      if (savedCode != null && savedCode.isNotEmpty) {
        _currentLanguage = AppLanguage.getByCode(savedCode);
      } else {
        // Automatically adapt to the device system language if available
        final systemLocale = ui.PlatformDispatcher.instance.locale;
        _currentLanguage = AppLanguage.getByCode(systemLocale.languageCode);
      }
      _isInitialized = true;
      notifyListeners();
    } catch (e) {
      debugPrint('Error initializing AppLocaleService: $e');
      _currentLanguage = AppLanguage.english;
      _isInitialized = true;
    }
  }

  /// Change application language dynamically across the entire app.
  /// Prewarms the master UI string bundle so zero English words remain.
  Future<void> setLanguage(AppLanguage language, {void Function(double progress)? onProgress}) async {
    if (_currentLanguage.code == language.code) {
      onProgress?.call(1.0);
      return;
    }

    _currentLanguage = language;

    // Prewarm all UI strings for the chosen world language in parallel
    if (language.code != 'en') {
      await TranslationService().prewarmCompleteApp(language.code, onProgress: onProgress);
    } else {
      onProgress?.call(1.0);
    }

    _rebuildKey++;
    notifyListeners();

    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_prefLanguageKey, language.code);
    } catch (e) {
      debugPrint('Error saving language preference: $e');
    }
  }

  /// Toggle or set auto-translation for live chat & moments
  Future<void> setAutoTranslate(bool enabled) async {
    if (_autoTranslateChatAndPosts == enabled) return;

    _autoTranslateChatAndPosts = enabled;
    notifyListeners();

    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(_prefAutoTranslateKey, enabled);
    } catch (e) {
      debugPrint('Error saving auto translate preference: $e');
    }
  }

  /// Universal translation method that converts ANY string (key, raw text, or dynamic template)
  /// into the active language with 0ms memory cache and resilient background translation.
  String tr(String text, [Map<String, String>? params]) {
    final clean = text.trim();
    if (clean.isEmpty) return text;

    // 1. First check if clean is a translation key in the localized dictionary
    final loc = AppLocalizations(_currentLanguage.locale);
    final keyLookup = loc.translate(clean, params);
    if (keyLookup != clean) {
      return keyLookup;
    }

    // 2. If English and no key match found, it is already an English string
    if (_currentLanguage.code == 'en') {
      return _applyParams(text, params);
    }

    final langCode = _currentLanguage.code.split('_').first.toLowerCase();

    // 1. Direct memory cache check (0ms instant lookup)
    final cached = TranslationService().getCached(clean, targetLang: langCode);
    if (cached != null && cached.isNotEmpty) {
      final leading = text.substring(0, text.indexOf(clean));
      final trailing = text.substring(text.indexOf(clean) + clean.length);
      return '$leading${_applyParams(cached, params)}$trailing';
    }

    // 2. Try static localized dictionary with reverse lookup
    final localized = loc.translate(clean, params);
    if (localized != clean) {
      TranslationService().setCache(clean, localized, targetLang: langCode);
      final leading = text.substring(0, text.indexOf(clean));
      final trailing = text.substring(text.indexOf(clean) + clean.length);
      return '$leading$localized$trailing';
    }

    // 3. Smart Template & Dynamic Pattern Matching
    final smartResult = _resolveSmartPatterns(clean, langCode);
    if (smartResult != null) {
      final leading = text.substring(0, text.indexOf(clean));
      final trailing = text.substring(text.indexOf(clean) + clean.length);
      return '$leading${_applyParams(smartResult, params)}$trailing';
    }

    // 4. Emoji-wrapped string check (e.g. "Recharge Coins 🪙")
    final emojiMatch = RegExp(r'^([\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\s]*)(.*?)([\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\s]*)$', unicode: true).firstMatch(clean);
    if (emojiMatch != null) {
      final preEmoji = emojiMatch.group(1) ?? '';
      final innerText = (emojiMatch.group(2) ?? '').trim();
      final postEmoji = emojiMatch.group(3) ?? '';
      if (innerText.isNotEmpty && innerText != clean) {
        final innerTranslated = tr(innerText, params);
        if (innerTranslated != innerText) {
          final fullTranslated = '$preEmoji$innerTranslated$postEmoji'.trim();
          TranslationService().setCache(clean, fullTranslated, targetLang: langCode);
          return fullTranslated;
        }
      }
    }

    // 5. Queue asynchronous background translation and notify UI when ready
    TranslationService().queueForTranslation(
      clean,
      targetLang: langCode,
      onTranslated: () {
        notifyListeners();
      },
    );

    return _applyParams(text, params);
  }

  /// Smart pattern resolution for dynamic interpolated strings
  String? _resolveSmartPatterns(String text, String langCode) {
    // Pattern: "Connecting to $name..."
    final connectMatch = RegExp(r'^Connecting to (.+?)\.\.\.$').firstMatch(text);
    if (connectMatch != null) {
      final name = connectMatch.group(1)!;
      final template = tr('Connecting...', null);
      return '$template ($name)';
    }

    // Pattern: "Copied $item to clipboard!..."
    final copiedMatch = RegExp(r'^Copied (.+?) to clipboard!(.*)$').firstMatch(text);
    if (copiedMatch != null) {
      final item = copiedMatch.group(1)!;
      final rest = copiedMatch.group(2) ?? '';
      final base = tr('Copied to clipboard!', null);
      return '$item: $base $rest'.trim();
    }

    // Pattern: "Phone number $phone copied!"
    final phoneCopied = RegExp(r'^Phone number (.+?) copied!$').firstMatch(text);
    if (phoneCopied != null) {
      final phone = phoneCopied.group(1)!;
      final base = tr('Phone number copied!', null);
      return '$phone: $base';
    }

    // Pattern: "User ID ($id) copied to clipboard! 📋"
    final userCopied = RegExp(r'^User ID \((.+?)\) copied to clipboard! 📋$').firstMatch(text);
    if (userCopied != null) {
      final id = userCopied.group(1)!;
      final base = tr('User ID copied to clipboard!', null);
      return '$id: $base 📋';
    }

    // Pattern: "Test card $card copied to clipboard!"
    final cardCopied = RegExp(r'^Test card (.+?) copied to clipboard!$').firstMatch(text);
    if (cardCopied != null) {
      final card = cardCopied.group(1)!;
      final base = tr('Test card copied to clipboard!', null);
      return '$card: $base';
    }

    // Pattern: "Seat #$seat unlocked."
    final seatUnlocked = RegExp(r'^Seat #(\d+) unlocked\.?$').firstMatch(text);
    if (seatUnlocked != null) {
      final seat = seatUnlocked.group(1)!;
      final base = tr('Seat unlocked.', null);
      return '#$seat $base';
    }

    // Pattern: "Mic Seat #$seat Controls"
    final seatControls = RegExp(r'^Mic Seat #(\d+) Controls$').firstMatch(text);
    if (seatControls != null) {
      final seat = seatControls.group(1)!;
      final base = tr('Mic Seat Controls', null);
      return '#$seat $base';
    }

    // Pattern: "Manage $name (Seat #$seat)"
    final manageGuest = RegExp(r'^Manage (.+?) \(Seat #(\d+)\)$').firstMatch(text);
    if (manageGuest != null) {
      final name = manageGuest.group(1)!;
      final seat = manageGuest.group(2)!;
      return '$name (#$seat)';
    }

    // Pattern: "Followers ($count)"
    final followersCount = RegExp(r'^Followers \((\d+)\)$').firstMatch(text);
    if (followersCount != null) {
      final count = followersCount.group(1)!;
      final base = tr('Followers', null);
      return '$base ($count)';
    }

    // Pattern: "Following ($count)"
    final followingCount = RegExp(r'^Following \((\d+)\)$').firstMatch(text);
    if (followingCount != null) {
      final count = followingCount.group(1)!;
      final base = tr('Following', null);
      return '$base ($count)';
    }

    // Pattern: "All Posts ($count)"
    final postsCount = RegExp(r'^All Posts \((\d+)\)$').firstMatch(text);
    if (postsCount != null) {
      final count = postsCount.group(1)!;
      final base = tr('All Posts', null);
      return '$base ($count)';
    }

    // Pattern: "Stream Sessions ($count)"
    final streamsCount = RegExp(r'^Stream Sessions \((\d+)\)$').firstMatch(text);
    if (streamsCount != null) {
      final count = streamsCount.group(1)!;
      final base = tr('Stream Sessions', null);
      return '$base ($count)';
    }

    // Pattern: "Gift Ledger ($count)"
    final ledgerCount = RegExp(r'^Gift Ledger \((\d+)\)$').firstMatch(text);
    if (ledgerCount != null) {
      final count = ledgerCount.group(1)!;
      final base = tr('Gift Ledger', null);
      return '$base ($count)';
    }

    // Pattern: "$age years old"
    final ageMatch = RegExp(r'^(\d+) years old$').firstMatch(text);
    if (ageMatch != null) {
      final age = ageMatch.group(1)!;
      final base = tr('years old', null);
      return '$age $base';
    }

    // Pattern: "$occupied/8 Mics Active"
    final micsMatch = RegExp(r'^(\d+)/8 Mics Active$').firstMatch(text);
    if (micsMatch != null) {
      final count = micsMatch.group(1)!;
      final base = tr('Mics Active', null);
      return '$count/8 $base';
    }

    // Pattern: "Need $xp XP"
    final needXp = RegExp(r'^Need (\d+) XP$').firstMatch(text);
    if (needXp != null) {
      final xp = needXp.group(1)!;
      final needWord = tr('Need', null);
      final xpWord = tr('XP', null);
      return '$needWord $xp $xpWord';
    }

    // Pattern: "$minXp Min XP"
    final minXpMatch = RegExp(r'^(\d+) Min XP$').firstMatch(text);
    if (minXpMatch != null) {
      final xp = minXpMatch.group(1)!;
      final minWord = tr('Min XP', null);
      return '$xp $minWord';
    }

    // Pattern: "Host: $name"
    final hostMatch = RegExp(r'^Host:\s*(.+)$').firstMatch(text);
    if (hostMatch != null) {
      final name = hostMatch.group(1)!;
      final hostWord = tr('Host', null);
      return '$hostWord: $name';
    }

    // Pattern: "Wallet: $amount 🪙"
    final walletMatch = RegExp(r'^Wallet:\s*(.+)$').firstMatch(text);
    if (walletMatch != null) {
      final amt = walletMatch.group(1)!;
      final walletWord = tr('Wallet:', null);
      return '$walletWord $amt';
    }

    // Pattern: "Perk: $perk"
    final perkMatch = RegExp(r'^Perk:\s*(.+)$').firstMatch(text);
    if (perkMatch != null) {
      final perk = perkMatch.group(1)!;
      final perkWord = tr('Perk', null);
      final translatedPerk = tr(perk, null);
      return '$perkWord: $translatedPerk';
    }

    // Pattern: "$xp XP (Max Level 👑)"
    final maxLvlMatch = RegExp(r'^(\d+) XP \(Max Level 👑\)$').firstMatch(text);
    if (maxLvlMatch != null) {
      final xp = maxLvlMatch.group(1)!;
      final maxWord = tr('Max Level', null);
      return '$xp XP ($maxWord 👑)';
    }

    // Pattern: "Available Stock: $stock"
    final stockMatch = RegExp(r'^Available Stock:\s*(.+)$').firstMatch(text);
    if (stockMatch != null) {
      final stock = stockMatch.group(1)!;
      final base = tr('Available Stock: ', null);
      return '$base$stock';
    }

    // Pattern: "Replying to $name"
    final replyMatch = RegExp(r'^Replying to\s*(.+)$').firstMatch(text);
    if (replyMatch != null) {
      final name = replyMatch.group(1)!;
      final base = tr('Replying to', null);
      return '$base $name';
    }

    return null;
  }

  /// Legacy alias
  String t(String key, [Map<String, String>? params]) => tr(key, params);

  String _applyParams(String text, Map<String, String>? params) {
    if (params == null || params.isEmpty) return text;
    var result = text;
    params.forEach((k, v) {
      result = result.replaceAll('{$k}', v);
    });
    return result;
  }
}

/// Global extension on String for effortless `.tr` translation anywhere in the app
extension StringTranslateExtension on String {
  String get tr => AppLocaleService().tr(this);
  String trParams([Map<String, String>? params]) => AppLocaleService().tr(this, params);
}
