/* Nguồn sự thật duy nhất về danh sách dashboard của portal.
   Thêm dashboard mới: thêm 1 object ở đây + 1 file HTML cùng tên với id. */
window.BP_DASHBOARDS = [
  {
    id: "chung-khoan",
    title: "Giao dịch nhà đầu tư nước ngoài",
    blurb: "Theo dõi mua/bán ròng của khối ngoại trên 17 mã cổ phiếu, chia theo phiên sáng, phiên chiều và ATC; kèm room ngoại còn lại và thanh khoản thị trường.",
    /* embed_options=light_theme: ep Streamlit dung theme sang, neu khong app se doi mau
       theo cai dat sang/toi cua may nguoi xem va choi voi nen trang cua portal. */
    embedUrl: "https://bp-tradingmonitor.streamlit.app/?embed=true&embed_options=light_theme",
    sourceUrl: "https://bp-tradingmonitor.streamlit.app",
    cadence: "Cập nhật nhiều lần mỗi phiên, Thứ 2 – Thứ 6"
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
    blurb: "Lãi suất huy động 18 ngân hàng, lãi suất liên ngân hàng và điều hành của SBV, tỷ giá, giá vàng, lợi suất trái phiếu và các chỉ tiêu vĩ mô.",
    embedUrl: "https://brospartners.github.io/liquidity-crawler/",
    sourceUrl: "https://brospartners.github.io/liquidity-crawler/",
    cadence: "Cập nhật hằng ngày lúc 17:00"
  }
];
