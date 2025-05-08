from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import TestSubmission, Answer
from .serializers import SubmissionCreateSerializer, SubmissionDetailSerializer
from apps.tests.models import Test
from apps.common.permissions import IsStudent

class TestSubmissionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsStudent]
    
    def get_queryset(self):
        return TestSubmission.objects.filter(student=self.request.user)
    
    def get_serializer_class(self):
        if self.action == 'create':
            return SubmissionCreateSerializer
        return SubmissionDetailSerializer
    
    def create(self, request, *args, **kwargs):
        test_id = request.data.get('test')
        test = get_object_or_404(Test, pk=test_id)
        
        existing_submission = TestSubmission.objects.filter(
            test=test,
            student=request.user,
            status='completed'
        ).first()
        
        if existing_submission:
            return Response(
                {"detail": "You have already completed this test."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)