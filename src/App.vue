<template>


    <!-- 顶部的 Settings 模块 -->
    <div class="module" id="settings">

        <div class="settings-module">
            <h2>Setting:</h2>
            <!-- Filter by Angles -->
            <div class="setting-group">
                <div class="angles-container">
                    <h3>Filter by Angles:</h3>
                    <div v-for="angle in angles" :key="angle.subtheme_id"
                        :class="['color-tag', { selected: angle.selected }]" :style="{ backgroundColor: angle.color }"
                        @click="toggleAngleSelection(angle)"></div>
                </div>
            </div>

            <!-- Filter by Status -->
            <div class="setting-group">
                <div class="filter-status">
                    <h3>Filter by Status:</h3>
                    <select class="dropdown" v-model="filterStatus">
                        <option value="all">All</option>
                        <option value="unread">Unread</option>
                        <option value="read">Read</option>
                    </select>
                </div>
            </div>

            <!-- Sort Articles -->
            <div class="setting-group">
                <div class="sort-options">
                    <h3>Sort Articles:</h3>
                    <select class="dropdown" v-model="sortOrder">
                        <option value="publishedAt">By Published Time</option>
                        <option value="angleCategoryCount">By Number of Angle Categories   </option>
                        <option value="recommendationScore">By Angular Importance</option>
                        <option value="repetitionRate">By Similarity</option>
                        <option value="comprehensiveScore">By Composite Score</option>
                    </select>
                </div>
            </div>

            <!-- Weight Settings -->
            <div class="setting-group">
                <div class="weight-settings">
                    <h3>Weight Settings:</h3>
                    <div class="weight-slider">
                        <label>
                            <span>⭐ Angular Importance Weight:</span> {{ weights.recommendation.toFixed(2) }}
                        </label>
                        <input type="range" min="0" max="1" step="0.1" v-model.number="weights.recommendation"
                            @input="updateComprehensiveScores" />
                        <label>
                            <span>🔁 Similarity Weight:</span> {{ (1 - weights.recommendation).toFixed(2) }}
                        </label>
                    </div>
                </div>
            </div>

        </div>
    </div>


    <!-- 中间部分：三列布局 -->
    <div id="main-content">
        <!-- 左侧的 Articles 模块 -->
        <div class="module" id="article-list">
            <h2>Articles</h2>
            <div v-for="article in filteredAndSortedArticles" :key="article.id" class="article-card"
                :id="'article-' + article.id"
                @click="logDebug('Clicked article card: ' + article.id); showArticle(article, article.id)"
                @mouseover="highlightConnection(article.id, null)" @mouseout="removeHighlight()"
                :class="{ read: article.isRead, 'active': selectedArticleId === `${article.id}` }">

                <!-- 文章标题 -->
                <div class="article-title">{{ article.title }}</div>

                <!-- 发布时间 -->
                <div class="article-meta">
                    <span v-if="article.publishedAt"> 📅 {{ formatPublishedAt(article.publishedAt) }}</span>
                    <span v-if="article.domain">🌐 {{ article.domain }}</span>
                </div>
                <div class="article-meta">
                    <span v-if="article.recommendationScore !== undefined">
                        ⭐ Angular Importance: {{ article.recommendationScore.toFixed(2) }}
                    </span>
                    <span v-if="!article.isRead && article.repetitionRate !== null && !isNaN(article.repetitionRate)">
                        🔁 Similarity : {{ article.repetitionRate != null && !isNaN(article.repetitionRate) ?
                            article.repetitionRate.toFixed(2) : 'N/A' }}
                    </span>
                </div>
                <div class="article-meta">
                    <span
                        v-if="!article.isRead && article.comprehensiveScore !== null && !isNaN(article.comprehensiveScore)">
                        🏆 Composite Score: {{ article.comprehensiveScore != null &&
                            !isNaN(article.comprehensiveScore) ?
                            article.comprehensiveScore.toFixed(2) : 'N/A' }}
                    </span>
                    <span>
                        <input type="checkbox" v-model="article.isRead" @change="handleReadStatusChange(article)" />
                        Mark as Read
                    </span>
                </div>


                <div class="bar-chart">
                    <div v-for="(color, index) in article.paragraphColors" :key="index" class="bar"
                        :style="{ width: calculateBarWidth(article.paragraphs[index].wordCount) + 'px', backgroundColor: color }"
                        @click.stop="logDebug('Clicked paragraph bar: Article ID: ' + article.id + ', Paragraph Index: ' + index); scrollToParagraph(article.id, index)">
                    </div>
                </div>
            </div>
        </div>

        <!-- 中间的选项卡切换模块 -->
        <div id="analysis-paragraph-tabs" class="module">
            <h2>
                <button @click="setActiveTab('analysisAngles')" :class="{ active: activeTab === 'analysisAngles' }">
                    Analysis Angles
                </button>
                <button @click="setActiveTab('paragraphComparison')"
                    :class="{ active: activeTab === 'paragraphComparison' }">
                    Paragraph Comparison
                </button>
            </h2>
            <div v-if="activeTab === 'analysisAngles'">
                <!-- Analysis Angles Module -->
                <div id="analysis-angles">

                    <button @click="toggleHideUnmatchedBars" class="toggle-button">
                        {{ hideUnmatchedBars ? 'Show All Bars' : 'Hide Unmatched Bars' }}
                    </button>

                    <button @click="toggleConnectionsVisibility" class="toggle-button">
                        {{ connectionsVisible ? 'Hide All Connections' : 'Show All Connections' }}
                    </button>

                    <!-- 折叠和展开所有摘要按钮 -->
                    <button @click="toggleAllSummaries" class="toggle-button">
                        {{ allSummariesExpanded ? 'Collapse All Summaries' : 'Expand All Summaries' }}
                    </button>

                    <!-- 折叠和展开所有 Bars 按钮 -->
                    <button @click="toggleAllBars" class="toggle-button">
                        {{ allBarsExpanded ? 'Collapse All Bars' : 'Expand All Bars' }}
                    </button>



                    <!-- 曲线绘制 -->
                    <svg id="connection-lines" width="100%" height="100%"
                        style="position: absolute; top: 0; left: 0; z-index: 9;"></svg>

                    <!-- <h2>Analysis Angles</h2> -->
                    <draggable v-model="angles" itemKey="subtheme_id" @end="onAngleSortEnd" group="angles"
                        class="angles-list">

                        <template #item="{ element }">
                            <div :class="['analysis-angle', { expanded: element.expanded }]"
                                :style="{ borderLeft: `5px solid ${element.color}` }">
                                <span class="drag-handle" style="cursor: grab; margin-right: 10px;">⠿</span>


                                <button style="margin-right: 5px;" class="toggle-button summary-button"
                                    @click="toggleSummary(element)">
                                    <span v-if="element.expandedSummary">▲ Hide Summary</span>
                                    <span v-else>▼ Show Summary</span>
                                </button>
                                <button class="toggle-button bars-button" @click="toggleBars(element)">
                                    <span v-if="element.expandedBars">▲ Hide Bars</span>
                                    <span v-else>▼ Show Bars</span>
                                </button>

                                <span class="angle-paragraph-count">{{ element.paragraphCount }}</span>
                                <h3 style="margin: 5px 0;">{{ element.title }}</h3>

                                <!-- 摘要部分 -->
                                <div class="angle-summary">
                                    <p class="summary-content" v-if="element.expandedSummary">{{ element.merged_content
                                        }}</p>
                                </div>

                                <!-- 字数柱状图部分 -->
                                <div class="word-count-bar-chart-container">
                                    <div class="word-count-bar-chart"
                                        v-if="element.expandedBars && element.paragraphs.length">
                                        <div v-for="(paragraph, index) in filteredParagraphs(element.paragraphs)"
                                            :key="index" class="bar-container" :data-article-id="paragraph.article_id"
                                            :data-paragraph-index="paragraph.paragraph_index">
                                            <div class="bar" :style="{
                                                width: calculateBarWidth(paragraph.wordCount) + 'px',
                                                backgroundColor: element.color,
                                            }" @mouseover="highlightConnection(paragraph.article_id, paragraph.paragraph_index)"
                                                @mouseout="removeHighlight()"
                                                @click="scrollToParagraph(paragraph.article_id, paragraph.paragraph_index - 1)">
                                            </div>
                                            <span class="word-count-label">characters:{{ paragraph.wordCount }}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </template>
                    </draggable>
                </div>
            </div>
            <div v-else-if="activeTab === 'paragraphComparison'">
                <div id="paragraph-comparison">
                    <!-- <h2>Paragraph Comparison</h2> -->
                    <!-- 当前角度名称 -->
                    <div v-if="selectedParagraphAngle">
                        <h3 class="current-angle-title">Current Angle: {{ selectedParagraphAngle.title }}</h3>
                    </div>
                    <svg id="connection-lines" width="100%" height="100%"
                        style="position: absolute; top: 0; left: 0; z-index: 9;"></svg>


                    <div v-if="selectedParagraphSimilarities.length">
                        <!-- 柱状图 -->
                        <span class="similarity-label">similarity:</span>
                        <div v-for="(similarity, index) in selectedParagraphSimilarities" :key="index"
                            class="bar-container" :data-article-id="similarity.articleId"
                            :data-paragraph-index="similarity.paragraphIndex">
                            <div class="bar" :style="{
                                height: '20px',
                                width: calculateBarWidth(similarity.wordCount) * 1.5 + 'px',
                                backgroundColor: getBarColor(similarity.paragraph), // 段落所属角度的颜色
                                opacity: getBarOpacity(similarity.similarity) // 根据相似度调整透明度
                            }" @mouseover="highlightConnection(similarity.articleId, similarity.paragraphIndex)"
                                @mouseout="removeHighlight()"
                                @click="showSimilarParagraph(similarity.paragraph, similarity.articleId, similarity.paragraphIndex, similarity.originalparagraphKey)">

                                <span class="similarity-label">{{ similarity.similarity.toFixed(2) }}</span>
                            </div>
                            <!-- 在柱状块里显示相似度，旁显示字数 -->
                            <span class="similarity-label">characters:{{ similarity.wordCount }}</span>
                        </div>
                    </div>
                    <div v-else>
                        <p>Select a paragraph to see similar paragraphs.</p>
                    </div>
                    <!-- 显示选中的段落 -->
                    <div v-if="selectedSimilarParagraph">
                        <h3>Selected Paragraph:</h3>
                        <p :id="'paragraph-' + selectedSimilarParagraph.articleId + '-' + selectedSimilarParagraph.paragraphIndex"
                            v-html="formatParagraphContent(selectedSimilarParagraph.content)"></p>
                    </div>
                    <div v-else>
                        <p>Select a paragraph to see paragraph content.</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- 可拖拽的分割器 -->
        <div class="resizer"></div>


        <!-- 右侧的 Original Article 模块 -->
        <div class="module" id="original-article">
            <h2>Original Article</h2>
            <div v-if="selectedArticle">
                <!-- 文章标题 -->
                <h3 class="article-title">{{ selectedArticle.title }}</h3>

                <!-- 文章链接 -->
                <div class="article-link" style="margin-bottom: 5px;">
                    🌐 {{ selectedArticle.domain }}<a style="margin-left: 5px;" :href="selectedArticle.url"
                        target="_blank">Read
                        full article</a>
                </div>


                <!-- 段落内容 -->
                <div v-for="(paragraph, index) in selectedArticle.paragraphs" :key="index"
                    :id="'paragraph-' + selectedArticle.id + '-' + index" class="paragraph"
                    :class="{ 'active': selectedParagraphId === `${selectedArticle.id}_p${index + 1}` }"
                    :style="{ borderLeft: `7px solid ${getParagraphColor(paragraph.content)}` }"
                    @click="selectParagraph(selectedArticle.id, index)"
                    @mouseover="highlightConnection(selectedArticle.id, index + 1)" @mouseout="removeHighlight()"
                    @mouseup="handleTextSelection(selectedArticle.id, index)">
                    <div class="paragraph-content">
                        <h4 v-if="paragraph.subtitle">{{ paragraph.subtitle }}</h4>
                        <p v-html="formatParagraphContent(paragraph.content)"></p>
                    </div>

                    <!-- 高亮图标 -->
                    <div v-if="highlightButtonVisible" class="highlight-icon"
                        :style="{ top: `${highlightButtonPosition.y}px`, left: `${highlightButtonPosition.x}px` }"
                        @click="applyHighlight(selectedArticle.id, index)">
                        <span>+</span>
                    </div>

                </div>

            </div>
            <div v-else>
                <p>Please select an article to view its content.</p>
            </div>
        </div>

    </div>

