// "기타" 카테고리는 다양한 계정이 뒤섞여 있는데, 실제로는 몇 가지 주제(보험부채, 이연법인세,
// 사업결합 등)가 여러 회사에 걸쳐 반복적으로 나타난다. LLM을 다시 호출하지 않고, 제목/요약에
// 나오는 키워드만으로 소분류한다(무료). 위에서부터 순서대로 검사해 처음 걸리는 규칙을 쓴다.

export type OtherSubcategory = { label: string; keywords: string[] };

const RULES: OtherSubcategory[] = [
  { label: "보험계약·보험부채", keywords: ["보험계약", "보험료적립금", "보험부채", "위험률", "보장단위", "손해율"] },
  { label: "이연법인세", keywords: ["이연법인세", "이월세액공제", "법인세"] },
  { label: "사업결합", keywords: ["사업결합", "지배력 획득", "흡수합병", "영업양수도", "이전대가", "합병"] },
  { label: "건설계약(총계약원가)", keywords: ["총계약원가", "공사진행률", "건설사업부문", "공사계약"] },
  { label: "판매·정산손익", keywords: ["정산손익", "판매수수료"] },
];

const FALLBACK_LABEL = "기타(그 외)";

export function classifyOther(title: string, summary: string): string {
  const text = `${title} ${summary}`;
  for (const rule of RULES) {
    if (rule.keywords.some((k) => text.includes(k))) return rule.label;
  }
  return FALLBACK_LABEL;
}
