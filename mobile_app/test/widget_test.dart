import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:live2030/localization/app_language.dart';
import 'package:live2030/localization/app_locale_service.dart';
import 'package:live2030/localization/app_localizations.dart';

class _MockHttpOverrides extends HttpOverrides {
  @override
  HttpClient createHttpClient(SecurityContext? context) {
    return super.createHttpClient(context)
      ..badCertificateCallback = (X509Certificate cert, String host, int port) => true;
  }
}

void main() {
  setUpAll(() {
    HttpOverrides.global = _MockHttpOverrides();
  });

  testWidgets('Live2030App initialization & localization smoke test', (WidgetTester tester) async {
    await AppLocaleService().setLanguage(AppLanguage.english);

    // Provide MaterialApp test wrapper with localization delegate
    await tester.pumpWidget(
      ListenableBuilder(
        listenable: AppLocaleService(),
        builder: (context, _) => MaterialApp(
          locale: AppLocaleService().locale,
          supportedLocales: AppLocaleService.supportedLocales,
          localizationsDelegates: const [
            AppLocalizations.delegate,
          ],
          home: Scaffold(
            body: Center(
              child: Text(AppLocaleService().t('nav_explore')),
            ),
          ),
        ),
      ),
    );

    expect(find.text('Explore'), findsOneWidget);

    // Switch language to Spanish
    await AppLocaleService().setLanguage(AppLanguage.getByCode('es'));
    await tester.pump();
    expect(find.text('Explorar'), findsOneWidget);
  });
}
