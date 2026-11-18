import { useCreateDuel } from "../hooks/useCreateDuel.ts";

export function CreateDuelButton() {
  const { create, isPending, failure } = useCreateDuel();

  return (
    <div className="create-duel">
      <button type="button" onClick={create} disabled={isPending}>
        {isPending ? "Creating…" : "Create a Duel"}
      </button>
      {failure && <p role="alert">{failure}</p>}
    </div>
  );
}
