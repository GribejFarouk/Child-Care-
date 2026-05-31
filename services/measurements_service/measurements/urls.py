from django.urls import path
from . import views

urlpatterns = [
    path('', views.MeasurementListCreateView.as_view(), name='measurement-list-create'),
    path('<uuid:id>/', views.MeasurementRetrieveUpdateDestroyView.as_view(), name='measurement-detail'),
    path('internal/create/', views.InternalMeasurementCreateView.as_view(), name='internal-measurement-create'),
    path('internal/context/', views.InternalMeasurementContextView.as_view(), name='internal-measurement-context'),
]
