# Hệ Thống Giám Sát IoT

Hệ thống giám sát nhiệt độ và nồng độ khí gas thông minh sử dụng công nghệ IoT.

## Tính năng

- Giám sát nhiệt độ môi trường realtime
- Đo lường nồng độ khí gas
- Giao diện web trực quan, dễ sử dụng
- Kết nối không dây thông qua MQTT
- Bảo mật dữ liệu
- Chạy 24/7 với GitHub Actions
- Tự động khởi động lại khi gặp lỗi
- Giám sát hiệu suất và log
- Deploy tự động lên GitHub Pages

## Công nghệ sử dụng

- Node.js
- Express.js
- MQTT
- HTML/CSS/JavaScript
- Font Awesome
- PM2 (Process Manager)
- GitHub Actions
- GitHub Pages

## Truy cập

- Website: https://anhnguyenduc04.site
- GitHub Repository: https://github.com/anhnguyenduc776/iot-web
- GitHub Pages: https://anhnguyenduc776.github.io/iot-web

## Cài đặt

1. Clone repository:
```bash
git clone https://github.com/anhnguyenduc776/iot-web.git
```

2. Cài đặt dependencies:
```bash
npm install
```

3. Cài đặt PM2 (Process Manager):
```bash
npm install -g pm2
```

4. Chạy server:
```bash
pm2 start server.js --name "iot-server" --time
```

5. Lưu cấu hình PM2:
```bash
pm2 save
```

## Cấu hình

### Server
- Port: 3000
- Auto-restart: Có
- Logging: Bật
- Monitoring: Bật

### MQTT
- Broker: test.mosquitto.org
- Topics:
  - Nhiệt độ: anhnguyenduc04/iot/temperature
  - Khí gas: anhnguyenduc04/iot/gas

### GitHub Actions
- Chạy tự động khi push code
- Chạy định kỳ mỗi 6 giờ
- Giám sát và log tự động
- Deploy tự động lên GitHub Pages

### GitHub Pages
- Branch: gh-pages
- Domain: anhnguyenduc04.site
- Auto-deploy: Có
- SSL: Có

## Giám sát

1. Xem trạng thái server:
```bash
pm2 status
```

2. Xem log:
```bash
pm2 logs
```

3. Giám sát hiệu suất:
```bash
pm2 monit
```

## Xử lý sự cố

1. Khởi động lại server:
```bash
pm2 restart iot-server
```

2. Xem thông tin chi tiết:
```bash
pm2 show iot-server
```

3. Xóa log:
```bash
pm2 flush
```

4. Kiểm tra GitHub Pages:
- Vào Settings > Pages
- Kiểm tra trạng thái deployment
- Xem log deployment

## Giấy phép

MIT License 