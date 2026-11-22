<div align="center">
  <img src="assets/logo.png" alt="PhysBoard Logo" width="120" height="120" />
  <h1>PhysBoard v1.2.0</h1>
  <p>
    <strong>Bảng trắng tương tác dạy Toán · Vật lý · Hoá học THPT (GDPT 2018)</strong><br />
    <em>Hoạt động mượt mà trên Windows (.exe), Android (.apk) &amp; Trình duyệt — Dữ liệu lưu 100% Offline</em>
  </p>

  <p>
    <a href="https://github.com/NeoGao-com/PhysBoard/releases/latest">
      <img src="https://img.shields.io/badge/Download-Windows%20(.exe)-2563eb?style=for-the-badge&logo=windows" alt="Download Windows EXE" />
    </a>
    &nbsp;
    <a href="https://github.com/NeoGao-com/PhysBoard/releases/latest">
      <img src="https://img.shields.io/badge/Download-Android%20(.apk)-16a34a?style=for-the-badge&logo=android" alt="Download Android APK" />
    </a>
  </p>

  <p>
    <code>Next.js 16</code> · <code>React 19</code> · <code>Tailwind CSS v4</code> · <code>KaTeX &amp; MathLive</code> · <code>Tauri v2 (Rust)</code> · <code>Capacitor Android</code>
  </p>
</div>

---

## Tại sao chọn PhysBoard?

Giáo viên dạy **Toán – Lý – Hoá** thường phải mở cùng lúc nhiều phần mềm rời rạc: một app để viết vẽ bảng, một trình duyệt để mở thí nghiệm PhET, một máy tính cầm tay riêng và một file tra cứu công thức / bảng tuần hoàn.

**PhysBoard** gom toàn bộ quy trình giảng dạy vào **một không gian bảng trắng vector duy nhất**, tối ưu cho cả **chuột/bảng vẽ Wacom trên Windows** lẫn **bút cảm ứng (S Pen / Stylus) trên tablet Android**.

---

## Tính năng nổi bật & Ví dụ sử dụng thực tế

