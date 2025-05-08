import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from .models import Test, Question, Choice

User = get_user_model()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def create_user():
    def _create_user(email='teacher@example.com', password='testpass123', role='teacher'):
        return User.objects.create_user(
            email=email,
            password=password,
            role=role,
            first_name='Test',
            last_name='Teacher'
        )
    return _create_user

@pytest.fixture
def create_test(create_user):
    def _create_test(title='Test Exam', subject='Math'):
        teacher = create_user()
        test = Test.objects.create(
            title=title,
            subject=subject,
            created_by=teacher,
            time_limit=60
        )
        return test, teacher
    return _create_test

@pytest.mark.django_db
def test_create_test(api_client, create_user):
    teacher = create_user()
    api_client.force_authenticate(user=teacher)
    url = reverse('test-list')
    
    payload = {
        'title': 'Math Exam',
        'description': 'Final exam for Math class',
        'subject': 'Mathematics',
        'time_limit': 90
    }
    
    response = api_client.post(url, payload)
    assert response.status_code == status.HTTP_201_CREATED
    assert Test.objects.filter(title='Math Exam').exists()
    assert Test.objects.get(title='Math Exam').created_by == teacher

@pytest.mark.django_db
def test_add_question_to_test(api_client, create_test):
    test, teacher = create_test()
    api_client.force_authenticate(user=teacher)
    url = reverse('test-questions-list', kwargs={'test_pk': test.id})
    
    payload = {
        'text': 'What is 2+2?',
        'question_type': 'single_choice',
        'points': 5,
        'choices': [
            {'text': '3', 'is_correct': False},
            {'text': '4', 'is_correct': True},
            {'text': '5', 'is_correct': False}
        ]
    }
    
    response = api_client.post(url, payload, format='json')
    assert response.status_code == status.HTTP_201_CREATED
    assert Question.objects.filter(test=test).count() == 1
    assert Choice.objects.filter(question__test=test).count() == 3

@pytest.mark.django_db
def test_student_can_view_tests(api_client, create_test):
    test, _ = create_test()
    student = User.objects.create_user(
        email='student@example.com',
        password='testpass123',
        role='student',
        first_name='Test',
        last_name='Student'
    )
    
    api_client.force_authenticate(user=student)
    url = reverse('test-student-tests')
    
    response = api_client.get(url)
    assert response.status_code == status.HTTP_200_OK
    assert len(response.data) == 1
    assert response.data[0]['title'] == test.title