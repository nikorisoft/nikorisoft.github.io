// Copyright (C) 2018 nikorisoft
//
// SPDX-License-Identifier: MIT

"use strict";

const renderer = new marked.Renderer();
const titleSuffix = " - nikori.jp - nikory";

const headingOriginal = renderer.heading;
renderer.heading = function (text, level) {
    // Skip Level 1
    if (level > 1) {
        return "<h" + level +">" + text + "</h" + level + ">";
    } else {
        return "";
    }
};
renderer.table = function (header, body) {
    return "<table class=\"uk-table uk-table-divider uk-table-small\"><thead>" + header + "</thead><tbody>" + body + "</tbody></table>";
}

Vue.component("nr-article", {
    template: `
    <div v-if="!article">
        <div uk-spinner></div>
    </div>
    <div v-else>
        <ul class="uk-pagination" v-if="article">
            <li v-if="article.prev >= 0"><a v-on:click="$emit('goto', article.prev)"><span uk-pagination-previous></span> Previous</a></li>
            <li class="uk-margin-auto-left" v-if="article.next >= 0"><a v-on:click="$emit('goto', article.next)">Next <span uk-pagination-next></span></a></li>
        </ul>
        <article class="uk-article" id="article">
            <h1 class="uk-artitle-title">{{ article.meta.title }}</h1>
            <p class="uk-article-meta">
                <span v-if="article.meta.updated">Last updated on {{ lastDate }}, originally posted</span>
                <span v-else>Posted</span> on {{ postDate }} by <a v-bind:href="'http://github.com/' + article.meta.author">{{ article.meta.author }}</a></p>
            <div v-html="contents"></div>
        </article>
    </div>
    `,
    props: [ "article", "prevAid", "nextAid" ],
    data: () => ({}),
    computed: {
        postDate: function () {
            const d = new Date(this.article.meta.date);
            return d.toLocaleString();
        },
        lastDate: function () {
            const d = new Date(this.article.meta.updated);
            return d.toLocaleString();
        },
        contents: function () {
            return marked(this.article.data, { renderer: renderer });
        }
    }
});

Vue.component("nr-article-index", {
    template: `
    <div class="article-index">
        <h1>Articles</h1>
        <div class="year" v-for="articlesForYear in sorted">
            <h2 class="uk-heading-line"><span>{{ articlesForYear.year }}</span></h2>
            <ul>
                <li v-for="article in articlesForYear.articles">
                    <a v-bind:href="'#' + article.id">{{ article.title }}</a>
                    <span class="uk-text-meta">{{ article.dateString }}</span>
                </li>
            </ul>
        </div>
    </div>
    `,
    props: [ "articles" ],
    data: () => ({}),
    computed: {
        sorted: function () {
            const years = Object.keys(this.articles).sort().reverse();
            const articles = [];
            for (const i in years) {
                const year = years[i];

                articles.push({
                    year,
                    articles: this.articles[year].reverse().map((a) => {
                        const d = new Date(a.date);
                        a.dateString = d.toLocaleString();
                        return a;
                    })
                });
            }
            return articles;
        }
    }
});

const MODE = {
    INIT: "init",
    ARTICLE: "article",
    INDEX: "index"
};
const data = { aid: 0, article: null, mode: MODE.INIT, articlesByYear: {} };
const metadata = {};
const ids = [];

const vm = new Vue({
    el: "#main",
    data,
    created: function () {
        axios.get("./metadata.json?q=" + new Date().getTime()).then((res) => {
            for (const i in res.data) {
                const article = res.data[i];
                metadata[article.id] = article;
                ids.push(article.id);

                const created = new Date(article.date);
                const y = created.getFullYear();

                if (this.articlesByYear[y] == null) {
                    this.articlesByYear[y] = [ article ];
                } else {
                    this.articlesByYear[y].push(article);
                }
            }
            this.mode = MODE.ARTICLE;
            this.initArticle();
        });
    },
    methods: {
        goto: function (aid) {
            history.pushState(null, null, "#" + aid);
            this.updateArticle(aid);
        },
        initArticle: function () {
            const latest = ids[ids.length - 1];
            const hash = location.hash.slice(1);

            if (hash == "index") {
                this.mode = MODE.INDEX;
                document.title = "Article Index" + titleSuffix;
            } else {
                this.mode = MODE.ARTICLE;

                const id = parseInt(hash);
                let force = false;
                if (hash.slice(-1) == "!") {
                    force = true;
                }
                if (id > 0 && (metadata[id] != null || force)) {
                    this.updateArticle(id);
                } else {
                    history.replaceState(null, null, "#" + latest);
                    this.updateArticle(latest);
                }
            }
        },
        updateArticle: function (aid) {
            this.article = null;
            axios.get("./data/" + aid + ".md").then((result) => {
                const { next, prev } = getNeighborArticles(aid);

                this.aid = aid;
                this.article = {
                    meta: metadata[this.aid],
                    data: result.data,
                    prev,
                    next
                };

                if (this.article.meta == null) {
                    this.article.meta = {
                        title: "New Article",
                        id: aid,
                        author: "nikorisoft",
                        date: new Date().toISOString()
                    };
                }
                document.title = metadata[this.aid].title + titleSuffix;
            });            
        }
    }
});

function getNeighborArticles(aid) {
    const index = ids.indexOf(aid.toString());
    let next = -1, prev = -1;
    if (index >= 0) { // otherwise, something wrong...
        if (index < ids.length - 1) {
            next = index + 1;
        }
        if (index > 0) {
            prev = index - 1;
        }
    }
    return { next: ids[next], prev: ids[prev] };
}

window.onpopstate = function () {
    vm.initArticle();
};
