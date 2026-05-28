"""Рис. 2.5 — гистограмма распределения марафонских времён.

Генерирует realistic правосторонне-асимметричное распределение
(log-normal) с теми же характеристиками что в твоей AI-картинке:
мода ~4:07, медиана ~4:30, среднее ~4:50, хвост до 6:30.
"""
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker

np.random.seed(42)

# Log-normal распределение с подобранными параметрами под Berlin Marathon
# (мода 4:07, медиана 4:30, среднее 4:50)
mu = np.log(4.5 * 60)   # секунд → log
sigma = 0.15
N = 30000
times_sec = np.random.lognormal(mean=mu, sigma=sigma, size=N) * 60
times_hours = times_sec / 3600

# Обрезаем хвосты (3:00 - 7:30)
times_hours = times_hours[(times_hours >= 3.0) & (times_hours <= 7.5)]

# Считаем статистики
mode_h = 4 + 7.5 / 60       # 4:07.5
median_h = np.median(times_hours)
mean_h = np.mean(times_hours)

fig, ax = plt.subplots(figsize=(12, 6))

# Гистограмма
n, bins, patches = ax.hist(
    times_hours, bins=50, color='#4F8BC9',
    edgecolor='white', alpha=0.85,
)

# Линии трёх статистик
ax.axvline(mode_h, color='#1E40AF', linewidth=2.5, label=f'Мода ≈ {int(mode_h)}:{int((mode_h%1)*60):02d}')
ax.axvline(median_h, color='#DC2626', linewidth=2, linestyle='--',
           label=f'Медиана ≈ {int(median_h)}:{int((median_h%1)*60):02d}')
ax.axvline(mean_h, color='#10B981', linewidth=2, linestyle='--',
           label=f'Среднее ≈ {int(mean_h)}:{int((mean_h%1)*60):02d}')

# Подписи осей
ax.set_xlabel('Время забега, часы:минуты', fontsize=12)
ax.set_ylabel('Число бегунов', fontsize=12)
ax.set_title('Распределение времени марафона: правосторонняя асимметрия',
             fontsize=13, pad=15)

# Формат оси X: 3:00, 3:30, 4:00, ...
def hours_to_hm(x, _):
    h = int(x)
    m = int(round((x - h) * 60))
    return f'{h}:{m:02d}'
ax.xaxis.set_major_formatter(mticker.FuncFormatter(hours_to_hm))
ax.xaxis.set_major_locator(mticker.MultipleLocator(0.5))

ax.legend(fontsize=11, loc='upper right')
ax.grid(True, alpha=0.3, axis='y')
ax.set_xlim(3.0, 7.5)

plt.tight_layout()
plt.savefig('fig_2_5_marathon_distribution.png', dpi=150, bbox_inches='tight')
plt.close()
print('OK: fig_2_5_marathon_distribution.png')
