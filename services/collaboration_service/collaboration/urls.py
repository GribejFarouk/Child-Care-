from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ChildShareViewSet, MessageViewSet, ConsultationViewSet, InternalAccessCheckView, InternalSharesByChildrenView

router = DefaultRouter()
router.register(r'shares', ChildShareViewSet, basename='share')
router.register(r'messages', MessageViewSet, basename='message')
router.register(r'consultations', ConsultationViewSet, basename='consultation')

urlpatterns = [
    path('', include(router.urls)),
    path('internal/access-check/', InternalAccessCheckView.as_view(), name='internal-access-check'),
    path('internal/shares-by-children/', InternalSharesByChildrenView.as_view(), name='internal-shares-by-children'),
]
