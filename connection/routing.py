# chat/routing.py
from django.urls import re_path

from . import consumers

websocket_urlpatterns = [
    re_path(r"ws/connect/(?P<room_name>\w+)/$", consumers.SharingConsumer.as_asgi()),
]
