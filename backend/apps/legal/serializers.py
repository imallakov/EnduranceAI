from rest_framework import serializers
from .models import PolicyVersion, PolicyAcceptance


class PolicyVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PolicyVersion
        fields = [
            'id', 'policy_type', 'version', 'effective_date',
            'content_en', 'content_ru', 'is_active', 'created_at',
        ]


class PolicyAcceptanceSerializer(serializers.ModelSerializer):
    policy_type = serializers.CharField(source='policy.policy_type', read_only=True)
    policy_version = serializers.CharField(source='policy.version', read_only=True)
    policy_id = serializers.UUIDField(source='policy.id', read_only=True)

    class Meta:
        model = PolicyAcceptance
        fields = ['id', 'policy_id', 'policy_type', 'policy_version', 'accepted_at', 'ip_address']


class AcceptPolicySerializer(serializers.Serializer):
    policy_id = serializers.UUIDField()
    accepted = serializers.BooleanField()

    def validate_accepted(self, value):
        if not value:
            raise serializers.ValidationError('You must accept the policy.')
        return value
