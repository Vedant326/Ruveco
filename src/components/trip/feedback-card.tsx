"use client";

import { MessageSquareText, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { Card, SectionTitle } from "@/components/ui/misc";
import { api, errorMessage } from "@/lib/api";
import { cx, fmtDateTime } from "@/lib/format";
import type { Trip, TripFeedback } from "@/lib/types";

const LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

/** Five stars. Read-only when `onChange` is left out. */
export function Stars({ value, onChange, size = "md" }: { value: number; onChange?: (rating: number) => void; size?: "sm" | "md" }) {
  const icon = size === "sm" ? "h-4 w-4" : "h-8 w-8";
  return (
    <div className="flex items-center gap-1" role={onChange ? "radiogroup" : "img"} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const star = <Star className={cx(icon, n <= value ? "fill-amber-400 text-amber-400" : "text-line")} />;
        return onChange ? (
          <button key={n} type="button" role="radio" aria-checked={n === value} aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => onChange(n)} className="cursor-pointer rounded-lg p-0.5 transition-transform active:scale-90">
            {star}
          </button>
        ) : (
          <span key={n}>{star}</span>
        );
      })}
    </div>
  );
}

function FeedbackView({ feedback }: { feedback: TripFeedback }) {
  return (
    <div className="rounded-2xl border border-line p-3">
      <div className="flex items-center justify-between gap-2">
        <Stars value={feedback.rating} size="sm" />
        <span className="text-xs text-muted">{fmtDateTime(feedback.at)}</span>
      </div>
      {feedback.comment && <p className="mt-2 whitespace-pre-line text-sm text-ink">{feedback.comment}</p>}
      <p className="mt-1.5 text-xs font-medium text-muted">{feedback.byName}</p>
    </div>
  );
}

/** After a completed trip: this side's rating and comment, and what the other side said. */
export function FeedbackCard({ trip, side }: { trip: Trip; side: "owner" | "driver" }) {
  const mine = trip.feedback?.[side];
  const theirs = trip.feedback?.[side === "owner" ? "driver" : "owner"];
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!rating) return setError("Choose a rating");
    setBusy(true);
    setError(null);
    try {
      await api(`/api/trips/${trip.id}/feedback`, { body: { rating, comment: comment.trim() } });
      toast.success("Thanks for your feedback");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <SectionTitle>Feedback</SectionTitle>

      <p className="mb-2 text-sm font-semibold text-ink">Your feedback</p>
      {mine ? (
        <FeedbackView feedback={mine} />
      ) : (
        <div className="space-y-3 rounded-2xl bg-brand-50/60 p-4">
          <p className="text-sm text-muted">How was this trip {side === "owner" ? `with ${trip.driverName}` : `for ${trip.companyName || "the owner"}`}?</p>
          <div className="flex flex-wrap items-center gap-3">
            <Stars value={rating} onChange={(n) => (setRating(n), setError(null))} />
            {rating > 0 && <span className="text-sm font-semibold text-brand-700">{LABELS[rating]}</span>}
          </div>
          <Textarea value={comment} maxLength={500} rows={3} placeholder="Write a comment (optional)" onChange={(e) => setComment(e.target.value)} />
          {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
          <Button block loading={busy} onClick={submit}>
            Submit feedback
          </Button>
        </div>
      )}

      <p className="mb-2 mt-5 text-sm font-semibold text-ink">From the {side === "owner" ? "driver" : "owner"}</p>
      {theirs ? (
        <FeedbackView feedback={theirs} />
      ) : (
        <p className="flex items-center gap-2 text-sm text-muted">
          <MessageSquareText className="h-4 w-4" /> No feedback yet
        </p>
      )}
    </Card>
  );
}
