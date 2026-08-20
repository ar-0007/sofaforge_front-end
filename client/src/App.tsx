import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { CartProvider } from "./contexts/CartContext";
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import ProductDetail from "./pages/ProductDetail";
import CustomStudio from "./pages/CustomStudio";
import Contact from "./pages/Contact";
import Account from "./pages/Account";
import AdminPanel from "./pages/AdminPanel";
import AdminCatalogTools from "./pages/AdminCatalogTools";
import AdminOperationsTools from "./pages/AdminOperationsTools";
import { Wishlist, SwatchRequest, RoomPlanner } from "./pages/ExperiencePages";
import { OurStory, Craftsmanship, Sustainability, Lookbook, ShippingReturns, CareGuide } from "./pages/StaticPages";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/shop" component={Shop} />
      <Route path="/product/:slug" component={ProductDetail} />
      <Route path="/custom-studio" component={CustomStudio} />
      <Route path="/contact" component={Contact} />
      <Route path="/account" component={Account} />
      <Route path="/admin" component={AdminPanel} />
      <Route path="/admin/catalog-tools" component={AdminCatalogTools} />
      <Route path="/admin/operations-tools" component={AdminOperationsTools} />
      <Route path="/wishlist" component={Wishlist} />
      <Route path="/swatches" component={SwatchRequest} />
      <Route path="/room-planner" component={RoomPlanner} />
      <Route path="/our-story" component={OurStory} />
      <Route path="/craftsmanship" component={Craftsmanship} />
      <Route path="/sustainability" component={Sustainability} />
      <Route path="/lookbook" component={Lookbook} />
      <Route path="/shipping" component={ShippingReturns} />
      <Route path="/care-guide" component={CareGuide} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <CartProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </CartProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
