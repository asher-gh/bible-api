
import { UsfmParser } from './usfm-parser';
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
// import Genesis from '../bible/bsb/01GENBSB.usfm?raw';
import Exodus from '../bible/bsb/02EXOBSB.usfm?raw';

const parser = new UsfmParser();

const tree = parser.parse(Exodus);

const markdown = parser.renderMarkdown(tree);

const md = new MarkdownIt({
    html: true,
    breaks: false
});

const html = md.render(markdown);

const app = document.getElementById('app');
if (!app) {
    throw new Error('App element not found!');
}
app.innerHTML = html;

const json = document.getElementById('json');

if (!json) {
    throw new Error('json element not found!');
}

const final = hljs.highlight(JSON.stringify(tree, undefined, 2), { 
    language: 'json'
});

json.innerHTML = final.value;
