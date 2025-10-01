// Tab functionality
function showTab(tabId, tabElement) {
    // Remove active class from all tabs and content
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    // Add active class to clicked tab and corresponding content
    tabElement.classList.add('active');
    document.getElementById(tabId).classList.add('active');
}

const DEFAULT_FETCH_INTERVAL = 80000;
const bodyElement = document.body;
const fetchIntervalAttr = bodyElement ? bodyElement.dataset.fetchInterval : undefined;
const parsedInterval = parseInt(fetchIntervalAttr, 10);
const FETCH_INTERVAL = Number.isFinite(parsedInterval) ? parsedInterval : DEFAULT_FETCH_INTERVAL;
const FETCH_URL = bodyElement ? bodyElement.dataset.fetchUrl || '' : '';
const NEWS_DETAIL_BASE = bodyElement ? bodyElement.dataset.newsDetailUrl || '' : '';
const SEEN_NEWS_STORAGE_KEY = 'seenNews';
const READ_ARTICLES_STORAGE_KEY = 'readArticles';

function readArrayFromStorage(key) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) {
            return [];
        }

        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.warn(`Failed to parse stored data for "${key}"`, error);
        return [];
    }
}

let seenLinksCache = new Set(readArrayFromStorage(SEEN_NEWS_STORAGE_KEY));
let initialUpdate = true;

// News notification system
// Handle live updates without full page refresh
async function fetchAndUpdate() {
    if (!FETCH_URL) {
        return;
    }

    try {
        const response = await fetch(FETCH_URL, { headers: { 'Accept': 'application/json' } });
        if (!response.ok) {
            throw new Error(`Failed to fetch latest headlines: ${response.status}`);
        }

        const data = await response.json();
        const newArticlesCount = applyUpdates(data || {});

        updateSeenNewsCacheFromDom();
        initializeReadStates();

        if (newArticlesCount > 0 && !initialUpdate) {
            triggerNewArticleFeedback(newArticlesCount);
        }
    } catch (error) {
        console.error('Live update error:', error);
    } finally {
        initialUpdate = false;
    }
}

function applyUpdates(payload) {
    let newCount = 0;
    newCount += updateSource('onlinekhabar', payload.onlinekhabar, {
        transformLink: createDetailLink,
        supportsReadState: true,
    });
    newCount += updateSource('ronb', payload.ronb, {
        itemClassNames: ['news-item'],
    });
    newCount += updateSource('hp', payload.hp, {
        itemClassNames: ['news-item'],
    });
    return newCount;
}

function updateSource(sectionId, articles, options = {}) {
    const section = document.getElementById(sectionId);
    if (!section || !Array.isArray(articles)) {
        return 0;
    }

    const list = section.querySelector('.news-list');
    if (!list) {
        return 0;
    }

    const {
        transformLink,
        supportsReadState = false,
        itemClassNames = supportsReadState ? ['news-item', 'unread'] : ['news-item'],
    } = options;

    const existingLinks = new Set(
        Array.from(list.querySelectorAll('.news-item'))
            .map(getArticleUrlFromItem)
            .filter(Boolean)
    );

    // Remove empty state placeholders when fresh data arrives
    if (articles.length) {
        list.querySelectorAll('.empty-state').forEach(node => node.remove());
    }

    let newItems = 0;

    articles.forEach(article => {
        const articleLink = article && article.link;
        if (!articleLink || existingLinks.has(articleLink)) {
            return;
        }

        const listItem = document.createElement('li');
        listItem.className = itemClassNames.join(' ');
        listItem.dataset.articleUrl = articleLink;
        if (supportsReadState) {
            listItem.dataset.supportsReadState = 'true';
        }

        const anchor = document.createElement('a');
        anchor.className = 'news-link';
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.href = transformLink ? transformLink(articleLink) : articleLink;

        if (supportsReadState) {
            anchor.dataset.articleUrl = articleLink;
            anchor.addEventListener('click', () => markAsRead(anchor));
        }

        const content = document.createElement('div');
        content.className = 'news-content';

        const titleDiv = document.createElement('div');
        titleDiv.className = 'news-title';
        titleDiv.textContent = article.title || '';
        content.appendChild(titleDiv);

        const metaDiv = document.createElement('div');
        metaDiv.className = 'news-meta';

        const timeDiv = document.createElement('div');
        timeDiv.className = 'news-time';
        timeDiv.textContent = article.time || '';
        metaDiv.appendChild(timeDiv);

        content.appendChild(metaDiv);
        anchor.appendChild(content);

        const indicator = document.createElement('div');
        indicator.className = 'external-indicator';
        anchor.appendChild(indicator);

        listItem.appendChild(anchor);

        const firstElement = list.firstElementChild;
        if (firstElement) {
            list.insertBefore(listItem, firstElement);
        } else {
            list.appendChild(listItem);
        }

        existingLinks.add(articleLink);
        if (!seenLinksCache.has(articleLink)) {
            newItems += 1;
        }
    });

    return newItems;
}

