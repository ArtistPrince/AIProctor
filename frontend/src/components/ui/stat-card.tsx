import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: { value: number; positive: boolean };
  accent?: string; // tailwind bg class for icon bg
}

export function StatCard({ title, value, description, icon: Icon, trend, accent = 'bg-primary/10' }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl p-5 border border-border card-shadow hover:card-shadow-md transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
          {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
          {trend && (
            <p className={`mt-1.5 text-xs font-semibold ${trend.positive ? 'text-success' : 'text-destructive'}`}>
              {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}% from last month
            </p>
          )}
        </div>
        <div className={`h-10 w-10 rounded-lg ${accent} flex items-center justify-center flex-shrink-0`}>
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
    </div>
  );
}
