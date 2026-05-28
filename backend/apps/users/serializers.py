from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)
    marketing_emails_consent = serializers.BooleanField(default=False, required=False)

    class Meta:
        model = User
        fields = ['email', 'password', 'password2', 'first_name', 'last_name', 'marketing_emails_consent']

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        return User.objects.create_user(**validated_data)


class UserProfileSerializer(serializers.ModelSerializer):
    age = serializers.ReadOnlyField()
    target_marathon_name = serializers.CharField(
        source='target_marathon.name', read_only=True
    )

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'date_of_birth',
            'sex', 'max_hr', 'target_marathon', 'target_marathon_name',
            'target_race_date', 'target_finish_sec', 'units', 'lang',
            'current_vdot', 'current_ctl', 'current_atl', 'current_tsb',
            'training_weeks', 'age', 'created_at', 'onboarding_completed',
        ]
        read_only_fields = [
            'id', 'email', 'created_at',
            'current_vdot', 'current_ctl', 'current_atl', 'current_tsb',
            'training_weeks', 'onboarding_completed',
        ]


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Old password is incorrect.')
        return value


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = UserProfileSerializer(self.user).data
        return data
