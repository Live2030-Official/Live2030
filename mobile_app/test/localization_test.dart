import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:live2030/localization/app_language.dart';
import 'package:live2030/localization/app_localizations.dart';
import 'package:live2030/localization/app_locale_service.dart';
import 'package:live2030/localization/translation_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Globalization & World Languages Tests', () {
    test('World languages registry contains 60+ languages', () {
      expect(AppLanguage.worldLanguages.length, greaterThanOrEqualTo(50));
      
      // Verify key world languages exist
      final codes = AppLanguage.worldLanguages.map((l) => l.code).toSet();
      expect(codes.contains('en'), isTrue);
      expect(codes.contains('es'), isTrue);
      expect(codes.contains('ar'), isTrue);
      expect(codes.contains('hi'), isTrue);
      expect(codes.contains('zh'), isTrue);
      expect(codes.contains('fr'), isTrue);
      expect(codes.contains('de'), isTrue);
      expect(codes.contains('pt'), isTrue);
      expect(codes.contains('ru'), isTrue);
      expect(codes.contains('ja'), isTrue);
      expect(codes.contains('ko'), isTrue);
      expect(codes.contains('tr'), isTrue);
      expect(codes.contains('id'), isTrue);
      expect(codes.contains('ur'), isTrue);
    });

    test('RTL languages are correctly identified', () {
      final arabic = AppLanguage.getByCode('ar');
      expect(arabic.isRtl, isTrue);

      final urdu = AppLanguage.getByCode('ur');
      expect(urdu.isRtl, isTrue);

      final farsi = AppLanguage.getByCode('fa');
      expect(farsi.isRtl, isTrue);

      final hebrew = AppLanguage.getByCode('he');
      expect(hebrew.isRtl, isTrue);

      final english = AppLanguage.getByCode('en');
      expect(english.isRtl, isFalse);

      final spanish = AppLanguage.getByCode('es');
      expect(spanish.isRtl, isFalse);
    });

    test('AppLocalizations translates keys in multiple world languages', () {
      final locEn = AppLocalizations(const Locale('en'));
      expect(locEn.translate('nav_explore'), 'Explore');
      expect(locEn.translate('nav_profile'), 'Profile');

      final locEs = AppLocalizations(const Locale('es'));
      expect(locEs.translate('nav_explore'), 'Explorar');
      expect(locEs.translate('nav_profile'), 'Perfil');

      final locAr = AppLocalizations(const Locale('ar'));
      expect(locAr.translate('nav_explore'), 'استكشف');
      expect(locAr.translate('nav_profile'), 'الملف الشخصي');

      final locHi = AppLocalizations(const Locale('hi'));
      expect(locHi.translate('nav_explore'), 'एक्सप्लोर');
      expect(locHi.translate('nav_profile'), 'प्रोफाइल');

      final locZh = AppLocalizations(const Locale('zh'));
      expect(locZh.translate('nav_explore'), '探索');
      expect(locZh.translate('nav_profile'), '我的');
    });

    test('AppLocalizations gracefully falls back to English when key is missing', () {
      final loc = AppLocalizations(const Locale('xx')); // Unknown locale
      // Should fallback to English
      expect(loc.translate('nav_explore'), 'Explore');
      expect(loc.translate('action_cancel'), 'Cancel');
    });

    test('TranslationService handles blank strings and fallback cleanly without crashing', () async {
      final service = TranslationService();
      await service.init();

      // Empty string returns original
      final emptyResult = await service.translateText('');
      expect(emptyResult, '');

      // Whitespace returns original
      final whitespaceResult = await service.translateText('   ');
      expect(whitespaceResult, '   ');
    });

    test('World languages registry covers over 100 languages', () {
      expect(AppLanguage.worldLanguages.length, greaterThanOrEqualTo(100));
      final arabic = AppLanguage.getByCode('ar');
      expect(arabic.isRtl, isTrue);
      final japanese = AppLanguage.getByCode('ja');
      expect(japanese.isRtl, isFalse);
    });

    test('String.tr extension works seamlessly', () {
      expect('Explore'.tr, isNotEmpty);
      expect('Cancel'.tr, isNotEmpty);
    });
  });
}
