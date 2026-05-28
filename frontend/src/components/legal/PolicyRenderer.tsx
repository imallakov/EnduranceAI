import React from 'react';

// Lightweight markdown-like renderer — no external deps.
// Handles: # H1, ## H2, ### H3, **bold**, [text](url), `code`, tables, bullet lists, paragraphs.

function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|\[(.+?)\]\((.+?)\)|`(.+?)`)/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));

    if (match[2] !== undefined) {
      parts.push(<strong key={match.index}>{match[2]}</strong>);
    } else if (match[3] !== undefined) {
      parts.push(
        <a key={match.index} href={match[4]} target={match[4].startsWith('http') ? '_blank' : undefined}
           rel={match[4].startsWith('http') ? 'noopener noreferrer' : undefined}
           style={{ color: 'var(--primary)', textDecoration: 'underline' }}>
          {match[3]}
        </a>
      );
    } else if (match[5] !== undefined) {
      parts.push(
        <code key={match.index} style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.92em', background: 'var(--bg)', padding: '1px 5px', borderRadius: 4 }}>
          {match[5]}
        </code>
      );
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function renderTable(lines: string[]): React.ReactNode {
  const rows = lines.map(l => l.replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
  const [header, , ...body] = rows;
  return (
    <div key={lines[0]} style={{ overflowX: 'auto', marginBottom: 18 }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13.5 }}>
        <thead>
          <tr>
            {header.map((h, i) => (
              <th key={i} style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '2px solid var(--border)', color: 'var(--text)', fontWeight: 600 }}>
                {renderInline(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri} style={{ borderBottom: '1px solid var(--border-soft)' }}>
              {row.map((cell, ci) => (
                <td key={ci} style={{ padding: '8px 12px', color: 'var(--muted)', verticalAlign: 'top' }}>
                  {renderInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PolicyRenderer({ content }: { content: string }): React.ReactElement {
  const lines = content.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Table: starts with |
    if (line.startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      nodes.push(renderTable(tableLines));
      continue;
    }

    // Bullet list
    if (line.startsWith('- ')) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith('- ')) {
        items.push(lines[i].slice(2));
        i++;
      }
      nodes.push(
        <ul key={`ul-${i}`} style={{ margin: '0 0 16px', paddingLeft: 22, color: 'var(--text)', lineHeight: 1.65 }}>
          {items.map((it, idx) => (
            <li key={idx} style={{ marginBottom: 4, fontSize: 14.5 }}>{renderInline(it)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // H1
    if (line.startsWith('# ')) {
      nodes.push(
        <h1 key={`h1-${i}`} style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.5, color: 'var(--text)', margin: '0 0 8px' }}>
          {renderInline(line.slice(2))}
        </h1>
      );
      i++;
      continue;
    }

    // H2
    if (line.startsWith('## ')) {
      nodes.push(
        <h2 key={`h2-${i}`} style={{ fontSize: 18, fontWeight: 600, letterSpacing: -0.2, color: 'var(--text)', margin: '28px 0 10px', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
          {renderInline(line.slice(3))}
        </h2>
      );
      i++;
      continue;
    }

    // H3
    if (line.startsWith('### ')) {
      nodes.push(
        <h3 key={`h3-${i}`} style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: '20px 0 8px' }}>
          {renderInline(line.slice(4))}
        </h3>
      );
      i++;
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Paragraph
    nodes.push(
      <p key={`p-${i}`} style={{ margin: '0 0 14px', fontSize: 14.5, color: 'var(--text)', lineHeight: 1.7 }}>
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return <div>{nodes}</div>;
}
