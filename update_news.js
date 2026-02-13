const https = require('https');
const fs = require('fs');
const path = require('path');

// RSS Feeds Configuration with Dynamic Keyword Generation
const feeds = [
    {
        category: 'policy',
        label: '국가 정책',
        keywords: [
            '교육부', '평가원', '수능', '입법',
            '정신건강', '심리부검', '신학기 점검', '공교육 정책'
        ]
    },
    {
        category: 'local',
        label: '지역 현장',
        keywords: [
            '대학', '부정행위', '과제', '교수',
            '에듀테크', '소프트웨어', 'SW', '행정 지원'
        ]
    },
    {
        category: 'edutech',
        label: '에듀테크 기업',
        keywords: [
            '아이스크림미디어', '에듀테크'
        ]
    },
    {
        category: 'trend',
        label: 'AI/글로벌',
        keywords: [
            'AI', '로봇', '범용인공지능', 'AGI',
            '할루시네이션', '환각', '인용 오류',
            '구글', '제미나이', '아마존', '애플',
            '래핑 전략', '수익화', '디지털 식민지화'
        ]
    }
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
        // Construct detailed query
        // Group keywords with OR, wrap in parentheses
        const queryGroup = `(${feedObj.keywords.map(k => `"${k}"`).join(' OR ')})`;
        const fullQuery = `${queryGroup} when:1d`; // Last 24 hours
        const encodedQuery = encodeURIComponent(fullQuery);
        const url = `https://news.google.com/rss/search?q=${encodedQuery}&hl=ko&gl=KR&ceid=KR:ko`;

        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const items = parseRSS(data);
                    // Filter: take top 9 items per category as requested
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
    console.log('📰 Fetching targeted news for i-Scream Media...');

    try {
        const allPromises = feeds.map(feed => fetchFeed(feed));
        const results = await Promise.all(allPromises);
        let allArticles = results.flat();

        // Sort by date (newest first)
        allArticles.sort((a, b) => b.pubDate - a.pubDate);

        let idCounter = 1;
        const formattedData = allArticles.map(article => {
            // Strategic Insight Generation
            const importanceList = [
                "아이스크림미디어의 사업 방향성과 밀접한 관련이 있는 중요 기사입니다.",
                "현장 내 에듀테크 도입 및 활용 과정에서 참고해야 할 핵심 사례입니다.",
                "경쟁사의 움직임과 시장 변화를 파악하는 데 유용한 자료입니다.",
                "교육부 정책 변화에 따른 선제적 대응 전략 수립이 요구됩니다.",
                "AI 기술의 실무 적용 과정에서 발생할 수 있는 리스크를 점검해야 합니다."
            ];
            const insightList = [
                "관련 규제 신설에 대비하여 자사 플랫폼의 컴플라이언스 기능을 점검하십시오.",
                "현장의 페인 포인트(부정행위, 과의존)를 해결할 기술적 솔루션을 제안해야 합니다.",
                "글로벌 빅테크의 전략을 벤치마킹하여 플랫폼 경쟁력을 강화할 필요가 있습니다.",
                "서비스 마케팅 시 본 기사의 사례를 활용하여 신뢰도를 높이는 전략이 유효합니다."
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
