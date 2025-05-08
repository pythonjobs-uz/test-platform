import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

User = get_user_model()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def create_user():
    def _create_user(email='test@example.com', password='testpass123', role='student'):
        return User.objects.create_user(
            email=email,
            password=password,
            role=role,
            first_name='Test',
            last_name='User'
        )
    return _create_user

@pytest.mark.django_db
def test_user_registration(api_client):
    url = reverse('register')
    payload = {
        'email': 'newuser@example.com',
        'password': 'newpass123',
        'password2': 'newpass123',
        'first_name': 'New',
        'last_name': 'User',
        'role': 'student'
    }
    
    response = api_client.post(url, payload)
    assert response.status_code == status.HTTP_201_CREATED
    assert User.objects.filter(email='newuser@example.com').exists()

@pytest.mark.django_db
def test_user_login(api_client, create_user):
    user = create_user()
    url = reverse('token_obtain_pair')
    payload = {
        'email': 'test@example.com',
        'password': 'testpass123'
    }
    
    response = api_client.post(url, payload)
    assert response.status_code == status.HTTP_200_OK
    assert 'access' in response.data
    assert 'refresh' in response.data

@pytest.mark.django_db
def test_get_user_profile(api_client, create_user):
    user = create_user()
    api_client.force_authenticate(user=user)
    url = reverse('user_detail')
    
    response = api_client.get(url)
    assert response.status_code == status.HTTP_200_OK
    assert response.data['email'] == user.email