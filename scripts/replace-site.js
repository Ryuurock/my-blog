hexo.extend.filter.register('before_generate', () => {
  const isVercel = process.env.VERCEL_ENV === 'production';
  if (isVercel) {
    hexo.config.url = hexo.config.vercelUrl
  }
});
