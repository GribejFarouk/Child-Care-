from django.urls import path
from . import views

urlpatterns = [
    path('parent/me/', views.ParentProfileMeView.as_view(), name='parent-profile-me'),
    path('doctor/me/', views.DoctorProfileMeView.as_view(), name='doctor-profile-me'),
    path('doctors/<uuid:user_id>/', views.DoctorProfilePublicView.as_view(), name='doctor-profile-public'),
    path('children/', views.ChildListCreateView.as_view(), name='child-list-create'),
    path('children/<uuid:id>/', views.ChildRetrieveUpdateDestroyView.as_view(), name='child-detail'),
    path('internal/check-ownership/', views.InternalCheckOwnershipView.as_view(), name='internal-check-ownership'),
]
