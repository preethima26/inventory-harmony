import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function Transactions() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");
  const [txType, setTxType] = useState("purchase");
  const [selectedProduct, setSelectedProduct] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("transactions").select("*, products(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*");
      if (error) throw error;
      return data;
    },
  });

  const addTransaction = useMutation({
    mutationFn: async (formData: FormData) => {
      const qty = Number(formData.get("quantity"));
      const unitPrice = Number(formData.get("unit_price"));
      const tx = {
        product_id: formData.get("product_id") as string,
        type: txType,
        quantity: qty,
        unit_price: unitPrice,
        total: qty * unitPrice,
        notes: formData.get("notes") as string || null,
      };
      const { error } = await supabase.from("transactions").insert(tx);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setDialogOpen(false);
      toast({ title: "Transaction recorded" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filtered = typeFilter === "all" ? transactions : transactions.filter((t) => t.type === typeFilter);

  const selectedProductData = products.find((p) => p.id === selectedProduct);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Transactions</h1>
          <p className="text-muted-foreground text-sm">Purchase and sales history</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Record Transaction</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">New Transaction</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); addTransaction.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
              <div className="flex gap-2">
                <Button type="button" variant={txType === "purchase" ? "default" : "outline"} className="flex-1" onClick={() => setTxType("purchase")}>
                  <ArrowDownLeft className="mr-2 h-4 w-4" /> Purchase
                </Button>
                <Button type="button" variant={txType === "sale" ? "default" : "outline"} className="flex-1" onClick={() => setTxType("sale")}>
                  <ArrowUpRight className="mr-2 h-4 w-4" /> Sale
                </Button>
              </div>
              <div className="space-y-2">
                <Label>Product</Label>
                <select name="product_id" required value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Select product</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name} (Stock: {p.quantity})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input id="quantity" name="quantity" type="number" min="1" required max={txType === "sale" && selectedProductData ? selectedProductData.quantity : undefined} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit_price">Unit Price</Label>
                  <Input id="unit_price" name="unit_price" type="number" step="0.01" min="0" required defaultValue={selectedProductData ? (txType === "sale" ? selectedProductData.price : selectedProductData.cost_price) : ""} />
                </div>
              </div>
              <div className="space-y-2"><Label>Notes</Label><Input name="notes" /></div>
              <Button type="submit" className="w-full" disabled={addTransaction.isPending}>Record Transaction</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Transactions</SelectItem>
              <SelectItem value="purchase">Purchases</SelectItem>
              <SelectItem value="sale">Sales</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="text-sm">{format(new Date(t.created_at), "MMM d, yyyy")}</TableCell>
                  <TableCell className="font-medium">{(t.products as any)?.name || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={t.type === "purchase" ? "default" : "secondary"} className="gap-1">
                      {t.type === "purchase" ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                      {t.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{t.quantity}</TableCell>
                  <TableCell className="text-right">${Number(t.unit_price).toFixed(2)}</TableCell>
                  <TableCell className="text-right font-medium">${Number(t.total).toFixed(2)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{t.notes || "—"}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No transactions yet</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
