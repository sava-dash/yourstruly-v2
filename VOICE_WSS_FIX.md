# Voice WebSocket SSL Certificate Fix

## Problem
PersonaPlex server (`100.97.242.10:8998`) has self-signed SSL certificate that browsers reject.

## Current Workaround (Development)
Using `ws://` (unencrypted) on Tailscale private network.

**Security:** Acceptable for development since Tailscale is encrypted at the network layer.

## Production Solutions

### Option 1: Reverse Proxy (Recommended)
Add nginx reverse proxy in front of PersonaPlex:

```nginx
# /etc/nginx/sites-available/personaplex

upstream personaplex {
    server 100.97.242.10:8998;
}

server {
    listen 443 ssl;
    server_name voice.yourstruly.love;
    
    ssl_certificate /etc/letsencrypt/live/voice.yourstruly.love/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/voice.yourstruly.love/privkey.pem;
    
    location /api/chat {
        proxy_pass http://personaplex;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**Steps:**
1. Set up DNS: `voice.yourstruly.love` → proxy server IP
2. Install nginx + certbot
3. Get Let's Encrypt certificate
4. Update `.env`: `NEXT_PUBLIC_PERSONAPLEX_URL=wss://voice.yourstruly.love/api/chat`

### Option 2: Tailscale HTTPS
Use Tailscale's built-in HTTPS certificates:

```bash
# On PersonaPlex server
tailscale cert 100-97-242-10.tailnet-xxxx.ts.net
```

Update URL to use Tailscale hostname:
```
NEXT_PUBLIC_PERSONAPLEX_URL=wss://100-97-242-10.tailnet-xxxx.ts.net:8998/api/chat
```

**Limitation:** Only works for users on the same Tailscale network.

### Option 3: Cloudflare Tunnel
Use Cloudflare to provide HTTPS:

```bash
# On PersonaPlex server
cloudflared tunnel create personaplex
cloudflared tunnel route dns personaplex voice.yourstruly.love
```

Update URL:
```
NEXT_PUBLIC_PERSONAPLEX_URL=wss://voice.yourstruly.love/api/chat
```

## Current Config

**Development:**
```env
NEXT_PUBLIC_PERSONAPLEX_URL=ws://100.97.242.10:8998/api/chat
```

**Production (after implementing Option 1):**
```env
NEXT_PUBLIC_PERSONAPLEX_URL=wss://voice.yourstruly.love/api/chat
```

## Deploy Checklist

Before production:
- [ ] Choose SSL solution (Option 1, 2, or 3)
- [ ] Set up certificate/proxy
- [ ] Update environment variable
- [ ] Rebuild Docker image with new URL
- [ ] Test WebSocket connection
- [ ] Verify SSL certificate in browser
