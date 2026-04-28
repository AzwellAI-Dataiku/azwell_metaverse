import { create } from 'zustand';

export interface GoLink {
  key: string;
  url: string;
  label: string;
  icon: string;
}

export const GO_LINKS: GoLink[] = [
  // 사내 서비스
  { key: '그룹웨어', url: 'https://gw.azwell.ai', label: '그룹웨어', icon: '🏢' },
  { key: '서버', url: 'https://azvcenter.azwell.co.kr/ui/', label: 'vCenter', icon: '🖥️' },
  { key: '마이웍스', url: 'http://works.azwell.co.kr:8087/works/', label: '마이웍스', icon: '📋' },
  { key: '비즈플레이', url: 'https://www.bizplay.co.kr/bizpr_main.act', label: '비즈플레이', icon: '💳' },
  // Office
  { key: '엑셀', url: 'https://www.office.com/launch/excel', label: 'Excel', icon: '📊' },
  { key: '워드', url: 'https://www.office.com/launch/word', label: 'Word', icon: '📝' },
  { key: 'PPT', url: 'https://www.office.com/launch/powerpoint', label: 'PowerPoint', icon: '📽️' },
  { key: '원노트', url: 'onenote:', label: 'OneNote', icon: '📓' },
  { key: '아웃룩', url: 'ms-outlook:', label: 'Outlook', icon: '📬' },
  // 커뮤니케이션
  { key: '줌', url: 'zoommtg:', label: 'Zoom', icon: '🎥' },
  { key: '슬랙', url: 'slack:', label: 'Slack', icon: '💬' },
  // Windows 기본
  { key: '계산기', url: 'calculator:', label: '계산기', icon: '🔢' },
  { key: '설정', url: 'ms-settings:', label: '설정', icon: '⚙️' },
  { key: '스토어', url: 'ms-windows-store:', label: 'Store', icon: '🛒' },
  { key: '지도', url: 'https://map.naver.com/', label: '네이버지도', icon: '🗺️' },
  // 원격/개발
  { key: 'RDP', url: 'ms-rd:', label: '원격데스크톱', icon: '🖧' },
  { key: 'VSCode', url: 'vscode:', label: 'VS Code', icon: '💻' },
];

interface GoLauncherState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export const useGoLauncherStore = create<GoLauncherState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
}));
