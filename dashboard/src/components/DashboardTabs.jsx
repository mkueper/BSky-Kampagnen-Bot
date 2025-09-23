import { classNames } from "../utils/classNames";

function DashboardTabs({
  view,
  onChangeView,
  exporting,
  importing,
  onExport,
  onImportClick,
  onFileSelected,
  importInputRef,
}) {
  const isPlanned = view === "planned";
  const isBusy = exporting || importing;

  return (
    <div className="dashboard-subtabs-row">
      <div className="dashboard-subtabs">
        <button
          className={classNames(
            "dashboard-subtab",
            isPlanned && "active"
          )}
          onClick={() => onChangeView("planned")}
        >
          🕒 Geplant
        </button>
        <button
          className={classNames(
            "dashboard-subtab",
            view === "published" && "active"
          )}
          onClick={() => onChangeView("published")}
        >
          ✅ Veröffentlicht
        </button>
      </div>

      {isPlanned && (
        <div className="dashboard-subtabs dashboard-subtabs-actions">
          <span className="dashboard-subtab-label">Aktionen</span>
          <button onClick={onExport} disabled={isBusy}>
            {exporting ? "⬇️ Export läuft…" : "⬇️ Exportieren"}
          </button>
          <button onClick={onImportClick} disabled={isBusy}>
            {importing ? "⬆️ Import läuft…" : "⬆️ Importieren"}
          </button>
          <input
            type="file"
            accept="application/json"
            ref={importInputRef}
            onChange={onFileSelected}
            style={{ display: "none" }}
          />
        </div>
      )}
    </div>
  );
}

export default DashboardTabs;
