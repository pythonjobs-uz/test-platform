from rest_framework import generics, permissions
from rest_framework.response import Response
from django.db.models import Avg, Count, Max, Min
from apps.tests.models import Test
from apps.results.models import TestSubmission, Answer
from apps.common.permissions import IsTeacher, IsAdmin

class TestStatsView(generics.RetrieveAPIView):
    permission_classes = [IsTeacher | IsAdmin]
    
    def get(self, request, test_id):
        test = Test.objects.get(pk=test_id)
        
        submissions = TestSubmission.objects.filter(test=test, status='completed')
        submission_count = submissions.count()
        
        if submission_count == 0:
            return Response({
                'test_id': test_id,
                'test_title': test.title,
                'submission_count': 0,
                'message': 'No submissions yet'
            })
        
        avg_score = submissions.aggregate(avg_score=Avg('score'))['avg_score']
        max_score = submissions.aggregate(max_score=Max('score'))['max_score']
        min_score = submissions.aggregate(min_score=Min('score'))['min_score']
        
        question_stats = []
        for question in test.questions.all():
            answers = Answer.objects.filter(
                submission__in=submissions,
                question=question
            )
            
            correct_count = answers.filter(is_correct=True).count()
            incorrect_count = answers.filter(is_correct=False).count()
            
            if answers.count() > 0:
                correct_percentage = (correct_count / answers.count()) * 100
            else:
                correct_percentage = 0
            
            question_stats.append({
                'question_id': question.id,
                'question_text': question.text,
                'correct_count': correct_count,
                'incorrect_count': incorrect_count,
                'correct_percentage': correct_percentage
            })
        
        return Response({
            'test_id': test_id,
            'test_title': test.title,
            'submission_count': submission_count,
            'avg_score': avg_score,
            'max_score': max_score,
            'min_score': min_score,
            'question_stats': question_stats
        })

class StudentStatsView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        if user.role != 'student':
            return Response({
                'message': 'Stats only available for students'
            })
        
        submissions = TestSubmission.objects.filter(
            student=user,
            status='completed'
        )
        
        tests_taken = submissions.count()
        avg_score = submissions.aggregate(avg_score=Avg('score'))['avg_score']
        
        test_results = []
        for submission in submissions:
            test_results.append({
                'test_id': submission.test.id,
                'test_title': submission.test.title,
                'score': submission.score,
                'completed_at': submission.completed_at
            })
        
        return Response({
            'student_id': user.id,
            'student_email': user.email,
            'tests_taken': tests_taken,
            'avg_score': avg_score,
            'test_results': test_results
        })