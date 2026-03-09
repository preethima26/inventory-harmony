
-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Suppliers table
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  category_id UUID REFERENCES public.categories(id),
  supplier_id UUID REFERENCES public.suppliers(id),
  quantity INTEGER NOT NULL DEFAULT 0,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  cost_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  reorder_level INTEGER NOT NULL DEFAULT 10,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Transactions table (purchases and sales)
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'sale')),
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'critical')),
  read BOOLEAN NOT NULL DEFAULT false,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- For now, allow all authenticated users full access (we'll add role-based later)
CREATE POLICY "Authenticated users can manage categories" ON public.categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage suppliers" ON public.suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage products" ON public.products FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage transactions" ON public.transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage notifications" ON public.notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Triggers for updated_at
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-create low stock notifications
CREATE OR REPLACE FUNCTION public.check_low_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quantity <= NEW.reorder_level THEN
    INSERT INTO public.notifications (title, message, type, product_id)
    VALUES (
      'Low Stock Alert',
      'Product "' || NEW.name || '" has only ' || NEW.quantity || ' units left (reorder level: ' || NEW.reorder_level || ')',
      CASE WHEN NEW.quantity = 0 THEN 'critical' ELSE 'warning' END,
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER check_product_stock AFTER UPDATE OF quantity ON public.products FOR EACH ROW EXECUTE FUNCTION public.check_low_stock();

-- Function to update product quantity on transaction
CREATE OR REPLACE FUNCTION public.update_product_quantity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'purchase' THEN
    UPDATE public.products SET quantity = quantity + NEW.quantity WHERE id = NEW.product_id;
  ELSIF NEW.type = 'sale' THEN
    UPDATE public.products SET quantity = quantity - NEW.quantity WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_quantity_on_transaction AFTER INSERT ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_product_quantity();

-- Indexes
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_supplier ON public.products(supplier_id);
CREATE INDEX idx_products_sku ON public.products(sku);
CREATE INDEX idx_transactions_product ON public.transactions(product_id);
CREATE INDEX idx_transactions_type ON public.transactions(type);
CREATE INDEX idx_transactions_created ON public.transactions(created_at);
CREATE INDEX idx_notifications_read ON public.notifications(read);
