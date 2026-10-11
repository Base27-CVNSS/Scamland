# Dữ liệu và cập nhật

| File | Vai trò |
| --- | --- |
| `places.geojson` | 8 mốc OSINT Point WGS84, nhận định và `source_ids` |
| `user-map.geojson` | 87 điểm snapshot, giữ tọa độ gốc và mô tả dạng văn bản |
| `sources.json` | ID, nhà xuất bản, URL, ngày công bố/truy cập, giới hạn và điều khoản |
| `relations.json` | Nút, cạnh, loại quan hệ, phạm vi, ngày và nguồn |
| `factchecks.json` | Trạng thái kiểm chứng các tuyên bố đầu vào |
| `toolbox.json` | Công cụ công khai và giấy phép riêng |
| `context.geojson` | Quốc gia và sông Natural Earth, metadata nguồn |
| `original/MyMaps.kml` | Snapshot KML công khai chưa sửa |
| `original/source.kmz` | KMZ NetworkLink do người dùng gửi, chưa sửa |
| `original/provenance.json` | Nguồn, ngày tải và SHA-256 |
| `bundle.js` | Dữ liệu đóng gói để mở không cần API hoặc fetch |

Mỗi mốc OSINT có `position_basis: analyst_approximation`, `coordinate_note`, `scope: core/regional`, `claims[]`. Mỗi claim có ID duy nhất, `date` ISO hoặc null, `topics[]`, `status` và ít nhất một nguồn. `display_radius_m` là vòng ký hiệu, không phải độ chính xác.

Lớp My Maps dùng `position_basis: user_map_snapshot` và `status: unreviewed_geographic_context`. `date` để null, không tự suy ngày tin từ mô tả. Ngày tải nằm trong metadata của snapshot. Các liên kết tin chưa được thẩm định riêng.

## Cập nhật có thể tái lập

1. Đọc tài liệu mới, xác nhận URL gốc, ngày, phạm vi và giới hạn; thêm ID nguồn.
2. Thêm nhận định chỉ khi có tài liệu, tránh nâng một đầu mối thành kết luận. Dùng ID ổn định cho địa danh và thực thể.
3. Nếu cập nhật My Maps, tải KML công khai vào `original/MyMaps.kml`, đọc diff hình học/tên/mô tả và cập nhật ngày phiên bản. Không suy hình học từ NetworkLink nếu chưa tải được nguồn.
4. Chạy `npm run check`; xem các bản xuất, kiểm tra nguồn và giao diện trước khi commit.
5. Commit bundle, HTML offline và KML/KMZ cùng dữ liệu nguồn. GitHub Pages phục vụ cùng bản từ `main / (root)`.

Build không truy cập mạng, không tự sửa danh mục và không thêm các điểm nhập trong trình duyệt. Parser KML từ chối DTD/entity, điểm ngoài WGS84 và hình học snapshot không hỗ trợ thay vì bỏ qua. KMZ đọc tên thành viên đã xác định, không giải nén ra đường dẫn tùy ý.
