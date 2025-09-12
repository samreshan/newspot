
// Tab functionality
function showTab(tabId, tabElement) {
    // Remove active class from all tabs and content
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // Add active class to clicked tab and corresponding content
    tabElement.classList.add('active');
    document.getElementById(tabId).classList.add('active');
}

// News notification system
document.addEventListener("DOMContentLoaded", function() {
    // Initialize read/unread states
    initializeReadStates();
    
    let storedLinks = JSON.parse(localStorage.getItem("seenNews")) || [];
    
    // Collect all current article links from the DOM
    let currentLinks = Array.from(document.querySelectorAll(".news-link"))
    .map(a => a.getAttribute("href"));
    
    // Find new links
    let newLinks = currentLinks.filter(link => !storedLinks.includes(link));
    
    if (newLinks.length > 0 && storedLinks.length > 0) {
    // Play sound only if it's not the first load
    const audio = document.getElementById("newsSound");
    if (audio) {
        audio.play().catch(e => {
        console.log("Autoplay blocked, user interaction needed:", e);
        });
    }
    
    // Show notification
    showNewArticlesNotification(newLinks.length);
    }
    
    // Save current links for next refresh
    localStorage.setItem("seenNews", JSON.stringify(currentLinks));
});

// Mark article as read
function markAsRead(linkElement) {
    const newsItem = linkElement.closest('.news-item');
    const articleUrl = newsItem.getAttribute('data-article-url');
    
    // Update visual state
    newsItem.classList.remove('unread');
    newsItem.classList.add('read');
    
    // Save to localStorage
    let readArticles = JSON.parse(localStorage.getItem("readArticles")) || [];
    if (!readArticles.includes(articleUrl)) {
    readArticles.push(articleUrl);
    localStorage.setItem("readArticles", JSON.stringify(readArticles));
    }
}

// Initialize read/unread states from localStorage
function initializeReadStates() {
    const readArticles = JSON.parse(localStorage.getItem("readArticles")) || [];
    
    document.querySelectorAll('.news-item').forEach(item => {
    const articleUrl = item.getAttribute('data-article-url');
    if (readArticles.includes(articleUrl)) {
        item.classList.remove('unread');
        item.classList.add('read');
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
