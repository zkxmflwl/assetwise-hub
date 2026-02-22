export type UserRole = 'viewer' | 'editor' | 'master';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
}

export interface TangibleAsset {
  id: string;
  department: string;
  user: string;
  manager: string;
  type: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  cpu: string;
  memory: string;
  hdd: string;
  ssd: string;
  screenSize: string;
  os: string;
  purpose: string;
  location: string;
  purchaseDate: string;
  assignDate: string;
  note: string;
  lastModifiedDate: string;
  lastModifiedBy: string;
}

export interface IntangibleAsset {
  id: string;
  name: string;
  type: string;
  vendor: string;
  licenseKey: string;
  purchaseDate: string;
  expiryDate: string;
  assignedTo: string;
  department: string;
  cost: number;
  status: string;
  note: string;
  lastModifiedDate: string;
  lastModifiedBy: string;
}

export interface DepartmentData {
  name: string;
  totalMembers: number;
  teams: { name: string; count: number }[];
  monthlyChange: number;
  revenue: number;
  cost: number;
  netRevenue: number;
  revenueBreakdown: { si: number; sm: number; license: number; maintenance: number };
  costBreakdown: { si: number; sm: number; license: number; maintenance: number };
}

export const DEPARTMENTS = [
  '경영지원', '영업', 'SA사업', 'R&D사업', '제조룰개발', '솔루션사업', 'SD사업', 'SS사업'
];

export const mockUser: User = {
  id: '1',
  name: '관리자',
  email: 'admin@company.com',
  role: 'master',
  department: '경영지원',
};

