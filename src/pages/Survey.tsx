import { useReducer, useEffect, useCallback, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ChatPanel from "../components/ChatPanel";
import RentRoll from "../stages/RentRoll";
import SubjectPropertyStage from "../stages/SubjectProperty";
import CompData from "../stages/CompData";
import MarketSummary from "../stages/MarketSummary";
import SurveyMeta from "../stages/SurveyMeta";
import { getProperties } from "./Home";
import type { Property, SurveyState, RentRollSummary, SubjectProperty, Comp } from "../lib/types";

const STAGES = ["Rent Roll", "Subject Property", "Comp Data", "Market Summary", "Survey Completion"] as const;

const SURVEY_STORAGE_PREFIX = "starboard_survey_";

// ── localStorage helpers (fallback when Blob API is unavailable) ────────────

function saveSurveyLocal(propertyId: string, state: SurveyState) {
  try {
    localStorage.setItem(SURVEY_STORAGE_PREFIX + propertyId, JSON.stringify(state));
  } catch {
    // localStorage full or unavailable
  }
}

function loadSurveyLocal(propertyId: string): SurveyState | null {
  try {
    const raw = localStorage.getItem(SURVEY_STORAGE_PREFIX + propertyId);
    if (raw) return JSON.parse(raw) as SurveyState;
  } catch {
    // corrupt data
  }
  return null;
}

export function hasSavedSurvey(propertyId: string): boolean {
  return localStorage.getItem(SURVEY_STORAGE_PREFIX + propertyId) !== null;
}

function clearSavedSurveyLocal(propertyId: string) {
  localStorage.removeItem(SURVEY_STORAGE_PREFIX + propertyId);
}

// ── Server persistence (Vercel Blob) — shared across all users ──────────────

async function saveSurveyRemote(propertyId: string, state: SurveyState): Promise<boolean> {
  try {
    const resp = await fetch("/api/surveys/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId, state }),
    });
    return resp.ok;
  } catch {
    return false;
  }
}

async function loadSurveyRemote(propertyId: string): Promise<SurveyState | null> {
  try {
    const resp = await fetch(`/api/surveys/load?propertyId=${encodeURIComponent(propertyId)}`);
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.state ?? null;
  } catch {
    return null;
  }
}

// ── Combined save/load: API primary, localStorage fallback ──────────────────

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function saveSurvey(propertyId: string, state: SurveyState) {
  // Always write to localStorage immediately (instant, offline-safe)
  saveSurveyLocal(propertyId, state);

  // Debounce remote save to avoid hammering API on every keystroke
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveSurveyRemote(propertyId, state);
  }, 2000);
}

async function loadSurvey(propertyId: string): Promise<SurveyState | null> {
  // Try remote first (shared across users), fall back to localStorage
  const remote = await loadSurveyRemote(propertyId);
  if (remote) {
    // Sync to localStorage so it's available offline
    saveSurveyLocal(propertyId, remote);
    return remote;
  }
  return loadSurveyLocal(propertyId);
}

function clearSavedSurvey(propertyId: string) {
  clearSavedSurveyLocal(propertyId);
  // Note: does not delete from remote — surveys are append-only on the server.
  // A cleared survey will be overwritten on next save.
}

type SurveyAction =
  | { type: "SET_STAGE"; stage: 0 | 1 | 2 | 3 | 4 }
  | { type: "NEXT_STAGE" }
  | { type: "PREV_STAGE" }
  | { type: "SET_RENT_ROLL"; rentRoll: RentRollSummary | null }
  | { type: "SET_RR_TAB"; tab: SurveyState["rrTab"] }
  | { type: "SET_COMPS"; comps: Comp[] }
  | { type: "SET_SUBJECT_PROPERTY"; subjectProperty: SubjectProperty }
  | { type: "SET_FIELD"; field: "preparedBy" | "surveyDate" | "comments"; value: string }
  | { type: "CLEAR_SURVEY"; propertyId: string }
  | { type: "LOAD_STATE"; state: SurveyState };