</template>


<script type="module">
import draggable from "vuedraggable";
import * as d3 from 'd3';

export default {
    data() {
        return {
            articles: [],
            filterStatus: 'all', // 默认显示所有文章
            angles: [],
            clusteredParagraphs: {},
            selectedArticle: null,
            selectedArticleId: null, // 当前选中文章的 ID
            sortOrder: 'publishedAt', // 默认排序方式
            weights: {
                recommendation: 0.5, // 推荐分数的权重（滑动条控制）
            },
            similarities: {}, // 段落相似度数据
            similaritiesSentences: {}, // 段落句子相似度数据
            selectedParagraphId: null, // 当前选中段落的 ID
            selectedParagraphAngle: null, // 当前选中段落对应的角度
            selectedParagraphSimilarities: [], // 当前段落的相似段落列表
            selectedSimilarParagraph: null, // 当前选中的相似段落
            defaultWeight: { max: 1.0, min: 0.1 }, // 用于权重计算
            activeTab: 'analysisAngles', // 默认显示 Analysis Angles 选项卡
            hideUnmatchedBars: false, // 控制是否隐藏未匹配的段落
            connectionsVisible: true, // 初始状态为显示连接线
            allSummariesExpanded: false, // 所有摘要的展开状态
            allBarsExpanded: false,      // 所有 Bars 的展开状态
            highlights: {}, // 存储高亮和注释信息
            selectionRange: null, // 存储用户选中的 Range 对象
            highlightButtonPosition: { x: 0, y: 0 }, // 高亮图标的位置信息
            highlightButtonVisible: false, // 控制高亮图标是否显示
            highlightedElements: [],// 用于存储当前所有高亮的句子元素
            isDragging: false, // 是否正在拖拽
        };
    },
    components: {
        draggable,
    },
    computed: {

        sortedAngles() {
            return [...this.angles].sort((a, b) => b.paragraphCount - a.paragraphCount);
        },
        filteredAndSortedArticles() {
            // 获取用户选中的角度
            const selectedAngles = this.angles.filter(angle => angle.selected).map(angle => angle.subtheme_id);

            // 筛选文章，只保留包含选中角度的文章
            let filtered = this.articles.filter(article => {
                return article.paragraphColors.some(color =>
                    this.angles.some(angle => angle.selected && angle.color === color)
                );
            });

            if (this.filterStatus === 'unread') {
                filtered = filtered.filter(article => !article.isRead); // 未阅读
            } else if (this.filterStatus === 'read') {
                filtered = filtered.filter(article => article.isRead); // 已阅读
            }


            // 按排序方式排序文章
            if (this.sortOrder === 'repetitionRate') {
                filtered.sort((a, b) => {
                    if (a.repetitionRate === null) return 1; // 没有重复率的排在后面
                    if (b.repetitionRate === null) return -1;
                    return a.repetitionRate - b.repetitionRate; // 低重复率优先
                });
            } else if (this.sortOrder === 'comprehensiveScore') {
                filtered.sort((a, b) => b.comprehensiveScore - a.comprehensiveScore); // 综合得分越高越好
            } else if (this.sortOrder === 'angleCategoryCount') {
                filtered.sort((a, b) => {
                    const aCategories = new Set(
                        a.paragraphColors
                            .map(color => this.angles.find(angle => angle.color === color))
                            .filter(angle => angle && selectedAngles.includes(angle.subtheme_id))
                    ).size;
                    const bCategories = new Set(
                        b.paragraphColors
                            .map(color => this.angles.find(angle => angle.color === color))
                            .filter(angle => angle && selectedAngles.includes(angle.subtheme_id))
                    ).size;
                    return bCategories - aCategories;
                });
            } else if (this.sortOrder === 'recommendationScore') {
                filtered.sort((a, b) => b.recommendationScore - a.recommendationScore); // 按推荐分数降序排序
            } else if (this.sortOrder === 'publishedAt') {
                filtered.sort((a, b) => new Date(a.publishedAt) - new Date(b.publishedAt)); // 按发布时间升序排序
            }

            return filtered;
        },
    },
    methods: {
        async loadData() {
            // Load JSON data
            const articlesData = await fetch('news_data_with_paragraphs.json').then(res => res.json());
            const anglesData = await fetch('merged_news_subthemes.json').then(res => res.json());
            const clusteredData = await fetch('clustered_paragraphs_hdbscan2.json').then(res => res.json());
            const similaritiesData = await fetch('paragraph_pairwise_similarities.json').then(res => res.json());
            const similaritieSentencesData = await fetch('paragraph_sentence_similarities.json').then(res => res.json());

            // 为每篇文章的段落计算字数
            articlesData.forEach(article => {
                article.paragraphs.forEach(paragraph => {
                    paragraph.wordCount = this.calculateWordCount(paragraph.content);
                });
            });


            // 按排序动态分配权重
            const maxWeight = 1.0; // 最高权重
            const minWeight = 0.1; // 最低权重
            const step = (maxWeight - minWeight) / (anglesData.length - 1);

            // Assign unique colors to angles and count paragraphs
            const colors = [
                "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd",
                "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf",
                "#393b79", "#5254a3", "#6b6ecf", "#9c9ede", "#637939",
                "#8ca252", "#b5cf6b", "#cedb9c", "#8c6d31", "#bd9e39"
            ];

            anglesData.forEach((angle, index) => {
                angle.color = colors[index % colors.length];

                // 排序角度数据
                angle.paragraphCount = clusteredData[angle.subtheme_id]?.length || 0;
                angle.selected = true; // 默认所有角度都被选中

                angle.weight = maxWeight - index * step; // 动态分配权重

                angle.expandedSummary = false; // 摘要折叠状态
                angle.expandedBars = false; // 柱状图折叠状态

                const paragraphs = clusteredData[angle.subtheme_id] || [];
                angle.paragraphs = paragraphs.map(paragraph => {

                    // 解析 unique_id，提取 article_id 和段落索引
                    const [articleId, paragraphIndexStr] = paragraph.unique_id.split('_p');
                    const paragraphIndex = parseInt(paragraphIndexStr, 10) - 1; // 转为从 0 开始的索引

                    // 找到匹配的文章和段落
                    const matchingArticle = articlesData.find(article => article.id === articleId);
                    const matchingParagraph = matchingArticle?.paragraphs[paragraphIndex] || {};
                    return {
                        unique_id: paragraph.unique_id,
                        wordCount: matchingParagraph.wordCount || 0,
                        article_id: articleId,
                        paragraph_index: paragraphIndexStr,
                        content: matchingParagraph.content || '',
                    };
                });
                // 按字数从高到低排序段落
                angle.paragraphs.sort((a, b) => b.wordCount - a.wordCount);

            });

            // 默认按段落数量排序（降序）
            anglesData.sort((a, b) => b.paragraphCount - a.paragraphCount);

            // 将角度颜色映射到文章段落
            articlesData.forEach(article => {
                article.paragraphColors = article.paragraphs.map(paragraph => {
                    for (const [angleId, paragraphs] of Object.entries(clusteredData)) {
                        if (paragraphs.some(p => p.article_id === article.id && p.content === paragraph.content)) {
                            return anglesData.find(angle => angle.subtheme_id === angleId).color;
                        }
                    }
                    return '#ccc'; // Default color if no match
                });
                // console.log(`Article: ${article.title}`, article.paragraphColors);
                article.recommendationScore = this.calculateRecommendationScore(article);
            });

            // console.log('Angles Data Loaded:', anglesData);


            this.articles = articlesData;
            this.angles = anglesData;
            this.clusteredParagraphs = clusteredData;
            this.similarities = similaritiesData; // 保存段落相似度数据
            this.similaritiesSentences = similaritieSentencesData;

            articlesData.forEach(article => {
                article.recommendationScore = this.calculateRecommendationScore(article);
            });

        },
        setActiveTab(tab) {
            this.activeTab = tab; // 更新当前模块状态
            if (this.connectionsVisible) {
                this.drawConnections(); // 切换模块时重新绘制连线
            }
        },
        // 添加计算字数的辅助方法
        calculateWordCount(content) {
            if (!content) return 0;
            // 按空格拆分单词并计算长度（适用于英文文本）
            return content.split(/\s+/).filter(word => word).length;
        },
        calculateBarWidth(wordCount) {
            const minWidth = 20; // 最小宽度
            const maxWidth = 300; // 最大宽度


            const maxWordCount = Math.max(
                ...this.articles.flatMap(article => article.paragraphs.map(p => p.wordCount))
            ); // 获取所有段落的最大字数

            // 根据字数映射宽度
            return Math.max(minWidth, (wordCount / maxWordCount) * maxWidth);
        },
        showArticle(article, articleId) {
            // 清除现有高亮
            this.clearHighlights();

            this.logDebug('Showing article: ' + article.id);
            this.selectedArticle = article;
            this.selectedArticleId = articleId;

            this.$nextTick(() => {
                if (this.connectionsVisible) {
                    this.drawConnections();
                }

                if (this.highlights[article.id]) {
                    this.highlights[article.id].forEach(highlightData => {
                        this.renderHighlight(article.id, highlightData);
                    });
                }
            });
        },
        // 格式化段落内容，替换 \n 为 <br />
        formatParagraphContent(content) {
            if (!content) return '';

            // 分句逻辑：按句号 (.)、问号 (?) 和感叹号 (!) 分隔句子
            const splitIntoSentences = (text) => {
                const sentenceRegex = /([^.!?]+[.!?]+)/g; // 匹配句子（以标点符号结束）
                const sentences = text.match(sentenceRegex) || []; // 提取匹配的句子
                return sentences.map(sentence => sentence.trim()); // 去掉首尾空格
            };

            // 替换换行符为 <br />，并进行分句
            const sentences = splitIntoSentences(content.replace(/\n/g, '<br />'));

            // 将每个句子包裹在 <span> 中，并为换行符保留 <br />
            return sentences
                .map((sentence, index) =>
                    `<span class="sentence" data-sentence-index="${index}">${sentence}</span>`
                )
                .join(' '); // 用空格拼接句子
        },

        getParagraphColor(content) {
            for (const [angleId, paragraphs] of Object.entries(this.clusteredParagraphs)) {
                if (paragraphs.some(p => p.content === content)) {
                    return this.angles.find(angle => angle.subtheme_id === angleId).color;
                }
            }
            return '#ccc'; // Default color if no match
        },

        toggleAngleSelection(angle) {
            angle.selected = !angle.selected; // 切换选中状态
        },
        scrollToParagraph(articleId, index) {
            this.logDebug('Scrolling to paragraph: Article ID: ' + articleId + ', Paragraph Index: ' + index);
            // Automatically set the selected article if not already set
            const article = this.articles.find(a => a.id === articleId);
            if (this.selectedArticle !== article) {
                this.selectedArticle = article;
            }

            // Scroll to the specific paragraph
            this.$nextTick(() => {
                const paragraphElement = document.getElementById(`paragraph-${articleId}-${index}`);
                if (paragraphElement) {
                    paragraphElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        },
        // chongfulv
        selectParagraph(articleId, paragraphIndex) {
            // 清除现有高亮
            this.clearHighlights();
            this.selectedSimilarParagraph = null;

            // 获取点击段落的 unique_id
            const paragraphKey = `${articleId}_p${paragraphIndex + 1}`;
            this.selectedParagraphId = paragraphKey;

            // 遍历 clustered_paragraphs_hdbscan2.json，找到该段落所在的角度组
            const angleId = Object.keys(this.clusteredParagraphs).find(key =>
                this.clusteredParagraphs[key].some(paragraph => paragraph.unique_id === paragraphKey)
            );

            if (!angleId) {
                console.warn('Angle not found for paragraph:', paragraphKey);
                this.selectedParagraphSimilarities = [];
                return;
            }

            // 更新当前选中段落的角度
            this.selectedParagraphAngle = this.angles.find(angle => angle.subtheme_id === angleId);


            // 遍历 paragraph_pairwise_similarities.json，查找与该段落的相似段落
            const similarityData = [];
            this.clusteredParagraphs[angleId].forEach(paragraph => {
                const paragraphUniqueId = paragraph.unique_id;

                // 提取 articleId 和 paragraphIndex
                const [extractedArticleId, paragraphId] = paragraphUniqueId.split('_p');
                const extractedParagraphIndex = parseInt(paragraphId) - 1; // 转换为从 0 开始的索引

                // 查找 paragraph_pairwise_similarities.json 中的相似度
                const matches = (this.similarities[angleId] || []).filter(similarity =>
                    (similarity.paragraph_1_id === paragraphKey && similarity.paragraph_2_id === paragraphUniqueId) ||
                    (similarity.paragraph_2_id === paragraphKey && similarity.paragraph_1_id === paragraphUniqueId)
                );

                matches.forEach(match => {
                    similarityData.push({
                        paragraph: paragraph.content, // 段落内容
                        similarity: match.similarity, // 相似度
                        articleId: extractedArticleId, // 从 unique_id 提取的 articleId
                        paragraphIndex: extractedParagraphIndex, // 从 unique_id 提取的段落索引
                        wordCount: this.calculateWordCount(paragraph.content), // 将字数加入到相似性数据
                        originalparagraphKey: paragraphKey
                    });
                });
            });

            // 按相似度降序排序
            this.selectedParagraphSimilarities = similarityData.sort((a, b) => b.similarity - a.similarity);

        },
        highlightSentencePairs(selectedParagraphId, originalparagraphKey) {
            // 先清除所有旧高亮
            this.clearHighlights();

            const matchingPairs = [];
            Object.values(this.similaritiesSentences).forEach(angle => {
                angle.forEach(pair => {
                    if ((pair.paragraph_1.unique_id === selectedParagraphId && pair.paragraph_2.unique_id === originalparagraphKey) || (pair.paragraph_2.unique_id === selectedParagraphId && pair.paragraph_1.unique_id === originalparagraphKey)) {
                        pair.sentence_similarities.forEach(sentencePair => {
                            if (sentencePair.similarity > 0.70) {
                                matchingPairs.push({
                                    ...sentencePair,
                                    paragraph_1: pair.paragraph_1,
                                    paragraph_2: pair.paragraph_2
                                });
                            }
                        });
                    }
                });
            });
            this.$nextTick(() => {
                // 对句子添加高亮和 hover 联动逻辑
                matchingPairs.forEach(pair => {
                    const sentence1Element = document.querySelector(`#paragraph-${pair.paragraph_1.article_id}-${pair.paragraph_1.unique_id.split('_p')[1] - 1} [data-sentence-index="${pair.sentence_1_index}"]`);
                    const sentence2Element = document.querySelector(`#paragraph-${pair.paragraph_2.article_id}-${pair.paragraph_2.unique_id.split('_p')[1] - 1} [data-sentence-index="${pair.sentence_2_index}"]`);
                    // console.log(sentence1Element, sentence2Element);

                    if (sentence1Element && sentence2Element) {
                        sentence1Element.classList.add('highlight-sentence');
                        sentence2Element.classList.add('highlight-sentence');
                        this.highlightedElements.push(sentence1Element); // 存储高亮句子元素
                        this.highlightedElements.push(sentence2Element); // 存储高亮句子元素

                        sentence1Element.addEventListener('mouseover', () => {
                            sentence2Element.classList.add('highlight-hover');
                        });
                        sentence1Element.addEventListener('mouseout', () => {
                            sentence2Element.classList.remove('highlight-hover');
                        });
                        sentence2Element.addEventListener('mouseover', () => {
                            sentence1Element.classList.add('highlight-hover');
                        });
                        sentence2Element.addEventListener('mouseout', () => {
                            sentence1Element.classList.remove('highlight-hover');
                        });
                    }
                });

            });

        },
        // 应用于段落对比的句子高亮
        clearHighlights() {
            // 遍历并移除所有高亮样式
            this.highlightedElements.forEach(element => {
                if (element) {
                    element.classList.remove('highlight-sentence'); // 移除高亮类
                    element.style.backgroundColor = ''; // 移除背景颜色
                }
            });
            // 清空存储的高亮元素数组
            this.highlightedElements = [];
        },
        // 根据段落内容获取对应的颜色
        getBarColor(paragraphContent) {
            for (const [angleId, paragraphs] of Object.entries(this.clusteredParagraphs)) {
                if (paragraphs.some(p => p.content === paragraphContent)) {
                    const angle = this.angles.find(angle => angle.subtheme_id === angleId);
                    return angle ? angle.color : '#ccc'; // 默认灰色
                }
            }
            return '#ccc';
        },

        // 获取柱状图透明度，重新映射相似度范围
        getBarOpacity(similarity) {
            const minSim = 0.75; // 相似度的最低值
            const maxSim = 0.97; // 相似度的最高值
            const minOpacity = 0.1; // 最低透明度
            const maxOpacity = 1.0; // 最高透明度

            if (similarity <= minSim) {
                return minOpacity; // 如果相似度低于最小值，直接返回最低透明度
            }

            // 线性插值，将相似度映射到透明度范围
            return ((similarity - minSim) / (maxSim - minSim)) * (maxOpacity - minOpacity) + minOpacity;
        },

        // 显示选中的段落内容
        showSimilarParagraph(paragraph, articleId, paragraphIndex, originalparagraphKey) {
            // 清除现有高亮
            this.clearHighlights();

            this.selectedSimilarParagraph = {
                content: paragraph, // 段落内容
                paragraphIndex: paragraphIndex, // 段落索引
                articleId: articleId
            };
            // 筛选并高亮相似句子对
            const paragraphKey = `${articleId}_p${paragraphIndex + 1}`;
            this.highlightSentencePairs(paragraphKey, originalparagraphKey);
        },

        // 计算推荐分数
        calculateRecommendationScore(article) {
            // 找到文章的所有角度
            const articleAngles = new Set(
                article.paragraphColors
                    .map(color => this.angles.find(angle => angle.color === color))
                    .filter(angle => angle) // 过滤掉未找到的角度
            );

            if (articleAngles.size === 0) return 0;

            let totalWeightedScore = 0; // 分子：权重与字数的加权和
            let totalWordCount = 0;    // 分母：所有关联角度的字数总和


            articleAngles.forEach(angle => {
                // 遍历段落，根据段落颜色匹配角度
                let angleWordCount = 0;
                article.paragraphs.forEach((paragraph, index) => {
                    if (article.paragraphColors[index] === angle.color) {
                        angleWordCount += paragraph.wordCount || 0; // 累加属于该角度的段落字数
                    }
                });
                // 加权分数累加
                totalWeightedScore += (angle.weight || 0) * angleWordCount;
                // 总字数累加
                totalWordCount += angleWordCount;

            });

            if (totalWordCount === 0) return 0;
            return totalWeightedScore / totalWordCount;

        },
        toggleSummary(angle) {
            angle.expandedSummary = !angle.expandedSummary; // 摘要折叠
        },
        toggleBars(angle) {
            angle.expandedBars = !angle.expandedBars; // 柱状图折叠
        },
        toggleAllSummaries() {
            this.allSummariesExpanded = !this.allSummariesExpanded;

            // 遍历 angles，更新每个 element 的 expandedSummary 状态
            this.angles.forEach((angle) => {
                angle.expandedSummary = this.allSummariesExpanded;
            });
        },
        toggleAllBars() {
            this.allBarsExpanded = !this.allBarsExpanded;

            // 遍历 angles，更新每个 element 的 expandedBars 状态
            this.angles.forEach((angle) => {
                angle.expandedBars = this.allBarsExpanded;
            });
        },
        // 拖动效果
        onAngleSortEnd() {
            // 根据当前排序重新分配权重
            const maxWeight = this.defaultWeight.max;
            const minWeight = this.defaultWeight.min;
            const step = (maxWeight - minWeight) / (this.angles.length - 1);

            this.angles.forEach((angle, index) => {
                angle.weight = maxWeight - index * step; // 重新计算权重
            });

            // 重新计算推荐分数
            this.articles.forEach(article => {
                article.recommendationScore = this.calculateRecommendationScore(article);
                // 更新综合得分
                this.updateComprehensiveScores(article);
            });

            // 如果当前排序是按推荐分数排序，更新文章列表
            if (this.sortOrder === 'recommendationScore') {
                this.articles.sort((a, b) => b.recommendationScore - a.recommendationScore);
            }
        },
        // 绘制曲线
        drawConnections() {
            this.$nextTick(() => {
                // 清空旧的连接线
                d3.select('#connection-lines').selectAll('*').remove();

                if (this.activeTab === 'analysisAngles') {
                    // 角度分析模块连线逻辑
                    const anglesElement = document.getElementById('analysis-angles');
                    const articlesElement = document.getElementById('article-list');
                    const tabElement = document.getElementById("analysis-paragraph-tabs");
                    const originalarticlesElement = document.getElementById('original-article');

                    if (!anglesElement || !articlesElement) return;

                    const connections = [];
                    const secondaryConnections = []; // 新增：柱状块与原始文章段落的连接


                    document.querySelectorAll('.word-count-bar-chart .bar-container').forEach(bar => {
                        const articleId = bar.getAttribute('data-article-id');
                        const paragraphIndex = bar.getAttribute('data-paragraph-index');
                        const articleElement = document.getElementById(`article-${articleId}`);
                        const paragraphElement = document.getElementById(`paragraph-${articleId}-${paragraphIndex - 1}`);

                        if (articleElement) {
                            const barRect = bar.getElementsByClassName('bar')[0].getBoundingClientRect();
                            const articleRect = articleElement.getBoundingClientRect();

                            if (
                                this.isElementInModuleViewport(barRect, tabElement) &&
                                this.isElementInModuleViewport(articleRect, articlesElement)
                            ) {
                                connections.push({
                                    // 手动改了
                                    x1: barRect.left,
                                    y1: barRect.top + barRect.height / 2,
                                    x2: articleRect.right,
                                    y2: articleRect.top + articleRect.height / 2,
                                    articleId,
                                    paragraphIndex,
                                });
                            }
                        }


                        if (this.selectedArticle && paragraphElement) {
                            // 第二类连接：柱状块到原始文章段落
                            const barRect = bar.getElementsByClassName('bar')[0].getBoundingClientRect();
                            const paragraphElementRect = paragraphElement.getBoundingClientRect();
                            if (
                                this.isElementInModuleViewport(barRect, tabElement) &&
                                this.isElementInModuleViewport(paragraphElementRect, originalarticlesElement)
                            ) {
                                secondaryConnections.push({
                                    x1: barRect.right + 90, // 柱状块右端,留出标注位置
                                    y1: barRect.top + barRect.height / 2,
                                    x2: paragraphElementRect.left, // 原始文章段落左端
                                    y2: paragraphElementRect.top + paragraphElementRect.height / 2,
                                    articleId,
                                    paragraphIndex,
                                });
                            }
                        }



                    });

                    const svg = d3.select('#connection-lines');
                    connections.forEach(connection => {
                        svg
                            .append('path')
                            .attr('d', this.generatePath(connection))
                            .attr('stroke', '#ccc')
                            .attr('stroke-width', 2)
                            .attr('fill', 'none')
                            .attr('data-article-id', connection.articleId)
                            .attr('data-paragraph-index', connection.paragraphIndex)
                            .classed('connection-line', true);
                    });
                    // 绘制次连接：柱状块到原始文章段落
                    secondaryConnections.forEach(connection => {
                        svg
                            .append('path')
                            .attr('d', this.generatePath(connection))
                            .attr('stroke', '#888') // 使用不同颜色区分次连接
                            .attr('stroke-width', 1.5) // 次连接线条略细
                            .attr('fill', 'none')
                            .attr('data-article-id', connection.articleId)
                            .attr('data-paragraph-index', connection.paragraphIndex)
                            .classed('connection-line', true); // 次连接样式
                    });


                } else if (this.activeTab === 'paragraphComparison') {
                    // 段落对比模块连线逻辑
                    const articlesElement = document.getElementById("article-list");
                    const comparisonElement = document.getElementById("paragraph-comparison");
                    const originalarticlesElement = document.getElementById('original-article');

                    if (!articlesElement || !comparisonElement) return;


                    // 遍历所有柱状块和文章，找到它们的坐标
                    const connections = [];
                    const secondaryConnections = []; // 新增：柱状块与原始文章段落的连接

                    document.querySelectorAll('.bar-container').forEach(bar => {
                        const articleId = bar.getAttribute('data-article-id');
                        const paragraphIndex = bar.getAttribute('data-paragraph-index');
                        const tabElement = document.getElementById("analysis-paragraph-tabs");
                        const articleElement = document.getElementById(`article-${articleId}`);
                        const paragraphElement = document.getElementById(`paragraph-${articleId}-${paragraphIndex}`);

                        if (articleElement) {
                            // 获取元素的位置信息
                            const barRect = bar.getBoundingClientRect();
                            const articleRect = articleElement.getBoundingClientRect();

                            // 判断是否在模块的可视区域内
                            const isBarVisible = this.isElementInModuleViewport(barRect, comparisonElement);
                            const isArticleVisible = this.isElementInModuleViewport(articleRect, articlesElement);

                            // 如果二者都在屏幕内，才添加到连接列表
                            if (isBarVisible && isArticleVisible) {
                                connections.push({
                                    x1: articleRect.right, // 文章右边的坐标
                                    y1: articleRect.top + articleRect.height / 2, // 文章垂直居中的坐标
                                    x2: barRect.left, // 段落柱状块左边的坐标
                                    y2: barRect.top + barRect.height / 2, // 段落柱状块垂直居中的坐标
                                    articleId,
                                    paragraphIndex
                                });
                            }
                        }

                        if (this.selectedArticle && paragraphElement) {
                            // 第二类连接：柱状块到原始文章段落
                            const barRect = bar.getElementsByClassName('bar')[0].getBoundingClientRect();
                            const paragraphElementRect = paragraphElement.getBoundingClientRect();
                            if (
                                this.isElementInModuleViewport(barRect, tabElement) &&
                                this.isElementInModuleViewport(paragraphElementRect, originalarticlesElement)
                            ) {
                                secondaryConnections.push({
                                    x1: barRect.right + 115, // 柱状块右端,留出标注位置
                                    y1: barRect.top + barRect.height / 2,
                                    x2: paragraphElementRect.left, // 原始文章段落左端
                                    y2: paragraphElementRect.top + paragraphElementRect.height / 2,
                                    articleId,
                                    paragraphIndex,
                                });
                            }
                        }


                    });



                    // 绘制曲线
                    const svg = d3.select('#connection-lines');
                    connections.forEach(connection => {
                        svg
                            .append('path')
                            .attr('d', this.generatePath(connection))
                            .attr('stroke', '#ccc') // 默认灰色
                            .attr('stroke-width', 2)
                            .attr('fill', 'none')
                            .attr('data-article-id', connection.articleId)
                            .attr('data-paragraph-index', connection.paragraphIndex)
                            .classed('connection-line', true);
                    });
                    // 绘制次连接：柱状块到原始文章段落
                    secondaryConnections.forEach(connection => {
                        svg
                            .append('path')
                            .attr('d', this.generatePath(connection))
                            .attr('stroke', '#888') // 使用不同颜色区分次连接
                            .attr('stroke-width', 1.5) // 次连接线条略细
                            .attr('fill', 'none')
                            .attr('data-article-id', connection.articleId)
                            .attr('data-paragraph-index', connection.paragraphIndex)
                            .classed('connection-line', true); // 次连接样式
                    });
                }


            });
        },
        // 判断元素是否在可视区域
        isElementInModuleViewport(elementRect, moduleElement) {
            const moduleRect = moduleElement.getBoundingClientRect();

            return (
                elementRect.bottom - elementRect.height / 2 > moduleRect.top && // 元素的底部超过容器顶部
                elementRect.top + elementRect.height / 2 < moduleRect.bottom && // 元素的顶部在容器底部以上
                elementRect.right > moduleRect.left && // 元素的右边超过容器左侧
                elementRect.left < moduleRect.right // 元素的左边在容器右侧以内
            );
        },
        generatePath({ x1, y1, x2, y2 }) {
            // 使用贝塞尔曲线生成路径
            const cx = (x1 + x2) / 2; // 控制点的 x 坐标
            return `M ${x1},${y1} C ${cx},${y1} ${cx},${y2} ${x2},${y2}`;
        },
        highlightConnection(articleId, paragraphIndex = null) {
            // 重置所有曲线样式
            d3.selectAll('.connection-line')
                .attr('stroke', '#ccc') // 恢复默认灰色
                .attr('stroke-width', 2);

            if (this.activeTab === 'analysisAngles') {
                if (paragraphIndex === null) {
                    d3.selectAll(`.connection-line[data-article-id="${articleId}"]`)
                        .attr('stroke', '#555')
                        .attr('stroke-width', 4);
                } else {
                    d3.selectAll(
                        `.connection-line[data-article-id="${articleId}"][data-paragraph-index="${paragraphIndex}"]`
                    )
                        .attr('stroke', '#555')
                        .attr('stroke-width', 4);
                }
            } else if (this.activeTab === 'paragraphComparison') {
                if (paragraphIndex === null) {
                    d3.selectAll(`.connection-line[data-article-id="${articleId}"]`)
                        .attr('stroke', '#555')
                        .attr('stroke-width', 4);
                } else {
                    d3.selectAll(
                        `.connection-line[data-article-id="${articleId}"][data-paragraph-index="${paragraphIndex}"]`
                    )
                        .attr('stroke', '#555')
                        .attr('stroke-width', 4);
                }
            }
        },
        removeHighlight() {
            // 恢复默认样式
            d3.selectAll('.connection-line')
                .attr('stroke', '#ccc')
                .attr('stroke-width', 2);
        },
        handleScroll() {
            console.log("Scroll detected, redrawing connections...");
            // 每次滚动后刷新曲线
            if (this.connectionsVisible) {
                this.drawConnections();
            }
        },
        // 切换连接线的显示/隐藏状态
        toggleConnectionsVisibility() {
            this.connectionsVisible = !this.connectionsVisible;

            if (this.connectionsVisible) {
                this.drawConnections(); // 如果需要显示，重新绘制连接线
            } else {
                this.clearAllConnections(); // 如果需要隐藏，清除连接线
            }
        },
        // 清除所有连接线
        clearAllConnections() {
            d3.select('#connection-lines').selectAll('*').remove();
        },
        // 格式化发布时间
        formatPublishedAt(isoDate) {
            const date = new Date(isoDate);
            return date.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
            });
        },
        // 处理阅读状态改变
        handleReadStatusChange(article) {
            if (article.isRead) {
                console.log(`Article ${article.id} marked as read.`);
            } else {
                console.log(`Article ${article.id} marked as unread.`);
            }

            // 重新计算所有未读文章的重复率
            this.updateRepetitionRates();
            this.updateComprehensiveScores();

        },

        // 更新未读文章的重复率
        updateRepetitionRates() {
            const readArticles = this.articles.filter(a => a.isRead); // 已读文章列表
            const hasReadArticles = readArticles.length > 0;

            this.articles.forEach(article => {
                if (!article.isRead && hasReadArticles) {
                    // 计算未读文章的重复率
                    article.repetitionRate = this.calculateRepetitionRate(article, readArticles);
                } else {
                    // 如果没有已读文章，则设置重复率为 null
                    article.repetitionRate = null;
                }
            });
            // 如果当前排序方式是重复率，则重新排序
            if (this.sortOrder === 'repetitionRate') {
                this.articles.sort((a, b) => {
                    if (a.repetitionRate === null) return 1; // 将没有重复率的文章排在后面
                    if (b.repetitionRate === null) return -1;
                    return a.repetitionRate - b.repetitionRate; // 低重复率优先
                });
            }

        },

        // 计算单篇文章的重复率
        calculateRepetitionRate(article, readArticles) {
            if (!readArticles || readArticles.length === 0) {
                return null; // 没有已读文章时，返回 null
            }

            // 获取未读文章的段落唯一 ID 列表
            const unreadParagraphs = article.paragraphs.map((p, index) => `${article.id}_p${index + 1}`);


            // 1. 构建已读文章的段落按角度分类
            const angleParagraphs = {}; // 用于存储按角度分类的已读段落 ID
            for (const angleId in this.similarities) {
                angleParagraphs[angleId] = []; // 初始化每个角度的段落数组
            }

            readArticles.forEach(readArticle => {
                readArticle.paragraphs.forEach((p, index) => {
                    const paragraphId = `${readArticle.id}_p${index + 1}`; // 已读段落的唯一 ID

                    for (const angleId in this.clusteredParagraphs) {
                        // 检查该段落是否属于某个角度
                        if (
                            this.clusteredParagraphs[angleId].some(clusteredParagraph => clusteredParagraph.unique_id === paragraphId)
                        ) {
                            angleParagraphs[angleId].push(paragraphId); // 将段落 ID 添加到对应角度
                        }
                    }
                });
            });


            // 2. 计算未读文章的相似性分数
            let totalSimilarity = 0;
            unreadParagraphs.forEach(unreadParagraphId => {
                let maxSimilarity = 0; // 当前段落的最大相似性分数

                // 确定未读段落所在的角度
                const paragraphAngleId = Object.keys(this.clusteredParagraphs).find(angleId =>
                    this.clusteredParagraphs[angleId].some(clusteredParagraph => clusteredParagraph.unique_id === unreadParagraphId)
                );

                if (paragraphAngleId) {
                    // 获取该角度的所有已读段落
                    const angleParagraphsSet = angleParagraphs[paragraphAngleId] || [];

                    // 计算该段落与当前角度的最大相似性
                    maxSimilarity = angleParagraphsSet.reduce((maxSim, readParagraphId) => {
                        const similarity = this.getSimilarityScore(unreadParagraphId, readParagraphId);
                        // console.log(`Similarity between ${unreadParagraphId} and ${readParagraphId}: ${similarity}`);
                        return Math.max(maxSim, similarity); // 取最大值
                    }, 0);
                }

                totalSimilarity += maxSimilarity; // 加入文章的总相似性
            });


            // 3. 归一化相似性分数
            const repetitionRate = totalSimilarity / unreadParagraphs.length; // 平均相似性


            return repetitionRate;
        },

        // 获取两个段落的相似性分数
        getSimilarityScore(paragraph1, paragraph2) {
            for (const angleId in this.similarities) {
                const similarityData = this.similarities[angleId];
                const match = similarityData.find(similarity =>
                    (similarity.paragraph_1_id === paragraph1 && similarity.paragraph_2_id === paragraph2) ||
                    (similarity.paragraph_2_id === paragraph1 && similarity.paragraph_1_id === paragraph2)
                );
                if (match) {
                    return match.similarity;
                }
            }
            return 0; // 如果没有相似性，返回 0
        },
        // 更新综合得分
        updateComprehensiveScores() {
            const readArticles = this.articles.filter(a => a.isRead); // 已读文章列表
            const hasReadArticles = readArticles.length > 0;

            this.articles.forEach(article => {
                if (!article.isRead && hasReadArticles) {
                    // 计算未读文章的重复率
                    article.comprehensiveScore = this.calculateComprehensiveScore(article);
                } else {
                    // 如果没有已读文章，则设置重复率为 null
                    article.comprehensiveScore = null;
                }
            });
            // 如果当前排序方式是综合得分，则重新排序
            if (this.sortOrder === 'comprehensiveScore') {
                this.articles.sort((a, b) => b.comprehensiveScore - a.comprehensiveScore);
            }
        },
        // 计算综合得分
        calculateComprehensiveScore(article) {
            const repetitionRate = article.repetitionRate != null && !isNaN(article.repetitionRate)
                ? article.repetitionRate
                : 1; // 假设最大重复率为 1

            const recommendationWeight = this.weights.recommendation;
            const repetitionWeight = 1 - recommendationWeight;

            // 综合得分公式
            return (
                recommendationWeight * article.recommendationScore -
                repetitionWeight * (1 - repetitionRate)
            );
        },

        // 切换角度分析中柱状块的隐藏状态
        toggleHideUnmatchedBars() {
            this.hideUnmatchedBars = !this.hideUnmatchedBars;
        },
        // 过滤文章列表中包含的段落
        filteredParagraphs(paragraphs) {
            if (!this.hideUnmatchedBars) {
                return paragraphs; // 如果不隐藏，返回所有段落
            }

            // 如果隐藏未匹配段落，过滤掉没有对应文章的段落
            return paragraphs.filter(paragraph => {
                const articleElement = document.getElementById(`article-${paragraph.article_id}`);
                return !!articleElement; // 只保留有对应文章的段落
            });
        },

        handleTextSelection(articleId, paragraphIndex) {
            const selection = window.getSelection();

            if (!selection || selection.isCollapsed) return;

            const range = selection.getRangeAt(0);
            const startContainer = range.startContainer;
            const endContainer = range.endContainer;

            const paragraphElement = document.getElementById(`paragraph-${articleId}-${paragraphIndex}`);
            if (!paragraphElement.contains(startContainer) || !paragraphElement.contains(endContainer)) {
                alert("Highlight must be within a single paragraph.");
                return;
            }

            // 存储 Range 信息
            this.selectionRange = range;
            this.startContainer = startContainer; // 保存 startContainer
            this.endContainer = endContainer; // 保存 endContainer
            this.highlightparagraphElement = document.getElementById(`paragraph-${articleId}-${paragraphIndex}`);

            // 获取用户选中文本的坐标
            const rect = range.getBoundingClientRect();
            this.highlightButtonPosition = {
                x: rect.right + 8, // 增加一些间距，让按钮不直接贴着文本
                y: rect.top + window.scrollY - 16 // 调整垂直位置，让按钮居中对齐
            };
            this.highlightButtonVisible = true; // 显示高亮按钮
            this.$nextTick(() => {
                console.log("Highlight button position updated:", this.highlightButtonPosition);
            });

        },
        applyHighlight(articleId, paragraphIndex) {
            if (!this.selectionRange || !this.startContainer || !this.endContainer) {
                console.error("No valid selection range or containers.");
                return;
            }

            const range = this.selectionRange;
            const startContainer = this.startContainer;
            const endContainer = this.endContainer;

            // Helper function to get all text nodes within a paragraph (skipping <br>)
            const getAllTextNodes = (node) => {
                const textNodes = [];
                if (node.nodeType === Node.TEXT_NODE) {
                    textNodes.push(node);
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                    // 忽略 <br> 标签，但递归处理子节点
                    node.childNodes.forEach((child) => {
                        textNodes.push(...getAllTextNodes(child));
                    });
                }
                return textNodes;
            };


            const paragraphElement = this.highlightparagraphElement;
            const textNodes = getAllTextNodes(paragraphElement);

            let charCount = 0; // Tracks the cumulative character count
            let startOffset = null;
            let endOffset = null;
            // 遍历文本节点，计算起始和结束偏移量
            for (const node of textNodes) {
                const nodeLength = node.textContent.length;

                // 确定 startOffset
                if (startOffset === null && node === startContainer) {
                    startOffset = charCount + range.startOffset;
                }
                // 确定 endOffset
                if (endOffset === null && node === endContainer) {
                    endOffset = charCount + range.endOffset;
                }

                charCount += nodeLength;

                // 如果 startOffset 和 endOffset 都已找到，则退出循环
                if (startOffset !== null && endOffset !== null) break;
            }

            const highlightText = range.toString();
            // let annotation = prompt("Add a note for the selected text (leave blank if no note):");
            // if (annotation === null) annotation = ""; // Allow blank annotation for just highlighting
            // annotation = "";

            const highlightData = {
                text: highlightText,
                startOffset,
                endOffset,
                // annotation,
                paragraphIndex,
            };

            if (!this.highlights[articleId]) {
                this.highlights[articleId] = [];
            }
            this.highlights[articleId].push(highlightData);


            // Render highlight immediately
            this.renderHighlight(articleId, highlightData);
            // 隐藏高亮按钮
            this.highlightButtonVisible = false;
            this.selectionRange = null;

            // Clear selection
            window.getSelection().removeAllRanges();


        },
        renderHighlight(articleId, highlightData) {
            console.log(articleId, highlightData);
            // 获取对应段落的 DOM 元素
            const paragraphElement = this.highlightparagraphElement;
            if (!paragraphElement) return;

            // 获取段落中的所有文本节点
            const getAllTextNodes = (node) => {
                const textNodes = [];
                if (node.nodeType === Node.TEXT_NODE) {
                    textNodes.push(node);
                } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== "BR") {
                    node.childNodes.forEach((child) => {
                        textNodes.push(...getAllTextNodes(child));
                    });
                }
                return textNodes;
            };

            const textNodes = getAllTextNodes(paragraphElement);
            let charCount = 0;
            let rangeStart = null;
            let rangeEnd = null;

            // 遍历所有文本节点，找到 `startOffset` 和 `endOffset` 所在的节点及偏移
            for (const node of textNodes) {
                const nodeLength = node.textContent.length;

                if (!rangeStart && charCount + nodeLength > highlightData.startOffset) {
                    rangeStart = { node, offset: highlightData.startOffset - charCount };
                }
                if (!rangeEnd && charCount + nodeLength > highlightData.endOffset) {
                    rangeEnd = { node, offset: highlightData.endOffset - charCount };
                }

                charCount += nodeLength;
                if (rangeStart && rangeEnd) break;
            }

            if (!rangeStart || !rangeEnd) {
                console.error("Failed to calculate the correct range for highlighting.");
                return;
            }

            const range = document.createRange();
            try {
                range.setStart(rangeStart.node, rangeStart.offset);
                range.setEnd(rangeEnd.node, rangeEnd.offset);

                // 创建高亮的 <span> 元素
                const highlightSpan = document.createElement("span");
                highlightSpan.classList.add("highlight");
                highlightSpan.style.backgroundColor = "yellow";

                // 如果有注释，添加注释数据属性
                if (highlightData.annotation) {
                    highlightSpan.setAttribute("data-annotation", highlightData.annotation);
                }

                // 用 DocumentFragment 提取内容并包裹
                const fragment = range.extractContents();
                highlightSpan.appendChild(fragment);
                range.insertNode(highlightSpan);

                // 添加点击事件以删除高亮
                highlightSpan.addEventListener("click", () => {
                    if (confirm("Do you want to remove this highlight?")) {
                        const parent = highlightSpan.parentNode;
                        while (highlightSpan.firstChild) {
                            parent.insertBefore(highlightSpan.firstChild, highlightSpan);
                        }
                        parent.removeChild(highlightSpan);

                        this.highlights[articleId] = this.highlights[articleId].filter(
                            (h) =>
                                h.startOffset !== highlightData.startOffset ||
                                h.endOffset !== highlightData.endOffset ||
                                h.paragraphIndex !== highlightData.paragraphIndex
                        );
                    }
                });
            } catch (error) {
                console.error("Error during surroundContents:", error);
            }
        },
        logDebug(message) {
            console.log('[DEBUG]:', message);
        }

    },
    mounted() {
        this.loadData();
        // 绘制文章到段落块的曲线
        // 绘制曲线并监听滚轮事件
        this.$nextTick(() => {
            const resizer = document.querySelector(".resizer");
            const leftPanel = document.querySelector("#analysis-paragraph-tabs");
            const rightPanel = document.querySelector("#original-article");
            const fixedLeftPanel = document.querySelector("#article-list"); // 左侧固定宽度模块

            resizer.addEventListener("mousedown", () => {
                this.isDragging = true;
                document.body.style.cursor = "ew-resize";
                document.body.style.userSelect = "none";
            });

            document.addEventListener("mousemove", (e) => {
                if (!this.isDragging) return;

                const containerWidth = document.querySelector("#main-content").offsetWidth;

                // 获取鼠标位置并计算中间和右侧的宽度
                const leftWidth = fixedLeftPanel.offsetWidth; // 左侧固定宽度
                const middleWidth = e.clientX - leftWidth; // 中间的宽度
                const rightWidth = containerWidth - middleWidth - leftWidth - 5; // 右侧宽度（减去分割器）

                // 限制中间和右侧的最小宽度
                if (middleWidth < 200 || rightWidth < 200) return;

                // 调整中间和右侧模块的宽度
                leftPanel.style.flexGrow = 0;
                rightPanel.style.flexGrow = 0;
                leftPanel.style.width = `${middleWidth}px`;
                rightPanel.style.width = `${rightWidth}px`;
            });

            document.addEventListener("mouseup", () => {
                this.isDragging = false;
                document.body.style.cursor = "";
                document.body.style.userSelect = "";
            });

            // 绘制曲线
            if (this.connectionsVisible) {
                this.drawConnections();
            }

            // 监听 Articles 和 Paragraph Comparison 的滚轮事件
            const articlesElement = document.getElementById("article-list");
            // const comparisonElement = document.getElementById("paragraph-comparison");
            const tabElement = document.getElementById('analysis-paragraph-tabs');
            const originalarticlesElement = document.getElementById('original-article');

            if (articlesElement) {
                articlesElement.addEventListener("scroll", this.handleScroll);
            }
            // if (comparisonElement) {
            //     comparisonElement.addEventListener("scroll", this.handleScroll);
            // }
            if (tabElement) {
                tabElement.addEventListener('scroll', this.handleScroll);
            }
            if (originalarticlesElement) {
                originalarticlesElement.addEventListener('scroll', this.handleScroll);
            }
        });

    },
    updated() {
        // 绘制文章到段落块的曲线
        if (this.connectionsVisible) {
            this.drawConnections();
        }

    },
    beforeDestroy() {
        // 移除事件监听
        const articlesElement = document.getElementById("article-list");
        // const comparisonElement = document.getElementById("paragraph-comparison");
        const tabElement = document.getElementById('analysis-paragraph-tabs');

        if (articlesElement) {
            articlesElement.removeEventListener("scroll", this.handleScroll);
        }
        // if (comparisonElement) {
        //     comparisonElement.removeEventListener("scroll", this.handleScroll);

        // }
        if (tabElement) {
            tabElement.removeEventListener('scroll', this.handleScroll);
        }
        if (originalarticlesElement) {
            originalarticlesElement.removeEventListener('scroll', this.handleScroll);
        }
    },
};

