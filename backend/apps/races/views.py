import os
import re
from datetime import date, timedelta, datetime
from decimal import Decimal

from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Max, Sum, Q, Count
from django.conf import settings

from .models import Marathon, MarathonResult, Prediction
from .serializers import (
    MarathonSerializer, MarathonResultSerializer,
    PredictionSerializer, PredictionRequestSerializer,
)


def compute_readiness_inputs(user):
    """Return real computed inputs for race_readiness_score()."""
    from apps.activities.models import Activity

    eight_weeks_ago = date.today() - timedelta(weeks=8)
    six_weeks_ago = date.today() - timedelta(weeks=6)
    sixteen_weeks_ago = date.today() - timedelta(weeks=16)

    avg_weekly_km = float(
        Activity.objects.filter(user=user, is_valid=True, start_time__date__gte=eight_weeks_ago)
        .aggregate(s=Sum('distance_km'))['s'] or 0
    ) / 8

    vdot_6w_ago = (
        Activity.objects
        .filter(user=user, is_valid=True, distance_km__gte=5,
                start_time__date__lt=six_weeks_ago,
                start_time__date__gte=sixteen_weeks_ago)
        .aggregate(best=Max('vdot_estimate'))['best']
    )
    vdot_now = float(user.current_vdot or 0)
    vdot_delta_6w = vdot_now - float(vdot_6w_ago) if vdot_6w_ago else 0.0

    long_runs = Activity.objects.filter(
        user=user, is_valid=True,
        distance_km__gte=18,
        start_time__date__gte=sixteen_weeks_ago,
    ).count()
    long_runs_completed_pct = min(1.0, long_runs / 12)

    return avg_weekly_km, vdot_delta_6w, long_runs_completed_pct


class MarathonListView(generics.ListAPIView):
    """GET /api/marathons/

    Paginated (uses global OverridablePagination — default page_size=20,
    client can request up to 500 via ?page_size=N). Frontend already
    expects Paginated<T> wrapper. Pagination kept for future growth
    (1000+ user-uploaded custom routes, race series etc.).
    """
    serializer_class = MarathonSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Annotate results_count to avoid N+1 from serializer's get_results_count/
        # get_has_historical_data (otherwise: 2 extra SQL per marathon row).
        qs = Marathon.objects.filter(
            Q(is_custom=False) | Q(created_by=self.request.user)
        ).annotate(_results_count=Count('results'))
        country = self.request.query_params.get('country')
        max_diff = self.request.query_params.get('max_difficulty')
        search = self.request.query_params.get('search')
        if country:
            qs = qs.filter(country__iexact=country)
        if max_diff:
            qs = qs.filter(difficulty_coefficient__lte=float(max_diff))
        if search:
            qs = qs.filter(name__icontains=search)
        return qs


