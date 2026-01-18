
import { Topic, TagLevel } from './types';

const INFOGRAPHIC_BASE_URL = "https://raw.githubusercontent.com/duanaithcs-cloud/anh-infographic-33-bubbles/main/";

export const TOPICS_33_RAW = [
  // 1) I/ Vị trí địa lí & phạm vi lãnh thổ VN
  { id: 1, label: "VTĐL-PVLT", short: "VTĐL-PVLT", level: TagLevel.NB, group: "Vị trí địa lí & PVLT", text: "NB: Trình bày đặc điểm vị trí địa lí, phạm vi lãnh thổ và 34 tỉnh thành phố sau sáp nhập.", icon: "location_on", mastery: 85, scale: 1.2 },
  { id: 2, label: "A/H VTĐL – PVLT", short: "A/H VTĐL – PVLT", level: TagLevel.TH, group: "Vị trí địa lí & PVLT", text: "TH: Phân tích ảnh hưởng vị trí & phạm vi lãnh thổ tới hình thành đặc điểm tự nhiên VN.", icon: "explore", mastery: 42, scale: 0.9 },
  
  // 2) II/ Địa hình & khoáng sản
  { id: 3, label: "ĐỊA HÌNH.", short: "ĐỊA HÌNH", level: TagLevel.NB, group: "Địa hình & khoáng sản", text: "NB: Trình bày 1 trong các đặc điểm chủ yếu địa hình VN: đồi núi; đồi núi thấp; hướng địa hình; nhiệt đới ẩm gió mùa; tác động con người.", icon: "terrain", mastery: 100, scale: 1.3 },
  { id: 4, label: "K.VỰC ĐH", short: "K.VỰC ĐH", level: TagLevel.NB, group: "Địa hình & khoáng sản", text: "NB: Trình bày đặc điểm các khu vực địa hình: đồi núi; đồng bằng; bờ biển & thềm lục địa.", icon: "landscape", mastery: 65, scale: 1.1 },
  { id: 5, label: "Đ2 K.SẢN", short: "Đ2 K.SẢN", level: TagLevel.TH, group: "Địa hình & khoáng sản", text: "TH: Trình bày và giải thích đặc điểm chung khoáng sản VN.", icon: "diamond", mastery: 28, scale: 0.8 },
  { id: 6, label: "P.BỐ SD KS", short: "P.BỐ SD KS", level: TagLevel.TH, group: "Địa hình & khoáng sản", text: "TH: Phân tích phân bố khoáng sản chủ yếu and sử dụng hợp lí.", icon: "precision_manufacturing", mastery: 55, scale: 1.0 },
  { id: 7, label: "P.HÓA ĐỊA HÌNH", short: "P.HÓA ĐỊA HÌNH", level: TagLevel.VD, group: "Địa hình & khoáng sản", text: "VD: Ví dụ chứng minh phân hoá địa hình → phân hoá tự nhiên & khai thác kinh tế.", icon: "layers", mastery: 15, scale: 0.85 },

  // 3) III/ Khí hậu & thuỷ văn
  { id: 8, label: "KH NĐAGM", short: "KH NĐAGM", level: TagLevel.NB, group: "Khí hậu & thuỷ văn", text: "NB: Trình bày khí hậu nhiệt đới ẩm gió mùa VN.", icon: "thermostat", mastery: 92, scale: 1.25 },
  { id: 9, label: "LƯU VỰC SÔNG", short: "LƯU VỰC SÔNG", level: TagLevel.NB, group: "Khí hậu & thuỷ văn", text: "NB: Xác định bản đồ lưu vực các hệ thống sông lớn.", icon: "water", mastery: 78, scale: 1.15 },
  { id: 10, label: "P.HÓA KH", short: "P.HÓA KH", level: TagLevel.TH, group: "Khí hậu & thuỷ văn", text: "TH: Chứng minh phân hoá khí hậu: Bắc–Nam; theo đai cao.", icon: "wb_sunny", mastery: 48, scale: 0.95 },
  { id: 11, label: "T.Đ BĐKH KH+TV", short: "T.Đ BĐKH KH+TV", level: TagLevel.TH, group: "Khí hậu & thuỷ văn", text: "TH: Phân tích tác động BĐKH tới khí hậu & thuỷ văn VN.", icon: "cyclone", mastery: 35, scale: 0.9 },
  { id: 12, label: "KH–N.NGHIỆP", short: "KH–N.NGHIỆP", level: TagLevel.TH, group: "Khí hậu & thuỷ văn", text: "TH: Phân tích ảnh hưởng khí hậu tới nông nghiệp.", icon: "agriculture", mastery: 62, scale: 1.05 },
  { id: 13, label: "1 HT SÔNG", short: "1 HT SÔNG", level: TagLevel.TH, group: "Khí hậu & thuỷ văn", text: "TH: Phân tích mạng lưới sông và chế độ nước sông của một số hệ thống sông lớn.", icon: "humidity_mid", mastery: 100, scale: 1.3 },
  { id: 14, label: "HỒ-ĐẦM-NN", short: "HỒ-ĐẦM-NN", level: TagLevel.TH, group: "Khí hậu & thuỷ văn", text: "TH: Phân tích vai trò hồ, đầm và nước ngầm đối với sản xuất và sinh hoạt.", icon: "waves", mastery: 25, scale: 0.8 },
  { id: 15, label: "BĐ–TRẠM-KH", short: "BĐ–TRẠM-KH", level: TagLevel.TH, group: "Khí hậu & thuỷ văn", text: "TH: Đọc được biểu đồ khí hậu của 1 số trạm khí tượng thủy văn.", icon: "bar_chart", mastery: 58, scale: 1.0 },
  { id: 16, label: "VẼ P.T BĐ KH", short: "VẼ P.T BĐ KH", level: TagLevel.VD, group: "Khí hậu & thuỷ văn", text: "VD: Vẽ và phân tích được biểu đồ khí hậu của một số trạm thuộc các vùng khí hậu khác nhau.", icon: "legend_toggle", mastery: 20, scale: 0.85 },
  { id: 17, label: "KH-DU.L", short: "KH-DU.L", level: TagLevel.VD, group: "Khí hậu & thuỷ văn", text: "VD: Phân tích được vai trò của khí hậu đối với sự phát triển du lịch ở một số điểm du lịch nổi tiếng của nước ta.", icon: "camera_outdoor", mastery: 74, scale: 1.1 },
  { id: 18, label: "Ư.PHÓ BĐKH.", short: "Ư.PHÓ BĐKH", level: TagLevel.VDC, group: "Khí hậu & thuỷ văn", text: "VDC: Tìm ví dụ về giải pháp ứng phó với biến đổi khí hậu.", icon: "verified", mastery: 12, scale: 0.75 },
  { id: 19, label: "K.THÁC TN NƯỚC", short: "K.THÁC TN NƯỚC", level: TagLevel.VDC, group: "Khí hậu & thuỷ văn", text: "VDC: Lấy ví dụ chứng minh được tầm quan trọng của việc sử dụng tổng hợp tài nguyên nước ở một lưu vực sông.", icon: "water_damage", mastery: 88, scale: 1.2 },
  { id: 20, label: "T.Đ BĐKH TN", short: "T.Đ BĐKH TN", level: TagLevel.VDC, group: "Khí hậu & thuỷ văn", text: "VDC: Phân tích được tác động của Biến đổi khí hậu đối with 1 số yếu tố Tự nhiên Việt Nam.", icon: "warning", mastery: 45, scale: 0.95 },

  // 4) IV/ Thổ nhưỡng & sinh vật
  { id: 21, label: "3 LOẠI ĐẤT", short: "3 LOẠI ĐẤT", level: TagLevel.NB, group: "Thổ nhưỡng & sinh vật", text: "NB: Trình bày được đặc điểm phân bố của ba nhóm đất chính.", icon: "potted_plant", mastery: 100, scale: 1.35 },
  { id: 22, label: "THỔ.N NĐAGM", short: "THỔ.N NĐAGM", level: TagLevel.TH, group: "Thổ nhưỡng & sinh vật", text: "TH: Chứng minh được tính chất nhiệt đới gió mùa của lớp phủ thổ nhưỡng.", icon: "eco", mastery: 67, scale: 1.1 },
  { id: 23, label: "ĐẤT FERALIT", short: "ĐẤT FERALIT", level: TagLevel.TH, group: "Thổ nhưỡng & sinh vật", text: "TH: Phân tích được đặc điểm của đất feralit và giá trị sử dụng đất feralit trong sản xuất nông lâm nghiệp.", icon: "park", mastery: 52, scale: 1.0 },
  { id: 24, label: "ĐẤT PHÙ SA", short: "ĐẤT PHÙ SA", level: TagLevel.TH, group: "Thổ nhưỡng & sinh vật", text: "TH: Phân tích được đặc điểm của đất phù sa và giá trị sử dụng của đất phù sa trong sản xuất nông nghiệp, thuỷ sản.", icon: "grass", mastery: 81, scale: 1.2 },
  { id: 25, label: "SINH VẬT ĐA DẠNG", short: "SINH VẬT ĐA DẠNG", level: TagLevel.TH, group: "Thổ nhưỡng & sinh vật", text: "TH: Chứng minh được sự đa dạng của sinh vật ở Việt Nam.", icon: "pets", mastery: 40, scale: 0.9 },
  { id: 26, label: "CHỐNG THOÁI HÓA ĐẤT", short: "CHỐNG THOÁI HÓA ĐẤT", level: TagLevel.VD, group: "Thổ nhưỡng & sinh vật", text: "VD: Chứng minh được tính cấp thiết của vấn đề chống thoái hoá đất.", icon: "compost", mastery: 30, scale: 0.85 },
  { id: 27, label: "BẢO TỒN ĐA DẠNG SV", short: "BẢO TỒN ĐA DẠNG SV", level: TagLevel.VD, group: "Thổ nhưỡng & sinh vật", text: "VD: Chứng minh được tính cấp thiết của vấn đề bảo tồn đa dạng sinh học ở Việt Nam.", icon: "diversity_3", mastery: 95, scale: 1.25 },

  // 5) V/ Biển đảo VN
  { id: 28, label: "PV BIỂN", short: "PV BIỂN", level: TagLevel.NB, group: "Biển đảo VN", text: "NB: Xác định được trên bản đồ phạm vi Biển Đông, các nước và vùng lãnh thổ có chung Biển Đông với Việt Nam.", icon: "explore", mastery: 72, scale: 1.1 },
  { id: 29, label: "TỰ NHIÊN BIỂN", short: "TỰ NHIÊN BIỂN", level: TagLevel.NB, group: "Biển đảo VN", text: "NB: Trình bày được đặc điểm tự nhiên vùng biển đảo Việt Nam.", icon: "waves", mastery: 50, scale: 1.0 },
  { id: 30, label: "TÀI NGUYÊN BIỂN.", short: "TÀI NGUYÊN BIỂN", level: TagLevel.NB, group: "Biển đảo VN", text: "NB: Trình bày được các tài nguyên biển và thềm lục địa Việt Nam.", icon: "sailing", mastery: 100, scale: 1.3 },
  { id: 31, label: "MÔI TRƯỜNG BIỂN", short: "MÔI TRƯỜNG BIỂN", level: TagLevel.TH, group: "Biển đảo VN", text: "TH: Nêu được đặc điểm môi trường biển đảo và vấn đề bảo vệ môi trường biển đảo Việt Nam.", icon: "recycling", mastery: 38, scale: 0.85 },
  { id: 32, label: "LUẬT BIỂN", short: "LUẬT BIỂN", level: TagLevel.VD, group: "Biển đảo VN", text: "VD: Xác định được trên bản đồ các mốc xác định đường cơ sở, đường phân chia vịnh Bắc Bộ... (theo Luật Biển VN).", icon: "gavel", mastery: 22, scale: 0.8 },
  { id: 33, label: "TL KK BIỂN", short: "TL KK BIỂN", level: TagLevel.VD, group: "Biển đảo VN", text: "VD: Phân tích được những thuận lợi và khó khăn đối with kinh tế và bảo vệ chủ quyền.", icon: "account_balance", mastery: 83, scale: 1.2 }
];

