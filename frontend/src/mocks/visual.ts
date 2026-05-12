// Чисто визуальные моки для редизайна. Никак не связаны с реальными данными
// из API — нужны только чтобы шапка/плитки/карточки выглядели наполненно.

export const MOCK_CASHBACK_POINTS = 72;

export const MOCK_PROMO = {
  title: "Никаких % 120 дней",
  subtitle: "Лимит до 10 000 ₽. Обслуживание — 0 ₽. Решайтесь",
  cta: "Узнать",
};

export const MOCK_QUICK_ACTIONS: Array<{ icon: string; title: string }> = [
  { icon: "qr-code", title: "Оплатить по QR" },
  { icon: "home", title: "Дом" },
  { icon: "file-text", title: "ЮMoney" },
  { icon: "file-text", title: "билайн" },
  { icon: "file-text", title: "Ростелеком" },
  { icon: "file-text", title: "Татарстан" },
  { icon: "file-text", title: "Билайн ТВ" },
];

export const MOCK_RECENT_RECIPIENTS: Array<{ initials: string; name: string }> = [
  { initials: "АЗ", name: "Александр Зурабов..." },
  { initials: "ЮД", name: "Юрий Дмитрие..." },
  { initials: "АЗ", name: "Александр Зурабов..." },
  { initials: "АВ", name: "Александр Владис..." },
  { initials: "ГИ", name: "Галина Ивановна" },
];
