const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, 'translations_cache.json');
const OUTPUT_FILE = path.join(__dirname, 'src/i18n/translations.ts');
const STRINGS_FILE = path.join(__dirname, 'extracted_strings.json');

const targetLangs = ['es', 'ar', 'hi', 'zh', 'fr', 'de', 'pt', 'ru', 'tr', 'id', 'ur'];

// Load extracted strings
const strings = JSON.parse(fs.readFileSync(STRINGS_FILE, 'utf8'));

// Load or initialize cache
let cache = {};
if (fs.existsSync(CACHE_FILE)) {
  try {
    cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  } catch (e) {
    cache = {};
  }
}

for (const lang of targetLangs) {
  if (!cache[lang]) cache[lang] = {};
}

// Curated Live-Streaming Domain Master Dictionary
const domainOverrides = {
  'Overview': { es: 'Resumen General', ar: 'نظرة عامة', hi: 'अवलोकन', zh: '总览', fr: 'Vue d’ensemble', de: 'Übersicht', pt: 'Visão Geral', ru: 'Обзор', tr: 'Genel Bakış', id: 'Ringkasan', ur: 'جائزہ' },
  'Users': { es: 'Usuarios', ar: 'المستخدمون', hi: 'उपयोगकर्ता', zh: '用户管理', fr: 'Utilisateurs', de: 'Benutzer', pt: 'Usuários', ru: 'Пользователи', tr: 'Kullanıcılar', id: 'Pengguna', ur: 'صارفین' },
  'Reports': { es: 'Reportes', ar: 'البلاغات', hi: 'शिकायतें', zh: '举报中心', fr: 'Signalements', de: 'Meldungen', pt: 'Denúncias', ru: 'Жалобы', tr: 'Şikayetler', id: 'Laporan', ur: 'شکایات' },
  'Streams': { es: 'Transmisiones', ar: 'البث المباشر', hi: 'लाइव स्ट्रीम्स', zh: '直播监控', fr: 'Diffusions', de: 'Live-Streams', pt: 'Transmissões', ru: 'Трансляции', tr: 'Yayınlar', id: 'Siaran Langsung', ur: 'لائیو اسٹریمز' },
  'Resellers': { es: 'Revendedores', ar: 'الموزعون', hi: 'रीसेलर्स', zh: '分销商', fr: 'Revendeurs', de: 'Wiederverkäufer', pt: 'Revendedores', ru: 'Реселлеры', tr: 'Bayiler', id: 'Pengecer Koin', ur: 'ری سیلرز' },
  'Agencies': { es: 'Agencias', ar: 'الوكالات', hi: 'एजेंसियां', zh: '公会管理', fr: 'Agences', de: 'Agenturen', pt: 'Agências', ru: 'Агентства', tr: 'Ajanslar', id: 'Agensi', ur: 'ایجنسیز' },
  'Gifts': { es: 'Regalos', ar: 'الهدايا', hi: 'उपहार (गिफ्ट्स)', zh: '礼物管理', fr: 'Cadeaux', de: 'Geschenke', pt: 'Presentes', ru: 'Подарки', tr: 'Hediyeler', id: 'Hadiah', ur: 'تحائف' },
  'Payouts': { es: 'Retiros', ar: 'المدفوعات', hi: 'भुगतान (पेआउट्स)', zh: '提现审核', fr: 'Paiements', de: 'Auszahlungen', pt: 'Saques', ru: 'Выплаты', tr: 'Ödemeler', id: 'Penarikan Dana', ur: 'ادائیگیاں' },
  'Financial': { es: 'Finanzas', ar: 'المالية', hi: 'वित्तीय', zh: '财务报表', fr: 'Finances', de: 'Finanzen', pt: 'Financeiro', ru: 'Финансы', tr: 'Finansal', id: 'Keuangan', ur: 'مالیات' },
  'Contact Support': { es: 'Atención al Cliente', ar: 'الدعم الفني', hi: 'सहायता संपर्क', zh: '客服支持', fr: 'Support Client', de: 'Support-Kontakt', pt: 'Suporte ao Cliente', ru: 'Служба поддержки', tr: 'Destek İletişim', id: 'Dukungan Resmi', ur: 'مدد اور رابطہ' },
  'VIP Features': { es: 'Funciones VIP', ar: 'مميزات VIP', hi: 'वीआईपी फीचर्स', zh: 'VIP 特权', fr: 'Fonctionnalités VIP', de: 'VIP-Funktionen', pt: 'Recursos VIP', ru: 'VIP-функции', tr: 'VIP Özellikler', id: 'Fitur VIP', ur: 'وی آئی پی خصوصیات' },
  'Super Admin': { es: 'Superadministrador', ar: 'المدير العام', hi: 'सुपर एडमिन', zh: '超级管理员', fr: 'Super Administrateur', de: 'Super-Administrator', pt: 'Super Administrador', ru: 'Супер-админ', tr: 'Süper Yönetici', id: 'Super Admin', ur: 'سپر ایڈمن' },
  'Admin Console': { es: 'Consola de Administración', ar: 'لوحة تحكم المسؤول', hi: 'एडमिन कंसोल', zh: '管理控制台', fr: 'Console d’Administration', de: 'Administrationskonsole', pt: 'Console de Administração', ru: 'Панель администратора', tr: 'Yönetici Konsolu', id: 'Konsol Admin', ur: 'ایڈمن کنسول' },
  'Agency Portal': { es: 'Portal de Agencias', ar: 'بوابة الوكالات', hi: 'एजेंसी पोर्टल', zh: '公会后台', fr: 'Portail d’Agence', de: 'Agenturportal', pt: 'Portal da Agência', ru: 'Портал агентств', tr: 'Ajans Portalı', id: 'Portal Agensi', ur: 'ایجنسی پورٹل' },
  'Talent Agency Portal': { es: 'Portal de Agencia de Talentos', ar: 'بوابة وكالة المواهب', hi: 'टैलेंट एजेंसी पोर्टल', zh: '公会管理后台', fr: 'Portail d’Agence de Talents', de: 'Talentagentur-Portal', pt: 'Portal da Agência de Talentos', ru: 'Портал агентства талантов', tr: 'Yetenek Ajansı Portalı', id: 'Portal Agensi Bakat', ur: 'ٹیلنٹ ایجنسی پورٹل' },
  'Kill Stream': { es: 'Finalizar Transmisión', ar: 'إنهاء البث فوراً', hi: 'स्ट्रीम समाप्त करें', zh: '强制关播', fr: 'Arrêter le Stream', de: 'Stream beenden', pt: 'Encerrar Stream', ru: 'Остановить эфир', tr: 'Yayını Sonlandır', id: 'Hentikan Siaran', ur: 'اسٹریم ختم کریں' },
  'Terminate Room': { es: 'Terminar Sala', ar: 'إغلاق الغرفة', hi: 'रूम समाप्त करें', zh: '解散房间', fr: 'Fermer le Salon', de: 'Raum beenden', pt: 'Encerrar Sala', ru: 'Закрыть комнату', tr: 'Odayı Sonlandır', id: 'Tutup Ruangan', ur: 'کمرہ ختم کریں' },
  'Ban User': { es: 'Bloquear Usuario', ar: 'حظر المستخدم', hi: 'यूज़र को बैन करें', zh: '封禁用户', fr: 'Bannir l’Utilisateur', de: 'Benutzer sperren', pt: 'Banir Usuário', ru: 'Заблокировать', tr: 'Kullanıcıyı Yasakla', id: 'Blokir Pengguna', ur: 'صارف پر پابندی لگائیں' },
  'Diamonds': { es: 'Diamantes', ar: 'الماس', hi: 'डायमंड्स', zh: '钻石', fr: 'Diamants', de: 'Diamanten', pt: 'Diamantes', ru: 'Алмазы', tr: 'Elmaslar', id: 'Berlian', ur: 'ڈائمنڈز' },
  'Coins': { es: 'Monedas', ar: 'العملات', hi: 'सिक्के', zh: '金币', fr: 'Pièces', de: 'Münzen', pt: 'Moedas', ru: 'Монеты', tr: 'Jetonlar', id: 'Koin', ur: 'سکے' },
  'Status': { es: 'Estado', ar: 'الحالة', hi: 'स्थिति', zh: '状态', fr: 'Statut', de: 'Status', pt: 'Status', ru: 'Статус', tr: 'Durum', id: 'Status', ur: 'حالت' },
  'Actions': { es: 'Acciones', ar: 'الإجراءات', hi: 'कार्रवाई', zh: '操作', fr: 'Actions', de: 'Aktionen', pt: 'Ações', ru: 'Действия', tr: 'İşlemler', id: 'Tindakan', ur: 'کارروائیاں' },
  'Search': { es: 'Buscar', ar: 'بحث', hi: 'खोजें', zh: '搜索', fr: 'Rechercher', de: 'Suchen', pt: 'Pesquisar', ru: 'Поиск', tr: 'Ara', id: 'Cari', ur: 'تلاش کریں' },
  'Filter': { es: 'Filtrar', ar: 'تصفية', hi: 'फ़िल्टर', zh: '筛选', fr: 'Filtrer', de: 'Filtern', pt: 'Filtrar', ru: 'Фильтр', tr: 'Filtrele', id: 'Saring', ur: 'فلٹر' },
  'Save Changes': { es: 'Guardar Cambios', ar: 'حفظ التغييرات', hi: 'बदलाव सहेजें', zh: '保存更改', fr: 'Enregistrer les Modifications', de: 'Änderungen speichern', pt: 'Salvar Alterações', ru: 'Сохранить изменения', tr: 'Değişiklikleri Kaydet', id: 'Simpan Perubahan', ur: 'تبدیلیاں محفوظ کریں' },
  'Cancel': { es: 'Cancelar', ar: 'إلغاء', hi: 'रद्द करें', zh: '取消', fr: 'Annuler', de: 'Abbrechen', pt: 'Cancelar', ru: 'Отмена', tr: 'İptal', id: 'Batal', ur: 'منسوخ کریں' },
  'Confirm': { es: 'Confirmar', ar: 'تأكيد', hi: 'पुष्टि करें', zh: '确认', fr: 'Confirmer', de: 'Bestätigen', pt: 'Confirmar', ru: 'Подтвердить', tr: 'Onayla', id: 'Konfirmasi', ur: 'تصدیق کریں' },
  'Close': { es: 'Cerrar', ar: 'إغلاق', hi: 'बंद करें', zh: '关闭', fr: 'Fermer', de: 'Schließen', pt: 'Fechar', ru: 'Закрыть', tr: 'Kapat', id: 'Tutup', ur: 'بند کریں' },
  'Log Out': { es: 'Cerrar Sesión', ar: 'تسجيل الخروج', hi: 'लॉग आउट', zh: '退出登录', fr: 'Déconnexion', de: 'Abmelden', pt: 'Sair', ru: 'Выйти', tr: 'Çıkış Yap', id: 'Keluar', ur: 'لاگ آؤٹ' },
  'Logout': { es: 'Cerrar Sesión', ar: 'تسجيل الخروج', hi: 'लॉग आउट', zh: '退出登录', fr: 'Déconnexion', de: 'Abmelden', pt: 'Sair', ru: 'Выйти', tr: 'Çıkış Yap', id: 'Keluar', ur: 'لاگ آؤٹ' }
};

