'use strict';

const readline = require('readline');
const { makeSession, CATEGORIES, QuizError } = require('./quiz.js');

function parseArgs(argv) {
  const args = { category: null, count: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--category' || argv[i] === '-c') args.category = argv[++i];
    else if (argv[i] === '--count' || argv[i] === '-n') args.count = parseInt(argv[++i], 10);
    else if (argv[i] === '--list' || argv[i] === '-l') args.list = true;
    else if (argv[i] === '--help' || argv[i] === '-h') args.help = true;
  }
  return args;
}

function letter(n) {
  return String.fromCharCode(65 + n);
}

function ascii(s) {
  return s
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...');
}

function createPrompter(rl) {
  const EOF = Symbol('eof');
  const queue = [];
  let resolver = null;
  rl.on('line', (line) => {
    if (resolver) {
      const r = resolver;
      resolver = null;
      r(line);
    } else {
      queue.push(line);
    }
  });
  rl.on('close', () => {
    if (resolver) {
      const r = resolver;
      resolver = null;
      r(EOF);
    } else {
      queue.push(EOF);
    }
  });
  return {
    EOF,
    ask() {
      if (queue.length > 0) return Promise.resolve(queue.shift());
      return new Promise((resolve) => {
        resolver = resolve;
      });
    },
  };
}

function printHelp() {
  console.log('Usage: node cli.js [options]');
  console.log('');
  console.log('Interactive multiple-choice quiz in the terminal.');
  console.log('');
  console.log('Options:');
  console.log('  -c, --category <name>   only ask questions from this category (or _all)');
  console.log('  -n, --count <number>    limit number of questions');
  console.log('  -l, --list              list available categories and exit');
  console.log('  -h, --help              show this help');
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }
  if (args.list) {
    console.log('Available categories:');
    for (const c of CATEGORIES) console.log(`  ${c}`);
    console.log('  _all');
    return;
  }

  const category = args.category || '_all';
  let session;
  try {
    session = makeSession(category, args.count);
  } catch (err) {
    if (err instanceof QuizError) {
      console.error(`Error: ${err.message}`);
      console.error('Use --list to see categories.');
      process.exitCode = 1;
      return;
    }
    throw err;
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const { ask, EOF } = createPrompter(rl);

  console.log(`Quiz: ${category} (${session.total()} questions)`);
  console.log('Answer with a letter (A, B, C...) or number (1, 2, 3...).');
  console.log('');

  while (true) {
    const q = session.next();
    if (!q) break;
    console.log(`Q${q.position}/${session.total()}: ${ascii(q.question)}`);
    q.options.forEach((opt, i) => {
      console.log(`   ${letter(i)}) ${ascii(opt)}`);
    });
    process.stdout.write('> ');
    const line = await ask();
    if (line === EOF) {
      if (session.progress().answered < q.position) session.answer(-1);
      else break;
      rl.close();
      console.log('');
      break;
    }
    const raw = line.trim().toUpperCase();
    let idx = -1;
    if (/^\d+$/.test(raw)) idx = parseInt(raw, 10) - 1;
    else if (raw.length === 1 && raw >= 'A') idx = raw.charCodeAt(0) - 65;
    if (idx < 0 || idx >= q.options.length) {
      console.log('  (Invalid choice, counted as wrong.)');
      idx = -1;
      session.answer(-1);
      continue;
    }
    const result = session.answer(idx);
    console.log(
      result.correct
        ? `  CORRECT! ${ascii(result.explanation)}`
        : `  WRONG. Correct answer: ${letter(result.answer)}) ${ascii(q.options[result.answer])}\n  ${ascii(result.explanation)}`
    );
    console.log('');
  }

  const r = session.results();
  console.log('----- Results -----');
  console.log(`Correct:  ${r.correct}/${r.total}`);
  console.log(`Percent:  ${r.percent}%`);
  console.log(r.percent === 100 ? 'Perfect score!' : r.percent >= 60 ? 'Passed.' : 'Keep practicing.');
  rl.close();
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});