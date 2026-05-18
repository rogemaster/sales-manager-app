export const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <p className="text-xs text-muted-foreground">{label}</p>
    {children}
  </div>
);
