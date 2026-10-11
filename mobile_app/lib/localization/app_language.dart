import 'package:flutter/material.dart';

/// Comprehensive world language model with ISO code, native script, English name, flag, and RTL flag.
/// Covers over 100+ world languages across all continents, regions, and writing systems.
class AppLanguage {
  final String code;
  final String name;
  final String nativeName;
  final String flag;
  final bool isRtl;
  final String country;

  const AppLanguage({
    required this.code,
    required this.name,
    required this.nativeName,
    required this.flag,
    this.isRtl = false,
    required this.country,
  });

  Locale get locale => Locale(code);

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is AppLanguage && runtimeType == other.runtimeType && code == other.code;

  @override
  int get hashCode => code.hashCode;

  /// Default fallback language
  static const AppLanguage english = AppLanguage(
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    country: 'United States / UK',
  );

  /// All world languages covering all continents and regions (100+ languages)
  static const List<AppLanguage> worldLanguages = [
    // Top Global Languages
    AppLanguage(code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', country: 'United States / UK'),
    AppLanguage(code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', country: 'Spain / Latin America'),
    AppLanguage(code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', isRtl: true, country: 'Saudi Arabia / Middle East'),
    AppLanguage(code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', country: 'India'),
    AppLanguage(code: 'zh', name: 'Chinese (Simplified)', nativeName: '简体中文', flag: '🇨🇳', country: 'China'),
    AppLanguage(code: 'zh_TW', name: 'Chinese (Traditional)', nativeName: '繁體中文', flag: '🇹🇼', country: 'Taiwan / Hong Kong'),
    AppLanguage(code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', country: 'France / Canada'),
    AppLanguage(code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', country: 'Germany / Austria'),
    AppLanguage(code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷', country: 'Brazil / Portugal'),
    AppLanguage(code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', country: 'Russia / CIS'),
    AppLanguage(code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', country: 'Japan'),
    AppLanguage(code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', country: 'South Korea'),
    AppLanguage(code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', country: 'Italy'),
    AppLanguage(code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷', country: 'Turkey'),
    AppLanguage(code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩', country: 'Indonesia'),
    AppLanguage(code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳', country: 'Vietnam'),
    AppLanguage(code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭', country: 'Thailand'),
    AppLanguage(code: 'ur', name: 'Urdu', nativeName: 'اردو', flag: '🇵🇰', isRtl: true, country: 'Pakistan / India'),
    AppLanguage(code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇧🇩', country: 'Bangladesh / India'),
    AppLanguage(code: 'tl', name: 'Filipino / Tagalog', nativeName: 'Tagalog', flag: '🇵🇭', country: 'Philippines'),
    AppLanguage(code: 'fa', name: 'Persian / Farsi', nativeName: 'فارسی', flag: '🇮🇷', isRtl: true, country: 'Iran / Afghanistan'),
    AppLanguage(code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱', country: 'Poland'),
    AppLanguage(code: 'uk', name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦', country: 'Ukraine'),
    AppLanguage(code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱', country: 'Netherlands / Belgium'),
    AppLanguage(code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', flag: '🇰🇪', country: 'Kenya / Tanzania'),
    AppLanguage(code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', flag: '🇲🇾', country: 'Malaysia / Singapore'),

    // South Asian Languages
    AppLanguage(code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', flag: '🇮🇳', country: 'India / Pakistan'),
    AppLanguage(code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳', country: 'India'),
    AppLanguage(code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳', country: 'India / Sri Lanka / Singapore'),
    AppLanguage(code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳', country: 'India'),
    AppLanguage(code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳', country: 'India'),
    AppLanguage(code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳', country: 'India'),
    AppLanguage(code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', flag: '🇮🇳', country: 'India'),
    AppLanguage(code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', flag: '🇮🇳', country: 'India'),
    AppLanguage(code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', flag: '🇮🇳', country: 'India'),
    AppLanguage(code: 'ne', name: 'Nepali', nativeName: 'नेपाली', flag: '🇳🇵', country: 'Nepal / India'),
    AppLanguage(code: 'si', name: 'Sinhala', nativeName: 'සිංහල', flag: '🇱🇰', country: 'Sri Lanka'),

    // Middle Eastern & Western Asian Languages
    AppLanguage(code: 'he', name: 'Hebrew', nativeName: 'עברית', flag: '🇮🇱', isRtl: true, country: 'Israel'),
    AppLanguage(code: 'ku', name: 'Kurdish', nativeName: 'Kurdî', flag: '🇮🇶', isRtl: true, country: 'Iraq / Syria / Turkey'),
    AppLanguage(code: 'ps', name: 'Pashto', nativeName: 'پښتو', flag: '🇦🇫', isRtl: true, country: 'Afghanistan / Pakistan'),
    AppLanguage(code: 'sd', name: 'Sindhi', nativeName: 'سنڌي', flag: '🇵🇰', isRtl: true, country: 'Pakistan / India'),
    AppLanguage(code: 'ug', name: 'Uyghur', nativeName: 'ئۇيغۇرچە', flag: '🇨🇳', isRtl: true, country: 'Xinjiang'),
    AppLanguage(code: 'az', name: 'Azerbaijani', nativeName: 'Azərbaycan', flag: '🇦🇿', country: 'Azerbaijan'),
    AppLanguage(code: 'uz', name: 'Uzbek', nativeName: 'Oʻzbekcha', flag: '🇺🇿', country: 'Uzbekistan'),
    AppLanguage(code: 'kk', name: 'Kazakh', nativeName: 'Қазақша', flag: '🇰🇿', country: 'Kazakhstan'),
    AppLanguage(code: 'ky', name: 'Kyrgyz', nativeName: 'Кыргызча', flag: '🇰🇬', country: 'Kyrgyzstan'),
    AppLanguage(code: 'tg', name: 'Tajik', nativeName: 'Тоҷикӣ', flag: '🇹🇯', country: 'Tajikistan'),
    AppLanguage(code: 'tk', name: 'Turkmen', nativeName: 'Türkmençe', flag: '🇹🇲', country: 'Turkmenistan'),
    AppLanguage(code: 'hy', name: 'Armenian', nativeName: 'Հայերեն', flag: '🇦🇲', country: 'Armenia'),
    AppLanguage(code: 'ka', name: 'Georgian', nativeName: 'ქართული', flag: '🇬🇪', country: 'Georgia'),

    // Southeast & East Asian Languages
    AppLanguage(code: 'my', name: 'Burmese', nativeName: 'မြန်မာစာ', flag: '🇲🇲', country: 'Myanmar'),
    AppLanguage(code: 'km', name: 'Khmer', nativeName: 'ភាសាខ្មែរ', flag: '🇰🇭', country: 'Cambodia'),
    AppLanguage(code: 'lo', name: 'Lao', nativeName: 'ລາວ', flag: '🇱🇦', country: 'Laos'),
    AppLanguage(code: 'mn', name: 'Mongolian', nativeName: 'Монгол', flag: '🇲🇳', country: 'Mongolia'),

    // African Languages
    AppLanguage(code: 'am', name: 'Amharic', nativeName: 'አማርኛ', flag: '🇪🇹', country: 'Ethiopia'),
    AppLanguage(code: 'om', name: 'Oromo', nativeName: 'Afaan Oromoo', flag: '🇪🇹', country: 'Ethiopia / Kenya'),
    AppLanguage(code: 'ti', name: 'Tigrinya', nativeName: 'ትግርኛ', flag: '🇪🇷', country: 'Eritrea / Ethiopia'),
    AppLanguage(code: 'so', name: 'Somali', nativeName: 'Soomaaliga', flag: '🇸🇴', country: 'Somalia / Horn of Africa'),
    AppLanguage(code: 'ha', name: 'Hausa', nativeName: 'Harshen Hausa', flag: '🇳🇬', country: 'Nigeria / West Africa'),
    AppLanguage(code: 'yo', name: 'Yoruba', nativeName: 'Èdè Yorùbá', flag: '🇳🇬', country: 'Nigeria / Benin'),
    AppLanguage(code: 'ig', name: 'Igbo', nativeName: 'Asụsụ Igbo', flag: '🇳🇬', country: 'Nigeria'),
    AppLanguage(code: 'zu', name: 'Zulu', nativeName: 'isiZulu', flag: '🇿🇦', country: 'South Africa'),
    AppLanguage(code: 'xh', name: 'Xhosa', nativeName: 'isiXhosa', flag: '🇿🇦', country: 'South Africa'),
    AppLanguage(code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans', flag: '🇿🇦', country: 'South Africa / Namibia'),
    AppLanguage(code: 'sn', name: 'Shona', nativeName: 'chiShona', flag: '🇿🇼', country: 'Zimbabwe'),
    AppLanguage(code: 'ny', name: 'Chichewa', nativeName: 'ChiCheŵa', flag: '🇲🇼', country: 'Malawi'),
    AppLanguage(code: 'rw', name: 'Kinyarwanda', nativeName: 'Ikinyarwanda', flag: '🇷🇼', country: 'Rwanda'),
    AppLanguage(code: 'mg', name: 'Malagasy', nativeName: 'Fiteny Malagasy', flag: '🇲🇬', country: 'Madagascar'),
    AppLanguage(code: 'st', name: 'Sesotho', nativeName: 'Sesotho', flag: '🇱🇸', country: 'Lesotho / South Africa'),

    // European Languages
    AppLanguage(code: 'el', name: 'Greek', nativeName: 'Ελληνικά', flag: '🇬🇷', country: 'Greece / Cyprus'),
    AppLanguage(code: 'cs', name: 'Czech', nativeName: 'Čeština', flag: '🇨🇿', country: 'Czech Republic'),
    AppLanguage(code: 'ro', name: 'Romanian', nativeName: 'Română', flag: '🇷🇴', country: 'Romania / Moldova'),
    AppLanguage(code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪', country: 'Sweden'),
    AppLanguage(code: 'hu', name: 'Hungarian', nativeName: 'Magyar', flag: '🇭🇺', country: 'Hungary'),
    AppLanguage(code: 'da', name: 'Danish', nativeName: 'Dansk', flag: '🇩🇰', country: 'Denmark'),
    AppLanguage(code: 'fi', name: 'Finnish', nativeName: 'Suomi', flag: '🇫🇮', country: 'Finland'),
    AppLanguage(code: 'no', name: 'Norwegian', nativeName: 'Norsk', flag: '🇳🇴', country: 'Norway'),
    AppLanguage(code: 'sk', name: 'Slovak', nativeName: 'Slovenčina', flag: '🇸🇰', country: 'Slovakia'),
    AppLanguage(code: 'bg', name: 'Bulgarian', nativeName: 'Български', flag: '🇧🇬', country: 'Bulgaria'),
    AppLanguage(code: 'hr', name: 'Croatian', nativeName: 'Hrvatski', flag: '🇭🇷', country: 'Croatia'),
    AppLanguage(code: 'sr', name: 'Serbian', nativeName: 'Српски', flag: '🇷🇸', country: 'Serbia / Balkans'),
    AppLanguage(code: 'bs', name: 'Bosnian', nativeName: 'Bosanski', flag: '🇧🇦', country: 'Bosnia and Herzegovina'),
    AppLanguage(code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina', flag: '🇸🇮', country: 'Slovenia'),
    AppLanguage(code: 'mk', name: 'Macedonian', nativeName: 'Македонски', flag: '🇲🇰', country: 'North Macedonia'),
    AppLanguage(code: 'sq', name: 'Albanian', nativeName: 'Shqip', flag: '🇦🇱', country: 'Albania / Kosovo'),
    AppLanguage(code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių', flag: '🇱🇹', country: 'Lithuania'),
    AppLanguage(code: 'lv', name: 'Latvian', nativeName: 'Latviešu', flag: '🇱🇻', country: 'Latvia'),
    AppLanguage(code: 'et', name: 'Estonian', nativeName: 'Eesti', flag: '🇪🇪', country: 'Estonia'),
    AppLanguage(code: 'is', name: 'Icelandic', nativeName: 'Íslenska', flag: '🇮🇸', country: 'Iceland'),
    AppLanguage(code: 'ga', name: 'Irish', nativeName: 'Gaeilge', flag: '🇮🇪', country: 'Ireland'),
    AppLanguage(code: 'cy', name: 'Welsh', nativeName: 'Cymraeg', flag: '🇬🇧', country: 'Wales (UK)'),
    AppLanguage(code: 'mt', name: 'Maltese', nativeName: 'Malti', flag: '🇲🇹', country: 'Malta'),
    AppLanguage(code: 'eu', name: 'Basque', nativeName: 'Euskara', flag: '🇪🇸', country: 'Basque Country (Spain)'),
    AppLanguage(code: 'ca', name: 'Catalan', nativeName: 'Català', flag: '🇪🇸', country: 'Catalonia (Spain)'),
    AppLanguage(code: 'gl', name: 'Galician', nativeName: 'Galego', flag: '🇪🇸', country: 'Galicia (Spain)'),
    AppLanguage(code: 'be', name: 'Belarusian', nativeName: 'Беларуская', flag: '🇧🇾', country: 'Belarus'),
    AppLanguage(code: 'lb', name: 'Luxembourgish', nativeName: 'Lëtzebuergesch', flag: '🇱🇺', country: 'Luxembourg'),

    // Indigenous, Pacific & Other World Languages
    AppLanguage(code: 'eo', name: 'Esperanto', nativeName: 'Esperanto', flag: '🌐', country: 'International'),
    AppLanguage(code: 'la', name: 'Latin', nativeName: 'Latina', flag: '🏛️', country: 'Vatican / Historical'),
    AppLanguage(code: 'yi', name: 'Yiddish', nativeName: 'ייִדיש', flag: '✡️', isRtl: true, country: 'Worldwide'),
    AppLanguage(code: 'sm', name: 'Samoan', nativeName: 'Gagana Samoa', flag: '🇼🇸', country: 'Samoa / Pacific'),
    AppLanguage(code: 'mi', name: 'Maori', nativeName: 'Te Reo Māori', flag: '🇳🇿', country: 'New Zealand'),
    AppLanguage(code: 'haw', name: 'Hawaiian', nativeName: 'ʻŌlelo Hawaiʻi', flag: '🌺', country: 'Hawaii (US)'),
  ];

  static AppLanguage getByCode(String code) {
    final clean = code.split('_').first.toLowerCase();
    for (final lang in worldLanguages) {
      if (lang.code.toLowerCase() == code.toLowerCase() ||
          lang.code.split('_').first.toLowerCase() == clean) {
        return lang;
      }
    }
    return english;
  }
}
