"use client";

import { TaskForm, type Member } from "@/components/task-form";
import { createTask } from "./actions";

export function NewTaskForm({
  spaceId,
  gamified,
  members,
}: {
  spaceId: string;
  gamified: boolean;
  members: Member[];
}) {
  return (
    <TaskForm
      spaceId={spaceId}
      gamified={gamified}
      members={members}
      action={createTask}
      initial={{
        title: "",
        recurrenceType: "daily",
        recurrenceDays: [],
        recurrenceIntervalDays: 7,
        assignmentType: "fixed",
        assigneeId: null,
        rotationOrder: [],
        points: gamified ? 10 : 0,
      }}
    />
  );
}
