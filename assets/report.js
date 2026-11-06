const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

function tone(value) {
  return ['positive', 'warning', 'negative'].includes(value) ? value : '';
}

function money(value, currency) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);
}

function formatKpi(kpi, currency) {
  if (kpi.format === 'currency') return money(kpi.value, currency);
  if (kpi.format === 'percent') return `${number.format(kpi.value)}%`;
  return number.format(kpi.value);
}

function render(data) {
  const account = data.account;
  document.title = `${account.shortName} Meta Ads 日报`;
  document.querySelector('[data-title]').textContent = `${account.shortName} Meta Ads 每日分析`;
  document.querySelector('[data-range]').textContent = `数据日 ${data.reportDate} · 七日基线 ${data.baselineRange}`;
  document.querySelector('[data-updated]').textContent = `更新于 ${data.generatedAtLabel}`;
  document.querySelector('[data-disclaimer]').textContent = data.disclaimer;

  const kpis = account.kpis.map(kpi => `
    <article class="kpi">
      <div class="kpi-label">${kpi.label}</div>
      <div class="kpi-value">${formatKpi(kpi, account.currency)}</div>
      <div class="kpi-note ${tone(kpi.tone)}">${kpi.note || '&nbsp;'}</div>
    </article>`).join('');

  const adsets = account.adsets.map(row => `
    <tr><td>${row.name}</td><td>${money(row.spend, account.currency)}</td><td>${number.format(row.linkClicks)}</td><td>${number.format(row.leads)}</td><td>${row.cpl === null ? '-' : money(row.cpl, account.currency)}</td><td>${number.format(row.linkCtr)}%</td></tr>`).join('');

  const creatives = account.creatives.map(row => `
    <tr><td>${row.name}</td><td>${money(row.spend, account.currency)}</td><td>${number.format(row.leads)}</td><td>${row.cpl === null ? '-' : money(row.cpl, account.currency)}</td><td><span class="${tone(row.tone)}">${row.note}</span></td></tr>`).join('');

  const maxSpend = Math.max(...account.adsets.map(item => item.spend), 1);
  const bars = account.adsets.map(row => `
    <div class="bar-row"><div class="bar-meta"><span>${row.name}</span><span>${money(row.spend, account.currency)} / ${row.leads} leads</span></div><div class="track"><div class="fill" style="width:${Math.max(row.spend / maxSpend * 100, 2)}%"></div></div></div>`).join('');

  const priorities = account.priorities.map((item, index) => `<li><span class="priority-number">${index + 1}</span><span>${item}</span></li>`).join('');
  const recommendations = account.recommendations.map(item => `<li>${item}</li>`).join('');

  document.querySelector('[data-report]').innerHTML = `
    <section class="account-head"><div><h2>${account.name}</h2><p>${account.summary}</p></div><span class="status ${tone(account.status.tone)}">${account.status.label}</span></section>
    <section class="kpis">${kpis}</section>
    <div class="grid">
      <div>
        <section class="panel"><div class="panel-head"><h3>广告组表现</h3><span>日报数据</span></div><div class="table-wrap"><table><thead><tr><th>广告组</th><th>花费</th><th>链接点击</th><th>潜客</th><th>CPL</th><th>链接CTR</th></tr></thead><tbody>${adsets}</tbody></table></div></section>
        <section class="panel"><div class="panel-head"><h3>素材观察</h3><span>按业务价值筛选</span></div><div class="table-wrap"><table><thead><tr><th>素材</th><th>花费</th><th>潜客</th><th>CPL</th><th>判断</th></tr></thead><tbody>${creatives}</tbody></table></div></section>
      </div>
      <div>
        <section class="panel"><div class="panel-head"><h3>花费分布</h3><span>${account.currency}</span></div><div class="bar-list">${bars}</div></section>
        <section class="panel"><div class="panel-head"><h3>今日重点</h3></div><ol class="priority-list">${priorities}</ol></section>
        <section class="panel"><div class="panel-head"><h3>优化建议</h3></div><ul class="list">${recommendations}</ul></section>
      </div>
    </div>`;
}

fetch(`report.json?v=${Date.now()}`, { cache: 'no-store' })
  .then(response => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  })
  .then(render)
  .catch(error => {
    document.querySelector('[data-report]').innerHTML = '<div class="error">日报暂时无法载入，请稍后刷新。</div>';
    console.error(error);
  });
