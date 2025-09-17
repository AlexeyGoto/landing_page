// tools/scrape.js
import fs from 'node:fs';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const URL = 'https://fogplay.mts.ru/promo/computer/ded_sw/';

function abs(href) {
  if (!href) return '';
  if (/^https?:\/\//i.test(href)) return href;
  return 'https://fogplay.mts.ru' + (href.startsWith('/') ? '' : '/') + href;
}

async function run() {
  const res = await fetch(URL, {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; DED-SW-Scraper/1.0)',
      'accept-language': 'ru,en;q=0.8'
    }
  });
  const html = await res.text();
  const $ = cheerio.load(html);

  const items = [];
  // Вёрстка у FogPlay меняется — берём «широкие» селекторы
  $('.card.card-outside').each((_, el) => {
    const $c = $(el);
    const name  = $c.find('p.card__title, .server-card__title, .title').first().text().trim();
    const price = $c.find('.card__price, .price').first().text().trim();
    const ping  = $c.find('.ping__value, .ping, .latency').first().text().trim();
    // Внутри «card-inside» обычно лежит ссылка «Играть»
    const link  = abs(
      $c.find('.card.card-inside a.button[href], a.button[href*="/computer/"]').first().attr('href') || ''
    );

    if (name && link) items.push({ name, price, ping, link });
  });

  // Фоллбек: если карточки не распознались — пробуем любые «a» с параметрами slug=ded_sw
  if (items.length === 0) {
    $('a[href*="/computer/"]').each((_, a) => {
      const $a = $(a);
      const link = abs($a.attr('href'));
      const name = $a.text().trim() || 'ПК';
      if (link) items.push({ name, price: '', ping: '', link });
    });
  }

  const data = { ts: Date.now(), url: URL, count: items.length, items };
  fs.writeFileSync('offers.json', JSON.stringify(data, null, 2));
  console.log('Saved', items.length, 'items');
}

run().catch(err => {
  console.error('Scrape error:', err);
  // Пишем хотя бы пустой файл, чтобы страница не падала
  const data = { ts: Date.now(), url: URL, count: 0, items: [], error: String(err) };
  fs.writeFileSync('offers.json', JSON.stringify(data, null, 2));
  process.exitCode = 1;
});
