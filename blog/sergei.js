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

Vue.component("nr-article", {
    template: `
    <div v-if="!article">
        <div uk-spinner></div>
    </div>
    <div v-else>
        <article class="uk-article" id="article">
        <h1 class="uk-artitle-title">{{ article.meta.title }}</h1>
        <p class="uk-article-meta">
            <span v-if="article.meta.updated">Last updated on {{ lastDate }}, originally posted</span>
            <span v-else>Posted</span> on {{ postDate }} by <a v-bind:href="'http://github.com/' + article.meta.author">{{ article.meta.author }}</a></p>
        <div v-html="contents"></div>
    </div>
    `,
    props: [ "article" ],
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

const data = { aid: 0, article: null, prevAid: -1, nextAid: -1 };
const metadata = {};
let ids = [];

const vm = new Vue({
    el: "#main",
    data,
    created: function () {
        axios.get("./metadata.json").then((res) => {
            for (const i in res.data) {
                const article = res.data[i];
                metadata[article.id] = article;
            }
            ids = Object.keys(metadata).sort();

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

            const id = parseInt(location.hash.slice(1));
            if (id > 0 && metadata[id] != null) {
                this.updateArticle(id);
            } else {
                history.replaceState(null, null, "#" + latest);
                this.updateArticle(latest);
            }
        },
        updateArticle: function (aid) {
            this.article = null;
            axios.get("./data/" + aid + ".md").then((result) => {
                const { next, prev } = getNeighborArticles(aid);

                this.aid = aid;
                this.nextAid = next;
                this.prevAid = prev;
                this.article = {
                    meta: metadata[this.aid],
                    data: result.data
                };

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
