import fs from 'node:fs';

const [jinmaiPath = 'jinmai/report.json', cusPath = 'cus/report.json'] = process.argv.slice(2);

const allowedKeys = {
  root: ['reportDate', 'baselineRange', 'generatedAtLabel', 'disclaimer', 'account'],
  account: ['shortName', 'name', 'currency', 'summary', 'status', 'kpis', 'adsets', 'creatives', 'priorities', 'recommendations'],
  status: ['label', 'tone'],
  kpi: ['label', 'value', 'format', 'note', 'tone'],
  adset: ['name', 'spend', 'linkClicks', 'leads', 'cpl', 'linkCtr'],
  creative: ['name', 'spend', 'leads', 'cpl', 'note', 'tone']
};

function fail(message) {
  throw new Error(message);
}

function readJson(path) {
  try {
    return JSON.parse(fs.readFileSync(path, 'utf8'));
  } catch (error) {
    fail(`${path}: invalid JSON (${error.message})`);
  }
}

function requireObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label}: expected object`);
}

function requireKeys(value, keys, label) {
  requireObject(value, label);
  const extras = Object.keys(value).filter(key => !keys.includes(key));
  if (extras.length) fail(`${label}: unexpected keys: ${extras.join(', ')}`);
  for (const key of keys) {
    if (key !== 'tone' && !(key in value)) fail(`${label}: missing ${key}`);
  }
}

function requireText(value, label) {
  if (typeof value !== 'string' || value.trim() === '') fail(`${label}: expected non-empty text`);
}

function requireNumber(value, label, nullable = false) {
  if (nullable && value === null) return;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) fail(`${label}: expected non-negative number`);
}

function requireList(value, label) {
  if (!Array.isArray(value) || value.length === 0) fail(`${label}: expected non-empty array`);
}

function validateReport(path, expected) {
  const report = readJson(path);
  requireKeys(report, allowedKeys.root, path);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(report.reportDate)) fail(`${path}: invalid reportDate`);
  requireText(report.baselineRange, `${path}.baselineRange`);
  requireText(report.generatedAtLabel, `${path}.generatedAtLabel`);
  requireText(report.disclaimer, `${path}.disclaimer`);

  const account = report.account;
  requireKeys(account, allowedKeys.account, `${path}.account`);
  if (account.shortName !== expected.shortName || account.name !== expected.name) fail(`${path}: account identity mismatch`);
  requireText(account.currency, `${path}.account.currency`);
  requireText(account.summary, `${path}.account.summary`);
  requireKeys(account.status, allowedKeys.status, `${path}.account.status`);
  requireText(account.status.label, `${path}.account.status.label`);

  requireList(account.kpis, `${path}.account.kpis`);
  if (account.kpis.length !== 6) fail(`${path}: expected exactly 6 KPIs`);
  account.kpis.forEach((item, index) => {
    requireKeys(item, allowedKeys.kpi, `${path}.account.kpis[${index}]`);
    requireText(item.label, `${path}.account.kpis[${index}].label`);
    requireNumber(item.value, `${path}.account.kpis[${index}].value`);
    requireText(item.format, `${path}.account.kpis[${index}].format`);
    requireText(item.note, `${path}.account.kpis[${index}].note`);
  });

  requireList(account.adsets, `${path}.account.adsets`);
  account.adsets.forEach((item, index) => {
    requireKeys(item, allowedKeys.adset, `${path}.account.adsets[${index}]`);
    requireText(item.name, `${path}.account.adsets[${index}].name`);
    for (const key of ['spend', 'linkClicks', 'leads', 'linkCtr']) requireNumber(item[key], `${path}.account.adsets[${index}].${key}`);
    requireNumber(item.cpl, `${path}.account.adsets[${index}].cpl`, true);
  });

  requireList(account.creatives, `${path}.account.creatives`);
  account.creatives.forEach((item, index) => {
    requireKeys(item, allowedKeys.creative, `${path}.account.creatives[${index}]`);
    requireText(item.name, `${path}.account.creatives[${index}].name`);
    for (const key of ['spend', 'leads']) requireNumber(item[key], `${path}.account.creatives[${index}].${key}`);
    requireNumber(item.cpl, `${path}.account.creatives[${index}].cpl`, true);
    requireText(item.note, `${path}.account.creatives[${index}].note`);
  });

  for (const key of ['priorities', 'recommendations']) {
    requireList(account[key], `${path}.account.${key}`);
    account[key].forEach((item, index) => requireText(item, `${path}.account.${key}[${index}]`));
  }

  const serialized = JSON.stringify(report);
  if (expected.forbidden.some(term => serialized.includes(term))) fail(`${path}: contains data from the other account`);
  if (/access[_-]?token|authorization|bearer|request[_-]?headers?/i.test(serialized)) fail(`${path}: contains credential or request metadata`);
  if (/\bEAA[A-Za-z0-9_-]{12,}\b/.test(serialized)) fail(`${path}: contains a possible Meta token`);
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(serialized)) fail(`${path}: contains an email address`);
  if (/(?:\+?86[- ]?)?1[3-9]\d{9}/.test(serialized)) fail(`${path}: contains a mobile number`);
  if (/\b\d{8,}\b/.test(serialized)) fail(`${path}: contains an unexpected long numeric identifier`);
  return report;
}

const jinmai = validateReport(jinmaiPath, {
  shortName: '金麦',
  name: '山东金麦矿产品有限公司',
  forbidden: ['联创钢铁', 'CUS', '896344833446699']
});
const cus = validateReport(cusPath, {
  shortName: 'CUS',
  name: '联创钢铁（山东）有限公司',
  forbidden: ['山东金麦', '金麦', '557861163728950']
});

if (jinmai.reportDate !== cus.reportDate) fail('reports: reportDate mismatch');
if (jinmai.baselineRange !== cus.baselineRange) fail('reports: baselineRange mismatch');

console.log(`Validated Jinmai and CUS reports for ${jinmai.reportDate}`);
