import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  colorClass?: string;
}

export function StatCard({ title, value, icon: Icon, trend, trendUp, colorClass = "text-primary" }: StatCardProps) {
  return (
    <Card className="p-5 stat-card-gradient animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-display font-bold">{value}</p>
          {trend && (
            <p className={`text-xs font-medium ${trendUp ? "text-success" : "text-destructive"}`}>
              {trend}
            </p>
          )}
        </div>
        <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center ${colorClass}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </Card>
  );
}
