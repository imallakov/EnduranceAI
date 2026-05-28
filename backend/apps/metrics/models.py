import uuid
from django.db import models


class DailyMetrics(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='daily_metrics')
    date = models.DateField()
    ctl = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    atl = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    tsb = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    vdot_rolling = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    hr_efficiency = models.DecimalField(max_digits=8, decimal_places=4, null=True, blank=True)

    class Meta:
        db_table = 'daily_metrics'
        unique_together = [('user', 'date')]
        ordering = ['-date']
        indexes = [
            models.Index(fields=['user', '-date'])
        ]

    def __str__(self):
        return f"{self.user.email} {self.date} CTL={self.ctl}"
