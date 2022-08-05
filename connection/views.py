from django.shortcuts import render
import string
import random


def generate_code(request):
    letters = string.ascii_lowercase
    result_str = "".join(random.choice(letters) for i in range(10))
    return result_str


def file_upload(request):
    return render(request, "file_up.html")


def dashboard(request):
    return render(request, "index.html")


def actionPage(request):
    code = generate_code(request)
    return render(request, "transfer.html", {"code": code})
