import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { CSSProperties, ReactNode } from "react";
import { navigate } from "./App";
import { applyLegalConfig } from "./content/legal/legalConfig";

const font = "'Inter',-apple-system,BlinkMacSystemFont,system-ui,sans-serif";
const ACC  = "#7c3aed";

interface Props { markdown: string }

export default function LegalPage({ markdown }: Props) {
  const content = applyLegalConfig(markdown);

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <button style={S.back} onClick={() => navigate("/")}>← Rezerwo</button>
        <div style={S.card}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1:     ({ children }) => <h1 style={S.h1}>{children}</h1>,
              h2:     ({ children }) => <h2 style={S.h2}>{children}</h2>,
              h3:     ({ children }) => <h3 style={S.h3}>{children}</h3>,
              p:      ({ children }) => <p style={S.p}>{children}</p>,
              li:     ({ children }) => <li style={S.li}>{children}</li>,
              ul:     ({ children }) => <ul style={S.ul}>{children}</ul>,
              ol:     ({ children }) => <ol style={S.ol}>{children}</ol>,
              a:      ({ href, children }) => (
                <a href={href} style={S.a} target="_blank" rel="noopener noreferrer">{children}</a>
              ),
              strong: ({ children }) => <strong style={S.strong}>{children}</strong>,
              em:     ({ children }) => <em style={{ fontStyle:"italic" }}>{children}</em>,
              hr:     () => <hr style={S.hr} />,
              table:  ({ children }) => (
                <div style={S.tableWrap}><table style={S.table}>{children}</table></div>
              ),
              thead:  ({ children }) => <thead>{children}</thead>,
              tbody:  ({ children }) => <tbody>{children}</tbody>,
              tr:     ({ children }) => <tr>{children}</tr>,
              th:     ({ children }: { children?: ReactNode }) => <th style={S.th}>{children}</th>,
              td:     ({ children }: { children?: ReactNode }) => <td style={S.td}>{children}</td>,
              blockquote: ({ children }) => <blockquote style={S.blockquote}>{children}</blockquote>,
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

const S: Record<string, CSSProperties> = {
  page:       { minHeight:"100vh", background:"radial-gradient(ellipse 800px 500px at 15% 30%, rgba(124,58,237,.04) 0%, transparent 65%), #fbf7f4", fontFamily:font, padding:"0 20px 60px" },
  wrap:       { maxWidth:820, margin:"0 auto", paddingTop:20 },
  back:       { border:"1.5px solid #efe9ee", background:"#fff", color:ACC, fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:font, padding:"7px 16px", borderRadius:999, marginBottom:24, display:"inline-flex", alignItems:"center", gap:6 },
  card:       { background:"#fff", borderRadius:18, padding:"28px 36px", border:"1px solid #efe9ee", boxShadow:"0 2px 8px rgba(26,19,32,.05)" },
  h1:         { fontSize:"clamp(21px,3.5vw,30px)", fontWeight:500, letterSpacing:"-0.03em", color:"#1a1320", margin:"0 0 4px", fontFamily:"'Fraunces',Georgia,serif", lineHeight:1.25 },
  h2:         { fontSize:17, fontWeight:700, color:"#1a1320", margin:"28px 0 8px", borderBottom:"1px solid #efe9ee", paddingBottom:7 },
  h3:         { fontSize:15, fontWeight:600, color:"#1a1320", margin:"16px 0 5px" },
  p:          { fontSize:14.5, color:"#52525b", lineHeight:1.8, margin:"0 0 12px" },
  li:         { fontSize:14.5, color:"#52525b", lineHeight:1.8 },
  ul:         { paddingLeft:22, margin:"0 0 12px" },
  ol:         { paddingLeft:22, margin:"0 0 12px" },
  a:          { color:ACC, textDecoration:"underline" },
  strong:     { fontWeight:700, color:"#1a1320" },
  hr:         { border:"none", borderTop:"1px solid #efe9ee", margin:"20px 0" },
  tableWrap:  { overflowX:"auto" as const, margin:"16px 0" },
  table:      { width:"100%", borderCollapse:"collapse" as const, fontSize:13.5, color:"#52525b" },
  th:         { padding:"9px 13px", background:"#f5f3ff", fontWeight:700, color:"#1a1320", textAlign:"left" as const, border:"1px solid #efe9ee" },
  td:         { padding:"9px 13px", border:"1px solid #efe9ee", verticalAlign:"top" as const },
  blockquote: { borderLeft:"3px solid #c4b5fd", margin:"12px 0", paddingLeft:16, color:"#6b7280", fontStyle:"italic" },
};
