import LegalPage from "./LegalPage";
import regulaminMd from "./content/legal/regulamin.md?raw";

export default function RegulaminPage() {
  return <LegalPage markdown={regulaminMd} />;
}
