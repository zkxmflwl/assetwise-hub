import { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  subText?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export default function StatCard({ title, value, change, changeLabel, subText, icon, className = '' }: StatCardProps) {
  return (
    <div className={`glass-card rounded-xl p-5 animate-fade-in ${className}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {subText && <div>{subText}</div>}
          {change !== undefined && (
            <div className="flex items-center gap-1.5">
              {change > 0 ? (
                <TrendingUp className="h-3.5 w-3.5 text-success" />
              ) : change < 0 ? (
                <TrendingDown className="h-3.5 w-3.5 text-destructive" />
              ) : (
                <Minus className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span
                className={`text-xs font-medium ${
                  change > 0 ? 'text-success' : change < 0 ? 'text-destructive' : 'text-muted-foreground'
                }`}
              >
                {change > 0 ? '+' : ''}{change} {changeLabel || ''}
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
