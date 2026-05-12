from __future__ import annotations

from datetime import datetime, timedelta

from app.db import get_conn

USERS = [
    (1, "Иван Иванов", "40817810000000000001", "+79001234501", 245_300.50),
    (2, "Мария Петрова", "40817810000000000002", "+79001234502", 78_100.00),
    (3, "Алексей Смирнов", "40817810000000000003", "+79001234503", 512_750.20),
    (4, "Ольга Кузнецова", "40817810000000000004", "+79001234504", 32_500.00),
    (5, "Дмитрий Соколов", "40817810000000000005", "+79001234505", 154_000.00),
]

# site должен совпадать с ключами /Users/aleksandr/Documents/AntiFraud/Back/merchant_mock/seed.json
MERCHANTS = [
    ("Ozon", "ozon.ru", "Маркетплейс", 0),
    ("Wildberries", "wildberries.ru", "Маркетплейс", 0),
    ("РЖД", "rzd.ru", "Транспорт", 0),
    ("Delivery Club", "delivery-club.ru", "Еда", 0),
    ("Fast Pay Service", "fast-pay-service.ru", "Платежи", 1),
    ("Shop Cards Deal", "shop-cards-deal.cc", "Скидки", 1),
    ("iPhone Discount Pro", "iphone-discount-pro.shop", "Электроника", 1),
]


def _iso(dt: datetime) -> str:
    return dt.replace(microsecond=0).isoformat()


def seed_if_empty() -> None:
    with get_conn() as conn:
        already = conn.execute("SELECT COUNT(*) AS c FROM users").fetchone()["c"]
        if already:
            return

        now = datetime.utcnow()
        # 5 клиентов — created_at варьируем, чтобы account_age_days был разный
        for idx, (uid, name, acc, phone, balance) in enumerate(USERS):
            created = now - timedelta(days=365 * 2 + idx * 30)
            conn.execute(
                "INSERT INTO users (id, full_name, account_number, phone, balance, created_at)"
                " VALUES (?,?,?,?,?,?)",
                (uid, name, acc, phone, balance, _iso(created)),
            )

        for name, site, category, suspicious in MERCHANTS:
            conn.execute(
                "INSERT INTO merchants (name, site, category, is_known_suspicious)"
                " VALUES (?,?,?,?)",
                (name, site, category, suspicious),
            )

        # История на главного пользователя (id=1)
        tx_seed = [
            ("incoming", "ООО Ромашка", 95_000.00, "Зарплата", 25),
            ("outgoing", "Мария Петрова", -3_500.00, "Перевод другу", 24),
            ("payment", "wildberries.ru", -4_280.00, "Покупка одежды", 22),
            ("payment", "ozon.ru", -1_690.00, "Книги", 20),
            ("outgoing", "ЖКУ Москвы", -7_220.00, "Коммунальные платежи", 18),
            ("payment", "delivery-club.ru", -1_180.00, "Ужин", 15),
            ("incoming", "Алексей Смирнов", 12_000.00, "Возврат долга", 13),
            ("payment", "rzd.ru", -3_450.00, "Билеты СПБ", 10),
            ("outgoing", "Ольга Кузнецова", -2_000.00, "За кофе", 7),
            ("payment", "wildberries.ru", -990.00, "Мелочи", 5),
            ("incoming", "ООО Ромашка", 95_000.00, "Зарплата", 3),
            ("payment", "ozon.ru", -2_350.00, "Бытовая техника", 1),
        ]
        for kind, cp, amt, descr, days_ago in tx_seed:
            conn.execute(
                "INSERT INTO transactions (user_id, kind, counterparty, amount, description, created_at,"
                " antifraud_score, antifraud_decision) VALUES (?,?,?,?,?,?,?,?)",
                (1, kind, cp, amt, descr, _iso(now - timedelta(days=days_ago)), 0.0, "safe"),
            )

        # Диалог 1: безобидный (Иван ↔ Мария)
        thread1 = [
            (2, 1, "Привет! Не забудь про встречу завтра в 12 :)", 6),
            (1, 2, "Помню, до завтра!", 6),
            (2, 1, "Захвати, пожалуйста, кофе по дороге.", 5),
            (1, 2, "Окей, какой?", 5),
            (2, 1, "Капучино без сахара", 5),
        ]
        for sender, receiver, text, hours_ago in thread1:
            conn.execute(
                "INSERT INTO messages (sender_id, receiver_id, text, created_at,"
                " antifraud_score, antifraud_decision, antifraud_reasons) VALUES (?,?,?,?,?,?,?)",
                (sender, receiver, text, _iso(now - timedelta(hours=hours_ago)), 0.0, "safe", "[]"),
            )

        # Диалог 2: подозрительный (Алексей пишет Ивану — будет с фишинговой подсказкой)
        thread2 = [
            (3, 1, "Привет, как дела?", 4),
            (1, 3, "Привет, всё ок!", 4),
            (
                3,
                1,
                "Слушай, кстати — мне сегодня звонили из банка, сказали мой счёт под угрозой. Поосторожнее.",
                3,
            ),
        ]
        for sender, receiver, text, hours_ago in thread2:
            conn.execute(
                "INSERT INTO messages (sender_id, receiver_id, text, created_at,"
                " antifraud_score, antifraud_decision, antifraud_reasons) VALUES (?,?,?,?,?,?,?)",
                (sender, receiver, text, _iso(now - timedelta(hours=hours_ago)), 0.0, "safe", "[]"),
            )
