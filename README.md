# School Exam Platform

A comprehensive Django backend application for a school exam/test platform using Django and Django REST Framework.

## Features

- JWT-based authentication
- Role-based permissions (Admin, Teacher, Student)
- Dynamic test creation by teachers
- Automatic scoring
- Submission tracking
- Statistics and analytics
- Professional admin panel using Django Unfold

## Project Structure

The project follows a modular structure with the following Django apps:

- **users**: Authentication, role-based access (Student, Teacher, Admin)
- **tests**: Test creation, questions, options
- **results**: Submissions, answers, scoring
- **stats**: Aggregated statistics for teachers/admins
- **common**: Shared utilities, permissions, mixins

## API Endpoints

### Authentication
- `POST /api/v1/auth/login/`: Login and get JWT tokens
- `POST /api/v1/auth/refresh/`: Refresh JWT token
- `POST /api/v1/auth/register/`: Register a new user

### Users
- `GET /api/v1/users/me/`: Get current user profile
- `GET /api/v1/users/`: List all users (Admin only)

### Tests
- `GET /api/v1/tests/`: List all tests
- `POST /api/v1/tests/`: Create a new test (Teacher/Admin only)
- `GET /api/v1/tests/{id}/`: Get test details
- `PUT/PATCH /api/v1/tests/{id}/`: Update test (Teacher/Admin only)
- `DELETE /api/v1/tests/{id}/`: Delete test (Teacher/Admin only)
- `GET /api/v1/tests/student_tests/`: Get tests available for students (Student only)
- `GET /api/v1/tests/{id}/questions/`: Get questions for a test

### Questions
- `GET /api/v1/tests/{test_id}/questions/`: List questions for a test
- `POST /api/v1/tests/{test_id}/questions/`: Add question to a test (Teacher/Admin only)
- `GET /api/v1/tests/{test_id}/questions/{id}/`: Get question details
- `PUT/PATCH /api/v1/tests/{test_id}/questions/{id}/`: Update question (Teacher/Admin only)
- `DELETE /api/v1/tests/{test_id}/questions/{id}/`: Delete question (Teacher/Admin only)

### Submissions
- `GET /api/v1/submissions/`: List user's submissions (Student only)
- `POST /api/v1/submissions/`: Submit a test (Student only)
- `GET /api/v1/submissions/{id}/`: Get submission details

### Statistics
- `GET /api/v1/stats/tests/{id}/`: Get statistics for a test (Teacher/Admin only)
- `GET /api/v1/stats/student/`: Get statistics for current student (Student only)

## Setup and Installation

### Prerequisites
- Python 3.10+
- PostgreSQL

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd django-test-platform
```

2. Create a virtual environment
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies
```bash
pip install -r requirements.txt
```

4. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your configuration
```

5. Run migrations
```bash
python manage.py migrate
```

6. Create a superuser
```bash
python manage.py createsuperuser
```

7. Run the development server
```bash
python manage.py runserver
```

### Docker Setup

Alternatively, you can use Docker:

```bash
docker-compose up -d
```

## Testing

Run tests with pytest:

```bash
pytest
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.