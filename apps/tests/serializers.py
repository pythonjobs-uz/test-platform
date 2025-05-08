from rest_framework import serializers
from .models import Test, Question, Choice

class ChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = ('id', 'text', 'is_correct')
        extra_kwargs = {
            'is_correct': {'write_only': True}
        }

class QuestionSerializer(serializers.ModelSerializer):
    choices = ChoiceSerializer(many=True, required=False)
    
    class Meta:
        model = Question
        fields = ('id', 'text', 'question_type', 'points', 'order', 'choices')
    
    def create(self, validated_data):
        choices_data = validated_data.pop('choices', [])
        question = Question.objects.create(**validated_data)
        
        for choice_data in choices_data:
            Choice.objects.create(question=question, **choice_data)
        
        return question
    
    def update(self, instance, validated_data):
        choices_data = validated_data.pop('choices', [])
        instance = super().update(instance, validated_data)
        
        if choices_data:
            instance.choices.all().delete()
            for choice_data in choices_data:
                Choice.objects.create(question=instance, **choice_data)
        
        return instance

class TestSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, required=False)
    created_by = serializers.ReadOnlyField(source='created_by.email')
    
    class Meta:
        model = Test
        fields = ('id', 'title', 'description', 'subject', 'created_by', 
                  'time_limit', 'is_active', 'created_at', 'updated_at', 'questions')
    
    def create(self, validated_data):
        questions_data = validated_data.pop('questions', [])
        test = Test.objects.create(**validated_data)
        
        for question_data in questions_data:
            choices_data = question_data.pop('choices', [])
            question = Question.objects.create(test=test, **question_data)
            
            for choice_data in choices_data:
                Choice.objects.create(question=question, **choice_data)
        
        return test

class TestListSerializer(serializers.ModelSerializer):
    question_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Test
        fields = ('id', 'title', 'subject', 'time_limit', 'is_active', 
                  'created_at', 'question_count')
    
    def get_question_count(self, obj):
        return obj.questions.count()

class StudentTestSerializer(serializers.ModelSerializer):
    question_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Test
        fields = ('id', 'title', 'description', 'subject', 'time_limit', 
                  'created_at', 'question_count')
    
    def get_question_count(self, obj):
        return obj.questions.count()