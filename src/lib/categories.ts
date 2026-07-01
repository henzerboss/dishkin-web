const CATEGORY_EMOJI: Array<[RegExp, string]> = [
  [/breakfast|завтрак|desayuno|frühstück|petit|colazione|café|śniad|kahvalt|завтрак|snídan|raňaj|ontbijt|朝食|아침|早餐/i, '🍳'],
  [/lunch|обед|almuerzo|mittag|déjeuner|pranzo|almoço|lunch|obiad|öğle|обід|oběd|obed|masa|μεσημ|점심|午餐/i, '🥗'],
  [/dinner|ужин|cena|abend|dîner|jantar|kolacja|akşam|вечер|večeře|večera|vacsora|δείπνο|저녁|晚餐/i, '🍽️'],
  [/dessert|десерт|postre|nachtisch|dolce|sobremesa|deser|tatlı|dezert|επιδόρπιο|디저트|甜点/i, '🍰'],
  [/soup|суп|sopa|soupe|zuppa|soep|zupa|çorba|polévka|polievka|σούπα|국|汤/i, '🍲'],
  [/salad|салат|ensalada|salade|insalata|sałat|salata|салат|σαλάτα|샐러드|沙拉/i, '🥬'],
  [/vegetarian|вегетариан|veggie|vegetar|weget|vejet|χορτο|채식|素/i, '🥦'],
  [/meat|мяс|carne|fleisch|viande|mięso|et|maso|mäso|고기|肉/i, '🥩'],
  [/chicken|куриц|pollo|huhn|poulet|kurcz|tavuk|kuře|kura|κοτό|닭|鸡/i, '🍗'],
  [/fish|рыб|pesc|fisch|poisson|ryba|balık|ryb|ψάρι|생선|鱼/i, '🐟'],
  [/quick|быстр|rápid|schnell|rapide|veloc|szyb|hızlı|rych|γρήγ|빠른|快/i, '⚡'],
  [/healthy|полез|здоров|salud|gesund|sain|saud|zdrow|sağlıklı|zdrav|υγιει|건강|健康/i, '💚'],
  [/snack|перекус|aperitivo|spuntino|lanche|przeką|atıştır|svačin|uzsonna|간식|小吃/i, '🥪'],
];

export function categoryEmoji(name: string): string {
  return CATEGORY_EMOJI.find(([pattern]) => pattern.test(name))?.[1] ?? '🍽️';
}
