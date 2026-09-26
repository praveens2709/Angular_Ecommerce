const Product = require('../models/Products');

/**
 * Forgiving product search. "tshirt", "t shirt", "T-Shirts", "tees" and "tshrit" all find T-shirts.
 *
 * Both the query and each product's name/category/brand/colour are reduced to comparable words:
 * lowercased, accents and punctuation dropped, plurals trimmed and common synonyms mapped to one
 * form. Adjacent words are also joined ("t" + "shirt" -> "tshirt") so spacing and hyphens don't
 * matter. A query word then matches a product word exactly, as a prefix (while typing), inside the
 * joined field text, or within a small number of typos.
 */

/** Different words shoppers use for the same thing -> one form (compared after plural trimming) */
const SYNONYMS = {
  tee: 'tshirt',
  teeshirt: 'tshirt',
  tshirt: 'tshirt',
  tshrt: 'tshirt',
  hoody: 'hoodie',
  hoodie: 'hoodie',
  trouser: 'pant',
  pant: 'pant',
  pyjama: 'pajama',
  jogger: 'jogger',
  trackpant: 'jogger',
  sneaker: 'shoe',
  shoe: 'shoe',
  grey: 'gray',
  colour: 'color',
};

const normalize = (text) =>
  String(text ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Trims plurals: shirts -> shirt, hoodies -> hoody, dresses -> dress (short words stay) */
const stem = (word) => {
  if (word.length <= 3) return word;
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (/(ss|x|z|ch|sh)es$/.test(word)) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
};

const canon = (word) => {
  const stemmed = stem(word);
  return SYNONYMS[stemmed] || SYNONYMS[word] || stemmed;
};

/** Typos allowed for a word of this length */
const allowedTypos = (length) => (length <= 3 ? 0 : length <= 6 ? 1 : 2);

/** Edit distance counting a swap of neighbours ("tshrit") as one typo; stops early past `max` */
const distance = (a, b, max) => {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev2 = null;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost);
      if (prev2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) value = Math.min(value, prev2[j - 2] + 1);
      row.push(value);
      rowMin = Math.min(rowMin, value);
    }
    if (rowMin > max) return max + 1;
    prev2 = prev;
    prev = row;
  }
  return prev[b.length];
};

/** Searchable words for one product */
const productTerms = (product) => {
  const words = new Set();
  const joined = [];
  for (const field of [product.name, product.category, product.brand, product.color]) {
    const tokens = normalize(field).split(' ').filter(Boolean);
    tokens.forEach((token, i) => {
      words.add(canon(token));
      if (tokens[i + 1]) words.add(canon(token + tokens[i + 1]));
    });
    if (tokens.length) joined.push(tokens.join(''));
  }
  return { words: [...words], joined };
};

// Match strength. At or above STRICT the word is really there; below it's a typo guess.
const EXACT = 4;
const PREFIX = 3;
const INSIDE = 2.5;
const STRICT = INSIDE;
const TYPO = 2;
const TYPO_PREFIX = 1.5;

/** How well one query word matches a product (0 = not at all) */
const termScore = (term, terms) => {
  let best = 0;
  const typos = allowedTypos(term.length);
  for (const word of terms.words) {
    if (word === term) return EXACT;
    if (term.length >= 2 && word.startsWith(term)) best = Math.max(best, PREFIX);
    else if (typos && distance(term, word, typos) <= typos) best = Math.max(best, TYPO);
    // Half-typed word with a typo: "hoddi" -> "hoodie"
    else if (typos && word.length > term.length && distance(term, word.slice(0, term.length), typos) <= typos) {
      best = Math.max(best, TYPO_PREFIX);
    }
  }
  if (best < INSIDE && term.length >= 3 && terms.joined.some((text) => text.includes(term))) best = INSIDE;
  return best;
};

/**
 * Relevance of a product for a query: { score, strict }. score 0 = no match; strict = matched
 * without relying on typo guesses.
 */
const scoreProduct = (query, terms) => {
  const tokens = normalize(query).split(' ').filter(Boolean);
  if (!tokens.length) return { score: 0, strict: false };

  // Every word must match somewhere...
  const scores = tokens.map((token) => termScore(canon(token), terms));
  const perWord = scores.every(Boolean)
    ? { score: scores.reduce((a, b) => a + b, 0) / scores.length, strict: Math.min(...scores) >= STRICT }
    : { score: 0, strict: false };

  // ...or the words run together do ("t shirt" -> "tshirt")
  const joinedScore = tokens.length > 1 ? termScore(canon(tokens.join('')), terms) : 0;
  const together = { score: joinedScore, strict: joinedScore >= STRICT };

  if (perWord.strict !== together.strict) return perWord.strict ? perWord : together;
  return perWord.score >= together.score ? perWord : together;
};

// Names, categories, brands and colours of all products, kept briefly so each keystroke
// in the search box doesn't re-read the catalogue. Product edits clear it.
const CACHE_MS = process.env.NODE_ENV === 'test' ? 0 : 60_000;
let cached = null;

const loadIndex = async () => {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.index;
  const products = await Product.find({}, 'name category brand color').lean();
  const index = products.map((p) => ({ id: String(p._id), terms: productTerms(p) }));
  cached = { at: Date.now(), index };
  return index;
};

const invalidateSearchIndex = () => {
  cached = null;
};

/**
 * Matching product ids -> relevance. Typo guesses are only used when nothing matches for real,
 * so "shirt" doesn't also bring up "short". Only punctuation (e.g. ".*") matches nothing.
 */
const searchProducts = async (query) => {
  if (!normalize(query)) return new Map();
  const index = await loadIndex();
  const strict = new Map();
  const fuzzy = new Map();
  for (const { id, terms } of index) {
    const { score, strict: isStrict } = scoreProduct(query, terms);
    if (score) (isStrict ? strict : fuzzy).set(id, score);
  }
  return strict.size ? strict : fuzzy;
};

module.exports = { searchProducts, invalidateSearchIndex, scoreProduct, productTerms, normalize, distance };
