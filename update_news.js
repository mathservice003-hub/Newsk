const https = require('https');
const fs = require('fs');
const path = require('path');

// Helper: Unescape HTML Entities & Strip Tags Aggressively
function cleanText(str) {
    if (!str) return "";

    // 0. Pre-formatting: Replace outline tags with newlines for better reading
    let formatted = str.replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/li>/gi, '\n');

    // 1. Decode entities
    let decoded = formatted.replace(/&lt;/g, '<')
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
            '대학', '대학교', '대학 총장', '학사 운영', '캠퍼스',
            '고등교육', 'LINC', '글로컬대학'
        ],
        exclusions: ['군', '참모총장', '국방부', '계엄', '내란', '의혹', '전투', '부대']
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

// Fetch Generic Function
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
                    const data = buffer.toString();

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
            // Strategic Insight Generation (Expanded to 3-4 lines)
            const importanceList = [
                "이 이슈는 아이스크림미디어의 기존 에듀테크 사업 모델에 직접적인 영향을 줄 수 있는 중요한 변화입니다. 특히 공교육 디지털 전환 정책과 맞물려 시장의 판도가 바뀔 가능성이 높으므로, 경쟁사의 대응 현황을 면밀히 모니터링하고 자사의 차별화된 기술력(AI 튜터 등)을 부각할 수 있는 방안을 모색해야 합니다.",
                "최근 교육 현장에서의 요구 사항이 반영된 뉴스로, 향후 플랫폼 고도화 방향 설정에 있어 중요한 참고 지표가 될 것입니다. 단순한 기능 제공을 넘어 교사와 학생의 실질적인 페인 포인트(Pain Point)를 해결해 줄 수 있는 솔루션으로서의 가치를 증명해야 하는 시점입니다.",
                "글로벌 빅테크 기업들의 교육 시장 진출 가속화와 맥락을 같이 하는 뉴스입니다. 이는 단기적으로는 경쟁 심화를 의미하지만, 장기적으로는 AI 기반 맞춤형 학습 시장의 전체 파이(Total Addressable Market)가 커지고 있음을 시사하므로 적극적인 투자가 필요합니다.",
                "정부 규제 및 표준화 움직임과 관련이 깊습니다. 특히 최근 강조되고 있는 'AI 디지털 교과서'의 법적 기준이나 윤리적 가이드라인 준수 여부가 쟁점이 될 수 있으므로, 선제적인 컴플라이언스 점검과 대관 업무 강화가 요구되는 시점입니다."
            ];
            const insightList = [
                "기획/개발 팀은 해당 뉴스에 언급된 기술적 기능(기능명, UX 동선 등)을 벤치마킹하여 차기 업데이트 로드맵에 반영하십시오. 특히 사용자 경험(UX) 측면에서 교사의 업무 경감을 돕는 자동화 기능이 강조되고 있음에 주목해야 합니다.",
                "마케팅 팀은 본 기사의 핵심 키워드를 활용하여 아이스크림미디어의 브랜드 메시지를 다듬어야 합니다. '선생님을 위한 AI', '안전한 에듀테크' 등의 키워드와 연계하여 자사 서비스의 신뢰도를 높이는 콘텐츠(카드뉴스, 아티클) 발행을 검토해 보시기 바랍니다.",
                "영업 및 현장 지원 부서에서는 일선 학교 방문 시 이 이슈를 스몰토크 주제로 활용하여 교사들의 실제 반응을 수집하십시오. 현장의 목소리가 제품 개선으로 이어지는 선순환 구조를 만들기 위해, 수집된 피드백을 주간 회의에서 반드시 공유해야 합니다."
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
                // Increase limit to 800 chars to show full context
                content: article.description.length > 50 ? article.description.substring(0, 800) + (article.description.length > 800 ? "..." : "") : "본문 요약 정보를 불러오는 중입니다. 자세한 내용은 상단의 [원문 보러가기]를 통해 확인해 주시기 바랍니다.",
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
