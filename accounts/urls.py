from django.urls import path
from .views import *

app_name = "accounts"

urlpatterns = [
    path("signup", signup, name="signup"),
    path("login", login_request, name="login"),
    path("logout", logout_request, name="logout"),
]
