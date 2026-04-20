# PalomaBot Web

Веб-сервис для парсинга накладных → xlsx для Paloma365.

## Файлы

```
paloma-web/
├── app.py                 # Flask сервер
├── requirements.txt       # зависимости
├── Procfile               # для Railway
├── items_template.xlsx    # ← НУЖНО ДОБАВИТЬ ВРУЧНУЮ
└── templates/
    └── index.html         # дашборд
```

## Деплой на Railway (пошагово)

### 1. Подготовка

Положи `items_template.xlsx` (шаблон из Паломы) в папку `paloma-web/`.

### 2. GitHub

1. Зайди на github.com → New repository → назови `paloma-web`
2. Загрузи все файлы из папки `paloma-web/`

### 3. Railway

1. Зайди на railway.app → Login with GitHub
2. New Project → Deploy from GitHub repo → выбери `paloma-web`
3. Railway сам определит Python и установит зависимости

### 4. Переменная окружения

В Railway: Settings → Variables → добавь:
```
CLAUDE_API_KEY = sk-ant-api03-...твой ключ...
```

### 5. Готово

Railway даст публичный URL вида:
```
https://paloma-web-production.up.railway.app
```

Этот URL отправляешь клиенту — он открывает в браузере и сразу работает.

## Локальный запуск (для теста)

```bash
cd paloma-web
pip install -r requirements.txt
CLAUDE_API_KEY=sk-ant-... python app.py
```

Открой http://localhost:5000
