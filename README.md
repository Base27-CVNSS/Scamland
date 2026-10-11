# Scamland · Golden Triangle OSINT Atlas

**[Mở WebGIS](https://base27-cvnss.github.io/Scamland/)** · [KML](downloads/Scamland_Updated.kml) · [KMZ](downloads/Scamland_Updated.kmz) · [HTML offline](Scamland_Offline.html)

WebGIS tiếng Việt để đọc địa lý, đối chiếu tài liệu công khai và xem quan hệ có dẫn nguồn tại Tam giác vàng. Long Ngo · Vietflexmap · 2026. Mã ứng dụng MIT; thư viện và dữ liệu có điều khoản riêng.

## Bản cập nhật 11/10/2026

- **87 điểm gốc** từ bản đồ Google My Maps do người dùng cung cấp, giữ nguyên tên, tọa độ, mô tả và style trong bản xuất KML/KMZ.
- **8 mốc OSINT** riêng: GTSEZ, Mong La, Tachileik, Panghsang, Chiang Saen; Laukkai, Shwe Kokko và Sihanoukville là tham chiếu khu vực mở rộng. Tọa độ OSINT là mốc địa danh gần đúng.
- **21 nguồn**, 7 kho công cụ, 11 quan hệ được tài liệu nêu và 6 mục kiểm chứng tuyên bố đầu vào.
- Bản đồ, hồ sơ nguồn, đồ thị quan hệ, dòng thời gian tài liệu, tìm kiếm tiếng Việt không dấu, bộ lọc, ghi chú và bookmark cục bộ.
- Xuất GeoJSON/CSV/Markdown theo bộ lọc. KML/KMZ và HTML offline là bản đầy đủ, không chứa ghi chú riêng hoặc dữ liệu nhập trong phiên.

KMZ gửi ban đầu chỉ chứa một `NetworkLink`. Đã tải thành công KML công khai bằng tham số `forcekml=1`, chụp snapshot 87 điểm và đóng gói hình học vào KMZ mới. Không cần Google My Maps phản hồi hoặc cho phép CORS để hiển thị lớp gốc. NetworkLink gốc được giữ, **tắt mặc định** để tránh trùng 87 điểm khi mở Google Earth. Các khách sạn, nhà hàng, cửa hàng và địa danh trên lớp gốc được trình bày như bối cảnh chưa thẩm định.

## Vietflex và bản đồ nền

Bản đồ chính tải SDK/CSS Vietflex qua CDN jsDelivr với URL có dấu `@`, từ commit [`6144d565fcf236727577ab3c4471bbe49f86892f`](https://github.com/Vietflexmap/VN/tree/6144d565fcf236727577ab3c4471bbe49f86892f). SDK/CSS được kiểm tra bằng SRI và có bản cục bộ dự phòng khi CDN lỗi. Ứng dụng đợi SDK/CSS sẵn sàng trước khi khởi tạo. Mặc định trực tuyến là Google roadmap legacy, offline là Atlas Natural Earth. Nút **Vietflex / Google** bật roadmap legacy theo cấu hình đã yêu cầu; lỗi tile chuyển về Atlas. Dùng `Vietflex.ZoomControl` ở góc trái trên và `Vietflex.AttributionControl` ở góc phải dưới; ghi nguồn nền.

Google legacy là endpoint tương thích của SDK, có thể thay đổi. Dữ liệu/ảnh của Google và OSM không nằm trong giấy phép MIT của ứng dụng. Xem [NOTICE](NOTICE.md).

[Mở mẫu HTML Vietflex](https://base27-cvnss.github.io/Scamland/examples/vietflex-map.html) theo đoạn mã người dùng gửi, gồm `ZoomControl` ở góc trái trên, `AttributionControl` ở góc phải dưới và điểm Hà Nội. Đường dẫn CDN đã sửa thành `Vietflexmap/VN@6144d565fcf236727577ab3c4471bbe49f86892f/dist/...` với dấu `@` trước commit. Mẫu được đóng gói trong KMZ tại `web/vietflex-map.html`; giải nén và mở bằng trình duyệt khi cần. Google legacy/CDN cần Internet. KML chứa liên kết mẫu và metadata tích hợp; [data/integration.json](data/integration.json) ghi cấu hình cùng các URL.

## Chạy và kiểm tra

Node 22+ và Python 3. Không cần cài package hoặc truy cập mạng khi build.

```sh
npm run check
python3 -m http.server 8000
```

Mở `http://localhost:8000/`. Có thể mở trực tiếp `Scamland_Offline.html`; thư viện, hình học và nền Atlas đã được nhúng. Nền OSM/Google cần Internet.

`npm run build` tái tạo GeoJSON lớp gốc, bundle, HTML offline và KML/KMZ từ snapshot được giữ. ZIP dùng timestamp cố định để tái lập cùng bytes. Không tự tải tin mới hoặc cập nhật nguồn trong quá trình build.

## Nhập dữ liệu

Atlas hỗ trợ nhập GeoJSON tối đa 200 Point / 1 MiB, WGS84 `[kinh độ, vĩ độ]`, có `name` và `source_url` HTTPS. Dữ liệu nhập chỉ tồn tại trong phiên và có ký hiệu riêng. [Công cụ KML/KMZ](tools/KML_Workbench.html) giữ chức năng nhập KML/KMZ/GeoJSON của giao diện trước, bao gồm hình học cơ bản. Công cụ không tự theo NetworkLink, GroundOverlay hoặc gx:Track; dùng bản KML/KMZ đã có hình học.

## Triển khai và dữ liệu

GitHub Pages phục vụ `main / (root)`. `.nojekyll`, bundle và các bản xuất được commit sẵn. Workflow `Validate atlas and KML` kiểm tra logic, bảo toàn 87 Placemark và tính tái lập dữ liệu sau mỗi push.

- [Phương pháp, nguồn và giới hạn](docs/METHODOLOGY.md)
- [Cấu trúc dữ liệu và quy trình cập nhật](docs/DATA.md)
- [Dữ liệu gốc và checksum](data/original/provenance.json)

Thông báo trừng phạt là tài liệu theo ngày phát hành; cần kiểm tra nguồn hiện hành khi sử dụng. Vị trí, quan hệ trong tài liệu và sự hiện diện trên một bản đồ không tự cấu thành kết luận pháp lý. Các nguồn SII/IPFS, Logic Hunter và số lượng tài liệu chưa đủ căn cứ được thể hiện rõ ở mục kiểm chứng.


## 3 cấp vùng khảo sát khái niệm (11/10/2026)

Có 4 công tắc trực tiếp trên bản đồ: **điểm GTSEZ**, **vùng lõi đỏ**, **vùng cam**, **vùng vàng kéo tới Việt Nam**. Có nút xem toàn bộ 3 vùng và tải [GeoJSON](data/influence.geojson). Dữ liệu minh họa không phải phạm vi ảnh hưởng đo đạc, ranh giới pháp lý, bản đồ rủi ro hoặc bằng chứng về hoạt động phạm pháp tại Việt Nam. Các đường bao vẽ sơ họa theo mục đích trình bày; cần dữ liệu thực địa, nguồn độc lập và mô hình đã kiểm thử trước khi đưa ra kết luận.


## Chế độ bản đồ theo ảnh mẫu (11/10/2026)

Trang mở mặc định tại Ton Pheung/Bokeo (zoom 11), thanh bên trái nền tối và bản đồ sáng với Vietflex Google legacy, OSM/Atlas dự phòng; bảng bật tắt điểm GTSEZ và 3 vùng đỏ/cam/vàng ở góc phải. Nút Atlas phân tích đưa về các chức năng khác, dữ liệu gốc giữ nguyên. Dừng tự động fit toàn vùng tới Việt Nam khi mở trang. Lỗi một vài tiles không còn làm hiện cảnh báo thiếu bản đồ nếu đã có tile tải thành công. Google legacy không phải dịch vụ được bảo đảm vận hành sản xuất.
