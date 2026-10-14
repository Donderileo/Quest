import { Sheet } from "@/components/sheet";
import NewTaskPage from "@/app/(app)/tasks/new/page";

export default function NewTaskSheet(props: Parameters<typeof NewTaskPage>[0]) {
  return (
    <Sheet title="Nova tarefa">
      <NewTaskPage {...props} />
    </Sheet>
  );
}
