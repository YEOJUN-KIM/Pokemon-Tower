// Information previews for stat-changing battle forms in the current engine.
// Purely visual/type-only changes and legacy Ash-Greninja are excluded.
export const battlePreviewForms:Record<string,{name:string;condition:string}>={
 'Darmanitan-Zen':{name:'불비달마 달마모드',condition:'특성 달마모드일 때 턴 종료 시 HP가 절반 이하이면 변신합니다. HP를 절반보다 높게 회복하면 돌아옵니다.'},
 'Meloetta-Pirouette':{name:'메로엣타 스텝폼',condition:'옛노래를 명중시키면 보이스폼과 스텝폼이 서로 바뀝니다.'},
 'Aegislash-Blade':{name:'킬가르도 블레이드폼',condition:'특성 배틀스위치로 공격 기술을 사용하기 전에 변신하며, 킹실드를 사용하면 실드폼으로 돌아옵니다.'},
 'Zygarde-Complete':{name:'지가르데 퍼펙트폼',condition:'특성 스웜체인지일 때 턴 종료 시 HP가 절반 이하이면 50%폼 또는 10%폼에서 변신합니다.'},
 'Wishiwashi-School':{name:'약어리 군집폼',condition:'특성 어군으로 레벨20 이상이고 HP가 25%보다 높으면 변신합니다. HP가 25% 이하이면 단독폼으로 돌아옵니다.'},
 'Necrozma-Ultra':{name:'울트라네크로즈마',condition:'황혼의 갈기 또는 새벽의 날개가 울트라네크로Z를 지니고 울트라버스트를 사용하면 변신합니다.'},
 'Eiscue-Noice':{name:'빙큐보 나이스페이스',condition:'특성 아이스페이스로 물리 공격을 막으면 변신합니다. 얼음얼굴이 복구되면 아이스페이스로 돌아옵니다.'},
 'Zacian-Crowned':{name:'자시안 검왕',condition:'녹슨검을 지니면 배틀에서 검왕의 모습이 됩니다.'},
 'Zamazenta-Crowned':{name:'자마젠타 방패왕',condition:'녹슨방패를 지니면 배틀에서 방패왕의 모습이 됩니다.'},
 'Palafin-Hero':{name:'돌핀맨 마이티폼',condition:'특성 마이티체인지로 배틀에 나온 뒤 교체하면 변신합니다. 다시 출전할 때 마이티폼으로 등장합니다.'},
 'Terapagos-Terastal':{name:'테라파고스 테라스탈폼',condition:'특성 테라체인지로 배틀에 출전하면 변신합니다.'},
 'Terapagos-Stellar':{name:'테라파고스 스텔라폼',condition:'테라스탈폼에서 테라스탈하면 변신하며, 테라스탈 타입은 스텔라가 됩니다.'},
 'Minior-Meteor':{name:'메테노 유성의 모습',condition:'특성 리밋실드로 HP가 절반보다 높으면 유성의 모습, 절반 이하이면 코어의 모습이 됩니다.'},
};
