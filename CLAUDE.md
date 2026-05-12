# CLAUDE.md — BankWebApp

Демо банковского веб-приложения как «витрина» для антифрод-сервиса в `../Back`.
Назначение проекта — генерировать реалистичные сигналы в трёх критических точках
и показать UX-реакцию на ответ антифрода.

## Архитектура (3 процесса)

| Компонент | Стек | Порт | Где живёт |
|---|---|---|---|
| Antifraud Back (внешний, **не трогаем**) | FastAPI + PyTorch + Ollama + merchant_mock | 8000 (+9000 mock, +11434 ollama) | `../Back` |
| BankWebApp backend | Python 3.11+ / FastAPI / `sqlite3` (stdlib) / httpx | 8001 | `backend/` |
| BankWebApp frontend | React 18 + Vite + TS + Tailwind | 5173 | `frontend/` |

Frontend ходит **только** в backend BankWebApp. Backend BankWebApp ходит и в SQLite, и в `http://localhost:8000` (Antifraud Back). Vite-прокси `/api → :8001`, поэтому frontend и backend на разных хостах не нужны.

## Критические точки антифрод-интеграции

Три места, где BankWebApp дёргает Back:

1. **`POST /api/transfer` →** `POST http://localhost:8000/score/behavior`
   *(для merchant-режима дополнительно* `POST /score/merchant`*, берём `max(score)`)*
2. **`POST /api/messages` →** `POST http://localhost:8000/score/chat`
3. **`POST /api/antifraud/screen-entry` →** `POST http://localhost:8000/score/behavior` (легкий payload без суммы, при входе на `transfer`/`messenger`)

UX-маппинг по `decision` (определяется в Back, `app/core/scoring.py::decision_from_score`):
- `safe` (score < 3) → действие проходит
- `review` (3..6) → модалка «введите кодовую фразу»
- `sms` (6..8) → модалка «введите SMS-код» (любые 4 цифры)
- `biometry` (≥8) → красный блок-диалог, операция/сообщение не сохраняются

## Ограничения интеграции (ВАЖНО, легко забыть)

- **Web-ветка `/score/behavior` выбирается по** `browser_fingerprint` / `user_agent` / `browser_name` (`../Back/app/schemas/behavior.py::is_web_payload`). Без них Back пойдёт по mobile-модели. `app/antifraud.py::build_behavior_payload` обязан их подставлять.
- **`/score/merchant` ищет `site_name` как ключ в** `../Back/merchant_mock/seed.json`. Неизвестный сайт → `score=5.0` + `reasons=["merchant:unknown:..."]`. Поэтому `seed.MERCHANTS` синхронизированы с этим JSON; добавлять новые магазины бессмысленно без правки `merchant_mock`.
- **`/score/chat` зовёт LLM (Ollama) только** если `total_weight ≥ rule_threshold_chat=1.5` (`../Back/app/pipelines/chat/orchestrator.py`). Чистые сообщения не тратят токены — это by design.
- **Fail-open**: если Back недоступен, `app/antifraud.py::_fail_open` возвращает `decision=safe` с `reasons=["antifraud_unreachable"]`. Это сознательно, чтобы демо работало без поднятого ML-стека. **Не превращать в fail-closed без явного запроса.**
- **`hour_of_day`**: если в `signals.force_hour_of_day` стоит число (из DevRiskPanel) — берём его, иначе `datetime.utcnow().hour`. Это нужно для демо ночных аномалий днём.

## Структура

