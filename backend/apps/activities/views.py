import hashlib
import logging
from django.utils.dateparse import parse_date
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from celery.result import AsyncResult

from .models import Activity
from .serializers import ActivityListSerializer, ActivityDetailSerializer, ManualActivitySerializer
from .tasks import process_activity_file, process_zip_file

logger = logging.getLogger(__name__)


def _trigger_recalculate(user_id: str):
    """Try to dispatch Celery task; fall back to synchronous execution if broker unavailable."""
    from .tasks import recalculate_user_metrics
    try:
        recalculate_user_metrics.delay(user_id)
    except Exception:
        logger.warning("Celery broker unavailable — running recalculate synchronously")
        recalculate_user_metrics(user_id)

MAX_FILE_SIZE = 50 * 1024 * 1024      # 50 MB
MAX_ZIP_SIZE = 200 * 1024 * 1024      # 200 MB
ALLOWED_EXTENSIONS = {'.fit', '.gpx', '.tcx'}


class ActivityListView(generics.ListAPIView):
    """GET /api/activities/"""
    serializer_class = ActivityListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Use raw timestamp comparison instead of __date lookup. The __date
        # lookup forces PostgreSQL to cast start_time::date for every row,
        # which bypasses the timestamptz index on start_time and degenerates
        # to a sequential scan. Building boundary datetimes preserves the
        # index lookup (range scan on a B-tree index).
        from datetime import datetime, time, timedelta, timezone as tz
        qs = Activity.objects.filter(user=self.request.user)
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        min_km = self.request.query_params.get('min_km')
        if date_from:
            d = parse_date(date_from)
            if d:
                qs = qs.filter(start_time__gte=datetime.combine(d, time.min, tzinfo=tz.utc))
        if date_to:
            d = parse_date(date_to)
            if d:
                # End-of-day boundary: use start of NEXT day with strict < so
                # we include the whole `date_to` day without timezone surprises.
                next_day = d + timedelta(days=1)
                qs = qs.filter(start_time__lt=datetime.combine(next_day, time.min, tzinfo=tz.utc))
        if min_km:
            qs = qs.filter(distance_km__gte=float(min_km))
        return qs


class ActivityStatsView(APIView):
    """GET /api/activities/stats/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.db.models import Sum, Avg, Count
        qs = Activity.objects.filter(user=request.user, is_valid=True)
        agg = qs.aggregate(
            total_km=Sum('distance_km'),
            total_activities=Count('id'),
            avg_pace=Avg('avg_pace_sec_per_km'),
        )
        return Response({
            'total_km': round(float(agg['total_km'] or 0), 1),
            'total_activities': agg['total_activities'],
            'avg_pace_sec_per_km': round(float(agg['avg_pace'] or 0), 1),
        })


class ActivityUploadView(APIView):
    """POST /api/activities/upload/ — single FIT/GPX/TCX file."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        import os
        f = request.FILES.get('file')
        if not f:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

        ext = os.path.splitext(f.name)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            return Response({'error': f'Unsupported file type: {ext}'}, status=400)

        file_bytes = f.read()
        if len(file_bytes) > MAX_FILE_SIZE:
            return Response({'error': 'File too large (max 50 MB)'}, status=400)

        file_hash = hashlib.sha256(file_bytes).hexdigest()
        if Activity.objects.filter(user=request.user, file_hash=file_hash).exists():
            return Response(
                {'warning': 'Duplicate file, already imported', 'duplicate': True},
                status=status.HTTP_200_OK
            )

        try:
            task = process_activity_file.delay(
                str(request.user.id), file_bytes.hex(), f.name, file_hash
            )
        except Exception:
            return Response(
                {'error': 'Background processing unavailable. Start Redis + Celery worker, or use /activities/manual/ for manual entry.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        return Response({'task_id': task.id}, status=status.HTTP_202_ACCEPTED)


class ActivityUploadZipView(APIView):
    """POST /api/activities/upload-zip/"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        f = request.FILES.get('file')
        if not f:
            return Response({'error': 'No file provided'}, status=400)
        file_bytes = f.read()
        if len(file_bytes) > MAX_ZIP_SIZE:
            return Response({'error': 'ZIP too large (max 200 MB)'}, status=400)
        try:
            task = process_zip_file.delay(str(request.user.id), file_bytes.hex())
        except Exception:
            return Response(
                {'error': 'Background processing unavailable. Start Redis + Celery worker.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        return Response({'task_id': task.id}, status=status.HTTP_202_ACCEPTED)


class UploadStatusView(APIView):
    """GET /api/activities/upload-status/{task_id}/"""
    permission_classes = [IsAuthenticated]

    def get(self, request, task_id):
        result = AsyncResult(task_id)
        response = {'status': result.status}
        if result.ready():
            response['result'] = result.result
        return Response(response)


class ManualActivityView(APIView):
    """POST /api/activities/manual/"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        ser = ManualActivitySerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        import datetime
        start_time = datetime.datetime.combine(d['date'], datetime.time.min, tzinfo=datetime.timezone.utc)
        distance_km = d['distance_km']
        duration_sec = d['duration_sec']
        avg_pace = duration_sec / distance_km if distance_km else None

        activity = Activity.objects.create(
            user=request.user,
            start_time=start_time,
            distance_km=distance_km,
            duration_sec=duration_sec,
            avg_pace_sec_per_km=avg_pace,
            avg_hr=d.get('avg_hr'),
            elevation_gain_m=d.get('elevation_gain_m'),
            source='manual',
            is_valid=True,
        )

        _trigger_recalculate(str(request.user.id))

        return Response(ActivityDetailSerializer(activity).data, status=status.HTTP_201_CREATED)


class ActivityDetailView(generics.RetrieveDestroyAPIView):
    """GET/DELETE /api/activities/{id}/"""
    serializer_class = ActivityDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Activity.objects.filter(user=self.request.user)

    def perform_destroy(self, instance):
        # Drop the row first, then trigger metrics recalc so dashboard
        # (VDOT, CTL/ATL/TSB) and plan paces reflect reality. Done as
        # delay() so the DELETE response isn't blocked on the recalc.
        user_id = str(instance.user_id)
        instance.delete()
        from apps.activities.tasks import recalculate_user_metrics
        try:
            recalculate_user_metrics.delay(user_id)
        except Exception:
            # Celery down — fall back to inline so dashboard still updates
            recalculate_user_metrics(user_id)


class ActivityMapView(APIView):
    """GET /api/activities/{id}/map/ → GeoJSON LineString"""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        import polyline as _polyline
        try:
            act = Activity.objects.get(id=pk, user=request.user)
        except Activity.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)

        if not act.polyline:
            return Response({'error': 'No GPS data'}, status=404)

        coords = _polyline.decode(act.polyline)
        return Response({
            'type': 'Feature',
            'geometry': {
                'type': 'LineString',
                'coordinates': [[lon, lat] for lat, lon in coords],
            },
            'properties': {'activity_id': str(act.id)},
        })
