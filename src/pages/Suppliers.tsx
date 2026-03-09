import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Mail, Phone, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Suppliers() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const upsert = useMutation({
    mutationFn: async (formData: FormData) => {
      const supplier = {
        name: formData.get("name") as string,
        email: formData.get("email") as string || null,
        phone: formData.get("phone") as string || null,
        address: formData.get("address") as string || null,
        notes: formData.get("notes") as string || null,
      };
      if (editing) {
        const { error } = await supabase.from("suppliers").update(supplier).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("suppliers").insert(supplier);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setDialogOpen(false);
      setEditing(null);
      toast({ title: editing ? "Supplier updated" : "Supplier added" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("suppliers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast({ title: "Supplier deleted" });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Suppliers</h1>
          <p className="text-muted-foreground text-sm">{suppliers.length} suppliers registered</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Supplier</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">{editing ? "Edit Supplier" : "Add Supplier"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); upsert.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
              <div className="space-y-2"><Label>Name</Label><Input name="name" required defaultValue={editing?.name} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Email</Label><Input name="email" type="email" defaultValue={editing?.email || ""} /></div>
                <div className="space-y-2"><Label>Phone</Label><Input name="phone" defaultValue={editing?.phone || ""} /></div>
              </div>
              <div className="space-y-2"><Label>Address</Label><Input name="address" defaultValue={editing?.address || ""} /></div>
              <div className="space-y-2"><Label>Notes</Label><Input name="notes" defaultValue={editing?.notes || ""} /></div>
              <Button type="submit" className="w-full" disabled={upsert.isPending}>{editing ? "Update" : "Add Supplier"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {suppliers.map((s) => (
          <Card key={s.id} className="animate-fade-in">
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-display font-semibold text-lg">{s.name}</h3>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(s); setDialogOpen(true); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove.mutate(s.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                {s.email && <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" />{s.email}</div>}
                {s.phone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{s.phone}</div>}
                {s.address && <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" />{s.address}</div>}
              </div>
            </CardContent>
          </Card>
        ))}
        {suppliers.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">No suppliers yet. Add your first supplier to get started.</div>
        )}
      </div>
    </div>
  );
}