export const mockTangibleAssets: TangibleAsset[] = [
  { id: '1', department: '경영지원', user: '김철수', manager: '이영희', type: '노트북', manufacturer: 'Lenovo', model: 'ThinkPad T14s', serialNumber: 'SN-2020-001', cpu: 'i5-10210U', memory: '16GB', hdd: '-', ssd: '512GB', screenSize: '14"', os: 'Windows 10', purpose: '업무용', location: '본사 3F', purchaseDate: '2020-03-15', assignDate: '2020-03-20', note: '', lastModifiedDate: '2024-12-01', lastModifiedBy: '관리자' },
  { id: '2', department: '영업', user: '박민수', manager: '김지영', type: '노트북', manufacturer: 'Dell', model: 'Latitude 5520', serialNumber: 'SN-2020-002', cpu: 'i7-1165G7', memory: '16GB', hdd: '-', ssd: '256GB', screenSize: '15.6"', os: 'Windows 11', purpose: '영업용', location: '본사 2F', purchaseDate: '2020-06-10', assignDate: '2020-06-15', note: '외근 사용', lastModifiedDate: '2024-11-20', lastModifiedBy: '김지영' },
  { id: '3', department: 'R&D사업', user: '최우진', manager: '정하나', type: 'PC', manufacturer: 'HP', model: 'ProDesk 400', serialNumber: 'SN-2019-003', cpu: 'i7-9700', memory: '32GB', hdd: '1TB', ssd: '512GB', screenSize: '-', os: 'Windows 10', purpose: '개발용', location: 'R&D센터', purchaseDate: '2019-01-20', assignDate: '2019-01-25', note: '듀얼모니터', lastModifiedDate: '2024-10-15', lastModifiedBy: '관리자' },
  { id: '4', department: 'SA사업', user: '한소희', manager: '윤대호', type: '모니터', manufacturer: 'LG', model: '27UK850', serialNumber: 'SN-2019-004', cpu: '-', memory: '-', hdd: '-', ssd: '-', screenSize: '27"', os: '-', purpose: '업무용', location: '본사 4F', purchaseDate: '2019-05-10', assignDate: '2019-05-12', note: '4K UHD', lastModifiedDate: '2024-09-30', lastModifiedBy: '윤대호' },
  { id: '5', department: '솔루션사업', user: '이준혁', manager: '김나리', type: '노트북', manufacturer: 'Apple', model: 'MacBook Pro 14', serialNumber: 'SN-2021-005', cpu: 'M1 Pro', memory: '16GB', hdd: '-', ssd: '512GB', screenSize: '14.2"', os: 'macOS', purpose: '디자인', location: '본사 5F', purchaseDate: '2021-11-01', assignDate: '2021-11-05', note: '', lastModifiedDate: '2024-08-20', lastModifiedBy: '관리자' },
  { id: '6', department: 'SD사업', user: '정수연', manager: '박태호', type: 'PC', manufacturer: 'Samsung', model: 'DM500T', serialNumber: 'SN-2018-006', cpu: 'i5-8400', memory: '8GB', hdd: '500GB', ssd: '-', screenSize: '-', os: 'Windows 10', purpose: '업무용', location: '본사 2F', purchaseDate: '2018-07-15', assignDate: '2018-07-20', note: 'SSD 교체 필요', lastModifiedDate: '2024-12-05', lastModifiedBy: '박태호' },
  { id: '7', department: 'SS사업', user: '오지훈', manager: '강미영', type: '노트북', manufacturer: 'Lenovo', model: 'ThinkPad X1 Carbon', serialNumber: 'SN-2019-007', cpu: 'i7-8565U', memory: '16GB', hdd: '-', ssd: '256GB', screenSize: '14"', os: 'Windows 10', purpose: '업무용', location: '지사', purchaseDate: '2019-09-20', assignDate: '2019-09-25', note: '', lastModifiedDate: '2024-11-10', lastModifiedBy: '관리자' },
  { id: '8', department: '제조룰개발', user: '임서준', manager: '배수현', type: '모니터', manufacturer: 'Dell', model: 'U2419H', serialNumber: 'SN-2020-008', cpu: '-', memory: '-', hdd: '-', ssd: '-', screenSize: '24"', os: '-', purpose: '개발용', location: 'R&D센터', purchaseDate: '2020-02-10', assignDate: '2020-02-12', note: '', lastModifiedDate: '2024-07-15', lastModifiedBy: '배수현' },
  { id: '9', department: '경영지원', user: '강다연', manager: '이영희', type: 'PC', manufacturer: 'HP', model: 'EliteDesk 800', serialNumber: 'SN-2018-009', cpu: 'i5-8500', memory: '8GB', hdd: '1TB', ssd: '-', screenSize: '-', os: 'Windows 10', purpose: '회계', location: '본사 3F', purchaseDate: '2018-03-01', assignDate: '2018-03-05', note: '노후 교체 대상', lastModifiedDate: '2024-12-10', lastModifiedBy: '관리자' },
  { id: '10', department: '영업', user: '신동우', manager: '김지영', type: '노트북', manufacturer: 'Dell', model: 'Inspiron 15', serialNumber: 'SN-2019-010', cpu: 'i5-1035G1', memory: '8GB', hdd: '-', ssd: '256GB', screenSize: '15.6"', os: 'Windows 10', purpose: '영업용', location: '본사 2F', purchaseDate: '2019-12-10', assignDate: '2019-12-15', note: '', lastModifiedDate: '2024-06-20', lastModifiedBy: '김지영' },
  { id: '11', department: 'R&D사업', user: '조예린', manager: '정하나', type: '노트북', manufacturer: 'Lenovo', model: 'ThinkPad T490', serialNumber: 'SN-2019-011', cpu: 'i7-8665U', memory: '32GB', hdd: '-', ssd: '1TB', screenSize: '14"', os: 'Ubuntu 22.04', purpose: '개발용', location: 'R&D센터', purchaseDate: '2019-08-05', assignDate: '2019-08-10', note: '리눅스 전환', lastModifiedDate: '2024-11-25', lastModifiedBy: '정하나' },
  { id: '12', department: 'SA사업', user: '유재석', manager: '윤대호', type: 'PC', manufacturer: 'HP', model: 'Z2 Tower', serialNumber: 'SN-2017-012', cpu: 'Xeon E-2134', memory: '64GB', hdd: '2TB', ssd: '512GB', screenSize: '-', os: 'Windows 10 Pro', purpose: '서버 테스트', location: '본사 4F', purchaseDate: '2017-11-20', assignDate: '2017-11-25', note: '서버실 이관 예정', lastModifiedDate: '2024-10-01', lastModifiedBy: '윤대호' },
];

