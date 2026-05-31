from django.contrib import admin
from django.urls import path, include
from events.views import InternalUpcomingEventsContextView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/calendar/internal/upcoming-context/', InternalUpcomingEventsContextView.as_view(), name='internal-upcoming-context'),
    path('api/calendar/events/', include('events.urls')),
]
