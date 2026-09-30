# Quiz App

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node](https://img.shields.io/badge/Node-18%2B-339933.svg)]()
[![CI](https://github.com/HSJplayz/quiz-app/actions/workflows/ci.yml/badge.svg)](https://github.com/HSJplayz/quiz-app/actions)
[![Streak Day 11](https://img.shields.io/badge/Streak-Day%2011-green.svg)](https://github.com/HSJplayz/streak)

> A zero-dependency multiple-choice quiz you can play in your **terminal** or in the **browser** — same question bank, both front ends.

Built with plain Node.js (no frameworks, no npm packages) on **Day 11** of the daily projects streak.

## Why

Every quiz app I found was either a heavyweight framework app or locked to a specific platform. This one is small, portable, and instant: one command in the terminal, or one static-ish server for the browser. The question bank is plain data, so adding categories is a `questions.js` edit away.

## Features

- **Two front ends, one engine** — the scoring/shuffle logic lives in `quiz.js` and is shared by the CLI and the web UI.
- **4 categories, 32 questions** — science, geography, history, programming (ASCII-safe, links-free, learn-while-you-play explanations on every answer).
- **Seeded shuffle** — Fisher–Yates with an optional seed, so results are reproducible for tests (and fun to re-roll).
- **Instant feedback** — every answer shows the correct choice *and* an explanation.
- **Category + count filters** — play `_all`, one category, or a fixed number of questions.
- **CLI accepts letters or numbers** — `A`/`a` or `1` both work, handled gracefully against invalid input.
- **Zero dependencies** — only built-in `node:` modules.

## Quick start

### Play in the terminal (no server)

```bash
node cli.js                 # all 32 questions, shuffled
node cli.js --category science
node cli.js -c geography -n 3
node cli.js --list          # show categories
```

### Play in the browser

```bash
node server.js --port 3000
# open http://127.0.0.1:3000
```

The server also exposes a small JSON API:

| Endpoint | Description |
| --- | --- |
| `GET /api/categories` | List categories with question counts |
| `GET /api/questions?category=history&limit=5` | Question bank (filtered, capped) |

## Tests

```bash
node --test test_quiz.js
```

18 tests cover bank integrity, shuffle determinism, session scoring, category filtering, and HTTP routes.

## Structure

```
quiz.js          shared engine: shuffle, pickQuestions, session, scoring
questions.js     the question bank (plain data)
cli.js           interactive terminal front end
app.js           HTTP request handler + JSON API
server.js        entry point (--port/--host)
public/index.html self-contained browser front end (no CDN)
test_quiz.js     test suite (node:test)
```

## Future scope

- **Timed mode** — per-question countdown with speed bonus.
- **More categories** — movies, sports, tech history, straight from the same bank format.
- **High score persistence** — localStorage on the web side, a JSON file for the CLI.
- **Multi-choice hint system** — reveal one wrong option at a cost.
- **Export bank to JSON** — let people author quizzes as data files (`--bank my-questions.json`).

## License

MIT.