import zipfile
import io

from django.test import TestCase, override_settings
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


# LocMemCache so throttling works without a running Redis (critique pt.10/Sec).
@override_settings(CACHES={'default': {
    'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}})
class AuthCookieTests(TestCase):
    """httpOnly refresh-cookie auth flow (Sec): refresh token must live in the
    cookie, never in the JSON body."""

    def setUp(self):
        self.client = APIClient()
        self.pw = 'StrongPass123!'

    def _register(self):
        return self.client.post('/api/auth/register/', {
            'email': 'cookie@test.io', 'password': self.pw, 'password2': self.pw,
            'first_name': 'C', 'last_name': 'K',
        }, format='json')

    def test_register_sets_httponly_cookie_and_hides_refresh_from_body(self):
        r = self._register()
        self.assertEqual(r.status_code, 201)
        self.assertIn('access', r.data)
        self.assertNotIn('refresh', r.data)            # never in the body
        cookie = r.cookies.get('refresh_token')
        self.assertIsNotNone(cookie)
        self.assertTrue(cookie['httponly'])
        self.assertEqual(cookie['path'], '/api/auth/')
        self.assertTrue(cookie.value)

    def test_login_sets_cookie_and_refresh_reads_it(self):
        User.objects.create_user(email='cookie@test.io', password=self.pw)
        r = self.client.post('/api/auth/login/',
                             {'email': 'cookie@test.io', 'password': self.pw}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertIn('access', r.data)
        self.assertNotIn('refresh', r.data)
        self.assertIn('refresh_token', r.cookies)
        # APIClient persists the Set-Cookie → refresh with an EMPTY body works,
        # and returns a fresh access token (refresh again only via the cookie).
        r2 = self.client.post('/api/auth/token/refresh/', {}, format='json')
        self.assertEqual(r2.status_code, 200)
        self.assertIn('access', r2.data)
        self.assertNotIn('refresh', r2.data)

    def test_refresh_without_cookie_is_401(self):
        r = self.client.post('/api/auth/token/refresh/', {}, format='json')
        self.assertEqual(r.status_code, 401)

    def test_logout_clears_cookie(self):
        User.objects.create_user(email='cookie@test.io', password=self.pw)
        self.client.post('/api/auth/login/',
                         {'email': 'cookie@test.io', 'password': self.pw}, format='json')
        r = self.client.post('/api/auth/logout/')
        self.assertEqual(r.status_code, 204)
        cookie = r.cookies.get('refresh_token')      # delete_cookie → empty value
        self.assertIsNotNone(cookie)
        self.assertEqual(cookie.value, '')
