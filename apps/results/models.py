from django.db import models
from django.conf import settings
from apps.tests.models import Test, Question, Choice

class TestSubmission(models.Model):
    STATUS_CHOICES = (
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('timed_out', 'Timed Out'),
    )
    
    test = models.ForeignKey(Test, on_delete=models.CASCADE, related_name='submissions')
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='test_submissions')
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='in_progress')
    score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    
    class Meta:
        unique_together = ['test', 'student']
    
    def __str__(self):
        return f"{self.student.email} - {self.test.title}"
    
    @property
    def total_points(self):
        return self.test.questions.aggregate(total=models.Sum('points'))['total'] or 0

class Answer(models.Model):
    submission = models.ForeignKey(TestSubmission, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    selected_choices = models.ManyToManyField(Choice, blank=True)
    text_answer = models.TextField(blank=True)
    is_correct = models.BooleanField(null=True, blank=True)
    points_earned = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    
    class Meta:
        unique_together = ['submission', 'question']
    
    def __str__(self):
        return f"Answer for {self.question}"
    
    def calculate_score(self):
        if self.question.question_type == 'text':
            return None
        
        if self.question.question_type == 'single_choice':
            if self.selected_choices.count() != 1:
                self.is_correct = False
                self.points_earned = 0
            else:
                self.is_correct = self.selected_choices.first().is_correct
                self.points_earned = self.question.points if self.is_correct else 0
        
        elif self.question.question_type == 'multiple_choice':
            correct_choices = self.question.choices.filter(is_correct=True)
            selected_correct = self.selected_choices.filter(is_correct=True).count()
            selected_incorrect = self.selected_choices.filter(is_correct=False).count()
            
            if selected_incorrect == 0 and selected_correct == correct_choices.count():
                self.is_correct = True
                self.points_earned = self.question.points
            else:
                self.is_correct = False
                ratio = selected_correct / correct_choices.count() if correct_choices.count() > 0 else 0
                self.points_earned = self.question.points * ratio if selected_incorrect == 0 else 0
        
        self.save()
        return self.points_earned