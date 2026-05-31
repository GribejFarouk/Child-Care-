from django.urls import path
from .views import HealthEventListCreateView, HealthEventDetailView, HealthEventConfirmView

urlpatterns = [
    path('', HealthEventListCreateView.as_view(), name='event-list-create'),
    path('<uuid:pk>/', HealthEventDetailView.as_view(), name='event-detail'),
    path('<uuid:pk>/confirm/', HealthEventConfirmView.as_view(), name='event-confirm'),
]
