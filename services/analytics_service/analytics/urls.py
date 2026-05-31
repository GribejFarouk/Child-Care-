from django.urls import path
from . import views

urlpatterns = [
    path('measurements/analyze/', views.AnalyzeMeasurementView.as_view(), name='analyze-measurement'),
    path('alerts/', views.AlertListView.as_view(), name='alert-list'),
    path('alerts/<uuid:id>/', views.AlertDetailView.as_view(), name='alert-detail'),
    path('alerts/<uuid:id>/read/', views.AlertMarkReadView.as_view(), name='alert-mark-read'),
    path('references/growth/', views.GrowthReferenceView.as_view(), name='growth-reference'),
    path('recommendations/', views.RecommendationListView.as_view(), name='recommendation-list'),
    path('recommendations/<uuid:id>/', views.RecommendationDetailView.as_view(), name='recommendation-detail'),
    path('recommendations/<uuid:id>/read/', views.RecommendationMarkReadView.as_view(), name='recommendation-mark-read'),
    path('risk-score/<uuid:child_id>/', views.ChildRiskScoreView.as_view(), name='child-risk-score'),
    
    # Phase 12.5 endpoints
    path('findings/', views.ClinicalFindingListView.as_view(), name='finding-list'),
    path('internal/assistant-context/', views.AssistantContextView.as_view(), name='internal-assistant-context'),
]
