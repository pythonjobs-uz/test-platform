from django.urls import path
from .views import TestStatsView, StudentStatsView

urlpatterns = [
    path('stats/tests/<int:test_id>/', TestStatsView.as_view(), name='test-stats'),
    path('stats/student/', StudentStatsView.as_view(), name='student-stats'),
]