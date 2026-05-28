import uuid
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """Custom user model matching the SQL schema."""
    SEX_CHOICES = [('M', 'Male'), ('F', 'Female')]
    UNITS_CHOICES = [('metric', 'Metric'), ('imperial', 'Imperial')]
    LANG_CHOICES = [('ru', 'Russian'), ('en', 'English')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    sex = models.CharField(max_length=1, choices=SEX_CHOICES, null=True, blank=True)
    max_hr = models.SmallIntegerField(null=True, blank=True, help_text='Max heart rate bpm')
    target_marathon = models.ForeignKey(
        'races.Marathon',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='target_users'
    )
    target_race_date = models.DateField(null=True, blank=True)
    target_finish_sec = models.IntegerField(null=True, blank=True)
    units = models.CharField(max_length=10, choices=UNITS_CHOICES, default='metric')
    lang = models.CharField(max_length=5, choices=LANG_CHOICES, default='ru')

    marketing_emails_consent = models.BooleanField(default=False)
    onboarding_completed = models.BooleanField(default=False)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    # Cached metrics (updated by Celery)
    current_vdot = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    current_ctl = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    current_atl = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    current_tsb = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    training_weeks = models.SmallIntegerField(default=0, help_text='Weeks with training data')

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    class Meta:
        db_table = 'users'
        verbose_name = 'User'

    def __str__(self):
        return self.email

    @property
    def age(self):
        from datetime import date
        if self.date_of_birth:
            today = date.today()
            return today.year - self.date_of_birth.year - (
                (today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day)
            )
        return None

    @property
    def threshold_hr(self):
        """Estimate lactate threshold HR as ~88% of max HR."""
        if self.max_hr:
            return int(self.max_hr * 0.88)
        return 160  # default fallback
