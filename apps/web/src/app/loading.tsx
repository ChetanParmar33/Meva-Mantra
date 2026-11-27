export default function Loading() {
  return (
    <div className="container" style={{ padding: '60px 0' }} aria-busy="true" aria-label="Loading">
      <div className="skeleton" style={{ height: 160, marginBottom: 24 }} />
      <div className="grid">{Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton" style={{ aspectRatio: '3 / 4' }} />)}</div>
    </div>
  );
}
