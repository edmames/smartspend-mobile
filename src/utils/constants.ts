/**
 * App-wide constants: storage keys, ledger limits, category metadata,
 * wallet/transaction type metadata and the bilingual (id/en) dictionary.
 */
import type {
  BudgetStatus,
  CategoryKey,
  Language,
  WalletBrand,
  PaymentMethod,
  TransactionType,
  WalletType,
} from '../types';

export const APP_NAME = 'SmartSpend';
export const APP_VERSION = 1;
export const BACKUP_VERSION = 1;

/** Every date in the app is evaluated in this fixed offset (Asia/Jakarta, UTC+7). */
export const TIMEZONE = 'Asia/Jakarta';
export const TIMEZONE_OFFSET_MINUTES = 7 * 60;
export const DEFAULT_CURRENCY = 'IDR' as const;

/* --------------------------------- Ledger --------------------------------- */

/** Rp 1 — the smallest accepted amount. */
export const MIN_AMOUNT = 1;
/** Rp 1.000.000.000.000 (one trillion) — the largest accepted amount. */
export const MAX_AMOUNT = 1_000_000_000_000;
export const MAX_AMOUNT_INPUT_LENGTH = 16;

/* ---------------------------------- Lists --------------------------------- */

/** Infinite-scroll page size for the transaction list. */
export const TRANSACTION_PAGE_SIZE = 30;
/** Months rendered in dashboard / report trend charts. */
export const TREND_MONTHS = 6;
/** Top categories shown in monthly reports. */
export const REPORT_TOP_CATEGORIES = 5;
/** Recent transactions on the dashboard. */
export const DASHBOARD_RECENT_TRANSACTIONS = 5;
/** Top wallets on the dashboard. */
export const DASHBOARD_TOP_WALLETS = 3;
/** Wallet detail: recent transactions shown. */
export const WALLET_RECENT_TRANSACTIONS = 10;

/** Budget usage thresholds (ratio of limit). */
export const BUDGET_WARNING_THRESHOLD = 0.5;
export const BUDGET_DANGER_THRESHOLD = 1;

export function budgetStatusForRatio(ratio: number): BudgetStatus {
  if (ratio > BUDGET_DANGER_THRESHOLD) return 'exceeded';
  if (ratio >= BUDGET_WARNING_THRESHOLD) return 'warning';
  return 'safe';
}

/** Budget usage of exactly 100% is still "warning"; above 100% is "exceeded". */
export function budgetStatusLabelKey(status: BudgetStatus): string {
  switch (status) {
    case 'safe':
      return 'budget.status.safe';
    case 'warning':
      return 'budget.status.warning';
    default:
      return 'budget.status.exceeded';
  }
}

/* ------------------------------- Transactions ------------------------------ */

export const TRANSACTION_TYPES: TransactionType[] = [
  'initial',
  'income',
  'expense',
  'transfer',
  'savings_deposit',
  'savings_withdraw',
];

/** Types a user can create from the transaction form (initial is created with a wallet). */
export const USER_TRANSACTION_TYPES: TransactionType[] = [
  'income',
  'expense',
  'transfer',
  'savings_deposit',
  'savings_withdraw',
];

/**
 * Types offered as quick tabs on "Transaksi baru".
 *
 * Savings movements are intentionally absent: they move money between a wallet
 * and a goal, so they belong to the Tabungan screen where the target and its
 * progress are visible (and where the deposit/withdraw buttons already live).
 */
export const QUICK_TRANSACTION_TYPES: TransactionType[] = ['income', 'expense', 'transfer'];

interface TypeMeta {
  key: string;
  icon: string;
  /** ledger effect summary, used in helper copy */
  tone: 'in' | 'out' | 'neutral';
}

export const TRANSACTION_TYPE_META: Record<TransactionType, TypeMeta> = {
  initial: { key: 'transaction.type.initial', icon: 'flag-outline', tone: 'in' },
  income: { key: 'transaction.type.income', icon: 'arrow-down-circle-outline', tone: 'in' },
  expense: { key: 'transaction.type.expense', icon: 'arrow-up-circle-outline', tone: 'out' },
  transfer: { key: 'transaction.type.transfer', icon: 'swap-horizontal-outline', tone: 'neutral' },
  savings_deposit: { key: 'transaction.type.savings_deposit', icon: 'shield-outline', tone: 'neutral' },
  savings_withdraw: {
    key: 'transaction.type.savings_withdraw',
    icon: 'shield-outline',
    tone: 'neutral',
  },
};

export interface CategoryMeta {
  key: CategoryKey;
  icon: string;
  color: string;
  /** Categories offered for expenses. */
  expense: boolean;
  /** Categories offered for income. */
  income: boolean;
}

export const CATEGORY_META: Record<CategoryKey, CategoryMeta> = {
  food: { key: 'food', icon: 'restaurant-outline', color: '#f97316', expense: true, income: false },
  transport: { key: 'transport', icon: 'car-outline', color: '#0ea5e9', expense: true, income: false },
  entertainment: {
    key: 'entertainment',
    icon: 'game-controller-outline',
    color: '#a855f7',
    expense: true,
    income: false,
  },
  shopping: { key: 'shopping', icon: 'bag-outline', color: '#ec4899', expense: true, income: false },
  vacation: { key: 'vacation', icon: 'airplane-outline', color: '#06b6d4', expense: true, income: false },
  education: { key: 'education', icon: 'school-outline', color: '#6366f1', expense: true, income: false },
  health: { key: 'health', icon: 'medkit-outline', color: '#10b981', expense: true, income: false },
  other: {
    key: 'other',
    icon: 'ellipsis-horizontal-outline',
    color: '#94a3b8',
    expense: true,
    income: true,
  },
  salary: { key: 'salary', icon: 'cash-outline', color: '#10b981', expense: false, income: true },
  bonus: { key: 'bonus', icon: 'gift-outline', color: '#14b8a6', expense: false, income: true },
  business: {
    key: 'business',
    icon: 'briefcase-outline',
    color: '#0ea5e9',
    expense: false,
    income: true,
  },
  gift: { key: 'gift', icon: 'heart-outline', color: '#ec4899', expense: false, income: true },
  investment: {
    key: 'investment',
    icon: 'trending-up-outline',
    color: '#a855f7',
    expense: false,
    income: true,
  },
  transfer: {
    key: 'transfer',
    icon: 'swap-horizontal-outline',
    color: '#64748b',
    expense: false,
    income: false,
  },
  savings: { key: 'savings', icon: 'shield-outline', color: '#0ea5e9', expense: false, income: false },
  initial: { key: 'initial', icon: 'flag-outline', color: '#94a3b8', expense: false, income: false },
};