```
BankWebApp/
├── CLAUDE.md
├── README.md                  # инструкция запуска для пользователя
├── backend/
│   ├── pyproject.toml         # fastapi, uvicorn, httpx, pydantic
│   ├── bank.db                # авто-создаётся; rm чтобы пересоздать сидинг
│   └── app/
│       ├── main.py            # FastAPI app + lifespan (init_db + seed_if_empty) + CORS
│       ├── config.py          # ANTIFRAUD_URL, BANK_DB_PATH, CORS_ORIGINS, timeouts
│       ├── db.py              # стдл sqlite3, SCHEMA, get_conn(), row_to_dict()
│       ├── seed.py            # 5 клиентов, 12 транз., 7 магазинов, 2 диалога
│       ├── schemas.py         # pydantic-модели request/response API
│       ├── antifraud.py       # httpx async-клиент к Back + лог в antifraud_log
│       └── routers/
│           ├── users.py       # GET /api/users, /api/users/{id}, /api/users/{id}/transactions
│           ├── merchants.py   # GET /api/merchants?q=...
│           ├── transactions.py # POST /api/transfer (+ pending store + /confirm)
│           ├── messages.py    # GET threads, /history, POST /api/messages
│           └── antifraud.py   # POST /api/antifraud/screen-entry, GET /api/antifraud/log
└── frontend/
    ├── package.json, vite.config.ts (proxy /api → :8001), tailwind.config.js
    └── src/
        ├── main.tsx, App.tsx              # роутинг + SessionProvider
        ├── types.ts                       # User, Transaction, Merchant, Message, Signals, Decision
        ├── api/client.ts                  # fetch-обёртка, все вызовы backend
        ├── store/session.tsx              # currentUser + riskOverrides в localStorage
        ├── hooks/useFingerprint.ts        # сбор сигналов; возвращает () => Promise<Signals>
        ├── components/
        │   ├── TopBar.tsx, ScoreBadge.tsx
        │   ├── AntifraudModal.tsx         # phrase | sms | blocked
        │   ├── MerchantPicker.tsx         # search-dropdown
        │   └── DevRiskPanel.tsx           # ⌘+K, тоггл-сигналы + пресеты
        └── pages/
            ├── LoginPage.tsx              # выбор клиента (без паролей)
            ├── HomePage.tsx               # баланс + история
            ├── TransferPage.tsx           # screen-entry + форма + модалка
            └── MessengerPage.tsx          # screen-entry + диалоги + инлайн-decision
```

## SQLite

Файл `backend/bank.db` создаётся при первом запуске (`lifespan` → `init_db()` → `seed_if_empty()`). Сидинг идёт только если таблица `users` пуста — поэтому **чтобы перенакатить демо-данные, нужно `rm backend/bank.db`** перед запуском.

Таблицы: `users`, `transactions`, `merchants`, `messages`, `antifraud_log`. Полная схема — в `app/db.py::SCHEMA`. **Каждый** вызов антифрода пишется в `antifraud_log` (включая fail-open кейсы) — это аудит-таблица для демо. `GET /api/antifraud/log` для быстрого просмотра.

## Pending-store переводов

`_PENDING: dict[str, dict]` в `app/routers/transactions.py` — **в памяти процесса**, не персистентно. При рестарте backend подтверждаемые pending-переводы теряются. Это сознательно — для демо хватает. Не переписывать в БД без причины.

## Команды

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e .
uvicorn app.main:app --port 8001 --reload

# Frontend
cd frontend
npm install
npm run dev

# Снести БД и пересоздать сидинг
rm backend/bank.db && curl http://localhost:8001/api/health  # перезапуск backend сам инициализирует

# Аудит вызовов антифрода
sqlite3 backend/bank.db "select check_type, response_score, response_decision, created_at from antifraud_log order by id desc limit 20"
# или
curl http://localhost:8001/api/antifraud/log
```

## Конвенции в коде

- **Backend**: pydantic v2 (`model_config = ConfigDict(extra="allow")` для `Signals`). Async — только в роутерах антифрода и httpx-клиенте; SQLite-вызовы синхронные через `get_conn()` (sync контекст-менеджер, ок в async-роутах, файл локальный).
- **Frontend**: всё через `api/client.ts`, не дёргать `fetch` напрямую из компонентов. Сигналы получаем через `useFingerprint()` → `await collectSignals()` — это единственный источник `Signals` для запросов.
- **Никогда не править `../Back`** — это чужой сервис, мы только потребители его API. Если нужен новый магазин — изменения должны идти в `../Back/merchant_mock/seed.json`, не в нашем `seed.py`.
- **Не добавлять реальную проверку SMS/кодовой фразы** — `/api/transfer/confirm` принимает любой непустой `code`. Это by design (демо).

## Где что искать

| Вопрос | Файл |
|---|---|
| Какой payload идёт в `/score/behavior`? | `backend/app/antifraud.py::build_behavior_payload` |
| Какой payload идёт в `/score/chat`? | `backend/app/routers/messages.py::post_message` |
| Маппинг decision → UI? | `frontend/src/components/AntifraudModal.tsx` + `pages/TransferPage.tsx::handleSubmit` |
| Что собирается с браузера? | `frontend/src/hooks/useFingerprint.ts` |
| Сидинг данных? | `backend/app/seed.py` |
| Список магазинов, который понимает антифрод? | `../Back/merchant_mock/seed.json` |
| Regex'ы антифрода для чата? | `../Back/app/pipelines/chat/patterns.py` |
| 7 правил поведения? | `../Back/app/pipelines/behavior/rules.py` |
