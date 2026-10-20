export default {
  async fetch(request) {
    const url = new URL(request.url);
    url.hostname = 'quickqr-staging.pages.dev';
    return fetch(new Request(url.toString(), request));
  },
};
