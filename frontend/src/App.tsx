import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { CampaignList } from "./pages/CampaignList";
import { CampaignEditor } from "./pages/CampaignEditor";
import { CreateCampaign } from "./pages/CreateCampaign";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Главная страница со списком компаний */}
        <Route path="/" element={<CampaignList />} />

        {/* Страница создания компании */}
        <Route path="/campaigns/new" element={<CreateCampaign />} />

        {/* Редактор конкретной компании */}
        <Route path="/campaigns/:id" element={<CampaignEditor />} />

        {/* Неизвестные адреса перенаправляем на главную */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
