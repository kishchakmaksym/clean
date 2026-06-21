HTTPS on VPS (after DNS points to the server):

1. Install certbot on the host (not inside nginx container).
2. Stop frontend container temporarily: docker compose stop frontend
3. Issue certificate:
   certbot certonly --standalone -d smartclean.com.ua -d www.smartclean.com.ua
4. Mount certificates into nginx and add ssl server block,
   OR terminate TLS on the host with Caddy/another reverse proxy.

For a simple start, HTTP on port 80 works for testing.
Production should use HTTPS before enabling Monobank live payments.
