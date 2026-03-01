addEventListener('fetch', event => {
  event.respondWith(handle(event.request))
})

async function handle(req) {
  // serve index.html for root, otherwise 404
  const url = new URL(req.url)
  if (url.pathname === '/' || url.pathname === '/index.html') {
    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>allenlim.net</title>
  <style>body{font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:58rem;margin:4rem auto;padding:0 1rem;color:#111}header{border-bottom:1px solid #eee;padding-bottom:1rem;margin-bottom:2rem}h1{margin:0}article p{line-height:1.6}</style>
</head>
<body>
  <header>
    <h1>allenlim.net</h1>
    <p>Personal static blog powered by Cloudflare Workers (static)</p>
  </header>
  <main>
    <article>
      <h2>Hello — Welcome</h2>
      <p>This is a static placeholder. Write posts in Obsidian Markdown and use the upload skill to publish.</p>
    </article>
  </main>
  <footer>
    <p style="color:#666;font-size:0.9rem">© allenlim</p>
  </footer>
</body>
</html>
`
    return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } })
  }
  return new Response('Not Found', { status: 404 })
}
