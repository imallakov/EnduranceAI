# EnduranceAI — Техническое задание

> **ВКР:** Автоматизированная система предиктивной аналитики и адаптивного планирования тренировочного процесса  
> **Версия:** 2.0 — Финальная  
> **Стек:** Python 3.11 · Django 4.2 · DRF · PostgreSQL 15 · Celery · React 18 · Vite · XGBoost

---

## Содержание

1. [Назначение системы](#1-назначение-системы)
2. [Функциональные требования](#2-функциональные-требования)
3. [ML-пайплайн — подробно](#3-ml-пайплайн)
4. [База марафонов (40+)](#4-база-марафонов)
5. [Структура базы данных](#5-структура-базы-данных)
6. [REST API](#6-rest-api)
7. [Технологический стек](#7-технологический-стек)
8. [Структура проекта](#8-структура-проекта)
9. [UI — экраны](#9-ui--экраны)
10. [План реализации по дням](#10-план-реализации)

---

## 1. Назначение системы

EnduranceAI принимает исторические тренировочные данные бегуна из GPS-часов (Garmin, Polar, Suunto), рассчитывает спортивные метрики (VDOT, CTL/ATL/TSB), предсказывает финишное время на конкретном марафоне с учётом рельефа трассы и погоды через ансамбль ML-моделей, и генерирует адаптивный тренировочный план по системе Джека Дэниэлса.

### Ключевые отличия от существующих решений

| Возможность | Garmin Connect | Strava | EnduranceAI |
|---|---|---|---|
| Предсказание по тренировкам | Базовое | Нет | ✅ Полное (XGBoost) |
| Учёт рельефа конкретной трассы | Нет | Нет | ✅ Minetti модель |
| Учёт погоды в день старта | Нет | Нет | ✅ ACSM формула |
| CTL/ATL/TSB график | Платно ($15/мес) | Нет | ✅ Бесплатно |
| Тренировочный план по VDOT | Нет | Нет | ✅ Джек Дэниэлс |
| База 40+ марафонов с GPX | Нет | Нет | ✅ Предзагружена |

---

## 2. Функциональные требования

### 2.1 Аутентификация и профиль

**FR-01** — Регистрация email + пароль. JWT (access 15 мин, refresh 30 дней).

**FR-02** — Профиль бегуна:
- `email`, `first_name`, `last_name`, `date_of_birth`, `sex`
- `max_hr` — максимальный пульс (вручную или авто из данных)
- `target_marathon_id` — выбранный целевой марафон из базы
- `target_race_date`, `target_finish_time` (опционально)
- `units` — `metric` / `imperial`
- `lang` — `ru` / `en`

**FR-03** — Смена пароля, удаление аккаунта с каскадным удалением всех данных.

---

### 2.2 Загрузка и парсинг тренировочных данных

**FR-04** — Поддерживаемые форматы:

| Формат | Библиотека | Источник |
|---|---|---|
| `.fit` | `fitparse` | Garmin Connect → Export Original |
| `.gpx` | `gpxpy` | Любые часы, Strava, Komoot |
| `.tcx` | `gpxpy` | Garmin Training Center |
| `.zip` | `zipfile` | Массовый импорт (вся история) |

**FR-05** — Извлекаемые поля из каждой активности:

```python
{
  "start_time": datetime,
  "distance_km": float,
  "duration_sec": int,
  "avg_pace_sec_per_km": float,
  "avg_hr": int,           # nullable
  "max_hr": int,           # nullable
  "elevation_gain_m": float,
  "elevation_loss_m": float,
  "avg_cadence": int,      # nullable
  "calories": int,         # nullable
  "laps": list[dict],      # сплиты по км
  "hr_zones_sec": dict,    # {"E": 1200, "M": 450, ...}
  "polyline": str,         # encoded polyline для карты
  "source": str,           # "fit" | "gpx" | "tcx" | "manual"
}
```

**FR-06** — Дедупликация по `sha256(file_bytes)`. Повторная загрузка → предупреждение, не ошибка.

**FR-07** — Фоновая обработка через Celery: загрузка → задача в очередь → пересчёт метрик → WebSocket уведомление о готовности.

**FR-08** — Ручной ввод: дата, дистанция, время финиша, средний пульс (опционально).

**FR-09** — Детальная страница активности:
- Карта с цветовым темпом (Leaflet + heat-map layer)
- Три графика: темп/км, ЧСС/км, высота/км (Recharts)
- Таблица сплитов по километрам
- Зоны пульса — кольцевая диаграмма
- Метрики: VDOT этой пробежки, TSS, HR Efficiency

---

### 2.3 Спортивные метрики

#### 2.3.1 VDOT

Формула Джека Дэниэлса (точная, не приближение):

```python
def calc_vdot(distance_m: float, duration_sec: float) -> float:
    t = duration_sec / 60  # минуты
    v = distance_m / t     # м/мин

    pct_vo2max = (0.8 + 0.1894393 * math.exp(-0.012778 * t)
                      + 0.2989558 * math.exp(-0.1932605 * t))

    vo2 = (-4.60 + 0.182258 * v + 0.000104 * v**2)

    return vo2 / pct_vo2max
```

- Применяется к каждой активности длиннее 5 км с IF > 0.65 (не слишком лёгкой)
- `user.vdot` = max за последние 90 дней
- Пересчёт при каждом новом импорте

**Интерпретация:**
```
< 30  → начинающий
30-40 → любитель
40-50 → продвинутый любитель
50-60 → серьёзный (суббот. бегун)
60+   → элита / полупрофессионал
```

#### 2.3.2 Training Stress Score (TSS)

```python
def calc_tss(duration_sec: float, avg_hr: int,
             threshold_hr: int) -> float:
    duration_hours = duration_sec / 3600
    intensity_factor = avg_hr / threshold_hr
    return duration_hours * intensity_factor**2 * 100
```

Если ЧСС нет — IF считается из темпа: `IF = threshold_pace / avg_pace`.

`threshold_hr` и `threshold_pace` берутся из VDOT-таблицы Дэниэлса.

#### 2.3.3 CTL / ATL / TSB

```python
# Exponential moving average (стандарт TrainingPeaks / WKO)
CTL_t = CTL_prev * exp(-1/42) + TSS_t * (1 - exp(-1/42))  # форма
ATL_t = ATL_prev * exp(-1/7)  + TSS_t * (1 - exp(-1/7))   # усталость
TSB_t = CTL_t - ATL_t                                       # свежесть
```

Пересчёт за всю историю при каждой новой активности (Celery task).

```
TSB > +25       : очень свежий (возможно, детренированность)
TSB от +5 до +25: оптимум для старта
TSB от -10 до +5: рабочее состояние
TSB < -30       : перетренированность, высокий риск травмы
```

#### 2.3.4 Зоны пульса и темпа (Дэниэлс)

```python
# Из VDOT вычисляем пороговые значения
def vdot_to_paces(vdot: float) -> dict:
    # Формула Дэниэлса: velocity at VO2max
    velocity_vo2max = ((-4.60 + math.sqrt(21.16 + 0.000416 * vdot)) / 0.000208) / 1000  # км/мин
    
    paces = {
        "E":  velocity_vo2max * 0.59 - 0.04,   # Easy
        "M":  velocity_vo2max * 0.75,           # Marathon
        "T":  velocity_vo2max * 0.88,           # Threshold
        "I":  velocity_vo2max * 0.98,           # Interval
        "R":  velocity_vo2max * 1.10,           # Repetition
    }
    # return в сек/км
    return {k: 60 / v for k, v in paces.items()}
```

#### 2.3.5 HR Efficiency

```python
hr_efficiency = avg_pace_sec_per_km / avg_hr
# Рост со временем = прогресс аэробной экономичности
```

#### 2.3.6 Race Readiness Score (0–100)

```python
def race_readiness_score(user_metrics: dict) -> dict:
    tsb = user_metrics["tsb"]
    
    # TSB score: оптимум +5..+25, штрафы за отклонения
    if 5 <= tsb <= 25:
        tsb_score = 100
    elif tsb > 25:
        tsb_score = max(0, 100 - (tsb - 25) * 3)
    else:
        tsb_score = max(0, 100 + (tsb - 5) * 4)
    
    consistency = user_metrics["pct_weeks_with_runs_10w"]       # 0-1
    long_run_completion = user_metrics["long_runs_completed_pct"] # 0-1
    vdot_trend = min(1, max(0, user_metrics["vdot_delta_6w"] / 3)) # нормализовано
    volume_ok = min(1, user_metrics["avg_weekly_km"] /
                       user_metrics["recommended_weekly_km"])

    score = (tsb_score * 0.30
           + consistency * 100 * 0.25
           + long_run_completion * 100 * 0.20
           + vdot_trend * 100 * 0.15
           + volume_ok * 100 * 0.10)
    
    return {
        "score": round(score),
        "components": {
            "tsb_score": tsb_score,
            "consistency": consistency * 100,
            "long_runs": long_run_completion * 100,
            "vdot_trend": vdot_trend * 100,
            "volume": volume_ok * 100,
        }
    }
```

---

### 2.4 Предсказание финишного времени

**FR-11** — Пользователь выбирает: дистанцию, марафон из базы или GPX-файл, дату старта.

**FR-12** — Ответ API:
```json
{
  "predicted_time_sec": 13335,
  "predicted_time_formatted": "3:42:15",
  "confidence_interval_sec": 540,
  "base_time_sec": 12900,
  "course_difficulty_coefficient": 1.032,
  "weather_index": 1.025,
  "recommended_pace": {
    "start_10km": "5:18/km",
    "middle_22km": "5:22/km",
    "finish_10km": "5:15/km"
  },
  "race_readiness": { "score": 78, "components": {...} },
  "feature_importance": [
    {"feature": "vdot", "impact_sec": -480, "description": "Ваш VDOT 47 ускоряет результат на 8 мин"},
    {"feature": "weather_index", "impact_sec": +320, "description": "Ожидаемые +22°C добавят ~5 мин"},
    ...
  ]
}
```

---

### 2.5 Тренировочный план

**FR-25** — Генерация: дата старта + целевое время + дней в неделю (3–6).

**FR-26** — Фазы по Дэниэлсу:

| Фаза | % недель | Фокус |
|---|---|---|
| Phase I — Base | 20% | Easy runs, объём, аэробная база |
| Phase II — Early Quality | 25% | Первые темповые, длинные |
| Phase III — Late Quality | 30% | Интервалы I и R, специфика дистанции |
| Phase IV — Taper | 25% | Снижение объёма, сохранение качества |

**FR-27** — Типы тренировок в плане:

```python
WORKOUT_TYPES = {
    "easy":     {"zones": ["E"], "description": "Лёгкий бег"},
    "tempo":    {"zones": ["T"], "description": "Темповый бег"},
    "interval": {"zones": ["I"], "description": "Интервалы"},
    "repetition": {"zones": ["R"], "description": "Ускорения"},
    "long":     {"zones": ["E", "M"], "description": "Длинная пробежка"},
    "marathon_pace": {"zones": ["M"], "description": "Марафонский темп"},
    "rest":     {"zones": [], "description": "Отдых / кросс-тренинг"},
}
```

**FR-28** — Адаптация: если `ATL > CTL + 15` на текущей неделе → следующая неделя с объёмом −15%, качественные тренировки смещаются.

**FR-29** — Экспорт: PDF (через WeasyPrint или ReportLab), CSV.

---

### 2.6 Дополнительные функции

**FR-30** — Позиция в финишном протоколе: при выборе марафона из базы показывается распределение и позиция пользователя с прогнозируемым временем.

**FR-31** — Погодная коррекция (ACSM):
```python
def weather_factor(temp_c: float, humidity_pct: float) -> float:
    base_temp = 10.0
    temp_penalty = max(0, (temp_c - base_temp) * 0.004)  # 0.4% за каждый °C выше 10
    humidity_penalty = max(0, (humidity_pct - 60) * 0.001)  # 0.1% за каждый % выше 60
    return 1.0 + temp_penalty + humidity_penalty
```

**FR-32** — HR Efficiency trend chart: еженедельный rolling average за 6 месяцев.

---

## 3. ML-пайплайн

### 3.1 Ключевая концепция

`course_difficulty_coefficient` и `weather_index` — это **признаки (features) в самой модели**, а не поправки после предсказания. Модель на этапе обучения видит, например:
- Boston 2012: жара +24°C → `weather_index = 1.085` → массовый сход участников, медленные времена
- Boston 2011: идеал → `weather_index = 0.98` → быстрые времена

И сама учится весу этих взаимодействий. Minetti-формула — это способ **вычислить** `course_difficulty_coefficient` из GPX конкретной трассы, а не "добавить поправку потом".

### 3.2 Признаки модели (features)

```python
FEATURES = [
    # Аэробная форма
    "vdot",                    # VDOT пользователя (float)
    
    # Нагрузка и восстановление
    "ctl",                     # Chronic Training Load
    "atl",                     # Acute Training Load
    "tsb",                     # Training Stress Balance = CTL - ATL
    
    # Объём тренировок
    "avg_weekly_km_8w",        # Средний недельный объём, 8 недель
    "peak_weekly_km_8w",       # Пиковая неделя за 8 недель
    "longest_run_8w",          # Длиннейшая тренировка за 8 недель (км)
    "long_run_avg_pace",       # Средний темп длинных (>15 км), сек/км
    
    # Качество тренировок
    "hr_efficiency_slope",     # Тренд HR efficiency за 8 недель
    "training_consistency",    # Доля недель с пробежками (0–1)
    
    # Демография
    "age",                     # Возраст
    "sex",                     # 0 = female, 1 = male
    
    # Характеристики гонки (ключевое!)
    "target_distance_km",      # Дистанция (5, 10, 21.1, 42.2)
    "course_difficulty_coefficient",  # Из Minetti по GPX трассы
    "weather_index",           # Температура + влажность
]

TARGET = "finish_time_sec"
```

### 3.3 Вычисление course_difficulty_coefficient (модель Minetti)

```python
import gpxpy
import numpy as np

def minetti_energy_cost(slope: float) -> float:
    """slope — безразмерный (0.1 = 10% уклон)"""
    return (280.5 * slope**5
          - 58.7  * slope**4
          - 76.8  * slope**3
          + 51.9  * slope**2
          + 19.6  * slope
          + 2.5)

FLAT_ENERGY_COST = 2.5  # Дж/кг/м на нулевом уклоне

def compute_course_difficulty(gpx_path: str) -> float:
    with open(gpx_path) as f:
        gpx = gpxpy.parse(f)
    
    points = []
    for track in gpx.tracks:
        for segment in track.segments:
            for p in segment.points:
                points.append((p.latitude, p.longitude, p.elevation or 0))
    
    total_cost = 0.0
    total_distance = 0.0
    
    for i in range(1, len(points)):
        lat1, lon1, ele1 = points[i-1]
        lat2, lon2, ele2 = points[i]
        
        # Расстояние между точками (Haversine)
        dist = haversine(lat1, lon1, lat2, lon2)  # метры
        if dist < 1:
            continue
        
        slope = (ele2 - ele1) / dist
        slope = max(-0.45, min(0.45, slope))  # ограничение [-45%, +45%]
        
        total_cost += minetti_energy_cost(slope) * dist
        total_distance += dist
    
    if total_distance == 0:
        return 1.0
    
    flat_cost = FLAT_ENERGY_COST * total_distance
    return total_cost / flat_cost  # 1.0 = идеально плоская трасса
```

### 3.4 Вычисление weather_index

```python
def compute_weather_index(temp_c: float, humidity_pct: float,
                           wind_ms: float = 0.0) -> float:
    base_temp = 10.0
    temp_penalty    = max(0, (temp_c - base_temp) * 0.004)
    humidity_penalty = max(0, (humidity_pct - 60) * 0.001)
    wind_bonus      = min(0.01, wind_ms * 0.0005) if wind_ms > 3 else 0  # слабый попутный
    
    return 1.0 + temp_penalty + humidity_penalty - wind_bonus
```

### 3.5 Обогащение Kaggle-данных

Kaggle датасеты дают: `finish_time`, `age`, `sex`. Мы дообогащаем:

```python
def enrich_kaggle_row(row: dict, marathon_meta: dict) -> dict:
    # VDOT из финишного времени (обратная задача)
    vdot = fit_vdot_from_finish(row["finish_time_sec"], marathon_meta["distance_km"] * 1000)
    
    # Апроксимация тренировочных признаков из литературы:
    # Кросс-секционные данные: VDOT 45 ≈ avg 60 км/нед, CTL ≈ 55-65
    # (используем статистически обоснованные диапазоны с шумом)
    avg_weekly_km = vdot_to_expected_weekly_km(vdot) * np.random.normal(1.0, 0.1)
    ctl_estimate  = avg_weekly_km * 0.85 + np.random.normal(0, 3)
    
    return {
        "vdot": vdot,
        "ctl": ctl_estimate,
        "atl": ctl_estimate * np.random.uniform(0.85, 1.15),
        "tsb": np.random.normal(5, 8),  # типичный TSB перед стартом
        "avg_weekly_km_8w": avg_weekly_km,
        "peak_weekly_km_8w": avg_weekly_km * 1.25,
        "longest_run_8w": min(38, avg_weekly_km * 0.45),
        "long_run_avg_pace": vdot_to_paces(vdot)["M"] * 1.05,
        "hr_efficiency_slope": 0.0,
        "training_consistency": np.random.uniform(0.7, 1.0),
        "age": row["age"],
        "sex": row["sex"],
        "target_distance_km": marathon_meta["distance_km"],
        "course_difficulty_coefficient": marathon_meta["difficulty_coeff"],
        "weather_index": marathon_meta["weather_index"],
        "finish_time_sec": row["finish_time_sec"],
    }
```

### 3.6 Обучение моделей

```python
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import Ridge
from sklearn.model_selection import cross_val_score
from xgboost import XGBRegressor
import joblib

# Разделение данных
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Model 1: Ridge (интерпретируемая, для объяснения комиссии)
ridge_pipe = Pipeline([
    ("scaler", StandardScaler()),
    ("model", Ridge(alpha=10.0)),
])
ridge_pipe.fit(X_train, y_train)

# Model 2: XGBoost (основная)
xgb_model = XGBRegressor(
    n_estimators=500,
    max_depth=6,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    min_child_weight=5,
    reg_lambda=1.0,
    random_state=42,
    early_stopping_rounds=50,
)
xgb_model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)

# Ensemble (предсказание)
def predict_ensemble(X: np.ndarray) -> np.ndarray:
    ridge_pred = ridge_pipe.predict(X)
    xgb_pred   = xgb_model.predict(X)
    return 0.3 * ridge_pred + 0.7 * xgb_pred

# Валидация
cv_scores = cross_val_score(xgb_model, X_train, y_train, cv=5,
                             scoring="neg_mean_absolute_error")
mae_minutes = -cv_scores.mean() / 60
print(f"CV MAE: {mae_minutes:.1f} мин (цель < 8 мин)")

# Сохранение
joblib.dump(ridge_pipe, "models/ridge_v1.joblib")
joblib.dump(xgb_model,  "models/xgb_v1.joblib")
```

### 3.7 Источники данных для обучения

| Датасет | URL/источник | Строк | Признаки |
|---|---|---|---|
| NYC Marathon Results | kaggle.com: `nyrr-data` | ~500K | finish, age, sex, splits |
| Boston Marathon (127 лет!) | kaggle.com: `boston-results` | ~300K | + weather по годам |
| Marathon Time Prediction | kaggle.com: `marathon-time` | ~500K | finish + demographics |
| Strava Running Activities | kaggle.com: `garmin-fitness-tracker` | ~15K | GPS + HR + pace |
| Chicago/Berlin results | marathonresults.eu (парсинг) | ~200K | finish + age + sex |
| **Boston с погодой (ключевой!)** | kaggle.com: `boston-marathon-weather` | ~40K | finish + temp + humidity + wind |

> **Важно:** Boston Marathon — идеальный датасет: одна трасса, ежегодно разная погода. Модель видит одинаковых бегунов (схожий VDOT) при +10°C и +28°C. Это прямое обучение на погодном эффекте.

---

## 4. База марафонов (40+)

Трассы загружаются как GPX один раз скриптом `python manage.py import_marathons`. `difficulty_coeff` рассчитывается автоматически из GPX.

### 4.1 World Marathon Majors (6)

| Название | Страна | Набор (м) | Coeff | Особенность |
|---|---|---|---|---|
| Berlin Marathon | Германия | 130 | 1.002 | Рекорды мира, идеально плоский |
| London Marathon | Великобритания | 115 | 1.004 | Thames Path, быстрый |
| Chicago Marathon | США | 95 | 1.001 | Самый плоский из Majors |
| Boston Marathon | США | 400 | 1.038 | Heartbreak Hill, км 29-33 |
| New York City M. | США | 500 | 1.048 | 5 мостов, самый сложный |
| Tokyo Marathon | Япония | 185 | 1.009 | Две петли, быстрый |

### 4.2 Европа — топ (16)

| Название | Страна | Набор (м) | Особенность |
|---|---|---|---|
| Valencia Marathon | Испания | 65 | Сейчас быстрейшая трасса Европы, WR |
| Seville Marathon | Испания | 58 | Самая плоская в Испании |
| Barcelona Marathon | Испания | 240 | Умеренный, красивый |
| Paris Marathon | Франция | 260 | Bois de Boulogne, Élysées |
| Amsterdam Marathon | Нидерланды | 45 | Очень быстрый, плоский |
| Vienna City M. | Австрия | 150 | Вдоль Дуная |
| Prague Marathon | Чехия | 180 | Исторический центр |
| Warsaw Marathon | Польша | 110 | Варшавские парки |
| Budapest Marathon | Венгрия | 165 | Вдоль Дуная |
| Frankfurt Marathon | Германия | 140 | Осенний, быстрый |
| Hamburg Marathon | Германия | 155 | Портовый город |
| Stockholm Marathon | Швеция | 180 | Июнь, долгий день |
| Copenhagen M. | Дания | 90 | Плоский, быстрый |
| Athens Classic M. | Греция | 530 | Исторический маршрут Марафон→Афины |
| Rome Marathon | Италия | 215 | Вечный город, брусчатка |
| Zurich Marathon | Швейцария | 195 | Вдоль Цюрихского озера |

### 4.3 Турция (4)

| Название | Город | Набор (м) | Особенность |
|---|---|---|---|
| İstanbul Avrasya M. | Стамбул | 380 | Единственный марафон на двух континентах! Мосты через Босфор — знаковые подъёмы |
| Antalya Marathon | Анталья | 145 | Март, средиземноморский климат, популярен у европейцев |
| İzmir Marathon | Измир | 120 | Вдоль залива Измир, ноябрь |
| Ankara Marathon | Анкара | 290 | Холмистый, столица |

### 4.4 Россия (8)

| Название | Город | Набор (м) | Месяц |
|---|---|---|---|
| Moscow Marathon | Москва | 170 | Сентябрь |
| St. Petersburg M. | СПб | 100 | Май |
| Kazan Marathon | Казань | 120 | Май |
| Ufa Marathon | Уфа | 195 | Май |
| Sochi Marathon | Сочи | 320 | Март |
| Novosibirsk M. | Новосибирск | 140 | Июнь |
| Yekaterinburg M. | Екатеринбург | 230 | Июнь |
| Krasnoyarsk M. | Красноярск | 260 | Август |

### 4.5 Ближний Восток и Азия (4)

| Название | Страна | Набор (м) | Особенность |
|---|---|---|---|
| Dubai Marathon | ОАЭ | 55 | Январь, рекорды курса, жарко летом |
| Abu Dhabi M. | ОАЭ | 80 | Декабрь, вдоль Корниша |
| Seoul Marathon | Корея | 225 | Март, через центр Сеула |
| Sydney Marathon | Австралия | 310 | Сентябрь, мост Харбор |

### 4.6 Скрипт импорта

```python
# management/commands/import_marathons.py
import os
import gpxpy
from django.core.management.base import BaseCommand
from races.models import Marathon
from races.utils.elevation import compute_course_difficulty

MARATHONS_DATA = [
    {
        "name": "Berlin Marathon",
        "city": "Berlin",
        "country": "DE",
        "distance_km": 42.195,
        "gpx_file": "data/gpx/berlin.gpx",
        "start_lat": 52.5200,
        "start_lon": 13.3693,
        "official_url": "https://www.bmw-berlin-marathon.com",
        "avg_temp_by_month": {9: 17.0},
    },
    # ... все марафоны
]

class Command(BaseCommand):
    def handle(self, *args, **kwargs):
        for data in MARATHONS_DATA:
            gpx_path = data.pop("gpx_file")
            coeff = compute_course_difficulty(gpx_path)
            Marathon.objects.update_or_create(
                name=data["name"],
                defaults={**data, "difficulty_coefficient": coeff, "gpx_file_path": gpx_path}
            )
            self.stdout.write(f"✅ {data['name']} — coeff: {coeff:.4f}")
```

---

## 5. Структура базы данных

```sql
-- Пользователи
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       VARCHAR(255) UNIQUE NOT NULL,
    password    VARCHAR(255) NOT NULL,
    first_name  VARCHAR(100),
    last_name   VARCHAR(100),
    date_of_birth DATE,
    sex         CHAR(1) CHECK (sex IN ('M', 'F')),
    max_hr      SMALLINT,
    target_marathon_id UUID REFERENCES marathons(id),
    target_race_date   DATE,
    target_finish_sec  INTEGER,
    units       VARCHAR(10) DEFAULT 'metric',
    lang        VARCHAR(5) DEFAULT 'ru',
    created_at  TIMESTAMP DEFAULT NOW()
);

-- Активности
CREATE TABLE activities (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_hash       VARCHAR(64) UNIQUE,  -- sha256 для дедупликации
    start_time      TIMESTAMP NOT NULL,
    distance_km     DECIMAL(8,3) NOT NULL,
    duration_sec    INTEGER NOT NULL,
    avg_pace_sec_per_km DECIMAL(8,2),
    avg_hr          SMALLINT,
    max_hr          SMALLINT,
    elevation_gain_m DECIMAL(8,1),
    elevation_loss_m DECIMAL(8,1),
    avg_cadence     SMALLINT,
    calories        INTEGER,
    vdot_estimate   DECIMAL(5,2),
    tss             DECIMAL(8,2),
    laps            JSONB,
    hr_zones_sec    JSONB,
    polyline        TEXT,
    raw_file_path   VARCHAR(500),
    source          VARCHAR(10) DEFAULT 'fit',
    created_at      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_activities_user_date ON activities(user_id, start_time DESC);

-- Ежедневные метрики (рассчитываются Celery)
CREATE TABLE daily_metrics (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date        DATE NOT NULL,
    ctl         DECIMAL(8,2) DEFAULT 0,
    atl         DECIMAL(8,2) DEFAULT 0,
    tsb         DECIMAL(8,2) DEFAULT 0,
    vdot_rolling DECIMAL(5,2),
    hr_efficiency DECIMAL(8,4),
    UNIQUE(user_id, date)
);
CREATE INDEX idx_daily_metrics_user_date ON daily_metrics(user_id, date DESC);

-- Марафоны
CREATE TABLE marathons (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(200) NOT NULL,
    city            VARCHAR(100),
    country         CHAR(2),
    distance_km     DECIMAL(6,3) DEFAULT 42.195,
    elevation_gain_m DECIMAL(8,1),
    elevation_loss_m DECIMAL(8,1),
    difficulty_coefficient DECIMAL(6,4) DEFAULT 1.0,
    gpx_file_path   VARCHAR(500),
    start_lat       DECIMAL(10,7),
    start_lon       DECIMAL(10,7),
    avg_temp_by_month JSONB,  -- {"1": 12.5, "2": 13.1, ...}
    official_url    VARCHAR(500),
    last_updated    DATE
);

-- Исторические результаты марафонов
CREATE TABLE marathon_results (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    marathon_id     UUID NOT NULL REFERENCES marathons(id),
    year            SMALLINT NOT NULL,
    age_group       VARCHAR(10),
    sex             CHAR(1),
    finish_time_sec INTEGER NOT NULL,
    position_overall INTEGER,
    position_age_group INTEGER,
    country         CHAR(2)
);
CREATE INDEX idx_results_marathon_year ON marathon_results(marathon_id, year, finish_time_sec);

-- Предсказания
CREATE TABLE predictions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    marathon_id     UUID REFERENCES marathons(id),
    created_at      TIMESTAMP DEFAULT NOW(),
    target_distance_km DECIMAL(6,3),
    race_date       DATE,
    -- Компоненты предсказания
    base_time_sec   INTEGER,
    course_difficulty_coefficient DECIMAL(6,4),
    weather_index   DECIMAL(6,4),
    predicted_time_sec INTEGER NOT NULL,
    confidence_interval_sec INTEGER,
    race_readiness_score SMALLINT,
    -- Признаки на момент предсказания
    features_snapshot JSONB,
    feature_importance JSONB,
    model_version   VARCHAR(20)
);

-- Тренировочные планы
CREATE TABLE training_plans (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    prediction_id   UUID REFERENCES predictions(id),
    start_date      DATE NOT NULL,
    race_date       DATE NOT NULL,
    target_time_sec INTEGER,
    vdot_at_creation DECIMAL(5,2),
    days_per_week   SMALLINT DEFAULT 4,
    status          VARCHAR(20) DEFAULT 'active',
    created_at      TIMESTAMP DEFAULT NOW()
);

-- Недели плана
CREATE TABLE plan_weeks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id     UUID NOT NULL REFERENCES training_plans(id) ON DELETE CASCADE,
    week_number SMALLINT NOT NULL,
    phase       VARCHAR(20),  -- base | early_quality | late_quality | taper
    total_km    DECIMAL(6,1),
    notes       TEXT,
    UNIQUE(plan_id, week_number)
);

-- Тренировки плана
CREATE TABLE plan_workouts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_week_id    UUID NOT NULL REFERENCES plan_weeks(id) ON DELETE CASCADE,
    day_of_week     SMALLINT,  -- 0=пн, 6=вс
    workout_type    VARCHAR(20),
    distance_km     DECIMAL(5,1),
    structure       JSONB,  -- {"intervals": [{"reps": 6, "dist": 1000, "pace": 240}]}
    pace_min_sec    INTEGER,
    pace_max_sec    INTEGER,
    hr_min          SMALLINT,
    hr_max          SMALLINT,
    completed       BOOLEAN DEFAULT FALSE,
    activity_id     UUID REFERENCES activities(id)
);
```

---

## 6. REST API

### Auth

```
POST   /api/auth/register/          → {access, refresh, user}
POST   /api/auth/login/             → {access, refresh, user}
POST   /api/auth/token/refresh/     → {access}
POST   /api/auth/logout/            → 204
GET    /api/auth/profile/           → User
PUT    /api/auth/profile/           → User
DELETE /api/auth/profile/           → 204 (каскадное удаление)
```

### Activities

```
GET    /api/activities/             ?date_from=&date_to=&min_km=&page=
POST   /api/activities/upload/      multipart: file (fit|gpx|tcx)
POST   /api/activities/upload-zip/  multipart: file.zip
POST   /api/activities/manual/      {date, distance_km, duration_sec, avg_hr?}
GET    /api/activities/{id}/        → ActivityDetail
DELETE /api/activities/{id}/        → 204
GET    /api/activities/{id}/map/    → GeoJSON LineString
GET    /api/activities/stats/       → {total_km, total_activities, avg_pace, ...}
```

### Metrics

```
GET    /api/metrics/daily/          ?date_from=&date_to= → [{date, ctl, atl, tsb, vdot}]
GET    /api/metrics/current/        → {ctl, atl, tsb, vdot, hr_efficiency}
GET    /api/metrics/vdot-history/   → [{week, vdot}] (последние 26 недель)
GET    /api/metrics/hr-efficiency/  → [{week, efficiency}]
GET    /api/metrics/zones-dist/     ?weeks=8 → {E: 45, M: 25, T: 15, I: 10, R: 5}
```

### Predictions

```
POST   /api/predictions/            {marathon_id?, gpx_file?, distance_km, race_date, temp_c?, humidity_pct?}
GET    /api/predictions/            → список
GET    /api/predictions/latest/     → последнее
GET    /api/predictions/{id}/       → детали + feature_importance
```

### Marathons

```
GET    /api/marathons/              ?country=&max_difficulty=&search=
GET    /api/marathons/{id}/         → детали + elevation profile
GET    /api/marathons/{id}/results/ ?year=&age_group=&sex=
GET    /api/marathons/{id}/weather/ → историческая погода
POST   /api/marathons/custom/       multipart: gpx_file + {name, city, country, race_date?}
```

### Plans

```
POST   /api/plans/generate/         {race_date, target_time_sec?, days_per_week}
GET    /api/plans/active/           → TrainingPlan с weeks
GET    /api/plans/{id}/             → детали
GET    /api/plans/{id}/weeks/       → [PlanWeek с workouts]
GET    /api/plans/{id}/export/pdf/  → PDF файл
GET    /api/plans/{id}/export/csv/  → CSV файл
PATCH  /api/plans/{id}/workouts/{wid}/complete/  {activity_id?}
```

### Dashboard

```
GET    /api/dashboard/              → одним запросом все данные главной страницы
# Ответ:
{
  "metrics": {ctl, atl, tsb, vdot},
  "race_readiness": {score, components},
  "latest_prediction": {...},
  "days_to_race": 42,
  "recent_activities": [...5 штук],
  "weekly_km_current": 67.4,
  "weekly_km_avg_8w": 58.2,
  "ctl_atl_tsb_chart": [{date, ctl, atl, tsb}]  // 84 дня
}
```

---

## 7. Технологический стек

### Backend

```
Python 3.11+
Django 4.2
djangorestframework 3.14
djangorestframework-simplejwt
django-cors-headers
celery[redis] 5.3
redis (broker + cache)
psycopg2-binary
```

### Парсинг и геоданные

```
fitparse          # FIT файлы Garmin
gpxpy             # GPX и TCX
numpy             # численные расчёты
haversine         # расстояния между GPS координатами
```

### ML

```
pandas            # обработка данных
scikit-learn      # Ridge, Pipeline, StandardScaler, cross_val_score
xgboost           # основная модель
joblib            # сохранение моделей
jupyter           # ноутбуки для EDA и обучения
```

### Frontend

```
React 18
Vite 5
react-router-dom 6
@tanstack/react-query 5  (кэширование, sync)
recharts                  (CTL/ATL/TSB, VDOT, HR charts)
leaflet + react-leaflet   (карты трасс и пробежек)
tailwindcss               (стили)
react-dropzone            (drag & drop загрузка)
dayjs                     (даты)
axios                     (HTTP клиент)
```

### DevOps

```
docker + docker-compose
nginx (reverse proxy)
```

### Внешние API

```
OpenWeatherMap API  — погода на день старта (free tier: 60 запросов/мин)
Open Elevation API  — высоты по координатам (backup для GPX без ele)
```

---

## 8. Структура проекта

```
enduranceai/
├── backend/
│   ├── config/
│   │   ├── settings/
│   │   │   ├── base.py
│   │   │   ├── development.py
│   │   │   └── production.py
│   │   ├── urls.py
│   │   └── celery.py
│   ├── apps/
│   │   ├── users/          # User, Profile, JWT auth
│   │   ├── activities/     # Activity, парсинг FIT/GPX
│   │   ├── metrics/        # DailyMetrics, VDOT, CTL/ATL/TSB
│   │   ├── races/          # Marathon, MarathonResult, Prediction
│   │   ├── plans/          # TrainingPlan, PlanWeek, PlanWorkout
│   │   └── dashboard/      # Агрегирующий API
│   ├── ml/
│   │   ├── data/
│   │   │   ├── kaggle/     # Сырые Kaggle датасеты
│   │   │   └── processed/  # Обработанные датасеты
│   │   ├── notebooks/
│   │   │   ├── 01_eda.ipynb
│   │   │   ├── 02_feature_engineering.ipynb
│   │   │   └── 03_training.ipynb
│   │   ├── models/
│   │   │   ├── ridge_v1.joblib
│   │   │   └── xgb_v1.joblib
│   │   └── src/
│   │       ├── features.py    # Feature engineering
│   │       ├── minetti.py     # Корректор рельефа
│   │       ├── weather.py     # Погодная коррекция
│   │       ├── train.py       # Скрипт обучения
│   │       └── predict.py     # Инференс
│   ├── data/
│   │   └── gpx/             # GPX файлы всех 40+ марафонов
│   └── manage.py
│
├── frontend/
│   ├── src/
│   │   ├── api/             # axios клиенты по модулям
│   │   ├── components/      # UI компоненты
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Upload.jsx
│   │   │   ├── Prediction.jsx
│   │   │   ├── Plan.jsx
│   │   │   ├── Activities.jsx
│   │   │   ├── ActivityDetail.jsx
│   │   │   ├── Marathons.jsx
│   │   │   └── Analytics.jsx
│   │   ├── hooks/           # useMetrics, usePrediction, ...
│   │   └── utils/           # formatPace, formatTime, ...
│   ├── index.html
│   └── vite.config.js
│
├── docker-compose.yml
├── nginx.conf
└── README.md
```

---

## 9. UI — экраны

### Dashboard

```
┌─ VDOT: 47.2 ─┬─ CTL: 58 ─┬─ ATL: 61 ─┬─ TSB: -3 ─┐
│   ↑ +1.4     │  ↑ форма  │  ↑ уст.   │  ↓ работа  │
└──────────────┴────────────┴────────────┴────────────┘

Race Readiness: [====░░░░░░] 72/100
"Умеренная усталость. TSB -3 — рабочее состояние. 
 Рекомендуется 5 дней лёгких тренировок перед стартом."

Прогноз: Berlin Marathon 3:44:12 (через 42 дня)
         [История: 3:52 → 3:48 → 3:44]

CTL/ATL/TSB график (84 дня, три линии)

Последние активности:
  17 мая  · 21.3 км · 5:18/км · ЧСС 148 · VDOT 47.1
  15 мая  · 10.0 км · 5:52/км · ЧСС 135 · лёгкий
  ...
```

### Upload

```
┌─────────────────────────────────────────┐
│  Перетащи файлы сюда или нажми выбрать  │
│  FIT · GPX · TCX · ZIP                  │
└─────────────────────────────────────────┘
  [Загрузка истории Garmin] ← кнопка с инструкцией

Обработано: ████████░░ 8 из 10 файлов
  ✅ 2024-05-15_run.fit → 21.3 км, VDOT 47.1
  ✅ 2024-05-12_run.fit → 10.0 км
  ⚠️  2024-05-10_run.fit → дубликат, пропущен
  🔄 2024-05-08_run.fit → обработка...
```

### Prediction

```
[Выбрать марафон ▼]  Berlin Marathon
[Дистанция ▼]       42.195 км
[Дата старта]       29 сентября 2026
[Температура °C]    [17] (из OpenWeather: 17°C)
[Влажность %]       [65]

                    [Рассчитать →]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ваш прогноз: 3:44:12  ±9 мин
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Базовое время (VDOT 47.2):   3:41:05
Трасса Berlin (coeff 1.002): +0:28
Погода 17°C / 65%:           +2:39
Итого:                        3:44:12

Race Readiness: 72/100 — Умеренная готовность

Рекомендуемый темп:
  0–10 км:  5:22/км  (осторожный старт)
  10–32 км: 5:18/км  (целевой марафонский)
  32–42 км: 5:14/км  (если силы есть)

Ваша позиция в 2024: ~4800 из 47000 · Топ 10% · M30-34

Высотный профиль Berlin:
 [──────────────────────────────────] ровная трасса
```

### Training Plan

```
Фаза: Early Quality (неделя 8 из 20)  ████████░░░░░░░░░░░░

ПН  — Отдых
ВТ  — Easy 10 км · 5:42-6:12/км · ЧСС < 145
СР  — Tempo 14 км с workout:
      разминка 2 км · 3×3 км в T-темпе 4:48/км · заминка 2 км
ЧТ  — Easy 8 км · 5:42-6:12/км
ПТ  — Отдых / плавание
СБ  — Easy 8 км + 6×100 м ускорений
ВС  — Long Run 28 км · 5:25-5:55/км (M/E темп)

Неделя: 68 км · Peak: 72 км · До старта: 42 дня
[Экспорт PDF] [Экспорт CSV] [Google Calendar]
```

---

## 10. План реализации

### День 1 — Фундамент backend

- [ ] `django-admin startproject enduranceai`
- [ ] Приложения: users, activities, metrics, races, plans, dashboard
- [ ] Все модели из раздела 5 (migrations)
- [ ] JWT auth: register, login, refresh, logout, profile
- [ ] Парсер FIT: `fitparse` → Activity model
- [ ] Парсер GPX/TCX: `gpxpy` → Activity model
- [ ] Upload endpoint (синхронный для начала)
- [ ] Manual activity endpoint

### День 2 — Вычисление метрик

- [ ] `calc_vdot(distance_m, duration_sec)` → Activity.vdot_estimate
- [ ] `calc_tss(duration_sec, avg_hr, threshold_hr)` → Activity.tss
- [ ] Celery task: пересчёт CTL/ATL/TSB за всю историю при новой активности
- [ ] DailyMetrics: создание/обновление записей
- [ ] Race Readiness Score (все 5 компонентов)
- [ ] API: /api/metrics/daily/, /api/metrics/current/, /api/metrics/vdot-history/
- [ ] Тесты: unittest для всех формул (VDOT, TSS, CTL/ATL)

### День 3 — ML модель

- [ ] Скачать Kaggle датасеты (NYC, Boston, marathon-time)
- [ ] EDA ноутбук: распределения, выбросы, корреляции
- [ ] Feature engineering: `enrich_kaggle_row()`
- [ ] `compute_course_difficulty()` — Minetti из GPX
- [ ] `compute_weather_index()` — температура + влажность
- [ ] Обучение Ridge + XGBoost, 5-fold CV
- [ ] Сохранение моделей: `ridge_v1.joblib`, `xgb_v1.joblib`
- [ ] Prediction endpoint: создать, получить, history
- [ ] Feature importance в ответе

### День 4 — Марафоны и планы

- [ ] Скачать GPX для 40 марафонов (plotaroute.com, сайты организаторов)
- [ ] `manage.py import_marathons` скрипт
- [ ] Marathon CRUD API с elevation profile
- [ ] MarathonResult import (Boston historical data — CSV с Kaggle)
- [ ] Генератор тренировочного плана (все 4 фазы)
- [ ] Plan week и workout генерация с VDOT-зонами
- [ ] Адаптация плана (ATL > CTL+15)
- [ ] Экспорт PDF (ReportLab или WeasyPrint)

### День 5 — Frontend ядро

- [ ] Vite + React + Router + Query + Tailwind setup
- [ ] Auth: login, register, logout, protected routes
- [ ] axios клиент с JWT interceptor (auto-refresh)
- [ ] Dashboard: метрики карточки, CTL/ATL/TSB график (Recharts)
- [ ] Upload: drag & drop, прогресс, список результатов
- [ ] Profile page

### День 6 — Frontend фичи

- [ ] Prediction page: форма → результат с разбивкой
- [ ] Training Plan: недельный вид, карточки тренировок
- [ ] Activities list: таблица с фильтрами
- [ ] Activity detail: Leaflet карта + 3 графика Recharts
- [ ] Marathons catalog: карточки с профилем высот

### День 7 — Полировка и демо

- [ ] E2E тест: регистрация → загрузка ZIP → метрики → предсказание → план
- [ ] Загрузить реальные FIT-файлы (Garmin экспорт) — проверить точность
- [ ] Demо-пользователь с 12 неделями тренировок
- [ ] README: установка, запуск, описание
- [ ] Swagger/OpenAPI схема (drf-spectacular)
- [ ] Подготовка слайдов для предзащиты

---

## Ключевые числа для защиты

| Метрика | Значение |
|---|---|
| Датасет для обучения | 1M+ финишных результатов |
| MAE модели (цель) | < 8 мин на марафоне |
| Число предзагруженных марафонов | 40+ |
| Число спортивных метрик | VDOT, CTL, ATL, TSB, TSS, HR Eff., 5 зон |
| Число признаков ML-модели | 16 |
| Формул в системе | VDOT (Дэниэлс), Minetti (1995), TSS, CTL/ATL, ACSM погода |
| Форматы входных данных | FIT, GPX, TCX, ZIP, manual |

---

*Документ v2.0 — финальная редакция для реализации через Claude Code*
