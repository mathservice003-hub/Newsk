document.addEventListener('DOMContentLoaded', () => {
    const newsGrid = document.getElementById('news-feed');
    const navButtons = document.querySelectorAll('.nav-btn');
    const modal = document.getElementById('detail-modal');
    const closeModalBtn = document.querySelector('.close-btn');
    const modalOverlay = document.querySelector('.modal-overlay');

    // State
    let currentCategory = 'all';

    // Initial Render
    renderNews(newsData);

    // Navigation Filtering
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update Active State
            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Filter Data
            currentCategory = btn.dataset.category;
            const filteredData = currentCategory === 'all'
                ? newsData
                : newsData.filter(item => item.category === currentCategory);

            renderNews(filteredData);
        });
    });

    // Render Function
    function renderNews(data) {
        newsGrid.innerHTML = '';

        if (data.length === 0) {
            newsGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 4rem; color: var(--text-sub);">
                    <i class="ph ph-files" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <p>해당 카테고리의 기사가 없습니다.</p>
                </div>
            `;
            return;
        }

        data.forEach((item, index) => {
            const card = document.createElement('article');
            card.className = 'news-card';
            card.style.animationDelay = `${index * 0.1}s`; // Staggered animation

            // Category Badge Style
            const categoryLabel = {
                'iscream': '🍦 아이스크림미디어 소식',
                'policy': '🏛️ 국가 정책',
                'local': '🏫 지역 교육 현황',
                'edutech': '🚀 에듀테크 기업',
                'trend': '🌎 AI/글로벌'
            }[item.category];

            card.innerHTML = `
                <div class="card-header">
                    <span class="card-badge ${item.category}">${categoryLabel}</span>
                    <span class="card-date">${item.date}</span>
                </div>
                <h3 class="card-title">${item.title}</h3>
                <p class="card-summary">${item.oneLine}</p>
                <div class="card-footer">
                    자세히 보기 <i class="ph-bold ph-arrow-right"></i>
                </div>
            `;

            // Card Click Event -> Open Modal
            card.addEventListener('click', () => openModal(item));
            newsGrid.appendChild(card);
        });
    }

    // Modal Logic
    function openModal(item) {
        // Populate Data
        const categoryLabel = {
            'iscream': '🍦 아이스크림미디어 소식',
            'policy': '🏛️ 국가 정책',
            'local': '🏫 지역 교육 현황',
            'edutech': '🚀 에듀테크 기업',
            'trend': '🌎 AI/글로벌'
        }[item.category];

        document.getElementById('modal-category').className = `badge ${item.category}`; // For color styling if needed
        document.getElementById('modal-category').textContent = categoryLabel;
        document.getElementById('modal-date').textContent = item.date;
        document.getElementById('modal-title').textContent = item.title;
        document.getElementById('modal-link').href = item.url;

        document.getElementById('modal-one-line').textContent = item.oneLine;
        document.getElementById('modal-content').textContent = item.content;
        document.getElementById('modal-importance').textContent = item.importance;
        document.getElementById('modal-insight').textContent = item.insight;

        // Show Modal
        modal.classList.remove('hidden');
        // Small timeout to allow transition
        requestAnimationFrame(() => {
            modal.classList.add('active');
        });
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    function closeModal() {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300); // Match transition duration
        document.body.style.overflow = '';
    }

    // Modal Events
    closeModalBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', closeModal);

    // Close on Escape Key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });
});
