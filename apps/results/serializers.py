from rest_framework import serializers
from .models import TestSubmission, Answer
from apps.tests.models import Question, Choice
from django.utils import timezone

class AnswerSerializer(serializers.ModelSerializer):
    question_id = serializers.PrimaryKeyRelatedField(
        source='question', queryset=Question.objects.all()
    )
    selected_choice_ids = serializers.PrimaryKeyRelatedField(
        source='selected_choices', queryset=Choice.objects.all(), many=True, required=False
    )
    
    class Meta:
        model = Answer
        fields = ('id', 'question_id', 'selected_choice_ids', 'text_answer')
    
    def validate(self, attrs):
        question = attrs.get('question')
        selected_choices = attrs.get('selected_choices', [])
        text_answer = attrs.get('text_answer', '')
        
        if question.question_type == 'text' and not text_answer:
            raise serializers.ValidationError({"text_answer": "Text answer is required for this question type."})
        
        if question.question_type in ['single_choice', 'multiple_choice'] and not selected_choices:
            raise serializers.ValidationError({"selected_choice_ids": "At least one choice must be selected."})
        
        if question.question_type == 'single_choice' and len(selected_choices) > 1:
            raise serializers.ValidationError({"selected_choice_ids": "Only one choice can be selected for this question type."})
        
        for choice in selected_choices:
            if choice.question.id != question.id:
                raise serializers.ValidationError({"selected_choice_ids": "Selected choice does not belong to the question."})
        
        return attrs

class SubmissionCreateSerializer(serializers.ModelSerializer):
    answers = AnswerSerializer(many=True)
    
    class Meta:
        model = TestSubmission
        fields = ('id', 'test', 'answers')
    
    def create(self, validated_data):
        answers_data = validated_data.pop('answers')
        student = self.context['request'].user
        
        submission = TestSubmission.objects.create(
            student=student,
            status='completed',
            completed_at=timezone.now(),
            **validated_data
        )
        
        total_points = 0
        total_possible = 0
        
        for answer_data in answers_data:
            selected_choices = answer_data.pop('selected_choices', [])
            answer = Answer.objects.create(submission=submission, **answer_data)
            answer.selected_choices.set(selected_choices)
            
            points = answer.calculate_score()
            if points is not None:
                total_points += points
            
            total_possible += answer.question.points
        
        if total_possible > 0:
            submission.score = (total_points / total_possible) * 100
        else:
            submission.score = 0
        
        submission.save()
        return submission

class SubmissionDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestSubmission
        fields = ('id', 'test', 'started_at', 'completed_at', 'status', 'score')
        read_only_fields = fields