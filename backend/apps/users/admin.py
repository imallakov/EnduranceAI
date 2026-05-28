from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['email', 'first_name', 'last_name', 'current_vdot', 'training_weeks', 'created_at']
    list_filter = ['sex', 'units', 'lang', 'is_staff', 'is_active']
    search_fields = ['email', 'first_name', 'last_name']
    ordering = ['-created_at']
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'date_of_birth', 'sex', 'max_hr')}),
        ('Running profile', {'fields': ('target_marathon', 'target_race_date', 'target_finish_sec', 'units', 'lang')}),
        ('Metrics (auto)', {'fields': ('current_vdot', 'current_ctl', 'current_atl', 'current_tsb', 'training_weeks')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2'),
        }),
    )