### 1. Cửa sổ Thí nghiệm Mô phỏng PhET & HTML Toàn màn hình (`⚗ Thí nghiệm`)
Thay vì nhúng khung nhỏ chật hẹp lên canvas, PhysBoard chạy thí nghiệm như một **cửa sổ toàn màn hình độc lập ngay trong app**:
- **Kho PhET Online (28+ bài chọn lọc & dán link bất kỳ):** Tự động chuẩn hoá sang gói đa ngôn ngữ `_all.html?locale=vi` (hiển thị tiếng Việt, tự động fallback tiếng Anh nếu bài đó chưa có bản dịch).
- **Kho File `.html` Offline (IndexedDB + Blob URL):** Tải sẵn file HTML5 đơn lẻ từ [PhET](https://phet.colorado.edu/) về máy, kéo-thả vào app để lưu lâu dài — dạy **100% không cần Internet**, tối ưu RAM cho Android WebView.
- **Chuyển đổi tức thì Bảng trắng ↔ Thí nghiệm:** Bấm **─ Về bảng trắng** để ghi công thức/chú thích mà thí nghiệm vẫn giữ nguyên trạng thái chạy ngầm; bấm nút nổi góc dưới phải để quay lại đúng thí nghiệm đang chạy dở.

> **Ví dụ tiết dạy Vật lý 11 — Dao động con lắc đơn:**
> 1. Bấm **⚗ Thí nghiệm** → chọn **Thí nghiệm Con lắc đơn** (`pendulum-lab`) ở chế độ toàn màn hình để học sinh quan sát chu kỳ $T$ khi thay đổi chiều dài dây $l$.
> 2. Bấm **─ Về bảng trắng** → mở ngăn kéo **Vật lý** → chèn 1 chạm công thức $T = 2\pi\sqrt{\frac{l}{g}}$ lên bảng và giải bài tập minh hoạ.
> 3. Bấm nút nổi **⚗ Thí nghiệm Con lắc đơn** ở góc dưới phải để mở lại ngay thí nghiệm đang chạy.

---

### 2. Bộ 3 Ngăn kéo Công thức & Tra cứu chuyên sâu (Chèn LaTeX 1 chạm)

Mỗi môn học có ngăn kéo riêng biệt, tìm kiếm tiếng Việt không dấu và nút **+ Chèn bảng** biến công thức thành đối tượng `MathText` sắc nét (KaTeX) ngay trên bảng:

| Môn học | Nội dung chính | Điểm nhấn |
| :--- | :--- | :--- |
| **∑ Toán** | Đại số & PT, Lượng giác, Giải tích, Hình học 2D & `Oxy`, Không gian & `Oxyz`, Tổ hợp & Xác suất | Tách rõ từng chủ đề THPT 10–11–12 |
| **⚛ Vật lý** | Công thức theo chủ đề (Lớp 10–11–12), Bảng hằng số CODATA, **Bộ đổi đơn vị kèm công thức quy đổi** | Gồm hệ số đổi trực quan (vd: `1 km/h = 1/3,6 m/s`) |
| **🧪 Hoá** | 6 nhóm công thức (Mol & Dung dịch, Nhiệt hoá, pH, Điện hoá, Hữu cơ, Giải nhanh) + **Bảng Tuần Hoàn 118 NT** | Click vào nguyên tố bất kỳ để xem cấu hình `e`, $M$, độ âm điện, số OXH & chèn lên bảng |

> **Ví dụ tiết dạy Hoá học 10 — Cấu tạo nguyên tử:**
> - Mở **🧪 Hoá** → chuyển sang tab **⚛ Bảng Tuần Hoàn (118 NT)** → gõ `Fe` hoặc `26`.
> - Chọn ô **Sắt (Fe)** → bấm **+ Chèn cấu hình e** để đưa ngay `Fe (Z=26): [Ar] 3d⁶ 4s²` lên bảng trắng mà không cần gõ tay.

---

### 3. Bảng vẽ Vector, Hình học 2D/3D & Đồ thị Toán học
- **Bút vẽ thông minh (`Stylus-ready`):** Bút bi, Bút máy thư pháp (`ink:fountain`), Bút chì, Dạ quang, Bút nét đứt, **Bút chỉ Laser** (dấu chấm / vệt sáng tự mờ) và **Ink-to-Shape** (vẽ tay giữ nguyên 0.34s tự nắn thành đường thẳng, tròn, tam giác).
- **Hình học phẳng 2D:** Điểm, đoạn/đường/tia/vectơ, đường tròn, đa giác, dựng hình tự động (trọng tâm, trực tâm, đường cao, phân giác, tiếp tuyến, trung trực), ký hiệu bằng nhau/vuông góc.
- **Hình học không gian 3D & `Oxyz`:** Hộp chữ nhật, lập phương, lăng trụ, chóp, chóp cụt, trụ, nón, cầu; xoay góc nhìn quỹ đạo 3D trực tiếp, tìm giao tuyến & thiết diện.
- **Đồ thị & Giải tích:** Hệ trục `Oxy`, đồ thị hàm số/bất phương trình có **thanh trượt tham số ($a, b, m$)**, bảng biến thiên, cây xác suất Bayes, biểu đồ thống kê & biểu đồ Venn.

---

### 4. Máy tính cầm tay, Soạn đề A4, PDF & Tuỳ biến Giao diện
- **Máy tính khoa học (`fx-580VN X` style):** Giải phương trình, tính tích phân/đạo hàm số, phân số, lượng giác, ma trận/thống kê ngay trên cửa sổ nổi.
- **Chế độ trang linh hoạt:** Bảng vô hạn, trang A4 soạn đề in ấn, nhiều loại nền giấy (lưới chấm, ô ly, kẻ ngang, nền đen/xanh bảng phấn).
- **Chèn & Xuất tài liệu:** Chèn nhiều trang **PDF** làm nền giảng dạy (có nút khoá cố định PDF), xuất bảng ra **PNG**, **PDF** hoặc lưu/mở file dự án `.phys.json`.
- **Khoá/Mở khoá & Tuỳ biến thanh công cụ:**
  - Chọn khối bất kỳ → bấm **🔒 Khóa vào trang** để tránh xê dịch nhầm khi viết đè lên; bấm **🔓 Mở khoá N khối** ở góc dưới trái khi cần chỉnh sửa lại.
  - Vào **Cài đặt → Ẩn/Hiện Công cụ** để bật/tắt từng nút (**Toán**, **Vật lý**, **Hoá**, **Thí nghiệm**, **Máy tính**...) theo nhu cầu từng tiết dạy.
- **Bảng lệnh nhanh (`Ctrl+K`):** Tìm kiếm mọi công cụ và gán phím tắt cá nhân.

---

## Cấu trúc dự án

```text
├── assets/                 # Logo gốc & adaptive icon
├── src-tauri/              # Nhân Rust & Tauri v2 cho bản Windows (.exe)
├── android/                # Dự án Capacitor Android (.apk)
├── src/
│   ├── app/                # Next.js App Router (Static Export)
│   ├── components/
│   │   └── sites/mathvera/ # Whiteboard, Drawers (Toán/Lý/Hoá), PeriodicTable, SimLauncher, FullscreenSimOverlay, Calculator
│   ├── hooks/              # Hooks điều hướng canvas, undo/redo, Yjs offline
│   ├── lib/                # Công thức Toán/Lý/Hoá, Bảng tuần hoàn 118 NT, Sim library (IndexedDB), Giải Hình 2D/3D, Export
│   └── types/              # Định nghĩa TypeScript
├── tests/e2e/              # Bộ kiểm thử Playwright E2E
├── capacitor.config.json   # Cấu hình Capacitor (com.physboard.app)
└── package.json            # Scripts dev, check, build:exe, build:android
```

---

## Cài đặt & Phát triển (Dành cho Developer)

Yêu cầu: **Node.js >= 20** (khuyến nghị Node 24).

```bash
# 1. Cài đặt thư viện
npm install

# 2. Chạy môi trường phát triển (http://localhost:3000)
npm run dev

# 3. Kiểm tra Lint + TypeScript + Build Static Export (out/)
npm run check
```

### Đóng gói đa nền tảng
- **Windows (`.exe`) với Tauri v2 (Rust):**
  ```bash
  npm run tauri:dev   # Chạy thử cửa sổ Desktop
  npm run build:exe   # Đóng gói bộ cài NSIS & Portable EXE
  ```
- **Android (`.apk`) với Capacitor:**
  ```bash
  npm run build:android   # Build web (out/) + đồng bộ sang android/
  npx cap open android    # Mở bằng Android Studio để Build APK
  ```

---

<div align="center">
  <sub>Phát hành theo giấy phép MIT · Phát triển tại <a href="https://github.com/NeoGao-com/PhysBoard">NeoGao-com/PhysBoard</a></sub>
</div>