</script>


<style lang="scss">
body {
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 0;
    display: flex;
    height: 100vh;
    background-color: #f8f9fa;
    overflow: hidden;

}

#app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
}


#main-content {
    // display: grid;
    // grid-template-columns: 1fr 1fr 2fr;
    display: flex;
    /* 切换到 Flexbox 布局 */
    flex-direction: row;
    /* 水平排列模块 */
    // height: 84%;
    overflow: hidden;
}

.module {
    border: 1px solid #ddd;
    background-color: #fff;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    border-radius: 8px;
    overflow-y: auto;
    padding: 10px;

    flex-grow: 1;
    /* 模块可以扩展 */
    min-width: 0;
    /* 防止模块内容溢出导致布局问题 */
    transition: flex-grow 0.2s ease;
    /* 添加平滑动画 */
}

.module h2 {
    font-size: 20px;
    margin-bottom: 10px;
    color: #333;
}

/* 分割器 */
.resizer {
    width: 5px;
    /* 分割器宽度 */
    cursor: ew-resize;
    /* 改变鼠标为水平拖拽样式 */
    background-color: #ccc;
    /* 分割器的颜色 */
    z-index: 10;
    flex-shrink: 0;
    /* 分割器不允许缩小 */
}


#article-list {
    overflow-y: auto;
    flex-shrink: 0;
    /* 防止自动缩小宽度 */
    width: 25%;
    height: 100%;
}


