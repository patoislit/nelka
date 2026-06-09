/**
 * jsPDF nepodporuje slovenské diakritické znaky (ľ, š, č, ž...).
 * Táto funkcia ich nahradí ASCII ekvivalentmi pre PDF výstup.
 */
export function pd(text: string | number | null | undefined): string {
  if (text === null || text === undefined) return '';
  const s = String(text);
  return s
    .replace(/á/g, 'a').replace(/Á/g, 'A')
    .replace(/ä/g, 'a').replace(/Ä/g, 'A')
    .replace(/č/g, 'c').replace(/Č/g, 'C')
    .replace(/ď/g, 'd').replace(/Ď/g, 'D')
    .replace(/é/g, 'e').replace(/É/g, 'E')
    .replace(/í/g, 'i').replace(/Í/g, 'I')
    .replace(/ľ/g, 'l').replace(/Ľ/g, 'L')
    .replace(/ĺ/g, 'l').replace(/Ĺ/g, 'L')
    .replace(/ň/g, 'n').replace(/Ň/g, 'N')
    .replace(/ó/g, 'o').replace(/Ó/g, 'O')
    .replace(/ô/g, 'o').replace(/Ô/g, 'O')
    .replace(/ŕ/g, 'r').replace(/Ŕ/g, 'R')
    .replace(/š/g, 's').replace(/Š/g, 'S')
    .replace(/ť/g, 't').replace(/Ť/g, 'T')
    .replace(/ú/g, 'u').replace(/Ú/g, 'U')
    .replace(/ý/g, 'y').replace(/Ý/g, 'Y')
    .replace(/ž/g, 'z').replace(/Ž/g, 'Z')
    .replace(/ř/g, 'r').replace(/Ř/g, 'R')
    .replace(/–/g, '-').replace(/—/g, '-')
    .replace(/„/g, '"').replace(/"/g, '"').replace(/"/g, '"')
    .replace(/…/g, '...');
}
