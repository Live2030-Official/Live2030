import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class LiveColors {
  // Backgrounds matching reference designs
  static const Color background = Color(0xFF160626);          // Deep royal midnight purple
  static const Color backgroundSurface = Color(0xFF220D3A);   // Card & surface container
  static const Color backgroundElevated = Color(0xFF2B1348);  // Pills, chips, top bar
  static const Color backgroundInput = Color(0xFF25103E);     // Inputs, textareas
  static const Color navBarBackground = Color(0xFF120420);    // Bottom navigation bar
  static const Color cardOverlay = Color(0x66000000);         // Scrim for images

  // Vibrant Accents & Highlights
  static const Color accentPink = Color(0xFFFF2B85);          // Neon Hot Magenta/Pink
  static const Color accentPurple = Color(0xFF8B25FF);        // Electric Violet
  static const Color accentBlue = Color(0xFF1E88E5);          // Google Blue
  static const Color waveGreen = Color(0xFF34D399);           // Audio wave indicator
  static const Color gold = Color(0xFFFFB800);                // Trophy / VIP gold

  // Gradients
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [accentPink, accentPurple],
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
  );

  static const LinearGradient verticalGradient = LinearGradient(
    colors: [Color(0xFF2A104E), Color(0xFF160626), Color(0xFF0F021B)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );

  static const LinearGradient callButtonGradient = LinearGradient(
    colors: [Color(0xFFFF2B85), Color(0xFF8B25FF)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // Typography & Borders
  static const Color textPrimary = Color(0xFFFFFFFF);
  static const Color textSecondary = Color(0xFFA594C9);        // Soft lilac
  static const Color textMuted = Color(0xFF7A6B99);            // Hints & captions
  static const Color borderSubtle = Color(0xFF3A1A60);         // Subtle borders
  static const Color borderGlow = Color(0xFF8B25FF);

  // Convenient Aliases
  static const Color backgroundPrimary = background;
  static const Color border = borderSubtle;
  static const Color primaryAccent = accentPink;
}

class AppTheme {
  /// Streaming typography family: Plus Jakarta Sans
  static String? get fontFamily => GoogleFonts.plusJakartaSans().fontFamily;

  /// Universal streaming font helper
  static TextStyle font({
    TextStyle? textStyle,
    Color? color,
    Color? backgroundColor,
    double? fontSize,
    FontWeight? fontWeight,
    FontStyle? fontStyle,
    double? letterSpacing,
    double? wordSpacing,
    TextBaseline? textBaseline,
    double? height,
    Locale? locale,
    Paint? foreground,
    Paint? background,
    List<Shadow>? shadows,
    List<FontFeature>? fontFeatures,
    TextDecoration? decoration,
    Color? decorationColor,
    TextDecorationStyle? decorationStyle,
    double? decorationThickness,
  }) {
    return GoogleFonts.plusJakartaSans(
      textStyle: textStyle,
      color: color,
      backgroundColor: backgroundColor,
      fontSize: fontSize,
      fontWeight: fontWeight,
      fontStyle: fontStyle,
      letterSpacing: letterSpacing,
      wordSpacing: wordSpacing,
      textBaseline: textBaseline,
      height: height,
      locale: locale,
      foreground: foreground,
      background: background,
      shadows: shadows,
      fontFeatures: fontFeatures,
      decoration: decoration,
      decorationColor: decorationColor,
      decorationStyle: decorationStyle,
      decorationThickness: decorationThickness,
    );
  }

  static ThemeData get darkTheme {
    final base = ThemeData.dark();
    final textTheme = GoogleFonts.plusJakartaSansTextTheme(base.textTheme).apply(
      bodyColor: LiveColors.textPrimary,
      displayColor: LiveColors.textPrimary,
      decorationColor: LiveColors.textPrimary,
    );
    final primaryTextTheme = GoogleFonts.plusJakartaSansTextTheme(base.primaryTextTheme).apply(
      bodyColor: LiveColors.textPrimary,
      displayColor: LiveColors.textPrimary,
      decorationColor: LiveColors.textPrimary,
    );

    return ThemeData(
      brightness: Brightness.dark,
      fontFamily: GoogleFonts.plusJakartaSans().fontFamily,
      scaffoldBackgroundColor: LiveColors.background,
      primaryColor: LiveColors.accentPurple,
      canvasColor: LiveColors.background,
      cardColor: LiveColors.backgroundSurface,
      dialogTheme: const DialogThemeData(
        backgroundColor: LiveColors.backgroundSurface,
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: LiveColors.backgroundSurface,
        surfaceTintColor: Colors.transparent,
      ),
      textTheme: textTheme,
      primaryTextTheme: primaryTextTheme,
      colorScheme: const ColorScheme.dark(
        primary: LiveColors.accentPurple,
        secondary: LiveColors.accentPink,
        surface: LiveColors.backgroundSurface,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: LiveColors.background,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
        titleTextStyle: GoogleFonts.plusJakartaSans(
          fontSize: 18,
          fontWeight: FontWeight.bold,
          color: LiveColors.textPrimary,
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: const Color(0xFF1E1B4B),
        contentTextStyle: GoogleFonts.plusJakartaSans(
          color: Colors.white,
          fontSize: 13,
          fontWeight: FontWeight.w600,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: Color(0xFF6366F1), width: 1),
        ),
        elevation: 10,
      ),
    );
  }
}
