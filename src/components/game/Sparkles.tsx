export function Sparkles() {
  return (
    <>
      {Array.from({ length: 18 }).map((_, index) => (
        <span
          className="sparkle"
          key={index}
          style={{
            left: `${8 + ((index * 19) % 86)}%`,
            top: `${8 + ((index * 31) % 82)}%`,
            animationDelay: `${index * 0.13}s`,
          }}
        />
      ))}
    </>
  );
}