#analysis-paragraph-tabs {
    overflow-y: auto;
    width: 50%;
    height: 100%;
}


#original-article {
    overflow-y: auto;
    width: 25%;
    height: 100%;
}

/* 让文章的滚动条在左侧 */
#article-list {
    direction: rtl;
}

#article-list>* {
    direction: ltr;
}


// 选项卡样式
#analysis-paragraph-tabs {
    h2 {
        display: flex;
        justify-content: space-around;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        transition: transform 0.2s, box-shadow 0.2s;
        border-radius: 8px;
        margin-bottom: 10px;
        font-size: 2rem;
    }

    h2 button {
        flex: 1;
        padding: 10px;
        border: none;
        cursor: pointer;
        background-color: #f8f9fa;
        font-weight: bold;
        color: #5c6167;
        transition: background-color 0.3s, color 0.3s;
    }

    h2 button:hover {
        background-color: #5c6167;
        color: #fff;
    }

    h2 button.active {
        background-color: #5c6167;
        color: #fff;
    }

}


/* Settings 模块整体样式 */

#settings {
    overflow-y: visible;
    background-color: #f9f9f9;
    border: 1px solid hsl(0, 0%, 88%);
    border-radius: 8px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    padding: 15px;
    font-family: 'Arial', sans-serif;

    .settings-module {
        display: flex;
        flex-direction: row;
        align-items: center;
        flex-wrap: wrap;
        gap: 20px;

        .setting-group {
            // flex: 1 1 calc(50% - 20px);
            padding: 5px 15px;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .setting-group h3 {
            font-size: 1rem;
            color: #444;
            margin-bottom: 10px;
            text-align: left;
            border-bottom: 1px solid hsl(0, 0%, 88%);
            padding-bottom: 5px;
        }

        .setting-group:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        }

        //  Dropdown Styling 
        .dropdown {
            // width: 100%;
            padding: 8px 12px;
            font-size: 1rem;
            color: #333;
            border: 1px solid hsl(0, 0%, 88%);
            border-radius: 4px;
            box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
            background-color: #f9f9f9;
            transition: border-color 0.2s ease;
        }

        .dropdown:focus {
            border-color: hsl(200, 80%, 60%);
            outline: none;
        }

        .angles-container {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 5px;
        }

        .color-tag {
            width: 20px;
            height: 20px;
            border-radius: 4px;
            border-radius: 50%;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
        }

        .color-tag:hover {
            transform: scale(1.1);
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        }

        .color-tag.selected {
            border: 2px solid hsl(200, 52%, 12%);
        }

        .filter-status,
        .sort-options {
            display: flex;
            flex-direction: row;
            align-items: center;
            flex-wrap: wrap;
        }

        .weight-settings {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .weight-slider label {
            font-size: 0.9rem;
            color: #555;
        }

        .weight-slider input[type="range"] {
            flex: 1;
            margin: 0 10px;
            cursor: pointer;
        }
    }


}

