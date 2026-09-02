import type { Localized } from './i18n.ts';

export interface PrivacyExplainerStrings {
  whatsCollectedHeading: Localized;
  whatsCollectedBody: Localized;
  bullets: Localized[];
  nothingLoadsHeading: Localized;
  nothingLoadsBodyBefore: Localized;
  gpcLinkText: Localized;
  nothingLoadsBodyAfter: Localized;
  reopenLinkText: Localized;
  toolsHeading: Localized;
  toolsIntro: Localized;
  /** Prefix before a tool's own `collects` list in the "tools behind it" entry. */
  alsoCollectsLabel: Localized;
}

export const DEFAULT_PRIVACY_EXPLAINER_STRINGS: PrivacyExplainerStrings = {
  whatsCollectedHeading: {
    default: "What's collected",
    es: 'Qué se recopila',
    pt: 'O que é coletado',
  },
  whatsCollectedBody: {
    default:
      "If you say yes to the analytics prompt, this site counts your visit: the page you viewed, the referring site, your browser's language, your screen resolution, and a general device/browser type. That's it.",
    es: 'Si aceptas el aviso de analítica, este sitio cuenta tu visita: la página que viste, el sitio de referencia, el idioma de tu navegador, la resolución de tu pantalla y un tipo general de dispositivo/navegador. Eso es todo.',
    pt: 'Se você aceitar o aviso de análise, este site conta sua visita: a página que você viu, o site de referência, o idioma do seu navegador, a resolução da sua tela e um tipo geral de dispositivo/navegador. Só isso.',
  },
  bullets: [
    { default: 'No cookies', es: 'Sin cookies', pt: 'Sem cookies' },
    { default: 'No fingerprinting', es: 'Sin fingerprinting', pt: 'Sem fingerprinting' },
    {
      default: 'No cross-site tracking',
      es: 'Sin rastreo entre sitios',
      pt: 'Sem rastreamento entre sites',
    },
    {
      default: 'No personal data, no IP address stored',
      es: 'Sin datos personales, sin almacenar tu dirección IP',
      pt: 'Sem dados pessoais, sem armazenar seu endereço IP',
    },
    {
      default: 'No advertising, no data sold or shared with anyone',
      es: 'Sin publicidad, sin vender ni compartir datos con nadie',
      pt: 'Sem publicidade, sem vender ou compartilhar dados com ninguém',
    },
  ],
  nothingLoadsHeading: {
    default: 'Nothing loads before you decide',
    es: 'Nada se carga antes de que decidas',
    pt: 'Nada é carregado antes de você decidir',
  },
  nothingLoadsBodyBefore: {
    default:
      "The tracking scripts don't exist on the page at all until you say yes to the prompt. If your browser sends a",
    es: 'Los scripts de rastreo no existen en la página hasta que aceptas el aviso. Si tu navegador envía una señal de',
    pt: 'Os scripts de rastreamento não existem na página até que você aceite o aviso. Se o seu navegador enviar um sinal de',
  },
  gpcLinkText: {
    default: 'Global Privacy Control',
    es: 'Global Privacy Control',
    pt: 'Global Privacy Control',
  },
  nothingLoadsBodyAfter: {
    default:
      'signal, that counts as a no automatically and the prompt never shows. You can change your mind anytime with the link below.',
    es: 'eso cuenta automáticamente como un no y el aviso nunca aparece. Puedes cambiar de opinión cuando quieras con el enlace de abajo.',
    pt: 'isso conta automaticamente como um não e o aviso nunca aparece. Você pode mudar de ideia a qualquer momento com o link abaixo.',
  },
  reopenLinkText: {
    default: 'Open analytics preferences',
    es: 'Abrir preferencias de analítica',
    pt: 'Abrir preferências de análise',
  },
  toolsHeading: {
    default: 'The tools behind it',
    es: 'Las herramientas detrás de esto',
    pt: 'As ferramentas por trás disso',
  },
  toolsIntro: {
    default:
      'Analytics tools run only after you say yes, all cookieless by design, none able to identify you individually:',
    es: 'Las herramientas de analítica funcionan solo si aceptas, todas sin cookies por diseño, ninguna capaz de identificarte individualmente:',
    pt: 'As ferramentas de análise funcionam apenas depois que você aceita, todas sem cookies por design, nenhuma capaz de identificar você individualmente:',
  },
  alsoCollectsLabel: {
    default: 'Also collects:',
    es: 'También recopila:',
    pt: 'Também coleta:',
  },
};

/** Shallow-merges a consumer's overrides over the defaults - each key is a whole unit to replace, not deep-merged. */
export function resolvePrivacyExplainerStrings(
  overrides?: Partial<PrivacyExplainerStrings>,
): PrivacyExplainerStrings {
  return { ...DEFAULT_PRIVACY_EXPLAINER_STRINGS, ...overrides };
}
