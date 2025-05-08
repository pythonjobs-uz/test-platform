from django.contrib import admin
from unfold.admin import ModelAdmin, TabularInline
from .models import Test, Question, Choice

class ChoiceInline(TabularInline):
    model = Choice
    extra = 4

class QuestionInline(TabularInline):
    model = Question
    extra = 1
    show_change_link = True

@admin.register(Question)
class QuestionAdmin(ModelAdmin):
    list_display = ('text', 'test', 'question_type', 'points')
    list_filter = ('test', 'question_type')
    search_fields = ('text',)
    inlines = [ChoiceInline]

@admin.register(Test)
class TestAdmin(ModelAdmin):
    list_display = ('title', 'subject', 'created_by', 'time_limit', 'is_active', 'created_at')
    list_filter = ('subject', 'is_active', 'created_by')
    search_fields = ('title', 'description', 'subject')
    inlines = [QuestionInline]
    
    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)