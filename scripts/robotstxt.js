hexo.extend.generator.register('robotstxt', function () {
  return {
    path: 'robots.txt',
    data: function () {
      let body = '';
      const isVercel = process.env.VERCEL_ENV === 'production';
      if (isVercel) {
        body = 'User-agent: Googlebot\nDisallow: /';
      }

      body += `\n\nUser-agent: *\nAllow: /\n\nSitemap: https://${isVercel ? 'ryuurock.vercel.app' : 'ryuurock.github.io'}/sitemap.xml`

      return body;
    }
  };
});
