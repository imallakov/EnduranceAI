# 🏃 EnduranceAI

**Smart marathon-time prediction & adaptive training planning for endurance runners.**

EnduranceAI turns an athlete's real training history into two things runners actually need: a realistic **goal-race time prediction** for a *specific* course, and an **adaptive training plan** that adjusts to how the athlete is actually training.

![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat&logo=python&logoColor=white)
![Django](https://img.shields.io/badge/Django-DRF-092E20?style=flat&logo=django&logoColor=white)
![React](https://img.shields.io/badge/React-Vite_+_TS-61DAFB?style=flat&logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=flat&logo=postgresql&logoColor=white)
![XGBoost](https://img.shields.io/badge/ML-XGBoost_+_Ridge-FF6600?style=flat)
![Celery](https://img.shields.io/badge/Celery-Redis-37814A?style=flat&logo=celery&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)

> 🔗 Live demo: [endurance.yuzapp.space](https://endurance.yuzapp.space) / [marathoniq.yuzapp.space](https://marathoniq.yuzapp.space)

---

## Why it exists

This project started as my BSc thesis. Its first version only **predicted finish time** — but at the pre-defense the obvious question came up: *"What's the real value for an athlete? You look at a number once and forget it."*

That reframed the whole project. The focus shifted from a one-off prediction to a **continuously adaptive training plan** — a tool a runner comes back to week after week, that responds to their fatigue, fitness, and the demands of their target race.

---

## ✨ Key features

- **Course-aware finish-time prediction** — not a generic number, but a prediction for a *specific* route, accounting for its elevation profile and expected race-day conditions.
- **Adaptive training plans** — plans that adjust to the athlete's evolving training load instead of staying static.
- **Strava integration** — connect via OAuth2; activities sync automatically through webhooks.
- **Training-load tracking** — Fitness / Fatigue / Form (CTL / ATL / TSB) computed from real activity history.
- **Personalized pacing** — VDOT-based fitness estimation drives target paces.

---

## 🧠 How the model works

The prediction engine is an **ensemble (Ridge Regression + XGBoost)** trained on **~499k cleaned race-pair records**, distilled from a raw dataset of **~2M activities**.

What makes the features meaningful rather than generic:

- **Course profile (GPX → Minetti):** the route's elevation is converted into an energy-cost signal using **Minetti's cost-of-running** model, so hilly and flat courses are treated differently *before* the model ever sees them.
- **Weather correction:** expected race-day conditions (via the **OpenWeatherMap API**) are factored into the prediction.
- **Training-load context:** CTL/ATL/TSB and VDOT describe the athlete's current fitness state, not just past race results.

The principle throughout: push domain knowledge (terrain, weather, physiology) **into the features**, instead of bolting on post-hoc corrections.

---

## 🛠 Tech stack

| Layer | Technologies |
| :--- | :--- |
| Backend | Python, Django, Django REST Framework |
| Async | Celery + Redis (background sync & processing) |
| ML | XGBoost, Ridge Regression, pandas |
| Database | PostgreSQL |
| Frontend | React + TypeScript (Vite) |
| Integrations | Strava OAuth2 + Webhooks, OpenWeatherMap |
| Deployment | Docker |

---

## 🗂 Project structure

```
EnduranceAI/
├── backend/                # Django + DRF API
│   ├── apps/               # Django apps (domain logic)
│   ├── config/             # project config
│   │   ├── settings/       # split settings (development / production)
│   │   └── celery.py       # Celery app "enduranceai"
│   ├── ml/                 # model training & inference
│   ├── data/               # datasets / data utilities
│   ├── scripts/            # helper scripts
│   ├── manage.py
│   └── requirements.txt
├── frontend/               # React + Vite + TypeScript
│   ├── src/
│   ├── .env.example        # VITE_API_URL
│   └── package.json
├── .env                    # backend environment (project root — see below)
├── deploy.py               # deployment helper
└── update.sh               # update/redeploy script
```

---

## 🚀 Getting started

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL
- Redis (for Celery)

### 1. Clone & configure environment

The backend reads a `.env` file from the **project root**:

```bash
git clone https://github.com/imallakov/EnduranceAI.git
cd EnduranceAI
```

Create `.env` in the project root:

```dotenv
# Django
SECRET_KEY=
DJANGO_SETTINGS_MODULE=config.settings.development

# Database (PostgreSQL)
DB_NAME=
DB_USER=
DB_PASSWORD=
DB_HOST=
DB_PORT=

# Celery / Redis
REDIS_URL=

# External APIs
OPENWEATHERMAP_API_KEY=
STRAVA_CLIENT_ID=
STRAVA_CLIENT_SECRET=
STRAVA_REDIRECT_URI=
```

### 2. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

python manage.py migrate
python manage.py runserver
```

Start the Celery worker in a separate terminal (for Strava sync / background jobs):

```bash
celery -A config worker -l info
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env              # set VITE_API_URL to the backend URL
npm run dev
```

The app will be available at the Vite dev URL (default `http://localhost:5173`).

---

## 🗺 Roadmap

- [ ] Native **iOS/Android app** ingesting workout data **directly** from Apple HealthKit / Garmin / watch files (removing the dependency on third-party APIs)
- [ ] Expanded data sources beyond Strava
- [ ] Public production domain

---

## 👤 Author

**Yakup Allakov** — Backend Developer
[LinkedIn](https://www.linkedin.com/in/imallakov) · [GitHub](https://github.com/imallakov)

2nd place — National Informatics Olympiad of Turkmenistan (2019) · IOI 2019, Team Turkmenistan · ICPC 2023 quarterfinalist
