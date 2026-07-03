import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Lang = "ar" | "en";

interface I18nContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  dir: "rtl" | "ltr";
}

const I18nContext = createContext<I18nContextValue>({
  lang: "ar",
  setLang: () => {},
  t: (k) => k,
  dir: "rtl",
});

// ─────────────────────────────────────────────────────────────────────────────
// Translations dictionary
// ─────────────────────────────────────────────────────────────────────────────
const T: Record<string, { ar: string; en: string }> = {
  // Language toggle
  lang_switch: { ar: "English", en: "عربي" },

  // Navigation
  nav_home: { ar: "الرئيسية", en: "Home" },
  nav_lists: { ar: "القوائم", en: "Lists" },
  nav_settings: { ar: "الإعدادات", en: "Settings" },
  nav_logout: { ar: "تسجيل الخروج", en: "Logout" },
  nav_light_mode: { ar: "الوضع الفاتح", en: "Light mode" },
  nav_dark_mode: { ar: "الوضع المظلم", en: "Dark mode" },

  // ── Auth ──────────────────────────────────────────────────────────────────
  auth_hero_subtitle: {
    ar: "أرسل رسائل جماعية لعملائك بكل سهولة وسرعة عبر WhatsApp",
    en: "Send bulk messages to your customers easily and quickly via WhatsApp",
  },
  auth_bulk_send: { ar: "إرسال جماعي", en: "Bulk Send" },
  auth_contact_lists: { ar: "قوائم جهات الاتصال", en: "Contact Lists" },
  auth_media_support: { ar: "دعم الوسائط", en: "Media Support" },

  auth_login_title: { ar: "تسجيل الدخول", en: "Sign In" },
  auth_login_subtitle: { ar: "أدخل بياناتك للوصول إلى لوحة التحكم", en: "Enter your credentials to access the dashboard" },
  auth_username: { ar: "اسم المستخدم", en: "Username" },
  auth_password: { ar: "كلمة المرور", en: "Password" },
  auth_login_btn: { ar: "تسجيل الدخول", en: "Sign In" },
  auth_signing_in: { ar: "جارٍ الدخول...", en: "Signing in..." },
  auth_forgot_password: { ar: "نسيت كلمة المرور؟", en: "Forgot password?" },
  auth_connection_error: { ar: "خطأ في الاتصال", en: "Connection error" },
  auth_error: { ar: "خطأ", en: "Error" },
  auth_wrong_credentials: { ar: "اسم المستخدم أو كلمة المرور غير صحيحة", en: "Invalid username or password" },

  auth_setup_title: { ar: "إنشاء حسابك", en: "Create Account" },
  auth_setup_subtitle: { ar: "المرة الأولى — اختر اسم المستخدم وكلمة المرور", en: "First run — choose a username and password" },
  auth_setup_badge: { ar: "إعداد أولي", en: "Initial Setup" },
  auth_setup_info: { ar: "هذه البيانات ستُستخدم لتسجيل الدخول لاحقاً. احتفظ بها في مكان آمن.", en: "These credentials will be used for future logins. Keep them in a safe place." },
  auth_confirm_password: { ar: "تأكيد كلمة المرور", en: "Confirm Password" },
  auth_create_account_btn: { ar: "إنشاء الحساب والدخول", en: "Create Account & Sign In" },
  auth_creating: { ar: "جارٍ الإنشاء...", en: "Creating..." },
  auth_passwords_mismatch: { ar: "كلمتا المرور غير متطابقتين", en: "Passwords do not match" },
  auth_password_short: { ar: "كلمة المرور 6 أحرف على الأقل", en: "Password must be at least 6 characters" },
  auth_account_created: { ar: "✅ تم إنشاء الحساب", en: "✅ Account Created" },
  auth_welcome: { ar: "مرحباً بك في WhatsApp Broadcast", en: "Welcome to WhatsApp Broadcast" },
  auth_fail_create: { ar: "فشل إنشاء الحساب", en: "Failed to create account" },

  auth_forgot_title: { ar: "استرداد كلمة المرور", en: "Reset Password" },
  auth_forgot_subtitle: { ar: "استخدم GitHub Token المسجّل لإعادة التعيين", en: "Use your registered GitHub Token to reset" },
  auth_github_token: { ar: "GitHub Token", en: "GitHub Token" },
  auth_github_token_hint: { ar: "نفس الـ Token المسجّل في صفحة الإعدادات", en: "Same token registered in the Settings page" },
  auth_new_password: { ar: "كلمة المرور الجديدة", en: "New Password" },
  auth_reset_btn: { ar: "إعادة تعيين كلمة المرور", en: "Reset Password" },
  auth_reset_done: { ar: "✅ تم", en: "✅ Done" },
  auth_reset_success: { ar: "تم إعادة تعيين كلمة المرور بنجاح", en: "Password reset successfully" },
  auth_reset_fail: { ar: "فشل إعادة تعيين كلمة المرور", en: "Failed to reset password" },
  auth_back_to_login: { ar: "← العودة لتسجيل الدخول", en: "← Back to Sign In" },
  auth_loading: { ar: "جارٍ التحميل…", en: "Loading…" },

  // ── Campaign ──────────────────────────────────────────────────────────────
  campaign_title: { ar: "رسالة جديدة", en: "New Message" },
  campaign_subtitle: { ar: "اختار جهات الاتصال، اكتب الرسالة، أضف صور وفيديوهات، ثم أرسل", en: "Select contacts, write message, add media, then send" },
  campaign_wa_not_connected: { ar: "لازم تربط WhatsApp الأول.", en: "You need to connect WhatsApp first." },
  campaign_wa_go_settings: { ar: "اذهب للإعدادات وامسح QR Code", en: "Go to Settings and scan the QR Code" },

  campaign_step_phones: { ar: "أرقام الهاتف", en: "Phone Numbers" },
  campaign_manual: { ar: "إدخال يدوي", en: "Manual Entry" },
  campaign_from_lists: { ar: "من القوائم", en: "From Lists" },
  campaign_add_phone: { ar: "أضف رقماً", en: "Add a number" },
  campaign_or_paste: { ar: "أو لصق عدة أرقام:", en: "Or paste multiple numbers:" },
  campaign_paste_hint: { ar: "كل رقم في سطر أو مفصولة بفواصل", en: "One per line or comma-separated" },
  campaign_add_all: { ar: "إضافة الكل", en: "Add All" },
  campaign_cancel: { ar: "إلغاء", en: "Cancel" },
  campaign_bulk_paste: { ar: "لصق متعدد", en: "Bulk Paste" },
  campaign_no_lists: { ar: "لا توجد قوائم بعد.", en: "No lists yet." },
  campaign_setup_github: { ar: "أضف GitHub Token من الإعدادات لحفظ قوائمك.", en: "Add a GitHub Token in Settings to save your lists." },
  campaign_save_list: { ar: "حفظ كقائمة", en: "Save as List" },
  campaign_select_all: { ar: "تحديد الكل", en: "Select All" },
  campaign_deselect_all: { ar: "إلغاء الكل", en: "Deselect All" },

  campaign_step_message: { ar: "الرسالة", en: "Message" },
  campaign_message_placeholder: { ar: "اكتب رسالتك هنا…", en: "Write your message here…" },
  campaign_signature: { ar: "التوقيع", en: "Signature" },
  campaign_signature_placeholder: { ar: "مثال: فريق الدعم – اتصل 010xxxxxxxx", en: "e.g. Support Team – Call 010xxxxxxxx" },
  campaign_edit_signature: { ar: "تعديل التوقيع", en: "Edit Signature" },
  campaign_save_signature: { ar: "حفظ", en: "Save" },

  campaign_step_media: { ar: "صور وفيديو", en: "Photos & Video" },
  campaign_drag_drop: { ar: "اسحب ملفات هنا أو اضغط للاختيار", en: "Drag files here or click to choose" },
  campaign_browse: { ar: "تصفح", en: "Browse" },
  campaign_accepted_formats: { ar: "صور: JPG, PNG, WebP, GIF  |  فيديو: MP4 (حتى 5 دقائق)", en: "Images: JPG, PNG, WebP, GIF  |  Video: MP4 (up to 5 min)" },
  campaign_video_max: { ar: "الفيديو أكثر من 5 دقائق — الحد الأقصى 5 دقائق", en: "Video exceeds 5 minutes — maximum is 5 minutes" },
  campaign_video_too_long: { ar: "الفيديو {n} دقيقة — الحد الأقصى 5 دقائق", en: "Video is {n} min — max is 5 minutes" },
  campaign_file_too_large: { ar: "الملف أكبر من 300MB", en: "File exceeds 300MB" },
  campaign_upload_error: { ar: "خطأ في الرفع", en: "Upload error" },
  campaign_unsupported_type: { ar: "نوع ملف غير مدعوم", en: "Unsupported file type" },
  campaign_mp4_only: { ar: "الفيديو المدعوم هو MP4 فقط — وذلك لضمان التشغيل في WhatsApp", en: "Only MP4 video is supported — to ensure playback in WhatsApp" },
  campaign_list_empty: { ar: "القائمة فاضية", en: "List is empty" },
  campaign_number_label: { ar: "رقم", en: "number(s)" },
  campaign_sig_enabled: { ar: "مفعّل", en: "Enabled" },
  campaign_sig_disabled: { ar: "معطّل", en: "Disabled" },
  campaign_no_signature: { ar: "لا يوجد توقيع — اضغط «تعديل» لإضافة واحد", en: "No signature — click «Edit» to add one" },

  campaign_send_btn: { ar: "إرسال", en: "Send" },
  campaign_sending: { ar: "جاري الإرسال...", en: "Sending..." },
  campaign_no_phones: { ar: "لم تحدد أي أرقام بعد", en: "No numbers selected yet" },
  campaign_contacts_count: { ar: "{n} جهة اتصال", en: "{n} contact(s)" },

  campaign_confirm_title: { ar: "تأكيد الإرسال", en: "Confirm Send" },
  campaign_contacts_label: { ar: "جهة اتصال", en: "contact(s)" },
  campaign_total_messages: { ar: "رسالة إجمالي", en: "total message(s)" },
  campaign_will_send: { ar: "ما سيتم إرساله لكل شخص:", en: "What will be sent to each person:" },
  campaign_media_first: { ar: "ملف ميديا (صور/فيديو) — تُرسل أولاً", en: "media file(s) (photos/video) — sent first" },
  campaign_text_after: { ar: "رسالة نصية — تُرسل بعد الميديا", en: "text message — sent after media" },
  campaign_text_only: { ar: "رسالة نصية (فقط)", en: "text message (only)" },
  campaign_send_now: { ar: "أرسل الآن", en: "Send Now" },

  campaign_results_title: { ar: "نتائج الإرسال", en: "Send Results" },
  campaign_succeeded: { ar: "نجح", en: "succeeded" },
  campaign_failed: { ar: "فشل", en: "failed" },
  campaign_sent_summary: { ar: "تم الإرسال: {sent} نجح، {failed} فشل", en: "Sent: {sent} succeeded, {failed} failed" },
  campaign_send_fail: { ar: "فشل الإرسال", en: "Send Failed" },
  campaign_check_wa: { ar: "تحقق من اتصال WhatsApp", en: "Check WhatsApp connection" },

  campaign_save_list_title: { ar: "حفظ كقائمة", en: "Save as List" },
  campaign_list_name: { ar: "اسم القائمة", en: "List Name" },
  campaign_list_name_placeholder: { ar: "مثال: عملاء فبراير", en: "e.g. February Clients" },
  campaign_will_save: { ar: "سيتم حفظ {n} رقم في هذه القائمة", en: "Will save {n} number(s) in this list" },
  campaign_save: { ar: "حفظ", en: "Save" },
  campaign_saved_list: { ar: "تم حفظ \"{name}\" — {n} رقم", en: "Saved \"{name}\" — {n} number(s)" },
  campaign_save_fail: { ar: "فشل الحفظ", en: "Save Failed" },
  campaign_files_sent_first: { ar: "{n} ملف (تُرسل أولاً)", en: "{n} file(s) (sent first)" },
  campaign_text_sent_after: { ar: "النص (يُرسل بعد الميديا)", en: "Text (sent after media)" },
  campaign_text_sent_only: { ar: "النص (فقط)", en: "Text (only)" },

  // ── Lists ─────────────────────────────────────────────────────────────────
  lists_title: { ar: "قوائم جهات الاتصال", en: "Contact Lists" },
  lists_subtitle_plural: { ar: "{l} قائمة · {c} جهة اتصال", en: "{l} list(s) · {c} contact(s)" },
  lists_subtitle_empty: { ar: "أنشئ قوائم وحفظها على GitHub Gist", en: "Create lists and save them on GitHub Gist" },
  lists_no_github: { ar: "لحفظ القوائم محتاج GitHub Personal Access Token —", en: "To save lists you need a GitHub Personal Access Token —" },
  lists_go_settings: { ar: "الإعدادات", en: "Settings" },
  lists_loading: { ar: "جاري تحميل القوائم...", en: "Loading lists..." },
  lists_empty_title: { ar: "لا توجد قوائم بعد", en: "No lists yet" },
  lists_empty_subtitle: { ar: "أنشئ قائمة وأضف جهات اتصالك", en: "Create a list and add your contacts" },
  lists_create_first: { ar: "أنشئ أول قائمة", en: "Create First List" },
  lists_new: { ar: "قائمة جديدة", en: "New List" },
  lists_no_contacts: { ar: "لا توجد جهات اتصال", en: "No contacts" },
  lists_contact_count: { ar: "{n} جهة اتصال", en: "{n} contact(s)" },
  lists_quick_add: { ar: "إضافة جهة اتصال سريعة", en: "Quick Add Contact" },
  lists_name_optional: { ar: "الاسم (اختياري)", en: "Name (optional)" },
  lists_save: { ar: "حفظ", en: "Save" },
  lists_enter_to_save: { ar: "Enter للحفظ · Esc للإغلاق", en: "Enter to save · Esc to close" },
  lists_already_exists: { ar: "الرقم موجود بالفعل في القائمة", en: "Number already exists in the list" },
  lists_added_to: { ar: "تمت الإضافة إلى \"{name}\"", en: "Added to \"{name}\"" },
  lists_save_fail: { ar: "فشل الحفظ", en: "Save Failed" },
  lists_create_title: { ar: "قائمة جديدة", en: "New List" },
  lists_edit_title: { ar: "تعديل \"{name}\"", en: "Edit \"{name}\"" },
  lists_list_name_label: { ar: "اسم القائمة *", en: "List Name *" },
  lists_list_name_placeholder: { ar: "مثال: عملاء يناير، مجموعة A", en: "e.g. January Clients, Group A" },
  lists_add_contact: { ar: "إضافة جهة اتصال", en: "Add Contact" },
  lists_enter_to_add: { ar: "Enter للإضافة", en: "Enter to add" },
  lists_add_btn: { ar: "إضافة", en: "Add" },
  lists_bulk_paste: { ar: "لصق متعدد", en: "Bulk Paste" },
  lists_bulk_hint: { ar: "كل رقم في سطر أو مفصولة بفواصل", en: "One per line or comma-separated" },
  lists_add_all: { ar: "إضافة الكل", en: "Add All" },
  lists_contacts_label: { ar: "جهات الاتصال ({n})", en: "Contacts ({n})" },
  lists_clear_all: { ar: "مسح الكل", en: "Clear All" },
  lists_no_contacts_added: { ar: "أضف جهات الاتصال باستخدام الحقول أعلاه", en: "Add contacts using the fields above" },
  lists_create_btn: { ar: "إنشاء القائمة", en: "Create List" },
  lists_save_changes: { ar: "حفظ التعديلات", en: "Save Changes" },
  lists_created: { ar: "تم إنشاء \"{name}\" — {n} جهة اتصال", en: "Created \"{name}\" — {n} contact(s)" },
  lists_updated: { ar: "تم تحديث \"{name}\"", en: "Updated \"{name}\"" },
  lists_name_taken: { ar: "يوجد قائمة بنفس الاسم", en: "A list with this name already exists" },
  lists_delete_title: { ar: "تأكيد الحذف", en: "Confirm Delete" },
  lists_delete_desc: { ar: "هيتم حذف قائمة \"{name}\" نهائياً من GitHub Gist.", en: "List \"{name}\" will be permanently deleted from GitHub Gist." },
  lists_deleted: { ar: "تم حذف \"{name}\"", en: "Deleted \"{name}\"" },
  lists_delete_fail: { ar: "فشل الحذف", en: "Delete Failed" },
  cancel: { ar: "إلغاء", en: "Cancel" },
  delete: { ar: "حذف", en: "Delete" },

  // ── Settings ──────────────────────────────────────────────────────────────
  settings_title: { ar: "الإعدادات", en: "Settings" },
  settings_subtitle: { ar: "اربط WhatsApp عن طريق QR Code وأضف GitHub لحفظ قوائم الأرقام", en: "Connect WhatsApp via QR Code and add GitHub to save your number lists" },

  settings_wa_section: { ar: "WhatsApp — ربط الجهاز", en: "WhatsApp — Connect Device" },
  settings_connected: { ar: "متصل", en: "Connected" },
  settings_not_connected: { ar: "غير متصل", en: "Not Connected" },
  settings_wa_ready: { ar: "WhatsApp متصل!", en: "WhatsApp Connected!" },
  settings_wa_ready_sub: { ar: "الجهاز جاهز لإرسال البرودكاست.", en: "Device is ready to send broadcasts." },
  settings_disconnect: { ar: "قطع الاتصال وحذف الجلسة", en: "Disconnect & Delete Session" },
  settings_disconnect_fail: { ar: "فشل قطع الاتصال", en: "Disconnect Failed" },
  settings_disconnected: { ar: "تم قطع الاتصال — جاري عرض QR جديد...", en: "Disconnected — generating new QR..." },
  settings_qr_steps_title: { ar: "خطوات ربط WhatsApp بـ QR Code:", en: "Steps to connect WhatsApp via QR Code:" },
  settings_qr_step1: { ar: "افتح WhatsApp على تليفونك", en: "Open WhatsApp on your phone" },
  settings_qr_step2: { ar: "اضغط القائمة (⋮) ثم «الأجهزة المرتبطة»", en: "Tap the menu (⋮) then \"Linked Devices\"" },
  settings_qr_step3: { ar: "اضغط «ربط جهاز» ثم امسح الـ QR Code أدناه", en: "Tap \"Link a Device\" then scan the QR Code below" },
  settings_qr_auto_refresh: { ar: "يتجدد تلقائياً", en: "Auto-refreshes" },
  settings_qr_waiting: { ar: "في انتظار QR Code...", en: "Waiting for QR Code..." },
  settings_qr_connecting: { ar: "جاري الاتصال بـ WhatsApp...", en: "Connecting to WhatsApp..." },
  settings_baileys_note: { ar: "Baileys بيشغّل WhatsApp Web — مفيش حدود على الرسائل ومش محتاج Business API.", en: "Baileys runs WhatsApp Web — no message limits and no Business API required." },

  settings_credentials_section: { ar: "تغيير اسم المستخدم وكلمة المرور", en: "Change Username & Password" },
  settings_new_username: { ar: "اسم المستخدم الجديد", en: "New Username" },
  settings_new_username_placeholder: { ar: "اكتب اسم المستخدم الجديد", en: "Enter new username" },
  settings_new_password: { ar: "كلمة المرور الجديدة", en: "New Password" },
  settings_confirm_password: { ar: "تأكيد كلمة المرور", en: "Confirm Password" },
  settings_save_credentials: { ar: "حفظ بيانات الدخول", en: "Save Credentials" },
  settings_credentials_saved: { ar: "✅ تم تغيير بيانات الدخول", en: "✅ Credentials Updated" },
  settings_credentials_saved_desc: { ar: "سجّل دخولك مجدداً بالبيانات الجديدة.", en: "Sign in again with your new credentials." },
  settings_credentials_fail: { ar: "فشل تغيير البيانات", en: "Failed to Update Credentials" },
  settings_credentials_hint: { ar: "بعد الحفظ ستُسجَّل خارجاً وتحتاج تدخل بالبيانات الجديدة.", en: "After saving you will be signed out and need to sign in with the new credentials." },
  settings_error: { ar: "خطأ", en: "Error" },
  settings_mismatch: { ar: "كلمتا المرور غير متطابقتين", en: "Passwords do not match" },

  settings_github_section: { ar: "GitHub Gist — لحفظ قوائم الأرقام", en: "GitHub Gist — Save Contact Lists" },
  settings_github_configured: { ar: "مضبوط", en: "Configured" },
  settings_github_optional: { ar: "اختياري", en: "Optional" },
  settings_github_desc: { ar: "بيخليك تحفظ قوائم أرقام العملاء على GitHub Gist وتحملها في أي وقت.", en: "Lets you save your customer number lists to GitHub Gist and load them anytime." },
  settings_github_steps_title: { ar: "خطوات الإعداد:", en: "Setup Steps:" },
  settings_github_step1_title: { ar: "أنشئ GitHub Personal Access Token", en: "Create a GitHub Personal Access Token" },
  settings_github_step1_desc: { ar: "اذهب لـ GitHub Settings > Developer settings > Personal access tokens > Tokens (classic). اضغط \"Generate new token\".", en: "Go to GitHub Settings > Developer settings > Personal access tokens > Tokens (classic). Click \"Generate new token\"." },
  settings_github_step1_link: { ar: "أنشئ Token على GitHub", en: "Create Token on GitHub" },
  settings_github_step2_title: { ar: "اختار الصلاحيات", en: "Select Permissions" },
  settings_github_step2_desc: { ar: "من الـ Scopes، اختار فقط \"gist\". ده كافي لحفظ وتحميل القوائم.", en: "From Scopes, select only \"gist\". This is enough to save and load lists." },
  settings_github_step3_title: { ar: "انسخ التوكن وحطه هنا", en: "Copy the Token and Paste Here" },
  settings_github_step3_desc: { ar: "انسخ التوكن وحطه في الخانة دي وحفظ.", en: "Copy the token, paste it in the field below, and save." },
  settings_github_token_label: { ar: "GitHub Personal Access Token", en: "GitHub Personal Access Token" },
  settings_github_token_placeholder_saved: { ar: "••••••• (محفوظ)", en: "••••••• (saved)" },
  settings_gist_id_label: { ar: "Gist ID (اختياري — للمزامنة مع Gist موجود)", en: "Gist ID (optional — to sync with existing Gist)" },
  settings_gist_id_placeholder: { ar: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", en: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" },
  settings_gist_id_hint: { ar: "اتركه فاضي لإنشاء Gist جديد تلقائياً عند أول حفظ.", en: "Leave empty to auto-create a new Gist on first save." },
  settings_save_github: { ar: "حفظ بيانات GitHub", en: "Save GitHub Data" },
  settings_github_saved: { ar: "تم حفظ بيانات GitHub", en: "GitHub data saved" },

  // Generic
  loading: { ar: "جارٍ التحميل...", en: "Loading..." },
  error: { ar: "خطأ", en: "Error" },
  save: { ar: "حفظ", en: "Save" },
  edit: { ar: "تعديل", en: "Edit" },
  delete_confirm: { ar: "حذف", en: "Delete" },

  // Country picker
  country_search: { ar: "ابحث عن دولة...", en: "Search country..." },
  country_no_results: { ar: "لا توجد نتائج", en: "No results" },

};

// ─────────────────────────────────────────────────────────────────────────────

function translate(key: string, lang: Lang, vars?: Record<string, string | number>): string {
  const entry = T[key];
  if (!entry) return key;
  let s = entry[lang] ?? entry.ar ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replace(`{${k}}`, String(v));
    }
  }
  return s;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    return (localStorage.getItem("wa_lang") as Lang) ?? "ar";
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("wa_lang", l);
    document.documentElement.setAttribute("lang", l);
    document.documentElement.setAttribute("dir", l === "ar" ? "rtl" : "ltr");
  };

  useEffect(() => {
    document.documentElement.setAttribute("lang", lang);
    document.documentElement.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
  }, [lang]);

  const t = (key: string, vars?: Record<string, string | number>) => translate(key, lang, vars);
  const dir: "rtl" | "ltr" = lang === "ar" ? "rtl" : "ltr";

  return <I18nContext.Provider value={{ lang, setLang, t, dir }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
