import io
from datetime import date, timedelta
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.http import FileResponse

from .models import TrainingPlan, PlanWeek, PlanWorkout
from .serializers import (
    TrainingPlanSerializer, PlanWeekSerializer,
    GeneratePlanSerializer, WorkoutCompleteSerializer, PlanWorkoutSerializer,
)
from .generator import generate_plan
from .export import export_plan_pdf, export_plan_csv


class GeneratePlanView(APIView):
    """POST /api/plans/generate/"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        ser = GeneratePlanSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        user = request.user
        if not user.current_vdot:
            return Response(
                {'error': 'Upload training activities first to calculate VDOT'},
                status=status.HTTP_400_BAD_REQUEST
            )

        race_date = d['race_date']
        # Snap plan start to the Monday of the current calendar week — so
        # day_of_week=0 (MON) always lines up with a real Monday on the
        # user's calendar, regardless of which day they hit Generate.
        today = date.today()
        snapped_start = today - timedelta(days=today.weekday())

        try:
            weeks_data = generate_plan(
                user, race_date,
                days_per_week=d.get('days_per_week', 4),
                target_time_sec=d.get('target_time_sec'),
                cutback_enabled=d.get('cutback_enabled', True),
                start_date=snapped_start,
            )
        except ValueError as e:
            return Response({'error': str(e)}, status=400)

        # Deactivate existing active plans
        TrainingPlan.objects.filter(user=user, status='active').update(status='archived')

        plan = TrainingPlan.objects.create(
            user=user,
            start_date=snapped_start,
            race_date=race_date,
            target_time_sec=d.get('target_time_sec'),
            vdot_at_creation=user.current_vdot,
            days_per_week=d.get('days_per_week', 4),
            status='active',
        )

        for wdata in weeks_data:
            week = PlanWeek.objects.create(
                plan=plan,
                week_number=wdata['week_number'],
                phase=wdata['phase'],
                total_km=wdata['total_km'],
            )
            for wo in wdata['workouts']:
                PlanWorkout.objects.create(
                    plan_week=week,
                    day_of_week=wo['day_of_week'],
                    workout_type=wo['workout_type'],
                    distance_km=wo.get('distance_km'),
                    pace_min_sec=wo.get('pace_min_sec'),
                    pace_max_sec=wo.get('pace_max_sec'),
                    structure=wo.get('structure', {}),
                )

        plan = TrainingPlan.objects.prefetch_related('weeks__workouts').get(pk=plan.pk)
        return Response(TrainingPlanSerializer(plan).data, status=status.HTTP_201_CREATED)


class ActivePlanView(APIView):
    """GET /api/plans/active/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        plan = (TrainingPlan.objects
                .filter(user=request.user, status='active')
                .prefetch_related('weeks__workouts')
                .first())
        if not plan:
            return Response({'detail': 'No active plan'}, status=404)
        return Response(TrainingPlanSerializer(plan).data)


class PlanDetailView(generics.RetrieveAPIView):
    """GET /api/plans/{id}/"""
    serializer_class = TrainingPlanSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (TrainingPlan.objects
                .filter(user=self.request.user)
                .prefetch_related('weeks__workouts'))


class PlanWeeksView(APIView):
    """GET /api/plans/{id}/weeks/"""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            plan = TrainingPlan.objects.get(id=pk, user=request.user)
        except TrainingPlan.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)
        weeks = plan.weeks.prefetch_related('workouts').all()
        return Response(PlanWeekSerializer(weeks, many=True).data)


class ExportPlanPDFView(APIView):
    """GET /api/plans/{id}/export/pdf/"""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            plan = TrainingPlan.objects.get(id=pk, user=request.user)
        except TrainingPlan.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)
        pdf_bytes = export_plan_pdf(plan)
        return FileResponse(
            io.BytesIO(pdf_bytes),
            content_type='application/pdf',
            as_attachment=True,
            filename=f'training_plan_{plan.id}.pdf',
        )


class ExportPlanCSVView(APIView):
    """GET /api/plans/{id}/export/csv/"""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            plan = TrainingPlan.objects.get(id=pk, user=request.user)
        except TrainingPlan.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)
        csv_content = export_plan_csv(plan)
        return FileResponse(
            io.BytesIO(csv_content.encode('utf-8')),
            content_type='text/csv',
            as_attachment=True,
            filename=f'training_plan_{plan.id}.csv',
        )


class WorkoutCompleteView(APIView):
    """PATCH /api/plans/{id}/workouts/{wid}/complete/"""
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk, wid):
        try:
            plan = TrainingPlan.objects.get(id=pk, user=request.user)
            workout = PlanWorkout.objects.get(id=wid, plan_week__plan=plan)
        except (TrainingPlan.DoesNotExist, PlanWorkout.DoesNotExist):
            return Response({'error': 'Not found'}, status=404)

        ser = WorkoutCompleteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        workout.completed = True
        if ser.validated_data.get('activity_id'):
            from apps.activities.models import Activity
            try:
                act = Activity.objects.get(id=ser.validated_data['activity_id'], user=request.user)
                workout.activity = act
            except Activity.DoesNotExist:
                pass
        workout.save()
        return Response({'status': 'completed'})


class WorkoutPatchView(APIView):
    """PATCH /api/plans/{id}/workouts/{wid}/ — swap workout type"""
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk, wid):
        try:
            plan = TrainingPlan.objects.get(id=pk, user=request.user)
            workout = PlanWorkout.objects.get(id=wid, plan_week__plan=plan)
        except (TrainingPlan.DoesNotExist, PlanWorkout.DoesNotExist):
            return Response({'error': 'Not found'}, status=404)

        allowed_types = ['rest', 'easy', 'long', 'tempo', 'interval', 'repetition', 'marathon_pace']
        new_type = request.data.get('workout_type')

        if new_type is not None and new_type not in allowed_types:
            return Response(
                {'error': f'Invalid workout_type. Allowed: {allowed_types}'},
                status=400,
            )

        if new_type is not None:
            workout.workout_type = new_type
            if new_type == 'rest':
                workout.distance_km = None
                workout.pace_min_sec = None
                workout.pace_max_sec = None
                workout.structure = {}
            else:
                from .generator import _workout_paces
                from ml.src.formulas import vdot_to_paces
                vdot = float(request.user.current_vdot or 40)
                paces = vdot_to_paces(vdot)
                dist = float(workout.distance_km or 8)
                p_min, p_max, structure = _workout_paces(new_type, paces, dist)
                workout.pace_min_sec = p_min
                workout.pace_max_sec = p_max
                workout.structure = structure

        if 'distance_km' in request.data:
            workout.distance_km = request.data['distance_km']

        workout.save()
        return Response(PlanWorkoutSerializer(workout).data)
