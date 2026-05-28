import zipfile
import io

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


def _jwt(user) -> str:
    return str(RefreshToken.for_user(user).access_token)


class DataExportTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='export_test@example.com',
            password='testpass123',
        )
        self.client = APIClient()
        self.url = '/api/users/me/data-export/'

    def test_data_export_authenticated_user_gets_zip(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {_jwt(self.user)}')
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/zip')
        self.assertIn('attachment', response['Content-Disposition'])
        self.assertIn('.zip', response['Content-Disposition'])

        zf = zipfile.ZipFile(io.BytesIO(b''.join(response.streaming_content if hasattr(response, 'streaming_content') else [response.content])))
        names = zf.namelist()
        for expected in ('README.txt', 'profile.json', 'strava.json', 'activities.json',
                         'predictions.json', 'plans.json', 'metrics.json',
                         'policy_acceptances.json'):
            self.assertIn(expected, names, f'{expected} missing from archive')

        import json
        profile = json.loads(zf.read('profile.json'))
        self.assertEqual(profile['email'], self.user.email)

        strava = json.loads(zf.read('strava.json'))
        self.assertIsNone(strava)  # no Strava connection for this user

        activities = json.loads(zf.read('activities.json'))
        self.assertIsInstance(activities, list)
        self.assertEqual(len(activities), 0)

    def test_data_export_unauthorized_user_gets_401(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 401)
