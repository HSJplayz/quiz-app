# Changelog

All notable changes to this project are documented here.

## [1.0.0] - 2026-09-11

### Added
- Shared quiz engine (`quiz.js`): Fisher-Yates shuffle (optional seed), `pickQuestions`, `makeSession` / `createSessionFromQuestions`, live results with percent.
- Question bank (`questions.js`): 32 questions across science, geography, history and programming, each with 4 options + explanation.
- Interactive terminal front end (`cli.js`): letter or number answers, instant feedback, per-category and count filters, `--list` and `--help`, graceful EOF handling.
- Web front end (`public/index.html`): zero-CDN self-contained UI, setup screen → quiz screen → results screen.
- HTTP server (`app.js` + `server.js`): serves the UI and a JSON API (`/api/categories`, `/api/questions`), `--port`/`--host`, graceful shutdown.
- Test suite (`test_quiz.js`): 18 `node:test` cases — bank integrity, deterministic shuffle, scoring, category filtering, HTTP routes.
- GitHub Actions CI (Node 18 & 22), README, MIT license, `.gitignore`.