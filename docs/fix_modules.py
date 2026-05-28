# Корректировка имён модулей в create_vkr.js под реальную структуру backend
import re

# table name replacements (имя таблицы в кавычках)
table_renames = {
    'accounts_user': 'users_user',
    'marathons_marathon': 'races_marathon',
    'predictions_prediction': 'races_prediction',
    'strava_stravatoken': 'integrations_stravaconnection',
    'plans_trainingplan': 'plans_trainingplan',  # без изменений
    'plans_planweek': 'plans_planweek',
    'plans_planworkout': 'plans_planworkout',
    'analytics_dailymetric': 'metrics_dailymetric',
    'activities_activity': 'activities_activity',
    'activities_stream': 'activities_stream',
    'legal_policy / legal_consent': 'legal_policy / legal_consent',
}

# текстовые замены упоминаний в обычной прозе (модули Django)
text_replacements = [
    ('apps/accounts/', 'apps/users/'),
    ('apps/marathons/', 'apps/races/'),
    ('apps/predictions/', 'apps/races/'),
    ('apps/strava/', 'apps/integrations/'),
    # ml_model.py не существует — у нас predict.py + train.py в ml/src/
    ('predictions/ml_model.py', 'ml/src/predict.py'),
    # модуль strava → integrations
    ('Модуль strava ', 'Модуль integrations '),
    ('модуля strava', 'модуля integrations'),
    # accounts → users
    ('accounts (', 'users ('),
    # marathons / predictions объединены в races
    # 'marathons (' и 'predictions (' уже обработаны выше в большой строке
    # Strava как название модуля
    ('strava (', 'integrations ('),
]

with open('create_vkr.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Применяем table renames
for old, new in table_renames.items():
    if old != new:
        text = text.replace(f"'{old}'", f"'{new}'")

# Применяем текстовые замены
for old, new in text_replacements:
    text = text.replace(old, new)

with open('create_vkr.js', 'w', encoding='utf-8') as f:
    f.write(text)

print("done")
