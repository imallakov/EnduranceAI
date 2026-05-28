from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.shortcuts import get_object_or_404

from .models import PolicyVersion, PolicyAcceptance
from .serializers import (
    PolicyVersionSerializer,
    PolicyAcceptanceSerializer,
    AcceptPolicySerializer,
)


class ActivePolicyView(APIView):
    """GET /api/legal/policies/<policy_type>/active/ — public"""
    permission_classes = [AllowAny]

    def get(self, request, policy_type):
        policy = get_object_or_404(PolicyVersion, policy_type=policy_type, is_active=True)
        return Response(PolicyVersionSerializer(policy).data)


class AcceptPolicyView(APIView):
    """POST /api/legal/accept/ — auth required"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        ser = AcceptPolicySerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        policy = get_object_or_404(PolicyVersion, id=ser.validated_data['policy_id'])

        # Idempotent: don't create duplicate if same version already accepted
        acceptance, _ = PolicyAcceptance.objects.get_or_create(
            user=request.user,
            policy=policy,
            defaults={
                'ip_address': _get_client_ip(request),
                'user_agent': request.META.get('HTTP_USER_AGENT', '')[:500],
            },
        )
        return Response(PolicyAcceptanceSerializer(acceptance).data, status=status.HTTP_201_CREATED)


class UserAcceptancesView(generics.ListAPIView):
    """GET /api/legal/user-acceptances/ — auth required"""
    permission_classes = [IsAuthenticated]
    serializer_class = PolicyAcceptanceSerializer
    pagination_class = None  # return bare list

    def get_queryset(self):
        return (
            PolicyAcceptance.objects
            .filter(user=self.request.user)
            .select_related('policy')
            .order_by('-accepted_at')
        )


def _get_client_ip(request):
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded:
        return x_forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')
