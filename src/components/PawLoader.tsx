interface PawLoaderProps {
  text?: string;
  overlay?: boolean;
}

export function PawLoader({ text, overlay = false }: PawLoaderProps) {
  const inner = (
    <div className="paw-loader">
      <div className="paw-loader-track">
        {[0, 1, 2, 3].map(i => (
          <span
            key={i}
            className={`paw-loader-paw ${i % 2 === 0 ? 'paw-loader-paw--hi' : 'paw-loader-paw--lo'}`}
            style={{ animationDelay: `${i * 0.3}s` }}
          >🐾</span>
        ))}
      </div>
      {text && <p className="paw-loader-text font-typewriter">{text}</p>}
    </div>
  );

  if (overlay) {
    return <div className="paw-loader-overlay">{inner}</div>;
  }
  return inner;
}
