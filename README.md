# Keitaro Wrapper

Веб-приложение для управления компаниями в Keitaro через Admin API.

Проект позволяет создавать компании с настройкой GEO-фильтров и потоков, а также редактировать распределение офферов между потоками.

## Технологии

**Backend:**

- Python 3.13
- FastAPI
- SQLAlchemy
- SQLite
- Alembic
- HTTPX

**Frontend:**

- React 19
- TypeScript
- Vite
- Axios
- React Router

## Структура проекта

```text
keitaro-wrapper/
├── backend/
│   ├── app/
│   ├── migrations/
│   ├── .env.example
│   ├── alembic.ini
│   └── requirements.txt
├── frontend/
│   ├── public/
│   ├── src/
│   ├── .env.example
│   └── package.json
└── README.md
```

## Требования

Для запуска проекта необходимы:

- Python 3.13 или новее
- Node.js и npm
- Доступ к тестовому стенду Keitaro
- API-ключ Keitaro

## Установка и запуск Backend

1. Перейти в папку Backend:

```powershell
cd backend
```

2. Создать виртуальное окружение:

```powershell
python -m venv venv
```

3. Активировать виртуальное окружение:

```powershell
.\venv\Scripts\Activate.ps1
```

4. Установить зависимости:

```powershell
pip install -r requirements.txt
```

5. Создать файл `.env` на основе `.env.example` и указать свой API-ключ Keitaro:

```env
KEITARO_API_URL=https://keitaro-for-tests.etolegko.com/admin_api/v1
KEITARO_API_KEY=your_api_key_here
APP_NAME=Keitaro Wrapper
DEBUG=False
KEITARO_GROUP_ID=10332
KEITARO_DOMAIN_ID=1813
KEITARO_TRAFFIC_SOURCE_ID=836
```

6. Выполнить миграции базы данных:

```powershell
alembic upgrade head
```

7. Запустить Backend:

```powershell
uvicorn app.main:app --reload
```

Backend будет доступен по адресу:

http://127.0.0.1:8000

Документация API:

http://127.0.0.1:8000/docs

## Установка и запуск Frontend

1. Открыть второй терминал и перейти в папку Frontend:

```powershell
cd frontend
```

2. Установить зависимости:

```powershell
npm install
```

3. Создать файл `.env` на основе `.env.example`:

```env
VITE_API_URL=http://127.0.0.1:8000
```

4. Запустить Frontend:

```powershell
npm run dev
```

Vite выведет локальный адрес приложения в терминал.

## Возможности

- Создание компаний в Keitaro.
- Настройка GEO-фильтрации трафика.
- Создание потоков с перенаправлением на Google и выбранный оффер.
- Просмотр списка компаний.
- Редактирование офферов в существующих компаниях.
- Добавление, удаление и восстановление офферов.
- Распределение долей трафика между активными офферами.
- Поиск офферов по ID и названию.

## Работа с тестовыми данными

Если API недоступно, приложение может использовать тестовые данные для отображения интерфейса.

При использовании тестовых данных отправка изменений в Keitaro блокируется, чтобы избежать случайной отправки некорректных данных.

## Безопасность

- API-ключ Keitaro хранится только на Backend.
- Файлы `.env` не должны попадать в Git.
- Для настройки окружения используются файлы `.env.example`.
- Локальная база данных и служебные файлы исключены из Git.
