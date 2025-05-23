# Generated by Django 5.0.8 on 2025-05-08 08:36

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("tests", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="TestSubmission",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("started_at", models.DateTimeField(auto_now_add=True)),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("in_progress", "In Progress"),
                            ("completed", "Completed"),
                            ("timed_out", "Timed Out"),
                        ],
                        default="in_progress",
                        max_length=20,
                    ),
                ),
                (
                    "score",
                    models.DecimalField(
                        blank=True, decimal_places=2, max_digits=5, null=True
                    ),
                ),
                (
                    "student",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="test_submissions",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "test",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="submissions",
                        to="tests.test",
                    ),
                ),
            ],
            options={
                "unique_together": {("test", "student")},
            },
        ),
        migrations.CreateModel(
            name="Answer",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("text_answer", models.TextField(blank=True)),
                ("is_correct", models.BooleanField(blank=True, null=True)),
                (
                    "points_earned",
                    models.DecimalField(decimal_places=2, default=0, max_digits=5),
                ),
                (
                    "question",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE, to="tests.question"
                    ),
                ),
                (
                    "selected_choices",
                    models.ManyToManyField(blank=True, to="tests.choice"),
                ),
                (
                    "submission",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="answers",
                        to="results.testsubmission",
                    ),
                ),
            ],
            options={
                "unique_together": {("submission", "question")},
            },
        ),
    ]
