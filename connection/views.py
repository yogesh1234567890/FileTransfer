from unittest import result
from django.shortcuts import render
from django.http import HttpResponse
from django.views import View
import string, random


class GreetingView(View):
    greeting = "Good Day"

    def get(self, request):
        return HttpResponse(self.greeting)


def index(request):
    return render(request, "index.html", {})


def room(request, room_name):
    return render(request, "room.html", {"room_name": room_name})


def generate_code(request):
    letters = string.ascii_lowercase
    result_str = "".join(random.choice(letters) for i in range(10))
    return result_str


def file_upload(request):
    code = generate_code(request)
    return render(request, "file_upload.html", {"code": code})
