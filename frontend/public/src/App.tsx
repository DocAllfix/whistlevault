import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Landing } from "./pages/Landing";
import { Submit } from "./pages/Submit";
import { Receipt } from "./pages/Receipt";
import { Check } from "./pages/Check";

export function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/segnala" element={<Submit />} />
          <Route path="/ricevuta" element={<Receipt />} />
          <Route path="/controlla" element={<Check />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
