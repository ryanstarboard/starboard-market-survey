import { useReducer } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ChatPanel from "../components/ChatPanel";
import type { SurveyState } from "../lib/types";

const STAGES = ["Rent Roll", "Comp Data", "Survey Completion"] as const;

type SurveyAction =
  | { type: "SET_STAGE"; stage: 0 | 1 | 2 }
  | { type: "NEXT_STAGE" }
  | { type: "PREV_STAGE" };

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
    default:
      return state;
  }
}

function StageContent({ stage }: { stage: number }) {
  switch (stage) {
    case 0:
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-50 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-1">
              Upload Rent Roll
            </h3>
            <p className="text-sm text-slate-500 max-w-sm">
              Upload your AppFolio rent roll export (.xlsx) to begin the survey.
              The file will be parsed locally to extract unit data.
            </p>
            <button className="mt-6 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              Choose File
            </button>
          </div>
        </div>
      );
    case 1:
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-50 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-1">
              Comparable Properties
            </h3>
            <p className="text-sm text-slate-500 max-w-sm">
              Upload a rent roll first, then AI will suggest comparable
              properties for your survey.
            </p>
          </div>
        </div>
      );
    case 2:
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-50 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-1">
              Complete Survey
            </h3>
            <p className="text-sm text-slate-500 max-w-sm">
              Review your data, mark comps as called/toured, and export the
              finished survey.
            </p>
          </div>
        </div>
      );
    default:
      return null;
  }
}

export default function Survey() {
  const { propertyId } = useParams<{ propertyId: string }>();
  const navigate = useNavigate();

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

          <div className="w-20" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* Main content area: chat panel + stage content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat panel — left sidebar */}
        <div className="w-[350px] flex-shrink-0">
          <ChatPanel stage={state.stage} />
        </div>

        {/* Stage content — right side */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          <div className="flex-1 flex flex-col p-6">
            <StageContent stage={state.stage} />
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
