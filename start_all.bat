   @echo off
   title IoT System
   start "IoT Server" "D:\Wed_IOT\start_server.bat"
   timeout /t 5
   start "Cloudflare Tunnel" "C:\cloudflared\start_tunnel.bat"