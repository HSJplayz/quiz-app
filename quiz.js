'use strict';

const { QUESTION_BANK, CATEGORIES } = require('./questions.js');

class QuizError extends Error {}

function shuffle(arr, seed) {
  const result = [...arr];
  let rng = Math.random;
  if (typeof seed === 'number') {
    let a = seed >>> 0;
    rng = () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function pickQuestions(category, count) {
  const pool = category === '_all'
    ? QUESTION_BANK
    : QUESTION_BANK.filter((q) => q.category === category);
  if (pool.length === 0) {
    throw new QuizError(`Unknown category: ${category}`);
  }
  const limit = count && Number.isInteger(count) && count > 0
    ? Math.min(count, pool.length)
    : pool.length;
  return shuffle(pool).slice(0, limit);
}

function createSessionFromQuestions(questions) {
  const state = {
    questions,
    index: 0,
    correct: 0,
    answers: [],
  };

  return {
    total() {
      return state.questions.length;
    },
    next() {
      if (state.index >= state.questions.length) return null;
      const q = state.questions[state.index];
      return {
        position: state.index + 1,
        question: q.question,
        options: q.options,
      };
    },
    answer(choiceIdx) {
      const q = state.questions[state.index];
      const isCorrect = choiceIdx === q.answer;
      if (isCorrect) state.correct += 1;
      state.answers.push({
        question: q.question,
        chosen: choiceIdx,
        correct: isCorrect,
      });
      state.index += 1;
      return {
        correct: isCorrect,
        answer: q.answer,
        explanation: q.explanation,
      };
    },
    progress() {
      return {
        answered: state.index,
        correct: state.correct,
        total: state.questions.length,
        percent: state.index === 0
          ? 0
          : Math.round((state.correct / state.index) * 100),
      };
    },
    results() {
      const total = state.questions.length;
      const correct = state.correct;
      const wrong = total - correct;
      const percent = total === 0 ? 0 : Math.round((correct / total) * 100);
      return { total, correct, wrong, percent, answers: [...state.answers] };
    },
  };
}

function makeSession(category, count) {
  return createSessionFromQuestions(pickQuestions(category, count));
}

module.exports = {
  QuizError,
  QUESTION_BANK,
  CATEGORIES,
  shuffle,
  pickQuestions,
  makeSession,
  createSessionFromQuestions,
};