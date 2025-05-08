from django.utils.translation import gettext_lazy as _
from unfold.admin import ModelAdmin

def dashboard_callback(request, context):
    return context