function createDetailLink(articleLink) {
    if (!NEWS_DETAIL_BASE) {
        return articleLink;
    }

    try {
        const detailUrl = new URL(NEWS_DETAIL_BASE, window.location.origin);
        detailUrl.searchParams.set('url', articleLink);
        return `${detailUrl.pathname}${detailUrl.search}`;
    } catch (error) {
        console.warn('Failed to construct detail URL, falling back to article link.', error);
        return articleLink;
    }
}

function triggerNewArticleFeedback(count) {
    if (count <= 0) {
        return;
    }

    const audio = document.getElementById('newsSound');
    if (audio) {
        audio.play().catch(err => {
            console.log('Autoplay blocked, user interaction needed:', err);
        });
    }

    showNewArticlesNotification(count);
}

function startLiveUpdates() {
    if (!FETCH_URL) {
        console.warn('Live update endpoint is not configured.');
        return;
    }

    fetchAndUpdate();

    if (Number.isFinite(FETCH_INTERVAL) && FETCH_INTERVAL > 0) {
        setInterval(fetchAndUpdate, FETCH_INTERVAL);
    }
}

function getArticleUrlFromItem(item) {
    if (!item) {
        return null;
    }

    if (item.dataset && item.dataset.articleUrl) {
        return item.dataset.articleUrl;
    }

    const linkElement = item.querySelector('.news-link');
    if (!linkElement) {
        return null;
    }

    return linkElement.dataset.articleUrl || linkElement.getAttribute('href');
}

function updateSeenNewsCacheFromDom() {
    const allLinks = Array.from(document.querySelectorAll('.news-item'))
        .map(getArticleUrlFromItem)
        .filter(Boolean);

    seenLinksCache = new Set(allLinks);
    localStorage.setItem(SEEN_NEWS_STORAGE_KEY, JSON.stringify(Array.from(seenLinksCache)));
}

document.addEventListener('DOMContentLoaded', () => {
    initializeReadStates();
    updateSeenNewsCacheFromDom();
    startLiveUpdates();
});

// Mark article as read
function markAsRead(linkElement) {
    if (!linkElement) {
        return;
    }

    const newsItem = linkElement.closest('.news-item');
    if (!newsItem) {
        return;
    }

    const articleUrl = linkElement.dataset.articleUrl || newsItem.dataset.articleUrl || linkElement.getAttribute('href');
    if (!articleUrl || !itemSupportsReadState(newsItem)) {
        return;
    }

    newsItem.classList.remove('unread');
    newsItem.classList.add('read');

    const readArticles = readArrayFromStorage(READ_ARTICLES_STORAGE_KEY);
    if (!readArticles.includes(articleUrl)) {
        readArticles.push(articleUrl);
        localStorage.setItem(READ_ARTICLES_STORAGE_KEY, JSON.stringify(readArticles));
    }
}

// Initialize read/unread states from localStorage
function initializeReadStates() {
    const readArticles = readArrayFromStorage(READ_ARTICLES_STORAGE_KEY);

    document.querySelectorAll('.news-item').forEach(item => {
        if (!itemSupportsReadState(item)) {
            return;
        }

        const articleUrl = getArticleUrlFromItem(item);
        if (!articleUrl) {
            return;
        }

        if (readArticles.includes(articleUrl)) {
            item.classList.add('read');
            item.classList.remove('unread');
        } else {
            item.classList.add('unread');
            item.classList.remove('read');
        }
    });
}

function itemSupportsReadState(item) {
    return Boolean(item && item.dataset && item.dataset.supportsReadState === 'true');
}

function showNewArticlesNotification(count) {
    // Create a subtle notification
    const notification = document.createElement('div');
    notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: var(--success-color);
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: var(--shadow-md);
    z-index: 1000;
    font-size: 0.875rem;
    animation: slideInRight 0.3s ease-out;
    `;
    notification.textContent = `${count} new article${count > 1 ? 's' : ''} available!`;

    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add CSS for notification animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);
