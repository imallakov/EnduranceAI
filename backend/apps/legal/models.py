import uuid
from django.db import models


class PolicyVersion(models.Model):
    POLICY_TYPES = [
        ('privacy', 'Privacy Policy'),
        ('terms', 'Terms of Service'),
        ('cookies', 'Cookie Policy'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    policy_type = models.CharField(max_length=20, choices=POLICY_TYPES)
    version = models.CharField(max_length=20, help_text='Semver string e.g. 1.0.0')
    effective_date = models.DateField()
    content_en = models.TextField()
    content_ru = models.TextField(blank=True)
    is_active = models.BooleanField(default=False, help_text='Only ONE active version per type')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'policy_versions'
        ordering = ['-effective_date']
        unique_together = [('policy_type', 'version')]

    def __str__(self):
        return f"{self.get_policy_type_display()} v{self.version}"


class PolicyAcceptance(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='policy_acceptances',
    )
    policy = models.ForeignKey(PolicyVersion, on_delete=models.PROTECT)
    accepted_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, blank=True)

    class Meta:
        db_table = 'policy_acceptances'
        indexes = [models.Index(fields=['user', 'policy'])]

    def __str__(self):
        return f"{self.user.email} accepted {self.policy} at {self.accepted_at:%Y-%m-%d}"
