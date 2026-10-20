import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { analytics } from "./analytics";
import "./styles.css";

function App() {
  const [events, setEvents] = useState<string[]>([]);

  useEffect(() => {
    void analytics.init();
    return analytics.subscribeDiagnostics((event) => {
      setEvents((current) => [event.type, ...current].slice(0, 8));
    });
  }, []);

  const trackProduct = async () => {
    await analytics.track("product_viewed", { productId: "sku_123", price: 129 });
  };

  return (
    <main>
      <p className="eyebrow">TRACELET × REACT</p>
      <h1>Typed browser analytics without backend lock-in.</h1>
      <p>Queue an event, then flush it through the console transport. Open DevTools to inspect the encoded batch.</p>
      <div className="actions">
        <button onClick={() => void trackProduct()}>Queue product_viewed</button>
        <button className="secondary" onClick={() => void analytics.flush()}>Flush queue</button>
      </div>
      <section><strong>SDK diagnostics</strong>{events.length === 0 ? <span>Waiting for an event…</span> : events.map((event, index) => <span key={`${event}-${index}`}>{event}</span>)}</section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