// Seed domain overrides into cache
for (const [key, transObj] of Object.entries(domainOverrides)) {
  for (const lang of targetLangs) {
    if (transObj[lang]) {
      cache[lang][key] = transObj[lang];
    }
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchBatch(batch, targetLang) {
  const query = batch.join('\n');
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(query)}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}`);
  }
  const data = await resp.json();
  if (data && data[0] && Array.isArray(data[0])) {
    const fullText = data[0].map(item => item[0]).join('');
    const parts = fullText.split('\n');
    return parts;
  }
  throw new Error('Unexpected translation response format');
}

async function main() {
  console.log(`Starting translation pipeline for ${strings.length} strings across ${targetLangs.length} languages...`);

  for (const lang of targetLangs) {
    // Find missing strings for this language
    const missing = strings.filter(s => !cache[lang][s]);
    console.log(`Language [${lang}]: ${missing.length} strings to translate.`);

    if (missing.length === 0) continue;

    const BATCH_SIZE = 25;
    for (let i = 0; i < missing.length; i += BATCH_SIZE) {
      const batch = missing.slice(i, i + BATCH_SIZE);
      try {
        const results = await fetchBatch(batch, lang);
        for (let j = 0; j < batch.length; j++) {
          const original = batch[j];
          const translated = results[j] ? results[j].trim() : original;
          cache[lang][original] = translated || original;
        }
        process.stdout.write(`.`);
      } catch (err) {
        console.warn(`\nBatch translation error for [${lang}] (retrying one-by-one):`, err.message);
        // Fallback: translate individually
        for (const str of batch) {
          try {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${lang}&dt=t&q=${encodeURIComponent(str)}`;
            const resp = await fetch(url);
            if (resp.ok) {
              const data = await resp.json();
              if (data && data[0] && data[0][0]) {
                cache[lang][str] = data[0][0][0] || str;
              }
            }
          } catch (e) {
            cache[lang][str] = str;
          }
          await sleep(150);
        }
      }
      await sleep(250); // Be respectful to the API
    }
    console.log(`\nCompleted [${lang}]. Total cached: ${Object.keys(cache[lang]).length}`);
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
  }

  // Save cache
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');

  // Now generate translations.ts
  const tsContent = `export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  dir?: 'ltr' | 'rtl';
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', dir: 'ltr' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', dir: 'ltr' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', dir: 'rtl' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', dir: 'ltr' },
  { code: 'zh', name: 'Chinese', nativeName: '简体中文', flag: '🇨🇳', dir: 'ltr' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', dir: 'ltr' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', dir: 'ltr' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷', dir: 'ltr' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', dir: 'ltr' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷', dir: 'ltr' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩', dir: 'ltr' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', flag: '🇵🇰', dir: 'rtl' },
];

export const DICTIONARY: Record<string, Record<string, string>> = ${JSON.stringify(cache, null, 2)};
`;

  fs.writeFileSync(OUTPUT_FILE, tsContent, 'utf8');
  console.log(`\nMaster translations generated successfully at: ${OUTPUT_FILE}`);
}

main().catch(console.error);
