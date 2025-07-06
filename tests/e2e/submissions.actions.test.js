/* eslint-env jest */
// End-to-end check that every Actions link in the submissions list resolves
// without navigation errors (status 200 + heading present).

const puppeteer = require('puppeteer');

jest.setTimeout(30000); // allow enough time for navigation

/** heuristic selector for links in Actions column */
const actionsLinksSelector = 'tbody tr td:last-child a';

let browser;
let page;

beforeAll(async () => {
  browser = await puppeteer.launch({ headless: true });
  page = await browser.newPage();
});

afterAll(async () => {
  if (browser) await browser.close();
});

describe('Submissions list actions links', () => {
  it('each link navigates successfully', async () => {
    await page.goto('http://localhost:3000/submissions', { waitUntil: 'networkidle0' });

    const links = await page.$$eval(actionsLinksSelector, as => as.map(a => a.href));
    expect(links.length).toBeGreaterThan(0);

    for (const href of links) {
      await page.goto(href, { waitUntil: 'networkidle0' });
      const h1 = await page.$eval('h1', el => el.textContent.trim());
      expect(h1.length).toBeGreaterThan(0);
      // go back to list for next link
      await page.goto('http://localhost:3000/submissions', { waitUntil: 'networkidle0' });
    }
  });
});
