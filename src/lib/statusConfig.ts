import type { DayPeriod } from "@/lib/time";

export const profileDescription = "Desenvolvedor web com experiência em Java e React.";

export const scheduledStatusMessages: Record<DayPeriod, readonly string[]> = {
  manha: [
    "provavelmente no segundo cafe agora",
    "academia ou codigo, ainda decidindo",
    "cafe e fone, o ritual de sempre",
  ],
  tarde: [
    "travado num bug ou fingindo que nao",
    "almocou? eu quase esqueci",
    "codando alguma coisa que vai virar post amanha",
  ],
  noite: [
    "ainda aqui, o codigo nao vai se escrever sozinho",
    "o dia rendeu mais do que eu esperava",
    "ainda processando o dia",
  ],
  madrugada: [
    "todo mundo dormindo, eu aqui",
    "as vezes a cabeca so para de noite",
    "nao e insonia, e produtividade atrasada",
    "deveria estar dormindo, mas aqui estamos",
  ],
};

export const codingStatusMessages: readonly string[] = [
  "no meio de um commit, ja ja",
  "construindo. nao sei o que ainda, mas to construindo",
  "dedos no teclado, cabeca em outro lugar",
];
