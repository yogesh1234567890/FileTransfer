from django.contrib.auth.forms import UserCreationForm
from django import forms


class SignupForm(UserCreationForm):
    username = forms.CharField(
        max_length=100, widget=forms.TextInput(attrs={"class": "form-control"})
    )
    password1 = forms.CharField(
        label=("Password"),
        max_length=100,
        widget=forms.PasswordInput(
            attrs={"autocomplete": "new-password", "class": "form-control"}
        ),
    )
    password2 = forms.CharField(
        label=("Password confirmation"),
        max_length=100,
        widget=forms.PasswordInput(
            attrs={"autocomplete": "new-password", "class": "form-control"}
        ),
    )