/* Settings 模块整体样式---结束 */




/* 文章列表样式 */

.article-card {
    margin-right: 50px;
    padding: 15px;
    margin-bottom: 15px;
    border: 1px solid #ddd;
    border-radius: 8px;
    background-color: #fff;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    transition: transform 0.2s, box-shadow 0.2s;
    /* 添加过渡效果 */
    cursor: pointer;
}

.article-card.active {
    background-color: rgba(0, 0, 0, 0.05);
    /* 背景色加深 */
}

.article-card:hover {
    transform: translateY(-5px);
    /* 悬停时提升效果 */
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2);
    /* 悬停时更深的阴影 */
}

.article-title {
    font-size: 18px;
    /* 标题字体大小 */
    font-weight: bold;
    /* 加粗 */
    color: #333;
    /* 标题颜色 */
    margin-bottom: 10px;
    /* 标题与元信息之间的间距 */
}

.article-meta {
    font-size: 14px;
    /* 元信息字体大小 */
    color: #555;
    /* 元信息颜色 */
    display: flex;
    gap: 10px;
    /* 元信息之间的间距 */
    margin-bottom: 10px;
    /* 与段落柱状图之间的间距 */
}

.article-meta span {
    display: flex;
    align-items: center;
    /* 图标与文字对齐 */
}

