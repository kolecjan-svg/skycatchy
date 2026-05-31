// __tests__/block4.test.ts – Visual Polish Phase tests
// [RALF TDD] Tests for Phase 3 polish additions: htmlUtils, visual fix regressions

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { decodeHtmlEntities } from '../lib/htmlUtils';

describe('HTML entity decoding (decodeHtmlEntities)', () => {
  test('decodes &amp; entity', () => {
    assert.equal(decodeHtmlEntities('Flights &amp; Hotels'), 'Flights & Hotels');
  });

  test('decodes &#038; entity (numeric amp)', () => {
    assert.equal(decodeHtmlEntities('Summer holiday &#038; more'), 'Summer holiday & more');
  });

  test('decodes &lt; and &gt;', () => {
    assert.equal(decodeHtmlEntities('&lt;b&gt;Bold&lt;/b&gt;'), 'Bold');
  });

  test('decodes &euro; to €', () => {
    assert.equal(decodeHtmlEntities('Price: &euro;299'), 'Price: €299');
  });

  test('decodes &ndash; to –', () => {
    assert.equal(decodeHtmlEntities('Vienna &ndash; Tokyo'), 'Vienna – Tokyo');
  });

  test('decodes &hellip; to …', () => {
    assert.equal(decodeHtmlEntities('See more&hellip;'), 'See more…');
  });

  test('strips jQuery/script content from scraped RSS', () => {
    const dirtyText = 'Flights from €300 jQuery(document).ready(function(){ jQuery("a").click(); }); Book now!';
    const result = decodeHtmlEntities(dirtyText);
    assert.ok(!result.includes('jQuery'), 'Should strip jQuery code');
    assert.ok(result.includes('Flights from €300'), 'Should keep flight text');
    assert.ok(result.includes('Book now!'), 'Should keep trailing text');
  });

  test('strips HTML tags', () => {
    const html = '<b>Cheap flights</b> from <span class="price">€299</span>';
    assert.equal(decodeHtmlEntities(html), 'Cheap flights from €299');
  });

  test('handles null/undefined gracefully', () => {
    assert.equal(decodeHtmlEntities(null), '');
    assert.equal(decodeHtmlEntities(undefined), '');
    assert.equal(decodeHtmlEntities(''), '');
  });

  test('returns plain text unchanged', () => {
    const plain = 'Cheap flights from Vienna to Rome for €89';
    assert.equal(decodeHtmlEntities(plain), plain);
  });

  test('handles multiple entities in sequence', () => {
    const text = 'Fly &amp; Stay &mdash; All-Inclusive from &euro;599';
    const result = decodeHtmlEntities(text);
    assert.equal(result, 'Fly & Stay — All-Inclusive from €599');
  });
});
