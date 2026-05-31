from django.urls import path
from . import views

urlpatterns = [
    path('extract/', views.OCRExtractView.as_view(), name='ocr-extract'),
    path('imports/', views.OCRImportListView.as_view(), name='ocr-import-list'),
    path('imports/<uuid:id>/', views.OCRImportDetailView.as_view(), name='ocr-import-detail'),
    path('imports/<uuid:id>/confirm/', views.OCRConfirmView.as_view(), name='ocr-import-confirm'),
]
