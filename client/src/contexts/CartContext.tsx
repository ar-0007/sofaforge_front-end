import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  variantDetails?: string;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, qty: number) => void;
  clearCart: () => void;
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  totalItems: number;
  subtotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function existingCartItemMessage(item: CartItem) {
  return item.quantity > 1 ? "Updated your bag" : "Added to cart";
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem("sofa_co_cart");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isOpen, setOpen] = useState(false);
  const [sessionKey] = useState(() => {
    try {
      const existing = localStorage.getItem("sofa_co_cart_session");
      if (existing) return existing;
      const created = `cart_${crypto.randomUUID()}`;
      localStorage.setItem("sofa_co_cart_session", created);
      return created;
    } catch {
      return `cart_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    }
  });
  const { mutate: trackCart } = trpc.commerce.trackCart.useMutation();

  useEffect(() => {
    try {
      localStorage.setItem("sofa_co_cart", JSON.stringify(cart));
    } catch {}
  }, [cart]);

  useEffect(() => {
    if (cart.length === 0) return;
    trackCart({
      sessionKey,
      itemsJson: JSON.stringify(cart),
      subtotal: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
      reminderConsent: "false",
    });
  }, [cart, sessionKey, trackCart]);

  const addToCart = useCallback((item: CartItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) return prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i));
      return [...prev, item];
    });
    setOpen(true);
    toast.success(existingCartItemMessage(item), { description: item.name });
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
    toast.info("Item removed from cart", { description: "You can add it back anytime." });
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    setCart((prev) => prev.map((i) => (i.id === id ? { ...i, quantity } : i)));
  }, [removeFromCart]);

  const clearCart = useCallback(() => setCart([]), []);

  const { totalItems, subtotal } = useMemo(() => ({
    totalItems: cart.reduce((acc, i) => acc + i.quantity, 0),
    subtotal: cart.reduce((acc, i) => acc + i.price * i.quantity, 0),
  }), [cart]);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, isOpen, setOpen, totalItems, subtotal }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
