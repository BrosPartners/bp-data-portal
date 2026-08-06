/* Nguồn sự thật duy nhất về danh sách dashboard của portal.
   Thêm dashboard mới: thêm 1 object ở đây + 1 file HTML cùng tên với id. */
window.BP_DASHBOARDS = [
  {
    id: "chung-khoan",
    title: "Giao dịch nhà đầu tư nước ngoài",
    blurb: "Theo dõi mua/bán ròng của khối ngoại trên 17 mã cổ phiếu, chia theo phiên sáng, phiên chiều và ATC; kèm room ngoại còn lại và thanh khoản thị trường.",
    /* embed_options=dark_theme: ep Streamlit luon dung theme toi. Bo tham so nay di thi app
       se doi mau theo cai dat sang/toi cua may nguoi xem (khong on dinh); doi thanh
       light_theme neu muon nen trang. */
    embedUrl: "https://bp-tradingmonitor.streamlit.app/?embed=true&embed_options=dark_theme",
    sourceUrl: "https://bp-tradingmonitor.streamlit.app",
    cadence: "Cập nhật nhiều lần mỗi phiên, Thứ 2 – Thứ 6",
    note: "Bảng này chạy trên Streamlit và có thể ngủ khi lâu không ai truy cập — nếu thấy màn hình khởi động, bấm nút trong khung để đánh thức, mất khoảng 30 giây."
  },
  {
    id: "bat-dong-san",
    title: "Bản đồ bất động sản TP.HCM",
    blurb: "Bản đồ và phân tích mặt bằng giá, tỷ suất cho thuê, diễn biến giá theo quý của các dự án căn hộ, kèm lớp hạ tầng metro.",
    embedUrl: "https://bds-visualize.vercel.app/",
    sourceUrl: "https://bds-visualize.vercel.app/",
    cadence: "Cập nhật trực tiếp theo dữ liệu khảo sát"
  },
  {
    id: "vi-mo",
    title: "Vĩ mô & Ngân hàng",
    blurb: "Lãi suất huy động của các ngân hàng lớn, lãi suất liên ngân hàng và điều hành của SBV, tỷ giá, giá vàng, lợi suất trái phiếu và các chỉ tiêu vĩ mô.",
    embedUrl: "https://brospartners.github.io/liquidity-crawler/",
    sourceUrl: "https://brospartners.github.io/liquidity-crawler/",
    cadence: "Cập nhật hằng ngày lúc 17:00"
  },
  {
    /* hidden: TẠM ẨN khỏi trang chủ, thanh tab và footer (2026-08-06).
       Lý do: nội dung là research nội bộ (giá mục tiêu 14 ngân hàng), trong khi cổng đăng
       nhập của portal chỉ chạy phía trình duyệt — ai xem mã nguồn vẫn mở thẳng được app gốc.
       Trang phan-tich-nganh.html VẪN hoạt động nếu vào bằng URL trực tiếp, để nội bộ dùng.
       Bỏ dòng `hidden` này để đưa tab trở lại, sau khi app gốc đã được khoá thật. */
    hidden: true,
    id: "phan-tich-nganh",
    title: "Phân tích ngân hàng & CTCK",
    blurb: "Định giá và hiệu quả kinh doanh của 14 ngân hàng và các công ty chứng khoán: P/B, P/E, ROE, chất lượng tài sản, tiến độ lợi nhuận so với kế hoạch, cổ tức và cơ cấu cổ đông.",
    embedUrl: "https://bp-banking-dashboard-delta.vercel.app/",
    sourceUrl: "https://bp-banking-dashboard-delta.vercel.app/",
    cadence: "Cập nhật theo kỳ báo cáo tài chính, giá cổ phiếu lấy trực tiếp"
  }
];
