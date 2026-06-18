import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Landing } from "./pages/Landing";
import { Submit } from "./pages/Submit";
import { Receipt } from "./pages/Receipt";
import { Check } from "./pages/Check";
import { Privacy } from "./pages/Privacy";
import { Legale } from "./pages/Legale";

export function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/segnala" element={<Submit />} />
          <Route path="/ricevuta" element={<Receipt />} />
          <Route path="/controlla" element={<Check />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/note-legali" element={<Legale />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
