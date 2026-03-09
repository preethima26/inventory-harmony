import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Package, TrendingDown, Users, ArrowLeftRight, AlertTriangle } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["hsl(220,70%,50%)", "hsl(160,60%,45%)", "hsl(38,92%,50%)", "hsl(280,60%,55%)", "hsl(0,72%,51%)"];

export default function Dashboard() {
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*, categories(name), suppliers(name)");
      if (error) throw error;
      return data;
    },
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["recent-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("transactions").select("*, products(name)").order("created_at", { ascending: false }).limit(5);
      if (error) throw error;
      return data;
    },
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers-count"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("id");
      if (error) throw error;
      return data;
    },
  });

  const totalProducts = products.length;
  const totalStock = products.reduce((sum, p) => sum + (p.quantity || 0), 0);
  const lowStockItems = products.filter((p) => p.quantity <= p.reorder_level);
  const totalValue = products.reduce((sum, p) => sum + p.price * p.quantity, 0);

  // Category distribution for pie chart
  const categoryMap = new Map<string, number>();
  products.forEach((p) => {
    const cat = (p.categories as any)?.name || "Uncategorized";
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + p.quantity);
  });
  const categoryData = Array.from(categoryMap, ([name, value]) => ({ name, value }));

  // Stock levels for bar chart (top 8 products)
  const stockData = [...products]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 8)
    .map((p) => ({ name: p.name.length > 12 ? p.name.slice(0, 12) + "…" : p.name, stock: p.quantity, reorder: p.reorder_level }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Overview of your inventory performance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Products" value={totalProducts} icon={Package} />
        <StatCard title="Total Stock" value={totalStock.toLocaleString()} icon={TrendingDown} colorClass="text-success" />
        <StatCard title="Low Stock Alerts" value={lowStockItems.length} icon={AlertTriangle} colorClass="text-warning" />
        <StatCard title="Suppliers" value={suppliers.length} icon={Users} colorClass="text-chart-4" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <CardHeader>
            <CardTitle className="text-base font-display">Stock Levels</CardTitle>
          </CardHeader>
          <CardContent>
            {stockData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stockData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                  <Bar dataKey="stock" fill="hsl(220,70%,50%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="reorder" fill="hsl(38,92%,50%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground">No products yet</div>
            )}
          </CardContent>
        </Card>

        <Card className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <CardHeader>
            <CardTitle className="text-base font-display">Category Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground">No data yet</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <CardHeader>
            <CardTitle className="text-base font-display">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length > 0 ? transactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{(t.products as any)?.name || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={t.type === "purchase" ? "default" : "secondary"}>
                        {t.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{t.quantity}</TableCell>
                    <TableCell className="text-right">${Number(t.total).toFixed(2)}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">No transactions yet</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="animate-fade-in" style={{ animationDelay: "0.4s" }}>
          <CardHeader>
            <CardTitle className="text-base font-display flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" /> Low Stock Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Reorder Level</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockItems.length > 0 ? lowStockItems.slice(0, 5).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="destructive">{p.quantity}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{p.reorder_level}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">All items well-stocked</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card className="animate-fade-in" style={{ animationDelay: "0.5s" }}>
        <CardHeader>
          <CardTitle className="text-base font-display">Inventory Value Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-display font-bold text-primary">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <p className="text-sm text-muted-foreground mt-1">Total inventory value across {totalProducts} products</p>
        </CardContent>
      </Card>
    </div>
  );
}
