function MaterialTextPreview({ text, type }) {
  if ((type === 'CSV' || type === 'XLSX') && text) {
    const sections = text.split(/^# /m).filter(Boolean);
    return (
      <div className="csv-preview">
        {sections.map((section, si) => {
          const lines = section.trim().split('\n');
          const sheetName = lines[0];
          const rows = lines.slice(1).filter(l => l.trim()).map(l => l.split(','));
          if (rows.length === 0) return null;
          return (
            <div key={si} className="csv-sheet">
              {sections.length > 1 && <div className="csv-sheet-name">{sheetName}</div>}
              <div className="csv-table-wrapper">
                <table className="csv-table">
                  <thead>
                    <tr>{rows[0].map((cell, i) => <th key={i}>{cell.trim()}</th>)}</tr>
                  </thead>
                  <tbody>
                    {rows.slice(1).map((row, ri) => (
                      <tr key={ri}>{row.map((cell, ci) => <td key={ci}>{cell.trim()}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    );
  }
  return <pre className="audio-pair-transcript-text">{text}</pre>;
}

export default MaterialTextPreview;
