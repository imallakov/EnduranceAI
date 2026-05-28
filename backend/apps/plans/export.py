"""PDF and CSV export for training plans."""
import csv
import io

DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

WORKOUT_RU = {
    'easy': 'Лёгкий', 'tempo': 'Темповый', 'interval': 'Интервалы',
    'repetition': 'Ускорения', 'long': 'Длинная', 'marathon_pace': 'Марафонский темп',
    'rest': 'Отдых',
}


def _fmt_pace(sec):
    if not sec:
        return ''
    return f"{sec // 60}:{sec % 60:02d}/км"


def export_plan_csv(plan) -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Неделя', 'Фаза', 'День', 'Тип', 'Дистанция, км', 'Темп мин', 'Темп макс'])

    for week in plan.weeks.prefetch_related('workouts').all():
        for wo in week.workouts.all():
            writer.writerow([
                week.week_number,
                week.phase,
                DAY_NAMES[wo.day_of_week] if wo.day_of_week is not None else '',
                WORKOUT_RU.get(wo.workout_type, wo.workout_type),
                wo.distance_km or '',
                _fmt_pace(wo.pace_min_sec),
                _fmt_pace(wo.pace_max_sec),
            ])

    return output.getvalue()


def export_plan_pdf(plan) -> bytes:
    """Generate PDF using ReportLab."""
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib.units import cm

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4,
                             leftMargin=1.5 * cm, rightMargin=1.5 * cm,
                             topMargin=2 * cm, bottomMargin=2 * cm)
    styles = getSampleStyleSheet()
    elements = []

    title = Paragraph(
        f"Тренировочный план — старт {plan.race_date}",
        styles['Title']
    )
    elements.append(title)
    elements.append(Spacer(1, 0.5 * cm))

    info = Paragraph(
        f"VDOT при создании: {plan.vdot_at_creation} · "
        f"Дней в неделю: {plan.days_per_week} · "
        f"Всего недель: {plan.weeks.count()}",
        styles['Normal']
    )
    elements.append(info)
    elements.append(Spacer(1, 1 * cm))

    header = ['Нед.', 'Фаза', 'День', 'Тип тренировки', 'Км', 'Темп']
    data = [header]

    for week in plan.weeks.prefetch_related('workouts').all():
        for wo in week.workouts.all():
            pace = _fmt_pace(wo.pace_min_sec)
            if wo.pace_max_sec:
                pace += f"–{_fmt_pace(wo.pace_max_sec)}"
            data.append([
                week.week_number,
                week.get_phase_display(),
                DAY_NAMES[wo.day_of_week] if wo.day_of_week is not None else '',
                WORKOUT_RU.get(wo.workout_type, wo.workout_type),
                str(wo.distance_km) if wo.distance_km else '—',
                pace or '—',
            ])

    table = Table(data, colWidths=[1.2 * cm, 3.5 * cm, 1.2 * cm, 5 * cm, 1.5 * cm, 4 * cm])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a56db')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f3f4f6')]),
        ('GRID', (0, 0), (-1, -1), 0.3, colors.HexColor('#d1d5db')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    elements.append(table)

    doc.build(elements)
    return buffer.getvalue()
