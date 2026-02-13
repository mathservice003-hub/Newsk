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
                'policy': '🏛️ 국가 정책',
                'local': '🏫 지역 현장',
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
            'policy': '🏛️ 국가 정책',
            'local': '🏫 지역 현장',
            'edutech': '🚀 에듀테크 기업',
            'trend': '🌎 AI/글로벌'
        }[item.category];

        document.getElementById('modal-category').className = `badge ${item.category}`; // For color styling if needed, currently inline style in CSS uses .badge
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
    // Close on Escape Key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (modal.classList.contains('active')) closeModal();
            if (document.getElementById('paste-modal').classList.contains('active')) closePasteModal();
        }
    });

    // --- Newsletter Paste Feature ---
    const pasteModal = document.getElementById('paste-modal');
    const openPasteBtn = document.getElementById('open-paste-modal');
    const closePasteBtn = document.getElementById('close-paste-modal');
    const convertBtn = document.getElementById('convert-btn');
    const pasteArea = document.getElementById('paste-area');

    function openPasteModal() {
        pasteModal.classList.remove('hidden');
        requestAnimationFrame(() => pasteModal.classList.add('active'));
    }

    function closePasteModal() {
        pasteModal.classList.remove('active');
        setTimeout(() => pasteModal.classList.add('hidden'), 300);
    }

    openPasteBtn.addEventListener('click', openPasteModal);
    closePasteBtn.addEventListener('click', closePasteModal);
    pasteModal.querySelector('.modal-overlay').addEventListener('click', closePasteModal);

    convertBtn.addEventListener('click', () => {
        const text = pasteArea.value;
        if (!text.trim()) {
            alert('내용을 입력해주세요!');
            return;
        }

        const parsedData = parseNewsletter(text);
        if (parsedData.length === 0) {
            alert('기사를 찾을 수 없습니다. (URL이 포함되어 있는지 확인해주세요)');
            return;
        }

        // Render parsed data
        renderNews(parsedData);
        closePasteModal();
        alert(`${parsedData.length}개의 기사로 변환되었습니다!`);
    });

    // Simple Smart Parser
    function parseNewsletter(text) {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l);
        const articles = [];
        let currentArticle = {};

        // Loop through lines to find URL anchors
        lines.forEach((line, index) => {
            // Check if line is a URL
            if (line.match(/https?:\/\/[^\s]+/)) {
                // If we found a URL, the PREVIOUS line is likely the Title
                if (index > 0) {
                    let title = lines[index - 1];
                    let url = line.match(/https?:\/\/[^\s]+/)[0];

                    // Simple Category Detection from Title or Content
                    let category = 'trend'; // default
                    if (title.includes('정책') || title.includes('교육부')) category = 'policy';
                    if (title.includes('대학') || title.includes('현장')) category = 'local';
                    if (title.includes('아이스크림') || title.includes('에듀테크')) category = 'edutech';

                    // Clean Title (remove leading numbers like "1. ", "- ")
                    title = title.replace(/^[\d\.\-\s]+/, '');

                    articles.push({
                        id: Date.now() + index,
                        category: category,
                        title: title,
                        date: new Date().toLocaleDateString(), // Today
                        oneLine: title,
                        content: "(뉴스레터 원문 참조)", // Placeholder
                        importance: "뉴스레터에서 직접 변환된 기사입니다.",
                        insight: "팀 공유 및 아카이빙 용도로 활용하세요.",
                        url: url
                    });
                }
            }
        });

        // Fallback: If no URLs found, try to parse chunks (Advanced)
        // ... keeping it simple for now based on "URL is key" assumption

        return articles;
    }

});
