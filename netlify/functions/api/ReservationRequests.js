// netlify.toml
[[redirects]]
  from = "/api/*"
  to   = "/.netlify/functions/api/:splat"
  status = 200
