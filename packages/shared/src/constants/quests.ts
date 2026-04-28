export interface QuestTemplate {
  key: string;
  title: string;
  description: string;
  target: number;
  xpReward: number;
  goldReward: number;
}

export const DAILY_QUESTS: QuestTemplate[] = [
  {
    key: 'send_messages',
    title: '동료에게 인사하기',
    description: '공개 채팅으로 메시지 3개를 보내세요',
    target: 3,
    xpReward: 50,
    goldReward: 30,
  },
  {
    key: 'visit_floors',
    title: '다른 층 방문하기',
    description: '2개 이상의 다른 층을 방문하세요',
    target: 2,
    xpReward: 30,
    goldReward: 20,
  },
  {
    key: 'sit_at_desk',
    title: '자리에 앉아 일하기',
    description: '자리에 앉아서 5분간 머무세요',
    target: 1,
    xpReward: 40,
    goldReward: 25,
  },
  {
    key: 'group_chat',
    title: '그룹 채팅 참여하기',
    description: '그룹 채팅에 메시지를 1개 보내세요',
    target: 1,
    xpReward: 20,
    goldReward: 15,
  },
  {
    key: 'emoji_reaction',
    title: '표정으로 소통하기',
    description: '이모티콘을 사용하여 표정을 바꿔보세요',
    target: 3,
    xpReward: 25,
    goldReward: 10,
  },
];
