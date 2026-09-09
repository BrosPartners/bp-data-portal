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
    /* embed_options=light_theme: ép Streamlit dùng theme sáng, khớp bộ nhận diện mới.
       BẮT BUỘC phải ép — nếu bỏ tham số này, app đổi màu theo cài đặt sáng/tối của
       máy người xem và sẽ ra nền đen với người đang để chế độ tối. */
    embedUrl: "https://data-nn.brospartners.com/?embed=true&embed_options=light_theme",
    sourceUrl: "https://data-nn.brospartners.com",
    cadence: "Nhiều lần mỗi phiên, Thứ 2 – Thứ 6"
  },
  {
    id: "vi-mo",
    group: "Thị trường",
    icon: "landmark",
    title: "Vĩ mô & tiền tệ",
    blurb: "Lãi suất huy động của các ngân hàng lớn, lãi suất liên ngân hàng và điều hành của SBV, tỷ giá, giá vàng, lợi suất trái phiếu và các chỉ tiêu vĩ mô.",
    embedUrl: "https://brospartners.github.io/liquidity-crawler/",
    sourceUrl: "https://brospartners.github.io/liquidity-crawler/",
    cadence: "Hằng ngày lúc 17:00"
  },
  {
    id: "vn30",
    group: "Thị trường",
    icon: "trending",
    title: "Tracking VN30",
    blurb: "Dự báo cổ phiếu được thêm vào hoặc bị loại khỏi rổ VN30 tại kỳ review kế tiếp (01/2027), tính theo Bộ quy tắc HOSE-Index phiên bản 4.0: vốn hóa bình quân 12 tháng, free float, thanh khoản khớp lệnh và lợi nhuận sau thuế.",
    embedUrl: "https://brospartners.github.io/vn30-tracker/",
    sourceUrl: "https://brospartners.github.io/vn30-tracker/",
    cadence: "Hằng ngày lúc 17:00, Thứ 2 – Thứ 6",
    note: "Ước tính của Bros Partners theo quy tắc công bố của HOSE, không phải công bố chính thức của Sở."
  },
  {
    id: "bat-dong-san",
    group: "Bất động sản",
    icon: "mappin",
    title: "Bản đồ bất động sản TP.HCM",
    blurb: "Bản đồ và phân tích mặt bằng giá, tỷ suất cho thuê, diễn biến giá theo quý của các dự án căn hộ, kèm lớp hạ tầng metro.",
    embedUrl: "https://data-bds.brospartners.com/",
    sourceUrl: "https://data-bds.brospartners.com/",
    cadence: "Trực tiếp theo dữ liệu khảo sát"
  },
  {
    /* Đã hiện lại (2026-08-06) sau khi app gốc được khoá THẬT: bp-banking-dashboard
       kiểm tra đăng nhập ở phía máy chủ (proxy.ts + cookie ký HMAC), chỉ email
       @brospartners.com vào được — kể cả khi biết URL trực tiếp. */
    id: "phan-tich-nganh",
    group: "Nghiên cứu",
    icon: "research",
    title: "Phân tích ngân hàng & CTCK",
    blurb: "Định giá và hiệu quả kinh doanh của 14 ngân hàng và các công ty chứng khoán: P/B, P/E, ROE, chất lượng tài sản, tiến độ lợi nhuận so với kế hoạch, cổ tức và cơ cấu cổ đông.",
    embedUrl: "https://data-nganhang.brospartners.com/",
    sourceUrl: "https://data-nganhang.brospartners.com/",
    cadence: "Theo kỳ báo cáo tài chính"
  },
  {
    id: "cang-bien",
    group: "Cảng biển & Logistics",
    icon: "ship",
    title: "Lịch tàu & Sản lượng cảng biển",
    blurb: "Lịch tàu ra/vào, sản lượng và công suất khai thác của các cảng Hải Phòng và TP.HCM, kèm cơ cấu tuyến quốc tế và số liệu xuất nhập khẩu Việt Nam.",
    embedUrl: "https://brospartners.github.io/hp-ship-schedule/",
    sourceUrl: "https://brospartners.github.io/hp-ship-schedule/",
    cadence: "Hằng ngày"
  },
  {
    id: "thuy-san-my",
    group: "Thủy sản",
    icon: "trending",
    title: "Thương mại thủy sản của Mỹ",
    blurb: "Sản lượng, giá trị và giá bình quân (ASP) hàng thủy sản Mỹ nhập khẩu và xuất khẩu theo tháng, kèm cơ cấu theo nước đối tác. Nguồn NOAA Fisheries. Bấm nút Nhập khẩu / Xuất khẩu ở trên để chuyển chiều.",
    /* Dashboard gộp — 2 nguồn độc lập (mỗi bên có pipeline crawl/build/test
       riêng, KHÔNG đụng vào khi sửa cái này), portal.js chỉ chuyển iframe
       theo lựa chọn của người xem. Xem assets/portal.js: buildVariantSwitch. */
    variants: [
      {
        key: "nhap",
        label: "Nhập khẩu",
        title: "Nhập khẩu thủy sản vào Mỹ",
        embedUrl: "https://brospartners.github.io/us-seafood-imports/",
        sourceUrl: "https://brospartners.github.io/us-seafood-imports/"
      },
      {
        key: "xuat",
        label: "Xuất khẩu",
        title: "Xuất khẩu thủy sản của Mỹ",
        embedUrl: "https://brospartners.github.io/us-seafood-exports/",
        sourceUrl: "https://brospartners.github.io/us-seafood-exports/"
      }
    ],
    sourceUrl: "https://brospartners.github.io/us-seafood-imports/",
    cadence: "Hằng ngày lúc 05:00"
  },
  /* Giữ 2 id cũ ở dạng ẩn (không hiện sidebar/trang chủ) để link cũ đã
     chia sẻ/bookmark (nhap-khau-my.html, xuat-khau-my.html) vẫn mở được y
     như trước khi gộp — mỗi trang vẫn hiện 1 dashboard đơn, không có nút
     chuyển. Trang chủ/sidebar chỉ còn dẫn tới thuy-san-my.html ở trên. */
  {
    id: "nhap-khau-my",
    hidden: true,
    group: "Thủy sản",
    icon: "trending",
    title: "Nhập khẩu thủy sản vào Mỹ",
    blurb: "",
    embedUrl: "https://brospartners.github.io/us-seafood-imports/",
    sourceUrl: "https://brospartners.github.io/us-seafood-imports/",
    cadence: "Hằng ngày lúc 05:00"
  },
  {
    id: "xuat-khau-my",
    hidden: true,
    group: "Thủy sản",
    icon: "trending",
    title: "Xuất khẩu thủy sản của Mỹ",
    blurb: "",
    embedUrl: "https://brospartners.github.io/us-seafood-exports/",
    sourceUrl: "https://brospartners.github.io/us-seafood-exports/",
    cadence: "Hằng ngày lúc 05:00"
  }
];
