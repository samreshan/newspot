# Samrey's Newspot

Samrey's Newspot is a Django application that aggregates Nepali news headlines from
multiple publishers and surfaces them in a single, continuously updating dashboard.
The project scrapes Routine of Nepal Banda, OnlineKhabar, and Hamro Patro, and it can
optionally call Google's Gemini models to translate or summarise individual articles
from the detail view.

## Features

- **Multi-source aggregation** – scrapes three Nepali news portals with `requests`
  and `BeautifulSoup`.
- **Live headline updates** – the homepage periodically polls `/fetch-latest/` and
  highlights articles you have not seen before, including optional audio cues.
- **Article detail enhancements** – fetches the original article HTML, extracts the
  main content, and exposes AI-assisted translation and summarisation buttons
  (requires a Gemini API key).
- **JSON endpoints** – `/fetch-latest/` and `/ai-helper/` expose data and AI services
  that can be reused by other clients.
- **Production-ready defaults** – ships with WhiteNoise, a `DockerFile` that runs
  Gunicorn, and static asset handling for cloud deployment.

## Requirements

- Python 3.11 or newer (the provided Docker image uses `python:3.11-slim`)
- pip and virtual environment tooling
- A Google Gemini API key (only if you plan to use the AI helper endpoint)

Although `settings.py` was generated for Django 3.2, the project currently depends on
`Django>=4.2` (see `requirements.txt`). Installing the listed requirements will pull in
an appropriate runtime automatically.

## Getting started

1. **Clone the repository**
   ```bash
   git clone https://github.com/<your-org>/newspot.git
   cd newspot
   ```
2. **Create a virtual environment**
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows use `.venv\\Scripts\\activate`
   ```
3. **Install dependencies**
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```
4. **Configure environment variables**
   ```bash
   cp .env.example .env
   # edit .env and populate GEMINI_API_KEY if you want AI features
   ```
5. **Apply migrations** (the project has no models yet, but this keeps the database
   ready for future development):
   ```bash
   python manage.py migrate
   ```
6. **Run the development server**
   ```bash
   python manage.py runserver
   ```
7. Visit `http://127.0.0.1:8000/` to view the dashboard. Click a headline to open the
   enhanced article page in a new tab.

## Environment variables

| Variable        | Description                                                        |
|-----------------|--------------------------------------------------------------------|
| `GEMINI_API_KEY` | Google Generative Language API key used by the `/ai-helper/` view. |

If the key is not provided, the AI helper endpoint will return an error and the
Translate/Summarise buttons on the detail page will not work.

## Available scripts and endpoints

| Command / Endpoint       | Purpose |
|--------------------------|---------|
| `python manage.py runserver` | Run the Django development server. |
| `python manage.py collectstatic` | Gather static assets before deploying (WhiteNoise serves them). |
| `GET /fetch-latest/` | Returns the latest scraped headlines for each source as JSON. |
| `POST /ai-helper/` | Accepts `{ "prompt": "..." }` and proxies it to Gemini, returning `{ "text": "..." }`. |
| `GET /news-detail/?url=<article-url>` | Renders a cleaned article view with optional AI assistance. |

## Docker usage

A `DockerFile` is included for containerised deployments:

```bash
docker build -t newspot .
docker run -p 8000:8000 --env-file .env newspot
```

The image installs Python dependencies, collects static assets, and serves the site
with Gunicorn.

## Static files

Static assets live under `newsBS/static/` and are referenced via Django's `static`
template tag. During development they are served automatically; in production, run
`python manage.py collectstatic` so WhiteNoise (or your hosting platform) can serve
the collected files from `staticfiles/`.

## Testing

No automated tests are provided yet. You can scaffold your own using Django's test
runner:

```bash
python manage.py test
```

## Scraping considerations

The scraper honours a short timeout and only retrieves a subset of each site's public
homepage. When deploying, review the terms of service for each source and consider
adding caching, rate limiting, and polite request headers to minimise load.

## Contributing

1. Fork and clone the repository.
2. Create a feature branch: `git checkout -b feature/my-update`.
3. Commit your changes with clear messages.
4. Push and open a pull request.

Please ensure any new dependencies are added to `requirements.txt` and accompany new
features with tests where possible.

## License

This project currently does not include an explicit license. Add one before
publishing or distributing the software.
