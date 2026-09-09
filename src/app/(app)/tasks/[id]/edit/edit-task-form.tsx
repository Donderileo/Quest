"use client";

import { TaskForm, type Member, type TaskFormInitial } from "@/components/task-form";
import { updateTask, deleteTask } from "../actions";

export function EditTaskForm({
  taskId,
  spaceId,
  gamified,
  members,
  initial,
}: {
  taskId: string;
  spaceId: string;
  gamified: boolean;
  members: Member[];
  initial: TaskFormInitial;
}) {
  return (
    <TaskForm
      taskId={taskId}
      spaceId={spaceId}
      gamified={gamified}
      members={members}
      action={updateTask}
      initial={initial}
      onDelete={() => deleteTask(taskId, spaceId)}
    />
  );
}