export const mockIntangibleAssets: IntangibleAsset[] = [
  { id: '1', name: 'Microsoft 365 E3', type: '소프트웨어', vendor: 'Microsoft', licenseKey: 'MS365-****-****-0001', purchaseDate: '2020-01-01', expiryDate: '2025-12-31', assignedTo: '전사', department: '경영지원', cost: 45000000, status: '활성', note: '연간 갱신', lastModifiedDate: '2024-12-01', lastModifiedBy: '관리자' },
  { id: '2', name: 'Adobe Creative Cloud', type: '소프트웨어', vendor: 'Adobe', licenseKey: 'ACC-****-****-0002', purchaseDate: '2021-03-15', expiryDate: '2025-03-14', assignedTo: '솔루션사업', department: '솔루션사업', cost: 8400000, status: '활성', note: '5 라이선스', lastModifiedDate: '2024-11-15', lastModifiedBy: '김나리' },
  { id: '3', name: 'Jira Software', type: 'SaaS', vendor: 'Atlassian', licenseKey: 'JIRA-****-****-0003', purchaseDate: '2019-06-01', expiryDate: '2025-05-31', assignedTo: 'R&D사업', department: 'R&D사업', cost: 12000000, status: '활성', note: '100 사용자', lastModifiedDate: '2024-10-20', lastModifiedBy: '정하나' },
  { id: '4', name: 'SAP ERP', type: '소프트웨어', vendor: 'SAP', licenseKey: 'SAP-****-****-0004', purchaseDate: '2018-01-01', expiryDate: '2025-12-31', assignedTo: '전사', department: '경영지원', cost: 120000000, status: '활성', note: '유지보수 포함', lastModifiedDate: '2024-12-05', lastModifiedBy: '관리자' },
  { id: '5', name: 'AutoCAD', type: '소프트웨어', vendor: 'Autodesk', licenseKey: 'ACAD-****-****-0005', purchaseDate: '2019-09-01', expiryDate: '2024-08-31', assignedTo: '제조룰개발', department: '제조룰개발', cost: 6000000, status: '만료', note: '갱신 검토중', lastModifiedDate: '2024-09-01', lastModifiedBy: '배수현' },
  { id: '6', name: 'Slack Business+', type: 'SaaS', vendor: 'Salesforce', licenseKey: 'SLK-****-****-0006', purchaseDate: '2022-01-01', expiryDate: '2025-12-31', assignedTo: '전사', department: '경영지원', cost: 18000000, status: '활성', note: '전사 메신저', lastModifiedDate: '2024-11-30', lastModifiedBy: '관리자' },
  { id: '7', name: 'Windows Server 2022', type: '라이선스', vendor: 'Microsoft', licenseKey: 'WS22-****-****-0007', purchaseDate: '2022-05-10', expiryDate: '-', assignedTo: 'SA사업', department: 'SA사업', cost: 25000000, status: '활성', note: '영구 라이선스', lastModifiedDate: '2024-08-15', lastModifiedBy: '윤대호' },
  { id: '8', name: 'Figma Enterprise', type: 'SaaS', vendor: 'Figma', licenseKey: 'FIG-****-****-0008', purchaseDate: '2023-01-01', expiryDate: '2025-12-31', assignedTo: '솔루션사업', department: '솔루션사업', cost: 4800000, status: '활성', note: '디자인팀 전용', lastModifiedDate: '2024-12-10', lastModifiedBy: '김나리' },
];

