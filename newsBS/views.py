from django.shortcuts import render
from django.http import Http404
import requests
from bs4 import BeautifulSoup

# ========================
# SCRAPING FUNCTIONS
# ========================

def news_detail(request):
    url = request.GET.get("url")
    if not url:
        raise Http404("Article not found")

    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        response.encoding = 'utf-8'  # <-- force UTF-8
    except Exception:
        raise Http404("Unable to fetch article")

    soup = BeautifulSoup(response.text, "html.parser")

    # Headline
    title_tag = soup.select_one("h1.entry-title")
    title = title_tag.get_text(strip=True) if title_tag else "No Title"

    # Time
    time_tag = soup.select_one(".ok-news-post-hour span, time")
    time = time_tag.get_text(strip=True) if time_tag else "Unknown time"

    # Author
    author_tag = soup.select_one(".ok-news-author .author-name, .author, .post-author")
    author = author_tag.get_text(strip=True) if author_tag else "Unknown author"

    # Main content
    content_div = soup.select_one(".ok18-single-post-content-wrap")
    paragraphs = []
    if content_div:
        paragraphs = [
            p.get_text(strip=True)
            for p in content_div.select("p")
            if len(p.get_text(strip=True)) > 50
        ]

    # AI Summary
    summary_items = [
        li.get_text(strip=True)
        for li in soup.select(".ai_summary_block_list li")
    ]

    context = {
        "title": title,
        "time": time,
        "author": author,
        "paragraphs": paragraphs,
        "summary": summary_items,
        "source_url": url,
    }

    return render(request, "newsBS/news_detail.html", context)



def scrape_ronbpost():
    url = "https://www.ronbpost.com/"
    news_list = []
    try:
        response = requests.get(url)
        response.encoding = "utf-8"  # Handle Nepali text properly
        soup = BeautifulSoup(response.text, "html.parser")

        # Target the main news block
        articles = soup.find_all("div", class_="uk-card")[:10]  # Limit to top 10

        for article in articles:
            # Title + Link
            title_tag = article.find("h1", class_="main-banner")
            link_tag = title_tag.find("a") if title_tag else None
            title = link_tag.text.strip() if link_tag else None
            link = link_tag["href"] if link_tag else None

            # Subtitle (optional)
            subtitle_tag = article.find("h3", class_="sub-title")
            subtitle = subtitle_tag.get_text(strip=True) if subtitle_tag else ""

            # Short Description (optional)
            desc_tag = article.find("p", class_="uk-margin-remove-bottom uk-text-lead")
            description = desc_tag.get_text(strip=True) if desc_tag else ""

            if title and link:
                news_list.append({
                    "title": title,
                    "link": link,
                    "subtitle": subtitle,
                    "description": description
                })
    except Exception as e:
        print("RONB scrape error:", e)
    return news_list

def scrape_onlinekhabar():
    url = "https://www.onlinekhabar.com/"
    news_list = []
    try:
        response = requests.get(url)
        response.encoding = "utf-8"  # Ensure Nepali text is parsed correctly
        soup = BeautifulSoup(response.text, "html.parser")

        # Target only sections with class "ok-bises" (the headlines you want)
        articles = soup.find_all("section", class_="ok-bises")[:10]

        for article in articles:
            title_tag = article.find("h2").find("a")
            title = title_tag.text.strip() if title_tag else None
            link = title_tag["href"] if title_tag else None

            # Time field (optional)
            time_tag = article.find("div", class_="ok-news-post-hour")
            time = time_tag.get_text(strip=True) if time_tag else "N/A"

            if title and link:
                news_list.append({"title": title, "link": link, "time": time})
    except Exception as e:
        print("OnlineKhabar scrape error:", e)
    return news_list

def scrape_hamropatro():
    url = "https://www.hamropatro.com/news"
    news_list = []
    try:
        response = requests.get(url)
        response.encoding = "utf-8"  # Handle Nepali text properly
        soup = BeautifulSoup(response.text, "html.parser")

        # Each news card is inside div.item.newsCard
        articles = soup.find_all("div", class_="item newsCard")[:10]

        for article in articles:
            # Title + Link
            title_tag = article.find("h2", class_="newsheadingMobile")
            link_tag = title_tag.find("a") if title_tag else None
            title = link_tag.get_text(strip=True) if link_tag else None
            relative_link = link_tag["href"] if link_tag else None
            link = f"https://www.hamropatro.com{relative_link}" if relative_link else None

            # Description
            desc_tag = article.find("div", class_="desc")
            description = desc_tag.get_text(strip=True) if desc_tag else ""

            # Source + Time
            source_tag = article.find("div", class_="source")
            source = source_tag.get_text(" ", strip=True) if source_tag else ""
            time = ""
            if source_tag and source_tag.find("span"):
                time = source_tag.find("span").get_text(strip=True)

            if title and link:
                news_list.append({
                    "title": title,
                    "link": link,
                    "description": description,
                    "source": source,
                    "time": time
                })
    except Exception as e:
        print("HamroPatro scrape error:", e)
    return news_list



# ========================
# MAIN VIEW
# ========================
def index(request):
    context = {
        "ronb": scrape_ronbpost(),
        "onlinekhabar": scrape_onlinekhabar(),
        "hp": scrape_hamropatro(),
    }
    return render(request, "newsBS/index.html", context)
