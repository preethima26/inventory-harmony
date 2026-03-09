import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { format, subDays, startOfDay } from "date-fns";

export default function Reports() {
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*, categories(name)");
      if (error) throw error;
      return data;
    },
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("transactions").select("*, products(name)").order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Sales over last 7 days
  const salesByDay: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const day = format(subDays(new Date(), i), "MMM d");
    salesByDay[day] = 0;
  }
  transactions.filter((t) => t.type === "sale" && new Date(t.created_at) >= startOfDay(subDays(new Date(), 6))).forEach((t) => {
    const day = format(new Date(t.created_at), "MMM d");
    if (salesByDay[day] !== undefined) salesByDay[day] += Number(t.total);
  });
  const salesData = Object.entries(salesByDay).map(([name, total]) => ({ name, total }));

  // Top selling products
  const productSales = new Map<string, { name: string; qty: number; revenue: number }>();
  transactions.filter((t) => t.type === "sale").forEach((t) => {
    const name = (t.products as any)?.name || "Unknown";
    const existing = productSales.get(t.product_id) || { name, qty: 0, revenue: 0 };
    existing.qty += t.quantity;
    existing.revenue += Number(t.total);
    productSales.set(t.product_id, existing);
  });
  const topProducts = Array.from(productSales.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  // Low stock report
  const lowStock = products.filter((p) => p.quantity <= p.reorder_level).sort((a, b) => a.quantity - b.quantity);

  // Inventory value by category
  const catValue = new Map<string, number>();
  products.forEach((p) => {
    const cat = (p.categories as any)?.name || "Uncategorized";
    catValue.set(cat, (catValue.get(cat) || 0) + p.price * p.quantity);
  });
  const catData = Array.from(catValue, ([name, value]) => ({ name, value: Math.round(value * 100) / 100 })).sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Reports</h1>
        <p className="text-muted-foreground text-sm">Analytics and inventory insights</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="text-base font-display">Sales (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Line type="monotone" dataKey="total" stroke="hsl(220,70%,50%)" strokeWidth={2} dot={{ fill: "hsl(220,70%,50%)" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <CardHeader>
            <CardTitle className="text-base font-display">Inventory Value by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={catData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Bar dataKey="value" fill="hsl(160,60%,45%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <CardHeader>
            <CardTitle className="text-base font-display">Top Selling Products</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Units Sold</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topProducts.length > 0 ? topProducts.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-right">{p.qty}</TableCell>
                    <TableCell className="text-right">${p.revenue.toFixed(2)}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No sales data</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <CardHeader>
            <CardTitle className="text-base font-display">Low Stock Report</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Current</TableHead>
                  <TableHead className="text-right">Reorder Level</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStock.length > 0 ? lowStock.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-right">{p.quantity}</TableCell>
                    <TableCell className="text-right">{p.reorder_level}</TableCell>
                    <TableCell>
                      <Badge variant={p.quantity === 0 ? "destructive" : "default"} className={p.quantity > 0 ? "bg-warning text-warning-foreground" : ""}>
                        {p.quantity === 0 ? "Out" : "Low"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">All items well-stocked</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
