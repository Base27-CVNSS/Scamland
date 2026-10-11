# Scamland — Golden Triangle OSINT WebGIS

Trang WebGIS tĩnh nghiên cứu dữ liệu **công khai** về khu vực Tam giác Vàng (Bokeo, Lào), sử dụng SDK [Vietflexmap/VN](https://github.com/Vietflexmap/VN) ở commit 6144d565fcf236727577ab3c4471bbe49f86892f.

**Trang dự kiến:** https://base27-cvnss.github.io/Scamland/

## Tính năng
- Vietflex vietflexMap() + Google legacy theo ví dụ; chuyển sang OpenStreetMap khi cần.
- Tọa độ tham chiếu Golden Triangle Special Economic Zone: 20.34025, 100.10524 theo [Wikidata Q24896442](https://www.wikidata.org/wiki/Q24896442). Đây là tọa độ địa danh xấp xỉ, không phải ranh giới pháp lý hoặc bằng chứng vi phạm.
- Nhập .geojson, .json, .kml, .kmz trực tiếp trong trình duyệt (giới hạn 10 MB/tệp); không tải dữ liệu lên máy chủ. Xuất GeoJSON và lọc/ẩn hiện lớp.
- Nội dung thuộc tính hiển thị dạng văn bản để hạn chế chèn HTML độc hại.
- Giao diện responsive.

## KMZ đã nhận
Tệp News about Golden Triangle Special Economic Zone in Laos(1).kmz chỉ có **một NetworkLink**, không chứa Placemark, Point, LineString hoặc Polygon. Nội dung KML được giữ lại tại [data/gtsez-networklink.kml](data/gtsez-networklink.kml). Nguồn từ [Google My Maps KML](https://www.google.com/maps/d/u/0/kml?mid=1mrbCu6ITwNhJQi6FenDrKBWftMOEeiA).

Không tự tải NetworkLink vì Google My Maps có thể yêu cầu quyền truy cập và chặn CORS. Để hiển thị các đối tượng thực tế, hãy lấy KML/KMZ đã xuất có chứa hình học và nhập từ giao diện.

## GitHub Pages
Mở Settings → Pages → Deploy from a branch → main → / (root) nếu Pages chưa bật. Trang tĩnh được phục vụ từ index.html.

## Giới hạn & giấy phép
- Google legacy tiles không chính thức: không bảo đảm ổn định hay quyền sử dụng sản xuất. Sử dụng Google Maps Tiles API có khóa/tính phí theo điều khoản, hoặc OSM tuân thủ chính sách máy chủ tile nếu triển khai rộng.
- Thư viện Vietflex và JSZip được tải từ CDN nên ứng dụng cần mạng, chưa hoạt động offline hoàn toàn.
- Trình nhập KML chỉ xử lý Point, LineString, Polygon cơ bản; chưa có GroundOverlay, gx:Track hoặc tự tải NetworkLink.
- Vị trí địa lý không đủ làm kết luận về hoạt động phạm pháp. Yêu cầu ghi nguồn, thời gian và xác minh độc lập.
- Mã ứng dụng: MIT · Long Ngo 2026; thư viện và nguồn dữ liệu giữ điều khoản riêng.