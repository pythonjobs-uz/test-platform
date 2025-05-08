from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TestSubmissionViewSet

router = DefaultRouter()
router.register(r'submissions', TestSubmissionViewSet, basename='submission')

urlpatterns = [
    path('', include(router.urls)),
]