class MarathonPreviewView(APIView):
    """POST /api/marathons/preview/ — parse GPX and return analysis without saving."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        gpx_file = request.FILES.get('file')
        if not gpx_file:
            return Response({'error': 'No file provided'}, status=400)
        if gpx_file.size > 10 * 1024 * 1024:
            return Response({'error': 'File too large (max 10 MB)'}, status=400)

        file_bytes = gpx_file.read()

        try:
            import gpxpy
            gpx = gpxpy.parse(file_bytes.decode('utf-8', errors='replace'))
        except Exception as e:
            return Response({'error': f'Cannot parse GPX file: {e}'}, status=400)

        # Extract raw points for difficulty computation
        points_for_diff = []
        for track in gpx.tracks:
            for segment in track.segments:
                for p in segment.points:
                    points_for_diff.append((p.latitude, p.longitude, p.elevation or 0))

        if not points_for_diff:
            return Response({'error': 'No GPS points found in file'}, status=400)

        from apps.activities.parsers.gpx_parser import _parse_gpx_obj
        data = _parse_gpx_obj(gpx)
        if not data:
            return Response({'error': 'No tracks found in GPX file'}, status=400)

        distance_km = data.get('distance_km', 0)
        if distance_km < 0.1:
            return Response({'error': 'GPX too short'}, status=400)

        from ml.src.minetti import compute_course_difficulty_from_points
        difficulty_coefficient = compute_course_difficulty_from_points(points_for_diff)

        elevation_profile = [
            {'km': lap['lap'], 'elevation_m': lap['avg_elevation_m']}
            for lap in data.get('laps', [])
            if lap.get('avg_elevation_m') is not None
        ]

        first = points_for_diff[0]
        return Response({
            'distance_km': distance_km,
            'elevation_gain_m': data.get('elevation_gain_m'),
            'elevation_loss_m': data.get('elevation_loss_m'),
            'elevation_profile': elevation_profile,
            'difficulty_coefficient': difficulty_coefficient,
            'polyline': data.get('polyline', ''),
            'start_lat': first[0],
            'start_lon': first[1],
        })


class MarathonCustomCreateView(APIView):
    """POST /api/marathons/custom/ — save GPX, create custom Marathon record."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        gpx_file = request.FILES.get('gpx_file')
        if not gpx_file:
            return Response({'error': 'No GPX file provided'}, status=400)
        if gpx_file.size > 10 * 1024 * 1024:
            return Response({'error': 'File too large (max 10 MB)'}, status=400)

        name = request.data.get('name', '').strip()
        if not name:
            return Response({'error': 'Name is required'}, status=400)

        city = request.data.get('city', '').strip()
        country_raw = request.data.get('country', '').strip()
        country = country_raw[:2].upper() if country_raw else ''
        race_date_str = request.data.get('race_date', '').strip()

        file_bytes = gpx_file.read()

        try:
            import gpxpy
            gpx = gpxpy.parse(file_bytes.decode('utf-8', errors='replace'))
        except Exception as e:
            return Response({'error': f'Cannot parse GPX file: {e}'}, status=400)

        points_for_diff = []
        for track in gpx.tracks:
            for segment in track.segments:
                for p in segment.points:
                    points_for_diff.append((p.latitude, p.longitude, p.elevation or 0))

        if not points_for_diff:
            return Response({'error': 'No GPS points found in file'}, status=400)

        from apps.activities.parsers.gpx_parser import _parse_gpx_obj
        data = _parse_gpx_obj(gpx)
        if not data:
            return Response({'error': 'No tracks found in GPX file'}, status=400)

        distance_km = data.get('distance_km', 0)
        if distance_km < 0.1:
            return Response({'error': 'GPX too short'}, status=400)

        from ml.src.minetti import compute_course_difficulty_from_points
        difficulty_coefficient = compute_course_difficulty_from_points(points_for_diff)

        # Persist GPX file
        safe_name = re.sub(r'[^\w\-.]', '_', gpx_file.name)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        gpx_dir = os.path.join(settings.BASE_DIR, 'data', 'gpx', 'custom', str(request.user.id))
        os.makedirs(gpx_dir, exist_ok=True)
        gpx_path = os.path.join(gpx_dir, f'{timestamp}_{safe_name}')
        with open(gpx_path, 'wb') as fh:
            fh.write(file_bytes)

        race_date = None
        if race_date_str:
            try:
                race_date = date.fromisoformat(race_date_str)
            except ValueError:
                pass

        first = points_for_diff[0]
        gain = data.get('elevation_gain_m')
        loss = data.get('elevation_loss_m')

        marathon = Marathon.objects.create(
            name=name,
            city=city,
            country=country,
            distance_km=Decimal(str(round(distance_km, 3))),
            elevation_gain_m=Decimal(str(round(gain, 1))) if gain is not None else None,
            elevation_loss_m=Decimal(str(round(loss, 1))) if loss is not None else None,
            difficulty_coefficient=Decimal(str(round(difficulty_coefficient, 4))),
            gpx_file_path=gpx_path,
            polyline=data.get('polyline', ''),
            start_lat=Decimal(str(round(first[0], 7))),
            start_lon=Decimal(str(round(first[1], 7))),
            is_custom=True,
            major=False,
            created_by=request.user,
        )

        return Response(MarathonSerializer(marathon).data, status=201)


class MarathonDetailView(generics.RetrieveAPIView):
    """GET /api/marathons/{id}/"""
    serializer_class = MarathonSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Annotate so serializer's get_results_count uses the cached value
        # instead of issuing a second COUNT(*) query.
        return Marathon.objects.filter(
            Q(is_custom=False) | Q(created_by=self.request.user)
        ).annotate(_results_count=Count('results'))


class MarathonResultsView(generics.ListAPIView):
    """GET /api/marathons/{id}/results/"""
    serializer_class = MarathonResultSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = MarathonResult.objects.filter(
            Q(marathon__is_custom=False) | Q(marathon__created_by=self.request.user),
            marathon_id=self.kwargs['pk']
        )
        year = self.request.query_params.get('year')
        age_group = self.request.query_params.get('age_group')
        sex = self.request.query_params.get('sex')
        if year:
            qs = qs.filter(year=int(year))
        if age_group:
            qs = qs.filter(age_group=age_group)
        if sex:
            qs = qs.filter(sex=sex)
        return qs.order_by('finish_time_sec')[:500]


