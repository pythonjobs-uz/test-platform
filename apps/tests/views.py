from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Test, Question
from .serializers import (
    TestSerializer, TestListSerializer, QuestionSerializer,
    StudentTestSerializer
)
from apps.common.permissions import IsTeacher, IsStudent, IsAdmin

class TestViewSet(viewsets.ModelViewSet):
    queryset = Test.objects.all()
    
    def get_serializer_class(self):
        if self.action == 'list':
            return TestListSerializer
        if self.action in ['student_tests', 'start']:
            return StudentTestSerializer
        return TestSerializer
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsTeacher | IsAdmin]
        elif self.action in ['student_tests', 'start']:
            permission_classes = [IsStudent]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=False, methods=['get'])
    def student_tests(self, request):
        tests = Test.objects.filter(is_active=True)
        serializer = self.get_serializer(tests, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def questions(self, request, pk=None):
        test = self.get_object()
        questions = test.questions.all()
        serializer = QuestionSerializer(questions, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def start(self, request, pk=None):
        test = self.get_object()
        if not test.is_active:
            return Response(
                {"detail": "This test is not active."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        serializer = self.get_serializer(test)
        data = serializer.data
        
        questions = test.questions.all().prefetch_related('choices')
        questions_data = QuestionSerializer(questions, many=True).data
        data['questions'] = questions_data
        
        return Response(data)

class QuestionViewSet(viewsets.ModelViewSet):
    serializer_class = QuestionSerializer
    permission_classes = [IsTeacher | IsAdmin]
    
    def get_queryset(self):
        return Question.objects.filter(test_id=self.kwargs['test_pk'])
    
    def perform_create(self, serializer):
        test = get_object_or_404(Test, pk=self.kwargs['test_pk'])
        serializer.save(test=test)