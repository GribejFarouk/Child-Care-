from django.urls import path
from . import views

urlpatterns = [
    path('conversations/', views.ConversationListView.as_view(), name='conversation-list'),
    path('conversations/<uuid:id>/', views.ConversationDetailView.as_view(), name='conversation-detail'),
    path('chat/', views.ChatView.as_view(), name='chat'),
]
