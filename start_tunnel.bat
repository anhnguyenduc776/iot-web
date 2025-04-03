   @echo off
   title Cloudflare Tunnel
   cd /d C:\cloudflared
   cloudflared.exe tunnel run --url http://127.0.0.1:3000 f7cf627a-8f61-48e6-8b31-799d5570f183
   pause