export const EXPENSE_CATEGORY_KEYS: CategoryKey[] = (
  Object.keys(CATEGORY_META) as CategoryKey[]
).filter((key) => CATEGORY_META[key].expense);

export const INCOME_CATEGORY_KEYS: CategoryKey[] = (
  Object.keys(CATEGORY_META) as CategoryKey[]
).filter((key) => CATEGORY_META[key].income);

/** Categories that can carry a monthly budget. */
export const BUDGET_CATEGORY_KEYS: CategoryKey[] = EXPENSE_CATEGORY_KEYS;

export const DEFAULT_EXPENSE_CATEGORY: CategoryKey = 'food';
export const DEFAULT_INCOME_CATEGORY: CategoryKey = 'salary';
/** Category stamped on the auto-generated `initial` transaction. */
export const INITIAL_CATEGORY: CategoryKey = 'initial';
/** Category stamped on transfer / savings transactions (report impact = none). */
export const TRANSFER_CATEGORY: CategoryKey = 'transfer';
export const SAVINGS_CATEGORY: CategoryKey = 'savings';
/** Fallback bucket for legacy / unknown categories in reports. */
export const FALLBACK_CATEGORY: CategoryKey = 'other';

/* --------------------------------- Wallets -------------------------------- */

interface WalletTypeMeta {
  key: string;
  icon: string;
  color: string;
}

export const WALLET_TYPE_META: Record<WalletType, WalletTypeMeta> = {
  cash: { key: 'wallet.type.cash', icon: 'cash-outline', color: '#0f9d76' },
  bank: { key: 'wallet.type.bank', icon: 'card-outline', color: '#2563eb' },
  ewallet: { key: 'wallet.type.ewallet', icon: 'phone-portrait-outline', color: '#7c3aed' },
};

export const WALLET_TYPES: WalletType[] = ['cash', 'bank', 'ewallet'];

/** Providers offered per wallet type (cash has none). */
export const WALLET_BRANDS: Record<WalletType, WalletBrand[]> = {
  cash: [],
  bank: ['BCA', 'Mandiri', 'BNI', 'BRI', 'BSI', 'CIMB'],
  ewallet: ['GoPay', 'OVO', 'DANA', 'ShopeePay'],
};

export interface WalletBrandMeta {
  /** Monogram rendered on the mark tile. */
  label: string;
  /** Brand colour — used for the tile tint and the monogram. */
  color: string;
}

export const WALLET_BRAND_META: Record<WalletBrand, WalletBrandMeta> = {
  BCA: { label: 'BCA', color: '#2b6cb0' },
  Mandiri: { label: 'MDR', color: '#2f6fb5' },
  BNI: { label: 'BNI', color: '#ea580c' },
  BRI: { label: 'BRI', color: '#2563eb' },
  BSI: { label: 'BSI', color: '#0f9d76' },
  CIMB: { label: 'CIMB', color: '#b91c1c' },
  GoPay: { label: 'GoPay', color: '#0ea5e9' },
  OVO: { label: 'OVO', color: '#6d28d9' },
  DANA: { label: 'DANA', color: '#2563eb' },
  ShopeePay: { label: 'SPay', color: '#ea580c' },
};

/* ----------------------------- Payment methods ---------------------------- */

interface PaymentMethodMeta {
  key: string;
  icon: string;
  /** QRIS requires a non-cash source wallet. */
  requiresNonCashWallet: boolean;
}

export const PAYMENT_METHOD_META: Record<PaymentMethod, PaymentMethodMeta> = {
  cash: { key: 'payment.cash', icon: 'cash-outline', requiresNonCashWallet: false },
  transfer: { key: 'payment.transfer', icon: 'swap-horizontal-outline', requiresNonCashWallet: false },
  qris: { key: 'payment.qris', icon: 'qr-code-outline', requiresNonCashWallet: true },
  debit: { key: 'payment.debit', icon: 'card-outline', requiresNonCashWallet: false },
  credit: { key: 'payment.credit', icon: 'card-outline', requiresNonCashWallet: false },
  ewallet: { key: 'payment.ewallet', icon: 'phone-portrait-outline', requiresNonCashWallet: false },
  other: { key: 'payment.other', icon: 'ellipsis-horizontal-outline', requiresNonCashWallet: false },
};

export const PAYMENT_METHODS: PaymentMethod[] = [
  'cash',
  'transfer',
  'qris',
  'debit',
  'credit',
  'ewallet',
  'other',
];

/** Sensible default per wallet type. */
export function defaultPaymentMethodForWallet(type: WalletType): PaymentMethod {
  switch (type) {
    case 'cash':
      return 'cash';
    case 'bank':
      return 'transfer';
    default:
      return 'ewallet';
  }
}

/* -------------------------------- Storage --------------------------------- */

export const STORAGE_PREFIX = '@smartspend';
export const STORAGE_KEYS = {
  users: `${STORAGE_PREFIX}/users`,
  credentials: `${STORAGE_PREFIX}/credentials`,
  session: `${STORAGE_PREFIX}/session`,
  wallets: `${STORAGE_PREFIX}/wallets`,
  transactions: `${STORAGE_PREFIX}/transactions`,
  savingsTargets: `${STORAGE_PREFIX}/savings-targets`,
  budgets: `${STORAGE_PREFIX}/budgets`,
  settings: `${STORAGE_PREFIX}/settings`,
  seedVersion: `${STORAGE_PREFIX}/seed-version`,
} as const;

export const BACKUP_FILE_PREFIX = 'smartspend-backup';
export const REPORT_FILE_PREFIX = 'smartspend-report';

/* ------------------------------- Validation ------------------------------- */

export const MIN_PASSWORD_LENGTH = 6;
export const MAX_NAME_LENGTH = 40;
export const MAX_DESCRIPTION_LENGTH = 120;

/* -------------------------------- i18n ------------------------------------ */

