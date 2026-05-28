"""
Custom DRF paginator that lets the client override page_size via query
parameter — needed for catalog views like /api/marathons/ where we want
to load all results in one request instead of building UI pagination
for a known small set (≤100 items).

Default page_size stays at 20 (set in settings), max capped at 500
to prevent abuse.
"""
from rest_framework.pagination import PageNumberPagination


class OverridablePagination(PageNumberPagination):
    page_size_query_param = 'page_size'
    max_page_size = 500
