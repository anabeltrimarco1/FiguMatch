export default function ProgressBar({ progress }) {
  return (
    <div className="progress-bar">
      <div style={{ width: `${progress}%` }} />
    </div>
  );
}