class MarathonWeatherView(APIView):
    """GET /api/marathons/{pk}/weather/"""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            marathon = Marathon.objects.get(
                Q(is_custom=False) | Q(created_by=request.user),
                pk=pk
            )
        except Marathon.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)
        return Response({'avg_temp_by_month': marathon.avg_temp_by_month})


class PredictionListView(generics.ListAPIView):
    """GET /api/predictions/"""
    serializer_class = PredictionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Prediction.objects.filter(user=self.request.user)


class PredictionLatestView(APIView):
    """GET /api/predictions/latest/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        pred = Prediction.objects.filter(user=request.user).first()
        if not pred:
            return Response({'detail': 'No predictions yet'}, status=404)
        return Response(PredictionSerializer(pred).data)


class PredictionDetailView(generics.RetrieveAPIView):
    """GET /api/predictions/{id}/"""
    serializer_class = PredictionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Prediction.objects.filter(user=self.request.user)


class PredictionCreateView(APIView):
    """POST /api/predictions/"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        ser = PredictionRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        user = request.user
        if not user.current_vdot:
            return Response(
                {'error': 'No VDOT calculated yet. Upload at least one training activity first.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        marathon = None
        if d.get('marathon_id'):
            try:
                marathon = Marathon.objects.get(
                    Q(is_custom=False) | Q(created_by=request.user),
                    id=d['marathon_id']
                )
            except Marathon.DoesNotExist:
                return Response({'error': 'Marathon not found'}, status=404)
        else:
            # Create a virtual marathon for the requested distance
            from decimal import Decimal
            marathon = Marathon(
                name='Custom',
                distance_km=Decimal(str(d.get('distance_km', 42.195))),
                difficulty_coefficient=Decimal('1.0'),
            )

        # Determine weather
        temp_c = d.get('temp_c')
        humidity_pct = d.get('humidity_pct', 60.0)
        wind_ms = d.get('wind_ms', 0.0)

        race_date = d.get('race_date')
        if temp_c is None and marathon.start_lat and race_date:
            from ml.src.weather import fetch_weather
            days_to_race = (race_date - date.today()).days
            if days_to_race <= 5:
                weather = fetch_weather(float(marathon.start_lat), float(marathon.start_lon))
                if weather:
                    temp_c = weather['temp_c']
                    humidity_pct = weather.get('humidity_pct', 60.0)
                    wind_ms = weather.get('wind_ms', 0.0)

        if temp_c is None and race_date and marathon.avg_temp_by_month:
            temp_c = marathon.get_avg_temp(race_date.month)

        if temp_c is None:
            temp_c = 15.0

        from ml.src.predict import predict_finish_time
        from ml.src.formulas import race_readiness_score as calc_readiness

        result = predict_finish_time(user, marathon, race_date, temp_c, humidity_pct, wind_ms)

        # Race readiness
        readiness = None
        if (user.current_tsb is not None and user.training_weeks >= 4):
            from apps.activities.models import Activity
            ninety_ago = date.today() - timedelta(days=90)
            recent = Activity.objects.filter(user=user, is_valid=True, start_time__date__gte=ninety_ago)
            weeks_with_runs = len(set(a.start_time.isocalendar()[:2] for a in recent))
            avg_weekly_km, vdot_delta_6w, long_runs_pct = compute_readiness_inputs(user)
            readiness = calc_readiness(
                tsb=float(user.current_tsb),
                pct_weeks_with_runs_10w=min(1, weeks_with_runs / 10),
                long_runs_completed_pct=long_runs_pct,
                vdot_delta_6w=vdot_delta_6w,
                avg_weekly_km=avg_weekly_km,
                recommended_weekly_km=60,
            )

        # Store prediction
        pred = Prediction.objects.create(
            user=user,
            marathon=marathon if marathon.pk else None,
            target_distance_km=marathon.distance_km,
            race_date=race_date,
            base_time_sec=result['base_time_sec'],
            course_difficulty_coefficient=result['course_difficulty_coefficient'],
            weather_index=result['weather_index'],
            predicted_time_sec=result['predicted_time_sec'],
            confidence_interval_sec=result['confidence_interval_sec'],
            race_readiness_score=readiness['score'] if readiness else None,
            feature_importance=result.get('feature_importance', []),
            model_version='hybrid_v1',
            features_snapshot={
                'vdot': float(user.current_vdot),
                'temp_c': temp_c,
                'humidity_pct': humidity_pct,
                'mode': result['mode'],
            },
        )

        return Response({
            **PredictionSerializer(pred).data,
            'recommended_pace': result['recommended_pace'],
            'race_readiness': readiness,
        }, status=status.HTTP_201_CREATED)