.article-meta span::before {
    content: '';
    /* 图标占位 */
    display: inline-block;
    margin-right: 5px;
    /* 图标与文字间距 */
}

.bar-chart {
    display: flex;
    align-items: center;
    gap: 2px;
    /* 每个柱状块之间的间距 */
}

.bar-chart .bar {
    height: 10px;
    margin: 1px;
    border-radius: 3px;
    /* 添加圆角 */
    cursor: pointer;
    transition: transform 0.2s ease;
    /*s 悬停动画 */
}

.bar-chart .bar:hover {
    transform: scaleY(1.8);
    /* 悬停时放大 */
}

/* 阅读完成的背景变灰 */
.article-card.read {
    background-color: #e9ecef;
    /* 浅灰背景 */
    border: 1px solid #ccc;
    color: #6c757d;
    /* 浅灰字体 */
}

.article-card.read .article-title {
    color: #6c757d;
    /* 标题字体颜色变灰 */
}

/* ====== */

.analysis-angle {
    margin-bottom: 15px;
    padding: 10px;
    border-radius: 5px;
    background-color: #f8f9fa;
    cursor: pointer;
    transition: background-color 0.2s;
    position: relative;

    .analysis-angle:hover {
        background-color: #eef;
    }

    .analysis-angle h3 {
        font-size: 16px;
        color: #444;
    }

    .analysis-angle p {
        margin: 10px 0 0;
        font-size: 14px;
        color: #666;
        display: none;
    }


    .angle-paragraph-count {
        position: absolute;
        top: 10px;
        right: 10px;
        background-color: #007bff;
        color: white;
        font-size: 12px;
        padding: 5px 10px;
        border-radius: 12px;
    }

    /* 整体容器样式 */
    .angle-summary,
    .word-count-bar-chart-container {
        // margin: 5px 0;
        // padding: 5px;
        // border: 1px solid #ddd;
        border-radius: 5px;
        background-color: #f9f9f9;
    }

    /* 按钮样式 */
    .toggle-button {
        display: inline-block;
        font-size: 12px;
        font-weight: bold;
        color: #333;
        background-color: #e7e7e7;
        border: 1px solid #ccc;
        border-radius: 5px;
        padding: 5px 10px;
        cursor: pointer;
        margin-bottom: 5px;
        transition: background-color 0.3s ease, color 0.3s ease;
    }

    .toggle-button:hover {
        background-color: #d7d7d7;
        color: #111;
    }

    /* 不同按钮颜色 */
    .summary-button {
        background-color: #e6f7ff;
        border-color: #91d5ff;
    }

    .bars-button {
        background-color: #fffbe6;
        border-color: #ffe58f;
    }

    .summary-button:hover {
        background-color: #bae7ff;
        border-color: #40a9ff;
    }

    .bars-button:hover {
        background-color: #fff1b8;
        border-color: #ffc53d;
    }

    /* 摘要文字样式 */
    .summary-content {
        margin-top: 10px;
        font-size: 14px;
        line-height: 1.6;
        color: #555;
        white-space: pre-wrap;
        /* 保证换行正常显示 */
    }

    // 角度柱状图
    .word-count-bar-chart {
        margin-top: 10px;
        display: flex;
        flex-direction: column;
        gap: 5px;
        /* 柱状块之间的间距 */

        .bar {
            margin-left: 50px;
        }
    }


}


