"use strict";
const fs = require("fs");
const path = require("path");
const marked = require("marked");

if (process.argv < 3) {
    console.error("Usage: %s (timestamp) [Files...]", process.argv[1]);
    process.exit(1);
}
const timestamp = parseInt(process.argv[2]);
const dateString = new Date(timestamp * 1000).toISOString();
const files = process.argv.slice(3).sort();
const metadataFile = path.join(__dirname, "..", "blog", "metadata.json");

const metadata = require(metadataFile);

const renderer = new marked.Renderer();
let foundTitle = "";
renderer.heading = function (text, level) {
    if (level == 1) {
        foundTitle = text;
    }
    return "";
};

for (const i in files) {
    const id = path.basename(files[i], ".md");

    const article = metadata.find((a) => a.id.toString() == id);
    if (article != null) {
        console.log("Updated article: %s", files[i]);
        if (article.date != dateString) {
            article.updated = dateString;
        }
    } else {
        console.log("New article: %s", files[i]);
        metadata.push(createMetadata(files[i], id));
    }
}

function createMetadata(file, id) {
    const filename = path.join(__dirname, "..", file);
    const data = fs.readFileSync(filename).toString("utf-8");

    marked(data, { renderer });

    return {
        id,
        title: foundTitle,
        author: "nikorisoft",
        date: dateString
    };
}

fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 4));

process.exit(0);
