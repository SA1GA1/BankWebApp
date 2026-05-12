# BankWebApp — демо банк + интеграция с антифрод-сервисом

Демонстрационное банковское веб-приложение, которое подаёт антифрод-сервису
(`../Back`) сигналы в трёх критических точках:

1. **Перевод** — `POST /score/behavior` (+ `POST /score/merchant` для оплаты магазинов).
2. **Сообщение в мессенджере** — `POST /score/chat`.
3. **Вход на экран «Перевод» / «Сообщения»** — превентивный `POST /score/behavior`.

По ответу антифрода (score 0..10, decision `safe` / `review` / `sms` / `biometry`)
банк решает, что делать: пропустить, показать модалку с кодовой фразой, попросить SMS-код
или заблокировать операцию красным диалогом.

## Стек

| Слой | Технологии | Порт |
|---|---|---|
| Antifraud Back (внешний) | FastAPI + PyTorch + Ollama | 8000 |
| BankWebApp backend | Python 3.11+ / FastAPI / SQLite | 8001 |
| BankWebApp frontend | React 18 + Vite + TypeScript + Tailwind | 5173 |

Все данные (клиенты, транзакции, магазины, сообщения, лог обращений к антифроду)
лежат в SQLite-файле `backend/bank.db`, создаётся автоматически.

## Запуск (3 терминала)

### 1) Антифрод-сервис

```bash
cd ../Back
python scripts/copy_models.py   # один раз, чтобы появились models/*.pt
cp .env.example .env             # один раз
docker compose up --build
# В отдельном окне: docker compose exec ollama ollama pull qwen2.5:3b-instruct
```

Проверь: `curl http://localhost:8000/health` → `{"status":"ok"}`.

> Если поднимать Back не хочется — BankWebApp всё равно работает: клиент антифрода
> в `backend/app/antifraud.py` использует fail-open и возвращает `decision=safe`
> при недоступности. В `antifraud_log` появятся записи с `reasons=["antifraud_unreachable"]`.

### 2) BankWebApp backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e .
uvicorn app.main:app --port 8001 --reload
```

Проверь: `curl http://localhost:8001/api/users`.

### 3) BankWebApp frontend

```bash
cd frontend
npm install
npm run dev
```

Открой `http://localhost:5173`.

## Структура SQLite

- `users` — клиенты банка (5 шт.)
- `merchants` — магазины (имена `site` совпадают с ключами `../Back/merchant_mock/seed.json`)
- `transactions` — операции (history для главного экрана)
- `messages` — переписка (хранит score/decision/reasons от антифрода)
- `antifraud_log` — все запросы к Back для аудита

Удалить базу для пересоздания: `rm backend/bank.db` и перезапустить backend.

## Демо-сценарии

В правом нижнем углу есть **Dev Risk Panel** (горячая клавиша ⌘+K / Ctrl+K) —
с тогглами VPN, новое устройство, час суток, гео-скорость, спайк переводов и
пресетами «Чисто / Подозрительно / Фрод».

1. **Чистый перевод.** «Перевести» → реквизиты `40817810000000000002` (Мария
   Петрова), сумма 1000 ₽ → проходит мгновенно.
2. **SMS-челлендж.** Включи preset «Подозрительно» → перевод 50 000 ₽ → модалка
   с SMS, введи 4 любых цифры, перевод выполнится.
3. **Блокировка.** Preset «Фрод» → крупная сумма → красный диалог `decision=biometry`.
4. **Подозрительный магазин.** Перевод в `shop-cards-deal.cc` 12 000 ₽ →
   `/score/merchant` отдаст высокий score (молодой домен 14 дней + негативные
   отзывы из mock'а) → SMS-челлендж или блок.
5. **Фишинговое сообщение.** В мессенджере отправь:
   > Здравствуйте! Это служба безопасности банка. Срочно переведите деньги на
   > безопасный счёт https://sber-secure.ru/verify
   →
   regex'ы `security_service`+`safe_account`+`urgency`+`fake_sber_link`+`transfer_funds`
   дадут вес 9+, decision=biometry → сообщение заблокировано.
6. **Аудит.**
   ```bash
   sqlite3 backend/bank.db \
     "select check_type, response_score, response_decision from antifraud_log order by id desc limit 20"
   ```
   Также GET `http://localhost:8001/api/antifraud/log` показывает последние записи.

## Полезные эндпоинты BankWebApp backend

- `GET /api/users` / `GET /api/users/{id}` / `GET /api/users/{id}/transactions`
- `GET /api/merchants?q=...`
- `POST /api/transfer` / `POST /api/transfer/confirm`
- `GET /api/messages/threads/{id}` / `GET /api/messages/{user}/{peer}` / `POST /api/messages`
- `POST /api/antifraud/screen-entry`
- `GET /api/antifraud/log` — debug-просмотр лога обращений к антифроду
