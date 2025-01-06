class Magnet {
  static crackReg = /破解|-uc?(?![a-z])|uncensored|無碼|无码|流出/i;
  static zhReg = /(?!6k(-C)?)(中文|中字|字幕|-u?c(?![a-z])|.+(?<![a-z])ch(?![a-z])|\dc(?![a-z]))/i;
  static fourkReg = /4k/i;
  //static zhReg = /^(?!.*(?:6k(?:-C)?|-C_GG5|C字幕|C_X1080X|CD|-cd\d)).*(-c)/i;
  static ucReg = /-uc|破解-c|(UC.torrent)|C.torrent.无码|C.torrent.无码破解/i;
  static chReg = /(?!6k(-C)?|破解-C)(-c)/i;
  static crReg = /(?!6k(-C)?|破解-C)(破解)/i;
  static wumaReg = /无码|無碼|流出/i;
  static vrReg = /VR|時間/i;

  static useTransByte() {
    const rules = [
      { unit: /byte/i, trans: (size) => size },
      { unit: /kb/i, trans: (size) => size * 1000 },
      { unit: /mb/i, trans: (size) => size * 1000 ** 2 },
      { unit: /gb/i, trans: (size) => size * 1000 ** 3 },
      { unit: /tb/i, trans: (size) => size * 1000 ** 4 },
      { unit: /pb/i, trans: (size) => size * 1000 ** 5 },
      { unit: /eb/i, trans: (size) => size * 1000 ** 6 },
      { unit: /zb/i, trans: (size) => size * 1000 ** 7 },
      { unit: /yb/i, trans: (size) => size * 1000 ** 8 },
      { unit: /kib/i, trans: (size) => size * 1024 },
      { unit: /mib/i, trans: (size) => size * 1024 ** 2 },
      { unit: /gib/i, trans: (size) => size * 1024 ** 3 },
      { unit: /tib/i, trans: (size) => size * 1024 ** 4 },
      { unit: /pib/i, trans: (size) => size * 1024 ** 5 },
      { unit: /eib/i, trans: (size) => size * 1024 ** 6 },
      { unit: /zib/i, trans: (size) => size * 1024 ** 7 },
      { unit: /yib/i, trans: (size) => size * 1024 ** 8 },
    ];
    return (str) => {
      const num = str.match(/\d+\.\d+|\d+/)?.[0] ?? 0;
      if (num <= 0) return 0;
      const rule = rules.find(({ unit }) => unit.test(str));
      return rule ? rule.trans(num).toFixed(2) : 0;
    };
  }

  static magnetSort = (a, b) => {
    const toRegex = /\.torrent($|\.)/;
    const aIsTo = toRegex.test(a.name);
    const bIsTo = toRegex.test(b.name);

    const cRegex = /(?:[-_])C(?:$|\s|_)/; // 匹配 -C, -C_GG5, -C字幕 等形式
    const aIsC = cRegex.test(a.name);
    const bIsC = cRegex.test(b.name);

    if (aIsTo !== bIsTo) return aIsTo ? -1 : 1;
    if (aIsC !== bIsC) return aIsC ? -1 : 1;
    if (a.zh !== b.zh) return a.zh ? -1 : 1;
    if (a.crack !== b.crack) return a.crack ? -1 : 1;
    if (a.fourk !== b.fourk) return a.fourk ? -1 : 1;
    return parseFloat(b.size) - parseFloat(a.size);
  };
}
