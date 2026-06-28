import Parser from 'rss-parser';

const parser = new Parser();

export async function loadFeed(url: string) {
  try {
    const feed = await parser.parseURL(url);

    return feed.items.map(item => ({
      title: item.title ?? '',
      link: item.link ?? '',
      pubDate: item.pubDate ?? '',
      content: item.contentSnippet ?? '',
      image:
        item.enclosure?.url ??
        item.itunes?.image ??
        null,
    }));
  } catch (err) {
    console.error(err);
    return [];
  }
}