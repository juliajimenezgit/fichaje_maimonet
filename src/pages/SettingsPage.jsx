import { useState } from 'react';
import { useAppContext } from '../context/AppContext.jsx';

export default function SettingsPage() {
  const { state, updateSettings, importBackup, resetAll } = useAppContext();
  const [draft, setDraft] = useState({
    professionalName: state.settings.professionalName,
    businessName: state.settings.businessName,
    hourlyRate: state.settings.hourlyRate,
    currency: state.settings.currency,
    dateFormat: state.settings.dateFormat,
    paymentPercentages: {
      initial: state.settings.paymentPercentages?.initial ?? 25,
      intermediate: state.settings.paymentPercentages?.intermediate ?? 50,
      final: state.settings.paymentPercentages?.final ?? 25,
    },
  });
  const [backupText, setBackupText] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    updateSettings(draft);
  };

  const handleImport = () => {
    const result = importBackup(backupText);
    if (!result.success) {
      window.alert(result.message);
    }
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'maimonet-backup.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    if (window.confirm('Se eliminarán todos los datos. ¿Deseas continuar?')) {
      resetAll();
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Configuración</p>
          <h2>Ajustes generales</h2>
        </div>
      </div>
      <form className="card form-card" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label>
            <span>Nombre profesional</span>
            <input value={draft.professionalName} onChange={(event) => setDraft({ ...draft, professionalName: event.target.value })} />
          </label>
          <label>
            <span>Nombre comercial</span>
            <input value={draft.businessName} onChange={(event) => setDraft({ ...draft, businessName: event.target.value })} />
          </label>
          <label>
            <span>Tarifa predeterminada</span>
            <input type="number" value={draft.hourlyRate} onChange={(event) => setDraft({ ...draft, hourlyRate: event.target.value })} />
          </label>
          <label>
            <span>Moneda</span>
            <input value={draft.currency} onChange={(event) => setDraft({ ...draft, currency: event.target.value })} />
          </label>
          <label>
            <span>Formato de fecha</span>
            <input value={draft.dateFormat} onChange={(event) => setDraft({ ...draft, dateFormat: event.target.value })} />
          </label>
          <label>
            <span>Pago inicial (%)</span>
            <input type="number" value={draft.paymentPercentages.initial} onChange={(event) => setDraft({ ...draft, paymentPercentages: { ...draft.paymentPercentages, initial: event.target.value } })} />
          </label>
          <label>
            <span>Pago intermedio (%)</span>
            <input type="number" value={draft.paymentPercentages.intermediate} onChange={(event) => setDraft({ ...draft, paymentPercentages: { ...draft.paymentPercentages, intermediate: event.target.value } })} />
          </label>
          <label>
            <span>Pago final (%)</span>
            <input type="number" value={draft.paymentPercentages.final} onChange={(event) => setDraft({ ...draft, paymentPercentages: { ...draft.paymentPercentages, final: event.target.value } })} />
          </label>
        </div>
        <button className="button primary" type="submit">Guardar configuración</button>
      </form>

      <section className="card">
        <div className="card-header"><h3>Backup y restauración</h3></div>
        <textarea value={backupText} onChange={(event) => setBackupText(event.target.value)} placeholder="Pega el contenido JSON de una copia de seguridad" />
        <div className="card-actions">
          <button className="button secondary" onClick={handleExport}>Exportar JSON</button>
          <button className="button secondary" onClick={handleImport}>Importar JSON</button>
          <button className="button danger" onClick={handleReset}>Eliminar todos los datos</button>
        </div>
      </section>
    </div>
  );
}
