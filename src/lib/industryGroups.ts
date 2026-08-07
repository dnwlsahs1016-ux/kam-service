// 업종코드를 대분류/소분류로 묶는다. DB의 companies.industry_code(KSIC)는 세분화가 너무
// 잘게 쪼개져 있어서 사용자가 한눈에 보기 어렵기 때문에, 화면 표시용 그룹핑은 여기서
// 별도로 관리한다.

export type IndustryMinor = {
  label: string;
  codes: string[];
};

export type IndustryMajor = {
  major: string;
  items: IndustryMinor[];
};

export const INDUSTRY_GROUPS: IndustryMajor[] = [
  {
    major: "금융",
    items: [
      { label: "보험사", codes: ["65110", "65121"] },
      { label: "은행", codes: ["64121", "64992"] },
      { label: "증권", codes: ["66121"] },
    ],
  },
  {
    major: "소비재",
    items: [
      { label: "백화점", codes: ["47111"] },
      { label: "식료품", codes: ["108"] },
      { label: "화장품", codes: ["20423"] },
    ],
  },
  {
    major: "인프라",
    items: [
      { label: "건설사", codes: ["4111", "41221"] },
      { label: "에너지", codes: ["35120", "35200", "192"] },
      { label: "조선업", codes: ["3111"] },
    ],
  },
  {
    major: "전자통신",
    items: [
      { label: "소프트웨어", codes: ["5821"] },
      { label: "텔레콤", codes: ["612", "61220"] },
      { label: "플랫폼", codes: ["63120"] },
    ],
  },
  {
    major: "제조업",
    items: [
      { label: "반도체", codes: ["2612", "264"] },
      { label: "자동차", codes: ["30121", "303"] },
      { label: "제약·바이오", codes: ["212", "211", "21100", "21212", "7011", "70113"] },
    ],
  },
];

export function findMinorByCode(code: string): IndustryMinor | null {
  for (const group of INDUSTRY_GROUPS) {
    for (const item of group.items) {
      if (item.codes.includes(code)) return item;
    }
  }
  return null;
}

export function findMinorByCodesParam(codesParam: string): IndustryMinor | null {
  const codes = codesParam.split(",");
  for (const group of INDUSTRY_GROUPS) {
    for (const item of group.items) {
      if (item.codes.length === codes.length && item.codes.every((c) => codes.includes(c))) {
        return item;
      }
    }
  }
  return { label: codesParam, codes }; // 매핑 안 된 코드는 코드 자체를 라벨로 폴백
}

/** 특정 industry_code가 속한 소분류의 전체 codes(콤마 join, URL용)를 반환한다. */
export function codesParamForCode(code: string | null): string {
  if (!code) return "";
  const minor = findMinorByCode(code);
  return (minor?.codes ?? [code]).join(",");
}
