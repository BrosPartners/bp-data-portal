/* Nguồn sự thật duy nhất về danh sách dashboard của portal.

   Thêm dashboard mới:
     1. Thêm 1 object ở đây (id, group, icon, title, blurb, embedUrl, sourceUrl, cadence)
     2. Sao chép vi-mo.html thành <id>.html, sửa <title>, data-dashboard, link trong <noscript>

   group  — tên nhóm hiện trên sidebar. Trùng tên = xếp chung nhóm, thứ tự nhóm
            theo lần xuất hiện đầu tiên trong mảng này.
   icon   — khoá trong bảng ICONS của assets/portal.js (SVG nội tuyến, không dùng thư viện ngoài).
   hidden — true thì không hiện ở sidebar/trang chủ/footer, nhưng URL trực tiếp vẫn vào được.
*/
window.BP_DASHBOARDS = [
  {
    id: "chung-khoan",
    group: "Thị trường",
    icon: "trending",
    title: "Giao dịch nhà đầu tư nước ngoài",
    blurb: "Theo dõi mua/bán ròng của khối ngoại trên 17 mã cổ phiếu, chia theo phiên sáng, phiên chiều và ATC; kèm room ngoại còn lại và thanh khoản thị trường.",
    /* embed_options=dark_theme: ép Streamlit luôn dùng theme tối. Bỏ tham số này đi thì app
       sẽ đổi màu theo cài đặt sáng/tối của máy người xem (không ổn định); đổi thành
       light_theme nếu muốn nền trắng. */
    embedUrl: "https://bp-tradingmonitor.streamlit.app/?embed=true&embed_options=dark_theme",
    sourceUrl: "https://bp-tradingmonitor.streamlit.app",
    cadence: "Nhiều lần mỗi phiên, Thứ 2 – Thứ 6",
    note: "Bảng này chạy trên Streamlit và có thể ngủ khi lâu không ai truy cập — nếu thấy màn hình khởi động, bấm nút trong khung để đánh thức, mất khoảng 30 giây."
  },
  {
    id: "vi-mo",
    group: "Thị trường",
    icon: "landmark",
    title: "Vĩ mô & Ngân hàng",
    blurb: "Lãi suất huy động của các ngân hàng lớn, lãi suất liên ngân hàng và điều hành của SBV, tỷ giá, giá vàng, lợi suất trái phiếu và các chỉ tiêu vĩ mô.",
    embedUrl: "https://brospartners.github.io/liquidity-crawler/",
    sourceUrl: "https://brospartners.github.io/liquidity-crawler/",
    cadence: "Hằng ngày lúc 17:00"
  },
  {
    id: "bat-dong-san",
    group: "Bất động sản",
    icon: "mappin",
    title: "Bản đồ bất động sản TP.HCM",
    blurb: "Bản đồ và phân tích mặt bằng giá, tỷ suất cho thuê, diễn biến giá theo quý của các dự án căn hộ, kèm lớp hạ tầng metro.",
    embedUrl: "https://bds-visualize.vercel.app/",
    sourceUrl: "https://bds-visualize.vercel.app/",
    cadence: "Trực tiếp theo dữ liệu khảo sát"
  },
  {
    /* hidden: TẠM ẨN khỏi sidebar, trang chủ và footer (2026-08-06).
       Lý do: nội dung là research nội bộ (giá mục tiêu 14 ngân hàng), trong khi cổng đăng
       nhập của portal chỉ chạy phía trình duyệt — ai xem mã nguồn vẫn mở thẳng được app gốc.
       Trang phan-tich-nganh.html VẪN hoạt động nếu vào bằng URL trực tiếp, để nội bộ dùng.
       Bỏ dòng `hidden` này để đưa tab trở lại, sau khi app gốc đã được khoá thật. */
    hidden: true,
    id: "phan-tich-nganh",
    group: "Nghiên cứu",
    icon: "research",
    title: "Phân tích ngân hàng & CTCK",
    blurb: "Định giá và hiệu quả kinh doanh của 14 ngân hàng và các công ty chứng khoán: P/B, P/E, ROE, chất lượng tài sản, tiến độ lợi nhuận so với kế hoạch, cổ tức và cơ cấu cổ đông.",
    embedUrl: "https://bp-banking-dashboard-delta.vercel.app/",
    sourceUrl: "https://bp-banking-dashboard-delta.vercel.app/",
    cadence: "Theo kỳ báo cáo tài chính"
  }
];
