// Submits the site's indexable URLs to IndexNow (Bing, Yandex, and other
// participating search engines) so they re-crawl without waiting for their
// normal schedule. Google does not participate in IndexNow - this has no
// effect on Google indexing.
//
// Run manually after publishing content changes:
//   node scripts/submit-indexnow.mjs
//
// The key file below must stay published at the site root (it's how the
// search engines verify the submission belongs to this domain) - if the key
// ever changes, rename both the .txt file in the repo root and the constant
// here to match.

const HOST = "www.pinocchiobaja.hu";
const KEY = "5f12db84d4c3a377ac50393e0f76187b";
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

const urlList = [
  `https://${HOST}/`,
  `https://${HOST}/etlap.html`,
  `https://${HOST}/tamogatas.html`,
  `https://${HOST}/adatkezelesi-tajekoztato.html`,
];

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList,
  }),
});

console.log(`IndexNow submit: ${res.status} ${res.statusText}`);
if (!res.ok) {
  console.error(await res.text());
  process.exit(1);
}
