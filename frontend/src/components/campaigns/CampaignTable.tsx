import type { Campaign } from "../../types/campaign";
import { Link } from "react-router-dom";

import "./CampaignTable.css";

interface CampaignTableProps {
  campaigns: Campaign[];
}

export function CampaignTable({ campaigns }: CampaignTableProps) {
  return (
    <div className="campaign-table-wrapper">
      <table className="campaign-table">
        <thead>
          <tr>
            <th>Название</th>
            <th>ID</th>
            <th>Статус</th>
            <th>Домен</th>
            <th>Группа</th>
            <th>Traffic source</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          {campaigns.map((campaign) => {
            const isActive = campaign.state === "active";

            return (
              <tr key={campaign.id}>
                <td className="campaign-table__name">{campaign.name}</td>

                <td>{campaign.id}</td>

                <td>
                  <span
                    className={`campaign-status ${
                      isActive
                        ? "campaign-status--active"
                        : "campaign-status--disabled"
                    }`}
                  >
                    {isActive ? "Активна" : "Отключена"}
                  </span>
                </td>

                <td>{campaign.domain ?? "Не указан"}</td>

                <td>{campaign.group_id}</td>

                <td>{campaign.traffic_source_id}</td>

                <td>
                  <Link
                    to={`/campaigns/${campaign.id}`}
                    className="campaign-table__action"
                  >
                    Открыть →
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
