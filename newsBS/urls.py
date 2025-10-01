from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='indexpage'),
    path("news-detail/", views.news_detail, name="news_detail"),
    path("ai-helper/", views.ai_helper, name="ai_helper"),
    path("fetch-latest/", views.fetch_latest_headlines, name="fetch_latest_headlines"),
]
