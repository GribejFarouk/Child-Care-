from django.urls import path
from . import views

urlpatterns = [
    path('internal/events/', views.InternalAuditEventCreateView.as_view(), name='internal-audit-event-create'),
    path('activity/', views.ActivityJournalViewSet.as_view(), name='activity-journal'),
]
