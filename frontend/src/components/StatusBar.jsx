export default function StatusBar({ pharmacy }) {
  if (!pharmacy) return null;
  return (
    <div className="status-bar">
      <span className="status-dot" /> {pharmacy.pharmacy_name} Dispensary Live
      <span className="status-sep">|</span>
      License: {pharmacy.ppb_license_no}
      <span className="status-sep">|</span>
      Currency: {pharmacy.currency}
    </div>
  );
}
