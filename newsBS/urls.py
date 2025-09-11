from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='indexpage'),
    path("news-detail/", views.news_detail, name="news_detail"),
]