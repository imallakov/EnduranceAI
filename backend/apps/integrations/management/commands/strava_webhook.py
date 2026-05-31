"""
Manage Strava push (webhook) subscription.

Usage:
    python manage.py strava_webhook list            # show current subscription(s)
    python manage.py strava_webhook create          # register our callback URL
    python manage.py strava_webhook delete <id>     # remove subscription by id
    python manage.py strava_webhook recreate        # delete existing + create fresh

Why a management command instead of doing this at app boot:
  - Strava only allows ONE subscription per app, so resubscribing is rare and
    deliberate (e.g. moving from staging → prod, rotating verify token)
  - Subscription survives across deploys — no point reattempting on every boot
  - Failures (callback URL not reachable, token mismatch) need human attention
"""
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.integrations import strava_client


class Command(BaseCommand):
    help = "Manage Strava webhook (push) subscription"

    def add_arguments(self, parser):
        parser.add_argument('action', choices=['list', 'create', 'delete', 'recreate'])
        parser.add_argument('subscription_id', nargs='?', type=int, default=None,
                            help='Required for the "delete" action')

    def handle(self, *args, **opts):
        action = opts['action']

        if action == 'list':
            subs = strava_client.list_webhook_subscriptions()
            if not subs:
                self.stdout.write("No active subscriptions.")
                return
            for s in subs:
                self.stdout.write(self.style.SUCCESS(
                    f"id={s['id']}  callback={s['callback_url']}  created={s.get('created_at')}"
                ))
            return

        if action == 'create':
            callback = settings.STRAVA_WEBHOOK_CALLBACK_URL
            verify = settings.STRAVA_WEBHOOK_VERIFY_TOKEN
            if not callback.startswith('https://') and 'localhost' not in callback:
                self.stdout.write(self.style.WARNING(
                    "Callback URL is not HTTPS. Strava only accepts HTTPS in production."
                ))
            self.stdout.write(f"Subscribing callback: {callback}")
            try:
                result = strava_client.create_webhook_subscription(callback, verify)
            except Exception as e:
                raise CommandError(f"Subscription failed: {e}")
            self.stdout.write(self.style.SUCCESS(
                f"Subscription created. id={result.get('id')}"
            ))
            return

        if action == 'delete':
            sub_id = opts['subscription_id']
            if not sub_id:
                raise CommandError("Subscription ID required: strava_webhook delete <id>")
            try:
                strava_client.delete_webhook_subscription(sub_id)
            except Exception as e:
                raise CommandError(f"Delete failed: {e}")
            self.stdout.write(self.style.SUCCESS(f"Subscription {sub_id} deleted."))
            return

        if action == 'recreate':
            # Delete all existing, then create a new one. Useful after changing
            # the callback URL or verify token.
            existing = strava_client.list_webhook_subscriptions()
            for s in existing:
                self.stdout.write(f"Deleting subscription id={s['id']}")
                strava_client.delete_webhook_subscription(s['id'])
            callback = settings.STRAVA_WEBHOOK_CALLBACK_URL
            verify = settings.STRAVA_WEBHOOK_VERIFY_TOKEN
            self.stdout.write(f"Creating subscription with callback: {callback}")
            try:
                result = strava_client.create_webhook_subscription(callback, verify)
            except Exception as e:
                raise CommandError(f"Subscription failed: {e}")
            self.stdout.write(self.style.SUCCESS(
                f"Subscription recreated. id={result.get('id')}"
            ))
            return
