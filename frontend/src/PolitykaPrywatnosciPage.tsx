import LegalPage from "./LegalPage";
import politykaMd from "./content/legal/polityka-prywatnosci.md?raw";

export default function PolitykaPrywatnosciPage() {
  return <LegalPage markdown={politykaMd} />;
}
