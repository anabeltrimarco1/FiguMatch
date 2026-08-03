export default function ProgressBar({
  value,
  max = 100,
}) {
  const percentage = Math.min(
    (value / max) * 100,
    100
  );

  return (
    <div className="ui-progress">
      <div
        className="ui-progress-fill"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}