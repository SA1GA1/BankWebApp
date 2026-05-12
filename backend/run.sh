#!/usr/bin/env bash
# Запуск BankWebApp backend с антифрод-сервисом через cloudpub-туннель.
# Переопредели ANTIFRAUD_URL прямо здесь, если адрес поменяется.
set -euo pipefail

export ANTIFRAUD_URL="${ANTIFRAUD_URL:-https://sagaciously-supersonic-adjutant.cloudpub.ru}"
export ANTIFRAUD_TIMEOUT_SECONDS="${ANTIFRAUD_TIMEOUT_SECONDS:-10.0}"

cd "$(dirname "$0")"
exec uvicorn app.main:app --port 8001 --reload
