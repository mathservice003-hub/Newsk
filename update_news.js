const https = require('https');
const fs = require('fs');
const path = require('path');

// Helper: Unescape HTML Entities & Strip Tags Aggressively
function cleanText(str) {
    if (!str) return "";
    // 1. Decode entities
    let decoded = str.replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ');

    // 2. Remove ALL HTML tags
    decoded = decoded.replace(/<[^>]*>/g, '');

    // 3. Remove URLs manually if any remain (naive pattern)
    decoded = decoded.replace(/https?:\/\/[^\s]+/g, '');

    return decoded.trim();
}

// RSS Feeds Configuration with Dynamic Keyword Generation
const feeds = [
    {
        category: 'policy',
        label: '국가 정책',
        keywords: [
            '교육부', '평가원', '수능', '입법',
            '정신건강', '심리부검', '신학기 점검', '공교육 정책'
        ],
        exclusions: ['군청', '읍 사무소', '면 사무소', '이장', '마을', '농업', '축제']
    },
    {
        category: 'local',
        label: '지역 교육 현황',
        keywords: [
            '대학', '대학교', '대학 총장', '학사 운영', '캠퍼스', // '총장' -> '대학 총장' to avoid military ranks
            '고등교육', 'LINC', '글로컬대학'
        ],
        exclusions: ['군', '참모총장', '국방부', '계엄', '내란', '의혹', '전투', '부대'] // Explicitly exclude military/political keywords
    },
    {
        category: 'edutech',
        label: '에듀테크 기업',
        keywords: [
            '아이스크림미디어', '에듀테크'
        ],
        exclusions: ['구글', '애플', '아마존', '마이크로소프트', 'MS', '제미나이', 'GPT']
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
            // Use new cleanText function
            const cleanDesc = cleanText(description);
            const cleanTitle = cleanText(titleMatch[1]);

            items.push({
                title: cleanTitle.split(' - ')[0],
                link: linkMatch[1],
                pubDate: pubDateMatch ? new Date(pubDateMatch[1]) : new Date(),
                description: cleanDesc || "내용을 불러올 수 없습니다."
            });
        }
    }
    return items;
}

// Fetch Generic Function (Fixed for Encoding Issues)
function fetchFeed(feedObj) {
    return new Promise((resolve) => {
        // Construct detailed query
        const queryGroup = `(${feedObj.keywords.map(k => `"${k}"`).join(' OR ')})`;

        let exclusionStr = '';
        if (feedObj.exclusions && feedObj.exclusions.length > 0) {
            exclusionStr = ' ' + feedObj.exclusions.map(e => `-${e}`).join(' ');
        }

        const fullQuery = `${queryGroup}${exclusionStr} when:1d`;
        const encodedQuery = encodeURIComponent(fullQuery);
        const url = `https://news.google.com/rss/search?q=${encodedQuery}&hl=ko&gl=KR&ceid=KR:ko`;

        https.get(url, (res) => {
            // Use Buffer to handle multi-byte characters correctly
            const chunks = [];
            res.on('data', (chunk) => { chunks.push(chunk); });
            res.on('end', () => {
                try {
                    const buffer = Buffer.concat(chunks);
                    const data = buffer.toString(); // Convert buffer to string once complete

                    const items = parseRSS(data);
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

        allArticles.sort((a, b) => b.pubDate - a.pubDate);

        let idCounter = 1;
        const formattedData = allArticles.map(article => {
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

            const d = new Date(article.pubDate);
            const dateStr = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;

            return {
                id: idCounter++,
                category: article.category,
                title: article.title,
                date: dateStr,
                oneLine: article.title,
                content: article.description.substring(0, 300) + (article.description.length > 300 ? "..." : ""),
                importance: importance,
                insight: insight,
                url: article.link
            };
        });

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
