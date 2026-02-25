import { useLocation } from 'react-router-dom';
import { Construction } from 'lucide-react';

export default function PlaceholderPage() {
  const { pathname } = useLocation();
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
      <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <Construction className="h-8 w-8 text-primary" />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">Under Construction</h2>
      <p className="text-sm text-muted-foreground">
        <code className="px-2 py-0.5 rounded bg-secondary font-mono text-xs">{pathname}</code> is coming soon
      </p>
    </div>
  );
}
