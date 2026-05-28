# Аудит реализации EnduranceAI — Этапы 1 и 2

## Общая оценка: ✅ Отлично

Claude Sonnet сделал серьёзную работу. Этапы 1 и 2 реализованы полностью, плюс **забежали вперёд** — plans и dashboard тоже готовы.

---

## Покрытие ТЗ

### Этап 1 — Backend: фундамент и парсинг

| Пункт | Статус | Комментарий |
|---|---|---|
| Django project setup | ✅ | `config/` с settings/base/development/production |
| 6 приложений | ✅ | users, activities, metrics, races, plans, dashboard |
| Модели из раздела 5 | ✅ | User, Activity, DailyMetrics, Marathon, MarathonResult, Prediction, TrainingPlan |
| JWT auth | ✅ | register, login, refresh, logout, profile, change-password, delete-account |
| FIT парсер | ✅ | `fitparse`, sport_type filter, semicircles conversion, laps, HR zones |
| GPX/TCX парсер | ✅ | `gpxpy`, haversine distance, elevation gain/loss, auto-generated km laps |
| Валидация входных данных | ✅ | `validate_activity_data()` — distance, duration, HR range, elevation |
| Upload + Celery + polling | ✅ | `process_activity_file.delay()` + `upload-status/{task_id}/` |
| Manual activity | ✅ | POST endpoint с расчётом avg_pace |
| Unit-тесты парсеров | ⚠️ | **Не найдены** — нет `tests.py` или `tests/` ни в одном app |

### Этап 2 — Метрики и ML

| Пункт | Статус | Комментарий |
|---|---|---|
| `calc_vdot()` | ✅ | Формула Дэниэлса, корректная |
| `calc_tss()` | ✅ | hrTSS с fallback на pace-based |
| `daniels_equivalent_time()` | ✅ | Бисекция, 100 итераций |
| Таблица Дэниэлса + интерполяция | ✅ | `DANIELS_TABLE` от 30 до 70, `vdot_to_paces()` |
| CTL/ATL/TSB (EMA) | ✅ | `update_ctl_atl()` с `math.exp(-1/42)` и `math.exp(-1/7)` |
| Celery recalculate | ✅ | Полный пересчёт от первой активности до сегодня |
| DailyMetrics bulk_create | ✅ | С удалением старых + bulk insert |
| Race Readiness Score | ✅ | 5 компонентов с весами |
| `compute_course_difficulty()` | ✅ | Minetti model из GPX, fallback на routes |
| `compute_weather_index()` | ✅ | Единая функция ACSM |
| Kaggle → train.py | ✅ | 5 загрузчиков, очистка, Ridge + XGBoost, 5-fold CV |
| `predict_finish_time()` | ✅ | Гибридный пайплайн: Дэниэлс → рельеф → погода → ML |
| Prediction API | ✅ | POST + GET list + GET latest + GET detail |
| Формулы тесты | ⚠️ | **Не найдены** |

### Бонус — уже реализованы из Этапа 3

| Пункт | Статус |
|---|---|
| 40+ марафонов (import_marathons) | ✅ 34 марафона |
| Training plan generator (4 фазы Дэниэлса) | ✅ |
| Dashboard API (агрегирующий endpoint) | ✅ |
| Plans CRUD + export PDF/CSV | ✅ |
| drf-spectacular (Swagger) | ✅ |

---

## Найденные проблемы

### 🔴 Критические (нужно исправить)