const COLORS_BY_GROUP: Record<string, string> = {
  "Vị trí địa lí & PVLT": "#00f5ff",
  "Địa hình & khoáng sản": "#6366f1",
  "Khí hậu & thuỷ văn": "#00d1ff",
  "Thổ nhưỡng & sinh vật": "#00ff88",
  "Biển đảo VN": "#3357FF",
};

export const MOCK_TOPICS: Topic[] = TOPICS_33_RAW.map((item) => {
  const baseColor = COLORS_BY_GROUP[item.group] || "#0d33f2";
  return {
    topic_id: item.id,
    group_id: Math.ceil(item.id / 7),
    group_title: item.group,
    tag_level: item.level,
    keyword_label: item.label,
    short_label: item.short,
    full_text: item.text,
    mastery_percent: item.mastery || 0,
    scale: item.scale || 1.0, 
    delta: Math.floor(Math.random() * 10) - 2, 
    attempts_count: Math.floor(Math.random() * 5),
    avg_time_sec: 0,
    competency_scores: { 
        C1: Math.min(100, (item.mastery || 0) + 5), 
        C2: Math.min(100, Math.floor((item.mastery || 0) * 0.8)), 
        C3: Math.min(100, Math.floor((item.mastery || 0) * 0.6)), 
        C4: Math.min(100, Math.floor((item.mastery || 0) * 0.4)) 
    },
    last_attempt_at: null,
    error_tags: [],
    pinned: false,
    history_mastery: { 
        day: Math.floor(Math.random() * 5), 
        week: Math.floor(Math.random() * 15), 
        month: Math.floor(Math.random() * 30), 
        three_months: Math.floor(Math.random() * 50) 
    },
    icon: item.icon,
    color: baseColor,
    infographic_url: `${INFOGRAPHIC_BASE_URL}${item.id}.png` // New data field
  };
});
