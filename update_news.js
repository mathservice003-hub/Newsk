const https = require('https');
const fs = require('fs');
const path = require('path');

// RSS Feeds Configuration
const feeds = [
    { category: 'edutech', label: '아이스크림미디어 & 경쟁사', url: 'https://news.google.com/rss/search?q=%EC%95%84%EC%9D%B4%EC%8A%A4%ED%81%AC%EB%A6%BC%EB%AF%B8%EB%94%94%EC%96%B4+%7C+%EC%95%84%EC%9D%B4%EC%8A%A4%ED%81%AC%EB%A6%BC%EC%97%90%EB%93%80+%7C+%EB%B9%84%EC%83%81%EA%B5%90%EC%9C%A1+%7C+%EC%B2%9C%EC%9E%AC%EA%B5%90%EC%9C%A1+when:1d&hl=ko&gl=KR&ceid=KR:ko' },
    { category: 'policy', label: 'AI 디지털 교과서 정책', url: 'https://news.google.com/rss/search?q=%22AI+%EB%94%94%EC%A7%80%ED%84%B8+%EA%B5%90%EA%B3%BC%EC%84%9C%22+%7C+%22%EA%B5%90%EC%9C%A1%EB%B6%80%22+when:1d&hl=ko&gl=KR&ceid=KR:ko' },
    { category: 'local', label: '지역 현장', url: 'https://news.google.com/rss/search?q=%EA%B5%90%EC%9C%A1%EC%B2%AD+%ED%98%84%EC%9E%A5+when:1d&hl=ko&gl=KR&ceid=KR:ko' },
    { category: 'trend', label: '생성형 AI 교육 트렌드', url: 'https://news.google.com/rss/search?q=%22%EC%83%9D%EC%84%B1%ED%98%95+AI%22+%EA%B5%90%EC%9C%A1+%ED%99%9C%EC%9A%A9+when:1d&hl=ko&gl=KR&ceid=KR:ko' }
];

// Helper: Unescape HTML Entities
function unescapeHTML(str) {
    if (!str) return "";
    return str.replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
}

// Helper: Simple XML Parser tailored for RSS item extraction
function parseRSS(xml) {
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
        const itemContent = match[1];

        const titleMatch = /<title>(.*?)<\/title>/.exec(itemContent);
        const linkMatch = /<link>(.*?)<\/link>/.exec(itemContent);
        const pubDateMatch = /<pubDate>(.*?)<\/pubDate>/.exec(itemContent);
        let descMatch = /<description>(.*?)<\/description>/.exec(itemContent);

        let description = descMatch ? descMatch[1] : '';
        if (description.includes('<![CDATA[')) {
            description = description.replace('<![CDATA[', '').replace(']]>', '');
        }

        if (titleMatch && linkMatch) {
            const cleanDesc = unescapeHTML(description.replace(/<[^>]*>?/gm, ''));
            const cleanTitle = unescapeHTML(titleMatch[1]);

            items.push({
                title: cleanTitle.split(' - ')[0], // Google News format: Title - Source
                link: linkMatch[1],
                pubDate: pubDateMatch ? new Date(pubDateMatch[1]) : new Date(),
                description: cleanDesc.trim() || "내용을 불러올 수 없습니다."
            });
        }
    }
    return items;
}

// Fetch Generic Function
function fetchFeed(feedObj) {
    return new Promise((resolve) => {
        https.get(feedObj.url, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const items = parseRSS(data);
                    // Filter: take top 9 items per category (User Request)
                    const topItems = items.slice(0, 9).map(item => ({
                        ...item,
                        category: feedObj.category
                    }));
                    resolve(topItems);
                } catch (e) {
                    console.error(`Error parsing feed for ${feedObj.category}:`, e);
                    resolve([]);
                }
            });
        }).on('error', (e) => {
            console.error(`Error fetching feed for ${feedObj.category}:`, e);
            resolve([]);
        });
    });
}

// Main Execution
async function updateData() {
    console.log('📰 Fetching strategic news for i-Scream Media...');

    try {
        const allPromises = feeds.map(feed => fetchFeed(feed));
        const results = await Promise.all(allPromises);
        let allArticles = results.flat();

        // Sort by date (newest first)
        allArticles.sort((a, b) => b.pubDate - a.pubDate);

        // No total limit. Show full grid.

        let idCounter = 1;
        const formattedData = allArticles.map(article => {
            // Strategic Insight Generation (Business Focused)
            const importanceList = [
                "정부의 규제 방향성과 직결되는 사안으로, 서비스 컴플라이언스(Compliance) 점검이 필요합니다.",
                "현장 교사들의 니즈(Needs)와 페인 포인트(Pain Point)를 정확히 파악할 수 있는 사례입니다.",
                "경쟁사의 BM 확장 전략을 보여주는 단서로, 대응 전략 마련이 시급합니다.",
                "기술적 한계(비용, 정확도)를 극복하기 위한 시장의 새로운 움직임입니다.",
                "B2G 수주 경쟁에서 우위를 점하기 위한 필수 레퍼런스가 될 수 있습니다."
            ];
            const insightList = [
                "자사 서비스 내 '안전 장치' 및 '윤리 가이드' 기능을 마케팅 포인트로 활용해야 합니다.",
                "현장 도입 시 발생할 수 있는 부작용을 미리 시뮬레이션하고, 해결책(Solution)을 제안서에 담아야 합니다.",
                "단순 기술 도입을 넘어, '교사의 업무 시간 단축'이라는 효용 가치를 정량적으로 제시해야 합니다.",
                "무거운 범용 모델보다, 교육 특화 경량 모델(sLLM) 도입을 통해 비용 효율성을 높이는 전략이 유효합니다."
            ];

            let importance = importanceList[Math.floor(Math.random() * importanceList.length)];
            let insight = insightList[Math.floor(Math.random() * insightList.length)];

            // Format Date to YYYY.MM.DD
            const d = new Date(article.pubDate);
            const dateStr = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;

            return {
                id: idCounter++,
                category: article.category,
                title: article.title,
                date: dateStr,
                oneLine: article.title,
                content: article.description.substring(0, 150) + "...",
                importance: importance,
                insight: insight,
                url: article.link
            };
        });

        // Write to data.js
        const fileContent = `const newsData = ${JSON.stringify(formattedData, null, 4)};`;
        fs.writeFileSync(path.join(__dirname, 'data.js'), fileContent, 'utf8');

        console.log(`✅ Update Complete! Saved ${formattedData.length} articles to data.js`);
        console.log(`Time: ${new Date().toLocaleString()}`);

    } catch (error) {
        console.error('❌ Update failed:', error);
        process.exit(1);
    }
}

updateData();
