# XO CHAI — TGB Store Minigame

Game 2D pixel, góc nhìn trên cao. ShinV (áo đỏ Manchester United) đấu BRB (áo Real Madrid trắng) tại bàn trắng TGB Store.

Có **2 chế độ**:
- **Local 1v1**: hai người cùng một bàn phím, có intro movie và màn phạt.
- **Online 1v1**: nhập tên, ghép trận ngẫu nhiên với người đang online, BO3, lưu bảng xếp hạng theo tên. Không lưu tài khoản / mật khẩu / email.

## Chạy game

```powershell
cd "E:\videcoding\Game_Vibe\XO_minigame shinv"
npm start
```

Mở: **http://127.0.0.1:4173**

Không cần cài dependency.

Server mặc định mở `0.0.0.0`, nên máy khác trong LAN có thể vào `http://<IP-máy-tính>:4173`.

Điện thoại xoay ngang. Nếu Windows Firewall hỏi, cho phép Node.js trên mạng riêng.

Test online bằng 2 tab: mở 2 tab, bấm **TÌM TRẬN ONLINE**, nhập 2 tên khác nhau rồi ghép. Có thể mở trên 2 máy cùng mạng LAN.

## Điều khiển

| Người chơi | Di chuyển ô chọn | Chọn / đặt | Bỏ chọn |
|---|---|---|---|
| P1 — ShinV | `W A S D` | `E` | `Q` |
| P2 — BRB | `↑ ↓ ← →` | `Enter` | `Backspace` |

Có thể bấm/chạm trực tiếp vào ô. `H` mở luật. `⏭` bỏ qua movie. `📻` mở loa YouTube.

Khi chơi online, mỗi người điều khiển được bằng **cả hai bộ phím**: `WASD + E/Q` hoặc `↑↓←→ + Enter/Backspace` — không phụ thuộc bạn được xếp là ShinV hay BRB.

## Luật Tapatan

1. Bàn 3×3, mỗi người 3 chai. Đặt lần lượt đến khi đủ 6 chai.
2. Thắng ngay trong giai đoạn đặt nếu tạo được 3 chai thẳng hàng.
3. Giai đoạn di chuyển: mỗi lượt nhấc **1 chai** sang ô trống **kề cạnh** (ngang, dọc, chéo). Không nhảy cóc.
4. Mỗi lượt di chuyển có **3 giây**. Hết giờ, đi xa, đi sai luật: thua ván.
5. **Khóa đường**: tới lượt mà cả 3 chai không còn ô trống kề cạnh: thua ván.
6. **Lặp nước**: đảo một chai qua lại giữa cùng 2 ô quá 3 lần liên tiếp: thua ván.
7. Thắng 2 ván là thắng BO3. Người mở ván đổi luân phiên.
8. Người thua BO3 bị “tụt đồ” pixel, chạy ra đường hét **“TAO LÀ THẰNG BIẾN THÁI”**. Hài kịch, không 18+.

## Loa YouTube

Bấm nút **📻 LOA** trên thanh trên, hoặc bấm chiếc loa trong quán. Dán link YouTube:

- `https://www.youtube.com/watch?v=...`
- `https://youtu.be/...`
- `https://www.youtube.com/shorts/...`

Bấm **BẬT LOA**. Game tắt nhạc nền để nhường chỗ cho YouTube. Link chỉ lưu trong `localStorage` trình duyệt, không gửi lên server.

## Online / BXH

- Server giữ phòng trong RAM, ghép 2 người đang chờ.
- Server xử lý luật, thời gian 3 giây, khóa đường, lặp nước và BO3.
- **Gameplay, animation, âm thanh, hiệu ứng giống local**: đặt/nhấc chai có animation, bụi, chữ bay, rung màn hình, âm thanh; thắng bằng hàng 3 có win-line + confetti.
- Sau mỗi ván, hai bên tự động sang ván tiếp sau **6 giây** (bấm sẵn sàng để sang ngay), giống nhịp local.
- **Bỏ cuộc / mất kết nối**: rời trận giữa chừng hoặc không phản hồi **3 lượt × 5 giây = 15 giây** thì người còn lại thắng trận; kết quả vẫn ghi BXH.
- BXH lưu `leaderboard.json`: tên, thắng, thua, số trận. **Không có mật khẩu.**
- Người chơi nhận token phiên tạm trong RAM; tải lại trang phải tìm trận lại.
- Phù hợp để test trên server riêng. Nếu deploy public, nên thêm rate-limit, HTTPS/reverse proxy và dọn phòng cũ.

API:
```
POST /api/online/join       {name}
POST /api/online/queue      {token}
GET  /api/online/state      ?token=...
POST /api/online/action     {token,to} hoặc {token,from,to}
POST /api/online/ready      {token}
POST /api/online/leave      {token}
GET  /api/online/leaderboard
```

## Cấu trúc

```
index.html        giao diện, HUD, lobby online, loa YouTube
style.css         pixel UI responsive
logic.js          luật Tapatan thuần, chạy được bằng Node
game.js           canvas 2D, nhân vật, movie, âm thanh, input
server.mjs        static server + API online + BXH
tests/            test luật bằng node:test
screenshots/      ảnh chụp giao diện
```

## Kiểm thử

```powershell
npm test
```

11 test: đặt chai, chéo lượt, đủ 6 chai, đi kề cạnh, thắng bằng di chuyển, lặp nước, timeout 3 giây, khóa đường, BO3 2-0 / 2-1, getState, khóa trang phục nhân vật.

## Ghi chú

- Nhân vật dùng đúng tỉ lệ / bảng màu actor gốc TGBStore: ShinV áo đỏ Manchester United, BRB sếp áo Real trắng-vàng.
- Hình phạt là chibi khối màu da, có censor, không mô tả chi tiết cơ thể.
- Toàn bộ đồ họa vẽ bằng canvas, không cần asset ngoài.
- Âm thanh game là chiptune Web Audio; loa YouTube dùng iframe.

Made for SBTC / TGB Store.
