# Phương pháp nghiên cứu Scamland

Ngày đối chiếu: 11/10/2026. Đây là tuyển chọn tài liệu và địa danh để hỗ trợ đọc nguồn, không phải danh sách đầy đủ các cơ sở phạm tội hoặc trạng thái vận hành trực tiếp.

## Hai lớp thông tin

**Bản đồ gốc:** 87 điểm tải từ KML Google My Maps công khai được liên kết trong KMZ người dùng gửi. Tên, tọa độ, mô tả và style được bảo toàn trong KML/KMZ. WebGIS chuyển mô tả HTML thành văn bản, liên kết HTTPS riêng; không thực thi HTML gốc. Tọa độ nhiều chữ số không đồng nghĩa với độ chính xác khảo sát. Các cơ sở dịch vụ và địa danh không được tự gắn nhãn lừa đảo.

**Hồ sơ OSINT:** 8 mốc biên tập theo địa danh, tọa độ gần đúng. Mỗi nhận định có ID, loại thông tin, ngày và nguồn. Nguồn chính thức, nghiên cứu/báo chí, đầu mối thứ cấp và bối cảnh được phân biệt. Màu hồ sơ không đo mức độ phạm tội.

Phạm vi lõi gồm Tam giác vàng và địa danh Shan lân cận; phạm vi mở rộng có những địa danh nằm ngoài Tam giác vàng. Không đánh đồng GTSEZ, Shwe Kokko và mọi trung tâm tại Đông Nam Á.

## Nguồn và thời gian

Ưu tiên tài liệu gốc của U.S. Treasury, OHCHR, INTERPOL, GIJN, GI-TOC và RSO. ScamLens là nguồn đầu mối, có giới hạn vị trí và thẩm định của chính nền tảng. ODM là danh mục dữ liệu khu vực; số mục tổng của hub không phải số bộ dữ liệu riêng cho Tam giác vàng. UNODC DMP là nguồn dữ liệu có điều kiện truy cập của nhà cung cấp.

Thông báo OFAC 2018/2025 được thể hiện theo nội dung và ngày phát hành. Không xác nhận trạng thái danh sách SDN hôm nay từ một thông báo lịch sử. Quan hệ về quyền sở hữu hoặc sự hiện diện được ghi rõ là điều tài liệu nêu.

Bộ lọc thời gian áp dụng ngày tài liệu/ghi nhận trong hồ sơ OSINT. Mục không có ngày có lựa chọn hiển thị riêng. Thư viện chứa toàn bộ danh mục; dòng thời gian chỉ đếm tài liệu có ngày, không phải số vụ phạm tội. Lớp My Maps là snapshot ngày tải và không bị lọc theo ngày tin chưa được thẩm định.

## Không gian và quan hệ

Dữ liệu WGS84 EPSG:4326, thứ tự GeoJSON/KML `[longitude, latitude]`. Bản đồ nền dùng EPSG:3857. Natural Earth 1:110 triệu chỉ định hướng; không phải dữ liệu địa chính hoặc đường biên pháp lý.

Vòng ký hiệu của mốc OSINT minh họa mức độ khái quát, không phải ranh giới cơ sở hay khoảng tin cậy. Khoảng cách dùng Haversine trên cầu bán kính 6.371.008,8 m, phù hợp tra cứu sơ bộ; không tính tuyến di chuyển hoặc độ dài khảo sát.

Đồ thị gồm người, tổ chức, địa danh và tài liệu với đường nối dẫn nguồn. Không suy ra giao dịch, luồng tiền, tuyến vận chuyển hoặc điểm rủi ro. Trùng tên chưa đủ để đồng nhất thực thể. Không đồng nhất người bị cưỡng bức phạm tội với người tổ chức.

## Kiểm chứng các đề xuất đầu vào

SII có bài viết được tìm thấy; tuyên bố kho IPFS toàn bộ, hơn 120 tài liệu hoặc CID cụ thể chưa đủ nguồn để xác nhận. Logic Hunter không được xác nhận là công cụ điều tra khu vực này chỉ từ tên “Golden Triangle”. Mã phát hiện hố bom KH-9 là nghiên cứu ảnh lịch sử, không phải bộ phát hiện trung tâm lừa đảo. Giới hạn này nằm trong dữ liệu kiểm chứng, không được trình bày như tính năng đã có.

## Kiểm tra và sử dụng

Pipeline kiểm tra ID, URL, ngày, tham chiếu nguồn, tọa độ hữu hạn và giới hạn WGS84. Kiểm thử đối chiếu 87 Placemark trước/sau, giữ NetworkLink gốc, ZIP CRC và cùng checksum qua các lần build. Bản gốc và manifest được giữ để đối chiếu.

Chưa thực hiện kiểm tra giao diện bằng trình duyệt tự động trong môi trường xây dựng này. Khi xuất bản bài điều tra, cần đọc lại nguồn và thời điểm, thẩm định từng liên kết/địa điểm, ghi rõ cơ sở của kết luận và quyền phản hồi phù hợp.
