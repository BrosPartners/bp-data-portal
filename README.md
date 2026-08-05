# BP Data Portal

Cổng dữ liệu thị trường của Bros Partners — vỏ chung nhúng 3 dashboard đang vận hành độc lập.

## Chạy local

Mở trực tiếp `index.html` bằng trình duyệt. Không cần server, không cần cài gì.

## Thêm một dashboard mới

1. Thêm một object vào `dashboards.js` (`id`, `title`, `blurb`, `embedUrl`, `sourceUrl`, `cadence`).
2. Sao chép `vi-mo.html` thành `<id>.html`, sửa `<title>`, `data-dashboard`, và link trong `<noscript>`.

## Deploy

    $env:VERCEL_TOKEN = "<token tu vercel.com/account/tokens>"
    npx vercel --prod --yes --scope bros-partners

## Ràng buộc

- Portal KHÔNG đọc dữ liệu và KHÔNG sửa gì trong ba hệ thống nguồn:
  `bds-visualize`, `liquidity-crawler`, `my-stock-dashboard`.
- Ba app được nhúng bằng iframe, giữ nguyên URL và lịch cập nhật riêng.

## Gắn vào website công ty

`brospartners.com` chạy WordPress 3.9.40 (2014), chỉ HTTP. Không nhúng dashboard vào trong
WordPress. Cách gắn: WP Admin → Appearance → Menus → Custom Links → thêm URL portal,
đặt nhãn "Dữ liệu thị trường", mở tab mới.
