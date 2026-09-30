'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const {
  QUESTION_BANK,
  CATEGORIES,
  shuffle,
  pickQuestions,
  makeSession,
  createSessionFromQuestions,
  QuizError,
} = require('./quiz.js');
const { handleRequest } = require('./app.js');

function mockRes() {
  const chunks = [];
  return {
    chunks,
    writeHead(status, headers) {
      this.status = status;
      this.headers = headers;
    },
    end(data) {
      this.body = data;
      this.done = true;
    },
  };
}

function jsonRes(res) {
  return JSON.parse(res.body);
}

test('question bank is structurally valid', () => {
  const ids = new Set();
  for (const q of QUESTION_BANK) {
    assert.ok(typeof q.question === 'string' && q.question.length > 0);
    assert.ok(Array.isArray(q.options) && q.options.length >= 2);
    assert.ok(q.answer >= 0 && q.answer < q.options.length);
    assert.ok(['science', 'geography', 'history', 'programming'].includes(q.category));
    assert.ok(typeof q.explanation === 'string' && q.explanation.length > 0);
    assert.ok(!ids.has(q.id), `duplicate id ${q.id}`);
    ids.add(q.id);
  }
  assert.ok(QUESTION_BANK.length >= 4, 'needs at least one question per category');
});

test('CATEGORIES reflects the bank with no duplicates', () => {
  assert.deepStrictEqual(new Set(CATEGORIES).size, CATEGORIES.length);
  for (const c of CATEGORIES) {
    assert.ok(QUESTION_BANK.some((q) => q.category === c));
  }
});

test('pickQuestions(_all) returns a permutation of the full bank', () => {
  const picked = pickQuestions('_all');
  assert.strictEqual(picked.length, QUESTION_BANK.length);
  const ids = picked.map((q) => q.id).sort();
  const bankIds = QUESTION_BANK.map((q) => q.id).sort();
  assert.deepStrictEqual(ids, bankIds);
});

test('pickQuestions filters by category and respects count', () => {
  const science = pickQuestions('science');
  assert.ok(science.length > 0);
  assert.ok(science.every((q) => q.category === 'science'));

  const limited = pickQuestions('history', 2);
  assert.strictEqual(limited.length, 2);
  assert.ok(limited.every((q) => q.category === 'history'));
});

test('pickQuestions caps count at pool size', () => {
  const all = pickQuestions('geography', 9999);
  const pool = QUESTION_BANK.filter((q) => q.category === 'geography');
  assert.strictEqual(all.length, pool.length);
});

test('pickQuestions throws QuizError for unknown category', () => {
  assert.throws(() => pickQuestions('nonsense'), QuizError);
});

test('seeded shuffle is deterministic', () => {
  assert.deepStrictEqual(shuffle([1, 2, 3, 4, 5], 42), shuffle([1, 2, 3, 4, 5], 42));
  assert.notStrictEqual(shuffle([1, 2, 3, 4, 5], 42), shuffle([1, 2, 3, 4, 5], 7));
});

test('shuffle preserves elements', () => {
  const src = [1, 2, 3, 4, 5, 6, 7, 8];
  const out = shuffle(src, 99);
  assert.strictEqual(out.length, src.length);
  assert.deepStrictEqual([...out].sort((a, b) => a - b), src);
  assert.deepStrictEqual(src, [1, 2, 3, 4, 5, 6, 7, 8], 'source array untouched');
});

test('session answers and tracks results', () => {
  const questions = QUESTION_BANK.slice(0, 3);
  const answers = questions.map((q) => q.answer);
  const session = createSessionFromQuestions(questions);
  assert.strictEqual(session.total(), 3);
  for (let i = 0; i < answers.length; i++) {
    const q = session.next();
    assert.ok(q, `question ${i} should exist`);
    const res = session.answer(answers[i]);
    assert.strictEqual(res.correct, true);
  }
  const r = session.results();
  assert.strictEqual(r.total, 3);
  assert.strictEqual(r.correct, 3);
  assert.strictEqual(r.wrong, 0);
  assert.strictEqual(r.percent, 100);
  assert.strictEqual(r.answers.length, 3);
});

test('session counts wrong answers correctly', () => {
  const session = makeSession('geography', 1);
  const q = session.next();
  const wrong = (q.answer + 1) % q.options.length;
  const result = session.answer(wrong);
  assert.strictEqual(result.correct, false);
  const r = session.results();
  assert.strictEqual(r.correct, 0);
  assert.strictEqual(r.wrong, 1);
  assert.strictEqual(r.percent, 0);
});

test('session.next returns null when exhausted', () => {
  const session = makeSession('geography', 1);
  assert.ok(session.next());
  session.answer(0);
  assert.strictEqual(session.next(), null);
});

test('answer exposes correct answer index and explanation', () => {
  const session = makeSession('science', 1);
  session.next();
  const result = session.answer(0);
  assert.strictEqual(typeof result.answer, 'number');
  assert.strictEqual(typeof result.explanation, 'string');
});

test('GET /api/categories returns JSON list', async () => {
  const res = mockRes();
  await handleRequest(
    { method: 'GET', url: 'http://localhost/api/categories', headers: { host: 'localhost' } },
    res
  );
  assert.strictEqual(res.status, 200);
  const body = jsonRes(res);
  assert.strictEqual(body.ok, true);
  assert.ok(Array.isArray(body.categories));
  assert.ok(body.categories.every((c) => c.name && c.count > 0));
});

test('GET /api/questions?category=history only returns history', async () => {
  const res = mockRes();
  await handleRequest(
    { method: 'GET', url: 'http://localhost/api/questions?category=history', headers: { host: 'localhost' } },
    res
  );
  assert.strictEqual(res.status, 200);
  const body = jsonRes(res);
  assert.ok(body.questions.every((q) => q.category === 'history'));
  assert.strictEqual(body.count, body.questions.length);
});

test('GET /api/questions with limit N returns N questions', async () => {
  const res = mockRes();
  await handleRequest(
    { method: 'GET', url: 'http://localhost/api/questions?category=_all&limit=2', headers: { host: 'localhost' } },
    res
  );
  assert.strictEqual(res.status, 200);
  const body = jsonRes(res);
  assert.strictEqual(body.questions.length, 2);
});

test('GET /api/questions with unknown category returns 404', async () => {
  const res = mockRes();
  await handleRequest(
    { method: 'GET', url: 'http://localhost/api/questions?category=nonsense', headers: { host: 'localhost' } },
    res
  );
  assert.strictEqual(res.status, 404);
  assert.strictEqual(jsonRes(res).ok, false);
});

test('GET / returns the index.html page', async () => {
  const res = mockRes();
  await handleRequest(
    { method: 'GET', url: 'http://localhost/', headers: { host: 'localhost' } },
    res
  );
  assert.strictEqual(res.status, 200);
  assert.match(res.headers['Content-Type'], /text\/html/);
  assert.ok(res.body.includes('Quiz App'));
});

test('GET /unknown-route returns 404', async () => {
  const res = mockRes();
  await handleRequest(
    { method: 'GET', url: 'http://localhost/nope', headers: { host: 'localhost' } },
    res
  );
  assert.strictEqual(res.status, 404);
  assert.strictEqual(jsonRes(res).ok, false);
});