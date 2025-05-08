import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.tests.models import Test, Question, Choice
from .models import TestSubmission, Answer

User = get_user_model()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def setup_test_with_questions():
    teacher = User.objects.create_user(
        email='teacher@example.com',
        password='testpass123',
        role='teacher'
    )
    
    student = User.objects.create_user(
        email='student@example.com',
        password='testpass123',
        role='student'
    )
    
    test = Test.objects.create(
        title='Math Quiz',
        subject='Mathematics',
        created_by=teacher,
        time_limit=30
    )
    
    # Single choice question
    q1 = Question.objects.create(
        test=test,
        text='What is 2+2?',
        question_type='single_choice',
        points=5
    )
    
    Choice.objects.create(question=q1, text='3', is_correct=False)
    Choice.objects.create(question=q1, text='4', is_correct=True)
    Choice.objects.create(question=q1, text='5', is_correct=False)
    
    # Multiple choice question
    q2 = Question.objects.create(
        test=test,
        text='Select all prime numbers',
        question_type='multiple_choice',
        points=10
    )
    
    Choice.objects.create(question=q2, text='2', is_correct=True)
    Choice.objects.create(question=q2, text='3', is_correct=True)
    Choice.objects.create(question=q2, text='4', is_correct=False)
    Choice.objects.create(question=q2, text='5', is_correct=True)
    
    return {'test': test, 'teacher': teacher, 'student': student, 'questions': [q1, q2]}

@pytest.mark.django_db
def test_submit_test(api_client, setup_test_with_questions):
    data = setup_test_with_questions
    student = data['student']
    test = data['test']
    questions = data['questions']
    
    api_client.force_authenticate(user=student)
    url = reverse('submission-list')
    
    # Get all choices for the questions
    q1_choices = Choice.objects.filter(question=questions[0])
    q2_choices = Choice.objects.filter(question=questions[1])
    
    # Find the correct choice for q1
    correct_q1_choice = q1_choices.get(is_correct=True)
    
    # Find the correct choices for q2
    correct_q2_choices = list(q2_choices.filter(is_correct=True).values_list('id', flat=True))
    
    payload = {
        'test': test.id,
        'answers': [
            {
                'question_id': questions[0].id,
                'selected_choice_ids': [correct_q1_choice.id]
            },
            {
                'question_id': questions[1].id,
                'selected_choice_ids': correct_q2_choices
            }
        ]
    }
    
    response = api_client.post(url, payload, format='json')
    assert response.status_code == status.HTTP_201_CREATED
    
    # Check that submission was created
    submission = TestSubmission.objects.get(test=test, student=student)
    assert submission.status == 'completed'
    assert submission.score == 100  # All answers were correct

@pytest.mark.django_db
def test_cannot_submit_twice(api_client, setup_test_with_questions):
    data = setup_test_with_questions
    student = data['student']
    test = data['test']
    questions = data['questions']
    
    # Create a completed submission
    submission = TestSubmission.objects.create(
        test=test,
        student=student,
        status='completed',
        score=80
    )
    
    api_client.force_authenticate(user=student)
    url = reverse('submission-list')
    
    payload = {
        'test': test.id,
        'answers': [
            {
                'question_id': questions[0].id,
                'selected_choice_ids': [Choice.objects.filter(question=questions[0]).first().id]
            }
        ]
    }
    
    response = api_client.post(url, payload, format='json')
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert 'already completed' in response.data['detail']