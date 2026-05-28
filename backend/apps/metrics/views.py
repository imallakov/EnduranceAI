from datetime import date, timedelta
from django.db.models import Avg
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import DailyMetrics
from apps.activities.models import Activity
from ml.src.formulas import vdot_to_paces, format_pace


class CurrentMetricsView(APIView):
    """GET /api/metrics/current/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        last = DailyMetrics.objects.filter(user=user).order_by('-date').first()
        paces = vdot_to_paces(float(user.current_vdot or 45)) if user.current_vdot else {}
        formatted_paces = {z: format_pace(p) for z, p in paces.items()}
        return Response({
            'vdot': float(user.current_vdot) if user.current_vdot else None,
            'ctl': float(last.ctl) if last else None,
            'atl': float(last.atl) if last else None,
            'tsb': float(last.tsb) if last else None,
            'hr_efficiency': float(last.hr_efficiency) if last and last.hr_efficiency else None,
            'training_weeks': user.training_weeks,
            'training_paces': formatted_paces,
        })


class DailyMetricsView(APIView):
    """GET /api/metrics/daily/?date_from=&date_to="""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = DailyMetrics.objects.filter(user=request.user).order_by('date')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        data = list(qs.values('date', 'ctl', 'atl', 'tsb', 'vdot_rolling'))
        return Response(data)


class VdotHistoryView(APIView):
    """GET /api/metrics/vdot-history/ — last 26 weeks"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cutoff = date.today() - timedelta(weeks=26)
        activities = (Activity.objects
                      .filter(user=request.user, is_valid=True,
                              start_time__date__gte=cutoff,
                              vdot_estimate__isnull=False)
                      .order_by('start_time'))
        # Group by ISO week
        weeks: dict = {}
        for act in activities:
            iso = act.start_time.isocalendar()
            key = f"{iso[0]}-W{iso[1]:02d}"
            v = float(act.vdot_estimate)
            if key not in weeks or v > weeks[key]['vdot']:
                weeks[key] = {'week': key, 'vdot': round(v, 2)}
        return Response(sorted(weeks.values(), key=lambda x: x['week']))


class HREfficiencyView(APIView):
    """GET /api/metrics/hr-efficiency/ — weekly rolling avg"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cutoff = date.today() - timedelta(weeks=26)
        activities = (Activity.objects
                      .filter(user=request.user, is_valid=True,
                              start_time__date__gte=cutoff,
                              avg_hr__isnull=False,
                              avg_pace_sec_per_km__isnull=False)
                      .order_by('start_time'))
        weeks: dict = {}
        for act in activities:
            iso = act.start_time.isocalendar()
            key = f"{iso[0]}-W{iso[1]:02d}"
            eff = float(act.avg_pace_sec_per_km) / float(act.avg_hr)
            if key not in weeks:
                weeks[key] = []
            weeks[key].append(eff)
        result = [
            {'week': k, 'efficiency': round(sum(v) / len(v), 4)}
            for k, v in sorted(weeks.items())
        ]
        return Response(result)


class ZonesDistributionView(APIView):
    """GET /api/metrics/zones-dist/?weeks=8"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        weeks = int(request.query_params.get('weeks', 8))
        cutoff = date.today() - timedelta(weeks=weeks)
        activities = Activity.objects.filter(
            user=request.user, is_valid=True, start_time__date__gte=cutoff
        )
        totals = {'E': 0, 'M': 0, 'T': 0, 'I': 0, 'R': 0}
        for act in activities:
            for zone, secs in (act.hr_zones_sec or {}).items():
                if zone in totals:
                    totals[zone] += secs
        grand_total = sum(totals.values()) or 1
        return Response({z: round(s / grand_total * 100, 1) for z, s in totals.items()})
