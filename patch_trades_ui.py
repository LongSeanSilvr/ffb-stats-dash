import re

with open("src/pages/Trades.tsx", "r") as f:
    content = f.read()

# Replace CustomAvatarDot with unique ID
new_avatar = """
const CustomAvatarDot = (props: any) => {
  const { cx, cy, payload } = props;
  const size = 28;
  const avatarUrl = payload.avatar ? `https://sleepercdn.com/avatars/thumbs/${payload.avatar}` : null;
  if (!cx || !cy) return null;
  
  const uniqueId = `clip-trade-${payload.name ? payload.name.replace(/[^a-zA-Z0-9]/g, '') : Math.random().toString(36).substring(7)}`;
  return (
    <svg x={cx - size / 2} y={cy - size / 2} width={size} height={size}>
      <defs>
        <clipPath id={uniqueId}>
          <circle cx={size / 2} cy={size / 2} r={size / 2} />
        </clipPath>
      </defs>
      {avatarUrl ? (
        <image href={avatarUrl} x="0" y="0" width={size} height={size} clipPath={`url(#${uniqueId})`} />
      ) : (
        <circle cx={size / 2} cy={size / 2} r={size / 2} fill="#475569" />
      )}
    </svg>
  );
};
"""
start_ad = content.find("const CustomAvatarDot")
end_ad = content.find("const CustomScatterTooltip")
if start_ad > -1 and end_ad > -1:
    content = content[:start_ad] + new_avatar + content[end_ad:]


# Replace Tailwind Classes
content = content.replace('className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8"', 'style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "2rem", marginBottom: "2rem" }}')
content = content.replace('className="grid grid-cols-1 gap-8 mb-8"', 'style={{ display: "grid", gridTemplateColumns: "1fr", gap: "2rem", marginBottom: "2rem" }}')
content = content.replace('className="text-3xl text-gradient mt-4 mb-10"', 'style={{ fontSize: "1.875rem", lineHeight: "2.25rem", marginTop: "1rem", marginBottom: "2.5rem" }} className="text-gradient"')
content = content.replace('className="animate-fade-in"', 'style={{ animation: "fadeIn 0.5s ease-out" }}')

# For the inner cards
content = content.replace('className="text-sm text-muted mb-4 leading-relaxed"', 'style={{ fontSize: "0.875rem", marginBottom: "1rem", lineHeight: "1.625" }} className="text-muted"')
content = content.replace('className="text-sm text-muted mb-4"', 'style={{ fontSize: "0.875rem", marginBottom: "1rem" }} className="text-muted"')

with open("src/pages/Trades.tsx", "w") as f:
    f.write(content)