// 原始文章样式
.paragraph {
    display: flex;
    align-items: center;
    margin-bottom: 10px;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 5px;
    background-color: #f9f9f9;
}

//原文选中段落背景加深
.paragraph.active {
    background-color: rgba(0, 0, 0, 0.05);
    /* 背景色加深，透明度可以调整 */
    border-left: 7px solid #000;
    /* 也可以更改左边框颜色 */
}


.paragraph-content {
    flex: 1;
}

.color-tag {
    display: inline-block;
    width: 20px;
    height: 20px;
    margin: 5px;
    border-radius: 3px;
    cursor: pointer;
    transition: transform 0.2s;
    border: 2px solid transparent;
}

.color-tag.selected {
    border-color: #000;
    /* 高亮边框 */
    transform: scale(1.1);
    /* 放大效果 */
}



/* 重复率 */
.bar-container {
    display: flex;
    align-items: center;
    margin: 6px 10px;
    gap: 10px;
    /* 柱状块和字数标签之间的间距 */
    cursor: pointer;
    transition: transform 0.2s, opacity 0.2s;
    /* 增加过渡效果 */
}

.bar-container:hover {
    transform: scale(1.03);

}

.bar-container .bar {
    // width: 90%;
    height: 20px;
    border-radius: 3px;
}

