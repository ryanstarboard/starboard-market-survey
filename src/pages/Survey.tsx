import { useReducer } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ChatPanel from "../components/ChatPanel";
import RentRoll from "../stages/RentRoll";
import CompData from "../stages/CompData";
import SurveyMeta from "../stages/SurveyMeta";
import { getProperties } from "./Home";
import type { Property, SurveyState, RentRollSummary, Comp } from "../lib/types";

const STAGES = ["Rent Roll", "Comp Data", "Survey Completion"] as const;

type SurveyAction =
  | { type: "SET_STAGE"; stage: 0 | 1 | 2 }
  | { type: "NEXT_STAGE" }
  | { type: "PREV_STAGE" }
  | { type: "SET_RENT_ROLL"; rentRoll: RentRollSummary | null }
  | { type: "SET_RR_TAB"; tab: SurveyState["rrTab"] }
  | { type: "SET_COMPS"; comps: Comp[] }
  | { type: "SET_FIELD"; field: "preparedBy" | "surveyDate" | "comments"; value: string };

function surveyReducer(state: SurveyState, action: SurveyAction): SurveyState {
  switch (action.type) {
    case "SET_STAGE":
      return { ...state, stage: action.stage };
    case "NEXT_STAGE":
      return {
        ...state,
        stage: Math.min(state.stage + 1, 2) as SurveyState["stage"],
      };
    case "PREV_STAGE":
      return {
        ...state,
        stage: Math.max(state.stage - 1, 0) as SurveyState["stage"],
      };
    case "SET_RENT_ROLL":
      return { ...state, rentRoll: action.rentRoll };
    case "SET_RR_TAB":
      return { ...state, rrTab: action.tab };
    case "SET_COMPS":
      return { ...state, comps: action.comps };
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    default:
      return state;
  }
}

function StageContent({
  state,
  dispatch,
  property,
}: {
  state: SurveyState;
  dispatch: React.Dispatch<SurveyAction>;
  property: Property | null;
}) {
  switch (state.stage) {
    case 0:
      return (
        <RentRoll
          rentRoll={state.rentRoll}
          rrTab={state.rrTab}
          onRentRollParsed={(summary) =>
            dispatch({ type: "SET_RENT_ROLL", rentRoll: summary })
          }
          onTabChange={(tab) => dispatch({ type: "SET_RR_TAB", tab })}
        />
      );
    case 1:
      return (
        <CompData
          comps={state.comps}
          onCompsChange={(comps) => dispatch({ type: "SET_COMPS", comps })}
          property={property ?? null}
          rentRoll={state.rentRoll}
        />
      );
    case 2:
      return (
        <SurveyMeta
          comps={state.comps}
          onCompsChange={(comps) => dispatch({ type: "SET_COMPS", comps })}
          preparedBy={state.preparedBy}
          surveyDate={state.surveyDate}
          comments={state.comments}
          onFieldChange={(field, value) =>
            dispatch({ type: "SET_FIELD", field, value })
          }
        />
      );
    default:
      return null;
  }
}

export default function Survey() {
  const { propertyId } = useParams<{ propertyId: string }>();
  const navigate = useNavigate();

  const property = getProperties().find((p) => p.id === propertyId) ?? null;

  const [state, dispatch] = useReducer(surveyReducer, {
    propertyId: propertyId || "",
    stage: 0,
    rentRoll: null,
    rrTab: "all",
    comps: [],
    preparedBy: "",
    surveyDate: new Date().toISOString().slice(0, 10),
    comments: "",
  } satisfies SurveyState);

  return (
    <div className="h-[calc(100vh-65px)] flex flex-col">
      {/* Progress bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Properties
          </button>

          <div className="flex items-center gap-2">
            {STAGES.map((label, i) => (
              <div key={label} className="flex items-center">
                {i > 0 && (
                  <div
                    className={`w-8 h-0.5 mx-1 ${
                      i <= state.stage ? "bg-blue-500" : "bg-slate-200"
                    }`}
                  />
                )}
                <button
                  onClick={() =>
                    dispatch({
                      type: "SET_STAGE",
                      stage: i as 0 | 1 | 2,
                    })
                  }
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    i === state.stage
                      ? "bg-blue-600 text-white"
                      : i < state.stage
                        ? "bg-blue-100 text-blue-700"
                        : "bg-slate-100 text-slate-400"
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                      i === state.stage
                        ? "bg-white text-blue-600"
                        : i < state.stage
                          ? "bg-blue-200 text-blue-700"
                          : "bg-slate-200 text-slate-400"
                    }`}
                  >
                    {i < state.stage ? (
                      <svg
                        className="w-3 h-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </span>
                  {label}
                </button>
              </div>
            ))}
          </div>

          <div className="w-20" />
        </div>
      </div>

      {/* Main content area: chat panel + stage content */}
      <div className="flex-1 flex overflow-hidden">
        <div className="w-[350px] flex-shrink-0">
          <ChatPanel
            stage={state.stage}
            property={property}
            rentRoll={state.rentRoll}
            comps={state.comps}
          />
        </div>

        <div className="flex-1 flex flex-col overflow-y-auto">
          <div className="flex-1 flex flex-col p-6">
            <StageContent state={state} dispatch={dispatch} property={property} />
          </div>

          {/* Navigation buttons */}
          <div className="px-6 py-4 border-t border-slate-200 bg-white flex justify-between">
            <button
              onClick={() => dispatch({ type: "PREV_STAGE" })}
              disabled={state.stage === 0}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => dispatch({ type: "NEXT_STAGE" })}
              disabled={state.stage === 2}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {state.stage === 1 ? "Review & Export" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
