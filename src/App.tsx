import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Survey from "./pages/Survey";

declare const __BUILD_TIME__: string;

const APP_VERSION = "1.2.0";
const APP_UPDATED = new Date(__BUILD_TIME__).toLocaleString("en-US", {
  month: "short", day: "numeric", year: "numeric",
  hour: "numeric", minute: "2-digit",
});

function App() {
  return (
    <div className="min-h-screen bg-slate-50 relative">
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <h1 className="text-xl font-semibold text-slate-800">
            Starboard Market Survey
          </h1>
        </div>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/survey/:propertyId" element={<Survey />} />
        </Routes>
      </main>
      <div className="fixed bottom-2 right-3 text-xs text-slate-400 select-none pointer-events-none">
        v{APP_VERSION} &middot; {APP_UPDATED}
      </div>
    </div>
  );
}

export default App;