const id = {
  'app.name': 'SmartSpend',
  'app.tagline': 'Kelola uangmu, capai targetmu',

  'common.save': 'Simpan',
  'common.cancel': 'Batal',
  'common.delete': 'Hapus',
  'common.edit': 'Ubah',
  'common.close': 'Tutup',
  'common.done': 'Selesai',
  'common.copy': 'Salin',
  'common.copied': 'Disalin',
  'common.confirm': 'Konfirmasi',
  'common.search': 'Cari',
  'common.filter': 'Filter',
  'common.reset': 'Atur ulang',
  'common.apply': 'Terapkan',
  'common.all': 'Semua',
  'common.optional': 'opsional',
  'common.required': 'wajib',
  'common.loading': 'Memuat…',
  'common.empty': 'Belum ada data',
  'common.retry': 'Coba lagi',
  'common.total': 'Total',
  'common.remaining': 'Sisa',
  'common.of': 'dari',
  'common.today': 'Hari ini',
  'common.yesterday': 'Kemarin',
  'common.none': 'Tidak ada',
  'common.yes': 'Ya',
  'common.no': 'Tidak',
  'common.save_changes': 'Simpan perubahan',
  'common.error': 'Terjadi kesalahan',
  'common.logout': 'Keluar',
  'common.details': 'Detail',
  'common.month': 'Bulan',
  'common.amount': 'Nominal',
  'common.date': 'Tanggal',
  'common.category': 'Kategori',
  'common.description': 'Deskripsi',
  'common.name': 'Nama',
  'common.type': 'Tipe',
  'common.wallet': 'Dompet',
  'common.see_all': 'Lihat semua',
  'common.progress': 'Progres',
  'category.food': 'Makanan',
  'category.transport': 'Transportasi',
  'category.vacation': 'Liburan',
  'category.education': 'Pendidikan',
  'category.entertainment': 'Hiburan',
  'category.shopping': 'Belanja',
  'category.health': 'Kesehatan',
  'category.other': 'Lainnya',
  'category.salary': 'Gaji',
  'category.bonus': 'Bonus',
  'category.business': 'Usaha',
  'category.gift': 'Hadiah',
  'category.investment': 'Investasi',
  'category.transfer': 'Transfer',
  'category.savings': 'Tabungan',
  'category.initial': 'Saldo awal',
  'payment.cash': 'Tunai',
  'payment.transfer': 'Transfer bank',
  'payment.qris': 'QRIS',
  'payment.debit': 'Kartu debit',
  'payment.credit': 'Kartu kredit',
  'payment.ewallet': 'E-Wallet',
  'payment.other': 'Lainnya',

  'nav.home': 'Beranda',
  'nav.transactions': 'Transaksi',
  'nav.wallets': 'Dompet',
  'nav.savings': 'Tabungan',
  'nav.reports': 'Laporan',
  'nav.settings': 'Pengaturan',

  'auth.login.title': 'Masuk',
  'auth.login.subtitle': 'Lanjutkan mengelola keuanganmu',
  'auth.register.title': 'Buat akun',
  'auth.register.subtitle': 'Mulai catat keuangan dalam 1 menit',
  'auth.email': 'Email',
  'auth.password': 'Kata sandi',
  'auth.confirm_password': 'Ulangi kata sandi',
  'auth.name': 'Nama',
  'auth.login_action': 'Masuk',
  'auth.register_action': 'Daftar',
  'auth.to_register': 'Belum punya akun? Daftar',
  'auth.to_login': 'Sudah punya akun? Masuk',
  'auth.demo_note': 'Demo lokal: data disimpan hanya di perangkat ini.',
  'auth.logout_confirm': 'Keluar dari akun ini?',

  'dashboard.greeting': 'Halo',
  'dashboard.total_money': 'Total uang',
  'dashboard.wallets_total': 'Dompet',
  'dashboard.savings_total': 'Tabungan',
  'dashboard.this_month': 'Bulan ini',
  'dashboard.composition': 'Komposisi kategori',
  'dashboard.no_month_data': 'Belum ada transaksi bulan ini',
  'dashboard.other_categories': 'kategori lain',
  'dashboard.income': 'Pemasukan',
  'dashboard.expense': 'Pengeluaran',
  'dashboard.net': 'Arus kas bersih',
  'dashboard.trend': 'Tren 1 bulan',
  'dashboard.top_wallets': 'Dompet teratas',
  'dashboard.recent': 'Transaksi terakhir',
  'dashboard.no_wallets': 'Belum ada dompet. Tambahkan dompet pertamamu.',
  'dashboard.no_transactions': 'Belum ada transaksi bulan ini.',
  'dashboard.add_first_wallet': 'Tambah dompet',

  'wallet.title': 'Dompet',
  'wallet.subtitle_total': 'Total saldo dompet',
  'wallet.add': 'Tambah dompet',
  'wallet.new': 'Dompet baru',
  'wallet.edit': 'Ubah dompet',
  'wallet.detail': 'Detail dompet',
  'wallet.name_placeholder': 'Contoh: BCA, GoPay, Uang Tunai',
  'wallet.type_hint': 'Tipe dompet tidak bisa diubah setelah dibuat.',
  'wallet.provider': 'Provider',
  'wallet.provider_optional': 'Opsional — tandai dompet dengan bank atau e-wallet aslinya.',
  'wallet.provider_none': 'Tanpa provider',
  'wallet.initial_balance': 'Saldo awal',
  'wallet.initial_balance_hint': 'Opsional. Kosongkan jika saldo awal nol.',
  'wallet.created_at': 'Dibuat',
  'wallet.transaction_count': 'Transaksi',
  'wallet.recent_transactions': 'Transaksi terakhir di dompet ini',
  'wallet.delete_confirm': 'Hapus dompet ini?',
  'wallet.delete_blocked': 'Dompet tidak bisa dihapus karena masih memiliki riwayat transaksi.',
  'wallet.empty': 'Belum ada dompet',
  'wallet.empty_hint': 'Tekan tombol + untuk menambahkan dompet pertamamu.',
  'wallet.save_action': 'Simpan dompet',
  'wallet.type.cash': 'Tunai',
  'wallet.type.bank': 'Bank',
  'wallet.type.ewallet': 'E-Wallet',

  'transaction.title': 'Transaksi',
  'transaction.add': 'Tambah transaksi',
  'transaction.new': 'Transaksi baru',
  'transaction.edit': 'Ubah transaksi',
  'transaction.delete_confirm': 'Hapus transaksi ini?',
  'transaction.delete_confirm_body':
    'Saldo dompet akan dihitung ulang. Transaksi dibatalkan jika menyebabkan saldo negatif.',
  'transaction.source_wallet': 'Dompet sumber',
  'transaction.destination_wallet': 'Dompet tujuan',
  'transaction.savings_target': 'Target tabungan',
  'transaction.payment_method': 'Metode pembayaran',
  'transaction.id_label': 'ID transaksi',
  'transaction.date_hint': 'Tanggal tidak boleh di masa depan.',
  'transaction.type.initial': 'Saldo awal',
  'transaction.type.income': 'Pemasukan',
  'transaction.type.expense': 'Pengeluaran',
  'transaction.type.transfer': 'Transfer',
  'transaction.type.savings_deposit': 'Setor tabungan',
  'transaction.type.savings_withdraw': 'Tarik tabungan',
  'transaction.empty': 'Belum ada transaksi',
  'transaction.empty_hint': 'Catat pemasukan atau pengeluaran pertamamu.',
  'transaction.no_results': 'Tidak ada transaksi yang cocok dengan filter.',
  'transaction.search_placeholder': 'Cari deskripsi, kategori, atau nominal',
  'transaction.short.income': 'Masuk',
  'transaction.short.expense': 'Keluar',
  'transaction.short.transfer': 'Transfer',
  'transaction.short.savings_deposit': 'Setor',
  'transaction.short.savings_withdraw': 'Tarik',
  'transaction.available': 'Saldo tersedia',
  'transaction.balance_now': 'Saldo sekarang',
  'transaction.wallet_to': 'Disimpan ke',
  'transaction.wallet_from': 'Diambil dari',
  'transaction.wallet_from_short': 'Dari',
  'transaction.wallet_to_short': 'Ke',
  'transaction.new_wallet': 'Dompet baru',
  'transaction.savings_flow': 'Setor / tarik tabungan',
  'transaction.savings_locked': 'Transaksi tabungan diubah dari layar Tabungan.',
  'transaction.period.this_month': 'Bulan ini',
  'transaction.period.last_3_months': '3 bulan',
  'transaction.period.last_6_months': '6 bulan',
  'transaction.period.all': 'Semua',
  'transaction.filter_wallet': 'Dompet',
  'transaction.filter_type': 'Tipe',
  'transaction.filter_category': 'Kategori',
  'transaction.filter_period': 'Periode',
  'transaction.found': 'transaksi ditemukan',
  'transaction.transfer_between': 'Transfer antar dompet',
  'transaction.qris_hint': 'QRIS hanya untuk pengeluaran dari dompet bank / e-wallet.',
  'transaction.savings_hint': 'Perpindahan dana tidak mengubah total uang.',

  'savings.title': 'Tabungan',
  'savings.subtitle_total': 'Total tabungan',
  'savings.add': 'Tambah target',
  'savings.new': 'Target baru',
  'savings.edit': 'Ubah target',
  'savings.detail': 'Detail target',
  'savings.name_placeholder': 'Dana darurat, liburan',
  'savings.goal_amount': 'Target nominal',
  'savings.due_date': 'Tenggat waktu',
  'savings.deposit_title': 'Setor ke target',
  'savings.withdraw_title': 'Tarik dari target',
  'savings.saved': 'Terkumpul',
  'savings.remaining': 'Sisa target',
  'savings.deposited': 'Disetor',
  'savings.withdrawn': 'Ditarik',
  'savings.history': 'Riwayat setor & tarik',
  'savings.delete_confirm': 'Hapus target tabungan ini?',
  'savings.delete_blocked':
    'Target tidak bisa dihapus karena masih memiliki riwayat setor/tarik.',
  'savings.empty': 'Belum ada target tabungan',
  'savings.empty_hint': 'Buat target dan mulai sisihkan dana tiap bulan.',
  'savings.completed': 'Target tercapai 🎉',
  'savings.overdue': 'Melewati tenggat',
  'savings.days_left': 'hari lagi',
  'savings.due_today': 'Jatuh tempo hari ini',
  'savings.no_due_date': 'Tanpa tenggat',
  'savings.saved_from': 'Sumber dana:',
  'savings.withdraw_to': 'Dana masuk ke:',
  'savings.flow_deposit': 'Pindahkan uang dari dompet ke target tabungan. Total uang tidak berubah.',
  'savings.flow_withdraw': 'Ambil kembali uang dari target tabungan ke dompet.',
  'savings.deposit': 'Setor ke tabungan',
  'savings.withdraw': 'Tarik ke dompet',
  'savings.deposit_hint': 'Saldo dompet sumber akan berkurang, tabungan bertambah.',

  'budget.title': 'Anggaran',
  'budget.new': 'Anggaran baru',
  'budget.edit': 'Ubah anggaran',
  'budget.limit': 'Limit bulanan',
  'budget.used': 'Terpakai',
  'budget.of_limit': 'dari limit',
  'budget.duplicate': 'Kategori ini sudah punya anggaran di bulan tersebut.',
  'budget.empty': 'Belum ada anggaran bulan ini',
  'budget.empty_hint': 'Buat anggaran agar pengeluaran lebih terkendali.',
  'budget.status.safe': 'Aman',
  'budget.status.warning': 'Hati-hati',
  'budget.status.exceeded': 'Melebihi limit',
  'budget.exceeded_warning': 'Anggaran terlampaui',
  'budget.total_limit': 'Total limit',
  'budget.total_used': 'Total terpakai',
  'budget.month_hint': '1 kategori hanya boleh punya 1 anggaran per bulan.',

  'report.title': 'Laporan bulanan',
  'report.summary': 'Ringkasan',
  'report.cash_flow': 'Arus kas harian',
  'report.categories': 'Kategori teratas',
  'report.trend': 'Tren 6 bulan',
  'report.export_json': 'Ekspor JSON',
  'report.day': 'Tanggal',
  'report.in': 'Masuk',
  'report.out': 'Keluar',
  'report.cumulative': 'Kumulatif',
  'report.no_category': 'Belum ada pengeluaran bulan ini.',
  'report.no_activity': 'Tidak ada aktivitas di bulan ini.',
  'report.exported': 'Laporan diekspor',
  'report.transaction_count': 'Jumlah transaksi',
  'report.net_positive': 'Surplus',
  'report.net_negative': 'Defisit',

  'settings.title': 'Pengaturan',
  'settings.appearance': 'Tampilan',
  'settings.theme': 'Tema',
  'settings.theme.light': 'Terang',
  'settings.theme.dark': 'Gelap',
  'settings.theme.system': 'Ikuti sistem',
  'settings.language': 'Bahasa',
  'settings.language.id': 'Indonesia',
  'settings.language.en': 'Inggris',
  'settings.data': 'Data & cadangan',
  'settings.export_data': 'Ekspor semua data',
  'settings.import_data': 'Impor data',
  'settings.export_success': 'Cadangan berhasil dibuat',
  'settings.import_success': 'Data berhasil diimpor',
  'settings.import_merge': 'Gabungkan',
  'settings.import_merge_desc': 'Tambah data baru, pertahankan data lama.',
  'settings.import_replace': 'Timpa',
  'settings.import_replace_desc': 'Hapus semua data lama, ganti dengan isi file.',
  'settings.import_mode_title': 'Cara impor data',
  'settings.import_invalid': 'File cadangan tidak valid',
  'settings.integrations': 'Integrasi',
  'settings.telegram': 'Notifikasi Telegram',
  'settings.telegram_enabled': 'Aktifkan notifikasi',
  'settings.telegram_chat_id': 'Chat ID Telegram',
  'settings.telegram_hint': 'Opsional. Kirim pesan ke @userinfobot untuk mendapatkan chat ID.',
  'settings.telegram_test': 'Kirim pesan uji',
  'settings.telegram_saved': 'Pengaturan Telegram disimpan',
  'settings.pwa': 'Panduan PWA (beta)',
  'settings.pwa_hint': 'Jalankan versi web lalu pasang ke layar utama.',
  'settings.danger': 'Zona berbahaya',
  'settings.delete_all': 'Hapus semua data',
  'settings.delete_all_confirm': 'Hapus SELURUH data?',
  'settings.delete_all_body':
    'Semua dompet, transaksi, tabungan, dan anggaran akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.',
  'settings.delete_all_action': 'Hapus permanen',
  'settings.deleted': 'Semua data dihapus',
  'settings.about': 'Tentang',
  'settings.version': 'Versi',
  'settings.storage_mode': 'Penyimpanan',
  'settings.storage_mode_local': 'AsyncStorage lokal',
  'settings.cloud': 'Cloud (Supabase)',
  'settings.cloud_not_configured': 'Belum dikonfigurasi',
  'settings.cloud_missing_url': 'EXPO_PUBLIC_SUPABASE_URL belum diisi',
  'settings.cloud_missing_key': 'EXPO_PUBLIC_SUPABASE_ANON_KEY belum diisi',
  'settings.cloud_invalid_url': 'URL Supabase tidak valid (pakai URL project, bukan /rest/v1)',
  'settings.cloud_hint': 'Isi variabel EXPO_PUBLIC_* di .env atau di dashboard Vercel, lalu muat ulang.',
  'settings.cloud_project': 'Project',
  'settings.cloud_test': 'Uji koneksi',
  'settings.cloud_testing': 'Menghubungi…',
  'settings.cloud_ok': 'Terhubung',
  'settings.cloud_fail_network': 'Tidak dapat dijangkau (cek jaringan/URL)',
  'settings.cloud_fail_auth': 'Project menolak anon key',
  'settings.cloud_fail_server': 'Project merespons error',
  'settings.storage_mode_supabase': 'Supabase (opsional)',
  'settings.storage_mode_memory': 'Sementara (sesi ini)',
  'storage.memory.title': 'Penyimpanan sementara',
  'storage.memory.blocked':
    'Browser memblokir penyimpanan lokal di pratinjau ini, jadi akun dan data hanya bertahan selama sesi berjalan. Di aplikasi Expo Go atau browser biasa, semua data tersimpan permanen.',
  'storage.memory.write_failed':
    'Penyimpanan perangkat sedang bermasalah, jadi data baru ditahan di memori sesi ini saja.',
  'storage.memory.unavailable':
    'Penyimpanan lokal tidak tersedia di lingkungan ini, jadi data hanya bertahan selama sesi berjalan.',
  'settings.supabase_hint': 'Isi EXPO_PUBLIC_SUPABASE_URL & EXPO_PUBLIC_SUPABASE_ANON_KEY untuk sinkronisasi cloud.',
  'settings.account': 'Akun',

  'error.amount_required': 'Nominal wajib diisi.',
  'error.amount_invalid_characters': 'Nominal hanya boleh angka (tanpa huruf/simbol).',
  'error.amount_not_integer': 'Nominal harus bilangan bulat (tanpa desimal).',
  'error.amount_not_positive': 'Nominal harus lebih dari 0.',
  'error.amount_too_large': 'Nominal maksimal Rp 1.000.000.000.000.',
  'error.date_required': 'Tanggal wajib diisi.',
  'error.date_invalid_format': 'Format tanggal harus YYYY-MM-DD.',
  'error.date_future': 'Tanggal tidak boleh di masa depan.',
  'error.wallet_required': 'Pilih dompet sumber.',
  'error.wallet_not_found': 'Dompet tidak ditemukan.',
  'error.brand_invalid': 'Provider tidak dikenal.',
  'error.brand_type_mismatch': 'Provider tidak cocok dengan tipe dompet.',
  'error.wallet_duplicate': 'Nama dompet sudah dipakai.',
  'error.wallet_has_transactions': 'Dompet masih punya transaksi dan tidak bisa dihapus.',
  'error.destination_required': 'Pilih dompet tujuan.',
  'error.transfer_same_wallet': 'Dompet sumber dan tujuan tidak boleh sama.',
  'error.target_required': 'Pilih target tabungan.',
  'error.target_not_found': 'Target tabungan tidak ditemukan.',
  'error.target_has_history': 'Target masih punya riwayat setor/tarik.',
  'error.category_required': 'Pilih kategori.',
  'error.category_invalid': 'Kategori tidak valid untuk tipe transaksi ini.',
  'error.name_required': 'Nama wajib diisi.',
  'error.limit_required': 'Limit anggaran wajib diisi.',
  'error.limit_not_positive': 'Limit anggaran harus lebih dari 0.',
  'error.budget_duplicate': 'Kategori ini sudah punya anggaran di bulan tersebut.',
  'error.email_required': 'Email wajib diisi.',
  'error.email_invalid': 'Format email tidak valid.',
  'error.email_taken': 'Email sudah terdaftar.',
  'error.password_required': 'Kata sandi wajib diisi.',
  'error.password_too_short': 'Kata sandi minimal 6 karakter.',
  'error.password_mismatch': 'Kata sandi tidak sama.',
  'error.credentials_invalid': 'Email atau kata sandi salah.',
  'error.user_not_found': 'Pengguna tidak ditemukan.',
  'error.negative_wallet_saldo': 'Saldo dompet tidak boleh negatif pada tanggal manapun.',
  'error.negative_savings_saldo': 'Saldo tabungan tidak boleh negatif.',
  'error.insufficient_wallet': 'Saldo dompet tidak cukup untuk transaksi ini.',
  'error.insufficient_savings': 'Saldo tabungan tidak cukup untuk ditarik.',
  'error.storage': 'Gagal menyimpan data. Coba lagi.',
  'error.unknown': 'Terjadi kesalahan yang tidak terduga.',
  'error.import_invalid': 'File cadangan tidak valid atau rusak.',
  'error.export_failed': 'Gagal membuat file ekspor.',
  'error.need_wallet_first': 'Tambahkan dompet terlebih dahulu.',
  'error.need_target_first': 'Tambahkan target tabungan terlebih dahulu.',
  'error.need_non_cash_wallet': 'QRIS butuh dompet bertipe Bank atau E-Wallet.',
  'error.name_too_long': 'Nama maksimal 40 karakter.',
  'error.description_too_long': 'Deskripsi maksimal 120 karakter.',
  'error.target_duplicate': 'Nama target tabungan sudah dipakai.',
  'error.type_invalid': 'Tipe transaksi tidak valid.',
  'error.qris_requires_non_cash_wallet': 'QRIS hanya untuk pengeluaran dari dompet Bank / E-Wallet.',
} as const;

