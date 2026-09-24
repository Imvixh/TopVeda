/**
 * TopVeda Phase 6 Loop 3: Live Poll Service
 * Realtime poll creation, single-vote enforcement, aggregate tallying, and closure.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { LivePoll, LivePollOption, CreateLivePollDTO } from "@/types/live-interaction.types";

export class LivePollService {
  /**
   * Creates a new live poll and automatically archives any prior active poll in this class.
   */
  public static async createPoll(
    supabase: SupabaseClient,
    params: {
      liveClassId: string;
      teacherId: string;
      question: string;
      options: string[];
    }
  ): Promise<{ success: boolean; poll?: LivePoll; error?: string }> {
    const { liveClassId, teacherId, question, options } = params;

    if (!question?.trim()) {
      return { success: false, error: "Poll question is required." };
    }

    const filteredOptions = (options || []).map((o) => o.trim()).filter(Boolean);
    if (filteredOptions.length < 2) {
      return { success: false, error: "A poll requires at least 2 distinct answer options." };
    }

    try {
      const nowIso = new Date().toISOString();

      // 1. Close any currently active polls for this live class
      await supabase
        .from("live_class_polls")
        .update({ status: "CLOSED", closed_at: nowIso, updated_at: nowIso })
        .eq("live_class_id", liveClassId)
        .eq("status", "ACTIVE");

      // 2. Format options array with unique IDs
      const optionsArray: LivePollOption[] = filteredOptions.map((text, idx) => ({
        id: String(idx + 1),
        text,
        voteCount: 0,
        votePercentage: 0,
      }));

      // 3. Insert new poll
      const { data: newPoll, error: insertErr } = await supabase
        .from("live_class_polls")
        .insert({
          live_class_id: liveClassId,
          created_by: teacherId,
          question: question.trim(),
          options: optionsArray,
          status: "ACTIVE",
          created_at: nowIso,
          updated_at: nowIso,
        })
        .select("*")
        .single();

      if (insertErr || !newPoll) {
        return { success: false, error: insertErr?.message || "Failed to create poll." };
      }

      const mappedPoll: LivePoll = {
        id: newPoll.id,
        liveClassId: newPoll.live_class_id,
        createdBy: newPoll.created_by,
        question: newPoll.question,
        options: optionsArray,
        status: newPoll.status,
        totalVotes: 0,
        userVotedOptionId: null,
        createdAt: newPoll.created_at,
        closedAt: newPoll.closed_at,
      };

      return { success: true, poll: mappedPoll };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { success: false, error: error.message };
    }
  }

  /**
   * Fetches the active (or latest) poll for a live class along with aggregate results and student vote status.
   */
  public static async getActivePoll(
    supabase: SupabaseClient,
    params: {
      liveClassId: string;
      studentId?: string | null;
    }
  ): Promise<{ poll: LivePoll | null; error?: string }> {
    const { liveClassId, studentId } = params;

    try {
      // 1. Fetch active poll (or latest closed poll if none active)
      let { data: poll } = await supabase
        .from("live_class_polls")
        .select("*")
        .eq("live_class_id", liveClassId)
        .eq("status", "ACTIVE")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!poll) {
        const { data: latestClosed } = await supabase
          .from("live_class_polls")
          .select("*")
          .eq("live_class_id", liveClassId)
          .in("status", ["ACTIVE", "CLOSED"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        poll = latestClosed;
      }

      if (!poll) {
        return { poll: null };
      }

      // 2. Fetch all votes for this poll to compute aggregate tallies
      const { data: votes } = await supabase
        .from("live_class_poll_votes")
        .select("option_id, student_id")
        .eq("poll_id", poll.id);

      const voteList = votes || [];
      const totalVotes = voteList.length;

      // Group vote counts by option ID
      const countMap = new Map<string, number>();
      let userVotedOptionId: string | null = null;

      voteList.forEach((v) => {
        countMap.set(v.option_id, (countMap.get(v.option_id) || 0) + 1);
        if (studentId && v.student_id === studentId) {
          userVotedOptionId = v.option_id;
        }
      });

      const rawOptions: { id: string; text: string }[] = Array.isArray(poll.options) ? poll.options : [];
      const computedOptions: LivePollOption[] = rawOptions.map((opt) => {
        const count = countMap.get(opt.id) || 0;
        const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
        return {
          id: opt.id,
          text: opt.text,
          voteCount: count,
          votePercentage: percentage,
        };
      });

      const mappedPoll: LivePoll = {
        id: poll.id,
        liveClassId: poll.live_class_id,
        createdBy: poll.created_by,
        question: poll.question,
        options: computedOptions,
        status: poll.status,
        totalVotes,
        userVotedOptionId,
        createdAt: poll.created_at,
        closedAt: poll.closed_at,
      };

      return { poll: mappedPoll };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { poll: null, error: error.message };
    }
  }

  /**
   * Casts a vote in an active poll with strict single-vote validation.
   */
  public static async vote(
    supabase: SupabaseClient,
    params: {
      pollId: string;
      liveClassId: string;
      studentId: string;
      optionId: string;
    }
  ): Promise<{ success: boolean; poll?: LivePoll; error?: string }> {
    const { pollId, liveClassId, studentId, optionId } = params;

    try {
      // 1. Verify poll is ACTIVE
      const { data: poll, error: pollErr } = await supabase
        .from("live_class_polls")
        .select("id, status, options")
        .eq("id", pollId)
        .eq("live_class_id", liveClassId)
        .single();

      if (pollErr || !poll) {
        return { success: false, error: "Poll not found." };
      }

      if (poll.status !== "ACTIVE") {
        return { success: false, error: "This poll is now closed. Votes are no longer accepted." };
      }

      // 2. Validate optionId exists in poll options
      const rawOptions: { id: string; text: string }[] = Array.isArray(poll.options) ? poll.options : [];
      const optionExists = rawOptions.some((o) => o.id === optionId);
      if (!optionExists) {
        return { success: false, error: "Invalid poll option selected." };
      }

      // 3. Check for existing vote
      const { data: existingVote } = await supabase
        .from("live_class_poll_votes")
        .select("id")
        .eq("poll_id", pollId)
        .eq("student_id", studentId)
        .maybeSingle();

      if (existingVote) {
        return { success: false, error: "You have already voted in this poll." };
      }

      // 4. Insert vote
      const nowIso = new Date().toISOString();
      const { error: insertErr } = await supabase
        .from("live_class_poll_votes")
        .insert({
          poll_id: pollId,
          live_class_id: liveClassId,
          student_id: studentId,
          option_id: optionId,
          created_at: nowIso,
        });

      if (insertErr) {
        if (insertErr.code === "23505") {
          return { success: false, error: "You have already voted in this poll." };
        }
        return { success: false, error: insertErr.message };
      }

      // 5. Append to student learning activity
      try {
        await supabase.from("student_learning_activity").insert({
          student_id: studentId,
          activity_type: "LIVE_POLL",
          entity_type: "LIVE_CLASS",
          entity_id: liveClassId,
          duration_seconds: 15,
          activity_date: nowIso.split("T")[0],
          metadata: { pollId, optionId, liveClassId },
        });
      } catch (logErr) {
        console.warn("[LivePollService] Non-blocking activity log warning:", logErr);
      }

      // 6. Return fresh aggregate poll data
      const res = await this.getActivePoll(supabase, { liveClassId, studentId });
      return { success: true, poll: res.poll || undefined };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { success: false, error: error.message };
    }
  }

  /**
   * Closes an active poll.
   */
  public static async closePoll(
    supabase: SupabaseClient,
    params: {
      pollId: string;
      liveClassId: string;
      teacherId: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    const { pollId, liveClassId } = params;

    try {
      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from("live_class_polls")
        .update({
          status: "CLOSED",
          closed_at: nowIso,
          updated_at: nowIso,
        })
        .eq("id", pollId)
        .eq("live_class_id", liveClassId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { success: false, error: error.message };
    }
  }
}
