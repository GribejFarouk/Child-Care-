from django.urls import path
from . import views

urlpatterns = [
    path('register/parent/', views.RegisterParentView.as_view(), name='register-parent'),
    path('register/doctor/', views.RegisterDoctorView.as_view(), name='register-doctor'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('token/refresh/', views.CustomTokenRefreshView.as_view(), name='token-refresh'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('me/', views.MeView.as_view(), name='me'),
]