.similarity-label {
    margin-left: 10px;
    /* 与柱状块之间的间距 */
    font-size: 14px;
    /* 字体大小 */
    color: #333;
    /* 字体颜色 */
    white-space: nowrap;
    /* 防止文字折行 */
}

#paragraph-comparison h3 {
    margin-top: 20px;
    /* 与上方柱状图之间的间距 */
    font-size: 18px;
    /* 标题字体大小 */
    color: #444;
    /* 标题颜色 */
}

/* 拖动效果 */
.angles-list {
    display: flex;
    flex-direction: column;
    // gap: 10px;
}

.analysis-angle {
    cursor: grab;
    /* 显示拖动的手形指针 */
    transition: transform 0.2s ease;
    /* 拖动时平滑动画 */
}

.analysis-angle.dragging {
    opacity: 0.5;
    /* 拖动时半透明 */
}

.drag-handle {
    cursor: grab;
    user-select: none;
    /* 禁止文本选择 */
    font-size: 16px;
    display: inline-block;
}

.drag-handle:active {
    cursor: grabbing;
}

.current-angle-title {
    margin-bottom: 15px;
    font-size: 18px;
    font-weight: bold;
    color: #444;
    text-align: center;
}


/* 曲线绘制 */
#connection-lines {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100vh;
    /* 使 SVG 覆盖整个视口高度 */
    pointer-events: none;
    /* 禁止鼠标事件 */
    z-index: 0;
}

.connection-line {
    transition: stroke 0.2s, stroke-width 0.2s;
}

/* 文章排序方式 */
.sort-options {
    display: flex;
    flex-direction: column;
    /* 垂直排列 */
    gap: 10px;
    /* 每个选项之间的间距 */
}

.sort-options label {
    display: flex;
    align-items: center;
    /* 垂直居中 */
    font-size: 14px;
    /* 调整字体大小 */
    cursor: pointer;
    /* 鼠标悬停时显示手型指针 */
}

.sort-options input[type="radio"] {
    margin-right: 10px;
    /* 单选框与文字之间的间距 */
}

/* setting里文章状态复选 */
.filter-status {
    display: flex;
    flex-direction: column;
    /* 垂直排列 */
    gap: 10px;
    /* 选项之间的间距 */
}

.filter-status label {
    font-size: 14px;
    cursor: pointer;
}


.word-count-label {
    font-size: 12px;
    color: #666;
    white-space: nowrap;
    /* 防止文字折行 */
}

// 角度分析里的柱状块隐藏按钮
.toggle-button {
    margin: 2px 2px;
    z-index: 10;
    padding: 5px 10px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 12px;
}

.toggle-button:hover {
    background-color: #0056b3;
}

// 原始文章高亮
.highlight {
    background-color: yellow;
    padding: 0;
    margin: 0;
    display: inline;
    /* 确保为内联元素，不破坏段落结构 */
    border-radius: 2px;
    /* 可选，圆角显示更美观 */
    cursor: pointer;
}

.highlight:hover {
    background-color: orange;
    /* 鼠标悬停时，颜色稍作变化 */
}

//句子相似高亮
.sentence {
    display: inline;
    /* 保持句子内联显示 */
}

.highlight-sentence {
    // background-color: rgba(255, 255, 0, 0.3);
    // transition: background-color 0.3s ease;
    color: gray;
    /* 设置灰色字体 */
}

.highlight-hover {
    // background-color: rgba(255, 255, 0, 0.6);
    background-color: lightgray;
    /* 设置 hover 时灰背景 */
    transition: background-color 0.2s ease;
    /* 添加平滑过渡效果 */
}

.highlight-icon {
    position: absolute;
    width: 32px;
    /* 稍微加大尺寸 */
    height: 32px;
    background-color: #ffeb3b;
    /* 使用更柔和的黄色 */
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 1000;
    box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.2);
    /* 更深的阴影，让按钮有浮动效果 */
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    /* 增加交互动画 */
    top: 0;
    left: 0;
}

.highlight-icon:hover {
    transform: scale(1.1);
    /* 悬停时放大 */
    box-shadow: 0px 6px 12px rgba(0, 0, 0, 0.3);
    /* 悬停时更深的阴影 */
}

.highlight-icon span {
    font-weight: bold;
    color: #000000;
    /* 黑色字体更清晰 */
    font-size: 18px;
    /* 调整文字大小 */
    user-select: none;
    /* 防止选中文字 */
}

.highlight-icon:active {
    transform: scale(0.95);
    /* 点击时略微缩小 */
    box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.2);
    /* 点击时阴影变浅 */
}
</style>