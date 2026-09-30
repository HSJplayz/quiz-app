'use strict';

const fs = require('fs');
const path = require('path');
const { QUESTION_BANK, CATEGORIES } = require('./quiz.js');

const PUBLIC_DIR = path.join(__dirname, 'public');

function send(res, status, body, headers = {}) {
  const data = typeof body === 'string' ? body : JSON.stringify(body);
  const h = { ...headers, 'Access-Control-Allow-Origin': '*' };
  if (typeof body !== 'string') h['Content-Type'] = 'application/json';
  res.writeHead(status, h);
  res.end(data);
}

function handleRequest(req, res, state) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const { pathname } = url;

  if (req.method === 'OPTIONS') {
    send(res, 204, '', { 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': '*', 'Content-Length': '0' });
    return;
  }

  if (pathname === '/' || pathname === '/index.html') {
    const file = path.join(PUBLIC_DIR, 'index.html');
    if (!fs.existsSync(file)) {
      send(res, 404, { ok: false, error: 'index.html missing' });
      return;
    }
    send(res, 200, fs.readFileSync(file, 'utf8'), { 'Content-Type': 'text/html; charset=utf-8' });
    return;
  }

  if (pathname === '/api/categories' && req.method === 'GET') {
    const counts = CATEGORIES.map((c) => ({
      name: c,
      count: QUESTION_BANK.filter((q) => q.category === c).length,
    }));
    send(res, 200, { ok: true, categories: counts });
    return;
  }

  if (pathname === '/api/questions' && req.method === 'GET') {
    const category = url.searchParams.get('category') || '_all';
    const limitNum = parseInt(url.searchParams.get('limit') || '', 10);
    const limit = Number.isNaN(limitNum) ? undefined : limitNum;
    const pool = category === '_all'
      ? QUESTION_BANK
      : QUESTION_BANK.filter((q) => q.category === category);
    if (pool.length === 0) {
      send(res, 404, { ok: false, error: `No questions in category: ${category}` });
      return;
    }
    const used = limit && limit > 0 ? Math.min(limit, pool.length) : pool.length;
    send(res, 200, { ok: true, category, count: used, questions: pool.slice(0, used) });
    return;
  }

  send(res, 404, { ok: false, error: 'Not found' });
}

module.exports = { handleRequest, send };