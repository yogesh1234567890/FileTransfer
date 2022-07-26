from django.urls import path

from . import views

app_name = "connection"
urlpatterns = [
    path("", views.dashboard, name="dashboard"),
    # path('<str:room_name>/', views.room, name='room'),
    path("file_upload/", views.file_upload, name="file_upload"),
    path("generate_code/", views.generate_code, name="generate_code"),
]
