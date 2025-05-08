from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers
from .views import TestViewSet, QuestionViewSet

router = DefaultRouter()
router.register(r'tests', TestViewSet)

test_router = routers.NestedSimpleRouter(router, r'tests', lookup='test')
test_router.register(r'questions', QuestionViewSet, basename='test-questions')

urlpatterns = [
    path('', include(router.urls)),
    path('', include(test_router.urls)),
]