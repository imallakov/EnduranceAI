# Перенумерация библиографических ссылок в create_vkr.js
# Старые номера (как сейчас стоят в тексте) → новые (соответствующие отсортированному списку)
import re

mapping = {
    1: 19,    # ACSM Position Stand
    2: 22,    # Chen & Guestrin XGBoost
    3: 24,    # Daniels Running Formula (англ)
    # 8 остаётся 8 (Дэниелс перевод)
    9: 25,    # Ely weather marathon
    10: 26,   # Fielding REST dissertation
    11: 23,   # Coggan & Allen book
    12: 29,   # Minetti energy cost
    # 13 остаётся 13 (Носов про датасеты)
    15: 38,   # Strava user statistics → Strava Year in Sport
    16: 37,   # Strava API documentation
    # 19 остаётся 19 (ACSM — в Главе 2 уже мог быть правильным)
    # 21 остаётся 21 (Bompa)
    22: 28,   # упоминания "архитектуры [22, 24]" → Fowler
    24: 23,   # парная ссылка [22, 24] → [28, 23]
    25: 35,   # Runalyze
    27: 31,   # Seiler 80/20
    29: 38,   # World Marathon Majors → Strava Year in Sport
    30: 36,   # Statista
    31: 36,   # Independent review → Statista
    # 33 остаётся 33 (Berlin Kaggle)
    34: 32,   # Smyth machine learning marathon
    37: 36,   # TrainingPeaks pricing → Statista (market info)
}

# Читаем
with open('create_vkr.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Разделяем текст: до СПИСОКА ИСТОЧНИКОВ — перенумеровываем; после — нет
marker = "// =========================================================\n//        С П И С О К"
idx = text.find(marker)
if idx == -1:
    # альтернативный маркер
    idx = text.find("structHeading('СПИСОК ИСПОЛЬЗОВАННЫХ ИСТОЧНИКОВ')")
    if idx == -1:
        raise ValueError("Не найден маркер списка источников")
    # отступаем назад чтобы захватить весь блок sources
    # ищем начало const sources
    idx = text.rfind("const sources", 0, idx)

before = text[:idx]
after = text[idx:]

# Этап 1: заменяем старые номера на маркеры __ZZ_N__ (где N — новое значение)
# чтобы избежать конфликтов при пересекающихся диапазонах
def replace_refs(text, mapping):
    # Сначала помещаем маркеры
    for old, new in sorted(mapping.items(), key=lambda x: -x[0]):  # сначала большие
        # пары вида [N] (с любым закрытием — `]`, `,`, ` `)
        # шаблон: \[OLD(?=[,\s\]])
        pattern = r'\[' + str(old) + r'(?=[,\s\]])'
        replacement = '[__ZZ' + str(new) + '__'
        text = re.sub(pattern, replacement, text)

    # Этап 2: маркеры → финальные числа
    text = re.sub(r'__ZZ(\d+)__', r'\1', text)
    return text

before = replace_refs(before, mapping)

# Собираем обратно
result = before + after

# Пишем
with open('create_vkr.js', 'w', encoding='utf-8') as f:
    f.write(result)

# Статистика
import collections
all_refs = re.findall(r'\[(\d+)(?:[,\s])', before)
counter = collections.Counter(int(r) for r in all_refs)
print(f"Изменения применены. Распределение ссылок в тексте (до списка источников):")
for num in sorted(counter.keys()):
    print(f"  [{num}]: {counter[num]} раз")
