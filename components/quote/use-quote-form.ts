"use client";

import { useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { buildRequest, serializeAnswers } from "@/lib/engine/build-request";
import { checkEligibility } from "@/lib/engine/eligibility";
import { deriveQuoteState } from "@/lib/engine/quote-state";
import { indexResolutions, initialAnswers, resolveFields } from "@/lib/engine/resolve";
import type { Answers, CarrierForm, CarrierMapping, Profile } from "@/lib/types";

const focusField = (key: string | undefined) => document.querySelector<HTMLElement>(`#field-${key} :is(input, select)`)?.focus();

type Input = { form: CarrierForm; mapping: CarrierMapping; profile: Profile; today: string };

// Holds what the customer did. What the screen shows comes from deriveQuoteState.
export function useQuoteForm({ form, mapping, profile, today }: Input) {
  const { resolutions, prefilled } = useMemo(() => {
    const list = resolveFields(form, mapping, profile);
    return { resolutions: indexResolutions(list), prefilled: initialAnswers(list) };
  }, [form, mapping, profile]);

  const [answers, setAnswers] = useState<Answers>(prefilled);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const [attempted, setAttempted] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [request, setRequest] = useState<Record<string, unknown> | null>(null);

  const pendingPointer = useRef<Promise<void> | null>(null);
  const trackPointer = () => {
    pendingPointer.current = new Promise((resolve) => {
      const controller = new AbortController();
      const end = () => {
        controller.abort();
        pendingPointer.current = null;
        resolve();
      };
      window.addEventListener("pointerup", end, { signal: controller.signal });
      window.addEventListener("pointercancel", end, { signal: controller.signal });
    });
  };

  const state = deriveQuoteState({ form, mapping, profile, resolutions, answers, today });
  // Derived on each render, so it stays right when the real date replaces the prerender date.
  const refused = !fixing && checkEligibility(form, mapping, prefilled, today).length > 0;
  const blockedFields = new Set(state.reasons.map((reason) => reason.field));
  const shownError = (key: string) => (touched[key] || attempted ? (state.errors[key] ?? null) : null);

  return {
    answers,
    resolutions,
    state,
    request,
    refused,
    preview: serializeAnswers(form, answers),
    invalidFields: attempted ? state.orderedFields.filter((field) => state.errors[field.key]) : [],
    shownError,
    isBlocked: (key: string) => blockedFields.has(key),
    isEditing: (key: string) => Boolean(editing[key]),
    setEditingField: (key: string, value: boolean) => setEditing((current) => ({ ...current, [key]: value })),
    setAnswer: (key: string, value: unknown) => setAnswers((current) => ({ ...current, [key]: value })),
    trackPointer,
    markTouched(key: string) {
      const mark = () => setTouched((current) => ({ ...current, [key]: true }));
      // A blur can come from pressing another control. Showing an error now would move that control before the press ends, and the click would be lost.
      if (pendingPointer.current) pendingPointer.current.then(() => setTimeout(mark));
      else mark();
    },
    backToForm: () => setRequest(null),

    startFixing() {
      // Keep these fields open after they become valid, so they don't collapse mid-edit.
      setEditing(Object.fromEntries(state.reasons.map((reason) => [reason.field, true])));
      // The refusal screen is about to disappear, so focus moves to the first field to correct.
      flushSync(() => setFixing(true));
      focusField(state.reasons[0]?.field);
    },

    submit(event: React.FormEvent) {
      event.preventDefault();
      if (state.reasons.length > 0) return;
      const firstInvalid = state.orderedFields.find((field) => state.errors[field.key]);
      if (firstInvalid) {
        // Render the errors first, so that a collapsed profile field is open when it receives focus.
        flushSync(() => setAttempted(true));
        focusField(firstInvalid.key);
        return;
      }
      setRequest(buildRequest(form, mapping, answers, profile));
    },
  };
}

export type QuoteFormController = ReturnType<typeof useQuoteForm>;
