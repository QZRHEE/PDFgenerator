// full-run.js
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';
import fetch from 'node-fetch';
import PDFMerger from 'pdf-merger-js';

const BASE_URL = 'https://docs.amplify.aws';
const START_URL = `${BASE_URL}/swift/`;
const OUTPUT_DIR = './pdfs';
const MERGED_FILE = './amplify-swift-docs.pdf';

async function extractLinksFromPage(url) {
  const res = await fetch(url);
  const html = await res.text();
  const dom = new JSDOM(html);
  const document = dom.window.document;

  const anchors = Array.from(document.querySelectorAll('a'));
  const links = anchors
    .map(a => a.href)
    .filter(href => href.startsWith('/swift/') && !href.includes('#'))
    .map(href => BASE_URL + href)
    .filter((v, i, a) => a.indexOf(v) === i); // 중복 제거

  return links;
}

async function generatePDFs(links) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
  }

  for (const link of links) {
    console.log(`📄 PDF 생성 중: ${link}`);
    await page.goto(link, { waitUntil: 'networkidle0' });

    const slug = link.replace(BASE_URL + '/swift/', '').replace(/\//g, '_') || 'index';
    const filePath = path.join(OUTPUT_DIR, `${slug}.pdf`);

    await page.pdf({
      path: filePath,
      format: 'A4',
      printBackground: true,
      margin: { top: '1cm', bottom: '1cm', left: '1cm', right: '1cm' },
    });
  }

  await browser.close();
}

async function mergePDFs() {
  const merger = new PDFMerger();
  const files = fs.readdirSync(OUTPUT_DIR)
    .filter(file => file.endsWith('.pdf'))
    .sort(); // 알파벳 순 정렬

  for (const file of files) {
    console.log(`🔗 병합 중: ${file}`);
    merger.add(path.join(OUTPUT_DIR, file));
  }

  await merger.save(MERGED_FILE);
  console.log(`✅ 병합 완료: ${MERGED_FILE}`);
}

async function main() {
  console.log('🔍 링크 수집 중...');
  const links = await extractLinksFromPage(START_URL);
  console.log(`🔗 총 ${links.length}개 문서 발견`);

  console.log('🖨️ PDF 생성 시작...');
  await generatePDFs(links);

  console.log('📚 PDF 병합 시작...');
  await mergePDFs();

  console.log('🎉 모든 작업 완료!');
}

main();