export type TranslationKey = keyof typeof id;

const en: Record<TranslationKey, string> = {
  'settings.cloud': 'Cloud (Supabase)',
  'settings.cloud_not_configured': 'Not configured',
  'settings.cloud_missing_url': 'EXPO_PUBLIC_SUPABASE_URL is not set',
  'settings.cloud_missing_key': 'EXPO_PUBLIC_SUPABASE_ANON_KEY is not set',
  'settings.cloud_invalid_url': 'Invalid Supabase URL (use the project URL, not /rest/v1)',
  'settings.cloud_hint': 'Set the EXPO_PUBLIC_* variables in .env or in the Vercel dashboard, then reload.',
  'settings.cloud_project': 'Project',
  'settings.cloud_test': 'Test connection',
  'settings.cloud_testing': 'Contacting…',
  'settings.cloud_ok': 'Connected',
  'settings.cloud_fail_network': 'Unreachable (check network/URL)',
  'settings.cloud_fail_auth': 'Project rejected the anon key',
  'settings.cloud_fail_server': 'Project returned an error',
  'app.name': 'SmartSpend',
  'app.tagline': 'Track your money, reach your goals',

  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.close': 'Close',
  'common.done': 'Done',
  'common.copy': 'Copy',
  'common.copied': 'Copied',
  'common.confirm': 'Confirm',
  'common.search': 'Search',
  'common.filter': 'Filter',
  'common.reset': 'Reset',
  'common.apply': 'Apply',
  'common.all': 'All',
  'common.optional': 'optional',
  'common.required': 'required',
  'common.loading': 'Loading…',
  'common.empty': 'No data yet',
  'common.retry': 'Retry',
  'common.total': 'Total',
  'common.remaining': 'Remaining',
  'common.of': 'of',
  'common.today': 'Today',
  'common.yesterday': 'Yesterday',
  'common.none': 'None',
  'common.yes': 'Yes',
  'common.no': 'No',
  'common.save_changes': 'Save changes',
  'common.error': 'Something went wrong',
  'common.logout': 'Log out',
  'common.details': 'Details',
  'common.month': 'Month',
  'common.amount': 'Amount',
  'common.date': 'Date',
  'common.category': 'Category',
  'common.description': 'Description',
  'common.name': 'Name',
  'common.type': 'Type',
  'common.wallet': 'Wallet',
  'common.see_all': 'See all',
  'common.progress': 'Progress',
  'category.food': 'Food',
  'category.transport': 'Transport',
  'category.vacation': 'Holiday',
  'category.education': 'Education',
  'category.entertainment': 'Entertainment',
  'category.shopping': 'Shopping',
  'category.health': 'Health',
  'category.other': 'Other',
  'category.salary': 'Salary',
  'category.bonus': 'Bonus',
  'category.business': 'Business',
  'category.gift': 'Gift',
  'category.investment': 'Investment',
  'category.transfer': 'Transfer',
  'category.savings': 'Savings',
  'category.initial': 'Initial balance',
  'payment.cash': 'Cash',
  'payment.transfer': 'Bank transfer',
  'payment.qris': 'QRIS',
  'payment.debit': 'Debit card',
  'payment.credit': 'Credit card',
  'payment.ewallet': 'E-Wallet',
  'payment.other': 'Other',

  'nav.home': 'Home',
  'nav.transactions': 'Transactions',
  'nav.wallets': 'Wallets',
  'nav.savings': 'Savings',
  'nav.reports': 'Reports',
  'nav.settings': 'Settings',

  'auth.login.title': 'Log in',
  'auth.login.subtitle': 'Continue managing your finances',
  'auth.register.title': 'Create account',
  'auth.register.subtitle': 'Start tracking in one minute',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.confirm_password': 'Confirm password',
  'auth.name': 'Name',
  'auth.login_action': 'Log in',
  'auth.register_action': 'Sign up',
  'auth.to_register': "Don't have an account? Sign up",
  'auth.to_login': 'Already have an account? Log in',
  'auth.demo_note': 'Local demo: data stays on this device only.',
  'auth.logout_confirm': 'Log out of this account?',

  'dashboard.greeting': 'Hello',
  'dashboard.total_money': 'Total money',
  'dashboard.wallets_total': 'Wallets',
  'dashboard.savings_total': 'Savings',
  'dashboard.this_month': 'This month',
  'dashboard.composition': 'Category mix',
  'dashboard.no_month_data': 'No transactions this month',
  'dashboard.other_categories': 'other categories',
  'dashboard.income': 'Income',
  'dashboard.expense': 'Expense',
  'dashboard.net': 'Net cash flow',
  'dashboard.trend': '1-month trend',
  'dashboard.top_wallets': 'Top wallets',
  'dashboard.recent': 'Recent transactions',
  'dashboard.no_wallets': 'No wallets yet. Add your first wallet.',
  'dashboard.no_transactions': 'No transactions this month yet.',
  'dashboard.add_first_wallet': 'Add wallet',

  'wallet.title': 'Wallets',
  'wallet.subtitle_total': 'Total wallet balance',
  'wallet.add': 'Add wallet',
  'wallet.new': 'New wallet',
  'wallet.edit': 'Edit wallet',
  'wallet.detail': 'Wallet detail',
  'wallet.name_placeholder': 'e.g. BCA, GoPay, Cash',
  'wallet.type_hint': 'Wallet type cannot be changed after creation.',
  'wallet.provider': 'Provider',
  'wallet.provider_optional': 'Optional — mark the wallet with its bank or e-wallet.',
  'wallet.provider_none': 'No provider',
  'wallet.initial_balance': 'Initial balance',
  'wallet.initial_balance_hint': 'Optional. Leave empty to start at zero.',
  'wallet.created_at': 'Created',
  'wallet.transaction_count': 'Transactions',
  'wallet.recent_transactions': 'Recent transactions in this wallet',
  'wallet.delete_confirm': 'Delete this wallet?',
  'wallet.delete_blocked': 'This wallet cannot be deleted because it has transaction history.',
  'wallet.empty': 'No wallets yet',
  'wallet.empty_hint': 'Tap + to add your first wallet.',
  'wallet.save_action': 'Save wallet',
  'wallet.type.cash': 'Cash',
  'wallet.type.bank': 'Bank',
  'wallet.type.ewallet': 'E-Wallet',

  'transaction.title': 'Transactions',
  'transaction.add': 'Add transaction',
  'transaction.new': 'New transaction',
  'transaction.edit': 'Edit transaction',
  'transaction.delete_confirm': 'Delete this transaction?',
  'transaction.delete_confirm_body':
    'Wallet balances will be recalculated. The change is rejected if any balance would go negative.',
  'transaction.source_wallet': 'Source wallet',
  'transaction.destination_wallet': 'Destination wallet',
  'transaction.savings_target': 'Savings target',
  'transaction.payment_method': 'Payment method',
  'transaction.id_label': 'Transaction ID',
  'transaction.date_hint': 'Future dates are not allowed.',
  'transaction.type.initial': 'Initial balance',
  'transaction.type.income': 'Income',
  'transaction.type.expense': 'Expense',
  'transaction.type.transfer': 'Transfer',
  'transaction.type.savings_deposit': 'Savings deposit',
  'transaction.type.savings_withdraw': 'Savings withdrawal',
  'transaction.empty': 'No transactions yet',
  'transaction.empty_hint': 'Record your first income or expense.',
  'transaction.no_results': 'No transactions match your filters.',
  'transaction.search_placeholder': 'Search description, category or amount',
  'transaction.short.income': 'In',
  'transaction.short.expense': 'Out',
  'transaction.short.transfer': 'Transfer',
  'transaction.short.savings_deposit': 'Deposit',
  'transaction.short.savings_withdraw': 'Withdraw',
  'transaction.available': 'Available balance',
  'transaction.balance_now': 'Current balance',
  'transaction.wallet_to': 'Deposited to',
  'transaction.wallet_from': 'Paid from',
  'transaction.wallet_from_short': 'From',
  'transaction.wallet_to_short': 'To',
  'transaction.new_wallet': 'New wallet',
  'transaction.savings_flow': 'Deposit / withdraw savings',
  'transaction.savings_locked': 'Savings movements are edited from the Savings screen.',
  'transaction.period.this_month': 'This month',
  'transaction.period.last_3_months': '3 months',
  'transaction.period.last_6_months': '6 months',
  'transaction.period.all': 'All time',
  'transaction.filter_wallet': 'Wallet',
  'transaction.filter_type': 'Type',
  'transaction.filter_category': 'Category',
  'transaction.filter_period': 'Period',
  'transaction.found': 'transactions found',
  'transaction.transfer_between': 'Transfer between wallets',
  'transaction.qris_hint': 'QRIS is only for expenses from bank / e-wallet sources.',
  'transaction.savings_hint': 'Moving money does not change your total money.',

  'savings.title': 'Savings',
  'savings.subtitle_total': 'Total savings',
  'savings.add': 'Add target',
  'savings.new': 'New target',
  'savings.edit': 'Edit target',
  'savings.detail': 'Target detail',
  'savings.name_placeholder': 'Emergency fund, vacation',
  'savings.goal_amount': 'Goal amount',
  'savings.due_date': 'Due date',
  'savings.deposit_title': 'Deposit into target',
  'savings.withdraw_title': 'Withdraw from target',
  'savings.saved': 'Saved',
  'savings.remaining': 'Remaining to goal',
  'savings.deposited': 'Deposited',
  'savings.withdrawn': 'Withdrawn',
  'savings.history': 'Deposit & withdrawal history',
  'savings.delete_confirm': 'Delete this savings target?',
  'savings.delete_blocked':
    'This target cannot be deleted because it still has deposit/withdrawal history.',
  'savings.empty': 'No savings targets yet',
  'savings.empty_hint': 'Create a goal and start setting money aside.',
  'savings.completed': 'Goal reached 🎉',
  'savings.overdue': 'Past due date',
  'savings.days_left': 'days left',
  'savings.due_today': 'Due today',
  'savings.no_due_date': 'No due date',
  'savings.saved_from': 'Funded from:',
  'savings.withdraw_to': 'Money goes to:',
  'savings.flow_deposit': 'Move money from a wallet into the savings goal. Total money stays the same.',
  'savings.flow_withdraw': 'Take money back out of the savings goal into a wallet.',
  'savings.deposit': 'Deposit to savings',
  'savings.withdraw': 'Withdraw to wallet',
  'savings.deposit_hint': 'The source wallet decreases, savings increases.',

  'budget.title': 'Budgets',
  'budget.new': 'New budget',
  'budget.edit': 'Edit budget',
  'budget.limit': 'Monthly limit',
  'budget.used': 'Used',
  'budget.of_limit': 'of limit',
  'budget.duplicate': 'This category already has a budget for that month.',
  'budget.empty': 'No budgets for this month',
  'budget.empty_hint': 'Create budgets to keep spending in check.',
  'budget.status.safe': 'On track',
  'budget.status.warning': 'Watch out',
  'budget.status.exceeded': 'Over limit',
  'budget.exceeded_warning': 'Budget exceeded',
  'budget.total_limit': 'Total limit',
  'budget.total_used': 'Total used',
  'budget.month_hint': 'One category can only have one budget per month.',

  'report.title': 'Monthly report',
  'report.summary': 'Summary',
  'report.cash_flow': 'Daily cash flow',
  'report.categories': 'Top categories',
  'report.trend': '6-month trend',
  'report.export_json': 'Export JSON',
  'report.day': 'Date',
  'report.in': 'In',
  'report.out': 'Out',
  'report.cumulative': 'Cumulative',
  'report.no_category': 'No expenses recorded this month.',
  'report.no_activity': 'No activity this month.',
  'report.exported': 'Report exported',
  'report.transaction_count': 'Transactions',
  'report.net_positive': 'Surplus',
  'report.net_negative': 'Deficit',

  'settings.title': 'Settings',
  'settings.appearance': 'Appearance',
  'settings.theme': 'Theme',
  'settings.theme.light': 'Light',
  'settings.theme.dark': 'Dark',
  'settings.theme.system': 'System',
  'settings.language': 'Language',
  'settings.language.id': 'Indonesian',
  'settings.language.en': 'English',
  'settings.data': 'Data & backup',
  'settings.export_data': 'Export all data',
  'settings.import_data': 'Import data',
  'settings.export_success': 'Backup created',
  'settings.import_success': 'Data imported',
  'settings.import_merge': 'Merge',
  'settings.import_merge_desc': 'Keep existing data and add new records.',
  'settings.import_replace': 'Replace',
  'settings.import_replace_desc': 'Delete existing data and use the file contents.',
  'settings.import_mode_title': 'How should we import?',
  'settings.import_invalid': 'Invalid backup file',
  'settings.integrations': 'Integrations',
  'settings.telegram': 'Telegram notifications',
  'settings.telegram_enabled': 'Enable notifications',
  'settings.telegram_chat_id': 'Telegram chat ID',
  'settings.telegram_hint': 'Optional. Message @userinfobot to get your chat ID.',
  'settings.telegram_test': 'Send test message',
  'settings.telegram_saved': 'Telegram settings saved',
  'settings.pwa': 'PWA guide (beta)',
  'settings.pwa_hint': 'Run the web build and install it to your home screen.',
  'settings.danger': 'Danger zone',
  'settings.delete_all': 'Delete all data',
  'settings.delete_all_confirm': 'Delete ALL data?',
  'settings.delete_all_body':
    'Every wallet, transaction, savings target and budget will be permanently removed. This cannot be undone.',
  'settings.delete_all_action': 'Delete permanently',
  'settings.deleted': 'All data deleted',
  'settings.about': 'About',
  'settings.version': 'Version',
  'settings.storage_mode': 'Storage',
  'settings.storage_mode_local': 'Local AsyncStorage',
  'settings.storage_mode_supabase': 'Supabase (optional)',
  'settings.storage_mode_memory': 'Session only',
  'storage.memory.title': 'Session-only storage',
  'storage.memory.blocked':
    'This preview runs in a sandboxed frame where the browser blocks local storage, so accounts and data last only for this session. In Expo Go or a regular browser tab everything is saved permanently.',
  'storage.memory.write_failed':
    'Device storage is currently failing, so new data is kept in this session only.',
  'storage.memory.unavailable':
    'Local storage is unavailable in this environment, so data lasts only for this session.',
  'settings.supabase_hint': 'Set EXPO_PUBLIC_SUPABASE_URL & EXPO_PUBLIC_SUPABASE_ANON_KEY for cloud sync.',
  'settings.account': 'Account',

  'error.amount_required': 'Amount is required.',
  'error.amount_invalid_characters': 'Amount must contain digits only.',
  'error.amount_not_integer': 'Amount must be a whole number (no decimals).',
  'error.amount_not_positive': 'Amount must be greater than 0.',
  'error.amount_too_large': 'Amount cannot exceed Rp 1,000,000,000,000.',
  'error.date_required': 'Date is required.',
  'error.date_invalid_format': 'Date format must be YYYY-MM-DD.',
  'error.date_future': 'Future dates are not allowed.',
  'error.wallet_required': 'Select a source wallet.',
  'error.wallet_not_found': 'Wallet not found.',
  'error.brand_invalid': 'Unknown provider.',
  'error.brand_type_mismatch': 'Provider does not match the wallet type.',
  'error.wallet_duplicate': 'That wallet name is already used.',
  'error.wallet_has_transactions': 'This wallet still has transactions and cannot be deleted.',
  'error.destination_required': 'Select a destination wallet.',
  'error.transfer_same_wallet': 'Source and destination wallets must differ.',
  'error.target_required': 'Select a savings target.',
  'error.target_not_found': 'Savings target not found.',
  'error.target_has_history': 'This target still has deposit/withdrawal history.',
  'error.category_required': 'Select a category.',
  'error.category_invalid': 'Category is not valid for this transaction type.',
  'error.name_required': 'Name is required.',
  'error.limit_required': 'Budget limit is required.',
  'error.limit_not_positive': 'Budget limit must be greater than 0.',
  'error.budget_duplicate': 'This category already has a budget for that month.',
  'error.email_required': 'Email is required.',
  'error.email_invalid': 'Email format is invalid.',
  'error.email_taken': 'That email is already registered.',
  'error.password_required': 'Password is required.',
  'error.password_too_short': 'Password must be at least 6 characters.',
  'error.password_mismatch': 'Passwords do not match.',
  'error.credentials_invalid': 'Wrong email or password.',
  'error.user_not_found': 'User not found.',
  'error.negative_wallet_saldo': 'Wallet balance cannot go negative on any date.',
  'error.negative_savings_saldo': 'Savings balance cannot go negative.',
  'error.insufficient_wallet': 'Wallet balance is not enough for this transaction.',
  'error.insufficient_savings': 'Savings balance is not enough to withdraw.',
  'error.storage': 'Could not save your data. Please try again.',
  'error.unknown': 'An unexpected error occurred.',
  'error.import_invalid': 'The backup file is invalid or corrupted.',
  'error.export_failed': 'Could not create the export file.',
  'error.need_wallet_first': 'Add a wallet first.',
  'error.need_target_first': 'Add a savings target first.',
  'error.need_non_cash_wallet': 'QRIS requires a Bank or E-Wallet source.',
  'error.name_too_long': 'Name must be 40 characters or fewer.',
  'error.description_too_long': 'Description must be 120 characters or fewer.',
  'error.target_duplicate': 'That savings target name is already used.',
  'error.type_invalid': 'Invalid transaction type.',
  'error.qris_requires_non_cash_wallet': 'QRIS is only for expenses from Bank / E-Wallet sources.',
};

export const translations: Record<Language, Record<TranslationKey, string>> = { id, en };

export function translate(key: TranslationKey, language: Language = 'id'): string {
  return translations[language][key] ?? translations.id[key] ?? key;
}

export const LANGUAGES: Language[] = ['id', 'en'];
export const LANGUAGE_LABELS: Record<Language, string> = { id: 'Indonesia', en: 'English' };