#### 1. `recalculate_user_metrics` — баг с TSS при повторном вызове
**Файл:** [tasks.py](file:///e:/AntiGravityProjects/EnduranceAI/backend/apps/activities/tasks.py#L119-L136)

```python
# Строка 129: act.tss обновляется через UPDATE, но...
Activity.objects.filter(id=act.id).update(vdot_estimate=vdot, tss=tss)

# Строка 135: ...здесь читается act.tss который ещё OLD (из памяти, не из БД!)
daily_tss[day] = daily_tss.get(day, 0) + float(act.tss or 0)
```

**Проблема:** После `.update()` объект `act` в памяти всё ещё содержит старый `act.tss`. `daily_tss` строится из устаревших данных → CTL/ATL/TSB будет неверным при первом запуске (tss = None → 0).

**Исправление:** Использовать вычисленный `tss` вместо `act.tss`:
```python
daily_tss[day] = daily_tss.get(day, 0) + tss  # не act.tss!
```

#### 2. `file_hash` не уникален на уровне пользователя (но нет constraint)
**Файл:** [models.py](file:///e:/AntiGravityProjects/EnduranceAI/backend/apps/activities/models.py#L12)

В ТЗ мы обсуждали что `file_hash UNIQUE` ломает мультипользовательский сценарий. Сейчас уникальность проверяется в коде (`Activity.objects.filter(user=request.user, file_hash=...)`) — это правильно. Но стоит добавить DB constraint `unique_together = [('user', 'file_hash')]` для надёжности.

### 🟡 Средние (желательно исправить)

#### 3. Race Readiness — захардкоженные `long_runs_completed_pct=0.7`, `avg_weekly_km=0`
**Файлы:** [races/views.py:168](file:///e:/AntiGravityProjects/EnduranceAI/backend/apps/races/views.py#L168), [dashboard/views.py:55](file:///e:/AntiGravityProjects/EnduranceAI/backend/apps/dashboard/views.py#L55)

Три параметра Race Readiness всегда захардкожены: `long_runs_completed_pct=0.7`, `vdot_delta_6w=0`, `avg_weekly_km=0`. Это значит скор никогда не будет точным. Нужно вычислять из реальных данных:
- `avg_weekly_km` — из Activity за 8 недель (уже считается в dashboard)
- `vdot_delta_6w` — разница VDOT 6 недель назад vs сейчас
- `long_runs_completed_pct` — доля длинных пробежек ≥20 км

#### 4. `predict.py` — `avg_weekly_km_8w` и `training_consistency` всегда 0
**Файл:** [predict.py:79-80](file:///e:/AntiGravityProjects/EnduranceAI/backend/ml/src/predict.py#L79-L80)

```python
'avg_weekly_km_8w': 0,         # ← всегда 0
'training_consistency': 0,     # ← всегда 0
```

Эти USER_FEATURES никогда не заполняются реальными данными, хотя модель обучена на 5 Kaggle + 5 user features. Для demographics-only это ок, но при `has_full_data=True` нужно вычислять из Activity.

#### 5. Нет тестов
Ни одного `tests.py` во всём проекте. Для ВКР стоит написать хотя бы:
- Unit-тесты формул (`calc_vdot`, `calc_tss`, `daniels_equivalent_time`)
- API тесты: register → login → upload → predict
- Тест валидации (невалидный файл, слишком короткая активность)

### 🟢 Мелочи

#### 6. TCX парсер — `gpxpy` не парсит TCX
**Файл:** [gpx_parser.py:130-147](file:///e:/AntiGravityProjects/EnduranceAI/backend/apps/activities/parsers/gpx_parser.py#L130-L147)

`parse_tcx()` использует `gpxpy.parse()` для TCX — но **gpxpy не поддерживает TCX формат**. Это упадёт с ошибкой или распарсит пустой результат. Нужен отдельный TCX-парсер (через `lxml` или `tcxparser`). Или убрать TCX из поддерживаемых форматов.

#### 7. `training_weeks` считается неточно
**Файл:** [tasks.py:172](file:///e:/AntiGravityProjects/EnduranceAI/backend/apps/activities/tasks.py#L172)

```python
training_weeks = len(set(a.start_time.isocalendar()[:2] for a in activities))
```

`isocalendar()` возвращает `(year, week, weekday)`. `[:2]` берёт `(year, week)` — это корректно для подсчёта уникальных недель, но считает **все** недели за всю историю, а не последовательные. Если человек бегал в 2020 и 2026 — покажет ≥8 недель хотя последние 2 года не тренировался.

#### 8. Berlin weather CSV — не все колонки могут совпасть
В `load_berlin()` читается `AVG_TEMP_C` — нужно проверить что в реальном CSV именно такое имя колонки.

---

## Структура проекта — чисто ✅

```
backend/
├── config/settings/{base,development,production}.py   ✅
├── apps/
│   ├── users/       (User, JWT auth, profile)          ✅
│   ├── activities/  (Activity, parsers, upload, tasks) ✅
│   ├── metrics/     (DailyMetrics, VDOT/CTL/ATL views) ✅
│   ├── races/       (Marathon, Prediction, import cmd)  ✅
│   ├── plans/       (generator, export, CRUD)           ✅ (бонус)
│   └── dashboard/   (aggregating endpoint)              ✅ (бонус)
├── ml/
│   ├── src/{formulas,minetti,weather,predict,train}.py  ✅
│   ├── models/{ridge_v1,xgb_v1}.joblib                 ✅
│   └── data/kaggle/                                     ✅
└── data/gpx/                                            ✅
```

---

## Что осталось (Этап 3-4)

- [ ] Frontend (React + Vite + Tailwind)
- [ ] **Тесты** — минимальный набор для защиты
- [ ] TCX парсер — заменить или убрать
- [ ] Fix баг с `daily_tss` (задача #1 выше)
- [ ] Деплой на VPS

---

## Резюме

| Аспект | Оценка |
|---|---|
| Архитектура | ⭐⭐⭐⭐⭐ Чистая, соответствует ТЗ |
| Формулы | ⭐⭐⭐⭐⭐ Все корректные, с fallbacks |
| ML пайплайн | ⭐⭐⭐⭐⭐ Честный, без синтетики, 5 загрузчиков |
| API endpoints | ⭐⭐⭐⭐⭐ Все из ТЗ + Swagger |
| Парсеры | ⭐⭐⭐⭐ FIT и GPX отличные, TCX сломан |
| Тесты | ⭐ Нет ни одного |
| Баги | 1 критический (daily_tss), 2 средних |

**Итого: 8.5/10** — для ВКР более чем достаточно, но перед защитой нужно исправить баг #1 и написать хотя бы базовые тесты.
