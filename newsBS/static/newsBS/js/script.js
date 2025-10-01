// Tab functionality
function showTab(tabId, tabElement) {
    // Remove active class from all tabs and content
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    // Add active class to clicked tab and corresponding content
    tabElement.classList.add('active');
    document.getElementById(tabId).classList.add('active');
}

const FETCH_INTERVAL = parseInt(document.body.dataset.fetchInterval || '80000', 10);
const FETCH_URL = document.body.dataset.fetchUrl || '';
const NEWS_DETAIL_BASE = document.body.dataset.newsDetailUrl || '';
let seenLinksCache = new Set(JSON.parse(localStorage.getItem('seenNews')) || []);
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
    newCount += updateSource('ronb', payload.ronb);
    newCount += updateSource('hp', payload.hp);
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
        listItem.className = 'news-item unread';
        listItem.dataset.articleUrl = articleLink;

        const anchor = document.createElement('a');
        anchor.className = 'news-link';
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.href = options.transformLink ? options.transformLink(articleLink) : articleLink;

        if (options.supportsReadState) {
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

    return (
        item.dataset.articleUrl ||
        (item.querySelector('.news-link') && (item.querySelector('.news-link').dataset.articleUrl || item.querySelector('.news-link').getAttribute('href')))
    );
}

function updateSeenNewsCacheFromDom() {
    const allLinks = Array.from(document.querySelectorAll('.news-item'))
        .map(getArticleUrlFromItem)
        .filter(Boolean);

    seenLinksCache = new Set(allLinks);
    localStorage.setItem('seenNews', JSON.stringify(Array.from(seenLinksCache)));
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
    if (!articleUrl) {
        return;
    }

    newsItem.classList.remove('unread');
    newsItem.classList.add('read');

    let readArticles = JSON.parse(localStorage.getItem('readArticles')) || [];
    if (!readArticles.includes(articleUrl)) {
        readArticles.push(articleUrl);
        localStorage.setItem('readArticles', JSON.stringify(readArticles));
    }
}

// Initialize read/unread states from localStorage
function initializeReadStates() {
    const readArticles = JSON.parse(localStorage.getItem('readArticles')) || [];

    document.querySelectorAll('.news-item').forEach(item => {
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
