import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Survey from "./pages/Survey";

function App() {
  return (
    <div className="min-h-screen bg-slate-50">
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
    </div>
  );
}

export default App;
