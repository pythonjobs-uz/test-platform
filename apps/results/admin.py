from django.contrib import admin
from unfold.admin import ModelAdmin, TabularInline
from .models import TestSubmission, Answer

class AnswerInline(TabularInline):
    model = Answer
    extra = 0
    readonly_fields = ('question', 'selected_choices', 'text_answer', 'is_correct', 'points_earned')
    can_delete = False

@admin.register(TestSubmission)
class TestSubmissionAdmin(ModelAdmin):
    list_display = ('test', 'student', 'started_at', 'completed_at', 'status', 'score')
    list_filter = ('status', 'test', 'student')
    search_fields = ('test__title', 'student__email')
    readonly_fields = ('test', 'student', 'started_at', 'completed_at', 'status', 'score')
    inlines = [AnswerInline]