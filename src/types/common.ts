export interface PageProps {
  selectedLang: string;
  texts: Record<string, string>;
  handleLanguageChange?: (lang: string) => void;
  loading?: boolean;
}