function surveyReducer(state: SurveyState, action: SurveyAction): SurveyState {
  switch (action.type) {
    case "SET_STAGE":
      return { ...state, stage: action.stage };
    case "NEXT_STAGE":
      return {
        ...state,
        stage: Math.min(state.stage + 1, 4) as SurveyState["stage"],
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
    case "SET_SUBJECT_PROPERTY":
      return { ...state, subjectProperty: action.subjectProperty };
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "CLEAR_SURVEY":
      return {
        propertyId: action.propertyId,
        stage: 0 as const,
        rentRoll: null,
        rrTab: "all" as const,
        comps: [],
        subjectProperty: null,
        preparedBy: "",
        surveyDate: new Date().toISOString().slice(0, 10),
        comments: "",
      };
    case "LOAD_STATE":
      return action.state;
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
        <SubjectPropertyStage
          subjectProperty={state.subjectProperty}
          propertyName={property?.name ?? "Subject Property"}
          rentRoll={state.rentRoll}
          onChange={(sp) => dispatch({ type: "SET_SUBJECT_PROPERTY", subjectProperty: sp })}
        />
      );
    case 2:
      return (
        <CompData
          comps={state.comps}
          onCompsChange={(comps) => dispatch({ type: "SET_COMPS", comps })}
          property={property ?? null}
          rentRoll={state.rentRoll}
        />
      );
    case 3:
      return (
        <MarketSummary
          property={property}
          subjectProperty={state.subjectProperty}
          comps={state.comps}
          rentRoll={state.rentRoll}
        />
      );
    case 4:
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
          property={property}
          subjectProperty={state.subjectProperty}
          rentRoll={state.rentRoll}
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
  const pid = propertyId || "";

  const [showResumed, setShowResumed] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const skipNextRemoteSave = useRef(false);

  const emptyState = (id: string): SurveyState => ({
    propertyId: id,
    stage: 0,
    rentRoll: null,
    rrTab: "all",
    comps: [],
    subjectProperty: null,
    preparedBy: "",
    surveyDate: new Date().toISOString().slice(0, 10),
    comments: "",
  });

  // Sync init from localStorage (instant, no flicker)
  const [state, dispatch] = useReducer(
    surveyReducer,
    pid,
    (id): SurveyState => {
      return loadSurveyLocal(id) ?? emptyState(id);
    }
  );

  // Async load from remote API on mount — overrides localStorage if newer data exists
  useEffect(() => {
    let cancelled = false;
    loadSurvey(pid).then((remote) => {
      if (cancelled || !remote) return;
      // Only apply if the remote data is for this property
      if (remote.propertyId === pid) {
        skipNextRemoteSave.current = true; // don't re-save what we just loaded
        dispatch({ type: "LOAD_STATE", state: remote });
        setShowResumed(true);
        setTimeout(() => setShowResumed(false), 3000);
      }
    });
    return () => { cancelled = true; };
  }, [pid]);

  // Auto-save on every state change
  useEffect(() => {
    if (!pid) return;
    if (skipNextRemoteSave.current) {
      // Still save to localStorage, but skip the debounced remote save
      saveSurveyLocal(pid, state);
      skipNextRemoteSave.current = false;
      return;
    }
    saveSurvey(pid, state);
  }, [pid, state]);

  const handleSaveProgress = useCallback(() => {
    if (pid) {
      saveSurvey(pid, state);
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);
    }
  }, [pid, state]);

  const handleClearSurvey = useCallback(() => {
    if (pid) {
      clearSavedSurvey(pid);
      dispatch({ type: "CLEAR_SURVEY", propertyId: pid });
    }
  }, [pid]);

  return (
    <div className="h-[calc(100vh-65px)] flex flex-col relative">
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
                      stage: i as 0 | 1 | 2 | 3 | 4,
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

          <button
            onClick={handleClearSurvey}
            className="text-xs text-slate-400 hover:text-red-500 transition-colors"
            title="Clear all survey data and start fresh"
          >
            Clear Survey
          </button>
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
          <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between">
            <button
              onClick={() => dispatch({ type: "PREV_STAGE" })}
              disabled={state.stage === 0}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Back
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveProgress}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Save Progress
              </button>
              {showSaved && (
                <span className="text-sm font-medium text-emerald-600 animate-pulse">
                  Saved!
                </span>
              )}
            </div>
            <button
              onClick={() => dispatch({ type: "NEXT_STAGE" })}
              disabled={state.stage === 4}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {state.stage === 3 ? "Review & Export" : "Next"}
            </button>
          </div>

          {/* Resume toast */}
          {showResumed && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50">
              <div className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-lg animate-pulse">
                Resumed from saved progress
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