export const mockDepartments: DepartmentData[] = [
  {
    name: '경영지원', totalMembers: 15,
    teams: [{ name: '인사', count: 5 }, { name: '재무', count: 5 }, { name: '총무', count: 5 }],
    monthlyChange: 0,
    revenue: 0, cost: 850000000, netRevenue: -850000000,
    revenueBreakdown: { si: 0, sm: 0, license: 0, maintenance: 0 },
    costBreakdown: { si: 0, sm: 0, license: 350000000, maintenance: 500000000 },
  },
  {
    name: '영업', totalMembers: 25,
    teams: [{ name: '국내영업', count: 15 }, { name: '해외영업', count: 10 }],
    monthlyChange: 2,
    revenue: 8500000000, cost: 1200000000, netRevenue: 7300000000,
    revenueBreakdown: { si: 4000000000, sm: 2000000000, license: 1500000000, maintenance: 1000000000 },
    costBreakdown: { si: 500000000, sm: 300000000, license: 200000000, maintenance: 200000000 },
  },
  {
    name: 'SA사업', totalMembers: 35,
    teams: [{ name: 'SA1팀', count: 12 }, { name: 'SA2팀', count: 12 }, { name: 'SA3팀', count: 11 }],
    monthlyChange: -1,
    revenue: 12000000000, cost: 3500000000, netRevenue: 8500000000,
    revenueBreakdown: { si: 6000000000, sm: 3000000000, license: 2000000000, maintenance: 1000000000 },
    costBreakdown: { si: 1500000000, sm: 1000000000, license: 500000000, maintenance: 500000000 },
  },
  {
    name: 'R&D사업', totalMembers: 45,
    teams: [{ name: '플랫폼', count: 15 }, { name: 'AI/ML', count: 15 }, { name: '인프라', count: 15 }],
    monthlyChange: 3,
    revenue: 6500000000, cost: 4200000000, netRevenue: 2300000000,
    revenueBreakdown: { si: 2000000000, sm: 1500000000, license: 2000000000, maintenance: 1000000000 },
    costBreakdown: { si: 1500000000, sm: 1200000000, license: 800000000, maintenance: 700000000 },
  },
  {
    name: '제조룰개발', totalMembers: 20,
    teams: [{ name: '설계', count: 10 }, { name: '품질', count: 10 }],
    monthlyChange: 0,
    revenue: 3200000000, cost: 1800000000, netRevenue: 1400000000,
    revenueBreakdown: { si: 1500000000, sm: 800000000, license: 500000000, maintenance: 400000000 },
    costBreakdown: { si: 800000000, sm: 500000000, license: 300000000, maintenance: 200000000 },
  },
  {
    name: '솔루션사업', totalMembers: 30,
    teams: [{ name: '솔루션1팀', count: 15 }, { name: '솔루션2팀', count: 15 }],
    monthlyChange: 1,
    revenue: 9800000000, cost: 2800000000, netRevenue: 7000000000,
    revenueBreakdown: { si: 3500000000, sm: 2500000000, license: 2500000000, maintenance: 1300000000 },
    costBreakdown: { si: 1000000000, sm: 800000000, license: 600000000, maintenance: 400000000 },
  },
  {
    name: 'SD사업', totalMembers: 28,
    teams: [{ name: 'SD1팀', count: 14 }, { name: 'SD2팀', count: 14 }],
    monthlyChange: -2,
    revenue: 7200000000, cost: 2100000000, netRevenue: 5100000000,
    revenueBreakdown: { si: 3000000000, sm: 2000000000, license: 1200000000, maintenance: 1000000000 },
    costBreakdown: { si: 900000000, sm: 600000000, license: 300000000, maintenance: 300000000 },
  },
  {
    name: 'SS사업', totalMembers: 22,
    teams: [{ name: 'SS1팀', count: 11 }, { name: 'SS2팀', count: 11 }],
    monthlyChange: 1,
    revenue: 5500000000, cost: 1600000000, netRevenue: 3900000000,
    revenueBreakdown: { si: 2000000000, sm: 1500000000, license: 1200000000, maintenance: 800000000 },
    costBreakdown: { si: 600000000, sm: 500000000, license: 300000000, maintenance: 200000000 },
  },
];

export const formatKRW = (value: number): string => {
  if (Math.abs(value) >= 100000000) {
    return `${(value / 100000000).toFixed(1)}억`;
  }
  if (Math.abs(value) >= 10000) {
    return `${(value / 10000000).toFixed(0)}천만`;
  }
  return value.toLocaleString('ko-KR');
};
