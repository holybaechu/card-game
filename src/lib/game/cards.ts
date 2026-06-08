export type GameCard = {
  id: number;
  name: string;
  rank: string;
  attack: number;
  hp: number;
  imagePath: string;
  sortOrder: number;
};

export type CardRow = {
  id: number;
  name: string;
  rarity: string;
  attack: number;
  hp: number;
  image_path: string;
  sort_order: number;
};

function assertPositiveInteger(value: number, label: string) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Card row requires a valid ${label}`);
  }
}

export function mapCardRow(row: CardRow): GameCard {
  assertPositiveInteger(row.id, "id");
  assertPositiveInteger(row.attack, "attack");
  assertPositiveInteger(row.hp, "hp");
  assertPositiveInteger(row.sort_order, "sort order");

  if (!row.name.trim()) {
    throw new Error("Card row requires a valid name");
  }

  if (!row.rarity.trim()) {
    throw new Error("Card row requires a valid rarity");
  }

  if (!row.image_path.startsWith("/cards/")) {
    throw new Error("Card row requires a public image path under /cards/");
  }

  return {
    id: row.id,
    name: row.name,
    rank: row.rarity,
    attack: row.attack,
    hp: row.hp,
    imagePath: row.image_path,
    sortOrder: row.sort_order,
  };
}

export const fallbackCards: GameCard[] = [
  { id: 1, name: "다운증후", rank: "SSR", attack: 21, hp: 118, imagePath: "/cards/001-gemini-5wa9.png", sortOrder: 1 },
  { id: 2, name: "공항도훅", rank: "SR", attack: 17, hp: 132, imagePath: "/cards/002-screenshot-1121.png", sortOrder: 2 },
  { id: 3, name: "신사준후", rank: "SSR", attack: 20, hp: 120, imagePath: "/cards/003-chatgpt-1035.png", sortOrder: 3 },
  { id: 4, name: "금쪽이", rank: "SR", attack: 16, hp: 138, imagePath: "/cards/004-gemini-m064.png", sortOrder: 4 },
  { id: 5, name: "배추의 봉인된 왼팔", rank: "R", attack: 14, hp: 146, imagePath: "/cards/005-img-1588.jpeg", sortOrder: 5 },
  { id: 6, name: "배추의 봉인된 오른팔", rank: "R", attack: 15, hp: 140, imagePath: "/cards/006-img-1589.jpeg", sortOrder: 6 },
  { id: 7, name: "왕준후", rank: "SSR", attack: 22, hp: 110, imagePath: "/cards/007-wang-junhu.png", sortOrder: 7 },
  { id: 8, name: "에반게리온", rank: "SR", attack: 19, hp: 122, imagePath: "/cards/008-evangelion.png", sortOrder: 8 },
  { id: 9, name: "야르준후", rank: "SR", attack: 18, hp: 128, imagePath: "/cards/009-yaru-junhu.jpeg", sortOrder: 9 },
  { id: 10, name: "은쪽이", rank: "SSR", attack: 23, hp: 98, imagePath: "/cards/010-gemini-g8mg.png", sortOrder: 10 },
  { id: 11, name: "봉인된 배추", rank: "R", attack: 13, hp: 150, imagePath: "/cards/011-img-1584.jpeg", sortOrder: 11 },
  { id: 12, name: "범죄자후", rank: "SR", attack: 18, hp: 124, imagePath: "/cards/012-inbound-7265.png", sortOrder: 12 },
  { id: 13, name: "제목없음3", rank: "SR", attack: 17, hp: 130, imagePath: "/cards/013-gemini-blank.png", sortOrder: 13 },
  { id: 14, name: "치마예후", rank: "N", attack: 12, hp: 156, imagePath: "/cards/014-face-swap-53081.jpeg", sortOrder: 14 },
  { id: 15, name: "기린", rank: "SSR", attack: 24, hp: 92, imagePath: "/cards/015-giraffe.png", sortOrder: 15 },
  { id: 16, name: "준오공", rank: "N", attack: 11, hp: 162, imagePath: "/cards/016-face-swap-87304.jpeg", sortOrder: 16 },
  { id: 17, name: "해커준후", rank: "SR", attack: 18, hp: 126, imagePath: "/cards/017-screenshot-1132.png", sortOrder: 17 },
  { id: 18, name: "노숙자준후", rank: "SSR", attack: 22, hp: 108, imagePath: "/cards/018-alley-junhu.png", sortOrder: 18 },
  { id: 19, name: "닛몰준후", rank: "SR", attack: 16, hp: 136, imagePath: "/cards/019-nitmol-junhu.png", sortOrder: 19 },
  { id: 20, name: "퉁퉁퉁준후", rank: "SR", attack: 19, hp: 116, imagePath: "/cards/020-chatgpt-1024.png", sortOrder: 20 },
  { id: 21, name: "무한루프", rank: "SSR", attack: 25, hp: 96, imagePath: "/cards/021-infinite-loop.png", sortOrder: 21 },
  { id: 22, name: "취조실준후", rank: "SR", attack: 19, hp: 128, imagePath: "/cards/022-interrogation-junhu.png", sortOrder: 22 },
  { id: 23, name: "경소고1짱", rank: "SSR", attack: 23, hp: 112, imagePath: "/cards/023-gyeongso-high-no1.jpeg", sortOrder: 23 },
  { id: 24, name: "으아악", rank: "R", attack: 15, hp: 148, imagePath: "/cards/024-aaargh.jpeg", sortOrder: 24 },
  { id: 25, name: "제목없음1", rank: "N", attack: 12, hp: 164, imagePath: "/cards/025-untitled-1.jpeg", sortOrder: 25 },
  { id: 26, name: "배추의 봉인된 오른다리", rank: "R", attack: 14, hp: 152, imagePath: "/cards/026-sealed-right-leg.jpeg", sortOrder: 26 },
  { id: 27, name: "퐈!준후", rank: "SR", attack: 20, hp: 118, imagePath: "/cards/027-pwa-junhu.jpeg", sortOrder: 27 },
  { id: 28, name: "배추의 봉인된 왼다리", rank: "R", attack: 14, hp: 154, imagePath: "/cards/028-sealed-left-leg.jpeg", sortOrder: 28 },
  { id: 29, name: "분노준후", rank: "SSR", attack: 24, hp: 104, imagePath: "/cards/029-angry-junhu.png", sortOrder: 29 },
  { id: 30, name: "제목없음2", rank: "N", attack: 13, hp: 160, imagePath: "/cards/030-untitled-2.png", sortOrder: 30 },
  { id: 31, name: "배빡빡이", rank: "SR", attack: 18, hp: 134, imagePath: "/cards/031-bae-bald.png", sortOrder: 31 },
  { id: 32, name: "비둘기와 준후", rank: "SSR", attack: 22, hp: 122, imagePath: "/cards/032-pigeon-and-junhu.png", sortOrder: 32 },
];
