const escapeXML = (str) => str.replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const mdnSearchURL = (query) =>
  `https://developer.mozilla.org/en-US/search.json?` + 
  `&topic=api` + 
  `&topic=css` + 
  `&topic=html` + 
  `&topic=js` + 
  `&topic=mobile` + 
  `&topic=apps` + 
  `&topic=svg` + 
  `&topic=webext` + 
  `&q=${query}`; 

const npmSearchURL = (query) =>
  `https://npmjs.com/-/search?from=0&size=10&quality=1.95&popularity=3.3` +
  `&maintenance=2.05&text=${query}`;

const get = (url) => fetch(url)
  .then((response) => response.json())
  .then((data) => data);

const search = (query, suggestion) => {
  Promise.all([get(mdnSearchURL(query)), get(npmSearchURL(query))])
    .then((results) => {
      const [mdnResults, npmResults] = [...results];
      const mdn = mdnResults.documents
        .sort((a, b) => b.score - a.score)
        .slice(0, 2)
        .map((item) => ({
          content: item.url,
          description: `<match>mdn:</match> ${item.excerpt}`
        }));
      const npm = npmResults.objects
        .sort((a, b) => a.score.detail.quality - b.score.detail.quality)
        .slice(0, 3)
        .map((item) => {
          const link = item.package.links.repository ||
            item.package.links.homepage ||
            item.package.links.npm;
          const description = item.package.description &&
            escapeXML(item.package.description) || `<url>${link}</url>`;
          const keywords = item.package.keywords ?
            `<dim>(${item.package.keywords.join(', ')})</dim>` : '';

          return {
            content: link,
            description: `<match>npm</match>: "${item.package.name}" - ` +
              `${description} ${keywords}`
          };
        });

      chrome.omnibox.setDefaultSuggestion({
        description: 'Top search results from MDN and NPM'
      });

      suggestion([...mdn, ...npm]);
    });
};

chrome.browserAction.setBadgeText({
  text: 'MdnNpm'
});

chrome.omnibox.onInputChanged.addListener(search);
chrome.omnibox.onInputEntered.addListener((text, disposition) => {
  const url = text.startsWith('http://') || text.startsWith('https://') ?
    text : `https://google.com/search?q=${text}`;

  const tabs = {
    currentTab: (url) => chrome.tabs.update({url}),
    newForegroundTab: (url) => chrome.tabs.update({url}),
    newBackgroundTab: (url) => chrome.tabs.update({url, active: false}),
  };

  return tabs[disposition](url);
});
