from django.contrib import admin
from .models import PolicyVersion, PolicyAcceptance


@admin.register(PolicyVersion)
class PolicyVersionAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'policy_type', 'version', 'effective_date', 'is_active', 'created_at']
    list_filter = ['policy_type', 'is_active']
    search_fields = ['version']
    ordering = ['-effective_date']


@admin.register(PolicyAcceptance)
class PolicyAcceptanceAdmin(admin.ModelAdmin):
    list_display = ['user', 'policy', 'accepted_at', 'ip_address']
    list_filter = ['policy__policy_type']
    search_fields = ['user__email']
    readonly_fields = ['user', 'policy', 'accepted_at', 'ip_address', 'user_agent']

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
